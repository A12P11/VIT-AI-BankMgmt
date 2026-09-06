package com.BankingSystem.BankingManagementSystem.Repository;

import com.BankingSystem.BankingManagementSystem.Entity.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    @Query("select t from Transaction t where t.account.id = :accountId or t.relatedAccount.id = :accountId")
    List<Transaction> findByAccountOrRelatedAccount(@Param("accountId") Long accountId);

            @Query("select distinct t from Transaction t "
                + "join t.account account join account.user accountOwner "
                + "left join t.relatedAccount relatedAccount left join relatedAccount.user relatedOwner "
                + "where accountOwner.email = :email or relatedOwner.email = :email")
    List<Transaction> findVisibleToUser(@Param("email") String email);
}
