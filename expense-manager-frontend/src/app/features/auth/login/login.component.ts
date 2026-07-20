import { Component, signal } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  FormGroup
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-brand">
          <span class="brand-mark">§</span>
          <h1>Ledger</h1>
        </div>
        <p class="auth-tagline">
          Track every rupee, see the whole picture.
        </p>

        <form
          [formGroup]="form"
          (ngSubmit)="onSubmit()"
          class="auth-form"
        >
          <label class="field">
            <span class="field-label">Email</span>
            <input
              type="email"
              formControlName="email"
              placeholder="you@example.com"
              autocomplete="email"
            />
            @if (form.get('email')?.invalid &&
            form.get('email')?.touched) {
            <span class="field-error">
              Enter a valid email address
            </span>
            }
          </label>

          <label class="field">
            <span class="field-label">Password</span>
            <input
              type="password"
              formControlName="password"
              placeholder="••••••••"
              autocomplete="current-password"
            />
          </label>

          @if (errorMessage()) {
          <div class="form-error">
            {{ errorMessage() }}
          </div>
          }

          <button
            type="submit"
            class="submit-btn"
            [disabled]="form.invalid || loading()"
          >
            {{ loading() ? 'Signing in…' : 'Sign in' }}
          </button>
        </form>

        <p class="auth-footer">
          New here?
          <a routerLink="/register" class="swash-underline">
            Create an account
          </a>
        </p>
      </div>
    </div>
  `,
  styles: [`
    .auth-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--paper);
      padding: var(--space-5);
    }

    .auth-card {
      width: 100%;
      max-width: 380px;
      background: var(--paper-raised);
      border: 1px solid var(--line);
      border-radius: var(--radius-lg);
      padding: var(--space-7) var(--space-6);
    }

    .auth-brand {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      margin-bottom: var(--space-2);
    }

    .brand-mark {
      font-family: var(--font-display);
      font-size: 28px;
      color: var(--gold);
    }

    .auth-brand h1 {
      font-size: 24px;
    }

    .auth-tagline {
      color: var(--ink-faint);
      font-size: 14px;
      margin-bottom: var(--space-6);
    }

    .auth-form {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    .field-label {
      font-size: 13px;
      font-weight: 600;
      color: var(--ink);
    }

    input {
      padding: var(--space-3) var(--space-3);
      border: 1px solid var(--line-strong);
      border-radius: var(--radius-sm);
      font-size: 14px;
      background: var(--paper);
      color: var(--ink);
      transition: border-color 0.15s ease;
    }

    input:focus {
      outline: none;
      border-color: var(--green);
    }

    .field-error {
      font-size: 12px;
      color: var(--brick);
    }

    .form-error {
      background: var(--brick-soft);
      color: var(--brick);
      font-size: 13px;
      padding: var(--space-3);
      border-radius: var(--radius-sm);
    }

    .submit-btn {
      margin-top: var(--space-2);
      padding: var(--space-3);
      background: var(--green);
      color: white;
      border: none;
      border-radius: var(--radius-sm);
      font-size: 14px;
      font-weight: 600;
      transition: opacity 0.15s ease;
    }

    .submit-btn:hover:not(:disabled) {
      opacity: 0.9;
    }

    .submit-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .auth-footer {
      margin-top: var(--space-6);
      text-align: center;
      font-size: 13px;
      color: var(--ink-faint);
    }

    .auth-footer a {
      color: var(--green);
      font-weight: 600;
    }
  `]
})
export class LoginComponent {
  loading = signal(false);
  errorMessage = signal('');

  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.loading.set(true);
    this.errorMessage.set('');

    const { email, password } = this.form.getRawValue();

    this.authService
      .login({
        email: email!,
        password: password!
      })
      .subscribe({
        next: () => this.router.navigate(['/dashboard']),
        error: (err) => {
          this.loading.set(false);
          this.errorMessage.set(
            err.error?.message || 'Invalid email or password'
          );
        }
      });
  }
}