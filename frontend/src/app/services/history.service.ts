import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface HistoryEntry {
  id: string;
  date: string;
  total_cost: number;
  savings: number;
  total_vehicles?: number;
  total_employees?: number;
  data_snapshot: any;
}

export interface ArchiveRequest {
  total_cost: number;
  savings: number;
  details: any; // Allow full hierarchy
  total_vehicles: number; // Keep but optional if details cover it? Or enforce mapping.
  total_employees: number; // We might need to map this from the new breakdown or make optional
}

@Injectable({
  providedIn: 'root'
})
export class HistoryService {
  private apiUrl = 'http://51.255.60.133:8000/history';

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
