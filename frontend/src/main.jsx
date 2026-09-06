import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ArrowDownLeft, ArrowUpRight, Banknote, LogOut, Plus, RefreshCw, Send, ShieldCheck, Sparkles, Wallet } from 'lucide-react'
import { api } from './api'
import './styles.css'

const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value || 0)
const date = (value) => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recent'

function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError('')
    try {
      if (mode === 'register') {
        await api.register(form)
        setMode('login'); setError('Account created. Sign in to continue.');
      } else {
        const result = await api.login({ email: form.email, password: form.password })
        localStorage.setItem('ledger_token', result.token); onLogin()
      }
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  return <main className="auth-page">
    <section className="auth-art">
      <div className="brand"><span className="brand-mark"><Sparkles size={17} /></span> ledger</div>
      <div className="art-copy"><h1>A calmer way to move money.</h1><p>One clear view for everyday banking, from your first account to your next big move.</p></div>
      <div className="art-note"><ShieldCheck size={18} /><span>Protected by encrypted sign-in</span></div>
    </section>
    <section className="auth-panel">
      <div className="auth-form-wrap"><p className="eyebrow">Welcome back</p><h2>{mode === 'login' ? 'Sign in to Ledger' : 'Open your account'}</h2><p className="muted">{mode === 'login' ? 'Pick up right where you left off.' : 'Start with a secure customer account.'}</p>
        <form onSubmit={submit}>
          {mode === 'register' && <label>Name<input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Your full name" /></label>}
          <label>Email<input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" /></label>
          <label>Password<input required type="password" minLength="6" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="At least 6 characters" /></label>
          {error && <div className={error.includes('created') ? 'notice success' : 'notice'}>{error}</div>}
          <button className="primary wide" disabled={busy}>{busy ? 'Working…' : mode === 'login' ? 'Sign in' : 'Create account'} <ArrowUpRight size={17} /></button>
        </form>
        <button className="text-button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}>{mode === 'login' ? 'New to Ledger? Create an account' : 'Already have an account? Sign in'}</button>
      </div>
    </section>
  </main>
}

function ActionDialog({ type, accounts, onClose, onSubmit, busy }) {
  const [form, setForm] = useState({ accountId: accounts[0]?.id || '', receiverAccountId: accounts[1]?.id || '', amount: '', accountType: 'SAVINGS' })
  const label = type === 'create' ? 'Open an account' : type === 'deposit' ? 'Deposit funds' : type === 'withdraw' ? 'Withdraw funds' : 'Transfer money'
  const Icon = type === 'create' ? Plus : type === 'deposit' ? ArrowDownLeft : type === 'withdraw' ? ArrowUpRight : Send
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" onMouseDown={e => e.stopPropagation()}><div className="modal-head"><div><span className="icon-box"><Icon size={18} /></span><h3>{label}</h3></div><button className="close" onClick={onClose}>×</button></div><p className="muted">{type === 'transfer' ? 'Move funds between your accounts.' : 'Enter an amount to update your balance.'}</p>
    <form onSubmit={e => { e.preventDefault(); onSubmit(form) }}>
      {type === 'create' ? <label>Account type<select value={form.accountType} onChange={e => setForm({ ...form, accountType: e.target.value })}><option value="SAVINGS">Savings</option><option value="CURRENT">Current</option></select></label> : <label>{type === 'transfer' ? 'From account' : 'Account'}<select value={form.accountId} onChange={e => setForm({ ...form, accountId: e.target.value })}>{accounts.map(a => <option value={a.id} key={a.id}>•••• {String(a.accountNumber).slice(-4)} · {a.accountType}</option>)}</select></label>}
      {type === 'transfer' && <label>To account<select value={form.receiverAccountId} onChange={e => setForm({ ...form, receiverAccountId: e.target.value })}>{accounts.map(a => <option value={a.id} key={a.id}>•••• {String(a.accountNumber).slice(-4)} · {a.accountType}</option>)}</select></label>}
      {type !== 'create' && <label>Amount<input required min="1" step="1" type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0" /></label>}
      <button className="primary wide" disabled={busy}>{busy ? 'Processing…' : type === 'create' ? 'Open account' : `Confirm ${type}`} <ArrowUpRight size={17} /></button>
    </form>
  </div></div>
}

function Dashboard({ onLogout }) {
  const [accounts, setAccounts] = useState([]); const [transactions, setTransactions] = useState([]); const [error, setError] = useState(''); const [modal, setModal] = useState(null); const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(true)
  const load = async () => { setLoading(true); setError(''); setAccounts([]); setTransactions([]); try { const [a, t] = await Promise.all([api.accounts(), api.transactions()]); const accountIds = new Set(a.map(account => account.id)); setAccounts(a); setTransactions(t.filter(transaction => accountIds.has(transaction.accountId) || accountIds.has(transaction.relatedAccountId))) } catch (err) { setError(err.message); if (err.message.includes('401')) onLogout() } finally { setLoading(false) } }
  useEffect(() => { load() }, [])
  const submitAction = async (form) => { setBusy(true); setError(''); try { if (modal === 'create') await api.createAccount(form.accountType); else if (modal === 'transfer') await api.transfer(form.accountId, form.receiverAccountId, form.amount); else await api[modal](form.accountId, form.amount); setModal(null); await load() } catch (err) { setError(err.message) } finally { setBusy(false) } }
  const total = accounts.reduce((sum, account) => sum + (account.balance || 0), 0)
  return <main className="app-shell"><aside className="sidebar"><div className="brand"><span className="brand-mark"><Sparkles size={17} /></span> ledger</div><nav><a className="active"><Wallet size={18} /> Overview</a></nav><div className="sidebar-bottom"><div className="support"><ShieldCheck size={18} /><div><strong>Secure banking</strong><small>Your data stays private</small></div></div><button className="logout" onClick={onLogout}><LogOut size={17} /> Sign out</button></div></aside>
    <section className="content"><header className="topbar"><div><p className="eyebrow">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</p><h2>Good morning</h2></div><button className="refresh" onClick={load} title="Refresh data"><RefreshCw size={18} /></button></header>
      {error && <div className="notice page-notice">{error}</div>}
      <section className="balance-hero"><div><p className="eyebrow light">Total available balance</p><div className="total-balance">{loading ? '—' : money(total)}</div><p className="balance-caption">Across {accounts.length} account{accounts.length === 1 ? '' : 's'}</p></div><div className="hero-orbit"><Banknote size={42} /></div></section>
      <div className="section-heading"><div><p className="eyebrow">Quick actions</p><h3>Move money</h3></div></div><div className="actions"><button onClick={() => setModal('deposit')}><span className="action-icon green"><ArrowDownLeft size={19} /></span><span><strong>Deposit</strong><small>Add funds</small></span></button><button onClick={() => setModal('withdraw')}><span className="action-icon coral"><ArrowUpRight size={19} /></span><span><strong>Withdraw</strong><small>Take out funds</small></span></button><button onClick={() => setModal('transfer')}><span className="action-icon blue"><Send size={19} /></span><span><strong>Transfer</strong><small>Send money</small></span></button></div>
      <div className="grid"><section><div className="section-heading"><div><p className="eyebrow">Your accounts</p><h3>Accounts</h3></div><button className="small-action" onClick={() => setModal('create')}><Plus size={16} /> New account</button></div><div className="account-list">{loading ? <div className="empty">Loading accounts…</div> : accounts.length ? accounts.map(account => <article className="account-card" key={account.id}><div className="account-top"><span className="chip">{account.accountType}</span><span className="status">{account.status}</span></div><p className="account-number">•••• •••• {String(account.accountNumber).slice(-4)}</p><div className="account-bottom"><strong>{money(account.balance)}</strong><small>Opened {date(account.createdAt)}</small></div></article>) : <div className="empty">No accounts yet. Create one to get started.</div>}</div></section><section><div className="section-heading"><div><p className="eyebrow">Latest movement</p><h3>Activity</h3></div></div><div className="activity">{loading ? <div className="empty">Loading activity…</div> : transactions.length ? transactions.slice(0, 6).map((t, i) => <div className="activity-row" key={t.id || i}><span className={`activity-icon ${String(t.type).toLowerCase() === 'deposit' ? 'green' : 'coral'}`}>{String(t.type).toLowerCase() === 'deposit' ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}</span><div><strong>{t.type || 'Transaction'}</strong><small>{date(t.timestamp)} · {t.status}</small></div><b className={String(t.type).toLowerCase() === 'deposit' ? 'positive' : ''}>{String(t.type).toLowerCase() === 'deposit' ? '+' : '-'}{money(t.amount)}</b></div>) : <div className="empty">Your recent activity will appear here.</div>}</div></section></div>
    </section>{modal && <ActionDialog type={modal} accounts={accounts} onClose={() => setModal(null)} onSubmit={submitAction} busy={busy} />}
  </main>
}

function App() { const [authenticated, setAuthenticated] = useState(Boolean(localStorage.getItem('ledger_token'))); return authenticated ? <Dashboard onLogout={() => { localStorage.removeItem('ledger_token'); setAuthenticated(false) }} /> : <AuthScreen onLogin={() => setAuthenticated(true)} /> }

export default App

createRoot(document.getElementById('root')).render(<App />)
