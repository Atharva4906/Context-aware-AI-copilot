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
from ai_engine.simulation_engine import build_simulation_payload

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


def parse_question_from_text(raw_text: str, category: str) -> dict:
    """Parse raw pasted question text into the expected JSON shape."""
    system = (
        "You are a strict JSON formatter for exam questions. "
        "Convert raw pasted text into a JSON object with keys: "
        "category, content, options, correct_answer. "
        "If options are missing, set options to null. "
        "Only set correct_answer if it is explicitly provided in the text. "
        "Return ONLY raw JSON. No markdown, no commentary."
    )
    user = dedent(f"""
        Category to use: {category}

        Raw text:
        ---
        {raw_text}
        ---

        Rules:
        - content: question stem only (no option letters).
        - options: array of option strings in order, or null if absent.
        - correct_answer: explicit answer text if clearly provided, else null.
        - Do not infer or guess the correct answer.

        Output JSON only.
        Example:
        {{
          "category": "Math",
          "content": "A rectangle has a perimeter of 24 units. If the length is twice the width, what is the area of the rectangle?",
          "options": ["32", "24", "16", "20"],
          "correct_answer": null
        }}
    """)
    raw = _call(groq_llm_8b, system, user)
    try:
        parsed = json.loads(_clean_json(raw))
        return parsed if isinstance(parsed, dict) else {}
    except Exception as e:
        print(f"[parse_question_from_text] parse error: {e} | raw={raw}")
        return {}


def propose_misconception_candidate(user_query: str, current_context: str, verdict: str) -> dict:
    """Propose a new misconception candidate when the verdict indicates novelty."""
    system = (
        "You are an expert misconception curator. "
        "If the verdict indicates a novel error, propose a misconception record. "
        "Return ONLY valid JSON with keys: is_novel, topic, flawed_logic_description, remedial_strategy."
    )
    user = dedent(f"""
        Context:
        {current_context}

        Student response:
        {user_query}

        Judge verdict:
        {verdict}

        Rules:
        - If the verdict maps to a known misconception, set is_novel=false and keep other fields empty.
        - If novel, create a concise topic (2-6 words), a clear flawed_logic_description, and a helpful remedial_strategy.
        - Return JSON only.

        Example:
        {{
          "is_novel": true,
          "topic": "Order of Operations Confusion",
          "flawed_logic_description": "Student adds before multiplying...",
          "remedial_strategy": "Re-teach PEMDAS using a worked example."
        }}
    """)
    raw = _call(groq_llm_8b, system, user)
    try:
        candidate = json.loads(_clean_json(raw))
        return candidate if isinstance(candidate, dict) else {}
    except Exception as e:
        print(f"[propose_misconception_candidate] parse error: {e} | raw={raw}")
        return {}


def suggest_curriculum_edges(topic: str, category: str, context: str = "") -> list:
    """Suggest downstream curriculum edges for the knowledge graph."""
    system = (
        "You are a curriculum graph builder. "
        "Given a misconception topic, suggest 1-3 dependent topics that rely on it. "
        "Return ONLY a JSON array of objects with prerequisite_topic and dependent_topic."
    )
    user = dedent(f"""
        Category: {category}
        Misconception topic: {topic}
        Optional context:
        {context}

        Return only JSON array.
        Example:
        [
          {{"prerequisite_topic": "Fraction Arithmetic", "dependent_topic": "Algebraic Fractions"}},
          {{"prerequisite_topic": "Fraction Arithmetic", "dependent_topic": "Rational Expressions"}}
        ]
    """)
    raw = _call(groq_llm_8b, system, user)
    try:
        edges = json.loads(_clean_json(raw))
        return edges if isinstance(edges, list) else []
    except Exception as e:
        print(f"[suggest_curriculum_edges] parse error: {e} | raw={raw}")
        return []


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
        "Always output ONLY a valid JSON array, no markdown. "
        "IMPORTANT: Each option in the 'options' array must be the full text of the answer choice, "
        "NOT a letter label like 'A' or 'B'. Write out the actual answer content."
    )
    user = dedent(f"""
        The student just answered a question correctly using this context:
        ---
        {core_logic}
        ---
        Generate EXACTLY TWO multiple-choice questions to test if they truly understand the logic or just got lucky.
        The questions should be subtly tricky and directly related to the core concept.

        Return ONLY a raw JSON array of 2 objects. No markdown. No code fences.
        CRITICAL: Each option must be the full answer text — NOT just a letter like "A", "B", "C", "D".

        Example format:
        [
          {{
            "question": "What does the expression x^2 * x^3 simplify to?",
            "options": ["x^5", "x^6", "x^1", "2x^5"],
            "correct_answer": "x^5"
          }},
          {{
            "question": "Which rule is applied when dividing exponents with the same base?",
            "options": ["Subtract the exponents", "Add the exponents", "Multiply the exponents", "Divide the bases"],
            "correct_answer": "Subtract the exponents"
          }}
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
    student_explanation = (state.get("student_explanation") or "").strip()
    explanation_block = f"\n\nStudent Explanation (optional):\n{student_explanation}" if student_explanation else ""
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
        {explanation_block}

        Task: Describe precisely *why* the student believes their answer is correct. What logic are they using?
    """)
    result = _call(groq_llm_70b, system, user)
    return {"reasoning_extracted": result}


