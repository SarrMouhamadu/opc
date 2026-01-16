import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { HistoryService, HistoryEntry } from '../../services/history.service';

@Component({
  selector: 'app-history-view',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatTableModule, MatIconModule, MatButtonModule],
  template: `
    <div class="page-container">
      <header class="page-header">
        <div class="header-content">
          <h2>Historique & Suivi</h2>
          <p>Consultez vos archives et suivez l'évolution des coûts.</p>
        </div>
        <button mat-stroked-button *ngIf="selectedEntry" (click)="selectedEntry = null">
          <mat-icon>arrow_back</mat-icon> Retour à la liste
        </button>
      </header>

      <div *ngIf="!selectedEntry">
        <!-- Stats / Chart Placeholder -->
        <mat-card class="chart-card" *ngIf="entries.length > 0">
           <div class="card-header">
              <mat-icon class="text-primary">trending_up</mat-icon>
              <h3>Évolution des Coûts</h3>
           </div>
           <div class="chart-area">
              <div class="bar-chart">
                 <div *ngFor="let entry of entries.slice(0, 10).reverse()" class="bar-group">
                    <div class="bar" [style.height.%]="getBarHeight(entry.total_cost)"></div>
                    <span class="label">{{ entry.date | date:'dd/MM' }}</span>
                 </div>
              </div>
           </div>
        </mat-card>

        <!-- History Table -->
        <div class="table-container" *ngIf="entries.length > 0; else emptyState">
          <table mat-table [dataSource]="entries" class="mat-elevation-z1">
            
            <ng-container matColumnDef="date">
              <th mat-header-cell *matHeaderCellDef> Horodatage </th>
              <td mat-cell *matCellDef="let element"> 
                <div class="timestamp-cell">
                   <span class="d-block font-bold">{{element.date | date:'dd/MM/yyyy'}}</span>
                   <span class="d-block text-secondary small">{{element.date | date:'HH:mm:ss'}}</span>
                </div>
              </td>
            </ng-container>

            <ng-container matColumnDef="vehicles">
              <th mat-header-cell *matHeaderCellDef> Véhicules </th>
              <td mat-cell *matCellDef="let element"> {{element.total_vehicles}} </td>
            </ng-container>

            <ng-container matColumnDef="cost">
              <th mat-header-cell *matHeaderCellDef> Coût Total </th>
              <td mat-cell *matCellDef="let element" class="font-bold"> {{element.total_cost | number:'1.0-0'}} FCFA </td>
            </ng-container>

            <ng-container matColumnDef="savings">
              <th mat-header-cell *matHeaderCellDef> Économies </th>
              <td mat-cell *matCellDef="let element" class="text-success"> +{{element.savings | number:'1.0-0'}} FCFA </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef> Actions </th>
              <td mat-cell *matCellDef="let element">
                <button mat-icon-button color="primary" (click)="viewDetails(element)" matTooltip="Voir détails">
                  <mat-icon>visibility</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>
        </div>
      </div>

      <!-- Detail View -->
      <div *ngIf="selectedEntry" class="detail-view animate-in">
        <mat-card class="detail-card">
          <div class="detail-header">
            <h3>Rapport d'Optimisation du {{ selectedEntry.date | date:'dd/MM/yyyy HH:mm' }}</h3>
            <div class="badge-row">
               <span class="badge success">Économie: {{ selectedEntry.savings | number }} FCFA</span>
               <span class="badge primary">Véhicules: {{ selectedEntry.total_vehicles }}</span>
            </div>
          </div>
          
          <div class="detail-grid">
            <div class="detail-section">
              <h4>Résumé de l'analyse</h4>
              <div class="kpi-row">
                <div class="kpi">
                  <span class="label">Coût Total</span>
                  <span class="value">{{ selectedEntry.total_cost | number }} FCFA</span>
                </div>
                <div class="kpi">
                   <span class="label">Best Option</span>
                   <span class="value text-primary">{{ selectedEntry.data_snapshot?.best_option || 'N/A' }}</span>
                </div>
              </div>
            </div>
          </div>
        </mat-card>
      </div>

      <ng-template #emptyState>
        <div class="empty-state">
           <div class="empty-icon"><mat-icon>history</mat-icon></div>
           <h3>Aucun historique</h3>
           <p>Archivez vos résultats depuis le Tableau de Bord pour les voir ici.</p>
        </div>
      </ng-template>
    </div>
  `,
  styles: `
    .page-container { padding: 32px 40px; max-width: 1200px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; }
    .header-content h2 { font-size: 24px; margin-bottom: 4px; color: var(--text-main); }
    .header-content p { color: var(--text-secondary); margin: 0; font-size: 14px; }

    .chart-card { padding: 24px; margin-bottom: 32px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); background: var(--surface); }
    .card-header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
    .card-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: var(--text-main); }
    .text-primary { color: var(--primary-color); }

    .chart-area { height: 200px; display: flex; align-items: flex-end; justify-content: space-around; padding-bottom: 20px; border-bottom: 1px solid var(--border-color); }
    .bar-chart { display: flex; align-items: flex-end; gap: 16px; height: 100%; width: 100%; overflow-x: auto; padding-bottom: 8px; }
    .bar-group { display: flex; flex-direction: column; align-items: center; flex: 1; min-width: 40px; height: 100%; justify-content: flex-end; }
    .bar { width: 30px; background: #818cf8; border-radius: 4px 4px 0 0; min-height: 4px; transition: height 0.5s ease; }
    .label { margin-top: 8px; font-size: 10px; color: var(--text-secondary); white-space: nowrap; }

    .table-container { border-radius: 12px; overflow-x: auto; background: var(--surface); border: 1px solid var(--border-color); }
    table { width: 100%; min-width: 600px; background: var(--surface); color: var(--text-main); }
    
    .timestamp-cell { display: flex; flex-direction: column; line-height: 1.2; }
    .d-block { display: block; }
    .small { font-size: 11px; }
    .text-success { color: #16a34a; font-weight: 600; }
    .font-bold { font-weight: 700; }

    /* Detail View Styles */
    .detail-card { padding: 24px; border-radius: 12px; box-shadow: var(--shadow-sm); border: 1px solid var(--border-color); }
    .detail-header { border-bottom: 1px solid #f3f4f6; padding-bottom: 16px; margin-bottom: 20px; }
    .badge-row { display: flex; gap: 12px; margin-top: 12px; }
    .badge { padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .badge.success { background: #dcfce7; color: #166534; }
    .badge.primary { background: #e0e7ff; color: #4338ca; }
    
    .kpi-row { display: flex; gap: 40px; margin-top: 16px; }
    .kpi { display: flex; flex-direction: column; }
    .kpi .label { font-size: 12px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; }
    .kpi .value { font-size: 20px; font-weight: 700; }

    .animate-in { animation: fadeIn 0.3s ease-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

    .empty-state { text-align: center; padding: 64px 0; color: var(--text-secondary); background: var(--surface); border-radius: 12px; border: 1px dashed var(--border-color); }
    .empty-icon { width: 64px; height: 64px; background: #f3f4f6; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; }
    .empty-icon mat-icon { font-size: 32px; width: 32px; height: 32px; color: #9ca3af; }

    @media (max-width: 768px) {
      .page-container { padding: 20px; }
      .header-content h2 { font-size: 20px; }
      .bar { width: 20px; }
      .bar-chart { gap: 8px; }
      .kpi-row { flex-direction: column; gap: 20px; }
    }
  `
})
export class HistoryViewComponent implements OnInit {
  entries: HistoryEntry[] = [];
  displayedColumns: string[] = ['date', 'vehicles', 'cost', 'savings', 'actions'];
  selectedEntry: HistoryEntry | null = null;

  constructor(private historyService: HistoryService) {}

  ngOnInit() {
    this.historyService.getHistory().subscribe(data => {
      this.entries = data;
    });
  }

  viewDetails(entry: HistoryEntry) {
    this.selectedEntry = entry;
  }

  getBarHeight(cost: number): number {
    const max = Math.max(...this.entries.map(e => e.total_cost), 1);
    return (cost / max) * 100;
  }
}
