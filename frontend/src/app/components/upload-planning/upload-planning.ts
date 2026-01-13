import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { PlanningService } from '../../services/planning.service';

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
  template: `
    <div class="upload-container">
      <mat-card class="upload-card">
        <mat-card-header>
          <mat-card-title>Ingestion du Planning</mat-card-title>
          <mat-card-subtitle>Uploadez votre fichier Excel ou CSV de planning mensuel</mat-card-subtitle>
        </mat-card-header>
        
        <mat-card-content>
          <div class="upload-actions">
            <input type="file" #fileInput (change)="onFileSelected($event)" accept=".csv,.xlsx,.xls" hidden>
            <button mat-raised-button color="primary" (click)="fileInput.click()" [disabled]="uploading">
              <mat-icon>cloud_upload</mat-icon>
              Choisir un fichier
            </button>
            <span class="filename" *ngIf="selectedFile">{{ selectedFile.name }}</span>
          </div>

          <mat-progress-bar mode="indeterminate" *ngIf="uploading"></mat-progress-bar>

          <div class="preview-section" *ngIf="previewData.length > 0">
            <h3>Aperçu des données ({{ totalRows }} lignes)</h3>
            <div class="table-container mat-elevation-z2">
              <table mat-table [dataSource]="previewData">
                <ng-container *ngFor="let col of displayedColumns" [matColumnDef]="col">
                  <th mat-header-cell *matHeaderCellDef> {{ col }} </th>
                  <td mat-cell *matCellDef="let element"> {{ element[col] }} </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
              </table>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: `
    .upload-container {
      padding: 24px;
      display: flex;
      justify-content: center;
    }
    .upload-card {
      width: 100%;
      max-width: 1000px;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.1);
    }
    .upload-actions {
      margin: 24px 0;
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .filename {
      font-style: italic;
      color: #666;
    }
    .preview-section {
      margin-top: 32px;
    }
    .table-container {
      max-height: 400px;
      overflow: auto;
      border-radius: 8px;
    }
    table {
      width: 100%;
    }
    h3 {
      margin-bottom: 16px;
      color: #333;
    }
  `,
})
export class UploadPlanning {
  selectedFile: File | null = null;
  uploading = false;
  previewData: any[] = [];
  displayedColumns: string[] = ["Employee ID", "Date", "Time", "Pickup Point", "Dropoff Point"];
  totalRows = 0;

  constructor(
    private planningService: PlanningService,
    private snackBar: MatSnackBar
  ) {}

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.upload();
    }
  }

  upload() {
    if (!this.selectedFile) return;

    this.uploading = true;
    this.planningService.uploadPlanning(this.selectedFile).subscribe({
      next: (res) => {
        this.previewData = res.preview;
        this.totalRows = res.row_count;
        this.uploading = false;
        this.snackBar.open('Fichier importé avec succès', 'Fermer', { duration: 3000 });
      },
      error: (err) => {
        this.uploading = false;
        const message = err.error?.detail || 'Erreur lors de l\'importation';
        this.snackBar.open(message, 'Fermer', { duration: 5000, panelClass: ['error-snackbar'] });
      }
    });
  }
}
