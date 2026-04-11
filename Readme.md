Project Documentation: Context-Aware AI Co-Pilot
Part 1: High-Level Architecture & System Overview
1.1 Executive Vision & Problem Statement
The Problem: Traditional EdTech evaluation systems suffer from two fatal flaws:
1.	Binary Grading Blindspots: They mark answers as simply "Right" or "Wrong," failing to detect underlying conceptual misunderstandings (e.g., a student arriving at the correct mathematical answer using entirely flawed logic). Over time, these undetected misconceptions accumulate, destroying foundational knowledge.
2.	Contextual Amnesia: AI wrappers in education treat every interaction in a vacuum. They do not remember a student's historical struggles and treat a Day-1 beginner exactly the same as an advanced learner making a careless typo.
The Solution: We are building a Context-Aware AI Co-Pilot. By combining the MiRAGE framework (Retrieval-Guided Multi-Stage Reasoning) with a State-Graph Orchestration (LangGraph) and a Reinforcement Learning (RL) State Tracker, we have engineered a system that diagnoses the exact logical fallacy a student is making and delivers highly personalized, Socratic feedback based on their unique learning history.
________________________________________
1.2 Tech Stack & Component Mapping
Every tool in our stack was chosen for maximum speed, scalability, and deterministic accuracy.
•	Frontend: React + Tailwind CSS
o	Role: Delivers the primary learning interface (e.g., MCQ rendering) and hosts the "Floating Co-Pilot" chat widget. Tailwind ensures rapid, responsive styling.
•	Backend Orchestrator: FastAPI (Python)
o	Role: The central nervous system. It handles API requests, manages state updates, and orchestrates the complex AI workflows without blocking the event loop.
•	Database (Dual-Engine): Supabase
o	Relational Engine (PostgreSQL): Acts as "The Student Memory." Tracks user profiles, historical misconceptions, and RL state (resolved vs. unresolved conceptual gaps).
o	Vector Engine (pgvector): Acts as "The Encyclopedia." Stores embeddings of universal, well-documented "Common Misconceptions" to ground the AI and prevent hallucinations.
•	AI Orchestration: LangGraph + LangChain
	o	Role: Replaces a single, easily confused LLM prompt with a compiled state graph containing specialized processing nodes (Reasoner, Explanation Analyzer, Judge, Tutor, and Architect) that flow through sequential steps to reason and verify logic before responding to the student.
•	LLM Inference: Groq API (via LangChain)
	o	Role: Powers the LangGraph nodes through LangChain's ChatGroq interface. Groq's LPU (Language Processing Unit) architecture provides blistering fast inference speeds, allowing the graph pipeline to execute multiple reasoning steps in the background while delivering real-time responses to the frontend.
________________________________________
1.3 The "Diagnostic Funnel" Architecture (How it Works)
Our architecture follows a strict 5-step pipeline to ensure high accuracy and deep personalization. When a student interacts with the platform (e.g., submits an answer or asks the Co-Pilot a question):
1.	Retrieve (The Vector Grounding): * The backend takes the student's raw text and converts it into an embedding.
o	It queries the Supabase pgvector database to instantly retrieve the Top-3 scientifically documented "Common Misconceptions" related to that topic.
2.	Recall (The State Loading): * Simultaneously, the backend queries the Supabase Relational tables to load the student's historical profile (e.g., "This student is currently struggling with Variable Scope").
3.	Reason & Rank (LangGraph Diagnostics): * The Reasoner Node creates a logical step-by-step breakdown of the student's answer.
		o	The Explanation Analyzer Node processes the extracted reasoning.
		o	The Judge Node evaluates against the Top-3 retrieved misconceptions AND the student's historical profile to pinpoint the exact conceptual error.
4.	Respond (Socratic Generation): * The Tutor Node drafts the final response. It actively references the student's past struggles to make the feedback feel hyper-personalized (e.g., "Just like the error we saw yesterday, look at how the data is flowing...").
		o	The Architect Node generates a diagnostic MCQ tailored to the identified misconception.
5.	Reinforce (The Assessment Loop): * The system generates a dynamic "Plausible Distractor" MCQ to verify if the student understood the feedback. The result updates their Reinforcement Learning state in Supabase, closing the loop.

