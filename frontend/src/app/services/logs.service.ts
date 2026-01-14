
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface LogEntry {
  timestamp: string;
  action: string;
  details: string;
  user: string;
}

@Injectable({
  providedIn: 'root'
})
export class LogsService {
  private apiUrl = 'http://51.255.60.133:8000/logs';

  constructor(private http: HttpClient) {}

  getLogs(): Observable<LogEntry[]> {
    return this.http.get<LogEntry[]>(this.apiUrl);
  }
}
