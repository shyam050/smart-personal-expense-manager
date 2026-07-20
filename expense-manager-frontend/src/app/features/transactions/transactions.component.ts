import { Component, OnInit, signal } from '@angular/core';
import { ShellComponent } from '../../shared/components/shell.component';
import { TransactionModalComponent } from './transaction-modal.component';
import { TransactionService } from '../../core/services/transaction.service';
import { CategoryService } from '../../core/services/category.service';
import { Transaction, Category, TransactionType } from '../../core/models/models';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [ShellComponent, TransactionModalComponent],
  template: `
    <div class="layout">
      <app-shell></app-shell>
      <main class="content">
        <header class="page-header">
          <div>
            <p class="eyebrow">Records</p>
            <h1>Transactions</h1>
          </div>
          <button class="btn-primary" (click)="openCreateModal()">+ New transaction</button>
        </header>

        <div class="filter-bar">
          <button [class.active]="filterType() === undefined" (click)="setFilter(undefined)">All</button>
          <button [class.active]="filterType() === 'EXPENSE'" (click)="setFilter('EXPENSE')">Expenses</button>
          <button [class.active]="filterType() === 'INCOME'" (click)="setFilter('INCOME')">Income</button>
        </div>

        @if (loading()) {
          <div class="loading-state">Loading transactions…</div>
        } @else if (transactions().length === 0) {
          <div class="empty-state">
            <p>No transactions yet.</p>
            <p class="empty-sub">Add your first one to start tracking.</p>
          </div>
        } @else {
          <div class="table-card">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Date</th>
                  <th class="amount-col">Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (t of transactions(); track t.id) {
                  <tr>
                    <td>
                      <div class="title-cell">{{ t.title }}</div>
                      @if (t.description) {
                        <div class="desc-cell">{{ t.description }}</div>
                      }
                    </td>
                    <td>
                      @if (t.categoryName) {
                        <span class="category-chip" [style.background]="(t.categoryColor || '#E8E2D6') + '33'" [style.color]="t.categoryColor || '#6B6660'">
                          {{ t.categoryName }}
                        </span>
                      } @else {
                        <span class="no-category">—</span>
                      }
                    </td>
                    <td class="date-cell">{{ formatDate(t.transactionDate) }}</td>
                    <td class="amount-col figure" [class.income]="t.type === 'INCOME'" [class.expense]="t.type === 'EXPENSE'">
                      {{ t.type === 'EXPENSE' ? '−' : '+' }}₹{{ formatAmount(t.amount) }}
                    </td>
                    <td class="actions-cell">
                      <button class="icon-btn" (click)="openEditModal(t)" aria-label="Edit">✎</button>
                      <button class="icon-btn delete" (click)="deleteTransaction(t.id)" aria-label="Delete">✕</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <div class="pagination">
            <button [disabled]="!hasPrev()" (click)="changePage(currentPage() - 1)">← Previous</button>
            <span class="page-info">Page {{ currentPage() + 1 }} of {{ totalPages() }}</span>
            <button [disabled]="!hasNext()" (click)="changePage(currentPage() + 1)">Next →</button>
          </div>
        }
      </main>
    </div>

    @if (modalOpen()) {
      <app-transaction-modal
        [transaction]="editingTransaction()"
        [categories]="categories()"
        (close)="closeModal()"
        (saved)="onSaved()">
      </app-transaction-modal>
    }
  `,
  styles: [`
    .layout { display: flex; min-height: 100vh; }
    .content { flex: 1; margin-left: 240px; padding: var(--space-7); max-width: 1100px; }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: var(--space-5);
      flex-wrap: wrap;
      gap: var(--space-3);
    }

    .eyebrow {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--ink-faint);
      margin-bottom: var(--space-1);
    }

    .page-header h1 { font-size: 28px; }

    .btn-primary {
      background: var(--green);
      color: white;
      border: none;
      padding: var(--space-3) var(--space-4);
      border-radius: var(--radius-sm);
      font-size: 14px;
      font-weight: 600;
    }

    .filter-bar {
      display: flex;
      gap: var(--space-2);
      margin-bottom: var(--space-5);
    }

    .filter-bar button {
      padding: var(--space-2) var(--space-4);
      border: 1px solid var(--line-strong);
      background: var(--paper-raised);
      border-radius: 999px;
      font-size: 13px;
      font-weight: 500;
      color: var(--ink-faint);
    }

    .filter-bar button.active {
      background: var(--ink);
      color: white;
      border-color: var(--ink);
    }

    .loading-state, .empty-state {
      padding: var(--space-8) 0;
      text-align: center;
      color: var(--ink-faint);
    }

    .empty-sub { font-size: 13px; margin-top: var(--space-1); }

    .table-card {
      background: var(--paper-raised);
      border: 1px solid var(--line);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }

    table { width: 100%; border-collapse: collapse; }

    th {
      text-align: left;
      padding: var(--space-3) var(--space-4);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--ink-faint);
      border-bottom: 1px solid var(--line);
    }

    td {
      padding: var(--space-3) var(--space-4);
      border-bottom: 1px solid var(--line);
      font-size: 14px;
    }

    tr:last-child td { border-bottom: none; }

    .title-cell { font-weight: 500; }
    .desc-cell { font-size: 12px; color: var(--ink-faint); margin-top: 2px; }
    .date-cell { color: var(--ink-faint); font-size: 13px; }

    .category-chip {
      padding: 3px var(--space-2);
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
    }

    .no-category { color: var(--ink-faint); }

    .amount-col { text-align: right; font-weight: 600; }
    .amount-col.income { color: var(--green); }
    .amount-col.expense { color: var(--brick); }

    .actions-cell { text-align: right; white-space: nowrap; }

    .icon-btn {
      width: 28px;
      height: 28px;
      border: none;
      background: transparent;
      color: var(--ink-faint);
      border-radius: var(--radius-sm);
      font-size: 13px;
    }

    .icon-btn:hover { background: var(--green-soft); color: var(--green); }
    .icon-btn.delete:hover { background: var(--brick-soft); color: var(--brick); }

    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: var(--space-4);
      margin-top: var(--space-5);
    }

    .pagination button {
      padding: var(--space-2) var(--space-3);
      border: 1px solid var(--line-strong);
      background: var(--paper-raised);
      border-radius: var(--radius-sm);
      font-size: 13px;
    }

    .pagination button:disabled { opacity: 0.4; }
    .page-info { font-size: 13px; color: var(--ink-faint); }

    @media (max-width: 900px) {
      .content { margin-left: 0; padding: var(--space-5); }
      th:nth-child(2), td:nth-child(2) { display: none; }
    }
  `]
})
export class TransactionsComponent implements OnInit {
  transactions = signal<Transaction[]>([]);
  categories = signal<Category[]>([]);
  loading = signal(true);
  filterType = signal<TransactionType | undefined>(undefined);

