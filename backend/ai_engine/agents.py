import os
from dotenv import load_dotenv
from crewai import Agent
from langchain_groq import ChatGroq

load_dotenv()

# Initialize Groq LLM
api_key = os.environ.get("GROQ_API_KEY")
if not api_key:
    print("Warning: GROQ_API_KEY is missing from environment variables.")
    # Dummy to prevent crash
    groq_llm = None
else:
    groq_llm_70b = ChatGroq(temperature=0.2, model_name="llama3-70b-8192", api_key=api_key)
    groq_llm_8b = ChatGroq(temperature=0.4, model_name="llama3-8b-8192", api_key=api_key)

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
    """Agent 4: The Assessment Architect generates a Plausible Distractor MCQ."""
    return Agent(
        role='Assessment Architect',
        goal='Generate a multiple-choice question tailored to test if the student overcame the diagnosed misconception.',
        backstory='You are an expert psychometrician. You design subtle, plausible distractors that specifically catch common misconceptions.',
        llm=groq_llm_8b, # 8b is fast enough for structured JSON output
        allow_delegation=False,
        verbose=True
    )
