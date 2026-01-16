import { Component, Output, EventEmitter, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PlanningService } from '../../services/planning.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-upload-planning',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    MatButtonModule,
    MatCardModule,
    MatTableModule,
    MatIconModule,
    MatProgressBarModule,
    MatSnackBarModule
  ],
  providers: [],
  template: `
    <div class="page-container">
      <header class="page-header">
        <h2>Ingestion du Planning</h2>
        <p>Importez vos données de transport (Excel uniquement) pour commencer l'analyse.</p>
      </header>

      <!-- Upload Section -->
      <div class="upload-zone" (click)="fileInput.click()" [class.dragging]="isDragging"
           (dragover)="onDragOver($event)" (dragleave)="onDragLeave($event)" (drop)="onDrop($event)">
        <input type="file" #fileInput (change)="onFileSelected($event)" accept=".xlsx,.xls" hidden>
        
        <div class="upload-content">
          <div class="icon-circle">
            <mat-icon>table_view</mat-icon>
          </div>
          <h3>Déposez votre planning ici</h3>
          <p>ou cliquez pour sélectionner un fichier (Excel uniquement)</p>
          <button mat-stroked-button color="primary" (click)="$event.stopPropagation(); fileInput.click()">
            Parcourir les fichiers Excel
          </button>
        </div>
      </div>

      <mat-progress-bar mode="indeterminate" *ngIf="uploading" class="upload-progress"></mat-progress-bar>

      <!-- Preview Section -->
      <div class="preview-card" *ngIf="previewData().length > 0">
        <div class="card-header">
          <div class="header-title">
            <mat-icon>table_chart</mat-icon>
            <h3>Aperçu des données</h3>
          </div>
          <span class="badge">{{ totalRows() }} entrées importées</span>
        </div>
        
        <div class="table-container">
          <table mat-table [dataSource]="previewData()">
            <ng-container *ngFor="let col of displayedColumns" [matColumnDef]="col">
              <th mat-header-cell *matHeaderCellDef> {{ col }} </th>
              <td mat-cell *matCellDef="let element"> {{ element[col] }} </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: `
    .page-container {
      padding: 32px 40px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 32px;
      gap: 12px;
      display: flex;
      flex-direction: column;
    }
    .page-header h2 { font-size: 24px; margin-bottom: 4px; color: var(--text-main); }
    .page-header p { color: var(--text-secondary); font-size: 14px; margin: 0; }

    /* Drag & Drop Zone */
    .upload-zone {
      border: 2px dashed var(--border-color);
      border-radius: var(--radius-lg);
      background: var(--surface);
      height: 280px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
      margin-bottom: 32px;
      position: relative;
      overflow: hidden;
      padding: 24px;
    }
    .upload-zone:hover, .upload-zone.dragging {
      border-color: var(--primary-color);
      background: rgba(79, 70, 229, 0.04);
    }
    .upload-zone.dragging::after {
      content: '';
      position: absolute;
      inset: 0;
      background: rgba(99, 102, 241, 0.05);
      pointer-events: none;
    }

    .upload-content {
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }
    .icon-circle {
      width: 64px;
      height: 64px;
      background: rgba(79, 70, 229, 0.1);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--primary-color);
      margin-bottom: 8px;
    }
    .icon-circle mat-icon { font-size: 32px; width: 32px; height: 32px; }
    
    .upload-content h3 { font-size: 18px; color: var(--text-main); margin: 0; }
    .upload-content p { color: var(--text-secondary); margin: 0; font-size: 14px; }

    .upload-progress { margin-bottom: 24px; border-radius: 4px; height: 6px; }

    /* Preview Card */
    .preview-card {
      background: var(--surface);
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-color);
      overflow: hidden;
      box-shadow: var(--shadow-sm);
    }
    
    .card-header {
      padding: 20px 24px;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(0,0,0,0.01);
      gap: 12px;
    }
    .header-title {
      display: flex;
      align-items: center;
      gap: 12px;
      color: var(--text-main);
    }
    .header-title h3 { font-size: 16px; font-weight: 600; margin: 0; }
    .header-title mat-icon { color: var(--text-secondary); }

    .badge {
      background: rgba(16, 185, 129, 0.1);
      color: #059669;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      border: 1px solid rgba(16, 185, 129, 0.2);
    }

    .table-container {
      max-height: 500px;
      overflow: auto;
    }
    table { width: 100%; border-collapse: collapse; min-width: 600px; }
    
    th.mat-mdc-header-cell {
      background: var(--bg-app);
      color: var(--text-secondary);
      font-weight: 600;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 16px 24px;
      border-bottom: 1px solid var(--border-color);
    }
    td.mat-mdc-cell {
      padding: 14px 24px;
      color: var(--text-main);
      border-bottom: 1px solid var(--border-color);
      font-size: 13px;
    }

    @media (max-width: 960px) {
      .page-container { padding: 20px; }
      .upload-zone { height: 220px; }
    }

    @media (max-width: 600px) {
      .page-header h2 { font-size: 20px; }
      .card-header { flex-direction: column; align-items: flex-start; }
      .icon-circle { width: 48px; height: 48px; }
      .icon-circle mat-icon { font-size: 24px; width: 24px; height: 24px; }
      .upload-content h3 { font-size: 16px; }
    }
  `,
})
export class UploadPlanning {
  @Output() uploadSuccess = new EventEmitter<void>();
  
  selectedFile: File | null = null;
  uploading = false;
  
  previewData = computed(() => this.planningService.currentPlanning().slice(0, 50));
  totalRows = computed(() => this.planningService.currentPlanning().length);
  
  displayedColumns: string[] = ["Employee ID", "Date", "Time", "Pickup Point", "Dropoff Point"];
  isDragging = false;


  constructor(
    private planningService: PlanningService,
    private snackBar: MatSnackBar,
    private notificationService: NotificationService
  ) {}

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.handleFile(file);
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  handleFile(file: File) {
    this.selectedFile = file;
    this.upload();
  }

  upload() {
    if (!this.selectedFile) return;

    this.uploading = true;
    this.planningService.uploadPlanning(this.selectedFile).subscribe({
      next: (res) => {
        this.uploading = false;
        
        // App Notification
        this.notificationService.add({
          title: 'Import Réussi',
          message: `${res.row_count} lignes importées depuis ${this.selectedFile?.name}`,
          type: 'success'
        });

        this.snackBar.open('Fichier importé avec succès', 'Fermer', { duration: 3000 });
        this.uploadSuccess.emit();
      },
      error: (err) => {
        this.uploading = false;
        const message = err.error?.detail || "Erreur lors de l'importation";
        
        // App Notification
        this.notificationService.add({
          title: 'Échec de l\'import',
          message: message,
          type: 'error'
        });

        this.snackBar.open(message, 'Fermer', { duration: 5000, panelClass: ['error-snackbar'] });
      }
    });
  }
}
