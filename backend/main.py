from typing import Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from models.schemas import (
    AnalyzeRequest, 
    AnalyzeResponse, 
    RLFeedbackRequest, 
    RLFeedbackResponse,
    QuestionModel,
    ParsedQuestion,
    ParseQuestionRequest,
    ParseQuestionResponse,
    CreateQuestionRequest,
    CreateQuestionResponse,
    DashboardStatsResponse,
    HistoryResponse,
    HistoryItemModel,
    ConceptRequest,
    WeakConceptRequest,
    AnswerDetectRequest,
    AnswerDetectResponse
)
from database.supabase_client import get_supabase_client, get_student_history, log_interaction, insert_question
from ai_engine.rl_engine import generate_pattern_hash, get_rl_prediction, update_rl_policy, get_knowledge_graph_predictions
from ai_engine.graph_runner import run_diagnostic_crew, run_logic_verification_questions, run_concept_extraction
from ai_engine.graph_nodes import detect_correct_answer, extract_topic_from_verdict, parse_question_from_text

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

ALLOWED_CATEGORIES = {"Math", "Physics", "English", "Coding"}

@app.post("/api/analyze-response", response_model=AnalyzeResponse)
async def analyze_response(request: AnalyzeRequest):
    try:
        student_id = request.student_id
        user_query = request.user_query
        current_context = request.current_context

        # Stage 1: Is this a correct answer that needs verification questions?
        if request.is_correct and not request.is_follow_up:
            # We must generate 2 logic questions
            questions = run_logic_verification_questions(current_context)
            return AnalyzeResponse(
                needs_verification=True,
                follow_up_questions=questions
            )
            
        # Stage 2: Diagnostic Process (Either directly wrong, or follow-up from correct)
        
        # 1a. Metadata / Guessing Detector
        guessing_detected = False
        if request.metadata:
            if (request.metadata.switch_count and request.metadata.switch_count >= 3) or \
               (request.metadata.time_taken_seconds and request.metadata.time_taken_seconds < 3):
                guessing_detected = True

        # 2. Extract Context / Memory
        history = get_student_history(student_id)
        
        historical_struggle = "None"
        encounter_count = 0
        if history:
            top_struggle = history[0]
            if 'common_misconceptions' in top_struggle and top_struggle['common_misconceptions']:
                historical_struggle = top_struggle['common_misconceptions'].get('topic', 'Unknown Topic')
            encounter_count = top_struggle.get('encounter_count', 1)

        vulnerable_future_topics = get_knowledge_graph_predictions(historical_struggle)

        # Retrieve Weak Concepts from DB mapping
        weak_concepts = []
        try:
            res = supabase.table('users').select('weak_concepts').eq('student_id', student_id).single().execute()
            if res.data and 'weak_concepts' in res.data:
                weak_concepts = res.data['weak_concepts']
        except Exception as e:
            print(f"Error fetching weak_concepts: {e}")

        # If it was a follow up, combine queries
        if request.is_follow_up:
            user_query = f"Original guess: {user_query}. Follow up logic test: {request.follow_up_answers}"

        vector_results = []
        try:
            res = supabase.table('common_misconceptions').select('*').limit(3).execute()
            if res.data:
                vector_results = res.data
        except Exception as e:
            print(f"Exception retrieving vector results: {e}")

        pattern_hash = generate_pattern_hash(history)
        predicted_rl_topic = get_rl_prediction(pattern_hash, category=request.category or "")

        # True answer extraction (for hackathon: pass context if answer unknown)
        # Ideally we fetch the real correct answer from DB using request.question_id
        true_answer = "Determined by logic."
        
        feedback_text, mcq_dict, misconception_verdict = run_diagnostic_crew(
            student_id=student_id,
            user_query=user_query,
            current_context=current_context,
            vector_results=vector_results,
            historical_struggle=historical_struggle,
            encounter_count=encounter_count,
            predicted_rl_topic=predicted_rl_topic,
            guessing_detected=guessing_detected,
            vulnerable_future_topics=vulnerable_future_topics,
            weak_concepts=weak_concepts,
            true_answer=true_answer
        )

        # Use the AI-detected misconception as the definitive topic for logs and UI
        # We extract a short label from the detailed verdict paragraph
        final_detected_topic = extract_topic_from_verdict(misconception_verdict, category=request.category or "")
        
        # If the AI couldn't find a specific topic, use the RL prediction as a secondary fallback
        if not final_detected_topic or "Conceptual" in final_detected_topic:
            final_detected_topic = predicted_rl_topic

        log_interaction(
            student_id=student_id, 
            user_query=user_query, 
            agent_response=feedback_text,
            question_id=request.question_id,
            category=request.category,
            predicted_misconception=final_detected_topic
        )

        return AnalyzeResponse(
            needs_verification=False,
            feedback=feedback_text,
            mcq=mcq_dict,
            predicted_topic=final_detected_topic,
            pattern_hash=pattern_hash
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/detect-concepts")
async def detect_concepts(request: ConceptRequest):
    try:
        concepts = run_concept_extraction(request.question_content)
        return {"concepts": concepts}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/weak-concepts")
async def register_weak_concepts(request: WeakConceptRequest):
    try:
        # Fetch current
        res = supabase.table('users').select('weak_concepts').eq('student_id', request.student_id).single().execute()
        current_concepts = res.data.get('weak_concepts', []) if res.data else []
        
        # Merge unique
        for c in request.concepts:
            if c not in current_concepts:
                current_concepts.append(c)
                
        # Update
        supabase.table('users').update({'weak_concepts': current_concepts}).eq('student_id', request.student_id).execute()
        return {"status": "success", "weak_concepts": current_concepts}
    except Exception as e:
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

@app.post("/api/parse-question", response_model=ParseQuestionResponse)
async def parse_question(request: ParseQuestionRequest):
    try:
        raw_text = request.raw_text.strip()
        if not raw_text:
            raise HTTPException(status_code=400, detail="Question text is required.")

        category = request.category.strip()
        if category not in ALLOWED_CATEGORIES:
            raise HTTPException(status_code=400, detail="Invalid category.")

        parsed = parse_question_from_text(raw_text, category)
        if not parsed or not parsed.get("content"):
            raise HTTPException(status_code=422, detail="Unable to parse question content.")

        parsed["category"] = category

        options = parsed.get("options")
        if options is not None:
            normalized = [str(opt).strip() for opt in options if str(opt).strip()]
            parsed["options"] = normalized or None
        else:
            parsed["options"] = None

        correct_answer = parsed.get("correct_answer")
        if isinstance(correct_answer, str):
            parsed["correct_answer"] = correct_answer.strip() or None
        else:
            parsed["correct_answer"] = None

        return ParseQuestionResponse(parsed=ParsedQuestion(**parsed))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/questions", response_model=CreateQuestionResponse)
async def create_question(request: CreateQuestionRequest):
    try:
        category = request.category.strip()
        if category not in ALLOWED_CATEGORIES:
            raise HTTPException(status_code=400, detail="Invalid category.")

        content = request.content.strip()
        if not content:
            raise HTTPException(status_code=400, detail="Question content is required.")

        options = request.options
        if options is not None:
            options = [opt.strip() for opt in options if isinstance(opt, str) and opt.strip()]
            options = options or None

        row = insert_question(category=category, content=content, options=options)
        if not row:
            raise HTTPException(status_code=500, detail="Failed to save question.")

        return CreateQuestionResponse(
            id=row.get("id"),
            category=row.get("category", category),
            content=row.get("content", content),
            options=row.get("options", options),
            correct_answer=request.correct_answer
        )
    except HTTPException:
        raise
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

@app.post("/api/detect-answer", response_model=AnswerDetectResponse)
async def detect_answer(request: AnswerDetectRequest):
    """Use LLM to identify the correct answer option for a given question."""
    try:
        result = detect_correct_answer(request.question_content, request.options)
        return AnswerDetectResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    # Make sure to run from root directory: python -m uvicorn backend.main:app --reload
    uvicorn.run(app, host="0.0.0.0", port=8000)
