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
    n_lines: int
    n_employees: int
    n_days: int
    avg_cost_per_person: float
    avg_cost_per_pickup: float
    kpi_option_1: KPIDetail
    kpi_option_2: KPIDetail
    details_option_1: List[Dict[str, Any]]
    details_option_2: List[Dict[str, Any]]

@router.post("/calculate", response_model=CostBreakdown)
async def calculate_costs(planning_data: List[Dict[str, Any]], settings: Settings = Depends(get_settings)):
    # 1️⃣ Chargement & validation des données
    if not planning_data:
        raise HTTPException(status_code=400, detail="Planning data is required for calculation")

    df = pd.DataFrame(planning_data)
    n_lines = df.shape[0]
    n_columns = df.shape[1]
    
    import logging
    logging.info(f"Calcul des coûts : N_lines={n_lines}, N_columns={n_columns}")
    
    # Stopper l’exécution si N_lines < 10 000 (garde-fou métier demandé)
    if n_lines < 10000:
        raise HTTPException(
            status_code=400, 
            detail=f"Volume insuffisant pour l'audit (N={n_lines}). Le planning doit contenir au moins 10 000 lignes pour être certifié."
        )

    # --- Pre-processing Zone ---
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

    df["Zone"] = df["Zone"].apply(parse_zone) if "Zone" in df.columns else 1
    if "Employee ID" not in df.columns: df["Employee ID"] = "Inconnu"
    if "Ligne_Bus_Option_2" not in df.columns: df["Ligne_Bus_Option_2"] = "Ligne Indéfinie"

    # 2️⃣ Calcul des volumes de référence (obligatoire)
    n_employees = df["Employee ID"].nunique()
    n_days = df["Date"].nunique() if "Date" in df.columns else 1
    
    # 3️⃣ Implémentation Option 1 — Forfait mensuel
    # Étape 3.1 & 3.2 — Base de calcul & Zone max
    df_unique = df.drop_duplicates(subset=["Employee ID"])
    
    def get_op1_cost(row):
        z = row["Zone"]
        return settings.option_1_forfait_prices.get(z, settings.option_1_forfait_prices.get(1))

    df_unique["emp_cost"] = df_unique.apply(get_op1_cost, axis=1)
    op1_total_cost = df_unique["emp_cost"].sum()
    
    # 4️⃣ Implémentation Option 2 — Prise en charge
    # Étape 4.1, 4.2, 4.3 — Base de calcul (100% lines) & Coût trip
    def get_op2_cost(row):
        line = row["Ligne_Bus_Option_2"]
        return settings.option_2_line_prices.get(line, settings.option_2_default_pickup_price)

    df["pickup_cost"] = df.apply(get_op2_cost, axis=1)
    op2_total_cost = df["pickup_cost"].sum()

    # 5️⃣ Isolation stricte de l’optimisation (Calculée ici séparément ou ignorée pour les coûts fixes)
    # L'optimisation (regroupement) n'influence pas les coûts forfaitaires ou à la prise en charge brute.
    
    # 6️⃣ Traçabilité & réponse API
    savings = op2_total_cost - op1_total_cost
    best = "Option 1 (Forfait)" if op1_total_cost < op2_total_cost else "Option 2 (Prise en charge)"
    
    # KPIs for visualization compatible with frontend
    op1_kpi = KPIDetail(
        cost_per_person_zone_1=settings.option_1_forfait_prices.get(1),
        cost_per_person_zone_2=settings.option_1_forfait_prices.get(2),
        cost_per_person_zone_3=settings.option_1_forfait_prices.get(3),
        avg_occupancy_rate=100.0, # Not applicable for flat rate
        total_vehicles=n_employees # 1 for each for visualization? Or just semantic
    )
    
    op2_kpi = KPIDetail(
        cost_per_person_zone_1=op2_total_cost / n_employees if n_employees > 0 else 0,
        cost_per_person_zone_2=0, # Simplified for pickup mode
        cost_per_person_zone_3=0,
        avg_occupancy_rate=0,
        total_vehicles=n_lines # Total pickups
    )

    return CostBreakdown(
        option_1_total=op1_total_cost,
        option_2_total=op2_total_cost,
        savings=abs(savings),
        best_option=best,
        n_lines=n_lines,
        n_employees=n_employees,
        n_days=n_days,
        avg_cost_per_person=op1_total_cost / n_employees if n_employees > 0 else 0,
        avg_cost_per_pickup=op2_total_cost / n_lines if n_lines > 0 else 0,
        kpi_option_1=op1_kpi,
        kpi_option_2=op2_kpi,
        details_option_1=df_unique[["Employee ID", "Zone", "emp_cost"]].head(20).to_dict(orient="records"),
        details_option_2=df[["Employee ID", "Ligne_Bus_Option_2", "pickup_cost"]].head(20).to_dict(orient="records")
    )
