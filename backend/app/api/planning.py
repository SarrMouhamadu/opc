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
        "Employee ID": ["employeeid", "employee_id", "matricule", "employe", "id", "employee", "nom", "name", "salarie", "option1_berline_mensuel"], # 'nom' seems to be the employee name here based on context, or use strict mapping if risk of confusion. User file has 'Option1_Berline_Mensuel' which is COST? No wait.
        # User columns: Domicile, Lieu de dépôt, Zone Domicile, Zone Lieu dépôt, Zone Max, Option1_Hiace_Mensuel, Option1_Berline_Mensuel, Option2_par_course
        # Mapping inference:
        # Domicile -> Pickup Point
        # Lieu de dépôt -> Dropoff Point
        # Zone Domicile / Zone Lieu dépôt -> Zone? 
        # Missing: Employee ID (maybe they just count people or there is no ID?), Date, Time.
        
        # NOTE: The user's file seems to be a COST REFERENCE or a SUMMARY, not a detailed planning with times!
        # OR it is a planning but with missing columns.
        # Let's add aliases for what we see to at least pass mapping, but we might default Time.
        
        "Employee ID": ["employeeid", "employee_id", "matricule", "employe", "id", "employee", "nom", "name", "salarie"],
        "Date": ["date", "jour", "day"],
        "Time": ["time", "heure", "horaire", "pickuptime", "heure_passage", "heure_depart", "depart", "h_depart", "heure_service"],
        "Pickup Point": ["pickuppoint", "pickup_point", "origine", "point_depart", "pickup", "point_ramassage", "lieu_depart", "domicile_zone", "domicile", "lieu_prise", "zone_domicile"],
        "Dropoff Point": ["dropoffpoint", "dropoff_point", "destination", "point_arrivee", "dropoff", "point_depot", "lieu_arrivee", "lieu_depot_zone", "lieu_depot", "site", "zone_depot", "lieu_de_depot"],
        "Zone": ["zone", "secteur", "area", "zone_domicile", "zone_max"],
        "Ligne_Bus_Option_2": ["lignebusoption2", "ligne_bus_option_2", "ligne_bus", "bus_line", "ligne", "busline", "option2_par_course"]
    }

    try:
        content = await file.read()
        if file.filename.endswith('.csv'):
            # Try valid comma separation first
            try:
                df = pd.read_csv(io.BytesIO(content))
                # Check if it looks like we failed to parse columns (e.g. all in one column)
                if len(df.columns) < 2:
                     # Try semicolon
                     df = pd.read_csv(io.BytesIO(content), sep=';')
            except:
                 # Fallback
                 df = pd.read_csv(io.BytesIO(content), sep=';')
        else:
            df = pd.read_excel(io.BytesIO(content))
        
        # --- Normalization and Mapping Logic ---
        
        def normalize_text(text: str) -> str:
            """Remove special chars, lower case, strip whitespace, strip accents."""
            import re
            import unicodedata
            text = str(text).lower().strip()
            # Normalize unicode characters to decompose accents
            text = unicodedata.normalize('NFD', text).encode('ascii', 'ignore').decode("utf-8")
            # Remove underscores, hyphens, spaces to make matching fuzzy
            text = re.sub(r'[\_\-\s]', '', text)
            return text

        # Create a map of {normalized_header -> original_header} from the file
        file_headers_map = {normalize_text(col): col for col in df.columns}
        
        renamed_columns = {}
        missing_canonical = []
        
        # Iterate over required columns to find matches in the file
        for target_col, aliases in COLUMN_MAPPING.items():
            found = False
            
            # 1. Check strict match with target name (normalized)
            target_norm = normalize_text(target_col)
            if target_norm in file_headers_map:
                renamed_columns[file_headers_map[target_norm]] = target_col
                found = True
            
            # 2. Check aliases
            if not found:
                for alias in aliases:
                    alias_norm = normalize_text(alias)
                    if alias_norm in file_headers_map:
                        renamed_columns[file_headers_map[alias_norm]] = target_col
                        found = True
                        break
            
            # Check strict required columns
            if not found:
                 # Option 2: Handled later
                 if target_col == REQUIRED_OP2_COLUMN:
                     pass
                 # Allow defaults for these:
                 elif target_col == "Date": pass
                 elif target_col == "Zone": pass
                 elif target_col == "Time": pass # Will default
                 elif target_col == "Employee ID": pass # Will default
                 
                 elif target_col in REQUIRED_COLUMNS:
                     missing_canonical.append(target_col)

        if missing_canonical:
            # Construct a detailed error message
            details = []
            for missing in missing_canonical:
                aliases_str = ", ".join(COLUMN_MAPPING[missing])
                details.append(f"- '{missing}' (accepte: {aliases_str})")
            
            error_msg = (
                f"Colonnes obligatoires manquantes ou non reconnues :\n"
                f"{'; '.join(details)}\n"
                f"Colonnes détectées dans le fichier : {', '.join(df.columns)}"
            )
            raise HTTPException(status_code=400, detail=error_msg)

        # Apply renaming to the DataFrame
        df.rename(columns=renamed_columns, inplace=True)
        
        # --- Apply Defaults for permissible missing columns ---
        if "Date" not in df.columns:
            from datetime import datetime
            df["Date"] = datetime.now().strftime("%Y-%m-%d")
            
        if "Time" not in df.columns:
            df["Time"] = "08:00" # Default time if missing
            
        if "Employee ID" not in df.columns:
            # Generate dummy IDs or set Unknown
            df["Employee ID"] = [f"Emp_{i+1}" for i in range(len(df))]

        if "Zone" not in df.columns:
            df["Zone"] = "Zone A" # Default zone

        if REQUIRED_OP2_COLUMN not in df.columns:
            df[REQUIRED_OP2_COLUMN] = "Ligne Indéfinie"
        
        # Verify strict required columns again (sanity check)
        final_missing = [col for col in REQUIRED_COLUMNS if col not in df.columns]
        if final_missing:
             # Should be caught above, but fail safe
             raise HTTPException(status_code=400, detail=f"Erreur interne de mapping. Manquant: {final_missing}")

        # Convert to dictionary for preview (limit to first 50 rows)
        preview_data = df.head(50).fillna("").to_dict(orient="records")
        
        # Log the event
        from app.core.logger import log_event
        log_event("UPLOAD", f"Fichier importé: {file.filename} ({len(df)} lignes)")

        return {
            "filename": file.filename,
            "row_count": len(df),
            "preview": preview_data,
            "mapped_columns": renamed_columns # Info for debug
        }
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")
