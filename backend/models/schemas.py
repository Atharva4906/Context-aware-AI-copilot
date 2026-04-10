from pydantic import BaseModel
from typing import List, Optional

class InteractionMetadata(BaseModel):
    time_taken_seconds: Optional[int] = 0
    switch_count: Optional[int] = 0
    backspace_count: Optional[int] = 0

class AnalyzeRequest(BaseModel):
    student_id: str
    user_query: str
    current_context: str
    metadata: Optional[InteractionMetadata] = None

class Distractor(BaseModel):
    option: str
    mapped_misconception_id: str

class MCQ(BaseModel):
    question: str
    correct_answer: str
    distractors: List[Distractor]

class AnalyzeResponse(BaseModel):
    feedback: str
    mcq: MCQ
    # Debug/Diagnostic data below (optional, but good for UI transparency)
    predicted_topic: Optional[str] = None
    pattern_hash: Optional[str] = None

class RLFeedbackRequest(BaseModel):
    student_id: str
    pattern_hash: str
    suggested_topic: str
    student_feedback: bool
    
class RLFeedbackResponse(BaseModel):
    status: str
    new_confidence_score: float
