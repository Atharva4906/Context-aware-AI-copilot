import random
from math import sqrt
from sentence_transformers import SentenceTransformer
from database.supabase_client import get_supabase_client

supabase = get_supabase_client()

_embedder = None

def _get_embedder() -> SentenceTransformer:
    global _embedder
    if _embedder is None:
        _embedder = SentenceTransformer("all-mpnet-base-v2")
    return _embedder

def generate_embedding(text: str) -> list:
    """Generate a 768-dim embedding for similarity matching."""
    if not text:
        return []
    try:
        embedder = _get_embedder()
        vector = embedder.encode([text], normalize_embeddings=True)[0]
        return vector.tolist()
    except Exception as e:
        print(f"Embedding error: {e}")
        return []

def cosine_similarity(vec_a: list, vec_b: list) -> float:
    """Cosine similarity for normalized vectors."""
    if not vec_a or not vec_b or len(vec_a) != len(vec_b):
        return 0.0
    try:
        return sum(a * b for a, b in zip(vec_a, vec_b))
    except Exception:
        denom = (sqrt(sum(a * a for a in vec_a)) * sqrt(sum(b * b for b in vec_b)))
        return sum(a * b for a, b in zip(vec_a, vec_b)) / denom if denom else 0.0

EPSILON = 0.10  # 10% exploration rate

# Per-category topic pools — used for both exploration and smart fallback
CATEGORY_TOPICS = {
    "Math": [
        "Arithmetic Order of Operations", "Algebraic Manipulation", "Exponent Rules",
        "Fraction Arithmetic", "Equation Solving", "Proportional Reasoning",
        "Number System Confusion", "Sign Errors"
    ],
    "Coding": [
        "Variable Scope", "Loop Conditions", "Off-by-One Errors",
        "Recursion Base Case", "Pointer/Reference Confusion", "Type Coercion",
        "Function Return Values", "Syntax Fundamentals"
    ],
    "Science": [
        "Force vs Energy Confusion", "Newton's Law Application", "Conservation Laws",
        "Thermodynamics Misconceptions", "Electrical Circuit Analysis"
    ],
    "General": [
        "Logical Deduction", "Cause-Effect Reasoning", "Pattern Recognition",
        "Abstract Reasoning", "Critical Evaluation"
    ],
}
DEFAULT_TOPICS = [
    "Conceptual Foundation", "Abstract Reasoning", "Problem Decomposition",
    "Logical Deduction", "Pattern Recognition"
]

def _topics_for_category(category: str) -> list:
    if not category:
        return DEFAULT_TOPICS
    for key in CATEGORY_TOPICS:
        if key.lower() in category.lower():
            return CATEGORY_TOPICS[key]
    return DEFAULT_TOPICS


def get_rl_prediction(pattern_hash: str, category: str = "") -> str:
    """Epsilon-Greedy Policy — predict next area of weakness."""
    pool = _topics_for_category(category)
    if random.random() < EPSILON:
        # Exploration: pick a category-aware random topic
        return random.choice(pool)
    else:
        # Exploitation: fetch the highest-confidence entry for this pattern
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

        # Fallback: use deterministic selection from the pool so it's
        # at least category-relevant and never always the same string
        idx = hash(pattern_hash) % len(pool)
        return pool[idx]

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
