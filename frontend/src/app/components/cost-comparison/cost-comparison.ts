import { Component, OnInit, computed, effect } from '@angular/core';
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
    <div class="page-container">
      <header class="page-header">
        <div class="header-content">
          <h2>Analyse Comparative</h2>
          <p>Estimation des coûts selon les différentes options de transport.</p>
        </div>
        <button mat-flat-button color="primary" (click)="calculate()" [disabled]="loading || !hasData()">
          <mat-icon>play_arrow</mat-icon> Lancer le calcul
        </button>
      </header>

      <div *ngIf="!hasData()" class="empty-state">
        <div class="empty-icon">
          <mat-icon>analytics</mat-icon>
        </div>
        <h3>Aucune donnée à analyser</h3>
        <p>Veuillez d'abord importer un planning.</p>
      </div>

      <mat-progress-bar mode="indeterminate" *ngIf="loading" class="loading-bar"></mat-progress-bar>

      <div class="dashboard" *ngIf="results">
        <!-- Audit Verification -->
        <div class="audit-summary">
            <div class="audit-badge"><mat-icon>analytics</mat-icon> Audit : {{ results.n_lines | number }} lignes traitées</div>
            <div class="audit-badge"><mat-icon>person_outline</mat-icon> {{ results.n_employees }} salariés référencés</div>
            <div class="audit-badge"><mat-icon>event_note</mat-icon> {{ results.n_days }} jours de planning</div>
        </div>

        <!-- Stats Widgets -->
        <div class="stats-grid">
          <!-- Option 1 Widget -->
          <div class="stat-card">
            <div class="stat-header">
              <span class="stat-label">Option 1</span>
              <mat-icon class="option-icon opt1">account_balance_wallet</mat-icon>
            </div>
            <div class="stat-value">{{ results.option_1_total | number:'1.0-0' }} FCFA</div>
            <div class="unit-stat">Moyenne : <strong>{{ results.avg_cost_per_person | number:'1.0-0' }} FCFA</strong> / salarié / mois</div>
            <div class="stat-desc">Forfait Mensuel Fixe</div>
          </div>

          <!-- Option 2 Widget -->
          <div class="stat-card">
            <div class="stat-header">
              <span class="stat-label">Option 2</span>
              <mat-icon class="option-icon opt2">local_taxi</mat-icon>
            </div>
            <div class="stat-value">{{ results.option_2_total | number:'1.0-0' }} FCFA</div>
            <div class="unit-stat">Moyenne : <strong>{{ results.avg_cost_per_pickup | number:'1.0-0' }} FCFA</strong> / trajet (unitaire)</div>
            <div class="stat-desc">Paiement à la Prise en Charge</div>
          </div>

          <!-- Savings Widget -->
          <div class="stat-card highlight">
            <div class="stat-header">
              <span class="stat-label">Différentiel de Coût</span>
              <mat-icon class="savings-icon">balance</mat-icon>
            </div>
            <div class="stat-value savings-text">
                {{ (results.option_1_total > results.option_2_total ? '-' : '+') }}
                {{ results.savings | number:'1.0-0' }} FCFA
            </div>
            <div class="stat-desc">
              Solution optimisée : <strong>{{ results.best_option }}</strong>
            </div>
          </div>
        </div>

        <!-- Detailed Analysis -->
        <mat-card class="details-section">
          <div class="section-header">
            <h3>Registres d'Extraction (Audit Ligne par Ligne)</h3>
          </div>
          <div class="details-content">
            <div class="grid-2-col">
              <!-- Detail Col 1 -->
              <div class="detail-column">
                <div class="col-header">
                  <h4>Extraction Forfaitaire (Salariés)</h4>
                  <span class="badge opt1">Reference</span>
                </div>
                <div class="list-container">
                  <div *ngFor="let item of results.details_option_1" class="list-item">
                    <div class="item-main">
                      <span class="item-date">{{ item['Employee ID'] }}</span>
                      <span class="item-meta">Zone {{ item['Zone'] }}</span>
                    </div>
                    <div class="item-end">
                      <span class="item-price">{{ item['emp_cost'] | number:'1.0-0' }} FCFA</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Detail Col 2 -->
              <div class="detail-column">
                <div class="col-header">
                  <h4>Extraction Prise en Charge (Trajets)</h4>
                  <span class="badge opt2">Volume</span>
                </div>
                 <div class="list-container">
                  <div *ngFor="let item of results.details_option_2" class="list-item">
                    <div class="item-main">
                      <span class="item-date">{{ item['Employee ID'] }}</span>
                      <span class="item-meta">{{ item['Ligne_Bus_Option_2'] }}</span>
                    </div>
                    <div class="item-end">
                      <span class="item-price">{{ item['pickup_cost'] | number:'1.0-0' }} FCFA</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </mat-card>
      </div>
    </div>
  `,
  styles: `
    .page-container { padding: 32px 40px; max-width: 1200px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; gap: 16px; }
    .header-content h2 { font-size: 24px; margin-bottom: 4px; color: var(--text-main); }
    .header-content p { color: var(--text-secondary); margin: 0; font-size: 14px; }

    .empty-state {
      text-align: center; padding: 64px 24px; color: var(--text-secondary); background: var(--surface);
      border-radius: var(--radius-lg); border: 1px dashed var(--border-color);
    }
    .empty-icon { width: 64px; height: 64px; background: rgba(0,0,0,0.04); border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; }
    .empty-icon mat-icon { font-size: 32px; width: 32px; height: 32px; color: #9ca3af; }

    .loading-bar { margin-bottom: 24px; border-radius: 4px; }

    /* Audit Summary */
    .audit-summary { display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
    .audit-badge { background: rgba(0,0,0,0.03); padding: 8px 16px; border-radius: 8px; border: 1px solid var(--border-color); font-size: 13px; font-weight: 600; color: var(--text-secondary); display: flex; align-items: center; gap: 8px; }
    .audit-badge mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--primary-color); }

    /* Stats Grid */
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; margin-bottom: 32px; }
    .stat-card { background: var(--surface); border-radius: var(--radius-lg); padding: 24px; box-shadow: var(--shadow-sm); border: 1px solid var(--border-color); display: flex; flex-direction: column; }
    .stat-card.highlight { background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; }
    .stat-card.highlight .stat-label, .stat-card.highlight .stat-value, .stat-card.highlight .stat-desc, .stat-card.highlight strong { color: white; }
    .stat-card.highlight .savings-icon { color: rgba(255,255,255,0.8); }

    .stat-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
    .stat-label { font-size: 11px; font-weight: 600; text-transform: uppercase; color: var(--text-secondary); letter-spacing: 1px; }
    .option-icon { color: var(--text-secondary); }
    .option-icon.opt1 { color: var(--primary-color); }
    .option-icon.opt2 { color: #f59e0b; }

    .stat-value { font-size: 28px; font-weight: 700; color: var(--text-main); margin-bottom: 8px; }
    .unit-stat { font-size: 13px; color: var(--text-secondary); margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px dashed var(--border-color); }
    .unit-stat strong { color: var(--text-main); }
    .stat-card.highlight .unit-stat { border-color: rgba(255,255,255,0.2); }
    .stat-desc { font-size: 12px; color: var(--text-secondary); }

    /* Details Section */
    .details-section { border-radius: var(--radius-lg); border: 1px solid var(--border-color); box-shadow: var(--shadow-sm); overflow: hidden; background: var(--surface); }
    .section-header { padding: 20px 24px; border-bottom: 1px solid var(--border-color); background: rgba(0,0,0,0.01); }
    .section-header h3 { font-size: 16px; margin: 0; color: var(--text-main); }
    
    .grid-2-col { display: grid; grid-template-columns: 1fr 1fr; }
    .detail-column { padding: 24px; }
    .detail-column:first-child { border-right: 1px solid var(--border-color); }

    .col-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .col-header h4 { font-size: 13px; color: var(--text-secondary); margin: 0; font-weight: 600; text-transform: uppercase; }
    
    .badge { padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; text-transform: uppercase; }
    .badge.opt1 { background: rgba(79, 70, 229, 0.1); color: var(--primary-color); }
    .badge.opt2 { background: rgba(236, 72, 153, 0.1); color: var(--secondary-color); }

    .list-item { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--border-color); }
    .list-item:last-child { border-bottom: none; }
    .item-main { display: flex; flex-direction: column; }
    .item-date { font-weight: 600; font-size: 14px; color: var(--text-main); }
    .item-meta { font-size: 12px; color: var(--text-secondary); margin-top: 2px; }
    .item-end { display: flex; align-items: center; gap: 8px; }
    .zone-badge { font-size: 10px; background: rgba(0,0,0,0.05); padding: 2px 6px; border-radius: 4px; color: var(--text-secondary); font-weight: 600; }
    .item-price { font-weight: 700; color: var(--text-main); font-size: 14px; }

    @media (max-width: 960px) {
      .page-container { padding: 20px; }
      .page-header { flex-direction: column; align-items: flex-start; }
      .page-header button { width: 100%; }
      .grid-2-col { grid-template-columns: 1fr; }
      .detail-column:first-child { border-right: none; border-bottom: 1px solid var(--border-color); }
    }

    @media (max-width: 600px) {
      .header-content h2 { font-size: 20px; }
      .stat-value { font-size: 24px; }
      .detail-column { padding: 16px; }
    }
  `
})
export class CostComparisonComponent {
  results: CostBreakdown | null = null;
  loading = false;
  hasData = computed(() => this.planningService.currentPlanning().length > 0);

  constructor(
    private costsService: CostsService,
    private planningService: PlanningService
  ) {
    effect(() => {
      if (this.hasData() && !this.results) {
        this.calculate();
      }
    });
  }

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

  getPercentage(value: number): number {
    if (!this.results) return 0;
    const max = Math.max(this.results.option_1_total, this.results.option_2_total);
    return (value / max) * 100;
  }
}
