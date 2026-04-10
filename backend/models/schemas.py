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
    correct_answer: Optional[str] = None

class ParsedQuestion(BaseModel):
    category: str
    content: str
    options: Optional[List[str]] = None
    correct_answer: Optional[str] = None

class ParseQuestionRequest(BaseModel):
    raw_text: str
    category: str

class ParseQuestionResponse(BaseModel):
    parsed: ParsedQuestion

class CreateQuestionRequest(ParsedQuestion):
    pass

class CreateQuestionResponse(ParsedQuestion):
    id: str

class AnswerDetectRequest(BaseModel):
    question_content: str
    options: List[str]

class AnswerDetectResponse(BaseModel):
    correct_answer: str
    correct_index: int

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

class MisconceptionReviewItem(BaseModel):
    review_id: str
    status: str
    similarity_score: Optional[float] = None
    source_question_id: Optional[str] = None
    source_student_id: Optional[str] = None
    created_at: str
    misconception_id: Optional[str] = None
    topic: Optional[str] = None
    flawed_logic_description: Optional[str] = None
    remedial_strategy: Optional[str] = None

class MisconceptionReviewResponse(BaseModel):
    items: List[MisconceptionReviewItem]

class GraphReviewItem(BaseModel):
    review_id: str
    prerequisite_topic: str
    dependent_topic: str
    status: str
    source_misconception_id: Optional[str] = None
    created_at: str

class GraphReviewResponse(BaseModel):
    items: List[GraphReviewItem]

class GraphReviewCreateRequest(BaseModel):
    prerequisite_topic: str
    dependent_topic: str
    source_misconception_id: Optional[str] = None

class ClusterItem(BaseModel):
    misconception: str
    severity: str
    studentCount: int
    students: List[str]

class ClusterResponse(BaseModel):
    clusters: List[ClusterItem]

class StudentMisconceptionItem(BaseModel):
    state_id: str
    student_id: str
    student_name: Optional[str] = None
    topic: Optional[str] = None
    status: str
    encounter_count: int
    last_triggered_at: Optional[str] = None

class StudentMisconceptionResponse(BaseModel):
    items: List[StudentMisconceptionItem]

class UpdateMisconceptionStatusRequest(BaseModel):
    status: str

class StudentRosterItem(BaseModel):
    student_id: str
    name: str
    email: Optional[str] = None
    role: Optional[str] = None

class StudentRosterResponse(BaseModel):
    students: List[StudentRosterItem]
