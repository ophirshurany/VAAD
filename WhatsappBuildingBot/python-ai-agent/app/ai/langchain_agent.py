"""
LangChain agent for Hebrew building ticket classification using Google Gemini.
"""

import json
import time
import logging
from typing import Any

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage

from app.config import get_settings, TICKET_TYPES, LOCATIONS
from app.ai.prompt_templates import get_classification_prompt, SYSTEM_PROMPT
from app.schemas import AnalyzeResponse, ModelMetadata


logger = logging.getLogger(__name__)


class TicketClassifier:
    """
    LangChain-based ticket classifier using Google Gemini.
    """
    
    def __init__(self):
        """Initialize the classifier with Gemini model."""
        settings = get_settings()
        self.model_name = "gemini-1.5-flash"
        
        self.llm = ChatGoogleGenerativeAI(
            model=self.model_name,
            google_api_key=settings.gemini_api_key,
            temperature=0.1,  # Low temperature for consistent classification
            convert_system_message_to_human=True
        )
    
    async def classify(
        self, 
        message_text: str, 
        building_id: str | None = None
    ) -> AnalyzeResponse:
        """
        Classify a Hebrew message into a structured ticket.
        
        Args:
            message_text: The raw Hebrew message from the resident
            building_id: Optional building identifier
            
        Returns:
            AnalyzeResponse with classification results
        """
        start_time = time.time()
        
        try:
            # Build messages
            prompt = get_classification_prompt(message_text, building_id)
            messages = [
                SystemMessage(content=SYSTEM_PROMPT),
                HumanMessage(content=prompt)
            ]
            
            # Invoke the model
            response = await self.llm.ainvoke(messages)
            
            # Parse JSON response
            result = self._parse_response(response.content, message_text)
            
            # Calculate latency
            latency_ms = int((time.time() - start_time) * 1000)
            
            return AnalyzeResponse(
                ticket_type=result["ticket_type"],
                location=result["location"],
                normalized_summary=result["normalized_summary"],
                original_text=message_text,
                language="he",
                confidence=result["confidence"],
                model_metadata=ModelMetadata(
                    model=self.model_name,
                    latency_ms=latency_ms
                )
            )
            
        except Exception as e:
            logger.error(f"Classification error: {e}")
            latency_ms = int((time.time() - start_time) * 1000)
            
            # Return fallback response
            return AnalyzeResponse(
                ticket_type="אחר",
                location="אחר",
                normalized_summary=message_text[:50] + ("..." if len(message_text) > 50 else ""),
                original_text=message_text,
                language="he",
                confidence=0.0,
                model_metadata=ModelMetadata(
                    model=self.model_name,
                    latency_ms=latency_ms
                )
            )
    
    def _parse_response(self, content: str, original_text: str) -> dict[str, Any]:
        """
        Parse the LLM response and validate the classification.
        
        Args:
            content: Raw LLM response content
            original_text: Original message for fallback
            
        Returns:
            Parsed dictionary with classification fields
        """
        # Clean up potential markdown code blocks
        cleaned = content.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()
        
        try:
            result = json.loads(cleaned)
        except json.JSONDecodeError:
            logger.warning(f"Failed to parse LLM response as JSON: {content}")
            return {
                "ticket_type": "אחר",
                "location": "אחר",
                "normalized_summary": original_text[:50],
                "confidence": 0.0
            }
        
        # Validate and normalize ticket_type
        ticket_type = result.get("ticket_type", "אחר")
        if ticket_type not in TICKET_TYPES:
            logger.warning(f"Unknown ticket_type: {ticket_type}, defaulting to 'אחר'")
            ticket_type = "אחר"
        
        # Validate and normalize location
        location = result.get("location", "אחר")
        if location not in LOCATIONS:
            logger.warning(f"Unknown location: {location}, defaulting to 'אחר'")
            location = "אחר"
        
        # Validate confidence
        confidence = result.get("confidence", 0.5)
        if not isinstance(confidence, (int, float)):
            confidence = 0.5
        confidence = max(0.0, min(1.0, float(confidence)))
        
        return {
            "ticket_type": ticket_type,
            "location": location,
            "normalized_summary": result.get("normalized_summary", original_text[:50]),
            "confidence": round(confidence, 2)
        }


# Singleton instance
_classifier: TicketClassifier | None = None


def get_classifier() -> TicketClassifier:
    """Get or create the classifier singleton."""
    global _classifier
    if _classifier is None:
        _classifier = TicketClassifier()
    return _classifier
