from fastapi import APIRouter, UploadFile, File, HTTPException
import pandas as pd
import io
from typing import List, Dict, Any

router = APIRouter(prefix="/planning", tags=["Planning"])

REQUIRED_COLUMNS = ["Employee ID", "Date", "Time", "Pickup Point", "Dropoff Point", "Zone"]

@router.post("/upload")
async def upload_planning(file: UploadFile = File(...)):
    if not file.filename.endswith(('.csv', '.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload a CSV or Excel file.")
    
    try:
        content = await file.read()
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(content))
        else:
            df = pd.read_excel(io.BytesIO(content))
        
        # Check for missing columns
        missing_columns = [col for col in REQUIRED_COLUMNS if col not in df.columns]
        if missing_columns:
            raise HTTPException(
                status_code=400, 
                detail=f"Missing required columns: {', '.join(missing_columns)}"
            )
        
        # Convert to dictionary for preview (limit to first 50 rows)
        preview_data = df.head(50).fillna("").to_dict(orient="records")
        
        return {
            "filename": file.filename,
            "row_count": len(df),
            "preview": preview_data
        }
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")
