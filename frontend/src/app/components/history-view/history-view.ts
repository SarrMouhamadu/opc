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
      </header>

      <!-- Stats / Chart Placeholder -->
      <mat-card class="chart-card" *ngIf="entries.length > 0">
         <div class="card-header">
            <mat-icon class="text-primary">trending_up</mat-icon>
            <h3>Évolution des Coûts</h3>
         </div>
         <div class="chart-area">
            <!-- Simple simulated chart using CSS bars for MVP -->
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
          
          <!-- Date Column -->
          <ng-container matColumnDef="date">
            <th mat-header-cell *matHeaderCellDef> Date & Heure </th>
            <td mat-cell *matCellDef="let element"> {{element.date | date:'dd/MM/yyyy HH:mm'}} </td>
          </ng-container>

          <!-- Vehicles Column -->
          <ng-container matColumnDef="vehicles">
            <th mat-header-cell *matHeaderCellDef> Véhicules </th>
            <td mat-cell *matCellDef="let element"> {{element.total_vehicles}} </td>
          </ng-container>

          <!-- Cost Column -->
          <ng-container matColumnDef="cost">
            <th mat-header-cell *matHeaderCellDef> Coût Total </th>
            <td mat-cell *matCellDef="let element" class="font-bold"> {{element.total_cost | number:'1.0-0'}} FCFA </td>
          </ng-container>

          <!-- Savings Column -->
          <ng-container matColumnDef="savings">
            <th mat-header-cell *matHeaderCellDef> Économies </th>
            <td mat-cell *matCellDef="let element" class="text-success"> +{{element.savings | number:'1.0-0'}} FCFA </td>
          </ng-container>

          <!-- Actions Column -->
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef> Preuves </th>
            <td mat-cell *matCellDef="let element">
              <button mat-button color="primary" (click)="downloadProof(element)">
                <mat-icon>download</mat-icon>
                <span class="hide-mobile">Preuve</span>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>
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
    .page-header { margin-bottom: 32px; }
    .header-content h2 { font-size: 24px; margin-bottom: 4px; color: var(--text-main); }
    .header-content p { color: var(--text-secondary); margin: 0; font-size: 14px; }

    .chart-card { padding: 24px; margin-bottom: 32px; border-radius: 12px; border: 1px solid var(--border-color); background: var(--surface); }
    .card-header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
    .card-header h3 { margin: 0; font-size: 16px; font-weight: 600; color: var(--text-main); }
    .text-primary { color: var(--primary-color); }

    .chart-area { height: 200px; padding-bottom: 20px; border-bottom: 1px solid var(--border-color); }
    .bar-chart { display: flex; align-items: flex-end; gap: 8px; height: 100%; width: 100%; overflow-x: auto; padding-bottom: 10px; }
    .bar-group { display: flex; flex-direction: column; align-items: center; min-width: 40px; height: 100%; justify-content: flex-end; }
    .bar { width: 30px; background: var(--primary-color); border-radius: 4px 4px 0 0; min-height: 4px; transition: height 0.5s ease; opacity: 0.8; }
    .label { margin-top: 8px; font-size: 10px; color: var(--text-secondary); white-space: nowrap; }

    .table-container { border-radius: 12px; overflow: auto; background: var(--surface); border: 1px solid var(--border-color); }
    table { width: 100%; min-width: 600px; }
    
    .text-success { color: var(--success); font-weight: 600; }
    .font-bold { font-weight: 700; color: var(--text-main); }

    .empty-state { text-align: center; padding: 64px 24px; color: var(--text-secondary); background: var(--surface); border-radius: 12px; border: 1px dashed var(--border-color); }
    .empty-icon { width: 64px; height: 64px; background: rgba(0,0,0,0.04); border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; }
    .empty-icon mat-icon { font-size: 32px; width: 32px; height: 32px; color: #9ca3af; }

    @media (max-width: 960px) {
      .page-container { padding: 20px; }
      .page-header { flex-direction: column; align-items: flex-start; }
    }

    @media (max-width: 600px) {
      .header-content h2 { font-size: 20px; }
      .chart-card { padding: 16px; }
      .bar { width: 24px; }
      .bar-group { min-width: 34px; }
    }
  `
})
export class HistoryViewComponent implements OnInit {
  entries: HistoryEntry[] = [];
  displayedColumns: string[] = ['date', 'vehicles', 'cost', 'savings', 'actions'];

  constructor(private historyService: HistoryService) {}

  ngOnInit() {
    this.historyService.getHistory().subscribe(data => {
      this.entries = data;
    });
  }

  downloadProof(entry: HistoryEntry) {
    const filename = `preuve_opti_${entry.date.split('T')[0]}_${entry.id}.json`;
    const blob = new Blob([JSON.stringify(entry, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  getBarHeight(cost: number): number {
    const max = Math.max(...this.entries.map(e => e.total_cost), 1);
    return (cost / max) * 100;
  }
}
