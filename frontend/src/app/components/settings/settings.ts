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
import { SettingsService, Settings, VehicleType } from '../../services/settings.service';

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
  template: `
    <div class="settings-container">
      <mat-card class="settings-card">
        <mat-card-header>
          <mat-card-title>Paramétrage des Règles Métier</mat-card-title>
          <mat-card-subtitle>Configurez les contraintes d'optimisation et les capacités</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <section class="section">
            <h3>Optimisation</h3>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Fenêtre de regroupement (minutes)</mat-label>
              <input matInput type="number" [(ngModel)]="settings.grouping_window_minutes">
              <mat-hint>Intervalle maximum pour regrouper des employés (ex: 20 min)</mat-hint>
            </mat-form-field>
          </section>

          <section class="section">
            <h3>Type de Véhicules</h3>
            <div class="vehicle-list">
              <div *ngFor="let vehicle of settings.vehicle_types; let i = index" class="vehicle-item">
                <mat-form-field appearance="outline">
                  <mat-label>Nom</mat-label>
                  <input matInput [(ngModel)]="vehicle.name">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Capacité</mat-label>
                  <input matInput type="number" [(ngModel)]="vehicle.capacity">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Prix Base</mat-label>
                  <input matInput type="number" [(ngModel)]="vehicle.base_price">
                </mat-form-field>
                <button mat-icon-button color="warn" (click)="removeVehicle(i)">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
              <button mat-stroked-button color="primary" (click)="addVehicle()">
                <mat-icon>add</mat-icon> Ajouter un véhicule
              </button>
            </div>
          </section>
        </mat-card-content>

        <mat-card-actions align="end">
          <button mat-raised-button color="primary" (click)="save()">
            <mat-icon>save</mat-icon> Sauvegarder
          </button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: `
    .settings-container {
      padding: 24px;
      display: flex;
      justify-content: center;
    }
    .settings-card {
      width: 100%;
      max-width: 800px;
      border-radius: 12px;
    }
    .section {
      margin-bottom: 32px;
    }
    .full-width {
      width: 100%;
    }
    .vehicle-item {
      display: flex;
      gap: 16px;
      align-items: center;
      margin-bottom: 8px;
    }
    h3 {
      border-bottom: 2px solid #eee;
      padding-bottom: 8px;
      margin-bottom: 20px;
      color: #3f51b5;
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
        this.snackBar.open('Paramètres sauvegardés', 'Fermer', { duration: 3000 });
      },
      error: (err) => {
        this.snackBar.open(err.error?.detail || 'Erreur de sauvegarde', 'Fermer', { duration: 5000 });
      }
    });
  }
}
