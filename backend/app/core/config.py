from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    PROJECT_NAME: str = "GIS Kebencanaan Sumatera Barat"
    API_V1_STR: str = "/api"
    
    # PostgreSQL & PostGIS
    POSTGRES_SERVER: str = Field(default="127.0.0.1", alias="DB_HOST")
    POSTGRES_PORT: int = Field(default=5432, alias="DB_PORT")
    POSTGRES_USER: str = Field(default="postgres", alias="DB_USER")
    POSTGRES_PASSWORD: str = Field(default="postgres123", alias="DB_PASSWORD")
    POSTGRES_DB: str = Field(default="gis_sumbar", alias="DB_NAME")

    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

    # JWT & Auth
    JWT_SECRET_KEY: str = Field(default="gis_sumbar_lppm_secret_key_super_secure_2026_x89f_min32bytes!", alias="JWT_SECRET")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 # 24 jam untuk kemudahan demo
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Routing Services (OSRM & Valhalla)
    OSRM_URL: str = Field(default="http://127.0.0.1:5000", alias="OSRM_URL")
    OSRM_FALLBACK_URL: str = "https://router.project-osrm.org"
    VALHALLA_URL: str = Field(default="http://127.0.0.1:8002", alias="VALHALLA_URL")

    # BMKG Real-Time Endpoints
    BMKG_AUTOGEMPA_URL: str = "https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json"
    BMKG_GEMPATERKINI_URL: str = "https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json"

    @property
    def sync_database_url(self) -> str:
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    @property
    def async_database_url(self) -> str:
        return f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()

