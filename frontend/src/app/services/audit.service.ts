import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AuditEntry {
  timestamp: string;
  event: string;
  details?: string;
  user: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuditService {
  private apiUrl = '/api/audit';

  constructor(private http: HttpClient) {}

  getLogs(): Observable<AuditEntry[]> {
    return this.http.get<AuditEntry[]>(this.apiUrl);
  }
}
