import os
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

url: str = os.environ.get("SUPABASE_URL", "")
key: str = os.environ.get("SUPABASE_KEY", "")

if not url or not key:
    print("Warning: SUPABASE_URL or SUPABASE_KEY is missing from environment variables.")
    # Initialize with dummy values so the script doesn't crash on import if missing
    supabase: Client = create_client("http://localhost:8000", "dummy_key")
else:
    supabase: Client = create_client(url, key)

def get_supabase_client() -> Client:
    return supabase

def get_student_history(student_id: str):
    """Fetch the student's recent error history."""
    try:
        response = supabase.table('student_misconception_state')\
            .select('misconception_id, encounter_count, status, common_misconceptions(topic, flawed_logic_description)')\
            .eq('student_id', student_id)\
            .order('last_triggered_at', desc=True)\
            .limit(5)\
            .execute()
        return response.data
    except Exception as e:
        print(f"Error fetching student history: {e}")
        return []

def log_interaction(student_id: str, user_query: str, agent_response: str, question_id: str = None, category: str = None, predicted_misconception: str = None):
    """Log the conversation with question context."""
    try:
        supabase.table('interaction_logs').insert({
            'student_id': student_id,
            'user_query': user_query,
            'agent_response': agent_response,
            'question_id': question_id,
            'category': category,
            'predicted_misconception': predicted_misconception,
            'is_resolved': False
        }).execute()
    except Exception as e:
        print(f"Error logging interaction: {e}")

def insert_question(category: str, content: str, options: list | None = None):
    """Insert a question into the questions table."""
    try:
        payload = {
            'category': category,
            'content': content,
            'options': options
        }
        res = supabase.table('questions').insert(payload).execute()
        return res.data[0] if res.data else None
    except Exception as e:
        print(f"Error inserting question: {e}")
        return None


def insert_question_answer_key(question_id: str, correct_answer: str | None = None, correct_answer_index: int | None = None):
    """Insert or update a question answer key mapped to an existing question id."""
    try:
        payload = {
            'question_id': question_id,
            'correct_answer': correct_answer,
            'correct_answer_index': correct_answer_index
        }
        res = supabase.table('question_answer_keys').upsert(payload, on_conflict='question_id').execute()
        return res.data[0] if res.data else None
    except Exception as e:
        print(f"Error inserting question answer key: {e}")
        return None


def get_question_answer_keys(question_ids: list[str]) -> dict:
    """Fetch answer keys for question ids, returned as {question_id: {correct_answer, correct_answer_index}}."""
    if not question_ids:
        return {}
    try:
        res = supabase.table('question_answer_keys') \
            .select('question_id,correct_answer,correct_answer_index') \
            .in_('question_id', question_ids).execute()
        rows = res.data if res.data else []
        return {
            row['question_id']: {
                'correct_answer': row.get('correct_answer'),
                'correct_answer_index': row.get('correct_answer_index')
            }
            for row in rows if row.get('question_id')
        }
    except Exception as e:
        print(f"Error fetching question answer keys: {e}")
        return {}

def get_pending_misconception_ids(statuses: list = None) -> set:
    """Fetch misconception IDs that are pending or rejected in review queue."""
    if statuses is None:
        statuses = ["pending", "rejected"]
    try:
        res = supabase.table('misconception_review_queue') \
            .select('misconception_id, status') \
            .execute()
        return {row['misconception_id'] for row in res.data if row.get('misconception_id') and row.get('status') in statuses}
    except Exception as e:
        print(f"Error fetching pending misconception IDs: {e}")
        return set()

def get_active_misconceptions() -> list:
    """Return misconceptions excluding pending/rejected review items."""
    try:
        res = supabase.table('common_misconceptions') \
            .select('id, topic, flawed_logic_description, remedial_strategy, embedding') \
            .execute()
        items = res.data if res.data else []
        blocked_ids = get_pending_misconception_ids()
        return [row for row in items if row.get('id') not in blocked_ids]
    except Exception as e:
        print(f"Error fetching misconceptions: {e}")
        return []

def insert_common_misconception(topic: str, flawed_logic_description: str, remedial_strategy: str, embedding: list):
    """Insert a misconception entry and return the inserted row."""
    try:
        safe_embedding = embedding if embedding else None
        res = supabase.table('common_misconceptions').insert({
            'topic': topic,
            'flawed_logic_description': flawed_logic_description,
            'remedial_strategy': remedial_strategy,
            'embedding': safe_embedding
        }).execute()
        return res.data[0] if res.data else None
    except Exception as e:
        print(f"Error inserting misconception: {e}")
        return None

def insert_misconception_review(misconception_id: str, similarity_score: float | None, source_question_id: str | None, source_student_id: str | None):
    """Create a review record for a new misconception."""
    try:
        payload = {
            'misconception_id': misconception_id,
            'status': 'pending',
            'similarity_score': similarity_score,
            'source_question_id': source_question_id,
            'source_student_id': source_student_id
        }
        res = supabase.table('misconception_review_queue').insert(payload).execute()
        return res.data[0] if res.data else None
    except Exception as e:
        print(f"Error inserting misconception review: {e}")
        return None

