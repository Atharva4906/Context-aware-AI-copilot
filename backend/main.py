from typing import Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from models.schemas import (
    AnalyzeRequest, 
    AnalyzeResponse, 
    RLFeedbackRequest, 
    RLFeedbackResponse,
    QuestionModel,
    DashboardStatsResponse,
    HistoryResponse,
    HistoryItemModel
)
from database.supabase_client import get_supabase_client, get_student_history, log_interaction
from ai_engine.rl_engine import generate_pattern_hash, get_rl_prediction, update_rl_policy, get_knowledge_graph_predictions
from ai_engine.crew_runner import run_diagnostic_crew

app = FastAPI(title="Context-Aware AI Co-Pilot API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For hackathon MVP
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

supabase = get_supabase_client()

@app.post("/api/analyze-response", response_model=AnalyzeResponse)
async def analyze_response(request: AnalyzeRequest):
    try:
        student_id = request.student_id
        user_query = request.user_query
        current_context = request.current_context

        # 1a. Metadata / Guessing Detector
        guessing_detected = False
        if request.metadata:
            # Thresholds: either switches answers a lot, or spends almost no time, or conversely, a ton of time toggling
            if (request.metadata.switch_count and request.metadata.switch_count >= 3) or \
               (request.metadata.time_taken_seconds and request.metadata.time_taken_seconds < 3):
                guessing_detected = True

        # 2. Extract Context / Memory
        history = get_student_history(student_id)
        
        # Analyze history to find most encountered struggle for context
        historical_struggle = "None"
        encounter_count = 0
        if history:
            top_struggle = history[0] # assuming sorted by recent or count
            if 'common_misconceptions' in top_struggle and top_struggle['common_misconceptions']:
                historical_struggle = top_struggle['common_misconceptions'].get('topic', 'Unknown Topic')
            encounter_count = top_struggle.get('encounter_count', 1)

        # 2b. Curriculum Knowledge Graph Prediction
        vulnerable_future_topics = get_knowledge_graph_predictions(historical_struggle)

        # 3. Retrieve Baseline (Vector DB)
        # Using pgvector via rpc call. If we don't have the text-to-embedding setup locally here, 
        # we mock the retrieval for the hackathon MVP, or call Supabase RPC if we deploy edge function.
        # For this demonstration, we query common_misconceptions without vector match to just emulate retrieval
        vector_results = []
        try:
            # Query top 3 to emulate retrieval response
            res = supabase.table('common_misconceptions').select('*').limit(3).execute()
            if res.data:
                vector_results = res.data
        except Exception as e:
            print(f"Exception retrieving vector results: {e}")

        # 4. RL Predict Weakness
        pattern_hash = generate_pattern_hash(history)
        predicted_rl_topic = get_rl_prediction(pattern_hash)

        # 5. Execute CrewAI Multi-Agent Workflow
        feedback_text, mcq_dict = run_diagnostic_crew(
            student_id=student_id,
            user_query=user_query,
            current_context=current_context,
            vector_results=vector_results,
            historical_struggle=historical_struggle,
            encounter_count=encounter_count,
            predicted_rl_topic=predicted_rl_topic,
            guessing_detected=guessing_detected,
            vulnerable_future_topics=vulnerable_future_topics
        )

        # 6. Log interaction to memory WITH question id and category
        log_interaction(
            student_id=student_id, 
            user_query=user_query, 
            agent_response=feedback_text,
            question_id=request.question_id,
            category=request.category,
            predicted_misconception=predicted_rl_topic
        )

        # 7. Stream/Return Response
        return AnalyzeResponse(
            feedback=feedback_text,
            mcq=mcq_dict,
            predicted_topic=predicted_rl_topic,
            pattern_hash=pattern_hash
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/rl-feedback", response_model=RLFeedbackResponse)
async def submit_rl_feedback(request: RLFeedbackRequest):
    """
    Called when the student confirms or rejects the predicted fundamental weakness.
    """
    try:
        new_q_value = update_rl_policy(
            pattern_hash=request.pattern_hash,
            suggested_topic=request.suggested_topic,
            student_feedback=request.student_feedback
        )
        
        # Also mark the interaction log as resolved if it was a positive feedback
        if request.student_feedback:
            try:
                # Mark latest matching misconception as resolved
                res = supabase.table('interaction_logs') \
                    .select('log_id').eq('student_id', request.student_id) \
                    .eq('predicted_misconception', request.suggested_topic) \
                    .order('created_at', desc=True).limit(1).execute()
                if res.data:
                    supabase.table('interaction_logs').update({'is_resolved': True}).eq('log_id', res.data[0]['log_id']).execute()
            except Exception as inner_e:
                print(f"Error updating log resolution: {inner_e}")

        return RLFeedbackResponse(
            status="success",
            new_confidence_score=new_q_value
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/questions", response_model=list[QuestionModel])
async def get_questions(category: Optional[str] = Query(None)):
    """Fetch questions, optionally filtered by category."""
    try:
        query = supabase.table('questions').select('*')
        if category:
            query = query.eq('category', category)
        res = query.execute()
        return res.data if res.data else []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/student/{student_id}/dashboard", response_model=DashboardStatsResponse)
async def get_dashboard(student_id: str):
    """Fetch macro statistics for the Dashboard."""
    try:
        res = supabase.table('interaction_logs').select('category, is_resolved').eq('student_id', student_id).execute()
        logs = res.data if res.data else []
        
        total = len(logs)
        resolved = sum(1 for log in logs if log['is_resolved'])
        active = total - resolved
        
        category_counts = {}
        for log in logs:
            cat = log.get('category')
            if cat:
                if not log.get('is_resolved'):  # count unresolved
                    category_counts[cat] = category_counts.get(cat, 0) + 1
        
        most_struggled = "None yet"
        if category_counts:
            most_struggled = max(category_counts, key=category_counts.get)
            
        return DashboardStatsResponse(
            total_questions_answered=total,
            active_misconceptions=active,
            resolved_misconceptions=resolved,
            most_struggled_category=most_struggled
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/student/{student_id}/history", response_model=HistoryResponse)
async def get_history(student_id: str):
    """Fetch chronological interaction history and resolution state."""
    try:
        res = supabase.table('interaction_logs').select('*').eq('student_id', student_id).order('created_at', desc=True).execute()
        return HistoryResponse(history=res.data if res.data else [])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    # Make sure to run from root directory: python -m uvicorn backend.main:app --reload
    uvicorn.run(app, host="0.0.0.0", port=8000)
