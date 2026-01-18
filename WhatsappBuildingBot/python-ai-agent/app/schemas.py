"""
Pydantic models for API request/response schemas.
"""

from typing import Optional
from pydantic import BaseModel, Field


class ResidentInfo(BaseModel):
    """Resident information from the building."""
    name: str = Field(..., description="Resident's name")
    phone: str = Field(..., description="Resident's phone number")


class AnalyzeRequest(BaseModel):
    """Request payload for the /analyze endpoint."""
    building_id: str = Field(..., description="Unique identifier for the building")
    resident: ResidentInfo = Field(..., description="Resident information")
    message_text: str = Field(..., description="Raw message text from WhatsApp")
    media_urls: list[str] = Field(default_factory=list, description="List of media URLs attached to the message")


class ModelMetadata(BaseModel):
    """Metadata about the AI model used for analysis."""
    model: str = Field(..., description="Model name used for classification")
    latency_ms: int = Field(..., description="Processing latency in milliseconds")


class AnalyzeResponse(BaseModel):
    """Response payload from the /analyze endpoint."""
    ticket_type: str = Field(..., description="Classified ticket type in Hebrew")
    location: str = Field(..., description="Classified location in Hebrew")
    normalized_summary: str = Field(..., description="Polite, normalized Hebrew summary")
    original_text: str = Field(..., description="Original message text")
    language: str = Field(default="he", description="Detected language code")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Classification confidence score")
    model_metadata: ModelMetadata = Field(..., description="Model metadata")


class HealthResponse(BaseModel):
    """Response for health check endpoint."""
    status: str = Field(default="healthy")
    service: str = Field(default="python-ai-agent")
    version: str = Field(default="1.0.0")
