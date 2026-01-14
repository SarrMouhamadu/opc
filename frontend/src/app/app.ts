import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { UploadPlanning } from './components/upload-planning/upload-planning';
import { SettingsComponent } from './components/settings/settings';
import { CostComparisonComponent } from './components/cost-comparison/cost-comparison';
import { OptimizationDashboardComponent } from './components/optimization-dashboard/optimization-dashboard';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, MatIconModule, UploadPlanning, SettingsComponent, CostComparisonComponent, OptimizationDashboardComponent],
  template: `
    <div class="app-layout">
      <!-- Sidebar -->
      <aside class="sidebar">
        <div class="logo-section">
          <div class="logo-icon">
            <mat-icon>local_shipping</mat-icon>
          </div>
          <h1>OptiNav</h1>
        </div>

        <nav class="nav-menu">
          <a class="nav-item" [class.active]="currentView() === 'planning'" (click)="currentView.set('planning')">
            <mat-icon>calendar_today</mat-icon>
            <span>Planning</span>
          </a>
          <a class="nav-item" [class.active]="currentView() === 'comparison'" (click)="currentView.set('comparison')">
            <mat-icon>analytics</mat-icon>
            <span>Analyse</span>
          </a>
          <a class="nav-item" [class.active]="currentView() === 'optimization'" (click)="currentView.set('optimization')">
            <mat-icon>auto_graph</mat-icon>
            <span>Optimisation</span>
          </a>
          <a class="nav-item" [class.active]="currentView() === 'settings'" (click)="currentView.set('settings')">
            <mat-icon>tune</mat-icon>
            <span>Paramètres</span>
          </a>
        </nav>

        <div class="user-profile">
          <div class="avatar">JS</div>
          <div class="info">
            <span class="name">John Smith</span>
            <span class="role">Admin</span>
          </div>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="main-content">
        <header class="top-bar">
          <h2>{{ getViewTitle() }}</h2>
          <div class="actions">
            <!-- Placeholders for future header actions -->
            <button class="icon-btn"><mat-icon>notifications</mat-icon></button>
            <button class="icon-btn"><mat-icon>help_outline</mat-icon></button>
          </div>
        </header>

        <div class="content-scroll">
          <app-upload-planning *ngIf="currentView() === 'planning'" />
          <app-cost-comparison *ngIf="currentView() === 'comparison'" />
          <app-optimization-dashboard *ngIf="currentView() === 'optimization'" />
          <app-settings *ngIf="currentView() === 'settings'" />
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
    }

    .logo-section {
      height: 80px;
      display: flex;
      align-items: center;
      padding: 0 24px;
      gap: 12px;
    }
    .logo-icon {
      width: 36px;
      height: 36px;
      background: var(--primary-color);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }
    .logo-section h1 {
      font-size: 20px;
      font-weight: 700;
      color: var(--text-main);
    }

    .nav-menu {
      flex: 1;
      padding: 24px 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .nav-item {
      display: flex;
      align-items: center;
      padding: 12px 16px;
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
      background: var(--bg-app);
      color: var(--text-main);
    }
    .nav-item.active {
      background: #eff6ff; /* Light indigo tint */
      color: var(--primary-color);
    }

    .user-profile {
      padding: 24px;
      border-top: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .avatar {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, #a5b4fc, #6366f1);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: 14px;
    }
    .info {
      display: flex;
      flex-direction: column;
    }
    .info .name {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-main);
    }
    .info .role {
      font-size: 12px;
      color: var(--text-secondary);
    }

    /* Main Content */
    .main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .top-bar {
      height: 80px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 40px;
      border-bottom: 1px solid var(--border-color); /* Optional: separate header */
      background: var(--bg-app); /* Transparent or solid */
    }
    .top-bar h2 {
      font-size: 24px;
      color: var(--text-main);
    }
    .icon-btn {
      background: none;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      padding: 8px;
    }

    .content-scroll {
      flex: 1;
      overflow-y: auto;
      padding: 0; 
    }
  `,
})
export class App {
  currentView = signal<'planning' | 'comparison' | 'optimization' | 'settings'>('planning');

  getViewTitle() {
    switch (this.currentView()) {
      case 'planning': return 'Gestion du Planning';
      case 'comparison': return 'Analyse & Coûts';
      case 'optimization': return 'Optimisation & Simulation';
      case 'settings': return 'Configuration';
      default: return 'OptiNav';
    }
  }
}
