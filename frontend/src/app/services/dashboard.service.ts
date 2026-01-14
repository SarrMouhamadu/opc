import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface KPIResult {
  total_cost: number;
  total_savings: number;
  avg_occupancy: number;
  total_employees: number;
  total_vehicles: number;
}

export interface ZoneAnalysis {
  zone_1_count: number;
  zone_2_count: number;
  zone_3_count: number;
  zone_1_cost: number;
  zone_2_cost: number;
  zone_3_cost: number;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private apiUrl = 'http://localhost:8000/dashboard';

  constructor(private http: HttpClient) {}

  getKPIs(planningData: any[]): Observable<KPIResult> {
    return this.http.post<KPIResult>(`${this.apiUrl}/kpi`, planningData);
  }

  getZoneAnalysis(planningData: any[]): Observable<ZoneAnalysis> {
    return this.http.post<ZoneAnalysis>(`${this.apiUrl}/zones`, planningData);
  }

  exportReport(format: 'excel' | 'pdf', planningData: any[]) {
    return this.http.post(`${this.apiUrl}/export/${format}`, planningData, {
      responseType: 'blob'
    });
  }
}
