from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Any
from app.api.settings import get_settings, Settings, VehicleType
import pandas as pd
import math

router = APIRouter(prefix="/costs", tags=["Costs"])

class CostBreakdown(BaseModel):
    option_1_total: float
    option_2_total: float
    savings: float
    best_option: str
    details_option_1: List[Dict[str, Any]]
    details_option_2: List[Dict[str, Any]]

@router.post("/calculate", response_model=CostBreakdown)
async def calculate_costs(planning_data: List[Dict[str, Any]], settings: Settings = Depends(get_settings)):
    if not planning_data:
        raise HTTPException(status_code=400, detail="Planning data is required for calculation")

    df = pd.DataFrame(planning_data)
    
    # Ensure Zone is present and numeric
    if "Zone" not in df.columns:
        # Default to Zone 1 if missing for now
        df["Zone"] = 1
    else:
        df["Zone"] = pd.to_numeric(df["Zone"], errors='coerce').fillna(1).astype(int)

    # --- Option 2 Calculation: Flat rate per pickup ---
    # In Option 2, every entry in the planning is a "prise en charge"
    total_pickups = len(df)
    option_2_total = total_pickups * settings.option_2_pickup_price
    details_option_2 = [{"type": "Prise en charge", "count": total_pickups, "unit_price": settings.option_2_pickup_price, "total": option_2_total}]

    # --- Option 1 Calculation: Vehicle-based with Zone Max ---
    # For a deterministic baseline, we group by Date and Time to see how many people travel together.
    # Note: Optimization (regrouping < 20min) is Epic 4. 
    # Here we do a simple grouping by exact slot for the baseline cost.
    
    total_option_1 = 0
    details_option_1 = []

    # Group by Date and Time
    groups = df.groupby(["Date", "Time"])
    
    for (date, time), group in groups:
        count = len(group)
        max_zone = int(group["Zone"].max())
        
        # Pick the most efficient vehicle (bin packing simplified: one vehicle types only for now for simplicity)
        # We start with the smallest vehicle that can fit everyone, or multiples if needed.
        # For simplicity, we assume we use Hiace if > 4, Berline otherwise.
        # This is basic bin packing.
        
        remaining_people = count
        group_cost = 0
        
        # Sort vehicles by capacity descending to fill largest first (or ascending for smallest)
        # To keep it simple: if count <= 4, use Berline. If > 4, use Hiace (capacity 13).
        
        while remaining_people > 0:
            if remaining_people <= 4:
                # Use Berline
                vehicle = next((v for v in settings.vehicle_types if v.name == "Berline"), settings.vehicle_types[0])
                remaining_people = 0
            else:
                # Use Hiace
                vehicle = next((v for v in settings.vehicle_types if v.name == "Hiace"), settings.vehicle_types[0])
                remaining_people -= vehicle.capacity
            
            # Use zone price if available, else base price
            price = vehicle.zone_prices.get(max_zone, vehicle.base_price)
            group_cost += price
        
        total_option_1 += group_cost
        details_option_1.append({
            "date": date,
            "time": time,
            "count": count,
            "max_zone": max_zone,
            "cost": group_cost
        })

    savings = option_2_total - total_option_1 if total_option_1 < option_2_total else total_option_1 - option_2_total
    best_option = "Option 1 (Véhicule)" if total_option_1 < option_2_total else "Option 2 (Prise en charge)"

    return CostBreakdown(
        option_1_total=total_option_1,
        option_2_total=option_2_total,
        savings=abs(savings),
        best_option=best_option,
        details_option_1=details_option_1[:20], # Limit details for response size
        details_option_2=details_option_2
    )
