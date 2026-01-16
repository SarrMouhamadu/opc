import { Component, computed, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSliderModule } from '@angular/material/slider';
import { MatDividerModule } from '@angular/material/divider';
import { OptimizationService, OptimizationResult } from '../../services/optimization.service';
import { PlanningService } from '../../services/planning.service';
import { HistoryService } from '../../services/history.service';
import { NotificationService } from '../../services/notification.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

@Component({
  selector: 'app-optimization-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatSliderModule,
    MatDividerModule,
    MatSnackBarModule,
    MatButtonToggleModule
  ],
  template: `
    <div class="page-container">
      <header class="page-header">
        <div class="header-content">
          <h2>Optimisation & Simulation</h2>
          <p>Analysez l'impact du regroupement temporel sur votre flotte.</p>
        </div>
        <div class="actions">
          <button mat-flat-button color="accent" (click)="archive()" [disabled]="loading || !results">
            <mat-icon>archive</mat-icon> Archiver
          </button>
          <button mat-flat-button color="primary" (click)="analyze()" [disabled]="loading || !hasData()">
            <mat-icon>science</mat-icon> Lancer la simulation
          </button>
        </div>
      </header>

      <div *ngIf="!hasData()" class="empty-state">
        <div class="empty-icon">
          <mat-icon>auto_graph</mat-icon>
        </div>
        <h3>Aucune donnée à optimiser</h3>
        <p>Veuillez d'abord importer un planning.</p>
      </div>

      <!-- Simulation Controls -->
      <mat-card class="simulation-card" *ngIf="hasData()">
        <div class="sim-header">
          <mat-icon>tune</mat-icon>
          <h3>Paramètres de Simulation</h3>
        </div>
        <div class="sim-controls">
          <div class="control-group">
            <label>Fenêtre de regroupement : <strong>{{ windowMinutes }} min</strong></label>
            <mat-slider min="0" max="60" step="5" showTickMarks discrete>
              <input matSliderThumb [(ngModel)]="windowMinutes" (dragEnd)="analyze()">
            </mat-slider>
            <span class="hint">Glissez pour ajuster et relancer (0 - 60 min)</span>
          </div>

          <div class="divider-v"></div>

          <div class="control-group">
            <label>Type de Couverture :</label>
            <mat-button-toggle-group [(ngModel)]="selectedCoverage" (change)="analyze()">
               <mat-button-toggle value="ALLER_RETOUR">Aller/Retour</mat-button-toggle>
               <mat-button-toggle value="ALLER">Aller Simple</mat-button-toggle>
            </mat-button-toggle-group>
            <span class="hint">Indiquez si le planning est unitaire ou bitrajet</span>
          </div>
        </div>
      </mat-card>

      <mat-progress-bar mode="indeterminate" *ngIf="loading" class="loading-bar"></mat-progress-bar>

      <div class="dashboard-grid" *ngIf="results">
        <!-- KPI Cards -->
        <div class="kpi-card">
          <div class="kpi-icon bg-indigo">
            <mat-icon>directions_car</mat-icon>
          </div>
          <div class="kpi-value">{{ results.total_vehicles }}</div>
          <div class="kpi-label">Véhicules Nécessaires</div>
        </div>

        <div class="kpi-card">
          <div class="kpi-icon bg-pink">
            <mat-icon>pie_chart</mat-icon>
          </div>
          <div class="kpi-value">{{ results.avg_occupancy_rate | number:'1.0-1' }}%</div>
          <div class="kpi-label">Taux de Remplissage Moyen</div>
        </div>

        <div class="kpi-card highlight-sim">
          <div class="kpi-icon bg-teal">
            <mat-icon>payments</mat-icon>
          </div>
          <div class="kpi-value">{{ results.estimated_logistic_budget | number:'1.0-0' }} FCFA</div>
          <div class="kpi-label">Budget Logistique Estimé</div>
        </div>
      </div>

      <!-- Timeline / Grouping Visualization -->
        <mat-card class="timeline-card" *ngIf="results">
        <div class="card-header">
          <h3>Détail des Groupements (Extrait)</h3>
          <span class="badge">{{ results.groups.length }} groupes formés</span>
        </div>
        
        <div class="timeline-container">
          <div class="timeline-list">
            <div *ngFor="let group of results.groups.slice(0, 50)" class="timeline-item">
              <div class="time-marker">
                <span class="time">{{ group.start_time | date:'HH:mm' }}</span>
                <div class="line"></div>
              </div>
              
              <div class="group-content">
                <div class="group-header">
                  <span class="vehicle-type">{{ group.vehicle }}</span>
                  <div class="occupancy-indicator">
                    <div class="occupancy-track">
                      <div class="occupancy-fill" [style.width.%]="group.occupancy" 
                           [class.high]="group.occupancy > 80" [class.med]="group.occupancy > 50 && group.occupancy <= 80"></div>
                    </div>
                    <span class="occupancy-text">{{ group.count }}/{{ group.capacity }}</span>
                  </div>
                </div>
                <div class="group-details">
                  <span class="cost">{{ group.cost | number:'1.0-0' }} FCFA</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </mat-card>

    </div>
  `,
  styles: `
    .page-container { padding: 32px 40px; max-width: 1200px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; gap: 16px; }
    .header-content h2 { font-size: 24px; margin-bottom: 4px; color: var(--text-main); }
    .header-content p { color: var(--text-secondary); margin: 0; font-size: 14px; }

    .empty-state {
      text-align: center; padding: 64px 24px; color: var(--text-secondary);
      background: var(--surface); border-radius: var(--radius-lg); border: 1px dashed var(--border-color);
    }
    .empty-icon { width: 64px; height: 64px; background: rgba(0,0,0,0.04); border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; }
    .empty-icon mat-icon { font-size: 32px; width: 32px; height: 32px; color: var(--text-secondary); }

    .simulation-card {
      background: var(--surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 24px; margin-bottom: 32px;
      display: flex; flex-direction: column; gap: 16px;
    }
    .sim-header { display: flex; align-items: center; gap: 12px; color: var(--primary-color); }
    .sim-header h3 { font-size: 16px; font-weight: 600; margin: 0; }
    
    .sim-controls { display: flex; gap: 40px; align-items: flex-start; flex-wrap: wrap; }
    .control-group { display: flex; flex-direction: column; flex: 1; min-width: 280px; }
    .divider-v { width: 1px; background: var(--border-color); align-self: stretch; margin: 4px 0; }
    .control-group label { font-size: 14px; font-weight: 500; margin-bottom: 8px; color: var(--text-main); }
    .hint { font-size: 12px; color: var(--text-secondary); margin-top: 4px; }

    .dashboard-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; margin-bottom: 32px; }
    
    .kpi-card { background: var(--surface); padding: 24px; border-radius: var(--radius-lg); border: 1px solid var(--border-color); box-shadow: var(--shadow-sm); display: flex; flex-direction: column; align-items: center; text-align: center; }
    .kpi-icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; color: white; }
    .bg-indigo { background: #6366f1; } .bg-pink { background: #ec4899; } .bg-teal { background: #14b8a6; }
    .kpi-value { font-size: 28px; font-weight: 700; color: var(--text-main); line-height: 1; margin-bottom: 8px; }
    .kpi-label { font-size: 12px; color: var(--text-secondary); font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }

    .timeline-card { background: var(--surface); border-radius: var(--radius-lg); border: 1px solid var(--border-color); overflow: hidden; }
    .card-header { padding: 20px 24px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; background: var(--surface); gap: 12px; }
    .card-header h3 { font-size: 16px; margin: 0; color: var(--text-main); }
    .badge { background: rgba(79, 70, 229, 0.1); color: var(--primary-color); padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 600; }
    
    .timeline-container { height: 400px; overflow-y: auto; padding: 24px; background: var(--bg-app); }
    .timeline-list { display: flex; flex-direction: column; gap: 16px; position: relative; }
    .timeline-list::before { content: ''; position: absolute; left: 29px; top: 0; bottom: 0; width: 2px; background: var(--border-color); }
    
    .timeline-item { display: flex; gap: 24px; position: relative; }
    .time-marker { display: flex; flex-direction: column; align-items: center; min-width: 60px; }
    .time { font-size: 12px; font-weight: 600; color: var(--text-secondary); background: var(--bg-app); padding-bottom: 8px; z-index: 1; }
    
    .group-content { flex: 1; background: var(--surface); padding: 12px 16px; border-radius: 8px; border: 1px solid var(--border-color); box-shadow: var(--shadow-sm); }
    .group-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; gap: 8px; }
    .vehicle-type { font-weight: 600; font-size: 14px; color: var(--text-main); }
    
    .occupancy-indicator { display: flex; align-items: center; gap: 8px; }
    .occupancy-track { width: 60px; height: 6px; background: rgba(0,0,0,0.05); border-radius: 3px; overflow: hidden; }
    .occupancy-fill { height: 100%; background: #ef4444; }
    .occupancy-fill.med { background: #f59e0b; }
    .occupancy-fill.high { background: #10b981; }
    .occupancy-text { font-size: 11px; color: var(--text-secondary); width: 30px; text-align: right; }
    
    .group-details { font-size: 12px; color: var(--text-secondary); display: flex; justify-content: flex-end; }
    .cost { font-weight: 600; color: var(--primary-color); }

    @media (max-width: 960px) {
      .page-container { padding: 20px; }
      .page-header { flex-direction: column; align-items: flex-start; }
      .page-header button { width: 100%; }
      .timeline-container { padding: 16px; }
    }

    @media (max-width: 600px) {
      .header-content h2 { font-size: 20px; }
      .timeline-item { gap: 12px; }
      .timeline-list::before { left: 25px; }
      .time-marker { min-width: 50px; }
      .occupancy-track { display: none; }
      .card-header { padding: 16px; }
    }
  `
})
export class OptimizationDashboardComponent {
  results: OptimizationResult | null = null;
  loading = false;
  windowMinutes = 20; 
  selectedCoverage = 'ALLER_RETOUR';
  hasData = computed(() => this.planningService.currentPlanning().length > 0);


