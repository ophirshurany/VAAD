"""
FastAPI application for the Python AI Agent service.
Provides /analyze endpoint for Hebrew building ticket classification.
"""

import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.schemas import AnalyzeRequest, AnalyzeResponse, HealthResponse
from app.ai.langchain_agent import get_classifier


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    logger.info("Python AI Agent service starting up...")
    settings = get_settings()
    logger.info(f"Environment: {settings.environment}")
    
    # Pre-initialize the classifier
    _ = get_classifier()
    logger.info("TicketClassifier initialized")
    
    yield
    
    # Shutdown
    logger.info("Python AI Agent service shutting down...")


# Create FastAPI app
app = FastAPI(
    title="Python AI Agent Service",
    description="AI-powered Hebrew building ticket classification using LangChain and Gemini",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests."""
    start_time = time.time()
    
    # Log request (without sensitive data)
    logger.info(f"Request: {request.method} {request.url.path}")
    
    response = await call_next(request)
    
    # Log response
    process_time = (time.time() - start_time) * 1000
    logger.info(f"Response: {response.status_code} - {process_time:.2f}ms")
    
    return response


@app.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """
    Health check endpoint.
    
    Returns:
        HealthResponse with service status
    """
    return HealthResponse()


@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_message(request: AnalyzeRequest) -> AnalyzeResponse:
    """
    Analyze a Hebrew WhatsApp message and classify it into a structured ticket.
    
    Args:
        request: AnalyzeRequest containing building_id, resident info, and message
        
    Returns:
        AnalyzeResponse with classified ticket_type, location, and normalized summary
    """
    logger.info(f"Analyzing message for building: {request.building_id}")
    logger.info(f"Resident: {request.resident.name} ({request.resident.phone})")
    logger.info(f"Message length: {len(request.message_text)} chars")
    
    # Get classifier and process
    classifier = get_classifier()
    result = await classifier.classify(
        message_text=request.message_text,
        building_id=request.building_id
    )
    
    logger.info(f"Classification result: type={result.ticket_type}, location={result.location}, confidence={result.confidence}")
    
    return result


if __name__ == "__main__":
    import uvicorn
    
    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.environment == "development"
    )
