import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface OptimizationResult {
  total_vehicles: number;
  avg_occupancy_rate: number;
  total_cost_estimated: number;
  groups: any[];
  details: any;
}

@Injectable({
  providedIn: 'root'
})
export class OptimizationService {
  private apiUrl = '/api/optimization';

  constructor(private http: HttpClient) {}

  analyze(planningData: any[], windowMinutes: number | undefined): Observable<OptimizationResult> {
    return this.http.post<OptimizationResult>(`${this.apiUrl}/analyze?window_minutes=${windowMinutes || ''}`, planningData);
  }
}
