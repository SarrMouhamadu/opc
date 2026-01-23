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
    # Nature : Coûts Contractuels (Base Mensuelle)
    option_1_contractual_total: float # Σ forfait_mensuel(zone_max_par_personne)
    option_2_contractual_total: float # Σ coût_prise_en_charge (extrapolé si partiel)
    savings: float
    best_option: Optional[str] = None
    
    # Audit & Validité Décisionnelle
    n_lines: int
    n_employees: int
    nb_jours_observes: int
    nb_jours_mois_reference: int = 22
    coverage_type: str # 'ALLER_RETOUR', 'ALLER', 'RETOUR'
    is_extrapolated: bool
    can_recommend: bool # Détermine si une décision contractuelle est possible
    
    # KPIs Economiques
    avg_monthly_cost_per_employee: float
    avg_cost_per_pickup: float
    
    kpi_option_1: KPIDetail
    kpi_option_2: KPIDetail
    details_option_1: List[Dict[str, Any]]
    details_option_2: List[Dict[str, Any]]

class CalculationRequest(BaseModel):
    planning_data: List[Dict[str, Any]]
    override_coverage: Optional[str] = None # "ALLER", "ALLER_RETOUR"

@router.post("/calculate", response_model=CostBreakdown)
async def calculate_costs(request: CalculationRequest, settings: Settings = Depends(get_settings)):
    planning_data = request.planning_data
    if not planning_data:
        raise HTTPException(status_code=400, detail="Planning data is required")

    df = pd.DataFrame(planning_data)
    n_lines = len(df)
    
    if n_lines < 5:
        raise HTTPException(
            status_code=400, 
            detail=f"Audit invalidé : Volume insuffisant ({n_lines}/5). Un minimum de 5 lignes est requis pour l'analyse."
        )

    # Pre-processing Zone
    def parse_zone(val):
        try: return int(val)
        except:
            s = str(val).upper()
            import re
            digits = re.findall(r'\d+', s)
            if digits: return int(digits[0])
            if 'A' in s: return 1
            if 'B' in s: return 2
            if 'C' in s: return 3
            return 1

    df["Zone_Int"] = df["Zone"].apply(parse_zone) if "Zone" in df.columns else 1
    if "Employee ID" not in df.columns: df["Employee ID"] = "Inconnu"
    if "Ligne_Bus_Option_2" not in df.columns: df["Ligne_Bus_Option_2"] = "Ligne Indéfinie"
    if "Time" not in df.columns: df["Time"] = "00:00"

    # Périmètre & Directions (Auto-détection ou Manuel)
    nb_jours_observes = df["Date"].nunique() if "Date" in df.columns else 1
    nb_jours_ref = 22 
    
    if request.override_coverage:
        coverage_direction = request.override_coverage
        facteur_direction = 2 if coverage_direction == "ALLER" else 1
    else:
        try:
            hours = pd.to_datetime(df["Time"], format='%H:%M').dt.hour
            has_morning = any(hours < 12)
            has_evening = any(hours >= 12)
            if has_morning and has_evening: 
                coverage_direction = "ALLER_RETOUR"
                facteur_direction = 1
            elif has_morning: 
                coverage_direction = "ALLER"
                facteur_direction = 2
            elif has_evening: 
                coverage_direction = "RETOUR"
                facteur_direction = 2
            else: 
                coverage_direction = "ALLER_RETOUR"
                facteur_direction = 1
        except:
            coverage_direction = "ALLER_RETOUR"
            facteur_direction = 1

    # RÈGLE D'OR : Comparaison engageante uniquement sur périmètre complet
    can_recommend = (nb_jours_observes >= nb_jours_ref and coverage_direction == "ALLER_RETOUR")
    is_extrapolated = not can_recommend

    # Option 1 : Toujours contractuel mensuel (Forfait)
    employee_zones = df.groupby("Employee ID")["Zone_Int"].max().reset_index()
    def map_forfait(z):
        return settings.option_1_forfait_prices.get(z, settings.option_1_forfait_prices[1])
    employee_zones["cost"] = employee_zones["Zone_Int"].apply(map_forfait)
    op1_total = employee_zones["cost"].sum()

    # Option 2 : Coût à la prise en charge
    def map_pickup(line):
        return settings.option_2_line_prices.get(line, settings.option_2_default_pickup_price)
    
    df["pickup_cost"] = df["Ligne_Bus_Option_2"].apply(map_pickup)
    op2_brut = df["pickup_cost"].sum()
    
    # Extrapolation estimative
    if is_extrapolated:
        extrapol_factor_jours = nb_jours_ref / nb_jours_observes
        op2_contractual = op2_brut * extrapol_factor_jours * facteur_direction
    else:
        op2_contractual = op2_brut

    n_employees = employee_zones["Employee ID"].nunique()
    savings = abs(op2_contractual - op1_total)
    
    # Best option (always computed)
    best = "Option 1 (Forfait)" if op1_total < op2_contractual else "Option 2 (Prise en charge)"

    # KPIs
    op1_kpi = KPIDetail(
        cost_per_person_zone_1=settings.option_1_forfait_prices[1],
        cost_per_person_zone_2=settings.option_1_forfait_prices[2],
        cost_per_person_zone_3=settings.option_1_forfait_prices[3],
        avg_occupancy_rate=100.0,
        total_vehicles=n_employees
    )
    
    avg_pickup = op2_brut / n_lines if n_lines > 0 else 0
    op2_kpi = KPIDetail(
        cost_per_person_zone_1=avg_pickup,
        cost_per_person_zone_2=0,
        cost_per_person_zone_3=0,
        avg_occupancy_rate=0,
        total_vehicles=n_lines
    )

    return CostBreakdown(
        option_1_contractual_total=op1_total,
        option_2_contractual_total=op2_contractual,
        savings=savings,
        best_option=best,
        n_lines=n_lines,
        n_employees=n_employees,
        nb_jours_observes=nb_jours_observes,
        coverage_type=coverage_direction,
        is_extrapolated=is_extrapolated,
        can_recommend=can_recommend,
        avg_monthly_cost_per_employee=op1_total / n_employees if n_employees > 0 else 0,
        avg_cost_per_pickup=avg_pickup,
        kpi_option_1=op1_kpi,
        kpi_option_2=op2_kpi,
        details_option_1=employee_zones.head(50).to_dict(orient="records"),
        details_option_2=df[["Employee ID", "Ligne_Bus_Option_2", "pickup_cost"]].head(50).to_dict(orient="records")
    )
