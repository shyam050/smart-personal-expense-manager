import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface CategoryForecast {
  category: string;
  forecastedAmount: number;
  lastMonthActual: number;
  avgMonthly: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
}

export interface ForecastResponse {
  forecasts: CategoryForecast[];
  totalForecastedExpense: number;
  forecastMonth: string;
  basis: string;
}

export interface CategorizationResponse {
  merchant: string;
  category: string;
  confidence: number;
  method: 'keyword' | 'ml';
  available?: boolean;
}

@Injectable({ providedIn: 'root' })
export class SmartService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getForecast(): Observable<ForecastResponse> {
    return this.http.get<ForecastResponse>(`${this.apiUrl}/forecast`);
  }

  predictCategory(merchant: string): Observable<CategorizationResponse | null> {
    if (!merchant || merchant.trim().length < 2) {
      return of(null);
    }
    return this.http.post<CategorizationResponse>(
      `${this.apiUrl}/categorize`,
      { merchant: merchant.trim() }
    ).pipe(
      // If categorization fails, return null silently — never break the form
      catchError(() => of(null))
    );
  }
}
