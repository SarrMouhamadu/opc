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

    # Optimized Zone Parsing using vectorized mapping
    if "Zone" not in df.columns: 
        df["Zone"] = 1
    else: 
        # Convert to string, then use vectorized regex or map for common cases
        s_zones = df["Zone"].astype(str).str.upper()
        df["Zone"] = 1 # Default
        df.loc[s_zones.str.contains('1|A'), "Zone"] = 1
        df.loc[s_zones.str.contains('2|B'), "Zone"] = 2
        df.loc[s_zones.str.contains('3|C'), "Zone"] = 3

    if "Ligne_Bus_Option_2" not in df.columns: 
        df["Ligne_Bus_Option_2"] = "Ligne Indéfinie"

    # --- VECTORIZED CALCULATIONS ---
    
    # 1. Prepare Base Grouping
    group_cols = ["Date", "Time"]
    df["max_zone"] = df.groupby(group_cols)["Zone"].transform("max")
    
    hiace = next(v for v in settings.vehicle_types if "hiace" in v.name.lower())
    berline = next(v for v in settings.vehicle_types if v.name == "Berline")
    
    hiace_prices = {z: hiace.zone_prices.get(z, hiace.base_price) for z in [1, 2, 3]}
    berline_prices = {z: berline.zone_prices.get(z, berline.base_price) for z in [1, 2, 3]}

    # -----------------------------------------------------
    # OPTION 2: LINE MODE (BUS 13 PAX)
    # -----------------------------------------------------
    op2_counts = df.groupby(group_cols + ["Ligne_Bus_Option_2", "max_zone"]).size().reset_index(name='pax_count')
    # Use integer math for speed: (n + d - 1) // d is equivalent to ceil(n/d)
    op2_counts['n_vehicles'] = (op2_counts['pax_count'] + 12) // 13
    op2_counts['cost'] = op2_counts['n_vehicles'] * settings.option_2_bus_price
    
    op2_total_cost = op2_counts['cost'].sum()
    op2_total_vehicles = int(op2_counts['n_vehicles'].sum())
    op2_total_capacity = op2_total_vehicles * 13

    # -----------------------------------------------------
    # OPTION 1: VEHICLE (GREEDY VECTORIZED)
    # -----------------------------------------------------
    op1_counts = df.groupby(group_cols + ["max_zone"]).size().reset_index(name='pax_count')
    
    # Vectorized logic for Hiace vs Berline
    # n_hiace = count // 13. If remainder > 4, n_hiace += 1. Else n_berline = 1.
    pax = op1_counts['pax_count']
    op1_counts['n_hiace'] = pax // 13
    remainder = pax % 13
    
    # Masking for remainder logic
    op1_counts['n_berline'] = 0
    mask_extra_hiace = remainder > 4
    mask_berline = (remainder > 0) & (remainder <= 4)
    
    op1_counts.loc[mask_extra_hiace, 'n_hiace'] += 1
    op1_counts.loc[mask_berline, 'n_berline'] = 1
    
    # Calculate costs using vectorized mapping
    z_prices_hiace = op1_counts['max_zone'].map(hiace_prices)
    z_prices_berline = op1_counts['max_zone'].map(berline_prices)
    
    op1_counts['cost'] = (op1_counts['n_hiace'] * z_prices_hiace) + (op1_counts['n_berline'] * z_prices_berline)
    op1_counts['n_vehicles'] = op1_counts['n_hiace'] + op1_counts['n_berline']
    op1_counts['capacity'] = (op1_counts['n_hiace'] * 13) + (op1_counts['n_berline'] * 4)

    op1_total_cost = float(op1_counts['cost'].sum())
    op1_total_vehicles = int(op1_counts['n_vehicles'].sum())
    op1_total_capacity = int(op1_counts['capacity'].sum())

    # KPI Statistics
    total_pax = len(df)
    zone_counts = df["Zone"].value_counts().reindex([1, 2, 3], fill_value=0)
    
    # Attribution of costs by zone (proportional to pax for simplicity and speed)
    def calculate_kpi(total_cost, total_vehicles, total_capacity):
        return KPIDetail(
            cost_per_person_zone_1=(total_cost * (zone_counts[1] / total_pax)) / zone_counts[1] if zone_counts[1] else 0,
            cost_per_person_zone_2=(total_cost * (zone_counts[2] / total_pax)) / zone_counts[2] if zone_counts[2] else 0,
            cost_per_person_zone_3=(total_cost * (zone_counts[3] / total_pax)) / zone_counts[3] if zone_counts[3] else 0,
            avg_occupancy_rate=(total_pax / total_capacity * 100) if total_capacity else 0,
            total_vehicles=total_vehicles
        )

    op1_kpi = calculate_kpi(op1_total_cost, op1_total_vehicles, op1_total_capacity)
    op2_kpi = calculate_kpi(op2_total_cost, op2_total_vehicles, op2_total_capacity)

    # UI Details
    details_option_1 = op1_counts.head(50).rename(columns={"Date": "date", "Time": "time", "n_vehicles": "vehicles"}).to_dict(orient="records")
    details_option_2 = op2_counts.head(50).rename(columns={"Date": "date", "Time": "time", "Ligne_Bus_Option_2": "line", "n_vehicles": "vehicles"}).to_dict(orient="records")

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
