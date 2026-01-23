from fastapi import APIRouter, UploadFile, File, HTTPException
import pandas as pd
import io
import json
import os
from typing import List, Dict, Any
from datetime import datetime

router = APIRouter(prefix="/planning", tags=["Planning"])

REQUIRED_COLUMNS = ["Employee ID", "Date", "Time", "Pickup Point", "Dropoff Point", "Zone"]
REQUIRED_OP2_COLUMN = "Ligne_Bus_Option_2"
CURRENT_PLANNING_FILE = "data/current_planning.json"

@router.get("/current")
def get_current_planning():
    if not os.path.exists(CURRENT_PLANNING_FILE):
        return {"rows": [], "row_count": 0}
    try:
        with open(CURRENT_PLANNING_FILE, "r") as f:
            data = json.load(f)
            return {
                "rows": data,
                "row_count": len(data)
            }
    except:
        return {"rows": [], "row_count": 0}

@router.post("/upload")
async def upload_planning(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(('.xlsx', '.xls', '.csv')):
        raise HTTPException(status_code=400, detail="Format de fichier invalide. Veuillez utiliser des fichiers Excel (.xlsx, .xls) ou CSV (.csv).")
    
    COLUMN_MAPPING = {
        "Employee ID": ["employeeid", "employee_id", "matricule", "employe", "id", "employee", "nom", "name", "salarie", "agent", "personne", "id_salarie"],
        "Date": ["date", "jour", "day", "periode", "date_vire", "date_transport"],
        "Time": ["time", "heure", "horaire", "pickuptime", "heure_passage", "heure_depart", "depart", "h_depart", "heure_service", "h_service", "h_passage"],
        "Pickup Point": ["pickuppoint", "pickup_point", "origine", "point_depart", "pickup", "point_ramassage", "lieu_depart", "domicile", "lieu_prise", "zone_domicile", "point_de_ramassage", "depart_lieu"],
        "Dropoff Point": ["dropoffpoint", "dropoff_point", "destination", "point_arrivee", "dropoff", "point_depot", "lieu_arrivee", "lieu_depot_zone", "lieu_depot", "site", "zone_depot", "lieu_de_depot", "arrivee_lieu"],
        "Zone": ["zone", "secteur", "area", "zone_domicile", "zone_lieu_depot", "zone_max", "zone_geo", "zone_residence"]
    }

    try:
        content = await file.read()
        file_ext = file.filename.lower()
        
        if file_ext.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(io.BytesIO(content))
        elif file_ext.endswith('.csv'):
            # Try parsing with different separators and encodings
            try:
                # First attempt: semicolon separator (common in FR), utf-8
                df = pd.read_csv(io.BytesIO(content), sep=';')
                if len(df.columns) <= 1: # Fallback if semicolon didn't work well
                    df = pd.read_csv(io.BytesIO(content), sep=',')
            except UnicodeDecodeError:
                # Fallback to latin-1 for Excel-generated CSVs
                try:
                    df = pd.read_csv(io.BytesIO(content), sep=';', encoding='latin-1')
                    if len(df.columns) <= 1:
                        df = pd.read_csv(io.BytesIO(content), sep=',', encoding='latin-1')
                except:
                     raise HTTPException(status_code=400, detail="Erreur d'encodage CSV. Veuillez utiliser UTF-8 ou Latin-1.")
        else:
            raise HTTPException(status_code=400, detail="Type de fichier non supporté.")
        
        def normalize_text(text: str) -> str:
            import re
            import unicodedata
            text = str(text).lower().strip()
            text = "".join(c for c in unicodedata.normalize('NFD', text) if unicodedata.category(c) != 'Mn')
            text = re.sub(r'[\_\-\s]', '', text)
            return text

        file_headers_map = {normalize_text(col): col for col in df.columns}
        renamed_columns = {}
        
        for target_col, aliases in COLUMN_MAPPING.items():
            found = False
            target_norm = normalize_text(target_col)
            if target_norm in file_headers_map:
                renamed_columns[file_headers_map[target_norm]] = target_col
                found = True
            
            if not found:
                for alias in aliases:
                    alias_norm = normalize_text(alias)
                    if alias_norm in file_headers_map:
                        renamed_columns[file_headers_map[alias_norm]] = target_col
                        found = True
                        break

        df.rename(columns=renamed_columns, inplace=True)
        
        available_columns = [c for c in df.columns if c not in COLUMN_MAPPING.keys()]
        
        if "Pickup Point" not in df.columns:
            if available_columns:
                col = available_columns.pop(0)
                df["Pickup Point"] = df[col]
            else:
                df["Pickup Point"] = "Domicile par défaut"

        if "Dropoff Point" not in df.columns:
            if available_columns:
                col = available_columns.pop(0)
                df["Dropoff Point"] = df[col]
            else:
                df["Dropoff Point"] = "Site par défaut"

        if "Employee ID" not in df.columns:
            df["Employee ID"] = [f"Salarié {i+1}" for i in range(len(df))]
            
        if "Date" not in df.columns:
            df["Date"] = datetime.now().strftime("%Y-%m-%d")
            
        if "Time" not in df.columns:
            df["Time"] = "08:00"

        if "Zone" not in df.columns:
            df["Zone"] = "Zone A"

        if REQUIRED_OP2_COLUMN not in df.columns:
            df[REQUIRED_OP2_COLUMN] = "Ligne Indéfinie"
        
        df = df.fillna({
            "Employee ID": "Inconnu",
            "Time": "08:00",
            "Pickup Point": "Inconnu",
            "Dropoff Point": "Inconnu",
            "Zone": "Zone A"
        })

        # Save full data for persistence
        full_data = df.to_dict(orient="records")
        os.makedirs(os.path.dirname(CURRENT_PLANNING_FILE), exist_ok=True)
        with open(CURRENT_PLANNING_FILE, "w") as f:
            json.dump(full_data, f, indent=2)

        return {
            "filename": file.filename,
            "row_count": len(df),
            "preview": df.head(50).to_dict(orient="records"),
            "mapped_columns": renamed_columns 
        }
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Erreur d'importation : {str(e)}")
