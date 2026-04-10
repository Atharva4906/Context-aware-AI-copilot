import os
from dotenv import load_dotenv
from crewai import Agent, LLM

load_dotenv()

# Initialize Groq LLM using Litellm/CrewAI native wrapper
api_key = os.environ.get("GROQ_API_KEY")
if not api_key:
    print("Warning: GROQ_API_KEY is missing from environment variables.")
    # Dummy to prevent crash
    groq_llm_70b = None
    groq_llm_8b = None
else:
    groq_llm_70b = LLM(model="groq/llama3-70b-8192", api_key=api_key, temperature=0.2)
    groq_llm_8b = LLM(model="groq/llama3-8b-8192", api_key=api_key, temperature=0.4)

def get_reasoner_agent() -> Agent:
    return Agent(
        role='Cognitive Logic Tracker',
        goal='Map the step-by-step reasoning of the student without judging if it is right or wrong.',
        backstory='You are an objective observer of mathematical and logical thought processes. You do not grade; you only trace the flow of logic.',
        llm=groq_llm_70b,
        allow_delegation=False,
        verbose=True
    )

def get_judge_agent() -> Agent:
    return Agent(
        role='Diagnostic Verifier',
        goal='Match the student\'s logical trace to one of the scientifically documented common misconceptions provided to you.',
        backstory='You are a strict, mathematically precise judge. You prevent hallucinations by ensuring the student\'s error perfectly aligns with a known, documented misconception.',
        llm=groq_llm_70b,
        allow_delegation=False,
        verbose=True
    )

def get_tutor_agent() -> Agent:
    return Agent(
        role='Context-Aware Socratic Tutor',
        goal='Draft highly personalized, guiding feedback that references the student\'s past struggles to help them realize their current mistake.',
        backstory='You are an empathetic master teacher. You never just give the answer. You look at the student\'s historical struggles and use analogies that resonate with them.',
        llm=groq_llm_70b, # using 70b to ensure high reasoning, but 8b is also possible
        allow_delegation=False,
        verbose=True
    )

def get_assessment_architect() -> Agent:
    return Agent(
        role='Assessment Architect',
        goal='Design a single JSON MCQ to quickly test if the student overcame their misconception.',
        backstory="An expert in psychometrics who builds highly discriminative questions.",
        verbose=True,
        allow_delegation=False,
        llm=groq_llm_70b
    )

def get_question_generator_agent() -> Agent:
    return Agent(
        role='Dynamic Question Generator',
        goal='Generate 2 highly logical follow-up multiple choice questions to ensure a student is not just guessing.',
        backstory="A master interrogator who crafts tricky follow-up questions to expose lucky guessers. Always outputs perfect JSON arrays.",
        verbose=False,
        allow_delegation=False,
        llm=groq_llm_70b
    )

def get_concept_extractor_agent() -> Agent:
    return Agent(
        role='Semantic Concept Extractor',
        goal='Read a question or text and extract the core underlying educational concepts into a JSON list.',
        backstory="A precise taxonomist who categorizes knowledge fragments into fundamental concepts.",
        verbose=False,
        allow_delegation=False,
        llm=groq_llm_70b
    )
