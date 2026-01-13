from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List

router = APIRouter(prefix="/settings", tags=["Settings"])

class VehicleType(BaseModel):
    name: str
    capacity: int
    base_price: float

class Settings(BaseModel):
    grouping_window_minutes: int = 20
    vehicle_types: List[VehicleType] = [
        VehicleType(name="Berline", capacity=4, base_price=10.0),
        VehicleType(name="Hiace", capacity=13, base_price=25.0)
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