def explanation_analyzer_node(state: DiagnosticState) -> dict:
    student_explanation = (state.get("student_explanation") or "").strip()
    if not student_explanation:
        return {"explanation_diagnosis": ""}

    system = (
        "You are an Explanation Misconception Analyzer. "
        "Evaluate whether a student's explanation is conceptually sound and aligned with the problem context. "
        "Be concise and evidence-based."
    )
    user = dedent(f"""
        Analyze the student's optional explanation and identify misconception signals.

        Question / Problem Context:
        {state["current_context"]}

        Student Submitted Answer:
        {state["user_query"]}

        Student Explanation:
        {student_explanation}

        Guessing signal from metadata:
        {state.get("guessing_detected", False)}

        Return a compact diagnosis with this exact structure:
        - Explanation Soundness: <sound / partially sound / unsound>
        - Misconceptions Detected: <comma-separated concepts OR None>
        - Evidence: <1-2 short lines citing the explanation>
        - Corrective Direction: <how to fix reasoning in 1-2 lines>
    """)
    result = _call(groq_llm_70b, system, user)
    return {"explanation_diagnosis": result}


def judge_node(state: DiagnosticState) -> dict:
    vector_results = state.get("vector_results", [])
    explanation_diagnosis = (state.get("explanation_diagnosis") or "").strip()
    vector_context = "\n".join([
        f"Topic: {r['topic']}\nFlaw: {r['flawed_logic_description']}\nStrategy: {r['remedial_strategy']}"
        for r in vector_results
    ])
    explanation_context = explanation_diagnosis if explanation_diagnosis else "Not provided"
    system = (
        "You are the Diagnostic Verifier — a strictly mathematically precise judge. "
        "You prevent hallucinations by ensuring the student's error perfectly aligns with a known, documented misconception."
    )
    user = dedent(f"""
        Compare the student's reasoning against the following scientifically documented misconceptions:

        Student Reasoning:
        {state["reasoning_extracted"]}

        Student Explanation Diagnosis:
        {explanation_context}

        Database References:
        {vector_context}

        Task: Does the student's reasoning map to one of these known misconceptions? Or is it a novel error?
        If explanation diagnosis is present, use it to strengthen or weaken your confidence but keep reasoning evidence as primary.
        Provide a diagnostic conclusion.
    """)
    result = _call(groq_llm_70b, system, user)
    return {"misconception_verdict": result}