def get_misconception_reviews(status: str = 'pending') -> list:
    """Fetch misconception review items with joined misconception details."""
    try:
        res = supabase.table('misconception_review_queue') \
            .select('review_id,status,similarity_score,created_at,source_question_id,source_student_id,misconception_id,common_misconceptions(topic,flawed_logic_description,remedial_strategy)') \
            .eq('status', status).execute()
        return res.data if res.data else []
    except Exception as e:
        print(f"Error fetching misconception reviews: {e}")
        return []

def update_misconception_review_status(review_id: str, status: str) -> bool:
    """Approve or reject a misconception review item."""
    try:
        supabase.table('misconception_review_queue').update({
            'status': status,
            'reviewed_at': datetime.utcnow().isoformat()
        }).eq('review_id', review_id).execute()
        return True
    except Exception as e:
        print(f"Error updating misconception review status: {e}")
        return False

def upsert_student_misconception_state(student_id: str, misconception_id: str):
    """Increment encounter count and update status for a student's misconception."""
    try:
        res = supabase.table('student_misconception_state') \
            .select('state_id, encounter_count') \
            .eq('student_id', student_id) \
            .eq('misconception_id', misconception_id).execute()
        now = datetime.utcnow().isoformat()
        if res.data:
            current = int(res.data[0].get('encounter_count', 1))
            supabase.table('student_misconception_state').update({
                'encounter_count': current + 1,
                'status': 'unresolved',
                'last_triggered_at': now
            }).eq('state_id', res.data[0]['state_id']).execute()
        else:
            supabase.table('student_misconception_state').insert({
                'student_id': student_id,
                'misconception_id': misconception_id,
                'status': 'unresolved',
                'encounter_count': 1,
                'last_triggered_at': now
            }).execute()
    except Exception as e:
        print(f"Error upserting student misconception state: {e}")

def insert_graph_review(prerequisite_topic: str, dependent_topic: str, source_misconception_id: str | None = None):
    """Insert a curriculum graph edge into review queue."""
    try:
        # Avoid duplicates: check approved graph and pending review
        existing = supabase.table('curriculum_knowledge_graph') \
            .select('edge_id') \
            .eq('prerequisite_topic', prerequisite_topic) \
            .eq('dependent_topic', dependent_topic).execute()
        if existing.data:
            return None

        review_existing = supabase.table('curriculum_graph_review_queue') \
            .select('review_id') \
            .eq('prerequisite_topic', prerequisite_topic) \
            .eq('dependent_topic', dependent_topic) \
            .eq('status', 'pending').execute()
        if review_existing.data:
            return None

        payload = {
            'prerequisite_topic': prerequisite_topic,
            'dependent_topic': dependent_topic,
            'status': 'pending',
            'source_misconception_id': source_misconception_id
        }
        res = supabase.table('curriculum_graph_review_queue').insert(payload).execute()
        return res.data[0] if res.data else None
    except Exception as e:
        print(f"Error inserting graph review: {e}")
        return None

def get_graph_reviews(status: str = 'pending') -> list:
    """Fetch curriculum graph review items."""
    try:
        res = supabase.table('curriculum_graph_review_queue') \
            .select('review_id,prerequisite_topic,dependent_topic,status,created_at,source_misconception_id') \
            .eq('status', status).execute()
        return res.data if res.data else []
    except Exception as e:
        print(f"Error fetching graph reviews: {e}")
        return []

def update_graph_review_status(review_id: str, status: str) -> bool:
    """Approve or reject a curriculum graph review item."""
    try:
        supabase.table('curriculum_graph_review_queue').update({
            'status': status,
            'reviewed_at': datetime.utcnow().isoformat()
        }).eq('review_id', review_id).execute()
        return True
    except Exception as e:
        print(f"Error updating graph review status: {e}")
        return False

def insert_curriculum_edge(prerequisite_topic: str, dependent_topic: str):
    """Insert an approved curriculum graph edge if missing."""
    try:
        supabase.table('curriculum_knowledge_graph').upsert({
            'prerequisite_topic': prerequisite_topic,
            'dependent_topic': dependent_topic
        }).execute()
        return True
    except Exception as e:
        print(f"Error inserting curriculum edge: {e}")
        return False

def get_student_misconception_records() -> list:
    """Fetch student misconception state with topic and student name."""
    try:
        res = supabase.table('student_misconception_state') \
            .select('state_id,student_id,misconception_id,status,encounter_count,last_triggered_at,common_misconceptions(topic),users(name)') \
            .order('last_triggered_at', desc=True).execute()
        return res.data if res.data else []
    except Exception as e:
        print(f"Error fetching student misconceptions: {e}")
        return []

def update_student_misconception_status(state_id: str, status: str) -> bool:
    """Update status for a student misconception record."""
    try:
        supabase.table('student_misconception_state').update({
            'status': status
        }).eq('state_id', state_id).execute()
        return True
    except Exception as e:
        print(f"Error updating student misconception status: {e}")
        return False

def get_students() -> list:
    """Fetch student roster."""
    try:
        res = supabase.table('users').select('student_id,name,email,role').order('name').execute()
        return res.data if res.data else []
    except Exception as e:
        print(f"Error fetching students: {e}")
        return []
