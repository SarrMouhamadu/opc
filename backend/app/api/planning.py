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
    if not file.filename.endswith(('.csv', '.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload a CSV or Excel file.")
    
    
    # Canonical Mapping (Target Name -> List of acceptable aliases)
    # Canonical Mapping (Target Name -> List of acceptable aliases)
    COLUMN_MAPPING = {
        "Employee ID": ["employeeid", "employee_id", "matricule", "employe", "id", "employee", "nom", "name", "salarie", "agent", "salarie", "personne"],
        "Date": ["date", "jour", "day", "periode"],
        "Time": ["time", "heure", "horaire", "pickuptime", "heure_passage", "heure_depart", "depart", "h_depart", "heure_service", "h_service", "h_passage"],
        "Pickup Point": ["pickuppoint", "pickup_point", "origine", "point_depart", "pickup", "point_ramassage", "lieu_depart", "domicile", "lieu_prise", "zone_domicile", "point_de_ramassage"],
        "Dropoff Point": ["dropoffpoint", "dropoff_point", "destination", "point_arrivee", "dropoff", "point_depot", "lieu_arrivee", "lieu_depot_zone", "lieu_depot", "site", "zone_depot", "lieu_de_depot"],
        "Zone": ["zone", "secteur", "area", "zone_domicile", "zone_lieu_depot", "zone_max", "zone_geo"],
        "Ligne_Bus_Option_2": ["lignebusoption2", "ligne_bus_option_2", "ligne_bus", "bus_line", "ligne", "busline"]
    }

    try:
        content = await file.read()
        if file.filename.endswith('.csv'):
            # Try valid comma separation first
            try:
                df = pd.read_csv(io.BytesIO(content))
                if len(df.columns) < 2:
                     df = pd.read_csv(io.BytesIO(content), sep=';')
            except:
                 df = pd.read_csv(io.BytesIO(content), sep=';')
        else:
            df = pd.read_excel(io.BytesIO(content))
        
        # --- Normalization and Mapping Logic ---
        def normalize_text(text: str) -> str:
            import re
            import unicodedata
            # Standardize and lower
            text = str(text).lower().strip()
            # Remove accents
            text = "".join(c for c in unicodedata.normalize('NFD', text) if unicodedata.category(c) != 'Mn')
            # Remove underscores, hyphens, spaces
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

        # Apply renaming
        df.rename(columns=renamed_columns, inplace=True)
        
        # --- Strict Requirements Check ---
        # We absolutely need at least Pickup and Dropoff points to do anything.
        critical_missing = []
        if "Pickup Point" not in df.columns: critical_missing.append("Point de départ (ex: Domicile, Origine)")
        if "Dropoff Point" not in df.columns: critical_missing.append("Point d'arrivée (ex: Site, Lieu de dépôt)")

        if critical_missing:
            error_msg = (
                f"Colonnes critiques manquantes : {', '.join(critical_missing)}. "
                f"Détecté : {', '.join(df.columns)}"
            )
            raise HTTPException(status_code=400, detail=error_msg)

        # --- Intelligent Defaults for optional columns ---
        if "Employee ID" not in df.columns:
            # Generate dummy IDs if missing
            df["Employee ID"] = [f"Salarié {i+1}" for i in range(len(df))]
            
        if "Date" not in df.columns:
            from datetime import datetime
            df["Date"] = datetime.now().strftime("%Y-%m-%d")
            
        if "Time" not in df.columns:
            # Default to 08:00 if no time is provided
            df["Time"] = "08:00"

        if "Zone" not in df.columns:
             # Default to Zone A (1)
            df["Zone"] = "Zone A"

        if REQUIRED_OP2_COLUMN not in df.columns:
            df[REQUIRED_OP2_COLUMN] = "Ligne Indéfinie"
        
        # Final Clean-up: Fill NaNs
        df = df.fillna({
            "Employee ID": "Inconnu",
            "Time": "08:00",
            "Pickup Point": "Inconnu",
            "Dropoff Point": "Inconnu",
            "Zone": "Zone A"
        })

        preview_data = df.head(50).to_dict(orient="records")
        
        return {
            "filename": file.filename,
            "row_count": len(df),
            "preview": preview_data,
            "mapped_columns": renamed_columns 
        }
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Erreur d'importation : {str(e)}")
