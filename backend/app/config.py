import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://user:pass@localhost:5432/forensics")
    GEOIP_DB_PATH: str = os.getenv("GEOIP_DB_PATH", "./data/GeoLite2-City.mmdb")  # offline geoip
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./data/uploads")

settings = Settings()