"""
LangGraph node functions.
Each function receives a state dict, calls the LLM, and returns a partial state update.
Prompts are preserved 1-to-1 from the old CrewAI tasks.py.
"""
import os
import json
import re
from textwrap import dedent
from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage

from ai_engine.graph_states import ConceptState, VerificationState, DiagnosticState

load_dotenv()

# ─── LLM singletons ─────────────────────────────────────────────────────────
# ─── LLM singletons ─────────────────────────────────────────────────────────
_api_key = os.environ.get("GROQ_API_KEY", "")

# FIX: Change 'api_key' to '_api_key'
groq_llm_70b = ChatGroq(model="llama-3.3-70b-versatile", api_key=_api_key, temperature=0.2)
groq_llm_8b = ChatGroq(model="llama-3.1-8b-instant", api_key=_api_key, temperature=0.4)

def _call(llm: ChatGroq, system: str, user: str) -> str:
    """Thin helper: system + user → str content."""
    msgs = [SystemMessage(content=system), HumanMessage(content=user)]
    return llm.invoke(msgs).content.strip()


def _clean_json(raw: str) -> str:
    """Strip markdown code fences from LLM output."""
    raw = re.sub(r"```json\s*", "", raw)
    raw = re.sub(r"```\s*", "", raw)
    return raw.strip()


# ─── Concept-extraction graph node ──────────────────────────────────────────
def concept_extractor_node(state: ConceptState) -> dict:
    question = state["question_content"]
    system = (
        "You are a precise Semantic Concept Extractor. "
        "Read a question or text and extract the core underlying educational concepts into a JSON list. "
        "Return ONLY a raw JSON array of 3-5 string concept names. No markdown, no explanation."
    )
    user = dedent(f"""
        Analyze the following question and break it down into 3-5 core underlying educational concepts.
        Question:
        ---
        {question}
        ---
        Return ONLY a raw JSON array of strings. Example: ["Lexical Scoping","Variable Initialization","Function Return Values"]
    """)
    raw = _call(groq_llm_8b, system, user)
    try:
        concepts = json.loads(_clean_json(raw))
    except Exception:
        concepts = []
    return {"concepts": concepts}


# ─── Verification-question generation node ──────────────────────────────────
def question_generator_node(state: VerificationState) -> dict:
    core_logic = state["core_logic"]
    system = (
        "You are a master Dynamic Question Generator. "
        "You craft tricky follow-up questions to expose students who are just guessing. "
        "Always output ONLY a valid JSON array, no markdown."
    )
    user = dedent(f"""
        The student just guessed the right answer using this core logic context:
        ---
        {core_logic}
        ---
        Generate EXACTLY TWO multiple-choice questions to test if they truly understand this logic or just got lucky.
        The questions should be subtly tricky.

        Return ONLY a raw JSON array of 2 objects. Do not use markdown wrappers like ```json.
        Format:
        [
          {{
            "question": "The question...?",
            "options": ["A", "B", "C", "D"],
            "correct_answer": "B"
          }},
          ...
        ]
    """)
    raw = _call(groq_llm_8b, system, user)
    try:
        questions = json.loads(_clean_json(raw))
    except Exception:
        questions = []
    return {"follow_up_questions": questions}


# ─── Diagnostic graph nodes ──────────────────────────────────────────────────
def reasoner_node(state: DiagnosticState) -> dict:
    system = (
        "You are the Cognitive Logic Tracker. "
        "Map the student's step-by-step reasoning without judging right or wrong. "
        "Be objective and precise."
    )
    user = dedent(f"""
        Analyze the student's submission and extract their explicit or implicit reasoning process.

        Context of the Problem/Topic:
        {state["current_context"]}

        The Actual True Answer:
        {state["true_answer"]}

        Student's Output:
        {state["user_query"]}

        Task: Describe precisely *why* the student believes their answer is correct. What logic are they using?
    """)
    result = _call(groq_llm_70b, system, user)
    return {"reasoning_extracted": result}


def judge_node(state: DiagnosticState) -> dict:
    vector_results = state.get("vector_results", [])
    vector_context = "\n".join([
        f"Topic: {r['topic']}\nFlaw: {r['flawed_logic_description']}\nStrategy: {r['remedial_strategy']}"
        for r in vector_results
    ])
    system = (
        "You are the Diagnostic Verifier — a strictly mathematically precise judge. "
        "You prevent hallucinations by ensuring the student's error perfectly aligns with a known, documented misconception."
    )
    user = dedent(f"""
        Compare the student's reasoning against the following scientifically documented misconceptions:

        Student Reasoning:
        {state["reasoning_extracted"]}

        Database References:
        {vector_context}

        Task: Does the student's reasoning map to one of these known misconceptions? Or is it a novel error?
        Provide a diagnostic conclusion.
    """)
    result = _call(groq_llm_70b, system, user)
    return {"misconception_verdict": result}


def tutor_node(state: DiagnosticState) -> dict:
    weakness_str = ", ".join(state.get("weak_concepts", [])) or "None"
    topics_str   = ", ".join(state.get("vulnerable_future_topics", [])) or "None"
    system = (
        "You are a Context-Aware Socratic Tutor — empathetic, Socratic, and highly personalized. "
        "You never just give the answer. You guide through questions and analogies based on the student's history."
    )
    user = dedent(f"""
        Generate a personalized, Socratic feedback response for the student.

        Important Context provided by other systems:
        - Their historical struggle: {state["historical_struggle"]} (encountered {state["encounter_count"]} times)
        - Student's explicitly flagged Weak Concepts: {weakness_str}
        - Diagnostic verdict from Judge Agent: {state["misconception_verdict"]}
        - Our ML model predicts they are fundamentally failing here: {state["predicted_rl_topic"]}
        - Potential downstream failures if this isn't fixed: {topics_str}
        - Guessing detected by UI telemetry: {state["guessing_detected"]}
        - The true correct answer is: {state["true_answer"]}

        Task Guidelines:
        1. Synthesize the diagnosis from the misconception_verdict above.
        2. If 'Guessing Detected' is True, challenge them: "You got the right final state, but I noticed you hesitated and switched answers. Let's walk through your logic."
        3. Do NOT just give the answer directly. Guide them by explicitly combining their 'Weak Concepts', their 'historical struggle' and the 'True Answer' to form your final explanation.
        4. Make them feel seen by acknowledging their weak concepts.
        5. Use engaging Markdown formatting.
    """)
    result = _call(groq_llm_70b, system, user)
    return {"feedback_text": result}


def architect_node(state: DiagnosticState) -> dict:
    predicted_rl_topic = state.get("predicted_rl_topic", "the topic")
    system = (
        "You are the Assessment Architect — an expert in psychometrics who builds highly discriminative questions. "
        "Return ONLY a raw JSON object, NO markdown fences, NO extra text."
    )
    user = dedent(f"""
        Generate a single verification multiple-choice question to test if the student has overcome the predicted root weakness: {predicted_rl_topic}.
        You must generate 1 correct option and 3 plausible distractors that represent common ways a student might still hold the misconception.

        CRITICAL: Return ONLY a raw, pure JSON object. Absolutely NO markdown block decorators.
        Schema:
        {{
            "question": "The question content here?",
            "correct_answer": "The definitively correct option",
            "distractors": [
                {{
                    "option": "A distractor answer",
                    "mapped_misconception_id": "specific misconception identifier string"
                }}
            ]
        }}
    """)
    raw = _call(groq_llm_8b, system, user)
    try:
        mcq_dict = json.loads(_clean_json(raw))
    except Exception:
        mcq_dict = {}
    return {"mcq_dict": mcq_dict}
