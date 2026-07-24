import { Component, OnInit, signal } from '@angular/core';
import { SmartService, ForecastResponse, CategoryForecast } from '../../core/services/smart.service';

@Component({
  selector: 'app-forecast-card',
  standalone: true,
  template: `
    <section class="card forecast-card">
      <div class="card-header">
        <h2 class="card-title">Predicted spending — {{ forecast()?.forecastMonth }}</h2>
        <span class="badge">Smart forecast</span>
      </div>

      @if (loading()) {
        <p class="empty-note">Calculating your forecast…</p>
      } @else if (!forecast() || forecast()!.forecasts.length === 0) {
        <p class="empty-note">Add at least 2 months of expenses to unlock forecasting.</p>
      } @else {
        <div class="total-row">
          <span class="total-label">Total forecasted expense</span>
          <span class="total-amount figure">₹{{ formatAmount(forecast()!.totalForecastedExpense) }}</span>
        </div>

        <div class="forecast-list">
          @for (item of forecast()!.forecasts; track item.category) {
            <div class="forecast-row">
              <div class="forecast-left">
                <span class="cat-name">{{ item.category }}</span>
                <span class="trend-badge" [class]="'trend-' + item.trend.toLowerCase()">
                  {{ item.trend === 'UP' ? '↑' : item.trend === 'DOWN' ? '↓' : '→' }}
                  {{ item.trend }}
                </span>
              </div>
              <div class="forecast-right">
                <span class="forecast-amount figure">₹{{ formatAmount(item.forecastedAmount) }}</span>
                <span class="last-month">Last month: ₹{{ formatAmount(item.lastMonthActual) }}</span>
              </div>
            </div>
          }
        </div>

        <p class="basis-note">{{ forecast()!.basis }}</p>
      }
    </section>
  `,
  styles: [`
    .forecast-card { grid-column: 1 / -1; }

    .card {
      background: var(--paper-raised);
      border: 1px solid var(--line);
      border-radius: var(--radius-lg);
      padding: var(--space-5);
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: var(--space-4);
    }

    .card-title { font-size: 16px; }

    .badge {
      font-size: 11px;
      font-weight: 600;
      padding: 3px var(--space-2);
      border-radius: 999px;
      background: var(--green-soft);
      color: var(--green);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .empty-note {
      color: var(--ink-faint);
      font-size: 14px;
      padding: var(--space-4) 0;
      text-align: center;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--space-3) 0;
      margin-bottom: var(--space-3);
      border-bottom: 1px solid var(--line);
    }

    .total-label { font-size: 13px; color: var(--ink-faint); }

    .total-amount {
      font-size: 22px;
      font-weight: 600;
      color: var(--brick);
    }

    .forecast-list { display: flex; flex-direction: column; gap: var(--space-2); }

    .forecast-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--space-2) 0;
      border-bottom: 1px solid var(--line);
    }

    .forecast-row:last-child { border-bottom: none; }

    .forecast-left {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }

    .cat-name { font-size: 14px; font-weight: 500; }

    .trend-badge {
      font-size: 11px;
      font-weight: 600;
      padding: 2px var(--space-2);
      border-radius: 4px;
    }

    .trend-up { background: var(--brick-soft); color: var(--brick); }
    .trend-down { background: var(--green-soft); color: var(--green); }
    .trend-stable { background: var(--line); color: var(--ink-faint); }

    .forecast-right { text-align: right; }

    .forecast-amount {
      display: block;
      font-size: 15px;
      font-weight: 600;
    }

    .last-month {
      display: block;
      font-size: 12px;
      color: var(--ink-faint);
      margin-top: 2px;
    }

    .basis-note {
      margin-top: var(--space-4);
      font-size: 12px;
      color: var(--ink-faint);
      font-style: italic;
    }
  `]
})
export class ForecastCardComponent implements OnInit {
  forecast = signal<ForecastResponse | null>(null);
  loading = signal(true);

  constructor(private smartService: SmartService) {}

  ngOnInit(): void {
    this.smartService.getForecast().subscribe({
      next: (data) => {
        this.forecast.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  formatAmount(value: number): string {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }
}
