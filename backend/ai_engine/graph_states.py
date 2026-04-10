"""
LangGraph TypedDict state schemas.
Each graph carries one of these through its nodes.
"""
from typing import TypedDict, Optional, List


class ConceptState(TypedDict):
    question_content: str
    concepts: List[str]


class VerificationState(TypedDict):
    core_logic: str
    follow_up_questions: List[dict]


class DiagnosticState(TypedDict):
    # ---- Inputs ----
    student_id: str
    user_query: str
    current_context: str
    vector_results: List[dict]
    historical_struggle: str
    encounter_count: int
    predicted_rl_topic: str
    guessing_detected: bool
    vulnerable_future_topics: List[str]
    weak_concepts: List[str]
    true_answer: str
    student_explanation: str

    # ---- Intermediate outputs ----
    reasoning_extracted: str          # set by reasoner_node
    explanation_diagnosis: str        # set by explanation_analyzer_node
    misconception_verdict: str        # set by judge_node

    # ---- Final outputs (run in parallel) ----
    feedback_text: str                # set by tutor_node
    mcq_dict: dict                    # set by architect_node
