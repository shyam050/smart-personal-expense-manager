import { Component, OnInit, signal, computed } from '@angular/core';
import { ShellComponent } from '../../shared/components/shell.component';
import { DashboardService } from '../../core/services/dashboard.service';
import { Dashboard } from '../../core/models/models';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [ShellComponent, BaseChartDirective],
  template: `
    <div class="layout">
      <app-shell></app-shell>
      <main class="content">
        <header class="page-header">
          <div>
            <p class="eyebrow">Overview</p>
            <h1>Your ledger</h1>
          </div>
          <div class="period-toggle">
            @for (opt of periodOptions; track opt.value) {
              <button
                [class.active]="monthsBack() === opt.value"
                (click)="setPeriod(opt.value)">
                {{ opt.label }}
              </button>
            }
          </div>
        </header>

        @if (loading()) {
          <div class="loading-state">Loading your numbers…</div>
        } @else if (dashboard()) {
          <!-- Hero balance -->
          <section class="hero-card">
            <p class="hero-label">Net balance</p>
            <p class="hero-figure figure" [class.negative]="dashboard()!.netBalance < 0">
              {{ dashboard()!.netBalance < 0 ? '−' : '' }}₹{{ formatAmount(absValue(dashboard()!.netBalance)) }}
            </p>
            <div class="hero-sub">
              <span class="sub-stat income">
                <span class="dot"></span> Income ₹{{ formatAmount(dashboard()!.totalIncome) }}
              </span>
              <span class="sub-stat expense">
                <span class="dot"></span> Expenses ₹{{ formatAmount(dashboard()!.totalExpense) }}
              </span>
            </div>
          </section>

          <div class="grid">
            <!-- Monthly trend chart -->
            <section class="card">
              <h2 class="card-title">Income vs expense</h2>
              @if (dashboard()!.monthlyTrend.length > 0) {
                <canvas baseChart
                  [data]="trendChartData()"
                  [options]="trendChartOptions"
                  [type]="'bar'">
                </canvas>
              } @else {
                <p class="empty-note">No transactions yet this period.</p>
              }
            </section>

            <!-- Category breakdown -->
            <section class="card">
              <h2 class="card-title">Where it goes</h2>
              @if (dashboard()!.categoryBreakdown.length > 0) {
                <canvas baseChart
                  [data]="categoryChartData()"
                  [options]="categoryChartOptions"
                  [type]="'doughnut'">
                </canvas>
              } @else {
                <p class="empty-note">No expenses recorded yet.</p>
              }
            </section>
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
      padding: var(--space-7) var(--space-7);
      max-width: 1100px;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      margin-bottom: var(--space-6);
      flex-wrap: wrap;
      gap: var(--space-4);
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

    .period-toggle {
      display: flex;
      gap: var(--space-1);
      background: var(--paper-raised);
      border: 1px solid var(--line);
      border-radius: var(--radius-sm);
      padding: 3px;
    }

    .period-toggle button {
      padding: var(--space-2) var(--space-3);
      border: none;
      background: transparent;
      border-radius: var(--radius-sm);
      font-size: 13px;
      font-weight: 500;
      color: var(--ink-faint);
    }

    .period-toggle button.active {
      background: var(--green);
      color: white;
    }

    .loading-state {
      color: var(--ink-faint);
      padding: var(--space-7) 0;
    }

    .hero-card {
      background: var(--paper-raised);
      border: 1px solid var(--line);
      border-radius: var(--radius-lg);
      padding: var(--space-6) var(--space-6);
      margin-bottom: var(--space-5);
    }

    .hero-label {
      font-size: 13px;
      color: var(--ink-faint);
      margin-bottom: var(--space-2);
    }

    .hero-figure {
      font-size: 48px;
      font-weight: 600;
      color: var(--green);
      margin-bottom: var(--space-4);
    }

    .hero-figure.negative {
      color: var(--brick);
    }

    .hero-sub {
      display: flex;
      gap: var(--space-5);
    }

    .sub-stat {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      font-size: 14px;
      font-family: var(--font-mono);
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .sub-stat.income .dot { background: var(--green); }
    .sub-stat.expense .dot { background: var(--brick); }

    .grid {
      display: grid;
      grid-template-columns: 1.4fr 1fr;
      gap: var(--space-5);
    }

    .card {
      background: var(--paper-raised);
      border: 1px solid var(--line);
      border-radius: var(--radius-lg);
      padding: var(--space-5);
    }

    .card-title {
      font-size: 16px;
      margin-bottom: var(--space-4);
    }

    .empty-note {
      color: var(--ink-faint);
      font-size: 14px;
      padding: var(--space-5) 0;
      text-align: center;
    }

    @media (max-width: 900px) {
      .content { margin-left: 0; padding: var(--space-5); }
      .grid { grid-template-columns: 1fr; }
      .hero-figure { font-size: 36px; }
    }
  `]
})
export class DashboardComponent implements OnInit {
  loading = signal(true);
  dashboard = signal<Dashboard | null>(null);
  monthsBack = signal(6);

  periodOptions = [
    { label: '3M', value: 3 },
    { label: '6M', value: 6 },
    { label: '12M', value: 12 }
  ];

  trendChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    plugins: { legend: { position: 'bottom', labels: { font: { family: 'Inter', size: 12 } } } },
    scales: {
      y: { beginAtZero: true, ticks: { font: { family: 'JetBrains Mono', size: 11 } } },
      x: { ticks: { font: { family: 'Inter', size: 11 } } }
    }
  };

  categoryChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    plugins: { legend: { position: 'bottom', labels: { font: { family: 'Inter', size: 11 }, boxWidth: 12 } } }
  };

  trendChartData = computed<ChartData<'bar'>>(() => {
    const d = this.dashboard();
    if (!d) return { labels: [], datasets: [] };
    return {
      labels: d.monthlyTrend.map(m => m.monthLabel),
      datasets: [
        { label: 'Income', data: d.monthlyTrend.map(m => m.income), backgroundColor: '#2D5C4D', borderRadius: 4 },
        { label: 'Expense', data: d.monthlyTrend.map(m => m.expense), backgroundColor: '#A8432F', borderRadius: 4 }
      ]
    };
  });

  categoryChartData = computed<ChartData<'doughnut'>>(() => {
    const d = this.dashboard();
    if (!d) return { labels: [], datasets: [] };
    const palette = ['#2D5C4D', '#A8432F', '#C9A961', '#6B6660', '#7A9E8E', '#C77B5F', '#8C7A4A', '#4A6B7C'];
    return {
      labels: d.categoryBreakdown.map(c => c.category),
      datasets: [{
        data: d.categoryBreakdown.map(c => c.total),
        backgroundColor: d.categoryBreakdown.map((_, i) => palette[i % palette.length])
      }]
    };
  });

  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.fetchDashboard();
  }

  setPeriod(months: number): void {
    this.monthsBack.set(months);
    this.fetchDashboard();
  }

  fetchDashboard(): void {
    this.loading.set(true);
    this.dashboardService.getDashboard(this.monthsBack()).subscribe({
      next: (data) => {
        this.dashboard.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  formatAmount(value: number): string {
    return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  }

  absValue(value: number): number {
    return Math.abs(value);
  }
}
