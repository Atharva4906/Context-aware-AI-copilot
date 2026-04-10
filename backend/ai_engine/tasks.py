from crewai import Task
from ai_engine.agents import (
    get_reasoner_agent, 
    get_judge_agent, 
    get_tutor_agent, 
    get_assessment_architect,
    get_question_generator_agent,
    get_concept_extractor_agent
)
from textwrap import dedent

def get_question_generation_task(core_logic: str) -> Task:
    """Generate 2 follow-up verification questions when a student answers correctly."""
    return Task(
        description=dedent(f"""
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
        """),
        expected_output="A raw JSON array containing exactly 2 multiple-choice question objects.",
        agent=get_question_generator_agent()
    )

def get_concept_extraction_task(question_content: str) -> Task:
    """Extract semantic concepts from a question."""
    return Task(
        description=dedent(f"""
            Analyze the following question and break it down into 3-5 core underlying educational concepts.
            Question:
            ---
            {question_content}
            ---
            Return ONLY a raw JSON array of strings representing the concepts. No markdown wrappers.
            Example: ["Lexical Scoping", "Variable Initialization", "Function Return Values"]
        """),
        expected_output="A raw JSON array of 3-5 string concepts.",
        agent=get_concept_extractor_agent()
    )

def get_reasoning_extraction_task(student_query: str, current_context: str, true_answer: str = "Unknown") -> Task:
    return Task(
        description=dedent(f"""
            Analyze the student's submission and extract their explicit or implicit reasoning process.
            
            Context of the Problem/Topic:
            {current_context}

            The Actual True Answer:
            {true_answer}

            Student's Output:
            {student_query}

            Task: Describe precisely *why* the student believes their answer is correct. What logic are they using?
        """),
        expected_output="A crisp paragraph detailing the student's step-by-step logical reasoning process.",
        agent=get_reasoner_agent()
    )

def get_misconception_verification_task(vector_results: list) -> Task:
    vector_context = "\n".join([f"Topic: {r['topic']}\nFlaw: {r['flawed_logic_description']}\nStrategy: {r['remedial_strategy']}" for r in vector_results])
    return Task(
        description=dedent(f"""
            Compare the student's reasoning (from the Reasoner Agent) against the following scientifically documented misconceptions:
            
            Database References:
            {vector_context}
            
            Task: Does the student's reasoning map to one of these known misconceptions? Or is it a novel error?
        """),
        expected_output="A diagnostic conclusion linking the student's logic to a specific misconception topic, or identifying it as novel.",
        agent=get_judge_agent()
    )

def get_contextual_feedback_task(historical_struggle: str, encounter_count: int, predicted_rl_topic: str, guessing_detected: bool, vulnerable_future_topics: list, weak_concepts: list, true_answer: str = "") -> Task:
    weakness_str = ", ".join(weak_concepts) if weak_concepts else "None"
    topics_str = ", ".join(vulnerable_future_topics) if vulnerable_future_topics else "None"
    
    return Task(
        description=dedent(f"""
            Generate a personalized, Socratic feedback response for the student.
            
            Important Context provided by other systems:
            - Their historical struggle: {historical_struggle} (encountered {encounter_count} times)
            - Student's explicitly flagged Weak Concepts: {weakness_str}
            - Our ML model predicts they are fundamentally failing here: {predicted_rl_topic}
            - Potential downstream failures if this isn't fixed: {topics_str}
            - Guessing detected by UI telemetry: {guessing_detected}
            - The true correct answer is: {true_answer}
            
            Task Guidelines:
            1. Synthesize the diagnosis from the Judge Agent.
            2. If 'Guessing Detected' is True, challenge them! "You got the right final state, but I noticed you hesitated and switched answers. Let's walk through your logic."
            3. Do NOT just give the answer directly. Guide them by explicitly combining their 'Weak Concepts', their 'historical struggle' and the 'True Answer' to formulate your final explanation.
            4. Make them feel seen by acknowledging their weak concepts.
            5. Use engaging Markdown formatting.
        """),
        expected_output="A well-formatted Markdown response acting as an empathetic, Socratic AI tutor.",
        agent=get_tutor_agent()
    )

def get_architect_mcq_task(predicted_rl_topic: str) -> Task:
    return Task(
        description=dedent(f"""
            Generate a single verification multiple-choice question to test if the student has overcome the predicted root weakness: {predicted_rl_topic}.
            You must generate 1 correct option and 3 plausible distractors that represent common ways a student might still hold the misconception.
            
            CRITICAL: Return ONLY a raw, pure JSON object describing the question. Absolutely NO markdown block decorators (do not output ```json ... ```) and NO other text.
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
        """),
        expected_output="A JSON object matching the required MCQ schema.",
        agent=get_assessment_architect()
    )
