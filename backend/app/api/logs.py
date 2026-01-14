from fastapi import APIRouter
from app.core.logger import get_logs

router = APIRouter(prefix="/logs", tags=["Logs"])

@router.get("/")
def read_logs():
    return get_logs()