Part 2: Database Architecture & State Management (Supabase)
To achieve the "Context-Aware" memory without the latency of querying multiple different database providers, the entire data layer is consolidated inside Supabase. We leverage native PostgreSQL for relational state tracking and the pgvector extension for semantic similarity search.
2.1 Database Initialization & Extensions
Before creating the tables, the database requires the vector extension to be enabled. This allows PostgreSQL to natively store and query high-dimensional embeddings generated from our text.
SQL Execution:
SQL
CREATE EXTENSION IF NOT EXISTS vector;
2.2 The "Encyclopedia" Engine (Vector Storage)
This table acts as the system's baseline truth (the MiRAGE Retrieval layer). It stores the scientifically documented "Common Misconceptions" to prevent the LLM from hallucinating.
Table: common_misconceptions
Column Name	Data Type	Description
id	UUID (Primary Key)	Unique identifier for the misconception.
topic	Text	The subject category (e.g., "Python Basics", "Algebra").
flawed_logic_description	Text	The actual text of the misconception (e.g., "Student assumes variables are linked like spreadsheet cells").
embedding	Vector(768)	The numerical representation of the flawed_logic_description for similarity search.
remedial_strategy	Text	A pre-defined pedagogical hint to guide the LangGraph Tutor Node.
Note: During the hackathon, we will pre-populate this table with 10-15 highly specific entries to demonstrate the retrieval capability.
2.3 The "Student Memory" Engine (Relational Storage)
These tables represent the Reinforcement Learning (RL) state tracker. They give the "Floating Co-Pilot" its memory, tracking exactly what a specific user knows, what they struggle with, and how their understanding evolves over time.
Table: users
Column Name	Data Type	Description
student_id	UUID (Primary Key)	Unique identifier for the student.
name	Text	Student's display name.
learning_profile	JSONB	Stores metadata (e.g., prefers visual analogies vs. code snippets).
Table: student_misconception_state (The RL Tracker)
This is the core of the personalization engine. It maps a specific student to the specific misconceptions they have encountered.
Column Name	Data Type	Description
state_id	UUID (Primary Key)	Unique identifier for this state record.
student_id	UUID (Foreign Key)	Links to the users table.
misconception_id	UUID (Foreign Key)	Links to the common_misconceptions table.
status	Enum	Current RL state: unresolved, reviewing, or resolved.
encounter_count	Integer	How many times the student has triggered this specific error.
last_triggered_at	Timestamp	Used for spaced repetition logic.
Table: interaction_logs
Maintains the context window for the LangGraph processing pipeline.
Column Name	Data Type	Description
log_id	UUID (Primary Key)	Unique log identifier.
student_id	UUID (Foreign Key)	Links to the users table.
user_query	Text	The raw text submitted by the student.
agent_response	Text	The final Socratic feedback provided by the Co-Pilot.
created_at	Timestamp	Used to feed the most recent conversation context to the LLM.
2.4 The RL State Update Loop (How it learns)
The database is not static; it acts as a state machine for the student's learning journey.

### 5. Educator Command Center & Misconception Clustering
If a single student fails to grasp a concept, it's a student issue. If 80% of a cohort fails to grasp it, it's a pedagogical issue. 
- **Admin Dashboard Tracking**: Educators have a dedicated dashboard to see real-time updates of which students hold what misconceptions.
- **K-Means / Semantic Clustering Algorithm**: Through the backend API, the system automatically clusters students together based on shared cognitive gaps (e.g. Group A: struggling with 'Variable Scope', Group B: fundamental 'Loop' misunderstanding) allowing the educator to launch targeted group interventions.

### 6. Student-Led Resolution
The system shifts responsibility. Students can view their historical, unresolved misconceptions and actively trigger challenges (via the "Diagnose Misconception" button) to prove to the AI they have overcome their weaknesses, actively managing their own cognitive health.

