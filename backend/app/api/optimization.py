from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from app.api.settings import get_settings, Settings, VehicleType
import pandas as pd
from datetime import datetime, timedelta
from app.api.audit import log_event

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
    
    # Let's perform a simple Parse
    try:
        df['datetime'] = pd.to_datetime(df['Date'] + ' ' + df['Time'])
    except:
        # Fallback if format issues, just try to parse Time for a single day assumption or similar
        # But let's assume valid ISO or consistent format from previous steps
        pass

    # Sort by datetime
    df = df.sort_values(by='datetime')
    
    # Drivers/Groups
    groups = []
    
    # Process Zone to always be integer
    def parse_zone(val):
        try:
            # 1. Try direct int conversion
            return int(val)
        except:
            # 2. Try cleaning string (Zone A -> A -> 1 ?)
            # Let's assume standard mapping A=1, B=2, C=3 or extract digit
            s = str(val).upper()
            import re
            # Extract first digit found
            digits = re.findall(r'\d+', s)
            if digits:
                return int(digits[0])
            
            # Map A, B, C
            if 'A' in s: return 1
            if 'B' in s: return 2
            if 'C' in s: return 3
            
            return 1 # Default

    # Apply parsing to dataframe to avoid repeating logic
    if 'Zone' in df.columns:
        df['Zone_Int'] = df['Zone'].apply(parse_zone)
    else:
        df['Zone_Int'] = 1

    # ... [Rest of grouping logic] ...
    
    # We will prioritize the largest vehicle to minimize count, or use logic.
    # Constraint: "Deterministic".
    # Greedy Strategy:
    # 1. Take first person. Start a group.
    # 2. Look ahead. Anyone fitting in [Time, Time + Window] AND matching route constraints?
    
    max_capacity = 13 # default Hiace
    # Find active Hiace capacity
    hiace = next((v for v in settings.vehicle_types if "hiace" in v.name.lower()), None)
    if hiace: max_capacity = hiace.capacity
    
    # Optimized Grouping Strategy
    # Instead of O(N^2) search, we use a single pass with index tracking
    
    i = 0
    while i < len(df):
        current_emp = df.iloc[i]
        start_time = current_emp['datetime']
        
        # Current group start
        group_indices = [i]
        
        # Look ahead for candidates in window
        # J starts from i + 1
        j = i + 1
        while j < len(df) and len(group_indices) < max_capacity:
            candidate = df.iloc[j]
            time_diff = (candidate['datetime'] - start_time).total_seconds() / 60.0
            
            if time_diff <= grouping_window:
                group_indices.append(j)
                j += 1
            else:
                break
        
        # Finalize group
        current_group = df.iloc[group_indices]
        group_count = len(current_group)
        
        # Select Vehicle
        sorted_vehicles = sorted(settings.vehicle_types, key=lambda x: x.capacity)
        selected_vehicle = next((v for v in sorted_vehicles if group_count <= v.capacity), sorted_vehicles[-1] if sorted_vehicles else None)
        
        if selected_vehicle:
            vehicle_name = selected_vehicle.name
            max_zone = int(current_group['Zone_Int'].max())
            cost = selected_vehicle.zone_prices.get(max_zone, selected_vehicle.base_price)
            capacity = selected_vehicle.capacity
        else:
            vehicle_name, cost, capacity = "Inconnu", 0, group_count
            
        groups.append({
            "start_time": str(start_time),
            "count": group_count,
            "vehicle": vehicle_name,
            "cost": cost,
            "occupancy": (group_count / capacity) * 100 if capacity > 0 else 0,
            "capacity": capacity,
            "employees": current_group['Employee ID'].tolist()
        })
        
        # Move i to the next unprocessed employee (j)
        i = j

    total_vehicles = len(groups)
    avg_occupancy = sum(g['occupancy'] for g in groups) / total_vehicles if total_vehicles > 0 else 0
    
    log_event("Simulation Optimisation", f"Fenêtre: {grouping_window} min, Véhicules: {total_vehicles}, Coût: {total_cost} FCFA")

    return OptimizationResult(
        total_vehicles=total_vehicles,
        avg_occupancy_rate=round(avg_occupancy, 2),
        total_cost_estimated=float(total_cost),
        groups=groups[:100], # Return first 100 groups for UI
        details={
            "grouping_window": grouping_window,
            "total_groups": len(groups)
        }
    )
