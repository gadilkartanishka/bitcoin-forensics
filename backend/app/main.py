from fastapi import FastAPI
from app.routers import wallet, transaction

app = FastAPI(title="Bitcoin Forensics API")

app.include_router(wallet.router)
app.include_router(transaction.router)

@app.get("/")
def root():
    return {"status": "Bitcoin Forensics API running"}