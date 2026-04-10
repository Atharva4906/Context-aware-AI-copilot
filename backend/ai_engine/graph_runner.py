"""
LangGraph compiled graphs.
Replaces crew_runner.py entirely.

Three graphs:
  1. concept_graph        – single-node concept extraction
  2. verification_graph   – single-node follow-up question generation
  3. diagnostic_graph     – reasoner → judge → (tutor ‖ architect) [parallel]
"""
from langgraph.graph import StateGraph, END

from ai_engine.graph_states import ConceptState, VerificationState, DiagnosticState
from ai_engine.graph_nodes import (
    concept_extractor_node,
    question_generator_node,
    reasoner_node,
    judge_node,
    tutor_node,
    architect_node,
)

# ─── 1. Concept-extraction graph ─────────────────────────────────────────────
_concept_builder = StateGraph(ConceptState)
_concept_builder.add_node("extractor", concept_extractor_node)
_concept_builder.set_entry_point("extractor")
_concept_builder.add_edge("extractor", END)
concept_graph = _concept_builder.compile()


# ─── 2. Verification-question graph ──────────────────────────────────────────
_verify_builder = StateGraph(VerificationState)
_verify_builder.add_node("generator", question_generator_node)
_verify_builder.set_entry_point("generator")
_verify_builder.add_edge("generator", END)
verification_graph = _verify_builder.compile()


# ─── 3. Diagnostic graph  (tutor + architect run in parallel) ─────────────────
_diag_builder = StateGraph(DiagnosticState)
_diag_builder.add_node("reasoner",  reasoner_node)
_diag_builder.add_node("judge",     judge_node)
_diag_builder.add_node("tutor",     tutor_node)
_diag_builder.add_node("architect", architect_node)

_diag_builder.set_entry_point("reasoner")
_diag_builder.add_edge("reasoner", "judge")
# Fan-out: judge feeds BOTH tutor and architect in parallel
_diag_builder.add_edge("judge", "tutor")
_diag_builder.add_edge("judge", "architect")
_diag_builder.add_edge("tutor", END)
_diag_builder.add_edge("architect", END)
diagnostic_graph = _diag_builder.compile()


# ─── Public runner functions (same signatures as old crew_runner.py) ──────────

def run_concept_extraction(question_content: str) -> list:
    """Run concept-extraction graph and return list of concept strings."""
    result = concept_graph.invoke({"question_content": question_content, "concepts": []})
    return result.get("concepts", [])


def run_logic_verification_questions(core_logic: str) -> list:
    """Run verification-question graph and return list of MCQ dicts."""
    result = verification_graph.invoke({"core_logic": core_logic, "follow_up_questions": []})
    return result.get("follow_up_questions", [])


def run_diagnostic_crew(
    student_id: str,
    user_query: str,
    current_context: str,
    vector_results: list,
    historical_struggle: str,
    encounter_count: int,
    predicted_rl_topic: str,
    guessing_detected: bool = False,
    vulnerable_future_topics: list = None,
    weak_concepts: list = None,
    true_answer: str = "Unknown",
) -> tuple:
    """
    Executes the multi-node diagnostic graph.
    Returns (feedback_text: str, mcq_dict: dict, misconception_verdict: str)
    """
    initial_state: DiagnosticState = {
        "student_id": student_id,
        "user_query": user_query,
        "current_context": current_context,
        "vector_results": vector_results or [],
        "historical_struggle": historical_struggle,
        "encounter_count": encounter_count,
        "predicted_rl_topic": predicted_rl_topic,
        "guessing_detected": guessing_detected,
        "vulnerable_future_topics": vulnerable_future_topics or [],
        "weak_concepts": weak_concepts or [],
        "true_answer": true_answer,
        # intermediate / output fields — LangGraph needs them pre-seeded
        "reasoning_extracted": "",
        "misconception_verdict": "",
        "feedback_text": "",
        "mcq_dict": {},
    }

    print(f"[LangGraph] Starting Diagnostic Graph for Student: {student_id}")
    result = diagnostic_graph.invoke(initial_state)

    feedback_text         = result.get("feedback_text", "No feedback generated.")
    mcq_dict              = result.get("mcq_dict", {})
    misconception_verdict = result.get("misconception_verdict", "")
    return feedback_text, mcq_dict, misconception_verdict
