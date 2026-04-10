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
    question_id: Optional[str] = None
    category: Optional[str] = None
    is_correct: bool = False
    is_follow_up: bool = False
    follow_up_answers: Optional[str] = None
    metadata: Optional[InteractionMetadata] = None

class Distractor(BaseModel):
    option: str
    mapped_misconception_id: str

class MCQ(BaseModel):
    question: str
    correct_answer: str
    distractors: List[Distractor]

class AnalyzeResponse(BaseModel):
    needs_verification: bool = False
    follow_up_questions: Optional[List[dict]] = None
    feedback: Optional[str] = None
    mcq: Optional[dict] = None
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

class QuestionModel(BaseModel):
    id: str
    category: str
    content: str
    options: Optional[List[str]] = None

class DashboardStatsResponse(BaseModel):
    total_questions_answered: int
    active_misconceptions: int
    resolved_misconceptions: int
    most_struggled_category: str

class HistoryItemModel(BaseModel):
    log_id: str
    question_id: Optional[str]
    category: Optional[str]
    user_query: str
    agent_response: str
    is_resolved: bool
    predicted_misconception: Optional[str]
    created_at: str

class HistoryResponse(BaseModel):
    history: List[HistoryItemModel]

class ConceptRequest(BaseModel):
    question_content: str

class WeakConceptRequest(BaseModel):
    student_id: str
    concepts: List[str]
