import React, { useEffect, useState, useRef, useMemo } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { useStore } from '../store/useStore';
import { 
  CheckCircle2, FileText, BrainCircuit, Target, 
  Plus, ThumbsUp, ThumbsDown, Sparkles 
} from 'lucide-react';

const API = () => import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function LearningHub() {
  const questions         = useStore((state) => state.questions);
  const currentQuestionIndex = useStore((state) => state.currentQuestionIndex);
  const fetchQuestions    = useStore((state) => state.fetchQuestions);
  const nextQuestion      = useStore((state) => state.nextQuestion);
  const setContext        = useStore((state) => state.setContext);
  const startTracking     = useStore((state) => state.startTracking);
  const studentId         = useStore((state) => state.studentId);

  // ── Detect-concepts state ──
  const [concepts, setConcepts]           = useState([]);
  const [markedConcepts, setMarkedConcepts] = useState([]);
  const [detecting, setDetecting]         = useState(false);

  // ── Assessment state ──
  const [correctIndex, setCorrectIndex]       = useState(null);
  const [selectedOptIndex, setSelectedOptIndex] = useState(null);
  const [isSubmitting, setIsSubmitting]       = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [followUpQuestions, setFollowUpQuestions] = useState([]);
  const [followUpAnswers, setFollowUpAnswers]   = useState({});
  const [studentExplanation, setStudentExplanation] = useState('');
  const [tutorFeedback, setTutorFeedback]     = useState(null);
  const [patternHash, setPatternHash]         = useState(null);
  const [predictedTopic, setPredictedTopic]   = useState(null);
  const [rlSubmitted, setRlSubmitted]         = useState(false);

  const feedbackRef = useRef(null);

  // Smarter, cleaner parsing: Groups text by the AI's natural headers into simple blocks
  const parsedFeedbackBlocks = useMemo(() => {
    if (!tutorFeedback) return [];
    
    const lines = tutorFeedback.split('\n').map(l => l.trim()).filter(Boolean);
    const result = [];
    let currentBlock = { header: 'Overview', lines: [] };
    
    lines.forEach(line => {
      // It's a header if it's short, doesn't end in punctuation, and isn't a bullet
      const isHeader = 
        line.startsWith('#') || 
        (line.startsWith('**') && line.endsWith('**') && line.length < 60) ||
        (line.length < 60 && !line.match(/[.!?:]$/) && !line.match(/^[-*0-9]/));
        
      if (isHeader) {
        if (currentBlock.lines.length > 0) {
          result.push(currentBlock);
        }
        currentBlock = { header: line.replace(/^[#*]+ */, '').replace(/\*+$/, ''), lines: [] };
      } else {
        currentBlock.lines.push(line);
      }
    });
    
    if (currentBlock.lines.length > 0) {
      result.push(currentBlock);
    }
    
    return result;
  }, [tutorFeedback]);

  // ── Fetch questions on mount ──
  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  const currentLevel = questions[currentQuestionIndex];

  // ── Update store context + pre-detect correct answer ──
  useEffect(() => {
    if (!currentLevel) return;
    setContext(currentLevel.content);
    startTracking();
    setConcepts([]);
    setMarkedConcepts([]);
    setSelectedOptIndex(null);
    setNeedsVerification(false);
    setFollowUpQuestions([]);
    setFollowUpAnswers({});
    setStudentExplanation('');
    setTutorFeedback(null);
    setPatternHash(null);
    setPredictedTopic(null);
    setRlSubmitted(false);
    setCorrectIndex(null);

    if (currentLevel.options?.length) {
      axios.post(`${API()}/api/detect-answer`, {
        question_content: currentLevel.content,
        options: currentLevel.options
      }).then(res => {
        setCorrectIndex(res.data.correct_index);
      }).catch(err => {
        console.warn('[detect-answer] failed, falling back to index 0', err);
        setCorrectIndex(0);
      });
    }
  }, [currentLevel]);

  // ── Scroll to feedback ──
  useEffect(() => {
    if (tutorFeedback && feedbackRef.current) {
      feedbackRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [tutorFeedback]);

  const handleNextPrompt = () => {
    nextQuestion();
  };

  const handleDetectConcepts = async () => {
    setDetecting(true);
    try {
      const res = await axios.post(`${API()}/api/detect-concepts`, {
        question_content: currentLevel.content
      });
      setConcepts(res.data.concepts || []);
    } catch (e) {
      console.error(e);
      setConcepts(['Analytical Reasoning', 'Formula Application', 'Problem Solving']);
    }
    setDetecting(false);
  };

  const handleAddWeakConcept = async (concept) => {
    if (markedConcepts.includes(concept)) return;
    try {
      await axios.post(`${API()}/api/weak-concepts`, {
        student_id: studentId,
        concepts: [concept]
      });
      setMarkedConcepts(prev => [...prev, concept]);
    } catch (e) {
      console.error(e);
      setMarkedConcepts(prev => [...prev, concept]);
    }
  };

  const handleSubmit = async (isFollowUpSubmit = false) => {
    setIsSubmitting(true);
    try {
      const tracking = useStore.getState();
      const metadata = {
        time_taken_seconds: tracking.startTime ? Math.floor((Date.now() - tracking.startTime) / 1000) : 0,
        switch_count: tracking.switchCount || 0,
        backspace_count: tracking.backspaceCount || 0,
      };
      const isCorrect = isFollowUpSubmit ? false : (selectedOptIndex === correctIndex);
      const userText  = isFollowUpSubmit
        ? '[Submitted verification answers]'
        : currentLevel.options[selectedOptIndex];

      const payload = {
        student_id: studentId,
        user_query: userText,
        current_context: currentLevel.content,
        metadata,
        is_correct: isCorrect,
        is_follow_up: isFollowUpSubmit,
        follow_up_answers: isFollowUpSubmit ? JSON.stringify(followUpAnswers) : null,
        student_explanation: studentExplanation.trim() || null,
        question_id: currentLevel.id,
        category: currentLevel.category
      };

      const { data } = await axios.post(`${API()}/api/analyze-response`, payload);

      if (data.needs_verification && !isFollowUpSubmit) {
        setNeedsVerification(true);
        setFollowUpQuestions(data.follow_up_questions || []);
      } else {
        setNeedsVerification(false);
        setTutorFeedback(data.feedback);
        if (data.pattern_hash)  setPatternHash(data.pattern_hash);
        if (data.predicted_topic) setPredictedTopic(data.predicted_topic);
      }
    } catch (e) {
      console.error(e);
      setTutorFeedback('Failed to reach the AI server. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRLFeedback = async (accepted) => {
    if (!patternHash || !predictedTopic || rlSubmitted) return;
    setRlSubmitted(true);
    try {
      await axios.post(`${API()}/api/rl-feedback`, {
        student_id: studentId,
        pattern_hash: patternHash,
        suggested_topic: predictedTopic,
        student_feedback: accepted
      });
    } catch (e) {
      console.error('[rl-feedback]', e);
    }
  };

  if (!currentLevel) {
    return (
      <div className="flex-1 p-10 flex items-center justify-center text-neutral-500 bg-[#0a0a0a]">
        Loading modules...
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-10 relative bg-[#0a0a0a] text-neutral-200 font-sans">
      <div className="max-w-4xl mx-auto space-y-8 pb-16">

        {/* Header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2 text-blue-400">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-widest">{currentLevel.category} Module</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              Evaluation #{currentQuestionIndex + 1}
            </h1>
          </div>
          <div className="hidden md:flex items-center gap-2 bg-[#111113] px-4 py-2 rounded-full border border-white/5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-sm font-medium text-neutral-400">
              Phase {currentQuestionIndex + 1}/{questions.length}
            </span>
          </div>
        </div>

        {/* Main card */}
        <div className="bg-[#111113] rounded-3xl p-6 md:p-8 border border-white/5 shadow-sm relative overflow-hidden">
          
          {/* Card header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl border border-blue-500/20 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">Current Challenge</h3>
            </div>
            
            <div className="flex items-center gap-3">
              {concepts.length === 0 && (
                <button
                  onClick={handleDetectConcepts}
                  disabled={detecting}
                  className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-sm font-medium rounded-xl border border-white/5 transition-colors flex items-center gap-2"
                >
                  <Target className="w-4 h-4" />
                  {detecting ? 'Detecting…' : 'Detect Concepts'}
                </button>
              )}
              <button
                onClick={handleNextPrompt}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl transition-colors shadow-lg shadow-blue-500/20"
              >
                Next Prompt →
              </button>
            </div>
          </div>

          {/* ── Detected concepts ── */}
          {concepts.length > 0 && (
            <div className="mb-8 p-5 bg-white/[0.02] rounded-2xl border border-white/5">
              <p className="text-xs text-neutral-500 uppercase tracking-wider font-bold mb-4">
                Core Concepts (Flag weaknesses)
              </p>
              <div className="flex flex-wrap gap-2.5">
                {concepts.map((concept, idx) => {
                  const marked = markedConcepts.includes(concept);
                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                        marked
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-neutral-900 border-white/5 text-neutral-300'
                      }`}
                    >
                      <span>{concept}</span>
                      {marked ? (
                        <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider rounded bg-amber-500/20 text-amber-300 font-bold">
                          Weak ✓
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAddWeakConcept(concept)}
                          className="p-1 rounded bg-neutral-800 hover:bg-amber-500/20 hover:text-amber-400 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Question body */}
          <div className="bg-[#0a0a0a] rounded-2xl p-6 md:p-8 border border-white/5 mb-8">
            <p className="text-lg md:text-xl text-neutral-200 leading-relaxed font-medium">
              {currentLevel.content}
            </p>
          </div>

          {/* ── Initial answer selection ── */}
          {!needsVerification && !tutorFeedback && (
            <div className="space-y-6">
              <h4 className="text-base font-semibold text-neutral-400 uppercase tracking-wider">Select your answer</h4>
              <div className="space-y-3">
                {currentLevel.options?.map((opt, i) => (
                  <label
                    key={i}
                    className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
                      selectedOptIndex === i
                        ? 'bg-blue-500/10 border-blue-500/50 text-blue-100'
                        : 'bg-[#111113] hover:bg-white/[0.02] border-white/5 hover:border-white/10 text-neutral-300'
                    }`}
                  >
                    <input
                      type="radio"
                      onChange={() => setSelectedOptIndex(i)}
                      checked={selectedOptIndex === i}
                      name="quiz"
                      className="mt-1 flex-shrink-0"
                    />
                    <span className="text-base leading-snug">{opt}</span>
                  </label>
                ))}
              </div>
              
              <div className="pt-4">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Optional: Explain your reasoning
                </label>
                <textarea
                  value={studentExplanation}
                  onChange={(event) => setStudentExplanation(event.target.value)}
                  rows={3}
                  placeholder="Describe how you solved this question..."
                  className="w-full rounded-xl border border-white/5 bg-neutral-900 p-4 text-sm text-neutral-200 placeholder-neutral-600 outline-none focus:border-blue-500/50 transition-colors"
                />
              </div>

              <button
                onClick={() => handleSubmit(false)}
                disabled={selectedOptIndex === null || isSubmitting || correctIndex === null}
                className="w-full py-4 bg-white hover:bg-neutral-200 text-black font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all text-base"
              >
                {isSubmitting ? 'Analysing Response...' : correctIndex === null ? 'Loading Verification...' : 'Submit Answer'}
              </button>
            </div>
          )}

          {/* ── Follow-up verification ── */}
          {needsVerification && (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6 md:p-8 animate-in fade-in slide-in-from-top-4">
              <div className="flex items-center gap-3 mb-4 text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
                <h4 className="text-xl font-bold">You got that right!</h4>
              </div>
              <p className="text-emerald-200/70 mb-8 leading-relaxed">
                To ensure complete conceptual understanding, please answer these quick verification questions.
              </p>
              
              {followUpQuestions.map((q, qi) => (
                <div key={qi} className="mb-8 last:mb-6">
                  <p className="text-base font-medium text-white mb-4">
                    {qi + 1}. {q.question}
                  </p>
                  <div className="space-y-2">
                    {q.options?.map((opt, oi) => (
                      <label
                        key={oi}
                        className="flex items-start gap-3 p-3.5 bg-neutral-900/50 border border-white/5 rounded-xl hover:border-emerald-500/30 cursor-pointer transition-colors"
                      >
                        <input
                          type="radio"
                          name={`fu-q-${qi}`}
                          className="mt-0.5 accent-emerald-500"
                          onChange={() =>
                            setFollowUpAnswers(prev => ({ ...prev, [`q${qi}`]: opt }))
                          }
                        />
                        <span className="text-sm text-neutral-300 leading-snug">{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              <div className="mb-6 pt-4 border-t border-emerald-500/20">
                <label className="mb-3 block text-xs font-semibold uppercase tracking-wide text-emerald-500">
                  Optional: Final Logic Check
                </label>
                <textarea
                  value={studentExplanation}
                  onChange={(event) => setStudentExplanation(event.target.value)}
                  rows={3}
                  placeholder="Explain why your final reasoning is correct..."
                  className="w-full rounded-xl border border-emerald-500/20 bg-neutral-900/50 p-4 text-sm text-neutral-200 placeholder-neutral-600 outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>

              <button
                onClick={() => handleSubmit(true)}
                disabled={Object.keys(followUpAnswers).length < followUpQuestions.length || isSubmitting}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-base shadow-lg shadow-emerald-500/20"
              >
                {isSubmitting ? 'Evaluating...' : 'Confirm Verification'}
              </button>
            </div>
          )}
        </div>

        {/* ── CLEAN PARAGRAPH BLOCKS ── */}
        {tutorFeedback && (
          <div
            ref={feedbackRef}
            className="mt-8 bg-[#111113] rounded-3xl border border-white/5 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4"
          >
            {/* Review header */}
            <div className="flex items-center gap-4 px-6 md:px-8 py-5 border-b border-white/5 bg-white/[0.02]">
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl border border-blue-500/20 flex items-center justify-center">
                <BrainCircuit className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Socratic AI Review</h3>
                <p className="text-xs text-neutral-500 font-medium uppercase tracking-widest mt-1">Diagnostic Analysis</p>
              </div>
            </div>

            <div className="px-6 md:px-8 py-8 flex flex-col gap-4">
              {parsedFeedbackBlocks.map((block, idx) => (
                <div key={idx} className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 shadow-sm">
                  {block.header && block.header !== 'Overview' && (
                    <h4 className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-4">
                      {block.header}
                    </h4>
                  )}
                  <div className="text-[15px] text-neutral-300 leading-relaxed prose prose-invert max-w-none prose-p:mb-3 prose-p:last:mb-0 prose-ul:my-3 prose-li:my-1">
                    <ReactMarkdown>{block.lines.join('\n\n')}</ReactMarkdown>
                  </div>
                </div>
              ))}
            </div>

            {/* ── RL Feedback section ── */}
            {predictedTopic && !rlSubmitted && (
              <div className="mx-6 md:mx-8 mb-8 p-6 bg-neutral-900/50 border border-white/5 rounded-2xl">
                <p className="text-[15px] text-neutral-300 mb-5 leading-relaxed">
                  <span className="font-semibold text-white">AI Diagnostics Flag:</span>{' '}
                  <span className="text-amber-400 font-medium">"{predictedTopic}"</span>
                  <br />
                  <span className="text-neutral-500 text-sm mt-1 block">Does this match where you felt stuck?</span>
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => handleRLFeedback(true)}
                    className="flex items-center justify-center flex-1 gap-2 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-white/5 rounded-xl text-sm font-semibold transition-colors"
                  >
                    <ThumbsUp className="w-4 h-4" /> Yes, accurate
                  </button>
                  <button
                    onClick={() => handleRLFeedback(false)}
                    className="flex items-center justify-center flex-1 gap-2 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-white/5 rounded-xl text-sm font-semibold transition-colors"
                  >
                    <ThumbsDown className="w-4 h-4" /> No, inaccurate
                  </button>
                </div>
              </div>
            )}

            {rlSubmitted && (
              <div className="mx-6 md:mx-8 mb-8 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center text-sm font-medium text-emerald-400">
                Response recorded. The engine will adapt future queries.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}