  currentPage = signal(0);
  totalPages = signal(1);
  hasNext = signal(false);
  hasPrev = signal(false);

  modalOpen = signal(false);
  editingTransaction = signal<Transaction | null>(null);

  constructor(
    private transactionService: TransactionService,
    private categoryService: CategoryService
  ) {}

  ngOnInit(): void {
    this.loadCategories();
    this.loadTransactions();
  }

  loadCategories(): void {
    this.categoryService.getAll().subscribe(cats => this.categories.set(cats));
  }

  loadTransactions(): void {
    this.loading.set(true);
    this.transactionService.getAll({
      page: this.currentPage(),
      size: 10,
      type: this.filterType()
    }).subscribe({
      next: (res) => {
        this.transactions.set(res.transactions);
        this.totalPages.set(res.totalPages);
        this.hasNext.set(res.hasNext);
        this.hasPrev.set(res.hasPrev);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  setFilter(type: TransactionType | undefined): void {
    this.filterType.set(type);
    this.currentPage.set(0);
    this.loadTransactions();
  }

  changePage(page: number): void {
    this.currentPage.set(page);
    this.loadTransactions();
  }

  openCreateModal(): void {
    this.editingTransaction.set(null);
    this.modalOpen.set(true);
  }

  openEditModal(t: Transaction): void {
    this.editingTransaction.set(t);
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
  }

  onSaved(): void {
    this.modalOpen.set(false);
    this.loadTransactions();
  }

  deleteTransaction(id: number): void {
    if (!confirm('Delete this transaction?')) return;
    this.transactionService.delete(id).subscribe(() => this.loadTransactions());
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  formatAmount(value: number): string {
    return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  }
}
