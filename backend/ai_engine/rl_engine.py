import random
from backend.database.supabase_client import get_supabase_client

supabase = get_supabase_client()

EPSILON = 0.10  # 10% exploration

def get_rl_prediction(pattern_hash: str) -> str:
    """Implement Epsilon-Greedy Policy to predict the next area of weakness."""
    if random.random() < EPSILON:
        # Exploration: Pick a random topic (in a real system, from a curated list of topics)
        topics = ["Variable Initialization", "Loop Conditions", "Scope Error", "Syntax Fundamentals"]
        return random.choice(topics)
    else:
        # Exploitation: Get the highest confidence_score for this pattern
        try:
            response = supabase.table('rl_diagnostic_policy') \
                .select('predicted_topic', 'confidence_score') \
                .eq('pattern_hash', pattern_hash) \
                .order('confidence_score', desc=True) \
                .limit(1) \
                .execute()
            
            if response.data:
                return response.data[0]['predicted_topic']
        except Exception as e:
            print(f"RL fetch error: {e}")
            
        # Fallback if no history
        return "Variable Initialization"

def get_knowledge_graph_predictions(failed_topic: str) -> list:
    """Check the curriculum knowledge graph for topics that might fail downstream."""
    if not failed_topic or failed_topic == "None":
        return []
    
    try:
        # Fetch dependent topics from the knowledge graph
        response = supabase.table('curriculum_knowledge_graph') \
            .select('dependent_topic') \
            .eq('prerequisite_topic', failed_topic).execute()
        
        if response.data:
            return [row['dependent_topic'] for row in response.data]
    except Exception as e:
        print(f"Knowledge Graph fetch error: {e}")
        
    return []

def update_rl_policy(pattern_hash: str, suggested_topic: str, student_feedback: bool) -> float:
    """
    Q_{new} = Q_{old} + alpha * (R - Q_{old})
    """
    try:
        # 1. Fetch current Q-value from Supabase
        response = supabase.table('rl_diagnostic_policy') \
            .select('confidence_score') \
            .eq('pattern_hash', pattern_hash) \
            .eq('predicted_topic', suggested_topic).execute()
        
        Q_old = float(response.data[0]['confidence_score']) if response.data else 0.0
        
        # 2. Determine Reward
        R = 10.0 if student_feedback else -10.0
        
        # 3. Apply the Learning Rule
        alpha = 0.2
        Q_new = Q_old + alpha * (R - Q_old)
        
        # 4. Upsert the new Q-value back to Supabase
        # Supabase generic upsert usually works on primary keys, so we ensure the table logic handles it.
        # Alternative: check if exists, then update or insert.
        # For simplicity, using upsert assuming on conflict unique constraint handles it.
        supabase.table('rl_diagnostic_policy').upsert({
            'pattern_hash': pattern_hash,
            'predicted_topic': suggested_topic,
            'confidence_score': round(Q_new, 3)
        }).execute()
        
        return Q_new
    except Exception as e:
        print(f"Error in update_rl_policy: {e}")
        return 0.0

def generate_pattern_hash(history: list) -> str:
    """
    Generates a simple hash from recent misconception history.
    history is a list of dictionary items representing past encounters.
    """
    if not history:
        return "default_pattern"
        
    error_topics = [item.get('common_misconceptions', {}).get('topic', 'unknown') for item in history]
    # create a simple concatenated string as hash for demonstration
    return "->".join(error_topics[:3])
