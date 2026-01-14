import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface HistoryEntry {
  id: string;
  date: string;
  total_cost: number;
  savings: number;
  total_vehicles: number;
  total_employees: number;
  data_snapshot: any;
}

export interface ArchiveRequest {
  total_cost: number;
  savings: number;
  total_vehicles: number;
  total_employees: number;
  planning_summary: any;
}

@Injectable({
  providedIn: 'root'
})
export class HistoryService {
  private apiUrl = 'http://localhost:8000/history';

  constructor(private http: HttpClient) {}

  getHistory(): Observable<HistoryEntry[]> {
    return this.http.get<HistoryEntry[]>(this.apiUrl);
  }

  getStats(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/stats`);
  }

  archive(data: ArchiveRequest): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }
}
