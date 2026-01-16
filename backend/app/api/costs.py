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
    # -----------------------------------------------------
    # PRE-PROCESSING
    # -----------------------------------------------------
    
    # Robust Zone Parsing
    def parse_zone(val):
        try:
            return int(val)
        except:
            s = str(val).upper()
            import re
            digits = re.findall(r'\d+', s)
            if digits: return int(digits[0])
            if 'A' in s: return 1
            if 'B' in s: return 2
            if 'C' in s: return 3
            return 1

    if "Zone" not in df.columns: 
        df["Zone"] = 1
    else: 
        df["Zone"] = df["Zone"].apply(parse_zone)

    if "Ligne_Bus_Option_2" not in df.columns: df["Ligne_Bus_Option_2"] = "Ligne Indéfinie"

    # --- OPTIMIZED CALCULATION ---
    
    # 1. Prepare Base DataFrame
    df["max_zone"] = df.groupby(["Date", "Time"])["Zone"].transform("max")
    
    # Pre-calculate prices per vehicle/zone
    # v.zone_prices.get(max_zone, v.base_price)
    hiace = next(v for v in settings.vehicle_types if "hiace" in v.name.lower())
    berline = next(v for v in settings.vehicle_types if v.name == "Berline")
    
    hiace_prices = {z: hiace.zone_prices.get(z, hiace.base_price) for z in [1, 2, 3]}
    berline_prices = {z: berline.zone_prices.get(z, berline.base_price) for z in [1, 2, 3]}

    # -----------------------------------------------------
    # OPTION 2: LINE MODE (BUS 13 PAX)
    # -----------------------------------------------------
    op2_groups_all = df.groupby(["Date", "Time", "Ligne_Bus_Option_2", "max_zone"])
    op2_counts = op2_groups_all.size().reset_index(name='pax_count')
    op2_counts['n_vehicles'] = (op2_counts['pax_count'] / 13.0).apply(math.ceil)
    op2_counts['cost'] = op2_counts['n_vehicles'] * settings.option_2_bus_price
    
    op2_total_cost = op2_counts['cost'].sum()
    op2_total_vehicles = op2_counts['n_vehicles'].sum()
    op2_total_capacity = op2_total_vehicles * 13

    # KPI Zone Attribution
    op2_zones_count = {z: len(df[df["Zone"] == z]) for z in [1, 2, 3]}
    # For Zone Cost, we attribute proportionally
    # This is a bit complex in vectorized way, but let's stick to a cleaner logic
    op2_zones_cost = {z: (op2_total_cost * (op2_zones_count[z] / len(df)) if len(df) > 0 else 0) for z in [1, 2, 3]}

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
    op1_groups_all = df.groupby(["Date", "Time", "max_zone"])
    op1_counts = op1_groups_all.size().reset_index(name='pax_count')
    
    def calc_op1_group(row):
        cnt = row['pax_count']
        z = row['max_zone']
        cost = 0
        v_count = 0
        cap = 0
        rem = cnt
        while rem > 0:
            if rem <= 4:
                cost += berline_prices.get(z, berline.base_price)
                v_count += 1
                cap += 4
                rem = 0
            else:
                cost += hiace_prices.get(z, hiace.base_price)
                v_count += 1
                cap += 13
                rem -= 13
        return pd.Series([cost, v_count, cap])

    op1_counts[['cost', 'n_vehicles', 'capacity']] = op1_counts.apply(calc_op1_group, axis=1)
    
    op1_total_cost = op1_counts['cost'].sum()
    op1_total_vehicles = op1_counts['n_vehicles'].sum()
    op1_total_capacity = op1_counts['capacity'].sum()
    
    op1_zones_count = {z: len(df[df["Zone"] == z]) for z in [1, 2, 3]}
    op1_zones_cost = {z: (op1_total_cost * (op1_zones_count[z] / len(df)) if len(df) > 0 else 0) for z in [1, 2, 3]}

    # Prepare Detail Lists for UI
    details_option_1 = op1_counts.head(50).rename(columns={
        "Date": "date", "Time": "time", "n_vehicles": "vehicles"
    }).to_dict(orient="records")

    details_option_2 = op2_counts.head(50).rename(columns={
        "Date": "date", "Time": "time", "Ligne_Bus_Option_2": "line", "n_vehicles": "vehicles"
    }).to_dict(orient="records")

    op1_kpi = KPIDetail(
        cost_per_person_zone_1=op1_zones_cost[1] / op1_zones_count[1] if op1_zones_count[1] else 0,
        cost_per_person_zone_2=op1_zones_cost[2] / op1_zones_count[2] if op1_zones_count[2] else 0,
        cost_per_person_zone_3=op1_zones_cost[3] / op1_zones_count[3] if op1_zones_count[3] else 0,
        avg_occupancy_rate=(len(df) / op1_total_capacity * 100) if op1_total_capacity else 0,
        total_vehicles=int(op1_total_vehicles)
    )

    op2_kpi = KPIDetail(
        cost_per_person_zone_1=op2_zones_cost[1] / op2_zones_count[1] if op2_zones_count[1] else 0,
        cost_per_person_zone_2=op2_zones_cost[2] / op2_zones_count[2] if op2_zones_count[2] else 0,
        cost_per_person_zone_3=op2_zones_cost[3] / op2_zones_count[3] if op2_zones_count[3] else 0,
        avg_occupancy_rate=(len(df) / op2_total_capacity * 100) if op2_total_capacity else 0,
        total_vehicles=int(op2_total_vehicles)
    )

    # -----------------------------------------------------
    # RESULTS
    # -----------------------------------------------------
    savings = op2_total_cost - op1_total_cost 
    best = "Option 1 (Véhicules)" if op1_total_cost < op2_total_cost else "Option 2 (Lignes Bus)"

    return CostBreakdown(
        option_1_total=op1_total_cost,
        option_2_total=op2_total_cost,
        savings=abs(savings),
        best_option=best,
        kpi_option_1=op1_kpi,
        kpi_option_2=op2_kpi,
        details_option_1=details_option_1,
        details_option_2=details_option_2
    )
