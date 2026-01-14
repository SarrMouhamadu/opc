import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="login-container">
      <mat-card class="login-card">
        <div class="header">
          <div class="logo-icon">
            <mat-icon>local_shipping</mat-icon>
          </div>
          <h2>OptiNav</h2>
          <p>Connexion à votre espace</p>
        </div>

        <form (submit)="onLogin($event)">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Nom d'utilisateur</mat-label>
            <input matInput [(ngModel)]="username" name="username" required>
            <mat-icon matPrefix>person</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Mot de passe</mat-label>
            <input matInput [(ngModel)]="password" name="password" type="password" required>
            <mat-icon matPrefix>lock</mat-icon>
          </mat-form-field>

          <div *ngIf="error()" class="error-msg">
            {{ error() }}
          </div>

          <button mat-flat-button color="primary" class="login-btn" type="submit" [disabled]="loading()">
            <span *ngIf="!loading()">Se connecter</span>
            <mat-spinner *ngIf="loading()" diameter="20"></mat-spinner>
          </button>
        </form>
      </mat-card>
    </div>
  `,
  styles: `
    .login-container {
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f3f4f6;
    }
    .login-card {
      width: 100%;
      max-width: 400px;
      padding: 32px;
      border-radius: 16px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
    .header {
      text-align: center;
      margin-bottom: 32px;
    }
    .logo-icon {
      width: 48px;
      height: 48px;
      background: var(--primary-color, #4f46e5);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      margin: 0 auto 16px;
    }
    .logo-icon mat-icon { font-size: 32px; width: 32px; height: 32px; }
    .header h2 { font-size: 24px; font-weight: 700; margin: 0; color: #1f2937; }
    .header p { color: #6b7280; margin-top: 4px; }
    
    .full-width { width: 100%; margin-bottom: 16px; }
    
    .error-msg {
      color: #dc2626;
      background: #fee2e2;
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 16px;
      font-size: 14px;
      text-align: center;
    }

    .login-btn {
      width: 100%;
      height: 48px;
      font-size: 16px;
    }
  `
})
export class LoginComponent {
  username = '';
  password = '';
  loading = signal(false);
  error = signal('');

  constructor(private authService: AuthService) {}

  onLogin(event: Event) {
    event.preventDefault();
    if (!this.username || !this.password) return;

    this.loading.set(true);
    this.error.set('');

    this.authService.login(this.username, this.password).subscribe({
      next: () => {
        this.loading.set(false);
        // Navigation handled by auth service state change in App 
      },
      error: (err) => {
        console.error('Login failed', err);
        this.loading.set(false);
        this.error.set("Identifiants incorrects. Veuillez réessayer.");
      }
    });
  }
}
