from fastapi import FastAPI

app = FastAPI(title='Transport Cost Optimization API')

@app.get('/')
def read_root():
    return {'message': 'Welcome to the Transport Cost Optimization API'}
