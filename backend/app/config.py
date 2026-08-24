import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_DB_PATH = BASE_DIR / "forensics.db"

class Settings:
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_DB_PATH}")
    GEOIP_DB_PATH: str = os.getenv("GEOIP_DB_PATH", str(BASE_DIR / "data" / "GeoLite2-City.mmdb"))
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", str(BASE_DIR / "data" / "uploads"))

settings = Settings()