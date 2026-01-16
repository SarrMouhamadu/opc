from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from app.api.settings import get_settings, Settings, VehicleType
import pandas as pd
from datetime import datetime, timedelta

router = APIRouter(prefix="/optimization", tags=["Optimization"])

class OptimizationResult(BaseModel):
    total_vehicles: int
    avg_occupancy_rate: float
    total_cost_estimated: float
    groups: List[Dict[str, Any]]
    details: Dict[str, Any]

@router.post("/analyze", response_model=OptimizationResult)
async def analyze_optimization(planning_data: List[Dict[str, Any]], settings: Settings = Depends(get_settings), window_minutes: Optional[int] = None):
    if not planning_data:
        raise HTTPException(status_code=400, detail="Planning data is required")

    df = pd.DataFrame(planning_data)
    
    # Use provided window or default from settings
    grouping_window = window_minutes if window_minutes is not None else settings.grouping_window_minutes
    
    # Preprocessing
    # ensure Time is comparable. We assume Date + Time
    # detailed logic: combine Date and Time to a datetime object
    # For simulation, we might strictly look at Time if Date is consistent, but robust way is Date+Time
    
    # Robust Datetime Parsing
    try:
        # Handle cases where Date/Time might be already objects or disparate strings
        df['dt_str'] = df['Date'].astype(str) + ' ' + df['Time'].astype(str)
        df['datetime'] = pd.to_datetime(df['dt_str'], errors='coerce')
        # Remove failures
        df = df.dropna(subset=['datetime'])
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erreur de format Date/Heure : {str(e)}")

    if df.empty:
        raise HTTPException(status_code=400, detail="Aucune donnée valide après parsing des dates.")

    # Sort by datetime for sliding window
    df = df.sort_values(by='datetime')
    
    # Process Zone to always be integer
    def parse_zone(val):
        try:
            return int(val)
        except:
            s = str(val).upper()
            if 'A' in s: return 1
            if 'B' in s: return 2
            if 'C' in s: return 3
            import re
            digits = re.findall(r'\d+', s)
            return int(digits[0]) if digits else 1

    df['Zone_Int'] = df['Zone'].apply(parse_zone)

    # Optimization Constants
    vehicle_types = sorted(settings.vehicle_types, key=lambda x: x.capacity) # [Berline(4), Hiace(13)]
    if not vehicle_types:
        raise HTTPException(status_code=500, detail="Aucun type de véhicule configuré.")

    max_capacity = max(v.capacity for v in vehicle_types)
    
    # --- RIGOROUS OPTIMAL VEHICLE SELECTION ---
    def get_best_vehicle_config(n_pax, max_zone, vehicles):
        """
        Finest combination of vehicles to carry n_pax for minimum cost.
        Since we have small n_pax (<=13) and only 2 types usually, 
        we compare: 1 Single Largest vs Combination of Smallest.
        """
        if n_pax <= 0: return "N/A", 0, 0
        
        configs = []
        
        # 1. Try single vehicle fit
        for v in vehicles:
            if n_pax <= v.capacity:
                cost = v.zone_prices.get(max_zone, v.base_price)
                configs.append({
                    "description": v.name,
                    "cost": cost,
                    "capacity": v.capacity
                })
        
        # 2. Try multiple smallest vehicles (only if cheaper)
        smallest = vehicles[0]
        n_smallest = (n_pax + smallest.capacity - 1) // smallest.capacity # ceil
        multi_cost = n_smallest * smallest.zone_prices.get(max_zone, smallest.base_price)
        configs.append({
            "description": f"{n_smallest}x {smallest.name}",
            "cost": multi_cost,
            "capacity": n_smallest * smallest.capacity
        })
        
        # Pick the absolute cheapest
        best = min(configs, key=lambda x: x['cost'])
        return best['description'], best['cost'], best['capacity']

    # --- GROUPING LOGIC ---
    groups = []
    i = 0
    total_len = len(df)
    
    while i < total_len:
        current_emp = df.iloc[i]
        start_time = current_emp['datetime']
        group_indices = [i]
        
        # Fill group within window and capacity
        j = i + 1
        while j < total_len and len(group_indices) < max_capacity:
            candidate = df.iloc[j]
            time_diff = (candidate['datetime'] - start_time).total_seconds() / 60.0
            
            if time_diff <= grouping_window:
                group_indices.append(j)
                j += 1
            else:
                break
        
        # Extract group and compute metrics
        group_df = df.iloc[group_indices]
        group_size = len(group_df)
        max_zone = int(group_df['Zone_Int'].max())
        
        # Select optimal vehicle mix for this specific group
        v_desc, v_cost, v_cap = get_best_vehicle_config(group_size, max_zone, vehicle_types)
        
        groups.append({
            "start_time": start_time.isoformat(),
            "count": group_size,
            "vehicle": v_desc,
            "cost": v_cost,
            "occupancy": round((group_size / v_cap) * 100, 1) if v_cap > 0 else 0,
            "capacity": v_cap,
            "employees_preview": group_df['Employee ID'].head(3).tolist() # Just a preview
        })
        
        # Advance pointer
        i = j

    # Final Summary
    total_vehicles_count = len(groups)
    total_cost = sum(g['cost'] for g in groups)
    avg_occupancy = sum(g['occupancy'] for g in groups) / total_vehicles_count if total_vehicles_count > 0 else 0
    
    return OptimizationResult(
        total_vehicles=total_vehicles_count,
        avg_occupancy_rate=round(avg_occupancy, 1),
        total_cost_estimated=float(total_cost),
        groups=groups[:100], 
        details={
            "grouping_window": grouping_window,
            "total_groups": len(groups),
            "processed_rows": total_len
        }
    )
