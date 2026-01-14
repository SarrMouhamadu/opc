import { Component, signal, TemplateRef, ViewChild, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatBadgeModule } from '@angular/material/badge';

import { UploadPlanning } from './components/upload-planning/upload-planning';
import { SettingsComponent } from './components/settings/settings';

import { OptimizationDashboardComponent } from './components/optimization-dashboard/optimization-dashboard';
import { DashboardHomeComponent } from './components/dashboard-home/dashboard-home';
import { HistoryViewComponent } from './components/history-view/history-view';
import { LoginComponent } from './components/login/login';
import { AuthService } from './services/auth.service';
import { LogsService, LogEntry } from './services/logs.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, 
    RouterOutlet, 
    MatIconModule, 
    MatButtonModule,
    MatMenuModule,
    MatDialogModule,
    MatBadgeModule,
    UploadPlanning, 
    SettingsComponent, 
    OptimizationDashboardComponent, 
    DashboardHomeComponent, 
    HistoryViewComponent,
    LoginComponent
  ],
  template: `
    <!-- Login View -->
    <app-login *ngIf="!authService.isAuthenticated()"></app-login>

    <!-- Main App Layout (Protected) -->
    <div class="app-layout" *ngIf="authService.isAuthenticated()">
      <!-- Sidebar -->
      <aside class="sidebar">
        <div class="logo-section">
          <div class="logo-icon">
            <mat-icon>local_shipping</mat-icon>
          </div>
          <h1>OptiNav</h1>
        </div>

        <nav class="nav-menu">
          <a class="nav-item" [class.active]="currentView() === 'dashboard'" (click)="currentView.set('dashboard')">
            <mat-icon>dashboard</mat-icon>
            <span>Tableau de Bord</span>
          </a>
          <a class="nav-item" [class.active]="currentView() === 'planning'" (click)="currentView.set('planning')">
            <mat-icon>calendar_today</mat-icon>
            <span>Planning</span>
          </a>

          <a class="nav-item" [class.active]="currentView() === 'optimization'" (click)="currentView.set('optimization')">
            <mat-icon>auto_graph</mat-icon>
            <span>Optimisation</span>
          </a>
          <a class="nav-item" [class.active]="currentView() === 'settings'" (click)="currentView.set('settings')">
            <mat-icon>tune</mat-icon>
            <span>Paramètres</span>
          </a>
          <a class="nav-item" [class.active]="currentView() === 'history'" (click)="currentView.set('history')">
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
          <button mat-menu-item (click)="logout()">
            <mat-icon>logout</mat-icon>
            <span>Déconnexion</span>
          </button>
        </mat-menu>
      </aside>

      <!-- Main Content -->
      <main class="main-content">
        <header class="top-bar">
          <h2>{{ getViewTitle() }}</h2>
          <div class="actions">
            <button class="icon-btn" [matMenuTriggerFor]="notificationsMenu" (click)="loadNotifications()">
              <mat-icon [matBadge]="recentLogs.length" matBadgeSize="small" matBadgeColor="warn" [matBadgeHidden]="recentLogs.length === 0">notifications</mat-icon>
            </button>
            <mat-menu #notificationsMenu="matMenu" class="notification-menu">
              <div class="menu-header" (click)="$event.stopPropagation()">
                <h3>Activités Récentes</h3>
              </div>
              <div *ngFor="let log of recentLogs" mat-menu-item class="log-item">
                <mat-icon class="log-icon">info</mat-icon>
                <div class="log-content">
                  <div class="log-title">{{ log.action }}</div>
                  <div class="log-time">{{ log.timestamp | date:'short' }}</div>
                </div>
              </div>
              <div mat-menu-item *ngIf="recentLogs.length === 0" disabled>Aucune notification</div>
              <button mat-menu-item (click)="currentView.set('history')">Voir tout l'historique</button>
            </mat-menu>

            <button class="icon-btn" (click)="openHelp(helpDialog)"><mat-icon>help_outline</mat-icon></button>
          </div>
        </header>

        <div class="content-scroll">
          <app-dashboard-home *ngIf="currentView() === 'dashboard'" (goToUpload)="currentView.set('planning')" />
          <app-upload-planning *ngIf="currentView() === 'planning'" (uploadSuccess)="currentView.set('optimization')" />
          <app-optimization-dashboard *ngIf="currentView() === 'optimization'" />
          <app-settings *ngIf="currentView() === 'settings'" />
          <app-history-view *ngIf="currentView() === 'history'" />
          <router-outlet />
        </div>
      </main>
    </div>

    <!-- Help Dialog Template -->
    <ng-template #helpDialog>
      <h2 mat-dialog-title>Aide & Support</h2>
      <mat-dialog-content>
        <p>Bienvenue sur <strong>OptiNav</strong>, votre plateforme d'optimisation de transport.</p>
        
        <h3>Guide Rapide</h3>
        <ul>
          <li><strong>Planning</strong> : Importez vos fichiers Excel/CSV.</li>
          <li><strong>Optimisation</strong> : Lancez des simulations de regroupement.</li>
          <li><strong>Historique</strong> : Consultez vos rapports précédents.</li>
        </ul>

        <h3>Support Technique</h3>
        <p>Pour toute assistance technique, veuillez contacter l'équipe IT :</p>
        <p>📧 support@optinav.com<br>📞 +221 77 000 00 00</p>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button mat-dialog-close>Fermer</button>
      </mat-dialog-actions>
    </ng-template>
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
    
    .menu-header {
      padding: 8px 16px;
      border-bottom: 1px solid var(--border-color);
      margin-bottom: 4px;
    }
    .menu-header h3 { margin: 0; font-size: 14px; color: var(--text-main); }
    
    .log-item {
        display: flex;
        gap: 12px;
        align-items: center;
        height: auto;
        padding-top: 8px;
        padding-bottom: 8px;
    }
    .log-content { display: flex; flex-direction: column; line-height: 1.2; }
    .log-title { font-weight: 500; font-size: 13px; }
    .log-time { font-size: 11px; color: var(--text-secondary); }
    .log-icon { font-size: 18px; width: 18px; height: 18px; color: var(--primary-color); margin-right: 0 !important; }

    .content-scroll {
      flex: 1;
      overflow-y: auto;
      padding: 0; 
    }
  `,
})
export class App implements OnInit {
  currentView = signal<'dashboard' | 'planning' | 'comparison' | 'optimization' | 'settings' | 'history'>('dashboard');
  recentLogs: LogEntry[] = [];

  constructor(
    public authService: AuthService,
    private logsService: LogsService,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.loadNotifications();
  }

  loadNotifications() {
     if (this.authService.isAuthenticated()) {
        this.logsService.getLogs().subscribe(logs => {
          // Take last 5
          this.recentLogs = logs.slice(0, 5); 
        });
     }
  }

  openHelp(template: TemplateRef<any>) {
    this.dialog.open(template, { width: '400px' });
  }

  getViewTitle() {
    switch (this.currentView()) {
      case 'dashboard': return "Vue d'Ensemble";
      case 'planning': return "Gestion du Planning";

      case 'optimization': return "Optimisation & Simulation";
      case 'settings': return "Configuration";
      case 'history': return "Historique & Suivi";
      default: return "OptiNav";
    }
  }

  logout() {
    this.authService.logout();
  }
}
