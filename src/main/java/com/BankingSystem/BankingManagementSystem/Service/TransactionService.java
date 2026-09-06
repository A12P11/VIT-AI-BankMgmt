package com.BankingSystem.BankingManagementSystem.Service;

import com.BankingSystem.BankingManagementSystem.Entity.Account;
import com.BankingSystem.BankingManagementSystem.Entity.Transaction;
import com.BankingSystem.BankingManagementSystem.Enum.TransactionStatus;
import com.BankingSystem.BankingManagementSystem.Enum.TransactionType;
import com.BankingSystem.BankingManagementSystem.Exception.InsufficientBalanceException;
import com.BankingSystem.BankingManagementSystem.Exception.ResourceNotFoundException;
import com.BankingSystem.BankingManagementSystem.Repository.AccountRepository;
import com.BankingSystem.BankingManagementSystem.Repository.TransactionRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final AccountRepository accountRepository;

    public List<Transaction> getTransactionsVisibleTo(String email, boolean admin) {
        return admin ? transactionRepository.findAll() : transactionRepository.findVisibleToUser(email);
    }

    public Transaction getTransactionById(Long id, String email, boolean admin) {
        Transaction transaction = transactionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction not found with id: " + id));
        verifyTransactionAccess(transaction, email, admin);
        return transaction;
    }

    public List<Transaction> getTransactionsForAccount(Long accountId, String email, boolean admin) {
        Account account = getAccount(accountId);
        verifyAccountAccess(account, email, admin);
        return transactionRepository.findByAccountOrRelatedAccount(accountId);
    }

    @Transactional
    public Transaction deposit(Long accountId, int amount, String email, boolean admin) {
        if (amount <= 0) {
            throw new IllegalArgumentException("Deposit amount must be positive");
        }

        Account account = getAccount(accountId);
        verifyAccountAccess(account, email, admin);
        account.setBalance(account.getBalance() + amount);
        accountRepository.save(account);

        return saveTransaction(account, null, TransactionType.DEPOSIT, TransactionStatus.SUCCESS, amount);
    }

    @Transactional
    public Transaction withdraw(Long accountId, int amount, String email, boolean admin) {
        if (amount <= 0) {
            throw new IllegalArgumentException("Withdrawal amount must be positive");
        }

        Account account = getAccount(accountId);
        verifyAccountAccess(account, email, admin);

        if (account.getBalance() < amount) {
            saveTransaction(account, null, TransactionType.WITHDRAWAL, TransactionStatus.FAILED, amount);
            throw new InsufficientBalanceException("Insufficient balance in account " + accountId);
        }

        account.setBalance(account.getBalance() - amount);
        accountRepository.save(account);

        return saveTransaction(account, null, TransactionType.WITHDRAWAL, TransactionStatus.SUCCESS, amount);
    }

    @Transactional
    public Transaction transfer(Long senderAccountId, Long receiverAccountId, int amount, String email, boolean admin) {
        if (amount <= 0) {
            throw new IllegalArgumentException("Transfer amount must be positive");
        }
        if (senderAccountId.equals(receiverAccountId)) {
            throw new IllegalArgumentException("Sender and receiver accounts must be different");
        }

        Account sender = getAccount(senderAccountId);
        Account receiver = getAccount(receiverAccountId);
        verifyAccountAccess(sender, email, admin);

        if (sender.getBalance() < amount) {
            saveTransaction(sender, receiver, TransactionType.TRANSFER, TransactionStatus.FAILED, amount);
            throw new InsufficientBalanceException("Insufficient balance in account " + senderAccountId);
        }

        sender.setBalance(sender.getBalance() - amount);
        receiver.setBalance(receiver.getBalance() + amount);
        accountRepository.save(sender);
        accountRepository.save(receiver);

        return saveTransaction(sender, receiver, TransactionType.TRANSFER, TransactionStatus.SUCCESS, amount);
    }

    private Account getAccount(Long accountId) {
        return accountRepository.findById(accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account not found with id: " + accountId));
    }

    private void verifyAccountAccess(Account account, String email, boolean admin) {
        if (!admin && !account.getUser().getEmail().equals(email)) {
            throw new AccessDeniedException("You do not have access to this account");
        }
    }

    private void verifyTransactionAccess(Transaction transaction, String email, boolean admin) {
        if (admin) {
            return;
        }
        boolean ownsAccount = transaction.getAccount().getUser().getEmail().equals(email);
        boolean ownsRelatedAccount = transaction.getRelatedAccount() != null
                && transaction.getRelatedAccount().getUser().getEmail().equals(email);
        if (!ownsAccount && !ownsRelatedAccount) {
            throw new AccessDeniedException("You do not have access to this transaction");
        }
    }

    private Transaction saveTransaction(Account account, Account related, TransactionType type,
                                         TransactionStatus status, int amount) {
        Transaction transaction = new Transaction();
        transaction.setAccount(account);
        transaction.setRelatedAccount(related);
        transaction.setType(type);
        transaction.setStatus(status);
        transaction.setAmount(amount);
        transaction.setTimestamp(LocalDateTime.now());
        return transactionRepository.save(transaction);
    }
}
