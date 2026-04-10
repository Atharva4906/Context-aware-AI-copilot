import json
import re
from crewai import Crew, Process
from ai_engine.tasks import (
    get_reasoning_extraction_task,
    get_misconception_verification_task,
    get_contextual_feedback_task,
    get_concept_extraction_task,
    get_question_generation_task,
    get_architect_mcq_task
)
from ai_engine.agents import (
    get_reasoner_agent,
    get_judge_agent,
    get_tutor_agent,
    get_assessment_architect,
    get_concept_extractor_agent,
    get_question_generator_agent
)

def run_concept_extraction(question_content: str) -> list:
    """Runs a single agent to extract concepts."""
    task = get_concept_extraction_task(question_content)
    crew = Crew(
        agents=[get_concept_extractor_agent()],
        tasks=[task],
        process=Process.sequential,
        verbose=False
    )
    result = crew.kickoff()
    try:
        clean_res = re.sub(r'```json\s*', '', result.raw).replace("```", "").strip()
        return json.loads(clean_res)
    except Exception as e:
        print("Failed parsing concepts:", e)
        return []

def run_logic_verification_questions(core_logic: str) -> list:
    """Runs a single agent to generate 2 logic-based MCQs when a student guesses correctly."""
    task = get_question_generation_task(core_logic)
    crew = Crew(
        agents=[get_question_generator_agent()],
        tasks=[task],
        process=Process.sequential,
        verbose=False
    )
    result = crew.kickoff()
    try:
        clean_res = re.sub(r'```json\s*', '', result.raw).replace("```", "").strip()
        return json.loads(clean_res)
    except Exception as e:
        print("Failed parsing generated questions:", e)
        return []

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
    true_answer: str = "Unknown"
) -> tuple:
    """
    Executes the multi-agent diagnostic workflow.
    """
    weak_concepts = weak_concepts or []
    
    # Init Agents
    reasoner = get_reasoner_agent()
    judge = get_judge_agent()
    tutor = get_tutor_agent()
    architect = get_assessment_architect()
    
    # Init Tasks
    task1 = get_reasoning_extraction_task(user_query, current_context, true_answer)
    task2 = get_misconception_verification_task(vector_results)
    task3 = get_contextual_feedback_task(
        historical_struggle=historical_struggle, 
        encounter_count=encounter_count, 
        predicted_rl_topic=predicted_rl_topic,
        guessing_detected=guessing_detected,
        vulnerable_future_topics=vulnerable_future_topics,
        weak_concepts=weak_concepts,
        true_answer=true_answer
    )
    task4 = get_architect_mcq_task(predicted_rl_topic)
    
    crew = Crew(
        agents=[reasoner, judge, tutor, architect],
        tasks=[task1, task2, task3, task4],
        process=Process.sequential,
        verbose=True
    )
    
    print(f"Starting Diagnostic Crew for Student: {student_id}")
    final_result = crew.kickoff()
    
    feedback_text = task3.output.raw_output if getattr(task3, 'output', None) else "No feedback generated."
    mcq_result_text = task4.output.raw_output if getattr(task4, 'output', None) else "{}"
    
    try:
        mcq_result_text = re.sub(r'```json\s*', '', mcq_result_text)
        mcq_result_text = re.sub(r'\s*```', '', mcq_result_text)
        mcq_dict = json.loads(mcq_result_text)
    except json.JSONDecodeError as e:
        print(f"Failed to parse MCQ JSON: {e}")
        mcq_dict = {}
        
    return feedback_text, mcq_dict
