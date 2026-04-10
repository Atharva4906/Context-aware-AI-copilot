import json
from crewai import Crew, Process
from ai_engine.tasks import (
    get_reasoning_extraction_task,
    get_misconception_verification_task,
    get_contextual_feedback_task,
    get_mcq_generation_task
)
from ai_engine.agents import (
    get_reasoner_agent,
    get_judge_agent,
    get_tutor_agent,
    get_assessment_architect
)

def run_diagnostic_crew(
    student_id: str,
    user_query: str,
    current_context: str,
    vector_results: list,
    historical_struggle: str,
    encounter_count: int,
    predicted_rl_topic: str,
    guessing_detected: bool = False,
    vulnerable_future_topics: list = None
) -> tuple:
    """
    Executes the multi-agent workflow sequentially to generate feedback and an MCQ.
    Returns: (feedback_markdown, mcq_dict)
    """
    
    # Init Agents
    reasoner = get_reasoner_agent()
    judge = get_judge_agent()
    tutor = get_tutor_agent()
    architect = get_assessment_architect()
    
    # Init Tasks
    task1 = get_reasoning_extraction_task(user_query, current_context)
    task2 = get_misconception_verification_task(vector_results)
    task3 = get_contextual_feedback_task(
        student_id, 
        historical_struggle, 
        encounter_count, 
        predicted_rl_topic,
        guessing_detected=guessing_detected,
        vulnerable_future_topics=vulnerable_future_topics
    )
    task4 = get_mcq_generation_task()
    
    # Form the Crew
    # Using sequential process since each agent depends on the previous output
    crew = Crew(
        agents=[reasoner, judge, tutor, architect],
        tasks=[task1, task2, task3, task4],
        process=Process.sequential,
        verbose=True
    )
    
    # Execution
    print(f"Starting CrewAI for Student: {student_id}")
    final_result = crew.kickoff()
    
    # The kickoff returns the output of the final task (Task 4: MCQ Generation).
    # To get the feedback text, we actually need the output of Task 3.
    # In CrewAI, you can access task outputs individually if you keep a reference.
    
    feedback_text = task3.output.raw_output if getattr(task3, 'output', None) else "No feedback generated."
    mcq_result_text = task4.output.raw_output if getattr(task4, 'output', None) else "{}"
    
    # Parse MCQ json
    try:
        # Strip potential markdown if LLM misbehaves
        import re
        mcq_result_text = re.sub(r'```json\s*', '', mcq_result_text)
        mcq_result_text = re.sub(r'\s*```', '', mcq_result_text)
        mcq_dict = json.loads(mcq_result_text)
    except json.JSONDecodeError as e:
        print(f"Failed to parse MCQ JSON: {e}")
        mcq_dict = {
            "question": "Failed to generate question.",
            "correct_answer": "N/A",
            "distractors": []
        }
        
    return feedback_text, mcq_dict
