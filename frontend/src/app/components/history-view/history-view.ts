import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs'; // Added tabs
import { HistoryService, HistoryEntry } from '../../services/history.service';
import { LogsService, LogEntry } from '../../services/logs.service';

@Component({
  selector: 'app-history-view',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatTableModule, MatIconModule, MatButtonModule, MatTabsModule],
  template: `
    <div class="page-container">
      <header class="page-header">
        <div class="header-content">
          <h2>Historique & Activité</h2>
          <p>Suivi des actions et consultation des archives.</p>
        </div>
      </header>

      <mat-tab-group animationDuration="0ms">
        
        <!-- TAB 1: ACTIVITY LOG -->
        <mat-tab label="Journal d'Activité">
          <div class="tab-content">
             <div class="table-container" *ngIf="logs.length > 0; else emptyLogs">
                <table mat-table [dataSource]="logs" class="mat-elevation-z1">
                  
                  <!-- Date Column -->
                  <ng-container matColumnDef="timestamp">
                    <th mat-header-cell *matHeaderCellDef> Horodatage </th>
                    <td mat-cell *matCellDef="let log"> 
                      <div class="date-cell">
                        <mat-icon class="tiny-icon">access_time</mat-icon>
                        {{log.timestamp | date:'dd/MM/yyyy HH:mm:ss'}} 
                      </div>
                    </td>
                  </ng-container>

                  <!-- Action Column -->
                  <ng-container matColumnDef="action">
                    <th mat-header-cell *matHeaderCellDef> Action </th>
                    <td mat-cell *matCellDef="let log"> 
                      <span class="badge" [ngClass]="getActionClass(log.action)">{{log.action}}</span> 
                    </td>
                  </ng-container>

                  <!-- Details Column -->
                  <ng-container matColumnDef="details">
                    <th mat-header-cell *matHeaderCellDef> Détails </th>
                    <td mat-cell *matCellDef="let log"> {{log.details}} </td>
                  </ng-container>

                  <!-- User Column -->
                  <ng-container matColumnDef="user">
                    <th mat-header-cell *matHeaderCellDef> Utilisateur </th>
                    <td mat-cell *matCellDef="let log" class="text-secondary"> {{log.user}} </td>
                  </ng-container>

                  <tr mat-header-row *matHeaderRowDef="logColumns"></tr>
                  <tr mat-row *matRowDef="let row; columns: logColumns;"></tr>
                </table>
             </div>
             
             <ng-template #emptyLogs>
                <div class="empty-state">
                   <div class="empty-icon"><mat-icon>receipt_long</mat-icon></div>
                   <h3>Aucune activité récente</h3>
                </div>
             </ng-template>
          </div>
        </mat-tab>

        <!-- TAB 2: ARCHIVES -->
        <mat-tab label="Rapports Archivés">
          <div class="tab-content">
            <!-- Stats / Chart -->
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
                  <th mat-header-cell *matHeaderCellDef> Date & Heure </th>
                  <td mat-cell *matCellDef="let element"> {{element.date | date:'dd/MM/yyyy HH:mm'}} </td>
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

                <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
              </table>
            </div>

            <ng-template #emptyState>
              <div class="empty-state">
                 <div class="empty-icon"><mat-icon>history</mat-icon></div>
                 <h3>Aucun rapport archivé</h3>
                 <p>Archivez vos résultats depuis le Tableau d'Optimisation.</p>
              </div>
            </ng-template>
          </div>
        </mat-tab>

      </mat-tab-group>
    </div>
  `,
  styles: `
    .page-container { padding: 32px 40px; max-width: 1200px; margin: 0 auto; }
    .page-header { margin-bottom: 24px; }
    .header-content h2 { font-size: 24px; margin-bottom: 4px; color: var(--text-main); }
    .header-content p { color: var(--text-secondary); margin: 0; font-size: 14px; }

    .tab-content { padding-top: 24px; }

    .chart-card { padding: 24px; margin-bottom: 32px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .card-header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
    .card-header h3 { margin: 0; font-size: 16px; font-weight: 600; }
    .text-primary { color: var(--primary-color); }

    .chart-area { height: 200px; display: flex; align-items: flex-end; justify-content: space-around; padding-bottom: 20px; border-bottom: 1px solid #e5e7eb; }
    .bar-chart { display: flex; align-items: flex-end; gap: 16px; height: 100%; width: 100%; }
    .bar-group { display: flex; flex-direction: column; align-items: center; flex: 1; height: 100%; justify-content: flex-end; }
    .bar { width: 40px; background: #818cf8; border-radius: 4px 4px 0 0; min-height: 4px; transition: height 0.5s ease; }
    .label { margin-top: 8px; font-size: 12px; color: var(--text-secondary); }

    .table-container { border-radius: 12px; overflow: hidden; background: white; border: 1px solid var(--border-color); }
    table { width: 100%; }
    
    .text-success { color: #16a34a; font-weight: 600; }
    .font-bold { font-weight: 700; }
    .text-secondary { color: var(--text-secondary); }

    .empty-state { text-align: center; padding: 64px 0; color: var(--text-secondary); background: var(--surface); border-radius: 12px; border: 1px dashed var(--border-color); }
    .empty-icon { width: 64px; height: 64px; background: #f3f4f6; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; }
    .empty-icon mat-icon { font-size: 32px; width: 32px; height: 32px; color: #9ca3af; }
    
    /* Logs Specific */
    .date-cell { display: flex; align-items: center; gap: 6px; color: var(--text-secondary); font-size: 13px; font-family: 'Inter', monospace; }
    .tiny-icon { font-size: 16px; width: 16px; height: 16px; }
    
    .badge { padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; }
    .badge-upload { background: #e0f2fe; color: #0284c7; }
    .badge-optimization { background: #f3e8ff; color: #9333ea; }
    .badge-login { background: #dcfce7; color: #16a34a; }
    .badge-archive { background: #ffedd5; color: #ea580c; }
    .badge-default { background: #f3f4f6; color: #4b5563; }
  `
})
export class HistoryViewComponent implements OnInit {
  entries: HistoryEntry[] = [];
  logs: LogEntry[] = [];
  
  displayedColumns: string[] = ['date', 'vehicles', 'cost', 'savings'];
  logColumns: string[] = ['timestamp', 'action', 'details', 'user'];

  constructor(
    private historyService: HistoryService,
    private logsService: LogsService
  ) {}

  ngOnInit() {
    this.refreshData();
  }

  refreshData() {
    this.historyService.getHistory().subscribe(data => {
      this.entries = data;
    });
    this.logsService.getLogs().subscribe(data => {
      this.logs = data;
    });
  }

  getBarHeight(cost: number): number {
    const max = Math.max(...this.entries.map(e => e.total_cost), 1);
    return (cost / max) * 100;
  }
  
  getActionClass(action: string): string {
    switch(action.toUpperCase()) {
      case 'UPLOAD': return 'badge-upload';
      case 'OPTIMIZATION': return 'badge-optimization';
      case 'LOGIN': return 'badge-login';
      case 'ARCHIVE': return 'badge-archive';
      default: return 'badge-default';
    }
  }
}
