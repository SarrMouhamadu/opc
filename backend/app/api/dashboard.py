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
        results = await calculate_costs(planning_data, settings)
        
        # Calculate avg occupancy from details if possible, or approximate
        # For this MVP, we will use the Option 1 occupancy data if available or recalculate
        
        # Simple aggregated stats from the cost breakdown
        # Note: 'total_vehicles' is sum of vehicles in Option 1
        
        total_vehicles = sum(1 for _ in results.details_option_1) # 1 vehicle per group
        total_employees = len(planning_data)
        
        # Avg occupancy... we need the capacity of each vehicle used.
        # In details_option_1 we have 'count'. We don't have capacity explicitly there but can infer or re-compute.
        # Let's simple approximate: sum(count) / sum(capacity_used). 
        # Since we don't carry capacity in details_option_1 easily, let's skip strict occupancy here 
        # OR better: Assume Berline=4, Hiace=13 based on count
        
        capacity_sum = 0
        for item in results.details_option_1:
            cnt = item['count']
            if cnt <= 4: capacity_sum += 4 
            else: capacity_sum += 13 # Simplified
            
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
    
    # Count per zone
    z1 = df[df['Zone'] == 1]
    z2 = df[df['Zone'] == 2]
    z3 = df[df['Zone'] == 3]
    
    # Cost per zone (Option 2 approximation for per-person cost, or derived form Op 1)
    # The requirement is "Cost Analysis by Zone". 
    # Let's assume Option 1 (Vehicle) cost allocated to zone.
    # Actually, vehicles are mixed. A vehicle going to Zone 3 carries people from Zone 1 too potentially?
    # No, Zone is usually a destination or max distance.
    # Let's stick to the simpler metric: Option 2 (Per pickup) is easiest to attribute to zone.
    # OR: Option 1 cost grouped by "max_zone" of the vehicle.
    
    # We will compute Option 1 breakdown by max_zone
    results = await calculate_costs(planning_data, settings)
    
    z1_cost = sum(item['cost'] for item in results.details_option_1 if item['max_zone'] == 1)
    z2_cost = sum(item['cost'] for item in results.details_option_1 if item['max_zone'] == 2)
    z3_cost = sum(item['cost'] for item in results.details_option_1 if item['max_zone'] == 3)

    return ZoneAnalysis(
        zone_1_count=len(z1),
        zone_2_count=len(z2),
        zone_3_count=len(z3),
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
