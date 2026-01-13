import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CostBreakdown {
  option_1_total: number;
  option_2_total: number;
  savings: number;
  best_option: string;
  details_option_1: any[];
  details_option_2: any[];
}

@Injectable({
  providedIn: 'root'
})
export class CostsService {
  private apiUrl = 'http://localhost:8000/costs';

  constructor(private http: HttpClient) {}

  calculateCosts(planningData: any[]): Observable<CostBreakdown> {
    return this.http.post<CostBreakdown>(`${this.apiUrl}/calculate`, planningData);
  }
}
