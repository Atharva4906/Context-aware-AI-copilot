# Reinforcement Learning (RL) Engine Documentation

## 1. Overview & Purpose
While Multi-Agent Orchestration (CrewAI) and Vector Databases (MiRAGE) excel at diagnosing a single student response in a vacuum, they lack long-term intuition. The Reinforcement Learning Engine is the system's "memory." 

It acts as a pattern-recognizer, looking at a student's history of errors to predict hidden foundational weaknesses. It then uses **Human-in-the-Loop (HITL)** feedback to mathematically optimize its diagnostic accuracy over time, preventing the AI from getting stuck making incorrect assumptions about a student.

## 2. Algorithmic Choice: Contextual Bandits
For a real-time tutoring system with instant user feedback, standard Deep Q-Networks (DQN) are computationally wasteful and over-engineered. Because the reward in our system is immediate (the student explicitly clicks: *"Yes, that helps"* or *"No, I know that"*), we implemented a **Contextual Bandit algorithm** with an **$\epsilon$-greedy policy**.

This is a lightweight, highly efficient RL architecture—similar to recommendation engines like Netflix or YouTube—used to balance *exploiting* known successful patterns with *exploring* new pedagogical hypotheses.

## 3. Mathematical Formulation (Environment Design)
We strictly define the RL environment across three parameters:

*   **State ($S$):** The student’s recent cognitive error pattern.
    *   *Representation:* A hashed string of their last 3 sequential MiRAGE misconception IDs (e.g., `hash(ScopeError -> SyntaxError -> ScopeError)`).
*   **Action ($A$):** The AI's diagnostic hypothesis.
    *   *Example:* The AI suggests, "Based on your pattern, you might be missing the fundamentals of Variable Initialization. Should we review that?"
*   **Reward ($R$):** The immediate Human-in-the-Loop feedback from the UI.
    *   **$R = +10$**: The student clicks "Yes, let's review." (The hypothesis was correct).
    *   **$R = -10$**: The student clicks "No, I know that." (The hypothesis was incorrect).

## 4. The $\epsilon$-Greedy Policy (Exploration vs. Exploitation)
When an error pattern is detected, the backend must choose which foundational topic to prioritize. It uses an **$\epsilon$-greedy approach**:

*   **Exploitation ($1 - \epsilon$, ~90% of the time):** The algorithm queries the Supabase `rl_diagnostic_policy` table and selects the Action (topic) with the highest confidence score (Q-value) for that specific State.
*   **Exploration ($\epsilon$, ~10% of the time):** The algorithm ignores the database and suggests a random related topic. This ensures the AI doesn't get permanently stuck in a "local optima" and continues testing new pedagogical approaches.

## 5. The Q-Value Update Rule (The Learning Math)
When the student provides feedback, the backend recalculates the confidence score for that specific State-Action pair using an exponential moving average update rule:

$$Q_{new} = Q_{old} + \alpha (R - Q_{old})$$

*   **$Q_{new}$:** The new, finalized confidence score saved to Supabase.
*   **$Q_{old}$:** The previous confidence score.
*   **$\alpha$:** The Learning Rate (set to $0.2$), dictating how aggressively the AI updates its beliefs based on new evidence.
*   **$R$:** The explicitly calculated Reward ($+10$ or $-10$).

## 6. System Implementation (FastAPI)
The mathematical model translates into incredibly fast, lightweight Python code in the FastAPI backend, updating the Supabase tracking tables instantly without requiring heavy neural network inference delays.

```python
def update_rl_policy(pattern_hash: str, suggested_topic: str, student_feedback: bool):
    # 1. Fetch current Q-value from Supabase Policy Table
    response = supabase.table('rl_diagnostic_policy') \
        .select('confidence_score') \
        .eq('pattern_hash', pattern_hash) \
        .eq('predicted_topic', suggested_topic).execute()
    
    Q_old = response.data[0]['confidence_score'] if response.data else 0.0
    
    # 2. Determine Reward via Human-in-the-Loop Feedback
    R = 10 if student_feedback else -10
    
    # 3. Apply the Learning Rule (Exponential Moving Average)
    alpha = 0.2
    Q_new = Q_old + alpha * (R - Q_old)
    
    # 4. Upsert the newly calculated Q-value back to Supabase
    supabase.table('rl_diagnostic_policy').upsert({
        'pattern_hash': pattern_hash,
        'predicted_topic': suggested_topic,
        'confidence_score': round(Q_new, 3)
    }).execute()
```

## 7. The Core Advantage
Most AI educational tools assume their diagnosis is always right. The Contextual Bandit engine forces Pragyantra to be **collaborative**. By using a negative reward penalty when the AI guesses incorrectly, the system explicitly "unlearns" bad assumptions about a student and stops bothering them with redundant foundational reviews, continuously refining an accurate profile of their cognitive health.
