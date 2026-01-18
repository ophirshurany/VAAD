"""
Configuration management for the Python AI Agent service.
"""

from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Gemini API
    gemini_api_key: str = ""
    
    # Server
    host: str = "0.0.0.0"
    port: int = 8001
    log_level: str = "INFO"
    
    # Environment
    environment: str = "development"
    
    class Config:
        env_file = "../.env"  # Read from parent directory
        env_file_encoding = "utf-8"
        case_sensitive = False


# Hebrew ticket types for classification
TICKET_TYPES = [
    "מעלית",
    "גינה",
    "בינוי",
    "תאורה",
    "הדברה",
    "כיבוי אש",
    "אינטרקום",
    "חשמל",
    "חניה",
    "אינסטלציה",
    "ניקיון",
    "אחר"
]

# Hebrew locations for classification
LOCATIONS = [
    "לובי",
    "חניון",
    "גינה",
    "מעלית",
    "חדר אשפה",
    "גג",
    "חדר עגלות",
    "חדר מחסנים",
    "קרקע",
    "קומה 1",
    "קומה 2",
    "קומה 3",
    "קומה 4",
    "קומה 5",
    "קומה 6",
    "קומה 7",
    "קומה 8",
    "קומה 9",
    "קומה 10",
    "קומה 11",
    "קומה 12",
    "קומה 13",
    "קומה 14",
    "אחר"
]


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
