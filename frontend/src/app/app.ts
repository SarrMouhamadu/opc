import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { UploadPlanning } from './components/upload-planning/upload-planning';
import { SettingsComponent } from './components/settings/settings';
import { CostComparisonComponent } from './components/cost-comparison/cost-comparison';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, MatToolbarModule, MatIconModule, MatButtonModule, UploadPlanning, SettingsComponent, CostComparisonComponent],
  template: `
    <mat-toolbar color="primary" class="main-toolbar">
      <div class="logo-container">
        <mat-icon>local_shipping</mat-icon>
        <span class="logo">OptiTrans SaaS</span>
      </div>
      <div class="nav-links">
        <button mat-button (click)="currentView.set('planning')" [class.active]="currentView() === 'planning'">
          Planning
        </button>
        <button mat-button (click)="currentView.set('comparison')" [class.active]="currentView() === 'comparison'">
          Comparaison
        </button>
        <button mat-button (click)="currentView.set('settings')" [class.active]="currentView() === 'settings'">
          Paramètres
        </button>
      </div>
    </mat-toolbar>

    <main class="content">
      <app-upload-planning *ngIf="currentView() === 'planning'" />
      <app-cost-comparison *ngIf="currentView() === 'comparison'" />
      <app-settings *ngIf="currentView() === 'settings'" />
      <router-outlet />
    </main>
  `,
  styles: `
    .main-toolbar {
      display: flex;
      justify-content: space-between;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .logo-container {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .logo {
      font-weight: 500;
      letter-spacing: 0.5px;
    }
    .nav-links {
      display: flex;
      gap: 8px;
    }
    .active {
      background: rgba(255,255,255,0.1);
      border-bottom: 2px solid white;
    }
    .content {
      padding: 20px;
      background: #f8f9fa;
      min-height: calc(100vh - 64px);
    }
  `,
})
export class App {
  currentView = signal<'planning' | 'comparison' | 'settings'>('planning');
}
