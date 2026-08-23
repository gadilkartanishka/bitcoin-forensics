from fastapi import FastAPI
from app.routers import wallet, transaction
from app.routers import wallet, transaction, dataset

app.include_router(wallet.router)
app.include_router(transaction.router)
app.include_router(dataset.router)
app = FastAPI(title="Bitcoin Forensics API")

app.include_router(wallet.router)
app.include_router(transaction.router)

@app.get("/")
def root():
    return {"status": "Bitcoin Forensics API running"}