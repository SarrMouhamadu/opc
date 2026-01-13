import { Component, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { CostsService, CostBreakdown } from '../../services/costs.service';
import { PlanningService } from '../../services/planning.service';

@Component({
  selector: 'app-cost-comparison',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatDividerModule
  ],
  template: `
    <div class="comparison-container">
      <div class="header">
        <h2>Comparaison des Options de Transport</h2>
        <button mat-raised-button color="accent" (click)="calculate()" [disabled]="loading || !hasData()">
          <mat-icon>calculate</mat-icon> Lancer le calcul
        </button>
      </div>

      <div *ngIf="!hasData()" class="no-data">
        <mat-icon>info</mat-icon>
        <p>Veuillez d'abord uploader un planning dans l'onglet "Planning".</p>
      </div>

      <mat-progress-bar mode="indeterminate" *ngIf="loading"></mat-progress-bar>

      <div class="dashboard" *ngIf="results">
        <!-- Main Summary Cards -->
        <div class="cards-grid">
          <mat-card class="summary-card option1">
            <mat-card-header>
              <mat-card-title>Option 1 : Forfait Véhicule</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="total-value">{{ results.option_1_total | currency:'EUR' }}</div>
              <p>Basé sur le forfait mensuel par zone max.</p>
            </mat-card-content>
          </mat-card>

          <mat-card class="summary-card option2">
            <mat-card-header>
              <mat-card-title>Option 2 : Prise en charge</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="total-value">{{ results.option_2_total | currency:'EUR' }}</div>
              <p>Basé sur un prix fixe par trajet/employé.</p>
            </mat-card-content>
          </mat-card>

          <mat-card class="summary-card savings" [class.positive]="results.savings > 0">
            <mat-card-header>
              <mat-card-title>Économie Potentielle</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="total-value">{{ results.savings | currency:'EUR' }}</div>
              <p>Choix recommandé : <strong>{{ results.best_option }}</strong></p>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Details Section -->
        <mat-card class="details-card">
          <h3>Détails du calcul (Extraits)</h3>
          <div class="details-grid">
            <div class="details-list">
              <h4>Option 1 (Forfait Véhicule)</h4>
              <div *ngFor="let item of results.details_option_1" class="detail-item">
                <span class="date">{{ item.date }} {{ item.time }}</span>
                <span class="count">{{ item.count }} pers.</span>
                <span class="zone">Zone {{ item.max_zone }}</span>
                <span class="price">{{ item.cost | currency:'EUR' }}</span>
              </div>
            </div>
            <mat-divider [vertical]="true"></mat-divider>
            <div class="details-list">
              <h4>Option 2 (Prise en charge)</h4>
              <div *ngFor="let item of results.details_option_2" class="detail-item">
                <span>{{ item.count }} trajets</span>
                <span>x {{ item.unit_price | currency:'EUR' }}</span>
                <span class="price">{{ item.total | currency:'EUR' }}</span>
              </div>
            </div>
          </div>
        </mat-card>
      </div>
    </div>
  `,
  styles: `
    .comparison-container { padding: 24px; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
    .no-data { text-align: center; padding: 48px; color: #666; }
    .cards-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; margin-bottom: 32px; }
    .summary-card { border-radius: 16px; border-left: 6px solid #ccc; transition: transform 0.2s; }
    .summary-card:hover { transform: translateY(-4px); }
    .option1 { border-left-color: #3f51b5; }
    .option2 { border-left-color: #673ab7; }
    .savings.positive { border-left-color: #4caf50; background: #f1f8e9; }
    .total-value { font-size: 36px; font-weight: 600; margin: 16px 0; color: #333; }
    .details-card { padding: 24px; border-radius: 16px; }
    .details-grid { display: flex; gap: 32px; margin-top: 24px; }
    .details-list { flex: 1; }
    .detail-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; font-size: 13px; }
    .detail-item .price { font-weight: 500; color: #2e7d32; }
    h4 { color: #666; margin-bottom: 16px; }
  `
})
export class CostComparisonComponent {
  results: CostBreakdown | null = null;
  loading = false;
  hasData = computed(() => this.planningService.currentPlanning().length > 0);

  constructor(
    private costsService: CostsService,
    private planningService: PlanningService
  ) {}

  calculate() {
    const data = this.planningService.currentPlanning();
    if (data.length === 0) return;

    this.loading = true;
    this.costsService.calculateCosts(data).subscribe({
      next: (res) => {
        this.results = res;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}