## Deep Dive: How the RL Updates Confidence
1.	Trigger Event: A student submits an answer. The Vector Engine (common_misconceptions) identifies it as Misconception X.
2.	State Check: FastAPI checks student_misconception_state.
o	If no record exists, it inserts a new row with status = 'unresolved' and encounter_count = 1.
o	If it exists, it increments encounter_count and updates last_triggered_at.
3.	Context Injection: This state is passed through the LangGraph nodes. If encounter_count > 1, the Tutor Node's prompt is dynamically adjusted to acknowledge the recurring struggle.
4.	The Reward (Resolution): When the student successfully passes a Diagnostic MCQ generated by the system, a backend trigger updates the status to 'resolved'. The system "learns" that the pedagogical intervention was successful and advances the student's curriculum.


Part 3: Backend Orchestration & LangGraph Logic (FastAPI + LangChain + Groq)
This section details the backend engine. We use FastAPI for its asynchronous capabilities (crucial when streaming LLM responses) and LangGraph (powered by LangChain and the Groq API) to handle the multi-stage reasoning through compiled state graphs.
3.1 Backend Directory Structure
A clean, modular architecture ensures the codebase is maintainable and scalable.
Plaintext
backend/
├── main.py                  # FastAPI entry point & route definitions
├── database/
│   └── supabase_client.py   # Supabase connection & pgvector queries
├── ai_engine/
├── graph_nodes.py       # LangGraph Node functions (Reasoner, Analyzer, Judge, Tutor, Architect)
	│   ├── graph_states.py      # LangGraph TypedDict state schemas (ConceptState, VerificationState, DiagnosticState)
	│   └── graph_runner.py      # Compiled StateGraph workflows & public runner functions
├── models/
│   └── schemas.py           # Pydantic models for API request/response validation
└── .env                     # Groq & Supabase API Keys
3.2 The Core API Flow (main.py)
When a student interacts with the Co-Pilot, the FastAPI endpoint POST /api/analyze-response is triggered. The backend executes the following asynchronous pipeline:
1.	Extract Context: Fetch the student's historical state from student_misconception_state (Supabase).
2.	Retrieve Baseline: Query the common_misconceptions table (Supabase pgvector) using the student's text to find the Top-3 closest matches.
3.	Execute Graph: Pass the raw text, the historical context, and the retrieved vector matches into the compiled diagnostic graph via graph_runner.py.
4.	Stream Response: Return the Tutor Agent's customized feedback and the Assessment Architect's MCQ back to the React frontend.
________________________________________
3.3 LangGraph Node Definitions (graph_nodes.py & graph_states.py)
Instead of a single, massive prompt, we define specialized node functions that flow through a compiled StateGraph. Each node receives a TypedDict state, calls the Groq LLM via LangChain, and returns a partial state update. The state accumulates results as it flows through the graph pipeline.

Key Graphs:

1. **concept_graph**: Single-node graph for extracting concepts from question content.
2. **verification_graph**: Single-node graph for generating follow-up verification questions.
3. **diagnostic_graph**: Multi-node pipeline (Reasoner → Analyzer → Judge → Tutor → Architect) for comprehensive student response analysis.

Python
from langgraph.graph import StateGraph, END
from langchain_groq import ChatGroq
from ai_engine.graph_states import DiagnosticState

# Initialize Groq LLM instances
groq_llm_70b = ChatGroq(model="llama-3.3-70b-versatile", temperature=0.2)
groq_llm_8b = ChatGroq(model="llama-3.1-8b-instant", temperature=0.4)

# Node 1: Reasoner - Logical Tracker
def reasoner_node(state: DiagnosticState) -> dict:
    """Extract step-by-step reasoning from student answer without judgment."""
    system = "You are an objective observer of mathematical and logical thought processes."
    reasoning = _call(groq_llm_70b, system, state["user_query"])
    return {"reasoning_extracted": reasoning}

# Node 2: Explanation Analyzer - Process Reasoning
def explanation_analyzer_node(state: DiagnosticState) -> dict:
    """Analyze the extracted reasoning in detail against context."""
    diagnosis = analyze_explanation(state["reasoning_extracted"], state)
    return {"explanation_diagnosis": diagnosis}

