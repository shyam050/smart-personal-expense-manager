import { Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { Transaction, Category, TransactionRequest } from '../../core/models/models';
import { TransactionService } from '../../core/services/transaction.service';
import { SmartService } from '../../core/services/smart.service';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-transaction-modal',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  template: `
    <div class="modal-backdrop" (click)="close.emit()">
      <div class="modal" (click)="$event.stopPropagation()">
        <h2>{{ editing ? 'Edit transaction' : 'New transaction' }}</h2>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="modal-form">
          <div class="type-toggle">
            <button type="button"
              [class.active]="form.get('type')?.value === 'EXPENSE'"
              (click)="form.patchValue({type: 'EXPENSE'})">
              Expense
            </button>
            <button type="button"
              [class.active]="form.get('type')?.value === 'INCOME'"
              (click)="form.patchValue({type: 'INCOME'})">
              Income
            </button>
          </div>

          <!-- Title field with auto-categorization -->
          <label class="field">
            <span class="field-label">Merchant / Title</span>
            <input
              type="text"
              formControlName="title"
              placeholder="e.g. Zomato, IRCTC, Netflix"
              (input)="onTitleInput($event)"
              autocomplete="off" />

            <!-- Auto-categorization suggestion chip -->
            @if (categorysuggestion()) {
              <div class="suggestion-chip">
                <span class="suggestion-icon">✦</span>
                Suggested: <strong>{{ categorysuggestion()!.category }}</strong>
                <span class="suggestion-conf">
                  {{ categorysuggestion()!.method === 'keyword' ? '· exact match' : '· ' + (categorysuggestion()!.confidence * 100 | number: '1.0-0') + '% confidence' }}
                </span>
                <button type="button" class="apply-btn" (click)="applySuggestion()">Apply</button>
                <button type="button" class="dismiss-btn" (click)="categorysuggestion.set(null)">✕</button>
              </div>
            }
          </label>

          <label class="field">
            <span class="field-label">Amount (₹)</span>
            <input type="number" formControlName="amount" placeholder="0.00" step="0.01" />
          </label>

          <label class="field">
            <span class="field-label">Date</span>
            <input type="date" formControlName="transactionDate" />
          </label>

          <label class="field">
            <span class="field-label">Category</span>
            <select formControlName="categoryId">
              <option [ngValue]="null">No category</option>
              @for (cat of categories; track cat.id) {
                <option [ngValue]="cat.id">{{ cat.name }}</option>
              }
            </select>
          </label>

          <label class="field">
            <span class="field-label">Notes (optional)</span>
            <input type="text" formControlName="description" placeholder="Any details" />
          </label>

          @if (errorMessage()) {
            <div class="form-error">{{ errorMessage() }}</div>
          }

          <div class="modal-actions">
            <button type="button" class="btn-secondary" (click)="close.emit()">Cancel</button>
            <button type="submit" class="btn-primary" [disabled]="form.invalid || saving()">
              {{ saving() ? 'Saving…' : (editing ? 'Save changes' : 'Add transaction') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed; inset: 0;
      background: rgba(28,32,36,0.4);
      display: flex; align-items: center; justify-content: center;
      z-index: 100; padding: var(--space-4);
    }
    .modal {
      background: var(--paper-raised);
      border-radius: var(--radius-lg);
      padding: var(--space-6);
      width: 100%; max-width: 420px;
      max-height: 90vh; overflow-y: auto;
    }
    .modal h2 { font-size: 20px; margin-bottom: var(--space-5); }
    .modal-form { display: flex; flex-direction: column; gap: var(--space-4); }
    .type-toggle {
      display: flex; gap: var(--space-2);
      background: var(--paper); border: 1px solid var(--line);
      border-radius: var(--radius-sm); padding: 3px;
    }
    .type-toggle button {
      flex: 1; padding: var(--space-2); border: none;
      background: transparent; border-radius: var(--radius-sm);
      font-size: 13px; font-weight: 600; color: var(--ink-faint);
    }
    .type-toggle button.active { background: var(--ink); color: white; }
    .field { display: flex; flex-direction: column; gap: var(--space-2); }
    .field-label { font-size: 13px; font-weight: 600; }
    input, select {
      padding: var(--space-3); border: 1px solid var(--line-strong);
      border-radius: var(--radius-sm); font-size: 14px;
      background: var(--paper); color: var(--ink);
    }
    input:focus, select:focus { outline: none; border-color: var(--green); }

    /* Auto-categorization suggestion */
    .suggestion-chip {
      display: flex; align-items: center; gap: var(--space-2);
      background: var(--green-soft); border: 1px solid var(--green);
      border-radius: var(--radius-sm); padding: var(--space-2) var(--space-3);
      font-size: 13px; color: var(--green);
      animation: slideIn 0.15s ease;
    }
    @keyframes slideIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .suggestion-icon { font-size: 10px; }
    .suggestion-conf { color: var(--ink-faint); font-size: 12px; }
    .apply-btn {
      margin-left: auto; padding: 2px var(--space-2);
      background: var(--green); color: white; border: none;
      border-radius: 4px; font-size: 12px; font-weight: 600;
      cursor: pointer;
    }
    .dismiss-btn {
      padding: 2px 6px; background: transparent;
      border: none; color: var(--ink-faint); font-size: 12px; cursor: pointer;
    }

    .form-error {
      background: var(--brick-soft); color: var(--brick);
      font-size: 13px; padding: var(--space-3); border-radius: var(--radius-sm);
    }
    .modal-actions { display: flex; gap: var(--space-3); margin-top: var(--space-2); }
    .btn-secondary, .btn-primary {
      flex: 1; padding: var(--space-3); border-radius: var(--radius-sm);
      font-size: 14px; font-weight: 600; border: 1px solid var(--line-strong);
    }
    .btn-secondary { background: transparent; color: var(--ink); }
    .btn-primary { background: var(--green); color: white; border-color: var(--green); }
    .btn-primary:disabled { opacity: 0.5; }
  `]
})
export class TransactionModalComponent implements OnInit {
  @Input() transaction: Transaction | null = null;
  @Input() categories: Category[] = [];
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  editing = false;
  saving = signal(false);
  errorMessage = signal('');
  categorysuggestion = signal<{ category: string; confidence: number; method: string } | null>(null);

  private titleInput$ = new Subject<string>();

  form: any;

  constructor(
    private fb: FormBuilder,
    private transactionService: TransactionService,
    private smartService: SmartService
  ) {
      this.form = this.fb.group({
      title: ['', [Validators.required]],
      amount: [0, [Validators.required, Validators.min(0.01)]],
      type: ['EXPENSE', [Validators.required]],
      transactionDate: [
        new Date().toISOString().split('T')[0],
        [Validators.required]
      ],
      categoryId: [null],
      description: ['']
    });

  }

  ngOnInit(): void {
    if (this.transaction) {
      this.editing = true;
      this.form.patchValue({
        title: this.transaction.title,
        amount: this.transaction.amount,
        type: this.transaction.type,
        transactionDate: this.transaction.transactionDate,
        categoryId: this.transaction.categoryId ?? null,
        description: this.transaction.description ?? ''
      });
    }

    // Auto-categorize as user types — debounced to avoid a call per keystroke
    this.titleInput$.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      switchMap(title => this.smartService.predictCategory(title))
    ).subscribe(result => {
      if (result && result.category && result.confidence > 0.5) {
        // Only show suggestion if we don't already have a category selected
        const currentCategoryId = this.form.get('categoryId')?.value;
        if (!currentCategoryId) {
          this.categorysuggestion.set({
            category: result.category,
            confidence: result.confidence,
            method: result.method ?? 'ml'
          });
        }
      } else {
        this.categorysuggestion.set(null);
      }
    });
  }

  onTitleInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.titleInput$.next(value);
  }

  applySuggestion(): void {
    const suggestion = this.categorysuggestion();
    if (!suggestion) return;

    // Find the category by name in the user's category list
    const match = this.categories.find(
      c => c.name.toLowerCase() === suggestion.category.toLowerCase()
    );

    if (match) {
      this.form.patchValue({ categoryId: match.id });
    } else {
      // Category name from the model doesn't match any of the user's categories.
      // This is expected — the model uses fixed category names but the user
      // may have named their categories differently. Just dismiss the suggestion.
      console.info(
        `Category '${suggestion.category}' suggested but not found in user's categories. ` +
        `User should create a category with this name to use auto-apply.`
      );
    }

    this.categorysuggestion.set(null);
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.errorMessage.set('');

    const raw = this.form.getRawValue();
    const request: TransactionRequest = {
      title: raw.title!,
      amount: raw.amount!,
      type: raw.type!,
      transactionDate: raw.transactionDate!,
      categoryId: raw.categoryId ?? undefined,
      description: raw.description || undefined
    };

    const obs = this.editing && this.transaction
      ? this.transactionService.update(this.transaction.id, request)
      : this.transactionService.create(request);

    obs.subscribe({
      next: () => { this.saving.set(false); this.saved.emit(); },
      error: (err) => {
        this.saving.set(false);
        this.errorMessage.set(err.error?.message || 'Could not save transaction');
      }
    });
  }
}
