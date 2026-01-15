import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface KPIDetail {
  cost_per_person_zone_1: number;
  cost_per_person_zone_2: number;
  cost_per_person_zone_3: number;
  avg_occupancy_rate: number;
  total_vehicles: number;
}

export interface CostBreakdown {
  option_1_total: number;
  option_2_total: number;
  savings: number;
  best_option: string;
  kpi_option_1: KPIDetail;
  kpi_option_2: KPIDetail;
  details_option_1: any[];
  details_option_2: any[];
}
 
@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private apiUrl = 'http://localhost:8000'; // Pointing to main API for flexibility

  constructor(private http: HttpClient) {}

  // Renamed to match the strict logic
  getKpiAnalysis(planningData: any[]): Observable<CostBreakdown> {
    return this.http.post<CostBreakdown>(`${this.apiUrl}/costs/calculate`, planningData);
  }

  // Kept for legacy if needed, or redirect to calculate
  exportReport(format: 'excel' | 'pdf', planningData: any[]) {
    return this.http.post(`${this.apiUrl}/dashboard/export/${format}`, planningData, {
      responseType: 'blob'
    });
  }
}
