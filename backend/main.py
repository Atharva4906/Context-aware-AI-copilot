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
    AnswerDetectResponse,
    MisconceptionReviewResponse,
    GraphReviewResponse,
    GraphReviewCreateRequest,
    ClusterResponse,
    StudentMisconceptionResponse,
    UpdateMisconceptionStatusRequest,
    StudentRosterResponse
)
from database.supabase_client import (
    get_supabase_client,
    get_student_history,
    log_interaction,
    insert_question,
    get_active_misconceptions,
    insert_common_misconception,
    insert_misconception_review,
    get_misconception_reviews,
    update_misconception_review_status,
    upsert_student_misconception_state,
    insert_graph_review,
    get_graph_reviews,
    update_graph_review_status,
    insert_curriculum_edge,
    get_student_misconception_records,
    update_student_misconception_status,
    get_students
)
from ai_engine.rl_engine import (
    generate_pattern_hash,
    get_rl_prediction,
    update_rl_policy,
    get_knowledge_graph_predictions,
    generate_embedding,
    cosine_similarity
)
from ai_engine.graph_runner import run_diagnostic_crew, run_logic_verification_questions, run_concept_extraction
from ai_engine.graph_nodes import (
    detect_correct_answer,
    extract_topic_from_verdict,
    parse_question_from_text,
    propose_misconception_candidate,
    suggest_curriculum_edges
)

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
SIMILARITY_THRESHOLD = 0.78

