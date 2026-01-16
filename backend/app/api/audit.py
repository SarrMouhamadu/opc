from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import json
import os

router = APIRouter(prefix="/audit", tags=["Audit"])

AUDIT_FILE = "data/audit_log.json"

class AuditEntry(BaseModel):
    timestamp: str
    event: str
    details: Optional[str] = None
    user: str = "admin"

def log_event(event: str, details: Optional[str] = None):
    os.makedirs("data", exist_ok=True)
    logs = []
    if os.path.exists(AUDIT_FILE):
        try:
            with open(AUDIT_FILE, "r") as f:
                logs = json.load(f)
        except:
            logs = []
    
    new_log = {
        "timestamp": datetime.now().isoformat(),
        "event": event,
        "details": details,
        "user": "admin"
    }
    logs.append(new_log)
    
    # Keep only last 200 logs
    logs = logs[-200:]
    
    with open(AUDIT_FILE, "w") as f:
        json.dump(logs, f, indent=2)

@router.get("/", response_model=List[AuditEntry])
def get_audit_logs():
    if not os.path.exists(AUDIT_FILE):
        return []
    try:
        with open(AUDIT_FILE, "r") as f:
            logs = json.load(f)
            logs.reverse() # Newest first
            return logs
    except:
        return []
