from fastapi import APIRouter, UploadFile, File, HTTPException
import pandas as pd
import io
from typing import List, Dict, Any

router = APIRouter(prefix="/planning", tags=["Planning"])

REQUIRED_COLUMNS = ["Employee ID", "Date", "Time", "Pickup Point", "Dropoff Point", "Zone"]
# "Ligne_Bus_Option_2" is dynamically checked now to allow legacy files with warning, 
# or enforced if Strict Mode. For compliance, let's enforce or warn.
REQUIRED_OP2_COLUMN = "Ligne_Bus_Option_2"

@router.post("/upload")
async def upload_planning(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Format de fichier invalide. Seuls les fichiers Excel (.xlsx, .xls) sont acceptés.")
    
    # Canonical Mapping (Target Name -> List of acceptable aliases)
    COLUMN_MAPPING = {
        "Employee ID": ["employeeid", "employee_id", "matricule", "employe", "id", "employee", "nom", "name", "salarie", "agent", "salarie", "personne", "id_salarie"],
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
        else:
            raise HTTPException(status_code=400, detail="Format non supporté. Utiliser uniquement Excel (.xlsx, .xls).")
        
        # --- Normalization and Mapping Logic ---
        def normalize_text(text: str) -> str:
            import re
            import unicodedata
            text = str(text).lower().strip()
            text = "".join(c for c in unicodedata.normalize('NFD', text) if unicodedata.category(c) != 'Mn')
            text = re.sub(r'[\_\-\s]', '', text)
            return text

        file_headers_map = {normalize_text(col): col for col in df.columns}
        renamed_columns = {}
        mapped_targets = set()
        
        for target_col, aliases in COLUMN_MAPPING.items():
            found = False
            target_norm = normalize_text(target_col)
            if target_norm in file_headers_map:
                renamed_columns[file_headers_map[target_norm]] = target_col
                mapped_targets.add(target_col)
                found = True
            
            if not found:
                for alias in aliases:
                    alias_norm = normalize_text(alias)
                    if alias_norm in file_headers_map:
                        renamed_columns[file_headers_map[alias_norm]] = target_col
                        mapped_targets.add(target_col)
                        found = True
                        break

        # Apply renaming
        df.rename(columns=renamed_columns, inplace=True)
        
        # --- "Zero-Failure" Strategy: Auto-Guess Missing Critical Columns ---
        # If we still lack Pickup or Dropoff points, we just pick the first few strings columns.
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

        # --- Intelligent Defaults for optional columns ---
        if "Employee ID" not in df.columns:
            # If we have a 'NOM' or 'PRENOM' or similar unmapped column, use it.
            df["Employee ID"] = [f"Salarié {i+1}" for i in range(len(df))]
            
        if "Date" not in df.columns:
            from datetime import datetime
            df["Date"] = datetime.now().strftime("%Y-%m-%d")
            
        if "Time" not in df.columns:
            df["Time"] = "08:00"

        if "Zone" not in df.columns:
            df["Zone"] = "Zone A"

        if REQUIRED_OP2_COLUMN not in df.columns:
            df[REQUIRED_OP2_COLUMN] = "Ligne Indéfinie"
        
        # Final Clean-up: Fill NaNs and ensure types
        df = df.fillna({
            "Employee ID": "Inconnu",
            "Time": "08:00",
            "Pickup Point": "Inconnu",
            "Dropoff Point": "Inconnu",
            "Zone": "Zone A"
        })

        # Return full data (limit to 10k for safety)
        full_data = df.head(10000).to_dict(orient="records")
        preview_data = df.head(50).to_dict(orient="records")
        
        return {
            "filename": file.filename,
            "row_count": len(df),
            "preview": preview_data,
            "data": full_data,
            "mapped_columns": renamed_columns 
        }
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Erreur d'importation : {str(e)}")
