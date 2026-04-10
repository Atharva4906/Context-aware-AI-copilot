import os
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
