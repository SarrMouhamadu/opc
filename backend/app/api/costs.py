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
    
    # Optimized Zone Parsing using cache
    _zone_cache = {}
    def parse_zone_fast(val):
        if val in _zone_cache: return _zone_cache[val]
        try:
            res = int(val)
        except:
            s = str(val).upper()
            if 'A' in s: res = 1
            elif 'B' in s: res = 2
            elif 'C' in s: res = 3
            else:
                import re
                digits = re.findall(r'\d+', s)
                res = int(digits[0]) if digits else 1
        _zone_cache[val] = res
        return res

    if "Zone" not in df.columns: 
        df["Zone"] = 1
    else: 
        # Map unique values instead of applying to every row
        unique_zones = df["Zone"].unique()
        zone_map = {z: parse_zone_fast(z) for z in unique_zones}
        df["Zone"] = df["Zone"].map(zone_map)

    if "Ligne_Bus_Option_2" not in df.columns: df["Ligne_Bus_Option_2"] = "Ligne Indéfinie"

    # --- OPTIMIZED CALCULATION ---
    
    # 1. Prepare Base DataFrame
    df["max_zone"] = df.groupby(["Date", "Time"])["Zone"].transform("max")
    
    # Pre-calculate prices per vehicle/zone
    hiace = next(v for v in settings.vehicle_types if "hiace" in v.name.lower())
    berline = next(v for v in settings.vehicle_types if v.name == "Berline")
    
    hiace_prices_map = {z: hiace.zone_prices.get(z, hiace.base_price) for z in [1, 2, 3]}
    berline_prices_map = {z: berline.zone_prices.get(z, berline.base_price) for z in [1, 2, 3]}

    # -----------------------------------------------------
    # OPTION 2: LINE MODE (BUS 13 PAX)
    # -----------------------------------------------------
    op2_counts = df.groupby(["Date", "Time", "Ligne_Bus_Option_2", "max_zone"]).size().reset_index(name='pax_count')
    op2_counts['n_vehicles'] = (op2_counts['pax_count'] / 13.0).apply(math.ceil)
    op2_counts['cost'] = op2_counts['n_vehicles'] * settings.option_2_bus_price
    
    op2_total_cost = op2_counts['cost'].sum()
    op2_total_vehicles = op2_counts['n_vehicles'].sum()
    op2_total_capacity = op2_total_vehicles * 13

    # KPI Zone Attribution
    op2_zones_count = df["Zone"].value_counts().to_dict()
    for z in [1, 2, 3]: op2_zones_count.setdefault(z, 0)
    
    total_pax = len(df)
    op2_zones_cost = {z: (op2_total_cost * (op2_zones_count[z] / total_pax) if total_pax > 0 else 0) for z in [1, 2, 3]}

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
    op1_counts = df.groupby(["Date", "Time", "max_zone"]).size().reset_index(name='pax_count')
    
    # Vectorized calculation for Option 1
    pax = op1_counts['pax_count']
    op1_counts['n_hiaces'] = pax // 13
    rem = pax % 13
    
    # Remainder logic: if 1-4 pax -> 1 berline, if 5+ pax -> 1 hiace
    op1_counts.loc[rem > 4, 'n_hiaces'] += 1
    op1_counts['n_berlines'] = 0
    op1_counts.loc[(rem > 0) & (rem <= 4), 'n_berlines'] = 1
    
    # Assign prices based on max_zone
    op1_counts['hiace_unit_price'] = op1_counts['max_zone'].map(hiace_prices_map)
    op1_counts['berline_unit_price'] = op1_counts['max_zone'].map(berline_prices_map)
    
    op1_counts['cost'] = (op1_counts['n_hiaces'] * op1_counts['hiace_unit_price']) + \
                         (op1_counts['n_berlines'] * op1_counts['berline_unit_price'])
    
    op1_counts['n_vehicles'] = op1_counts['n_hiaces'] + op1_counts['n_berlines']
    op1_counts['capacity'] = (op1_counts['n_hiaces'] * 13) + (op1_counts['n_berlines'] * 4)
    
    op1_total_cost = op1_counts['cost'].sum()
    op1_total_vehicles = op1_counts['n_vehicles'].sum()
    op1_total_capacity = op1_counts['capacity'].sum()
    
    op1_zones_count = op2_zones_count # Same pax distribution
    op1_zones_cost = {z: (op1_total_cost * (op1_zones_count[z] / total_pax) if total_pax > 0 else 0) for z in [1, 2, 3]}

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
