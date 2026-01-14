from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import planning, settings, costs, optimization, dashboard, history, auth, logs

from app.core.config import settings as config_settings

app = FastAPI(
    title='Transport Cost Optimization API',
    debug=config_settings.DEBUG,
    docs_url="/docs" if config_settings.DEBUG else None,
    redoc_url="/redoc" if config_settings.DEBUG else None,
    openapi_url="/openapi.json" if config_settings.DEBUG else None
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:4200",
        "http://localhost:8080",
        "http://51.255.60.133:8080",
        "http://51.255.60.133"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(planning.router)
app.include_router(settings.router)
app.include_router(costs.router)
app.include_router(optimization.router)
app.include_router(dashboard.router)
app.include_router(history.router)
app.include_router(logs.router)

@app.get('/')
def read_root():
    return {'message': 'Welcome to the Transport Cost Optimization API'}
