from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import json
import os
from datetime import datetime

router = APIRouter(prefix="/history", tags=["History"])

DATA_FILE = "data/history.json"

class HistoryEntry(BaseModel):
    id: Optional[str] = None
    date: str  # ISO format date of archive
    total_cost: float
    savings: float
    total_vehicles: int
    total_employees: int
    data_snapshot: Dict[str, Any] # simplified snapshot or metadata

class ArchiveRequest(BaseModel):
    total_cost: float
    savings: float
    total_vehicles: int
    total_employees: int
    planning_summary: Dict[str, Any] # e.g. { "date": "2023-10-27", "count": 120 }

def load_history():
    if not os.path.exists(DATA_FILE):
        return []
    try:
        with open(DATA_FILE, "r") as f:
            return json.load(f)
    except:
        return []

def save_history(history):
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    with open(DATA_FILE, "w") as f:
        json.dump(history, f, indent=2)

@router.get("/", response_model=List[HistoryEntry])
def get_history():
    data = load_history()
    # Sort by date desc
    data.sort(key=lambda x: x['date'], reverse=True)
    return data

@router.post("/")
def archive_report(request: ArchiveRequest):
    try:
        # Ensure directory exists before loading or saving
        os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
        
        history = load_history()
        
        # Rigorous ID generation
        timestamp = int(datetime.now().timestamp())
        new_entry = {
            "id": f"arch_{timestamp}_{len(history)}",
            "date": datetime.now().isoformat(),
            "total_cost": request.total_cost,
            "savings": request.savings,
            "total_vehicles": request.total_vehicles,
            "total_employees": request.total_employees,
            "data_snapshot": request.planning_summary
        }
        
        history.append(new_entry)
        
        # Save and verify
        save_history(history)
        
        return {"message": "Rapport archivé avec succès", "id": new_entry["id"]}
    except Exception as e:
        import traceback
        print(f"CRITICAL ERROR in archive_report: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Échec de l'archivage : {str(e)}")

@router.get("/stats")
def get_stats():
    history = load_history()
    # Aggregate by month (simple version)
    # Return { "Nov 2023": 1200, "Dec 2023": 1100 }
    stats = {}
    for entry in history:
        dt = datetime.fromisoformat(entry['date'])
        month_key = dt.strftime("%b %Y")
        if month_key not in stats:
            stats[month_key] = 0
        stats[month_key] += entry['total_cost']
        
    return stats
