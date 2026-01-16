import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { HistoryService, HistoryEntry } from '../../services/history.service';
import { AuditService, AuditEntry } from '../../services/audit.service';

@Component({
  selector: 'app-history-view',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatTableModule, MatIconModule, MatButtonModule, MatTabsModule],
  template: `
    <div class="page-container">
      <header class="page-header">
        <div class="header-content">
          <h2>Historique & Suivi</h2>
          <p>Consultez vos archives et le journal des événements horodatés.</p>
        </div>
      </header>

      <mat-tab-group animationDuration="0ms" class="custom-tabs">
        <mat-tab label="Rapports Archivés">
          <div class="tab-content">
            <!-- Stats / Chart -->
            <mat-card class="chart-card" *ngIf="entries.length > 0">
               <div class="card-header">
                  <mat-icon class="text-primary">trending_up</mat-icon>
                  <h3>Évolution des Coûts Archivés</h3>
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
            <div class="table-container" *ngIf="entries.length > 0; else emptyReports">
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
            
            <ng-template #emptyReports>
              <div class="empty-state">
                 <div class="empty-icon"><mat-icon>history</mat-icon></div>
                 <h3>Aucun rapport archive</h3>
                 <p>Archivez vos résultats depuis le Tableau de Bord.</p>
              </div>
            </ng-template>
          </div>
        </mat-tab>

        <mat-tab label="Journal d'Audit">
          <div class="tab-content">
            <div class="table-container" *ngIf="auditLogs.length > 0; else emptyAudit">
              <table mat-table [dataSource]="auditLogs">
                <ng-container matColumnDef="timestamp">
                  <th mat-header-cell *matHeaderCellDef> Horodatage </th>
                  <td mat-cell *matCellDef="let log"> {{log.timestamp | date:'dd/MM/yyyy HH:mm:ss'}} </td>
                </ng-container>

                <ng-container matColumnDef="event">
                  <th mat-header-cell *matHeaderCellDef> Événement </th>
                  <td mat-cell *matCellDef="let log"> <span class="event-badge">{{log.event}}</span> </td>
                </ng-container>

                <ng-container matColumnDef="details">
                  <th mat-header-cell *matHeaderCellDef> Détails </th>
                  <td mat-cell *matCellDef="let log"> {{log.details}} </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="auditColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: auditColumns;"></tr>
              </table>
            </div>

            <ng-template #emptyAudit>
              <div class="empty-state">
                 <div class="empty-icon"><mat-icon>terminal</mat-icon></div>
                 <h3>Journal vide</h3>
                 <p>Les événements apparaîtront au fur et à mesure.</p>
              </div>
            </ng-template>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: `
    .page-container { padding: 32px 40px; max-width: 1200px; margin: 0 auto; }
    .page-header { margin-bottom: 32px; }
    .header-content h2 { font-size: 24px; margin-bottom: 4px; color: var(--text-main); }
    .header-content p { color: var(--text-secondary); margin: 0; font-size: 14px; }

    .tab-content { padding: 24px 0; }
    
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
    .event-badge { background: #eef2ff; color: #4f46e5; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }

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
  auditLogs: AuditEntry[] = [];
  displayedColumns: string[] = ['date', 'vehicles', 'cost', 'savings'];
  auditColumns: string[] = ['timestamp', 'event', 'details'];

  constructor(
    private historyService: HistoryService,
    private auditService: AuditService
  ) {}

  ngOnInit() {
    this.historyService.getHistory().subscribe(data => {
      this.entries = data;
    });

    this.auditService.getLogs().subscribe(logs => {
      this.auditLogs = logs;
    });
  }

  getBarHeight(cost: number): number {
    if (this.entries.length === 0) return 0;
    const max = Math.max(...this.entries.map(e => e.total_cost), 1);
    return (cost / max) * 100;
  }
}