# Node 3: Judge - Diagnostic Verifier
def judge_node(state: DiagnosticState) -> dict:
    """Match reasoning against known misconceptions and student history."""
    system = "You are a strict judge. Match the reasoning to a documented misconception."
    verdict = _call(groq_llm_70b, system, state["explanation_diagnosis"])
    return {"misconception_verdict": verdict}

# Node 4: Tutor - Socratic Response Generator
def tutor_node(state: DiagnosticState) -> dict:
    """Draft context-aware, Socratic feedback referencing student's history."""
    system = "You are an empathetic Socratic tutor. Reference their past struggles and guide them."
    feedback = _call(groq_llm_70b, system, state["misconception_verdict"])
    return {"feedback_text": feedback}

# Node 5: Architect - Assessment MCQ Generator
def architect_node(state: DiagnosticState) -> dict:
    """Generate diagnostic MCQ to verify student understanding."""
    mcq = generate_diagnostic_mcq(state["misconception_verdict"], state)
    return {"mcq_dict": mcq}

# Compile Diagnostic StateGraph
_diag_builder = StateGraph(DiagnosticState)
_diag_builder.add_node("reasoner", reasoner_node)
_diag_builder.add_node("analyzer", explanation_analyzer_node)
_diag_builder.add_node("judge", judge_node)
_diag_builder.add_node("tutor", tutor_node)
_diag_builder.add_node("architect", architect_node)

_diag_builder.set_entry_point("reasoner")
_diag_builder.add_edge("reasoner", "analyzer")
_diag_builder.add_edge("analyzer", "judge")
_diag_builder.add_edge("judge", "tutor")
_diag_builder.add_edge("tutor", "architect")
_diag_builder.add_edge("architect", END)

diagnostic_graph = _diag_builder.compile()
________________________________________


CRITICAL CONTEXT:
Looking at their history, they have struggled with {historical_misconception_name} {encounter_count} times before.

YOUR TASK:
Write a supportive, Socratic response. 
1. Do NOT give them the final answer.
2. Explicitly draw a connection between their current mistake and their past struggle with {historical_misconception_name} to show them they are repeating a pattern.
3. Ask ONE guiding question to help them fix the logic.
________________________________________
3.5 The Assessment Loop (Closing the RL State)
To ensure the Reinforcement Learning tracker has actionable data, we use a fourth agent: The Assessment Architect.
After the Tutor provides feedback, the Architect generates a JSON object representing a "Plausible Distractor" MCQ specifically tailored to the diagnosed misconception.
JSON
{
  "question": "If you define a variable 'x' inside a function, where else can you print it?",
  "correct_answer": "Only inside that specific function.",
  "distractors": [
    {
      "option": "Anywhere in the entire file.",
      "mapped_misconception_id": "uuid-for-global-scope-error"
    },
    {
      "option": "Only in the function below it.",
      "mapped_misconception_id": "uuid-for-sequential-reading-error"
    }
  ]
}
When the frontend renders this JSON and the student answers, FastAPI triggers a database update in Supabase, shifting their state from unresolved to resolved if they succeed. This completion also triggers an update to the RL diagnostic policy.


