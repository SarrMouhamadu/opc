import { Component, computed, signal, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { DashboardService, KPIResult, ZoneAnalysis } from '../../services/dashboard.service';
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
          <h2>Tableau de Bord</h2>
          <p>Synthèse de l'activité et analyse des coûts.</p>
        </div>
        <div class="actions">
          <button mat-flat-button color="accent" (click)="archive()" [disabled]="!hasData()">
            <mat-icon>archive</mat-icon> Archiver
          </button>
          <button mat-stroked-button color="primary" [matMenuTriggerFor]="exportMenu" [disabled]="!hasData()">
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
        <p>Importez un planning pour visualiser le tableau de bord.</p>
        <button mat-flat-button color="primary" (click)="goToUpload.emit()">Aller au Planning</button>
      </div>

      <div class="dashboard-content" *ngIf="hasData()">
        <!-- Summary Cards -->
         <div class="stats-grid">
          <div class="stat-card primary">
            <div class="icon-box"><mat-icon>payments</mat-icon></div>
            <div class="stat-info">
              <span class="label">Coût Total (Est.)</span>
              <span class="value">{{ kpis?.total_cost | currency:'EUR':'symbol':'1.0-0' }}</span>
            </div>
          </div>
          
          <div class="stat-card success">
            <div class="icon-box"><mat-icon>savings</mat-icon></div>
            <div class="stat-info">
              <span class="label">Économies Potentielles</span>
              <span class="value">+{{ kpis?.total_savings | currency:'EUR':'symbol':'1.0-0' }}</span>
            </div>
          </div>

          <div class="stat-card info">
             <div class="icon-box"><mat-icon>directions_car</mat-icon></div>
             <div class="stat-info">
              <span class="label">Véhicules (Opt 1)</span>
              <span class="value">{{ kpis?.total_vehicles }}</span>
            </div>
          </div>

          <div class="stat-card warn">
             <div class="icon-box"><mat-icon>group</mat-icon></div>
             <div class="stat-info">
              <span class="label">Employés</span>
              <span class="value">{{ kpis?.total_employees }}</span>
            </div>
          </div>
        </div>

        <!-- Zone Analysis Chart -->
        <mat-card class="zone-card" *ngIf="zones">
          <div class="card-header">
             <h3>Répartition par Zone (Coûts et Volume)</h3>
          </div>
          <div class="chart-container">
            <!-- Zone 1 -->
             <div class="chart-row">
               <div class="row-label">Zone 1</div>
               <div class="bar-area">
                 <div class="bar z1" [style.width.%]="getPercent(zones.zone_1_count)"></div>
                 <span class="bar-value">{{ zones.zone_1_count }} pers.</span>
               </div>
               <div class="row-cost">{{ zones.zone_1_cost | currency:'EUR':'symbol':'1.0-0' }}</div>
             </div>
             
             <!-- Zone 2 -->
             <div class="chart-row">
               <div class="row-label">Zone 2</div>
               <div class="bar-area">
                 <div class="bar z2" [style.width.%]="getPercent(zones.zone_2_count)"></div>
                 <span class="bar-value">{{ zones.zone_2_count }} pers.</span>
               </div>
               <div class="row-cost">{{ zones.zone_2_cost | currency:'EUR':'symbol':'1.0-0' }}</div>
             </div>

             <!-- Zone 3 -->
             <div class="chart-row">
               <div class="row-label">Zone 3</div>
               <div class="bar-area">
                 <div class="bar z3" [style.width.%]="getPercent(zones.zone_3_count)"></div>
                 <span class="bar-value">{{ zones.zone_3_count }} pers.</span>
               </div>
               <div class="row-cost">{{ zones.zone_3_cost | currency:'EUR':'symbol':'1.0-0' }}</div>
             </div>
          </div>
        </mat-card>
      </div>
    </div>
  `,
  styles: `
    .page-container { padding: 32px 40px; max-width: 1200px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
    .header-content h2 { font-size: 24px; margin-bottom: 4px; color: var(--text-main); }
    .header-content p { color: var(--text-secondary); margin: 0; font-size: 14px; }
    .actions { display: flex; gap: 12px; }

    /* Empty State */
    .empty-state { text-align: center; padding: 64px 0; color: var(--text-secondary); background: var(--surface); border-radius: 12px; border: 1px dashed var(--border-color); }
    .empty-icon { width: 64px; height: 64px; background: #f3f4f6; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; }
    .empty-icon mat-icon { font-size: 32px; width: 32px; height: 32px; color: #9ca3af; }

    /* Stats Grid */
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 32px; }
    .stat-card { background: white; border-radius: 12px; padding: 24px; display: flex; align-items: center; gap: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #e5e7eb; }
    .icon-box { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: #f3f4f6; color: #6b7280; }
    .stat-info { display: flex; flex-direction: column; }
    .stat-info .label { font-size: 13px; color: #6b7280; font-weight: 500; }
    .stat-info .value { font-size: 24px; font-weight: 700; color: #111827; line-height: 1.2; }

    .stat-card.primary .icon-box { background: #e0e7ff; color: #4f46e5; }
    .stat-card.success .icon-box { background: #dcfce7; color: #16a34a; }
    .stat-card.info .icon-box { background: #ccfbf1; color: #0d9488; }
    .stat-card.warn .icon-box { background: #ffedd5; color: #ea580c; }

    /* Zone Chart */
    .zone-card { border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 0; overflow: hidden; }
    .card-header { padding: 20px 24px; border-bottom: 1px solid #e5e7eb; background: #f9fafb; }
    .card-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: #111827; }
    
    .chart-container { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
    .chart-row { display: flex; align-items: center; gap: 16px; }
    .row-label { width: 60px; font-weight: 600; color: #4b5563; font-size: 14px; }
    .bar-area { flex: 1; height: 32px; background: #f3f4f6; border-radius: 6px; overflow: hidden; position: relative; }
    .bar { height: 100%; border-radius: 6px; }
    .bar.z1 { background: #60a5fa; }
    .bar.z2 { background: #818cf8; }
    .bar.z3 { background: #c084fc; }
    .bar-value { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); font-size: 12px; font-weight: 600; color: #4b5563; }
    .row-cost { width: 100px; text-align: right; font-weight: 700; color: #111827; }
  `
})
export class DashboardHomeComponent {
  kpis: KPIResult | null = null;
  zones: ZoneAnalysis | null = null;
  hasData = computed(() => this.planningService.currentPlanning().length > 0);
  @Output() goToUpload = new EventEmitter<void>();

  constructor(
    private dashboardService: DashboardService,
    private planningService: PlanningService,
    private historyService: HistoryService,
    private snackBar: MatSnackBar
  ) {
    // React to data changes
    if (this.hasData()) {
      this.loadData();
    }
  }

  loadData() {
    const data = this.planningService.currentPlanning();
    this.dashboardService.getKPIs(data).subscribe(res => this.kpis = res);
    this.dashboardService.getZoneAnalysis(data).subscribe(res => this.zones = res);
  }

  getPercent(value: number): number {
    if (!this.zones) return 0;
    const total = this.zones.zone_1_count + this.zones.zone_2_count + this.zones.zone_3_count;
    return total > 0 ? (value / total) * 100 : 0;
  }

  export(format: 'excel' | 'pdf') {
     const data = this.planningService.currentPlanning();
     this.dashboardService.exportReport(format, data).subscribe((response: Blob) => {
       const url = window.URL.createObjectURL(response);
       const a = document.createElement('a');
       a.href = url;
       a.download = `report_opc.${format === 'excel' ? 'xlsx' : 'pdf'}`;
       a.click();
       window.URL.revokeObjectURL(url);
     });
  }

  archive() {
    if (!this.kpis) return;
    const archiveData = {
      total_cost: this.kpis.total_cost,
      savings: this.kpis.total_savings,
      total_vehicles: this.kpis.total_vehicles,
      total_employees: this.kpis.total_employees,
      planning_summary: {} // Add summary if needed
    };
    
    this.historyService.archive(archiveData).subscribe({
      next: () => {
        this.snackBar.open('Rapport archivé avec succès !', 'OK', { duration: 3000 });
      },
      error: () => {
        this.snackBar.open("Erreur lors de l'archivage.", 'Fermer', { duration: 3000 });
      }
    });
  }
}
