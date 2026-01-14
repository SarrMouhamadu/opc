
import json
import os
from datetime import datetime
from typing import Dict, Any

LOG_FILE = "data/activity_log.json"

def log_event(action: str, details: str, user: str = "Admin"):
    """
    Logs an event to the activity_log.json file.
    """
    os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)
    
    entry = {
        "timestamp": datetime.now().isoformat(),
        "action": action,
        "details": details,
        "user": user
    }
    
    logs = []
    if os.path.exists(LOG_FILE):
        try:
            with open(LOG_FILE, "r") as f:
                logs = json.load(f)
        except:
            logs = []
    
    logs.append(entry)
    
    # Optional: Keep log size manageable (e.g. last 1000 entries)
    if len(logs) > 1000:
        logs = logs[-1000:]
        
    with open(LOG_FILE, "w") as f:
        json.dump(logs, f, indent=2)

def get_logs():
    """Returns the list of logs sorted by most recent first."""
    if not os.path.exists(LOG_FILE):
        return []
    try:
        with open(LOG_FILE, "r") as f:
            data = json.load(f)
            data.sort(key=lambda x: x['timestamp'], reverse=True)
            return data
    except:
        return []
