import { Component, OnInit, signal } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  FormGroup
} from '@angular/forms';
import { ShellComponent } from '../../shared/components/shell.component';
import { CategoryService } from '../../core/services/category.service';
import { Category } from '../../core/models/models';

const COLOR_OPTIONS = [
  '#2D5C4D',
  '#A8432F',
  '#C9A961',
  '#6B6660',
  '#7A9E8E',
  '#C77B5F',
  '#8C7A4A',
  '#4A6B7C'
];

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [ShellComponent, ReactiveFormsModule],
  template: `
    <div class="layout">
      <app-shell></app-shell>

      <main class="content">
        <header class="page-header">
          <div>
            <p class="eyebrow">Organize</p>
            <h1>Categories</h1>
          </div>
        </header>

        <section class="add-card">
          <form
            [formGroup]="form"
            (ngSubmit)="onSubmit()"
            class="add-form"
          >
            <input
              type="text"
              formControlName="name"
              placeholder="New category name, e.g. Travel"
              class="name-input"
            />

            <div class="color-picker">
              @for (color of colorOptions; track color) {
                <button
                  type="button"
                  class="color-dot"
                  [style.background]="color"
                  [class.selected]="form.get('color')?.value === color"
                  (click)="form.patchValue({ color: color })">
                </button>
              }
            </div>

            <button
              type="submit"
              class="btn-primary"
              [disabled]="form.invalid || saving()"
            >
              {{ saving() ? 'Adding…' : '+ Add' }}
            </button>
          </form>
        </section>

        @if (loading()) {
          <div class="loading-state">
            Loading categories…
          </div>
        } @else if (categories().length === 0) {
          <div class="empty-state">
            No categories yet. Add one above to start organizing transactions.
          </div>
        } @else {
          <div class="category-grid">
            @for (cat of categories(); track cat.id) {
              <div class="category-card">
                <span
                  class="cat-dot"
                  [style.background]="cat.color || '#6B6660'">
                </span>

                <span class="cat-name">
                  {{ cat.name }}
                </span>

                <button
                  class="icon-btn"
                  (click)="deleteCategory(cat.id)"
                  aria-label="Delete category">
                  ✕
                </button>
              </div>
            }
          </div>
        }
      </main>
    </div>
  `,
  styles: [`
    .layout {
      display: flex;
      min-height: 100vh;
    }

    .content {
      flex: 1;
      margin-left: 240px;
      padding: var(--space-7);
      max-width: 1100px;
    }

    .page-header {
      margin-bottom: var(--space-5);
    }

    .eyebrow {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--ink-faint);
      margin-bottom: var(--space-1);
    }

    .page-header h1 {
      font-size: 28px;
    }

    .add-card {
      background: var(--paper-raised);
      border: 1px solid var(--line);
      border-radius: var(--radius-lg);
      padding: var(--space-5);
      margin-bottom: var(--space-5);
    }

    .add-form {
      display: flex;
      align-items: center;
      gap: var(--space-4);
      flex-wrap: wrap;
    }

    .name-input {
      flex: 1;
      min-width: 200px;
      padding: var(--space-3);
      border: 1px solid var(--line-strong);
      border-radius: var(--radius-sm);
      font-size: 14px;
      background: var(--paper);
      color: var(--ink);
    }

    .name-input:focus {
      outline: none;
      border-color: var(--green);
    }

    .color-picker {
      display: flex;
      gap: var(--space-2);
    }

    .color-dot {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 2px solid transparent;
    }

    .color-dot.selected {
      border-color: var(--ink);
      transform: scale(1.1);
    }

    .btn-primary {
      background: var(--green);
      color: white;
      border: none;
      padding: var(--space-3) var(--space-4);
      border-radius: var(--radius-sm);
      font-size: 14px;
      font-weight: 600;
      white-space: nowrap;
    }

    .btn-primary:disabled {
      opacity: 0.5;
    }

    .loading-state,
    .empty-state {
      padding: var(--space-7) 0;
      text-align: center;
      color: var(--ink-faint);
    }

    .category-grid {
      display: grid;
      grid-template-columns:
        repeat(auto-fill, minmax(220px, 1fr));
      gap: var(--space-3);
    }

    .category-card {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      background: var(--paper-raised);
      border: 1px solid var(--line);
      border-radius: var(--radius-md);
      padding: var(--space-3) var(--space-4);
    }

    .cat-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .cat-name {
      flex: 1;
      font-weight: 500;
      font-size: 14px;
    }

    .icon-btn {
      width: 24px;
      height: 24px;
      border: none;
      background: transparent;
      color: var(--ink-faint);
      border-radius: var(--radius-sm);
      font-size: 12px;
    }

    .icon-btn:hover {
      background: var(--brick-soft);
      color: var(--brick);
    }

    @media (max-width: 900px) {
      .content {
        margin-left: 0;
        padding: var(--space-5);
      }
    }
  `]
})
export class CategoriesComponent implements OnInit {
  categories = signal<Category[]>([]);
  loading = signal(true);
  saving = signal(false);
  colorOptions = COLOR_OPTIONS;

  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private categoryService: CategoryService
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required]],
      color: [COLOR_OPTIONS[0]]
    });
  }

  ngOnInit(): void {
    this.loadCategories();
  }

  loadCategories(): void {
    this.loading.set(true);

    this.categoryService.getAll().subscribe({
      next: (cats) => {
        this.categories.set(cats);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      return;
    }

    this.saving.set(true);

    const { name, color } = this.form.getRawValue();

    this.categoryService.create({
      name: name!,
      color: color!
    }).subscribe({
      next: () => {
        this.saving.set(false);

        this.form.reset({
          name: '',
          color: COLOR_OPTIONS[0]
        });

        this.loadCategories();
      },
      error: () => {
        this.saving.set(false);
      }
    });
  }

  deleteCategory(id: number): void {
    if (
      !confirm(
        'Delete this category? Transactions using it will become uncategorized.'
      )
    ) {
      return;
    }

    this.categoryService
      .delete(id)
      .subscribe(() => this.loadCategories());
  }
}