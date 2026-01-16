import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge'; // Added
import { UploadPlanning } from './components/upload-planning/upload-planning';
import { SettingsComponent } from './components/settings/settings';
import { CostComparisonComponent } from './components/cost-comparison/cost-comparison';
import { OptimizationDashboardComponent } from './components/optimization-dashboard/optimization-dashboard';
import { DashboardHomeComponent } from './components/dashboard-home/dashboard-home';
import { HistoryViewComponent } from './components/history-view/history-view';
import { LoginComponent } from './components/login/login';
import { AuthService } from './services/auth.service';
import { ThemeService } from './services/theme.service';
import { NotificationService } from './services/notification.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, 
    RouterOutlet, 
    MatIconModule, 
    MatButtonModule,
    MatMenuModule,
    MatBadgeModule,
    UploadPlanning, 
    SettingsComponent, 
    CostComparisonComponent, 
    OptimizationDashboardComponent, 
    DashboardHomeComponent, 
    HistoryViewComponent,
    LoginComponent
  ],
  template: `
    <!-- Login View -->
    <app-login *ngIf="!authService.isAuthenticated()"></app-login>

    <!-- Main App Layout (Protected) -->
    <div class="app-layout" [class.mobile-open]="isMobileMenuOpen()" *ngIf="authService.isAuthenticated()">
      <!-- Mobile Overlay -->
      <div class="mobile-overlay" (click)="toggleMobileMenu()"></div>

      <!-- Sidebar -->
      <aside class="sidebar">
        <div class="logo-section">
          <div class="logo-icon">
            <mat-icon>local_shipping</mat-icon>
          </div>
          <h1>OptiNav</h1>
          <button class="mobile-close" (click)="toggleMobileMenu()">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <nav class="nav-menu">
          <a class="nav-item" [class.active]="currentView() === 'dashboard'" (click)="navigate('dashboard')">
            <mat-icon>dashboard</mat-icon>
            <span>Tableau de Bord</span>
          </a>
          <a class="nav-item" [class.active]="currentView() === 'planning'" (click)="navigate('planning')">
            <mat-icon>calendar_today</mat-icon>
            <span>Planning</span>
          </a>
          <a class="nav-item" [class.active]="currentView() === 'comparison'" (click)="navigate('comparison')">
            <mat-icon>analytics</mat-icon>
            <span>Comparaison</span>
          </a>
          <a class="nav-item" [class.active]="currentView() === 'optimization'" (click)="navigate('optimization')">
            <mat-icon>auto_graph</mat-icon>
            <span>Optimisation</span>
          </a>
          <a class="nav-item" [class.active]="currentView() === 'settings'" (click)="navigate('settings')">
            <mat-icon>tune</mat-icon>
            <span>Paramètres</span>
          </a>
          <a class="nav-item" [class.active]="currentView() === 'history'" (click)="navigate('history')">
             <mat-icon>history</mat-icon>
             <span>Historique</span>
          </a>
        </nav>

        <div class="user-profile" [matMenuTriggerFor]="userMenu" style="cursor: pointer;">
          <div class="avatar">MS</div>
          <div class="info">
            <span class="name">Mouhamadou Sarr</span>
            <span class="role">Admin</span>
          </div>
          <mat-icon style="margin-left: auto; font-size: 20px; color: var(--text-secondary);">expand_more</mat-icon>
        </div>
        <mat-menu #userMenu="matMenu">
          <button mat-menu-item (click)="themeService.toggleTheme()">
            <mat-icon>{{ themeService.isDarkMode() ? 'light_mode' : 'dark_mode' }}</mat-icon>
            <span>Mode {{ themeService.isDarkMode() ? 'Clair' : 'Sombre' }}</span>
          </button>
          <button mat-menu-item (click)="logout()">
            <mat-icon>logout</mat-icon>
            <span>Déconnexion</span>
          </button>
        </mat-menu>
      </aside>

      <!-- Main Content -->
      <main class="main-content">
        <header class="top-bar">
          <div class="top-bar-left">
            <button class="menu-toggle" (click)="toggleMobileMenu()">
              <mat-icon>menu</mat-icon>
            </button>
            <h2>{{ getViewTitle() }}</h2>
          </div>
          <div class="actions">
            <!-- Theme Toggle (Quick Access) -->
            <button class="icon-btn" (click)="themeService.toggleTheme()" [title]="themeService.isDarkMode() ? 'Passer en mode clair' : 'Passer en mode sombre'">
                <mat-icon>{{ themeService.isDarkMode() ? 'light_mode' : 'dark_mode' }}</mat-icon>
            </button>

            <!-- Notifications -->
            <button class="icon-btn" [matMenuTriggerFor]="notificationMenu">
              <mat-icon [matBadge]="notificationService.unreadCount()" [matBadgeHidden]="notificationService.unreadCount() === 0" matBadgeColor="warn" matBadgeSize="small">notifications</mat-icon>
            </button>
            <mat-menu #notificationMenu="matMenu" class="notification-menu">
              <div class="notification-header" (click)="$event.stopPropagation()">
                <span>Notifications</span>
                <button mat-button color="primary" style="font-size: 12px;" (click)="notificationService.markAllAsRead()">Tout lire</button>
              </div>
              <div *ngIf="notificationService.notifications().length === 0" style="padding: 16px; text-align: center; color: var(--text-secondary);">
                Aucune notification
              </div>
              <button mat-menu-item *ngFor="let notif of notificationService.notifications()" [class.unread]="!notif.read" (click)="notificationService.markAsRead(notif.id)">
                <mat-icon [color]="notif.type === 'error' ? 'warn' : 'primary'" style="font-size: 20px;">
                  {{ notif.type === 'success' ? 'check_circle' : notif.type === 'error' ? 'error' : 'info' }}
                </mat-icon>
                <div style="display: flex; flex-direction: column; line-height: 1.2;">
                  <span style="font-weight: 500;">{{ notif.title }}</span>
                  <span style="font-size: 12px; opacity: 0.8;">{{ notif.message }}</span>
                </div>
              </button>
            </mat-menu>

            <button class="icon-btn hide-mobile"><mat-icon>help_outline</mat-icon></button>
          </div>
        </header>

        <div class="content-scroll">
          <app-dashboard-home *ngIf="currentView() === 'dashboard'" (goToUpload)="currentView.set('planning')" />
          <app-upload-planning *ngIf="currentView() === 'planning'" (uploadSuccess)="currentView.set('optimization')" />
          <app-cost-comparison *ngIf="currentView() === 'comparison'" />
          <app-optimization-dashboard *ngIf="currentView() === 'optimization'" />
          <app-settings *ngIf="currentView() === 'settings'" />
          <app-history-view *ngIf="currentView() === 'history'" />
          <router-outlet />
        </div>
      </main>
    </div>
  `,
  styles: `
    .app-layout {
      display: flex;
      height: 100vh;
      background: var(--bg-app);
      overflow: hidden;
      color: var(--text-main);
      position: relative;
    }

    /* Mobile Navigation */
    .menu-toggle {
      display: none;
      background: none;
      border: none;
      color: var(--text-main);
      cursor: pointer;
      margin-right: 12px;
      padding: 8px;
      border-radius: 50%;
    }
    .mobile-close {
      display: none;
      background: none;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      margin-left: auto;
    }
    .mobile-overlay {
      display: none;
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      z-index: 99;
      backdrop-filter: blur(2px);
    }

    /* Sidebar */
    .sidebar {
      width: 260px;
      background: var(--surface);
      border-right: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      padding: 0;
      flex-shrink: 0;
      z-index: 100;
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .logo-section {
      height: 72px;
      display: flex;
      align-items: center;
      padding: 0 24px;
      gap: 12px;
    }
    .logo-icon {
      width: 32px;
      height: 32px;
      background: var(--primary-color);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }
    .logo-section h1 {
      font-size: 18px;
      font-weight: 700;
      color: var(--text-main);
    }

    .nav-menu {
      flex: 1;
      padding: 16px 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .nav-item {
      display: flex;
      align-items: center;
      padding: 10px 16px;
      border-radius: var(--radius-md);
      color: var(--text-secondary);
      cursor: pointer;
      transition: all 0.2s ease;
      font-weight: 500;
      font-size: 14px;
    }
    .nav-item mat-icon {
      margin-right: 12px;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }
    .nav-item:hover {
      background: rgba(0,0,0,0.04);
      color: var(--text-main);
    }
    .nav-item.active {
      background: rgba(79, 70, 229, 0.1); 
      color: var(--primary-color);
    }

    .user-profile {
      padding: 16px 24px;
      border-top: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .avatar {
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, #a5b4fc, #6366f1);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: 13px;
    }
    .info {
      display: flex;
      flex-direction: column;
    }
    .info .name {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-main);
    }
    .info .role {
      font-size: 11px;
      color: var(--text-secondary);
    }

    /* Main Content */
    .main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      min-width: 0;
    }

    .top-bar {
      height: 72px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 24px;
      border-bottom: 1px solid var(--border-color);
      background: var(--surface);
    }
    .top-bar-left {
      display: flex;
      align-items: center;
    }
    .top-bar h2 {
      font-size: 20px;
      color: var(--text-main);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .actions {
      display: flex;
      gap: 4px;
    }
    .icon-btn {
      background: none;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      padding: 8px;
      border-radius: 50%;
    }
    .icon-btn:hover {
      background-color: rgba(0,0,0,0.05);
    }

    .content-scroll {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
    }

    /* Responsive Queries */
    @media (max-width: 960px) {
      .sidebar {
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
        transform: translateX(-100%);
      }
      .mobile-open .sidebar {
        transform: translateX(0);
      }
      .mobile-open .mobile-overlay {
        display: block;
      }
      .menu-toggle {
        display: block;
      }
      .mobile-close {
        display: block;
      }
      .top-bar {
        padding: 0 16px;
      }
      .content-scroll {
        padding: 16px;
      }
      .hide-mobile {
        display: none;
      }
    }
    
    @media (max-width: 600px) {
      .top-bar h2 {
        font-size: 18px;
      }
    }

    .notification-header {
      padding: 8px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border-color);
      font-weight: 600;
    }
    .unread {
      background-color: rgba(79, 70, 229, 0.05);
    }
  `,
})
export class App {
  currentView = signal<'dashboard' | 'planning' | 'comparison' | 'optimization' | 'settings' | 'history'>('dashboard');
  isMobileMenuOpen = signal<boolean>(false);

  constructor(
    public authService: AuthService,
    public themeService: ThemeService,
    public notificationService: NotificationService
  ) {}

  toggleMobileMenu() {
    this.isMobileMenuOpen.update(v => !v);
  }

  navigate(view: 'dashboard' | 'planning' | 'comparison' | 'optimization' | 'settings' | 'history') {
    this.currentView.set(view);
    this.isMobileMenuOpen.set(false);
  }

  getViewTitle() {
    switch (this.currentView()) {
      case 'dashboard': return "Vue d'Ensemble";
      case 'planning': return "Gestion du Planning";
      case 'comparison': return "Analyse & Coûts";
      case 'optimization': return "Optimisation";
      case 'settings': return "Configuration";
      case 'history': return "Historique";
      default: return "OptiNav";
    }
  }

  logout() {
    this.authService.logout();
  }
}
