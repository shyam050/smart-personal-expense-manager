
import { Component, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  FormGroup
} from '@angular/forms';
import { Transaction, Category, TransactionRequest } from '../../core/models/models';
import { TransactionService } from '../../core/services/transaction.service';

@Component({
  selector: 'app-transaction-modal',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="modal-backdrop" (click)="close.emit()">
      <div class="modal" (click)="$event.stopPropagation()">
        <h2>{{ editing ? 'Edit transaction' : 'New transaction' }}</h2>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="modal-form">
          <div class="type-toggle">
            <button
              type="button"
              [class.active]="form.get('type')?.value === 'EXPENSE'"
              (click)="form.patchValue({ type: 'EXPENSE' })">
              Expense
            </button>

            <button
              type="button"
              [class.active]="form.get('type')?.value === 'INCOME'"
              (click)="form.patchValue({ type: 'INCOME' })">
              Income
            </button>
          </div>

          <label class="field">
            <span class="field-label">Title</span>
            <input
              type="text"
              formControlName="title"
              placeholder="e.g. Groceries" />
          </label>

          <label class="field">
            <span class="field-label">Amount (₹)</span>
            <input
              type="number"
              formControlName="amount"
              placeholder="0.00"
              step="0.01" />
          </label>

          <label class="field">
            <span class="field-label">Date</span>
            <input
              type="date"
              formControlName="transactionDate" />
          </label>

          <label class="field">
            <span class="field-label">Category</span>
            <select formControlName="categoryId">
              <option [ngValue]="null">No category</option>

              @for (cat of categories; track cat.id) {
                <option [ngValue]="cat.id">
                  {{ cat.name }}
                </option>
              }
            </select>
          </label>

          <label class="field">
            <span class="field-label">Notes (optional)</span>
            <input
              type="text"
              formControlName="description"
              placeholder="Any details" />
          </label>

          @if (errorMessage()) {
            <div class="form-error">
              {{ errorMessage() }}
            </div>
          }

          <div class="modal-actions">
            <button
              type="button"
              class="btn-secondary"
              (click)="close.emit()">
              Cancel
            </button>

            <button
              type="submit"
              class="btn-primary"
              [disabled]="form.invalid || saving()">

              {{
                saving()
                  ? 'Saving…'
                  : (editing ? 'Save changes' : 'Add transaction')
              }}

            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(28, 32, 36, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
      padding: var(--space-4);
    }

    .modal {
      background: var(--paper-raised);
      border-radius: var(--radius-lg);
      padding: var(--space-6);
      width: 100%;
      max-width: 420px;
      max-height: 90vh;
      overflow-y: auto;
    }

    .modal h2 {
      font-size: 20px;
      margin-bottom: var(--space-5);
    }

    .modal-form {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }

    .type-toggle {
      display: flex;
      gap: var(--space-2);
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: var(--radius-sm);
      padding: 3px;
    }

    .type-toggle button {
      flex: 1;
      padding: var(--space-2);
      border: none;
      background: transparent;
      border-radius: var(--radius-sm);
      font-size: 13px;
      font-weight: 600;
      color: var(--ink-faint);
    }

    .type-toggle button.active {
      background: var(--ink);
      color: white;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    .field-label {
      font-size: 13px;
      font-weight: 600;
    }

    input,
    select {
      padding: var(--space-3);
      border: 1px solid var(--line-strong);
      border-radius: var(--radius-sm);
      font-size: 14px;
      background: var(--paper);
      color: var(--ink);
    }

    input:focus,
    select:focus {
      outline: none;
      border-color: var(--green);
    }

    .form-error {
      background: var(--brick-soft);
      color: var(--brick);
      font-size: 13px;
      padding: var(--space-3);
      border-radius: var(--radius-sm);
    }

    .modal-actions {
      display: flex;
      gap: var(--space-3);
      margin-top: var(--space-2);
    }

    .btn-secondary,
    .btn-primary {
      flex: 1;
      padding: var(--space-3);
      border-radius: var(--radius-sm);
      font-size: 14px;
      font-weight: 600;
      border: 1px solid var(--line-strong);
    }

    .btn-secondary {
      background: transparent;
      color: var(--ink);
    }

    .btn-primary {
      background: var(--green);
      color: white;
      border-color: var(--green);
    }

    .btn-primary:disabled {
      opacity: 0.5;
    }
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

  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private transactionService: TransactionService
  ) {
    this.form = this.fb.group({
      title: ['', [Validators.required]],
      amount: [0, [Validators.required, Validators.min(0.01)]],
      type: ['EXPENSE' as 'EXPENSE' | 'INCOME', [Validators.required]],
      transactionDate: [
        new Date().toISOString().split('T')[0],
        [Validators.required]
      ],
      categoryId: [null as number | null],
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
  }

  onSubmit(): void {
    if (this.form.invalid) {
      return;
    }

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

    const requestObservable =
      this.editing && this.transaction
        ? this.transactionService.update(this.transaction.id, request)
        : this.transactionService.create(request);

    requestObservable.subscribe({
      next: () => {
        this.saving.set(false);
        this.saved.emit();
      },
      error: (err) => {
        this.saving.set(false);
        this.errorMessage.set(
          err.error?.message || 'Could not save transaction'
        );
      }
    });
  }
}
