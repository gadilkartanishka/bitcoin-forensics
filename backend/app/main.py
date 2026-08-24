from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import wallet, transaction, dataset, graph, ml_results, alerts, statistics, graph_features, clusters
from app.database import engine, Base
from app import models

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Bitcoin Forensics API")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(wallet.router)
app.include_router(transaction.router)
app.include_router(dataset.router)
app.include_router(graph.router)
app.include_router(ml_results.router)
app.include_router(alerts.router)
app.include_router(statistics.router)
app.include_router(graph_features.router)
app.include_router(clusters.router)

@app.get("/")
def root():
    return {"status": "Bitcoin Forensics API running"}