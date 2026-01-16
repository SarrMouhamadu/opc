import { Component, computed, signal, Output, EventEmitter, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { DashboardService, CostBreakdown } from '../../services/dashboard.service';
import { PlanningService } from '../../services/planning.service';
import { HistoryService } from '../../services/history.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatProgressBarModule,
    MatSnackBarModule
  ],
  template: `
    <div class="page-container">
      <header class="page-header">
        <div class="header-content">
          <h2>Tableau de Bord Décisionnel</h2>
          <p>Conformité stricte : Analyse comparative des coûts et de l'efficience.</p>
        </div>
        <div class="actions">
          <button mat-flat-button color="accent" (click)="archive()" [disabled]="!analysis">
            <mat-icon>archive</mat-icon> Archiver
          </button>
          <button mat-stroked-button color="primary" [matMenuTriggerFor]="exportMenu" [disabled]="!analysis">
            <mat-icon>download</mat-icon> Exporter
          </button>
          <mat-menu #exportMenu="matMenu">
            <button mat-menu-item (click)="export('excel')">
              <mat-icon>table_view</mat-icon> Format Excel (.xlsx)
            </button>
            <button mat-menu-item (click)="export('pdf')">
              <mat-icon>picture_as_pdf</mat-icon> Rapport PDF
            </button>
          </mat-menu>
        </div>
      </header>

      <div *ngIf="!hasData()" class="empty-state">
        <div class="empty-icon">
          <mat-icon>dashboard</mat-icon>
        </div>
        <h3>En attente de données</h3>
        <p>Importez un planning (avec Ligne_Bus_Option_2) pour l'analyse.</p>
        <button mat-flat-button color="primary" (click)="goToUpload.emit()">Aller au Planning</button>
      </div>

      <div class="dashboard-content" *ngIf="analysis">
        <!-- Main Summary -->
        <div class="summary-section">
            <mat-card class="main-card">
                <mat-card-header>
                    <mat-card-title>Recommandation Automatique</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                    <div class="recommendation-box" [class.opt1]="analysis.best_option.includes('Option 1')" [class.opt2]="analysis.best_option.includes('Option 2')">
                       <strong>{{ analysis.best_option }}</strong>
                       <span>Économie estimée : {{ analysis.savings | number:'1.0-0' }} FCFA</span>
                    </div>
                </mat-card-content>
            </mat-card>
        </div>

        <!-- Strict Comparison Grid -->
        <h3 class="section-title">Indicateurs de Performance (KPIs)</h3>
        <div class="kpi-grid">
            <!-- Option 1 Card -->
            <mat-card class="kpi-card">
                <div class="card-header opt1-header">
                    <h4>Option 1 (Véhicules)</h4>
                    <span class="total-price">{{ analysis.option_1_total | number:'1.0-0' }} FCFA</span>
                </div>
                <div class="kpi-list">
                    <div class="kpi-item">
                        <span class="label">Coût Moyen / Pers (Zone 1)</span>
                        <span class="value">{{ analysis.kpi_option_1.cost_per_person_zone_1 | number:'1.0-0' }} FCFA</span>
                    </div>
                    <div class="kpi-item">
                        <span class="label">Coût Moyen / Pers (Zone 2)</span>
                        <span class="value">{{ analysis.kpi_option_1.cost_per_person_zone_2 | number:'1.0-0' }} FCFA</span>
                    </div>
                    <div class="kpi-item">
                        <span class="label">Coût Moyen / Pers (Zone 3)</span>
                        <span class="value">{{ analysis.kpi_option_1.cost_per_person_zone_3 | number:'1.0-0' }} FCFA</span>
                    </div>
                    <div class="divider"></div>
                    <div class="kpi-item highlight">
                        <span class="label">Taux d'Occupation</span>
                        <span class="value">{{ analysis.kpi_option_1.avg_occupancy_rate | number:'1.0-1' }}%</span>
                    </div>
                    <div class="kpi-item">
                        <span class="label">Véhicules Requis</span>
                        <span class="value">{{ analysis.kpi_option_1.total_vehicles }}</span>
                    </div>
                </div>
            </mat-card>

            <!-- Option 2 Card -->
            <mat-card class="kpi-card">
                <div class="card-header opt2-header">
                    <h4>Option 2 (Lignes Bus 13)</h4>
                    <span class="total-price">{{ analysis.option_2_total | number:'1.0-0' }} FCFA</span>
                </div>
                <div class="kpi-list">
                    <div class="kpi-item">
                        <span class="label">Coût Moyen / Pers (Zone 1)</span>
                        <span class="value">{{ analysis.kpi_option_2.cost_per_person_zone_1 | number:'1.0-0' }} FCFA</span>
                    </div>
                    <div class="kpi-item">
                        <span class="label">Coût Moyen / Pers (Zone 2)</span>
                        <span class="value">{{ analysis.kpi_option_2.cost_per_person_zone_2 | number:'1.0-0' }} FCFA</span>
                    </div>
                    <div class="kpi-item">
                        <span class="label">Coût Moyen / Pers (Zone 3)</span>
                        <span class="value">{{ analysis.kpi_option_2.cost_per_person_zone_3 | number:'1.0-0' }} FCFA</span>
                    </div>
                    <div class="divider"></div>
                    <div class="kpi-item highlight">
                        <span class="label">Taux d'Occupation</span>
                        <span class="value">{{ analysis.kpi_option_2.avg_occupancy_rate | number:'1.0-1' }}%</span>
                    </div>
                     <div class="kpi-item">
                        <span class="label">Bus Requis (13 pl.)</span>
                        <span class="value">{{ analysis.kpi_option_2.total_vehicles }}</span>
                    </div>
                </div>
            </mat-card>
        </div>
      </div>
    </div>
  `,
  styles: `
    .page-container { padding: 32px 40px; max-width: 1200px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; gap: 16px; }
    .header-content h2 { font-size: 24px; margin-bottom: 4px; color: var(--text-main); }
    .section-title { font-size: 18px; font-weight: 600; margin: 24px 0 16px; color: var(--text-main); }

    .empty-state { text-align: center; padding: 64px 24px; color: var(--text-secondary); background: var(--surface); border-radius: 12px; border: 1px dashed var(--border-color); }
    .empty-icon { width: 64px; height: 64px; background: rgba(0,0,0,0.04); border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; }
    .empty-icon mat-icon { font-size: 32px; width: 32px; height: 32px; color: #9ca3af; }

    /* Summary */
    .recommendation-box { padding: 20px; text-align: center; border-radius: 8px; font-size: 18px; display: flex; flex-direction: column; gap: 8px; }
    .recommendation-box.opt1 { background: rgba(79, 70, 229, 0.1); color: var(--primary-color); border: 1px solid rgba(79, 70, 229, 0.2); }
    .recommendation-box.opt2 { background: rgba(16, 185, 129, 0.1); color: #059669; border: 1px solid rgba(16, 185, 129, 0.2); }
    
    /* KPI Grid */
    .kpi-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    .kpi-card { border-radius: 12px; overflow: hidden; border: 1px solid var(--border-color); box-shadow: var(--shadow-md); background: var(--surface); }
    
    .card-header { padding: 20px 24px; display: flex; justify-content: space-between; align-items: center; }
    .opt1-header { background: rgba(79, 70, 229, 0.05); color: var(--primary-color); border-bottom: 1px solid var(--border-color); }
    .opt2-header { background: rgba(16, 185, 129, 0.05); color: #059669; border-bottom: 1px solid var(--border-color); }
    
    .card-header h4 { margin: 0; font-size: 16px; font-weight: 700; }
    .total-price { font-size: 20px; font-weight: 800; }

    .kpi-list { padding: 24px; }
    .kpi-item { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; }
    .label { color: var(--text-secondary); }
    .value { font-weight: 600; color: var(--text-main); }
    .divider { height: 1px; background: var(--border-color); margin: 16px 0; }
    
    .highlight .value { font-size: 16px; color: var(--primary-color); }

    @media (max-width: 960px) {
      .page-container { padding: 20px; }
      .page-header { flex-direction: column; align-items: flex-start; }
      .kpi-grid { grid-template-columns: 1fr; }
      .actions { width: 100%; display: flex; gap: 8px; }
      .actions button { flex: 1; }
    }

    @media (max-width: 600px) {
      .header-content h2 { font-size: 20px; }
      .card-header { padding: 16px; flex-direction: column; align-items: flex-start; gap: 8px; }
      .total-price { font-size: 18px; }
    }
  `
})
export class DashboardHomeComponent {
  analysis: CostBreakdown | null = null;
  hasData = computed(() => this.planningService.currentPlanning().length > 0);
  @Output() goToUpload = new EventEmitter<void>();

