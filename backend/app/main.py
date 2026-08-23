from fastapi import FastAPI
from app.routers import wallet, transaction, dataset, graph, ml_results

app = FastAPI(title="Bitcoin Forensics API")

app.include_router(wallet.router)
app.include_router(transaction.router)
app.include_router(dataset.router)
app.include_router(graph.router)
app.include_router(ml_results.router)

@app.get("/")
def root():
    return {"status": "Bitcoin Forensics API running"}