Part 4: Frontend Architecture & UX Implementation (React + Tailwind)
The frontend is built using React (or Next.js) and styled with Tailwind CSS. Its primary responsibility is to act as the sensory organ for the AI: capturing what the student is currently doing, managing the chat interface, and rendering the dynamic AI and MCQ responses.
4.1 UI/UX Layout Strategy
The application is split into two distinct visual layers:
1.	The Base Layer (The Learning Hub): The main screen where the educational content lives. This could be a static math problem, a video, or an MCQ.
2.	The Overlay Layer (The Floating Co-Pilot): A persistent, togglable chat widget fixed to the bottom-right of the screen. It can be opened at any time without disrupting the student's progress on the Base Layer.
4.2 State Management (The Context Bridge)
To achieve true "Context-Awareness," the frontend must know what is happening on the Base Layer and pass that to the Overlay Layer. We manage this using React Context (or a lightweight library like Zustand).
The Global State Object:
JavaScript
const useLearningState = create((set) => ({
  currentStudentId: "student-uuid-123", // Hardcoded for hackathon demo
  currentActivityId: "mcq-python-scope-01", 
  currentScreenContent: "Question: What is the output of print(x) outside the function?",
  
  // Updates when the user navigates the main screen
  setScreenContent: (content) => set({ currentScreenContent: content }),
}));
4.3 The "Floating Co-Pilot" Component
The chat widget is not a standard, disconnected chatbot. When the student types a message, the frontend intercepts it and packages it with the global state before sending it to the FastAPI backend.
The API Payload (What goes to FastAPI):
JSON
{
  "student_id": "student-uuid-123",
  "user_query": "I don't get why option C is wrong.",
  "current_context": "Question: What is the output of print(x) outside the function? Options: A, B, C, D."
}
Because the backend receives the student_id (to query historical database context) AND the current_context (what the user is looking at right now), the AI's response feels magically intuitive.
4.4 Rendering the Agentic Workflow (Demo Magic)
Judges love transparency in AI. Since LangGraph flows through multiple sequential nodes (Reasoner → Analyzer → Judge → Tutor → Architect), returning a loading spinner for 5 seconds is bad UX.
Instead, the React frontend displays dynamic status updates to show the "brain" working:
UX Flow for a Message Request:
1.	0.0s: Student hits send.
0.5s: UI displays: 🧠 Extracting logical steps... (Reasoner)
2.0s: UI displays: 📊 Analyzing reasoning pattern... (Explanation Analyzer)
3.5s: UI displays: ⚖️ Verifying against known misconceptions... (Judge)
4.5s: UI displays: ✍️ Drafting personalized feedback... (Tutor)
5.0s: UI displays: 🏗️ Generating verification question... (Architect)
5.5s: The final Markdown text and MCQ stream into the chat window.
Implementation Note: FastAPI can stream these status flags via Server-Sent Events (SSE) or WebSockets before sending the final text payload.
4.5 Rendering the Dynamic MCQ (The Assessment Tool)
When the backend's Assessment Architect generates a diagnostic MCQ to test if the student learned from the feedback, the frontend renders it as an interactive card inside the chat flow.
Tailwind Component Logic:
•	Render the Question text prominently (text-lg font-semibold text-slate-800).
•	Map through the distractors and correct_answer arrays to render clickable buttons (hover:bg-blue-50 transition-colors).
•	On Click:
o	If correct: Trigger a green success state, fire an API call to FastAPI to update the Supabase RL state to resolved, and display a congratulatory message.
o	If incorrect: The exact mapped_misconception_id tied to that distractor is sent back into the LangGraph pipeline, and the Tutor Node provides immediate, hyper-specific feedback on why that exact distractor was a trap.



Part 5: Complete System Workflow & Data Flow Architecture
To understand the true power of the Context-Aware AI Co-Pilot, we must trace the lifecycle of a single user interaction. The system operates as a continuous Reinforcement Learning loop, seamlessly integrating the React frontend, the FastAPI orchestrator, the Supabase dual-database engine, and the LangGraph state-based processing pipeline.
5.1 The High-Level Architecture Diagram
Here is how the components are physically wired together to enable the RL feedback loop:
Plaintext
[ React Frontend / Floating UI ] 
       │      ▲               ▲
  (1)  │      │ (5)           │ (6. User Feedback / Reward)
       ▼      │               │
