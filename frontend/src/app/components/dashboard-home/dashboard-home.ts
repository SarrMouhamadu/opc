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
        <!-- Validation Info -->
        <div class="validation-banner">
            <div class="audit-item">
                <mat-icon>verified</mat-icon>
                <div class="audit-text">
                    <span class="label">Volume Audité</span>
                    <span class="value">{{ analysis.n_lines | number }} lignes</span>
                </div>
            </div>
            <div class="audit-item">
                <mat-icon>people</mat-icon>
                <div class="audit-text">
                    <span class="label">Salariés Uniques</span>
                    <span class="value">{{ analysis.n_employees }}</span>
                </div>
            </div>
            <div class="audit-item">
                <mat-icon>calendar_today</mat-icon>
                <div class="audit-text">
                    <span class="label">Période (Obs.)</span>
                    <span class="value">{{ analysis.nb_jours_observes }} j / {{ analysis.nb_jours_mois_reference }}</span>
                </div>
            </div>
            <div class="audit-item">
                <mat-icon>swap_vert</mat-icon>
                <div class="audit-text">
                    <span class="label">Couverture</span>
                    <span class="value">{{ analysis.coverage_type }}</span>
                </div>
            </div>
            <div class="certification-badge">
                <mat-icon>shield</mat-icon>
                <span>Audit Certifié</span>
            </div>
        </div>

        <!-- Main Summary -->
        <div class="summary-section">
            <mat-card class="main-card">
                <mat-card-header>
                    <mat-card-title>Recommandation Stratégique (Contractuelle)</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                    <div class="extrapol-warning" *ngIf="analysis.is_extrapolated">
                        <mat-icon>info</mat-icon>
                        <span>Comparaison basée sur un périmètre partiel ({{ analysis.nb_jours_observes }}j, Couverture: {{ analysis.coverage_type }}). Coûts extrapolés au mois complet.</span>
                    </div>
                    <div class="recommendation-box" [class.opt1]="analysis.best_option.includes('Option 1')" [class.opt2]="analysis.best_option.includes('Option 2')">
                       <strong>{{ analysis.best_option }}</strong>
                       <span>Budget mensuel estimé : {{ (analysis.best_option.includes('Option 1') ? analysis.option_1_contractual_total : analysis.option_2_contractual_total) | number:'1.0-0' }} FCFA</span>
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
                    <h4>Option 1 (Forfait Mensuel)</h4>
                    <span class="total-price">{{ analysis.option_1_contractual_total | number:'1.0-0' }} FCFA</span>
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
                        <span class="label">Coût Mensuel / Salarié</span>
                        <span class="value">{{ analysis.avg_monthly_cost_per_employee | number:'1.0-0' }} FCFA</span>
                    </div>
                </div>
            </mat-card>

            <!-- Option 2 Card -->
            <mat-card class="kpi-card">
                <div class="card-header opt2-header">
                    <h4>Option 2 (Prise en Charge)</h4>
                    <span class="total-price">{{ analysis.option_2_contractual_total | number:'1.0-0' }} FCFA</span>
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
                        <span class="label">Coût Moyen / Trajet</span>
                        <span class="value">{{ analysis.avg_cost_per_pickup | number:'1.0-0' }} FCFA</span>
                    </div>
                     <div class="kpi-item">
                        <span class="label">Total Prises en Charge</span>
                        <span class="value">{{ analysis.n_lines | number }}</span>
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

    /* Validation Banner */
    .validation-banner { display: flex; gap: 32px; background: var(--surface); padding: 16px 24px; border-radius: 12px; border: 1px solid var(--border-color); margin-bottom: 24px; align-items: center; box-shadow: var(--shadow-sm); overflow-x: auto; }
    .audit-item { display: flex; align-items: center; gap: 12px; min-width: max-content; }
    .audit-item mat-icon { color: var(--primary-color); opacity: 0.8; }
    .audit-text { display: flex; flex-direction: column; }
    .audit-text .label { font-size: 10px; text-transform: uppercase; color: var(--text-secondary); font-weight: 600; letter-spacing: 0.5px; }
    .audit-text .value { font-size: 15px; font-weight: 700; color: var(--text-main); }
    
    .certification-badge { margin-left: auto; display: flex; align-items: center; gap: 6px; background: rgba(16, 185, 129, 0.1); color: #059669; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; border: 1px solid rgba(16, 185, 129, 0.2); }
    .certification-badge mat-icon { font-size: 16px; width: 16px; height: 16px; }

    /* Summary */
    .extrapol-warning { display: flex; align-items: center; justify-content: center; gap: 8px; background: rgba(99, 102, 241, 0.05); color: #4f46e5; padding: 12px; border-radius: 8px; margin-bottom: 16px; font-size: 13px; font-weight: 500; border: 1px solid rgba(99, 102, 241, 0.1); }
    .extrapol-warning mat-icon { font-size: 18px; width: 18px; height: 18px; }
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
      total_cost: this.analysis.option_1_contractual_total < this.analysis.option_2_contractual_total ? this.analysis.option_1_contractual_total : this.analysis.option_2_contractual_total,
      savings: this.analysis.savings,
      details: this.analysis,
      total_vehicles: this.analysis.best_option.includes('Option 1') ? this.analysis.n_employees : this.analysis.n_lines,
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
