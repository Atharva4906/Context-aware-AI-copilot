from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from backend.models.schemas import (
    AnalyzeRequest, 
    AnalyzeResponse, 
    RLFeedbackRequest, 
    RLFeedbackResponse
)
from backend.database.supabase_client import get_supabase_client, get_student_history, log_interaction
from backend.ai_engine.rl_engine import generate_pattern_hash, get_rl_prediction, update_rl_policy, get_knowledge_graph_predictions
from backend.ai_engine.crew_runner import run_diagnostic_crew

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

        # 5. Log interaction to memory
        log_interaction(student_id, user_query, feedback_text)

        # 6. Stream/Return Response
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
        
        return RLFeedbackResponse(
            status="success",
            new_confidence_score=new_q_value
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    # Make sure to run from root directory: python -m uvicorn backend.main:app --reload
    uvicorn.run(app, host="0.0.0.0", port=8000)