  constructor(
    private dashboardService: DashboardService,
    private planningService: PlanningService,
    private historyService: HistoryService,
    private snackBar: MatSnackBar
  ) {
    effect(() => {
      if (this.hasData() && !this.analysis) {
        this.loadData();
      }
    });
  }

  loadData() {
    const data = this.planningService.currentPlanning();
    this.dashboardService.getKpiAnalysis(data).subscribe(res => this.analysis = res);
  }

  export(format: 'excel' | 'pdf') {
     const data = this.planningService.currentPlanning();
     this.dashboardService.exportReport(format, data).subscribe((response: Blob) => {
       const url = window.URL.createObjectURL(response);
       const a = document.createElement('a');
       a.href = url;
       a.download = `rapport_conformite.${format === 'excel' ? 'xlsx' : 'pdf'}`;
       a.click();
       window.URL.revokeObjectURL(url);
     });
  }

  archive() {
    if (!this.analysis) return;
    // Archive format update needed? For now just save summary
    const archiveData = {
      total_cost: this.analysis.option_1_total < this.analysis.option_2_total ? this.analysis.option_1_total : this.analysis.option_2_total,
      savings: this.analysis.savings,
      details: this.analysis,
      total_vehicles: this.analysis.kpi_option_1.total_vehicles,
      total_employees: this.planningService.currentPlanning().length
    };
    
    this.historyService.archive(archiveData).subscribe({
      next: () => {
        this.snackBar.open('Rapport archivé avec succès !', 'OK', { duration: 3000 });
      },
      error: () => {
        this.snackBar.open("Erreur partie serveur.", 'Fermer', { duration: 3000 });
      }
    });
  }
}
