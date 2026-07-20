package com.expense.manager.service;

import com.expense.manager.dto.TransactionDto;
import com.expense.manager.entity.Category;
import com.expense.manager.entity.Transaction;
import com.expense.manager.entity.Transaction.TransactionType;
import com.expense.manager.entity.User;
import com.expense.manager.exception.ResourceNotFoundException;
import com.expense.manager.repository.CategoryRepository;
import com.expense.manager.repository.TransactionRepository;
import com.expense.manager.security.CurrentUserProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final CategoryRepository categoryRepository;
    private final CurrentUserProvider currentUserProvider;

    @Transactional
    public TransactionDto.Response create(TransactionDto.Request request) {
        User user = currentUserProvider.getCurrentUser();

        Category category = null;
        if (request.getCategoryId() != null) {
            category = categoryRepository.findByIdAndUserId(request.getCategoryId(), user.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
        }

        Transaction transaction = Transaction.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .amount(request.getAmount())
                .type(request.getType())
                .transactionDate(request.getTransactionDate())
                .user(user)
                .category(category)
                .build();

        Transaction saved = transactionRepository.save(transaction);
        return toResponse(saved);
    }

    public TransactionDto.PagedResponse getAll(int page, int size, TransactionType type,
                                                 LocalDate startDate, LocalDate endDate) {
        Long userId = currentUserProvider.getCurrentUserId();
        Pageable pageable = PageRequest.of(page, size, Sort.by("transactionDate").descending());

        Page<Transaction> result = transactionRepository.findByFilters(
                userId, type, startDate, endDate, pageable);

        return TransactionDto.PagedResponse.builder()
                .transactions(result.getContent().stream().map(this::toResponse).collect(Collectors.toList()))
                .currentPage(result.getNumber())
                .totalPages(result.getTotalPages())
                .totalElements(result.getTotalElements())
                .hasNext(result.hasNext())
                .hasPrev(result.hasPrevious())
                .build();
    }

    public TransactionDto.Response getById(Long id) {
        Long userId = currentUserProvider.getCurrentUserId();
        Transaction transaction = transactionRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction not found"));
        return toResponse(transaction);
    }

    @Transactional
    public TransactionDto.Response update(Long id, TransactionDto.Request request) {
        Long userId = currentUserProvider.getCurrentUserId();
        Transaction transaction = transactionRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction not found"));

        Category category = null;
        if (request.getCategoryId() != null) {
            category = categoryRepository.findByIdAndUserId(request.getCategoryId(), userId)
                    .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
        }

        transaction.setTitle(request.getTitle());
        transaction.setDescription(request.getDescription());
        transaction.setAmount(request.getAmount());
        transaction.setType(request.getType());
        transaction.setTransactionDate(request.getTransactionDate());
        transaction.setCategory(category);

        return toResponse(transactionRepository.save(transaction));
    }

    @Transactional
    public void delete(Long id) {
        Long userId = currentUserProvider.getCurrentUserId();
        if (!transactionRepository.existsByIdAndUserId(id, userId)) {
            throw new ResourceNotFoundException("Transaction not found");
        }
        transactionRepository.deleteByIdAndUserId(id, userId);
    }

    private TransactionDto.Response toResponse(Transaction t) {
        return TransactionDto.Response.builder()
                .id(t.getId())
                .title(t.getTitle())
                .description(t.getDescription())
                .amount(t.getAmount())
                .type(t.getType())
                .transactionDate(t.getTransactionDate())
                .categoryId(t.getCategory() != null ? t.getCategory().getId() : null)
                .categoryName(t.getCategory() != null ? t.getCategory().getName() : null)
                .categoryColor(t.getCategory() != null ? t.getCategory().getColor() : null)
                .createdAt(t.getCreatedAt())
                .build();
    }
}
