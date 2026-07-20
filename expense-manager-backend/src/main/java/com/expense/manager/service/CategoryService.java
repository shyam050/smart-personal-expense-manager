package com.expense.manager.service;

import com.expense.manager.dto.CategoryDto;
import com.expense.manager.entity.Category;
import com.expense.manager.entity.User;
import com.expense.manager.exception.ResourceNotFoundException;
import com.expense.manager.repository.CategoryRepository;
import com.expense.manager.security.CurrentUserProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final CurrentUserProvider currentUserProvider;

    @Transactional
    public CategoryDto.Response create(CategoryDto.Request request) {
        User user = currentUserProvider.getCurrentUser();

        Category category = Category.builder()
                .name(request.getName())
                .icon(request.getIcon())
                .color(request.getColor())
                .user(user)
                .build();

        Category saved = categoryRepository.save(category);
        return toResponse(saved);
    }

    public List<CategoryDto.Response> getAll() {
        Long userId = currentUserProvider.getCurrentUserId();
        return categoryRepository.findByUserId(userId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public CategoryDto.Response update(Long id, CategoryDto.Request request) {
        Long userId = currentUserProvider.getCurrentUserId();
        Category category = categoryRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));

        category.setName(request.getName());
        category.setIcon(request.getIcon());
        category.setColor(request.getColor());

        return toResponse(categoryRepository.save(category));
    }

    @Transactional
    public void delete(Long id) {
        Long userId = currentUserProvider.getCurrentUserId();
        Category category = categoryRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
        categoryRepository.delete(category);
    }

    private CategoryDto.Response toResponse(Category category) {
        return CategoryDto.Response.builder()
                .id(category.getId())
                .name(category.getName())
                .icon(category.getIcon())
                .color(category.getColor())
                .build();
    }
}
