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

  constructor(private http: HttpClient) {}

  uploadPlanning(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.apiUrl}/upload`, formData).pipe(
      tap((res: any) => {
        this.currentPlanning.set(res.preview); // In a real app, this would be the full data
      })
    );
  }
}
