import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SettingsService, Settings } from '../../services/settings.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    MatButtonModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    MatSnackBarModule
  ],
  providers: [],
  template: `
    <div class="page-container">
      <header class="page-header">
        <div class="header-content">
          <h2>Configuration</h2>
          <p>Gérez les contraintes métier et les coûts de référence.</p>
        </div>
        <button mat-raised-button color="primary" (click)="save()">
          <mat-icon>save</mat-icon> Sauvegarder
        </button>
      </header>

      <div class="settings-grid">
        <!-- Main Settings -->
        <div class="settings-column">
          <section class="settings-section">
            <div class="section-header">
              <h3>Règles d'Optimisation</h3>
              <p>Paramètres globaux pour le regroupement.</p>
            </div>
            <div class="card-content">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Fenêtre de regroupement (minutes)</mat-label>
                <input matInput type="number" [(ngModel)]="settings.grouping_window_minutes">
                <mat-hint>Intervalle max pour regrouper (ex: 20)</mat-hint>
              </mat-form-field>
            </div>
          </section>

          <section class="settings-section">
             <div class="section-header">
              <h3>Option 2 (Prise en charge)</h3>
              <p>Coût unitaire pour le transport en commun/bus.</p>
            </div>
             <div class="card-content">
               <mat-form-field appearance="outline" class="full-width">
                 <mat-label>Prix par Ligne de Bus (13 places)</mat-label>
                 <input matInput type="number" [(ngModel)]="settings.option_2_bus_price">
                 <mat-hint>Coût forfaitaire pour un bus de ligne (ex: 35000 FCFA)</mat-hint>
               </mat-form-field>
             </div>
          </section>
        </div>

        <!-- Vehicle Fleet -->
        <div class="settings-column">
          <section class="settings-section">
            <div class="section-header with-action">
              <div>
                <h3>Flotte de Véhicules</h3>
                <p>Capacités et tarifs de base.</p>
              </div>
              <button mat-icon-button (click)="addVehicle()" color="primary">
                <mat-icon>add_circle</mat-icon>
              </button>
            </div>
            
            <div class="vehicle-list">
              <div *ngFor="let vehicle of settings.vehicle_types; let i = index" class="vehicle-card">
                <div class="vehicle-header">
                  <span class="vehicle-title">Véhicule #{{ i + 1 }}</span>
                  <button mat-icon-button color="warn" (click)="removeVehicle(i)" class="delete-btn">
                    <mat-icon>close</mat-icon>
                  </button>
                </div>
                
                <div class="vehicle-form">
                  <mat-form-field appearance="outline" class="compact">
                    <mat-label>Nom</mat-label>
                    <input matInput [(ngModel)]="vehicle.name" placeholder="Ex: Berline">
                  </mat-form-field>
                  
                  <div class="row">
                    <mat-form-field appearance="outline" class="compact">
                      <mat-label>Capacité</mat-label>
                      <input matInput type="number" [(ngModel)]="vehicle.capacity">
                    </mat-form-field>
                    <mat-form-field appearance="outline" class="compact">
                      <mat-label>Prix Base</mat-label>
                      <input matInput type="number" [(ngModel)]="vehicle.base_price">
                    </mat-form-field>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  `,
  styles: `
    .page-container {
      padding: 32px 40px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 40px;
    }
    .header-content h2 { font-size: 24px; margin-bottom: 4px; color: var(--text-main); }
    .header-content p { color: var(--text-secondary); margin: 0; font-size: 14px; }

    .settings-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
      align-items: start;
    }

    .settings-section {
      background: var(--surface);
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-color);
      box-shadow: var(--shadow-sm);
      margin-bottom: 24px;
      overflow: hidden;
    }

    .section-header {
      padding: 20px 24px;
      border-bottom: 1px solid var(--border-color);
      background: #fcfcfc;
    }
    .section-header.with-action {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .section-header h3 { font-size: 16px; margin: 0 0 4px 0; color: var(--text-main); }
    .section-header p { margin: 0; font-size: 13px; color: var(--text-secondary); }

    .card-content { padding: 24px; }

    .full-width { width: 100%; }

    /* Vehicle Cards */
    .vehicle-list {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .vehicle-card {
      background: #f9fafb;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      padding: 16px;
    }
    .vehicle-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .vehicle-title { font-weight: 600; font-size: 13px; color: var(--text-secondary); text-transform: uppercase; }
    .delete-btn { width: 24px; height: 24px; line-height: 24px; }
    .delete-btn mat-icon { font-size: 18px; }

    .vehicle-form { display: flex; flex-direction: column; gap: 8px; }
    .row { display: flex; gap: 12px; }
    
    ::ng-deep .compact .mat-mdc-form-field-wrapper { padding-bottom: 0; }
    ::ng-deep .compact .mat-mdc-form-field-infix { padding-top: 8px; padding-bottom: 8px; min-height: 40px; }

    .info-box {
      display: flex;
      gap: 12px;
      padding: 12px;
      background: #eff6ff;
      border-radius: 8px;
      color: #1e40af;
      font-size: 13px;
      line-height: 1.4;
    }
  `
})
export class SettingsComponent implements OnInit {
  settings: Settings = {
    grouping_window_minutes: 20,
    vehicle_types: []
  };

  constructor(
    private settingsService: SettingsService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.settingsService.getSettings().subscribe(res => {
      this.settings = res;
    });
  }

  addVehicle() {
    this.settings.vehicle_types.push({ name: '', capacity: 4, base_price: 0 });
  }

  removeVehicle(index: number) {
    this.settings.vehicle_types.splice(index, 1);
  }

  save() {
    this.settingsService.updateSettings(this.settings).subscribe({
      next: () => {
        this.snackBar.open('Configuration sauvegardée', 'Fermer', { duration: 3000 });
      },
      error: (err) => {
        this.snackBar.open(err.error?.detail || 'Erreur de sauvegarde', 'Fermer', { duration: 5000 });
      }
    });
  }
}
