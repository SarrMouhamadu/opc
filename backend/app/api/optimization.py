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
    
    # We will prioritize the largest vehicle to minimize count, or use logic.
    # Constraint: "Deterministic".
    # Greedy Strategy:
    # 1. Take first person. Start a group.
    # 2. Look ahead. Anyone fitting in [Time, Time + Window] AND matching route constraints?
    #    (Simplified: We assume same Pickup/Dropoff flow or just Time based for this Epic if not specified otherwise. 
    #     The prompt mentions "Grouping (<= 20 min)". We assume standard Home->Work flow for all).
    
    # Get max capacity of largest vehicle for grouping limits (or standard Hiace 13)
    # Ideally we should form groups of 13 max, then 4 max, etc.
    # Let's try to fill the largest vehicle (Hiace) first.
    
    max_capacity = 13 # default Hiace
    # Find active Hiace capacity
    hiace = next((v for v in settings.vehicle_types if "hiace" in v.name.lower()), None)
    if hiace: max_capacity = hiace.capacity
    
    processed_indices = set()
    
    # Iterate through employees
    for i in range(len(df)):
        if i in processed_indices:
            continue
            
        current_emp = df.iloc[i]
        start_time = current_emp['datetime']
        
        # Start a new group
        current_group = [current_emp.to_dict()]
        processed_indices.add(i)
        
        # Look ahead for candidates
        for j in range(i + 1, len(df)):
            if j in processed_indices:
                continue
                
            candidate = df.iloc[j]
            time_diff = (candidate['datetime'] - start_time).total_seconds() / 60.0
            
            if time_diff <= grouping_window:
                if len(current_group) < max_capacity:
                    current_group.append(candidate.to_dict())
                    processed_indices.add(j)
                else:
                    # Vehicle full
                    break
            else:
                # Outside window, since sorted, no need to check further for this group
                break
        
        # Assign Vehicle Type to Group
        group_count = len(current_group)
        # Simple logic: if <= 4 use Berline, else Hiace (if available)
        vehicle_name = "Inconnu"
        cost = 0
        
        # Sort vehicle types by capacity
        sorted_vehicles = sorted(settings.vehicle_types, key=lambda x: x.capacity)
        
        selected_vehicle = None
        for v in sorted_vehicles:
            if group_count <= v.capacity:
                selected_vehicle = v
                break
        
        # If group is larger than any single vehicle (should not happen if we capped at max_capacity), take largest
        if not selected_vehicle and sorted_vehicles:
            selected_vehicle = sorted_vehicles[-1]
            
        if selected_vehicle:
            vehicle_name = selected_vehicle.name
            # Max zone in group
            max_zone = max([int(p.get('Zone', 1)) for p in current_group])
            cost = selected_vehicle.zone_prices.get(max_zone, selected_vehicle.base_price)
            capacity = selected_vehicle.capacity
        else:
            capacity = group_count # Fallback

        groups.append({
            "start_time": str(start_time),
            "count": group_count,
            "vehicle": vehicle_name,
            "cost": cost,
            "occupancy": (group_count / capacity) * 100 if capacity > 0 else 0,
            "capacity": capacity,
            "employees": [e['Employee ID'] for e in current_group]
        })

    # KPIs
    total_vehicles = len(groups)
    total_cost = sum(g['cost'] for g in groups)
    avg_occupancy = sum(g['occupancy'] for g in groups) / total_vehicles if total_vehicles > 0 else 0
    
    return OptimizationResult(
        total_vehicles=total_vehicles,
        avg_occupancy_rate=round(avg_occupancy, 2),
        total_cost_estimated=total_cost,
        groups=groups,
        details={
            "grouping_window": grouping_window,
            "strategy": "Greedy Time-Window"
        }
    )