[ FastAPI Backend Orchestrator & RL Engine ] 
       │      │               │
  (2)  ├──► [ Supabase (pgvector) ] --> Retrieves Top-3 Common Misconceptions (MiRAGE)
       │ 
  (3)  ├──► [ Supabase (PostgreSQL) ] --> Retrieves Student's Error Pattern & RL Policy Table
       │
  (4)  └──► [ LangGraph StateGraph + Groq API ]
               ├─► reasoner_node (Logic Extraction)
               ├─► explanation_analyzer_node (Reasoning Analysis)
               ├─► judge_node (Misconception Verification)
               ├─► tutor_node (Generates Feedback + RL's Predicted Weakness)
               └─► architect_node (Generates Assessment MCQ)
5.2 Anatomy of a Request: The Execution Loop
Let’s trace exactly what happens when a student repeatedly struggles and submits a flawed explanation.
Step 1: The Trigger (Frontend $\rightarrow$ Backend)
The student types their reasoning into the Floating Co-Pilot window. The React frontend packages this text, along with the student_id and the current_screen_context, and sends it to the FastAPI backend.
Step 2: Context & Pattern Gathering (Backend $\leftrightarrow$ Supabase)
FastAPI receives the payload and fires two asynchronous database queries:
•	The Baseline Query (MiRAGE Retrieval): It embeds the student's text, searches the pgvector table, and retrieves the Top-3 closest mathematical/logical fallacies.
•	The Memory Query: It checks the relational users table to fetch the student's recent error history (e.g., "This student just got two other Loop questions wrong").
Step 3: The RL Diagnostic Prediction ($\epsilon$-Greedy Policy)
Before calling the LLM, the FastAPI backend acts as the RL Engine. It looks at the student's error pattern and checks the rl_diagnostic_policy table.
•	Exploitation (90% of the time): It selects the fundamental weakness with the highest confidence score for this pattern (e.g., "Missing concept: Variable Initialization").
•	Exploration (10% of the time): It randomly selects a different fundamental topic to test a new hypothesis.
Step 4: LangGraph State Pipeline Execution (Backend ↔ LangGraph + Groq)
FastAPI compiles the retrieved fallacies and the RL Engine's predicted weakness into the initial state for the diagnostic_graph. The graph executes the 5-node pipeline sequentially via the Groq API:
1.	The reasoner_node extracts the student's step-by-step logic.
2.	The explanation_analyzer_node processes and analyzes the extracted reasoning.
3.	The judge_node verifies this logic against the MiRAGE vector fallacies to confirm the exact error in the current question.
4.	The tutor_node drafts the response. Because it was injected with the RL prediction, it writes: "You made a scope error here. But looking at your recent questions, I'm noticing a pattern. Are you struggling with the fundamental concept of Variable Initialization? Should we review that?"
5.	The architect_node generates a diagnostic MCQ based on the misconception verdict.
Step 5: The Response (Backend $\rightarrow$ Frontend)
FastAPI streams this highly personalized, intuitive message back to the React frontend. The UI displays the message along with two interactive feedback buttons: [Yes, let's review] and [No, I understand it].
Step 6: Human-in-the-Loop Reward Update (The Learning Math)
The student clicks a button. This triggers a silent POST request back to FastAPI containing the Reward.
•	If "Yes" (Reward = +10): The AI guessed correctly.
•	If "No" (Reward = -10): The AI guessed incorrectly.
FastAPI applies the learning rate formula ($Q_{new} = Q_{old} + \alpha(R - Q_{old})$) and updates the confidence_score in Supabase. The system instantly learns from the student and adapts its future diagnostic strategy.
________________________________________
5.3 Why This Architecture Wins (The Pitch to Judges)
If a judge asks, "Why did you build it this way instead of just sending the prompt to ChatGPT?" you answer with this:
"A standard LLM wrapper is stateless and prone to hallucination. Our architecture solves the two biggest problems in AI education: Accuracy and Adaptability.
First, by using Supabase pgvector (MiRAGE), we mathematically restrict the AI from diagnosing fake concepts—it can only classify errors based on verified, educational truths.
Second, we use an Epsilon-Greedy Reinforcement Learning algorithm to track error patterns over time. Instead of relying on a slow, expensive LLM to guess a student's fundamental weakness, our RL engine mathematically predicts it, and uses Human-in-the-Loop feedback to instantly update its policy. It gives us the adaptive power of machine learning without the heavy latency of neural network inference, making our Co-Pilot incredibly fast, collaborative, and context-aware."



Part 6: The Reinforcement Learning (RL) Engine (Contextual Bandits)
While CrewAI and the MiRAGE Vector DB excel at diagnosing a single answer in a vacuum, they lack long-term intuition. The Reinforcement Learning Engine provides this intuition. It acts as a pattern-recognizer, looking at a student's history of errors to predict hidden fundamental weaknesses, and uses Human-in-the-Loop (HITL) feedback to mathematically optimize its diagnostic accuracy over time.
6.1 Algorithmic Choice: Why Contextual Bandits?
For a real-time tutoring system with instant user feedback, standard Deep Q-Networks (DQN) are computationally wasteful and over-engineered. Because the reward in our system is immediate (the student says "Yes, that helps" or "No, I know that"), we implement a Contextual Bandit algorithm with an $\epsilon$-greedy policy.
This is the same lightweight, highly efficient RL architecture used by recommendation engines (like Netflix or YouTube) to balance exploiting known successful patterns with exploring new ones.
6.2 Mathematical Formulation (State, Action, Reward)
We define our RL environment strictly:
•	State ($S$): The student’s recent cognitive error pattern.
o	Represented as: A hashed string of their last 3 MiRAGE misconception IDs (e.g., hash(ScopeError -> SyntaxError -> ScopeError)).
•	Action ($A$): The AI's diagnostic hypothesis.
o	Example: The AI suggests, "Based on your pattern, you might be missing the fundamentals of Variable Initialization. Should we review that?"
•	Reward ($R$): The immediate Human-in-the-Loop feedback.
o	$R = +10$: The student clicks "Yes, let's review." (The hypothesis was correct).
o	$R = -10$: The student clicks "No, I know that." (The hypothesis was incorrect).
6.3 The $\epsilon$-Greedy Policy (Exploration vs. Exploitation)
When a pattern is detected, the FastAPI backend must choose which fundamental topic to suggest. It uses an $\epsilon$-greedy approach:
•	Exploitation ($1 - \epsilon$, ~90% of the time): The algorithm queries the Supabase rl_diagnostic_policy table and selects the Action (topic) with the highest confidence_score (Q-value) for that specific State.
•	Exploration ($\epsilon$, ~10% of the time): The algorithm ignores the database and suggests a random related topic. This ensures the AI doesn't get permanently stuck in a local optima and continues testing new pedagogical hypotheses.
6.4 The Q-Value Update Rule (The Learning Math)
When the student provides feedback, the backend recalculates the confidence score for that specific State-Action pair using an exponential moving average update rule:
$$Q_{new} = Q_{old} + \alpha (R - Q_{old})$$
•	$Q_{new}$: The updated confidence score saved to Supabase.
•	$Q_{old}$: The previous confidence score.
•	$\alpha$: The Learning Rate (set to $0.2$), dictating how aggressively the AI updates its beliefs based on new evidence.
•	$R$: The Reward ($+10$ or $-10$).
6.5 FastAPI Implementation Snippet
This mathematical model translates into incredibly fast, lightweight Python code in our FastAPI backend:
Python
def update_rl_policy(pattern_hash: str, suggested_topic: str, student_feedback: bool):
    # 1. Fetch current Q-value from Supabase
    response = supabase.table('rl_diagnostic_policy') \
        .select('confidence_score') \
        .eq('pattern_hash', pattern_hash) \
        .eq('predicted_topic', suggested_topic).execute()
    
    Q_old = response.data[0]['confidence_score'] if response.data else 0.0
    
    # 2. Determine Reward
    R = 10 if student_feedback else -10
    
    # 3. Apply the Learning Rule
    alpha = 0.2
    Q_new = Q_old + alpha * (R - Q_old)
    
    # 4. Upsert the new Q-value back to Supabase
    supabase.table('rl_diagnostic_policy').upsert({
        'pattern_hash': pattern_hash,
        'predicted_topic': suggested_topic,
        'confidence_score': round(Q_new, 3)
    }).execute()
6.6 The Value Proposition (The Pitch)
"Judges, most AI tutors are arrogant; they assume their diagnosis is always right. We built our Reinforcement Learning engine to be collaborative.
By utilizing a Contextual Bandit algorithm, our AI recognizes error patterns and predicts underlying weaknesses. But if the AI is wrong, the student can explicitly reject the diagnosis. The RL engine registers this as a negative reward, instantly applies the update rule to its Q-value, and stops bothering the student with redundant fundamentals. The LangGraph pipeline ensures each reasoning step is transparent and modular, making it easy to debug and improve individual nodes. The AI mathematically learns the student's actual cognitive profile through conversation, making it a highly empathetic, adaptive, and mathematically rigorous co-pilot."

