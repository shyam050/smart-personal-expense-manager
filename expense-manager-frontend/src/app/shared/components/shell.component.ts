import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <aside class="sidebar">
      <div class="brand">
        <span class="brand-mark">§</span>
        <span class="brand-name">Ledger</span>
      </div>

      <nav class="nav">
        <a routerLink="/dashboard" routerLinkActive="active" class="nav-item">
          <span class="nav-icon">◧</span> Dashboard
        </a>
        <a routerLink="/transactions" routerLinkActive="active" class="nav-item">
          <span class="nav-icon">≡</span> Transactions
        </a>
        <a routerLink="/categories" routerLinkActive="active" class="nav-item">
          <span class="nav-icon">◈</span> Categories
        </a>
      </nav>

      <div class="user-block">
        <div class="user-info">
          <div class="user-avatar">{{ initials() }}</div>
          <div class="user-text">
            <div class="user-name">{{ authService.currentUser()?.name }}</div>
            <div class="user-email">{{ authService.currentUser()?.email }}</div>
          </div>
        </div>
        <button class="logout-btn" (click)="authService.logout()" aria-label="Log out">
          ↩
        </button>
      </div>
    </aside>
  `,
  styles: [`
    .sidebar {
      width: 240px;
      height: 100vh;
      background: var(--paper-raised);
      border-right: 1px solid var(--line);
      display: flex;
      flex-direction: column;
      position: fixed;
      left: 0;
      top: 0;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-6) var(--space-5) var(--space-5);
    }

    .brand-mark {
      font-family: var(--font-display);
      font-size: 24px;
      color: var(--gold);
    }

    .brand-name {
      font-family: var(--font-display);
      font-size: 20px;
      font-weight: 600;
      letter-spacing: -0.01em;
    }

    .nav {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
      padding: 0 var(--space-3);
      flex: 1;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-3) var(--space-3);
      border-radius: var(--radius-sm);
      color: var(--ink-faint);
      font-size: 14px;
      font-weight: 500;
      transition: background-color 0.15s ease, color 0.15s ease;
    }

    .nav-icon {
      font-size: 15px;
      width: 18px;
      text-align: center;
    }

    .nav-item:hover {
      background: var(--green-soft);
      color: var(--ink);
    }

    .nav-item.active {
      background: var(--green-soft);
      color: var(--green);
      font-weight: 600;
    }

    .user-block {
      padding: var(--space-4) var(--space-4) var(--space-5);
      border-top: 1px solid var(--line);
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      flex: 1;
      min-width: 0;
    }

    .user-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--green);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-display);
      font-size: 14px;
      font-weight: 600;
      flex-shrink: 0;
    }

    .user-text {
      min-width: 0;
    }

    .user-name {
      font-size: 13px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-email {
      font-size: 12px;
      color: var(--ink-faint);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .logout-btn {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-sm);
      border: 1px solid var(--line);
      background: transparent;
      color: var(--ink-faint);
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.15s ease, color 0.15s ease;
    }

    .logout-btn:hover {
      background: var(--brick-soft);
      color: var(--brick);
      border-color: var(--brick);
    }

    @media (max-width: 768px) {
      .sidebar {
        width: 100%;
        height: auto;
        position: relative;
        flex-direction: row;
        align-items: center;
        border-right: none;
        border-bottom: 1px solid var(--line);
      }
      .nav {
        flex-direction: row;
        flex: 1;
      }
      .user-text { display: none; }
    }
  `]
})
export class ShellComponent {
  constructor(public authService: AuthService) {}

  initials(): string {
    const name = this.authService.currentUser()?.name ?? '';
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
}
