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
    option_2_pickup_price: float = 5.0 # Deprecated/Secondary pricing
    option_2_bus_price: float = 25.0 # Price per 13-seater bus for Option 2 (Line mode)
    vehicle_types: List[VehicleType] = [
        VehicleType(name="Berline", capacity=4, base_price=10.0, zone_prices={1: 10.0, 2: 15.0, 3: 20.0}),
        VehicleType(name="Hiace", capacity=13, base_price=25.0, zone_prices={1: 25.0, 2: 35.0, 3: 45.0})
    ]

# In-memory storage for demonstration (should be persistent in a real SaaS)
current_settings = Settings()

@router.get("/", response_model=Settings)
async def get_settings():
    return current_settings

@router.post("/", response_model=Settings)
async def update_settings(settings: Settings):
    global current_settings
    if settings.grouping_window_minutes <= 0:
        raise HTTPException(status_code=400, detail="Grouping window must be positive")
    current_settings = settings
    return current_settings