@app.post("/api/analyze-response", response_model=AnalyzeResponse)
async def analyze_response(request: AnalyzeRequest):
    try:
        student_id = request.student_id
        user_query = request.user_query
        current_context = request.current_context
        student_explanation = (request.student_explanation or "").strip()

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

        # Build one combined analysis input so diagnosis can use answer text,
        # verification answers, metadata signals, and optional explanation together.
        metadata_text = ""
        if request.metadata:
            metadata_text = (
                f"time_taken_seconds={request.metadata.time_taken_seconds}, "
                f"switch_count={request.metadata.switch_count}, "
                f"backspace_count={request.metadata.backspace_count}"
            )

        analysis_parts = [f"Primary answer: {user_query}"]
        if request.is_follow_up and request.follow_up_answers:
            analysis_parts.append(f"Follow-up verification answers: {request.follow_up_answers}")
        if student_explanation:
            analysis_parts.append(f"Student explanation: {student_explanation}")
        if metadata_text:
            analysis_parts.append(f"Interaction metadata: {metadata_text}")
        analysis_input = "\n".join(analysis_parts)

        vector_results = []
        best_match = None
        best_score = 0.0
        try:
            query_text = f"{current_context}\nStudent response:\n{analysis_input}"
            query_embedding = generate_embedding(query_text)
            active_misconceptions = get_active_misconceptions()

            similarity_results = []
            for row in active_misconceptions:
                embedding = row.get('embedding')
                if not embedding:
                    continue
                score = cosine_similarity(query_embedding, embedding)
                similarity_results.append((score, row))

            similarity_results.sort(key=lambda item: item[0], reverse=True)
            vector_results = [row for score, row in similarity_results[:3]]

            if similarity_results:
                best_score, best_match = similarity_results[0]
        except Exception as e:
            print(f"Exception retrieving vector results: {e}")

        pattern_hash = generate_pattern_hash(history)
        predicted_rl_topic = get_rl_prediction(pattern_hash, category=request.category or "")

        # True answer extraction (for hackathon: pass context if answer unknown)
        # Ideally we fetch the real correct answer from DB using request.question_id
        true_answer = "Determined by logic."
        
        feedback_text, mcq_dict, misconception_verdict = run_diagnostic_crew(
            student_id=student_id,
            user_query=analysis_input,
            current_context=current_context,
            vector_results=vector_results,
            historical_struggle=historical_struggle,
            encounter_count=encounter_count,
            predicted_rl_topic=predicted_rl_topic,
            guessing_detected=guessing_detected,
            vulnerable_future_topics=vulnerable_future_topics,
            weak_concepts=weak_concepts,
            true_answer=true_answer,
            student_explanation=student_explanation
        )

        # Use the AI-detected misconception as the definitive topic for logs and UI
        # We extract a short label from the detailed verdict paragraph
        final_detected_topic = extract_topic_from_verdict(misconception_verdict, category=request.category or "")
        
        # If we have a strong similarity match, anchor to that known misconception topic
        close_match = best_match is not None and best_score >= SIMILARITY_THRESHOLD
        misconception_id = None
        if close_match:
            misconception_id = best_match.get('id')
            final_detected_topic = best_match.get('topic', final_detected_topic)

        # If there is no close match, ask LLM to propose a new misconception
        if not close_match:
            candidate = propose_misconception_candidate(analysis_input, current_context, misconception_verdict)
            if candidate.get('is_novel'):
                topic = (candidate.get('topic') or '').strip()
                flawed_logic = (candidate.get('flawed_logic_description') or '').strip()
                remedial = (candidate.get('remedial_strategy') or '').strip()
                if topic and flawed_logic and remedial:
                    candidate_embedding = generate_embedding(f"{topic}. {flawed_logic}")
                    new_row = insert_common_misconception(
                        topic=topic,
                        flawed_logic_description=flawed_logic,
                        remedial_strategy=remedial,
                        embedding=candidate_embedding
                    )
                    if new_row:
                        misconception_id = new_row.get('id')
                        final_detected_topic = topic
                        insert_misconception_review(
                            misconception_id=misconception_id,
                            similarity_score=best_score,
                            source_question_id=request.question_id,
                            source_student_id=student_id
                        )

        # If the AI couldn't find a specific topic, use the RL prediction as a secondary fallback
        if not final_detected_topic or "Conceptual" in final_detected_topic:
            final_detected_topic = predicted_rl_topic

        if misconception_id:
            upsert_student_misconception_state(student_id, misconception_id)

        # Suggest curriculum graph edges (pending review)
        if final_detected_topic:
            edges = suggest_curriculum_edges(final_detected_topic, request.category or "", current_context)
            for edge in edges:
                prereq = (edge.get('prerequisite_topic') or '').strip()
                dependent = (edge.get('dependent_topic') or '').strip()
                if prereq and dependent:
                    insert_graph_review(prereq, dependent, misconception_id)

        log_interaction(
            student_id=student_id, 
            user_query=analysis_input,
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

@app.get("/api/admin/misconception-reviews", response_model=MisconceptionReviewResponse)
async def list_misconception_reviews(status: Optional[str] = Query("pending")):
    try:
        items = []
        for row in get_misconception_reviews(status=status):
            details = row.get('common_misconceptions') or {}
            items.append({
                'review_id': row.get('review_id'),
                'status': row.get('status'),
                'similarity_score': row.get('similarity_score'),
                'source_question_id': row.get('source_question_id'),
                'source_student_id': row.get('source_student_id'),
                'created_at': row.get('created_at'),
                'misconception_id': row.get('misconception_id'),
                'topic': details.get('topic'),
                'flawed_logic_description': details.get('flawed_logic_description'),
                'remedial_strategy': details.get('remedial_strategy')
            })
        return MisconceptionReviewResponse(items=items)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/admin/misconception-reviews/{review_id}/approve")
async def approve_misconception_review(review_id: str):
    if not update_misconception_review_status(review_id, "approved"):
        raise HTTPException(status_code=500, detail="Failed to approve review.")
    return {"status": "approved"}

@app.post("/api/admin/misconception-reviews/{review_id}/reject")
async def reject_misconception_review(review_id: str):
    if not update_misconception_review_status(review_id, "rejected"):
        raise HTTPException(status_code=500, detail="Failed to reject review.")
    return {"status": "rejected"}

@app.get("/api/admin/graph-reviews", response_model=GraphReviewResponse)
async def list_graph_reviews(status: Optional[str] = Query("pending")):
    try:
        items = get_graph_reviews(status=status)
        return GraphReviewResponse(items=items)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/admin/graph-reviews")
async def create_graph_review(request: GraphReviewCreateRequest):
    if not request.prerequisite_topic.strip() or not request.dependent_topic.strip():
        raise HTTPException(status_code=400, detail="Both prerequisite and dependent topics are required.")
    res = insert_graph_review(
        request.prerequisite_topic.strip(),
        request.dependent_topic.strip(),
        request.source_misconception_id
    )
    return {"status": "queued", "review": res}

@app.post("/api/admin/graph-reviews/{review_id}/approve")
async def approve_graph_review(review_id: str):
    items = get_graph_reviews(status="pending")
    review = next((row for row in items if row.get('review_id') == review_id), None)
    if not review:
        raise HTTPException(status_code=404, detail="Review item not found.")

    inserted = insert_curriculum_edge(review.get('prerequisite_topic'), review.get('dependent_topic'))
    if not inserted:
        raise HTTPException(status_code=500, detail="Failed to insert curriculum edge.")

    if not update_graph_review_status(review_id, "approved"):
        raise HTTPException(status_code=500, detail="Failed to approve review.")
    return {"status": "approved"}

@app.post("/api/admin/graph-reviews/{review_id}/reject")
async def reject_graph_review(review_id: str):
    if not update_graph_review_status(review_id, "rejected"):
        raise HTTPException(status_code=500, detail="Failed to reject review.")
    return {"status": "rejected"}

@app.get("/api/admin/cluster-students", response_model=ClusterResponse)
async def cluster_students():
    try:
        records = get_student_misconception_records()
        clusters = {}

        for row in records:
            topic = None
            if row.get('common_misconceptions'):
                topic = row['common_misconceptions'].get('topic')
            if not topic:
                topic = "Unknown Misconception"

            student_name = None
            if row.get('users'):
                student_name = row['users'].get('name')
            student_name = student_name or row.get('student_id')

            entry = clusters.setdefault(topic, {
                'students': set(),
                'encounters': []
            })
            entry['students'].add(student_name)
            entry['encounters'].append(int(row.get('encounter_count') or 1))

        cluster_items = []
        for topic, data in clusters.items():
            student_count = len(data['students'])
            avg_encounter = sum(data['encounters']) / max(1, len(data['encounters']))
            if student_count >= 6 or avg_encounter >= 3:
                severity = "High"
            elif student_count >= 3 or avg_encounter >= 2:
                severity = "Medium"
            else:
                severity = "Low"

            cluster_items.append({
                'misconception': topic,
                'severity': severity,
                'studentCount': student_count,
                'students': sorted(list(data['students']))
            })

        cluster_items.sort(key=lambda item: item['studentCount'], reverse=True)
        return ClusterResponse(clusters=cluster_items)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/admin/student-misconceptions", response_model=StudentMisconceptionResponse)
async def list_student_misconceptions():
    try:
        rows = get_student_misconception_records()
        items = []
        for row in rows:
            topic = None
            if row.get('common_misconceptions'):
                topic = row['common_misconceptions'].get('topic')
            student_name = None
            if row.get('users'):
                student_name = row['users'].get('name')

            items.append({
                'state_id': row.get('state_id'),
                'student_id': row.get('student_id'),
                'student_name': student_name,
                'topic': topic,
                'status': row.get('status'),
                'encounter_count': row.get('encounter_count'),
                'last_triggered_at': row.get('last_triggered_at')
            })

        return StudentMisconceptionResponse(items=items)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/admin/student-misconceptions/{state_id}/status")
async def set_student_misconception_status(state_id: str, request: UpdateMisconceptionStatusRequest):
    status = request.status.strip().lower()
    if status not in {"unresolved", "reviewing", "resolved"}:
        raise HTTPException(status_code=400, detail="Invalid status.")
    if not update_student_misconception_status(state_id, status):
        raise HTTPException(status_code=500, detail="Failed to update status.")
    return {"status": status}

@app.get("/api/admin/students", response_model=StudentRosterResponse)
async def list_students():
    try:
        rows = get_students()
        return StudentRosterResponse(students=rows)
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
