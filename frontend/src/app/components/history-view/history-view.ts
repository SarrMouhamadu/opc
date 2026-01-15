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
    
    .text-success { color: #16a34a; font-weight: 600; }
    .font-bold { font-weight: 700; }

    .empty-state { text-align: center; padding: 64px 0; color: var(--text-secondary); background: var(--surface); border-radius: 12px; border: 1px dashed var(--border-color); }
    .empty-icon { width: 64px; height: 64px; background: #f3f4f6; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; }
    .empty-icon mat-icon { font-size: 32px; width: 32px; height: 32px; color: #9ca3af; }

    @media (max-width: 768px) {
      .page-container { padding: 20px; }
      .header-content h2 { font-size: 20px; }
      .bar { width: 20px; }
      .bar-chart { gap: 8px; }
    }
  `
})
export class HistoryViewComponent implements OnInit {
  entries: HistoryEntry[] = [];
  displayedColumns: string[] = ['date', 'vehicles', 'cost', 'savings'];

  constructor(private historyService: HistoryService) {}

  ngOnInit() {
    this.historyService.getHistory().subscribe(data => {
      this.entries = data;
    });
  }

  getBarHeight(cost: number): number {
    const max = Math.max(...this.entries.map(e => e.total_cost), 1);
    return (cost / max) * 100;
  }
}
