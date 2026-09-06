package com.BankingSystem.BankingManagementSystem.Controller;

import com.BankingSystem.BankingManagementSystem.Entity.Transaction;
import com.BankingSystem.BankingManagementSystem.Service.TransactionService;
import com.BankingSystem.BankingManagementSystem.dto.DepositRequest;
import com.BankingSystem.BankingManagementSystem.dto.TransactionResponse;
import com.BankingSystem.BankingManagementSystem.dto.TransferRequest;
import com.BankingSystem.BankingManagementSystem.dto.WithdrawRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;

import java.util.List;

@RestController
@RequestMapping("/transactions")
@RequiredArgsConstructor
public class TransactionController {

    private final TransactionService transactionService;

    @GetMapping
    public ResponseEntity<List<TransactionResponse>> getAllTransactions(Authentication authentication) {
        List<TransactionResponse> result = transactionService.getTransactionsVisibleTo(authentication.getName(), isAdmin(authentication))
                .stream().map(TransactionResponse::new).toList();
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    public ResponseEntity<TransactionResponse> getTransactionById(@PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(new TransactionResponse(transactionService.getTransactionById(id, authentication.getName(), isAdmin(authentication))));
    }

    @GetMapping("/account/{accountId}")
    public ResponseEntity<List<TransactionResponse>> getTransactionsForAccount(@PathVariable Long accountId, Authentication authentication) {
        List<TransactionResponse> result = transactionService.getTransactionsForAccount(accountId, authentication.getName(), isAdmin(authentication))
                .stream().map(TransactionResponse::new).toList();
        return ResponseEntity.ok(result);
    }

    // JSON body now - not @RequestParam - consistent with the rest of the API
    @PostMapping("/deposit")
    public ResponseEntity<TransactionResponse> deposit(@RequestBody DepositRequest request, Authentication authentication) {
        Transaction t = transactionService.deposit(request.getAccountId(), request.getAmount(), authentication.getName(), isAdmin(authentication));
        return ResponseEntity.ok(new TransactionResponse(t));
    }

    @PostMapping("/withdraw")
    public ResponseEntity<TransactionResponse> withdraw(@RequestBody WithdrawRequest request, Authentication authentication) {
        Transaction t = transactionService.withdraw(request.getAccountId(), request.getAmount(), authentication.getName(), isAdmin(authentication));
        return ResponseEntity.ok(new TransactionResponse(t));
    }

    @PostMapping("/transfer")
    public ResponseEntity<TransactionResponse> transfer(@RequestBody TransferRequest request, Authentication authentication) {
        Transaction t = transactionService.transfer(
                request.getSenderAccountId(),
                request.getReceiverAccountId(),
                request.getAmount(),
                authentication.getName(),
                isAdmin(authentication)
        );
        return ResponseEntity.ok(new TransactionResponse(t));
    }

    private boolean isAdmin(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("ROLE_ADMIN"));
    }
}
