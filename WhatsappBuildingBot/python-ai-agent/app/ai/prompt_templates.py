"""
Prompt templates for Hebrew building ticket classification.
"""

from app.config import TICKET_TYPES, LOCATIONS


def get_classification_prompt(message_text: str, building_id: str | None = None) -> str:
    """
    Generate the classification prompt for the LLM.
    
    Args:
        message_text: The raw Hebrew message from the resident
        building_id: Optional building identifier for context
        
    Returns:
        Formatted prompt string for the LLM
    """
    ticket_types_str = ", ".join(TICKET_TYPES)
    locations_str = ", ".join(LOCATIONS)
    
    prompt = f"""אתה עוזר AI למערכת קריאות שירות בבניין מגורים.
קיבלת הודעת WhatsApp בעברית מדייר בבניין לגבי בעיה בבניין.

המשימות שלך:
1. לסווג את סוג הבעיה לאחת מהקטגוריות הבאות: [{ticket_types_str}]
2. לסווג את המיקום לאחד מהמיקומים הבאים: [{locations_str}]
3. לכתוב סיכום מנומס ותמציתי בעברית המתאים לקריאת שירות (עד 20 מילים)
4. להעריך את רמת הביטחון שלך בסיווג (מספר בין 0 ל-1)

הודעת הדייר:
"{message_text}"

החזר תשובה אך ורק בפורמט JSON הבא, ללא טקסט נוסף:
{{
    "ticket_type": "סוג הקריאה מהרשימה",
    "location": "המיקום מהרשימה",
    "normalized_summary": "סיכום מנומס ותמציתי בעברית",
    "confidence": 0.0
}}

חשוב:
- אם לא ניתן לזהות את סוג הבעיה, השתמש ב"אחר"
- אם לא ניתן לזהות את המיקום, השתמש ב"אחר"
- הסיכום צריך להיות מנומס ומקצועי
- אל תציין את שם הדייר בסיכום"""

    return prompt


SYSTEM_PROMPT = """אתה עוזר AI מקצועי למערכת ניהול קריאות שירות בבניין מגורים.
התפקיד שלך הוא לקרוא הודעות WhatsApp בעברית מדיירים ולסווג אותן לקריאות שירות מובנות.
אתה מחזיר תמיד תשובות בפורמט JSON בלבד, ללא הסברים נוספים.
הסיכומים שאתה כותב הם מנומסים, תמציתיים ומקצועיים."""
