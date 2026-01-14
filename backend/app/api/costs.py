from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from app.api.settings import get_settings, Settings, VehicleType
import pandas as pd
import math

router = APIRouter(prefix="/costs", tags=["Costs"])

class KPIDetail(BaseModel):
    cost_per_person_zone_1: float
    cost_per_person_zone_2: float
    cost_per_person_zone_3: float
    avg_occupancy_rate: float
    total_vehicles: int

class CostBreakdown(BaseModel):
    option_1_total: float
    option_2_total: float
    savings: float
    best_option: str
    kpi_option_1: KPIDetail
    kpi_option_2: KPIDetail
    details_option_1: List[Dict[str, Any]]
    details_option_2: List[Dict[str, Any]]

@router.post("/calculate", response_model=CostBreakdown)
async def calculate_costs(planning_data: List[Dict[str, Any]], settings: Settings = Depends(get_settings)):
    if not planning_data:
        raise HTTPException(status_code=400, detail="Planning data is required for calculation")

    df = pd.DataFrame(planning_data)
    
    # -----------------------------------------------------
    # PRE-PROCESSING
    # -----------------------------------------------------
    if "Zone" not in df.columns: df["Zone"] = 1
    else: df["Zone"] = pd.to_numeric(df["Zone"], errors='coerce').fillna(1).astype(int)

    if "Ligne_Bus_Option_2" not in df.columns: df["Ligne_Bus_Option_2"] = "Ligne Indéfinie"

    # -----------------------------------------------------
    # OPTION 2: LINE MODE (BUS 13 PAX) - STRICT COMPLIANCE
    # -----------------------------------------------------
    # Logic: Group by Date, Time, Ligne.
    # Count Pax per group.
    # Vehicles needed = ceil(Pax / 13).
    # Cost = Vehicles * BusPrice.
    
    op2_groups = df.groupby(["Date", "Time", "Ligne_Bus_Option_2"])
    
    op2_total_cost = 0
    op2_total_vehicles = 0
    op2_total_capacity = 0
    op2_zones_cost = {1: 0.0, 2: 0.0, 3: 0.0}
    op2_zones_count = {1: 0, 2: 0, 3: 0}
    
    details_option_2 = []

    for (date, time, ligne), group in op2_groups:
        count = len(group)
        # Vehicles (13 seater)
        n_vehicles = math.ceil(count / 13.0)
        
        # Cost
        group_cost = n_vehicles * settings.option_2_bus_price
        
        op2_total_cost += group_cost
        op2_total_vehicles += n_vehicles
        op2_total_capacity += (n_vehicles * 13)
        
        # Zone attribution for KPI (Cost attribution pro-rata or by max zone? 
        # Subject implies "Average Cost per User per Zone". 
        # We assign the cost of the bus proportional to users in it?
        # Strategy: Strict "Coût moyen = Coût total Zone / Effectif Zone".
        # But a Bus serves a Line. A Line fits a Zone? Assuming Line is Zone-bound mostly.
        # If mixed, we split logic. Let's assume proportional allocation for precision.
        
        for z in [1, 2, 3]:
            z_count = len(group[group["Zone"] == z])
            if z_count > 0:
                op2_zones_count[z] += z_count
                # Share of cost
                op2_zones_cost[z] += group_cost * (z_count / count)

        details_option_2.append({
            "date": date, "time": time, "line": ligne,
            "count": count, "vehicles": n_vehicles, "cost": group_cost
        })

    op2_kpi = KPIDetail(
        cost_per_person_zone_1=op2_zones_cost[1] / op2_zones_count[1] if op2_zones_count[1] else 0,
        cost_per_person_zone_2=op2_zones_cost[2] / op2_zones_count[2] if op2_zones_count[2] else 0,
        cost_per_person_zone_3=op2_zones_cost[3] / op2_zones_count[3] if op2_zones_count[3] else 0,
        avg_occupancy_rate=(len(df) / op2_total_capacity * 100) if op2_total_capacity else 0,
        total_vehicles=op2_total_vehicles
    )

    # -----------------------------------------------------
    # OPTION 1: VEHICLE (GREEDY)
    # -----------------------------------------------------
    # Group by Date, Time only (Baseline).
    
    op1_groups = df.groupby(["Date", "Time"])
    
    op1_total_cost = 0
    op1_total_vehicles = 0
    op1_total_capacity = 0
    op1_zones_cost = {1: 0.0, 2: 0.0, 3: 0.0}
    op1_zones_count = {1: 0, 2: 0, 3: 0}
    
    details_option_1 = []

    for (date, time), group in op1_groups:
        count = len(group)
        # Greedy Bin Packing
        remaining = count
        group_cost = 0
        group_vehicles = 0
        group_capacity = 0
        
        # Determine Max Zone for Pricing this group (Conservative: Max Zone dictates price)
        # But for KPI attribution we need to be smart.
        max_zone = int(group["Zone"].max())

        # Logic: > 4 -> Hiace (13), <= 4 -> Berline (4)
        while remaining > 0:
            if remaining <= 4:
                v = next(v for v in settings.vehicle_types if v.name == "Berline")
                used = 4 # Capacity added
                remaining = 0
            else:
                v = next(v for v in settings.vehicle_types if "hiace" in v.name.lower())
                used = v.capacity
                remaining -= v.capacity
            
            p = v.zone_prices.get(max_zone, v.base_price)
            group_cost += p
            group_vehicles += 1
            group_capacity += v.capacity
        
        op1_total_cost += group_cost
        op1_total_vehicles += group_vehicles
        op1_total_capacity += group_capacity

        # KPI Attribution
        for z in [1, 2, 3]:
            z_count = len(group[group["Zone"] == z])
            if z_count > 0:
                op1_zones_count[z] += z_count
                op1_zones_cost[z] += group_cost * (z_count / count)

        details_option_1.append({
            "date": date, "time": time, 
            "count": count, "vehicles": group_vehicles, "cost": group_cost
        })

    op1_kpi = KPIDetail(
        cost_per_person_zone_1=op1_zones_cost[1] / op1_zones_count[1] if op1_zones_count[1] else 0,
        cost_per_person_zone_2=op1_zones_cost[2] / op1_zones_count[2] if op1_zones_count[2] else 0,
        cost_per_person_zone_3=op1_zones_cost[3] / op1_zones_count[3] if op1_zones_count[3] else 0,
        avg_occupancy_rate=(len(df) / op1_total_capacity * 100) if op1_total_capacity else 0,
        total_vehicles=op1_total_vehicles
    )

    # -----------------------------------------------------
    # RESULTS
    # -----------------------------------------------------
    savings = op2_total_cost - op1_total_cost if op1_total_cost < op2_total_cost else op1_total_cost - op2_total_cost
    best = "Option 1 (Véhicules)" if op1_total_cost < op2_total_cost else "Option 2 (Lignes Bus)"

    return CostBreakdown(
        option_1_total=op1_total_cost,
        option_2_total=op2_total_cost,
        savings=abs(savings),
        best_option=best,
        kpi_option_1=op1_kpi,
        kpi_option_2=op2_kpi,
        details_option_1=details_option_1[:50],
        details_option_2=details_option_2[:50]
    )
