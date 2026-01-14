import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface VehicleType {
  name: string;
  capacity: number;
  base_price: number;
}

export interface Settings {
  grouping_window_minutes: number;
  option_2_bus_price?: number;
  vehicle_types: VehicleType[];
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private apiUrl = 'http://51.255.60.133:8000/settings';

  constructor(private http: HttpClient) {}

  getSettings(): Observable<Settings> {
    return this.http.get<Settings>(this.apiUrl);
  }

  updateSettings(settings: Settings): Observable<Settings> {
    return this.http.post<Settings>(this.apiUrl, settings);
  }
}