  constructor(
    private optimizationService: OptimizationService,
    private planningService: PlanningService,
    private historyService: HistoryService,
    private notificationService: NotificationService,
    private snackBar: MatSnackBar
  ) {
    effect(() => {
      if (this.hasData() && !this.results) {
        this.analyze();
      }
    });
  }

  archive() {
    if (!this.results) return;
    
    const archiveData = {
      total_cost: this.results.estimated_logistic_budget,
      savings: 0, 
      details: this.results,
      total_vehicles: this.results.total_vehicles,
      total_employees: this.planningService.currentPlanning().length
    };
    
    this.historyService.archive(archiveData).subscribe({
      next: () => {
        this.snackBar.open('Résultats de simulation archivés !', 'OK', { duration: 3000 });
      },
      error: () => {
         this.snackBar.open("Erreur lors de l'archivage.", 'Fermer', { duration: 3000 });
      }
    });
  }

  analyze() {
    const data = this.planningService.currentPlanning();
    if (data.length === 0) return;

    this.loading = true;
    this.optimizationService.analyze(data, this.windowMinutes, this.selectedCoverage).subscribe({
      next: (res) => {
        this.results = res;
        this.loading = false;
        this.notificationService.add({
          title: 'Optimisation Terminée',
          message: `Simulation effectuée avec une fenêtre de ${this.windowMinutes} min.`,
          type: 'success'
        });
      },
      error: (err) => {
        this.loading = false;
        const msg = err.error?.detail || 'Impossible de lancer la simulation.';
        this.snackBar.open(msg, 'Fermer', { duration: 5000 });
      }
    });
  }
}