def tutor_node(state: DiagnosticState) -> dict:
    weakness_str = ", ".join(state.get("weak_concepts", [])) or "None"
    topics_str   = ", ".join(state.get("vulnerable_future_topics", [])) or "None"
    student_explanation = (state.get("student_explanation") or "").strip()
    explanation_diagnosis = (state.get("explanation_diagnosis") or "").strip()
    explanation_present = "Yes" if student_explanation else "No"
    system = (
        "You are a Context-Aware Socratic Tutor — empathetic, Socratic, and highly personalized. "
        "You guide through questions and analogies based on the student's history, while still giving closure when needed."
    )
    user = dedent(f"""
        Generate a personalized, Socratic feedback response for the student.

        Problem Context:
        {state["current_context"]}

        Important Context provided by other systems:
        - Their historical struggle: {state["historical_struggle"]} (encountered {state["encounter_count"]} times)
        - Student's explicitly flagged Weak Concepts: {weakness_str}
        - Diagnostic verdict from Judge Agent: {state["misconception_verdict"]}
        - Optional explanation provided by student: {explanation_present}
        - Explanation diagnosis: {explanation_diagnosis or "Not provided"}
        - Our ML model predicts they are fundamentally failing here: {state["predicted_rl_topic"]}
        - Potential downstream failures if this isn't fixed: {topics_str}
        - Guessing detected by UI telemetry: {state["guessing_detected"]}
        - The true correct answer is: {state["true_answer"]}

        Task Guidelines:
        1. Synthesize the diagnosis from the misconception_verdict above.
        2. If 'Guessing Detected' is True, challenge them: "You got the right final state, but I noticed you hesitated and switched answers. Let's walk through your logic."
        3. Guide them by explicitly combining their 'Weak Concepts', their 'historical struggle' and the 'True Answer' to form your final explanation.
        4. Make them feel seen by acknowledging their weak concepts.
        5. Use engaging Markdown formatting.
        6. If the student's answer/logic is incorrect based on the verdict, append a `## Final Answer` section at the end with a 1-2 step mini-solution and the exact numeric/factual answer.
        7. If and only if an explanation was provided and no misconception is found in that explanation, include a brief `## Explanation Verified` section.
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


def simulation_node(state: DiagnosticState) -> dict:
    """Create a safe template-based interactive simulation payload."""
    try:
        simulation_spec = build_simulation_payload(
            current_context=state.get("current_context", ""),
            predicted_topic=state.get("predicted_rl_topic", ""),
            misconception_verdict=state.get("misconception_verdict", ""),
        )
    except Exception as e:
        print(f"[simulation_node] error: {e}")
        simulation_spec = {}
    return {"simulation_spec": simulation_spec}


# ─── Standalone: detect correct answer for a question ───────────────────────
def detect_correct_answer(question_content: str, options: list) -> dict:
    """
    Given a question body and its options list, use the 70b LLM to identify
    which option is correct. Returns {"correct_answer": str, "correct_index": int}.
    """
    numbered = "\n".join([f"{i}. {opt}" for i, opt in enumerate(options)])
    system = (
        "You are a precise academic answer verifier. "
        "Given a question and a list of options, determine which option is correct. "
        "Reply ONLY with a valid JSON object — no markdown, no explanation."
    )
    user = dedent(f"""
        Question:
        {question_content}

        Options (0-indexed):
        {numbered}

        Return ONLY a JSON object with this shape:
        {{
          "correct_answer": "<exact text of the correct option>",
          "correct_index": <0-based integer index>
        }}
    """)
    raw = _call(groq_llm_70b, system, user)
    try:
        result = json.loads(_clean_json(raw))
        # Clamp index to valid range
        idx = int(result.get("correct_index", 0))
        idx = max(0, min(idx, len(options) - 1))
        return {"correct_answer": options[idx], "correct_index": idx}
    except Exception as e:
        print(f"[detect_correct_answer] parse error: {e} | raw={raw}")
        return {"correct_answer": options[0], "correct_index": 0}


# ─── Standalone: extract short topic label from judge verdict ────────────────
def extract_topic_from_verdict(verdict: str, category: str = "") -> str:
    """
    Takes the judge node's full misconception_verdict paragraph and distils it
    into a short 2-5 word topic label suitable for displaying in history.
    Fast 8b call to avoid adding latency.
    """
    if not verdict or len(verdict.strip()) < 10:
        return "Conceptual Misunderstanding"
    system = (
        "You are a concise academic classifier. "
        "Read the misconception analysis and output ONLY a short 2-5 word label "
        "naming the core concept being misunderstood. "
        "No sentences, no explanation, no punctuation — just the topic label."
    )
    user = dedent(f"""
        Category: {category or "General"}

        Misconception Analysis:
        {verdict[:800]}

        Output ONLY a short topic label (2-5 words). Examples:
        - "Exponent Subtraction Rule"
        - "Variable Scope Confusion"
        - "Newton's Third Law"
        - "Off-by-One Error"
    """)
    try:
        label = _call(groq_llm_8b, system, user).strip().strip('"').strip("'")
        # Sanity: if LLM returns something too long, truncate
        if len(label) > 60:
            label = label[:60]
        return label
    except Exception as e:
        print(f"[extract_topic_from_verdict] error: {e}")
        return "Conceptual Misunderstanding"
