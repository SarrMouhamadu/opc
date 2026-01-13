from fastapi import FastAPI
from app.api import planning, settings

app = FastAPI(title='Transport Cost Optimization API')

app.include_router(planning.router)
app.include_router(settings.router)

@app.get('/')
def read_root():
    return {'message': 'Welcome to the Transport Cost Optimization API'}
