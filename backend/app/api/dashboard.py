from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any
from app.api.settings import get_settings, Settings
from app.api.costs import calculate_costs
import pandas as pd
import io
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

class KPIResult(BaseModel):
    total_cost: float
    total_savings: float
    avg_occupancy: float
    total_employees: int
    total_vehicles: int

class ZoneAnalysis(BaseModel):
    zone_1_count: int
    zone_2_count: int
    zone_3_count: int
    zone_1_cost: float
    zone_2_cost: float
    zone_3_cost: float

@router.post("/kpi", response_model=KPIResult)
async def get_kpis(planning_data: List[Dict[str, Any]], settings: Settings = Depends(get_settings)):
    if not planning_data:
        return KPIResult(total_cost=0, total_savings=0, avg_occupancy=0, total_employees=0, total_vehicles=0)
    
    # Re-use cost calculation logic
    try:
        results = await calculate_costs(planning_data, settings, limit=None)
        
        # Calculate avg occupancy from details if possible, or approximate
        # For this MVP, we will use the Option 1 occupancy data if available or recalculate
        
        # Simple aggregated stats from the cost breakdown
        # Note: 'total_vehicles' is sum of vehicles in Option 1
        
        total_vehicles = int(sum(item['vehicles'] for item in results.details_option_1))
        total_employees = len(planning_data)
        
        capacity_sum = sum(item['capacity'] for item in results.details_option_1)
        avg_occ = (total_employees / capacity_sum * 100) if capacity_sum > 0 else 0
        
        return KPIResult(
            total_cost=results.option_1_total,
            total_savings=results.savings,
            avg_occupancy=round(avg_occ, 1),
            total_employees=total_employees,
            total_vehicles=total_vehicles
        )
    except Exception as e:
        print(f"Error calculating KPIs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/zones", response_model=ZoneAnalysis)
async def get_zone_analysis(planning_data: List[Dict[str, Any]], settings: Settings = Depends(get_settings)):
    if not planning_data:
        return ZoneAnalysis(zone_1_count=0, zone_2_count=0, zone_3_count=0, zone_1_cost=0, zone_2_cost=0, zone_3_cost=0)

    df = pd.DataFrame(planning_data)
    # Zone Parsing (matches costs.py logic)
    def parse_zone(val):
        try: return int(val)
        except:
            s = str(val).upper()
            if 'A' in s: return 1
            if 'B' in s: return 2
            if 'C' in s: return 3
            return 1
            
    df['Zone_Int'] = df['Zone'].apply(parse_zone)
    
    # Count per zone
    z1_count = len(df[df['Zone_Int'] == 1])
    z2_count = len(df[df['Zone_Int'] == 2])
    z3_count = len(df[df['Zone_Int'] == 3])
    
    # We will compute Option 1 breakdown by max_zone
    results = await calculate_costs(planning_data, settings)
    
    z1_cost = sum(item['cost'] for item in results.details_option_1 if item['max_zone'] == 1)
    z2_cost = sum(item['cost'] for item in results.details_option_1 if item['max_zone'] == 2)
    z3_cost = sum(item['cost'] for item in results.details_option_1 if item['max_zone'] == 3)

    return ZoneAnalysis(
        zone_1_count=z1_count,
        zone_2_count=z2_count,
        zone_3_count=z3_count,
        zone_1_cost=z1_cost,
        zone_2_cost=z2_cost,
        zone_3_cost=z3_cost
    )

@router.post("/export/{format}")
async def export_report(format: str, planning_data: List[Dict[str, Any]], settings: Settings = Depends(get_settings)):
    if not planning_data:
        raise HTTPException(status_code=400, detail="No data to export")
        
    results = await calculate_costs(planning_data, settings)
    
    if format == "excel":
        # Create Excel
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            # Sheet 1: Summary
            summary_data = [{'Option': 'Vehicle Forfait (Op 1)', 'Total Cost': results.option_1_total},
                            {'Option': 'Per Pickup (Op 2)', 'Total Cost': results.option_2_total},
                            {'Option': 'Savings', 'Total Cost': results.savings}]
            pd.DataFrame(summary_data).to_excel(writer, sheet_name='Summary', index=False)
            
            # Sheet 2: Detailed Plan (Option 1)
            pd.DataFrame(results.details_option_1).to_excel(writer, sheet_name='Details Op1', index=False)
            
        output.seek(0)
        return StreamingResponse(output, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', headers={"Content-Disposition": "attachment; filename=report.xlsx"})
        
    elif format == "pdf":
        output = io.BytesIO()
        doc = SimpleDocTemplate(output, pagesize=letter)
        elements = []
        styles = getSampleStyleSheet()
        
        elements.append(Paragraph("Transport Optimization Report", styles['Title']))
        elements.append(Spacer(1, 12))
        
        elements.append(Paragraph(f"Total Cost (Option 1): {results.option_1_total:,.0f} FCFA", styles['Normal']))
        elements.append(Paragraph(f"Total Cost (Option 2): {results.option_2_total:,.0f} FCFA", styles['Normal']))
        elements.append(Paragraph(f"Potential Savings: {results.savings:,.0f} FCFA", styles['Normal']))
        elements.append(Spacer(1, 24))
        
        # Table of Details
        data = [['Date', 'Time', 'Count', 'Zone', 'Cost']]
        for cx in results.details_option_1[:20]: # Limit to 20 for PDF preview
            data.append([str(cx['date']), str(cx['time']), str(cx['count']), str(cx['max_zone']), str(cx['cost'])])
            
        t = Table(data)
        t.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                               ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                               ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                               ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                               ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                               ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                               ('GRID', (0, 0), (-1, -1), 1, colors.black)]))
        elements.append(t)
        
        doc.build(elements)
        output.seek(0)
        return StreamingResponse(output, media_type='application/pdf', headers={"Content-Disposition": "attachment; filename=report.pdf"})
    
    else:
        raise HTTPException(status_code=400, detail="Unsupported format")
