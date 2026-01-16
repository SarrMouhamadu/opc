import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PlanningService {
  private apiUrl = '/api/planning';
  
  // Shared state for the uploaded planning
  currentPlanning = signal<any[]>([]);

  constructor(private http: HttpClient) {
    this.restoreState();
  }

  private restoreState() {
    this.http.get<any>(`${this.apiUrl}/current`).subscribe({
      next: (res) => {
        if (res.rows && res.rows.length > 0) {
          this.currentPlanning.set(res.rows);
        }
      }
    });
  }

  uploadPlanning(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.apiUrl}/upload`, formData).pipe(
      tap((res: any) => {
        // Here we ideally want use the data returned by upload or re-fetch.
        // Since the upload now returns a preview, but the server saves full data,
        // let's re-fetch the full data to ensure the app has everything.
        this.restoreState();
      })
    );
  }
}
