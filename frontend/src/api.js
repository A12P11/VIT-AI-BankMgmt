const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

async function request(path, options = {}) {
  const token = localStorage.getItem('ledger_token')
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  })

  const text = await response.text()
  let data = text
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    // Some auth responses are plain text.
  }

  if (!response.ok) {
    const message = typeof data === 'string' ? data : data?.message || `Request failed (${response.status})`
    const error = new Error(message)
    error.status = response.status
    throw error
  }
  return data
}

export const api = {
  register: (payload) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload) => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  accounts: () => request('/accounts/my'),
  createAccount: (accountType) => request('/accounts', { method: 'POST', body: JSON.stringify({ accountType }) }),
  transactions: () => request('/transactions'),
  deposit: (accountId, amount) => request('/transactions/deposit', { method: 'POST', body: JSON.stringify({ accountId: Number(accountId), amount: Number(amount) }) }),
  withdraw: (accountId, amount) => request('/transactions/withdraw', { method: 'POST', body: JSON.stringify({ accountId: Number(accountId), amount: Number(amount) }) }),
  transfer: (senderAccountId, receiverAccountId, amount) => request('/transactions/transfer', { method: 'POST', body: JSON.stringify({ senderAccountId: Number(senderAccountId), receiverAccountId: Number(receiverAccountId), amount: Number(amount) }) })
}
