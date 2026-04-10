from crewai import Task
from ai_engine.agents import get_reasoner_agent, get_judge_agent, get_tutor_agent, get_assessment_architect
from textwrap import dedent

def get_reasoning_extraction_task(student_query: str, current_context: str) -> Task:
    return Task(
        description=dedent(f"""
            Analyze the following student query within its context.
            Extract the logical or mathematical steps the student took.
            
            Context: {current_context}
            Student's Query: {student_query}
            
            Output a numbered list of their logical progression without judging if it is right or wrong.
        """),
        expected_output="A numbered list of logical steps taken by the student.",
        agent=get_reasoner_agent()
    )

def get_misconception_verification_task(vector_results: list) -> Task:
    # Formatting vector results for prompt
    vector_results_txt = "\n".join([
        f"Misconception ID: {r.get('id', 'N/A')}\nTopic: {r.get('topic', 'N/A')}\nFlawed Logic: {r.get('flawed_logic_description', 'N/A')}\nRemedial Strategy: {r.get('remedial_strategy', 'N/A')}"
        for r in vector_results
    ])
    
    return Task(
        description=dedent(f"""
            Look at the logical trace provided by the Cognitive Logic Tracker.
            Compare it to these documented known misconceptions retrieved from our database:
            
            {vector_results_txt}
            
            Which one is the exact match? If none match perfectly, output 'Unique Error'.
            State your final diagnostic label clearly.
        """),
        expected_output="A clear diagnostic label mapping to one of the provided misconceptions or 'Unique Error'.",
        agent=get_judge_agent()
    )

def get_contextual_feedback_task(student_id: str, historical_struggle: str, encounter_count: int, predicted_rl_topic: str, guessing_detected: bool = False, vulnerable_future_topics: list = None) -> Task:
    
    guessing_context = ""
    if guessing_detected:
        guessing_context = "The metadata from the frontend shows high hesitation (the student likely completely guessed this answer, even if they got it correct). Explicitly tell them: 'You got this right, but I noticed you hesitated and switched answers. Let's walk through your logic just to be sure.'"
        
    kg_context = ""
    if vulnerable_future_topics:
        topics_str = ", ".join(vulnerable_future_topics)
        kg_context = f"Based on our Knowledge Graph, because they are struggling with this concept, they are statistically likely to fail at these future topics: {topics_str}. Warn them about this dependency so they take this foundational fix seriously."

    return Task(
        description=dedent(f"""
            You are tutoring Student ID: {student_id}.
            They have just made a conceptual error as diagnosed by the Diagnostic Verifier (or guessed the right answer).
            
            CRITICAL CONTEXT:
            Looking at their history, they have struggled with '{historical_struggle}' {encounter_count} times before.
            Our predictive model suggests their fundamental weakness right now might actually be: '{predicted_rl_topic}'.
            {guessing_context}
            {kg_context}
            
            YOUR TASK:
            Write a supportive, Socratic response in Markdown.
            1. Do NOT give them the final answer.
            2. Explicitly draw a connection between their current mistake and their past struggle with '{historical_struggle}' to show them they are repeating a pattern.
            3. Address the potential fundamental weakness '{predicted_rl_topic}'.
            4. If guessing was detected, or future vulnerabilities identified, address them as instructed in the CRITICAL CONTEXT.
            5. Ask ONE guiding question to help them fix the logic.
        """),
        expected_output="A compassionate, Socratic response in Markdown referencing their past struggles, future vulnerabilities, and asking a guiding question.",
        agent=get_tutor_agent()
    )

def get_mcq_generation_task() -> Task:
    return Task(
        description=dedent("""
            Based on the conceptual error the student just made and the feedback provided by the Tutor, generate a "Plausible Distractor" MCQ specifically tailored to the diagnosed misconception.
            
            You must return ONLY a JSON object exactly matching this schema:
            {
              "question": "The question text",
              "correct_answer": "The correct answer text",
              "distractors": [
                {
                  "option": "A plausible distractor option",
                  "mapped_misconception_id": "a-uuid-or-slug"
                }
              ]
            }
            Do not include any explanation or markdown formatting like ```json. Return pure JSON.
        """),
        expected_output="A JSON object matching the required MCQ schema.",
        agent=get_assessment_architect()
    )
