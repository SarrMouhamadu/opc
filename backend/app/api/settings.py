from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List

router = APIRouter(prefix="/settings", tags=["Settings"])

class VehicleType(BaseModel):
    name: str
    capacity: int
    base_price: float
    zone_prices: dict[int, float] = {1: 10.0, 2: 15.0, 3: 20.0} # Zone prices for this vehicle

class Settings(BaseModel):
    grouping_window_minutes: int = 20
    option_1_enabled: bool = True
    option_2_enabled: bool = True
    
    # Option 1: Forfait Mensuel (par zone)
    option_1_forfait_prices: dict[int, float] = {
        1: 45000.0,
        2: 55000.0,
        3: 65000.0
    }
    
    # Option 2: Prise en Charge (par ligne de bus)
    # Default price if line mapping not found
    option_2_default_pickup_price: float = 2500.0 
    option_2_line_prices: dict[str, float] = {
        "Ligne Indéfinie": 2500.0
    }

    option_2_pickup_price: float = 0.0 # Deprecated
    option_2_bus_price: float = 35000.0 # Price per 13-seater bus for Option 2 (Line mode) ~35k FCFA
    
    vehicle_types: List[VehicleType] = [
        # Berline: ~5k-10k depending on zone
        VehicleType(name="Berline", capacity=4, base_price=5000.0, zone_prices={1: 5000.0, 2: 7500.0, 3: 10000.0}),
        # Hiace: ~25k-45k depending on zone
        VehicleType(name="Hiace", capacity=13, base_price=25000.0, zone_prices={1: 25000.0, 2: 35000.0, 3: 45000.0})
    ]

import json
import os

SETTINGS_FILE = "data/settings.json"

def load_settings_file():
    if os.path.exists(SETTINGS_FILE):
        try:
            with open(SETTINGS_FILE, "r") as f:
                data = json.load(f)
                return Settings(**data)
        except:
            pass
    return Settings()

def save_settings_file(settings: Settings):
    os.makedirs(os.path.dirname(SETTINGS_FILE), exist_ok=True)
    with open(SETTINGS_FILE, "w") as f:
        json.dump(settings.dict(), f, indent=2)

@router.get("/", response_model=Settings)
async def get_settings():
    return load_settings_file()

@router.post("/", response_model=Settings)
async def update_settings(settings: Settings):
    if settings.grouping_window_minutes <= 0:
        raise HTTPException(status_code=400, detail="Grouping window must be positive")
    save_settings_file(settings)
    return settings
