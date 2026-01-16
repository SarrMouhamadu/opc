import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface OptimizationResult {
  total_vehicles: number;
  avg_occupancy_rate: number;
  estimated_logistic_budget: number;
  groups: any[];
  details: any;
}

@Injectable({
  providedIn: 'root'
})
export class OptimizationService {
  private apiUrl = '/api/optimization';

  constructor(private http: HttpClient) {}

  analyze(planningData: any[], windowMinutes: number | undefined, coverage?: string): Observable<OptimizationResult> {
    const payload = {
      planning_data: planningData,
      window_minutes: windowMinutes,
      override_coverage: coverage
    };
    return this.http.post<OptimizationResult>(`${this.apiUrl}/analyze`, payload);
  }
}
