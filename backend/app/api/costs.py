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
    # Nature : Coûts Contractuels (Facturation Mensuelle)
    option_1_contractual_total: float # Σ forfait_mensuel(zone_max_par_personne)
    option_2_contractual_total: float # Σ coût_prise_en_charge (toutes lignes)
    savings: float
    best_option: str
    
    # Audit Checklist
    n_lines: int
    n_employees: int
    n_days: int
    coverage_type: str # 'Complet (A/R)', 'Aller uniquement', 'Retour uniquement' ou 'Partiel'
    
    # KPIs Economiques (Contractuels)
    avg_monthly_cost_per_employee: float # Option 1
    avg_cost_per_pickup: float # Option 2
    
    kpi_option_1: KPIDetail
    kpi_option_2: KPIDetail
    details_option_1: List[Dict[str, Any]]
    details_option_2: List[Dict[str, Any]]

@router.post("/calculate", response_model=CostBreakdown)
async def calculate_costs(planning_data: List[Dict[str, Any]], settings: Settings = Depends(get_settings)):
    if not planning_data:
        raise HTTPException(status_code=400, detail="Planning data is required")

    df = pd.DataFrame(planning_data)
    n_lines = len(df)
    
    # 4️⃣ Alignement des garde-fous de volume (Seuil métier 10 000 lignes)
    if n_lines < 10000:
        raise HTTPException(
            status_code=400, 
            detail=f"Audit invalidé : Volume insuffisant ({n_lines}/10000). Le calcul contractuel mensuel requiert un mois complet."
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

    # 5️⃣ Prise en compte du périmètre réel (Aller / Retour)
    # On analyse les créneaux horaires pour détecter la couverture
    try:
        hours = pd.to_datetime(df["Time"], format='%H:%M').dt.hour
        has_morning = any(hours < 12)
        has_evening = any(hours >= 12)
        if has_morning and has_evening: coverage = "Complet (A/R)"
        elif has_morning: coverage = "Aller uniquement"
        elif has_evening: coverage = "Retour uniquement"
        else: coverage = "Indéterminé"
    except:
        coverage = "Indéterminé"

    # 1️⃣ Zone forfaitaire incorrecte (Option 1)
    # Calcul de la zone maximale réellement rencontrée par salarié sur le mois
    employee_zones = df.groupby("Employee ID")["Zone_Int"].max().reset_index()
    
    def map_forfait(z):
        return settings.option_1_forfait_prices.get(z, settings.option_1_forfait_prices[1])

    employee_zones["cost"] = employee_zones["Zone_Int"].apply(map_forfait)
    op1_total = employee_zones["cost"].sum()

    # 3️⃣ Correction des KPI Option 2 (Somme exhaustive sur toutes les lignes)
    def map_pickup(line):
        return settings.option_2_line_prices.get(line, settings.option_2_default_pickup_price)

    df["pickup_cost"] = df["Ligne_Bus_Option_2"].apply(map_pickup)
    op2_total = df["pickup_cost"].sum()

    n_employees = employee_zones["Employee ID"].nunique()
    n_days = df["Date"].nunique() if "Date" in df.columns else 1

    # Separation des natures de coûts : Ce sont ici des coûts CONTRACTUELS
    savings = abs(op2_total - op1_total)
    best = "Option 1 (Forfait Mensuel)" if op1_total < op2_total else "Option 2 (Prise en charge Ligne)"

    # KPIs
    op1_kpi = KPIDetail(
        cost_per_person_zone_1=settings.option_1_forfait_prices[1],
        cost_per_person_zone_2=settings.option_1_forfait_prices[2],
        cost_per_person_zone_3=settings.option_1_forfait_prices[3],
        avg_occupancy_rate=100.0,
        total_vehicles=n_employees
    )
    
    # KPI Option 2 : Coût par prise en charge (Unité économique exacte)
    avg_pickup = op2_total / n_lines if n_lines > 0 else 0
    op2_kpi = KPIDetail(
        cost_per_person_zone_1=avg_pickup,
        cost_per_person_zone_2=0,
        cost_per_person_zone_3=0,
        avg_occupancy_rate=0,
        total_vehicles=n_lines
    )

    return CostBreakdown(
        option_1_contractual_total=op1_total,
        option_2_contractual_total=op2_total,
        savings=savings,
        best_option=best,
        n_lines=n_lines,
        n_employees=n_employees,
        n_days=n_days,
        coverage_type=coverage,
        avg_monthly_cost_per_employee=op1_total / n_employees if n_employees > 0 else 0,
        avg_cost_per_pickup=avg_pickup,
        kpi_option_1=op1_kpi,
        kpi_option_2=op2_kpi,
        details_option_1=employee_zones.head(50).to_dict(orient="records"),
        details_option_2=df[["Employee ID", "Ligne_Bus_Option_2", "pickup_cost"]].head(50).to_dict(orient="records")
    )
