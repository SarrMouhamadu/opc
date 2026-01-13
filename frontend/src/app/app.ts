import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { UploadPlanning } from './components/upload-planning/upload-planning';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, MatToolbarModule, MatIconModule, UploadPlanning],
  template: `
    <mat-toolbar color="primary" class="main-toolbar">
      <mat-icon>local_shipping</mat-icon>
      <span class="logo">OptiTrans SaaS</span>
    </mat-toolbar>

    <main class="content">
      <app-upload-planning />
      <router-outlet />
    </main>
  `,
  styles: `
    .main-toolbar {
      display: flex;
      gap: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .logo {
      font-weight: 500;
      letter-spacing: 0.5px;
    }
    .content {
      padding: 20px;
      background: #f8f9fa;
      min-height: calc(100vh - 64px);
    }
  `,
})
export class App {
  protected readonly title = signal('frontend');
}
