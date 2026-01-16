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
  option_1_contractual_total: number;
  option_2_contractual_total: number;
  savings: number;
  best_option: string;
  n_lines: number;
  n_employees: number;
  n_days: number;
  coverage_type: string;
  avg_monthly_cost_per_employee: number;
  avg_cost_per_pickup: number;
  kpi_option_1: KPIDetail;
  kpi_option_2: KPIDetail;
  details_option_1: any[];
  details_option_2: any[];
}

@Injectable({
  providedIn: 'root'
})
export class CostsService {
  private apiUrl = '/api/costs';

  constructor(private http: HttpClient) {}

  calculateCosts(planningData: any[]): Observable<CostBreakdown> {
    return this.http.post<CostBreakdown>(`${this.apiUrl}/calculate`, planningData);
  }
}
