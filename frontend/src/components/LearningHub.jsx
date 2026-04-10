import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { useStore } from '../store/useStore';
import { CheckCircle, FileText, BrainCircuit, Target, Check, Plus, ThumbsUp, ThumbsDown } from 'lucide-react';

const API = () => import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function LearningHub() {
  const questions         = useStore((state) => state.questions);
  const currentQuestionIndex = useStore((state) => state.currentQuestionIndex);
  const fetchQuestions    = useStore((state) => state.fetchQuestions);
  const nextQuestion      = useStore((state) => state.nextQuestion);
  const setContext        = useStore((state) => state.setContext);
  const startTracking     = useStore((state) => state.startTracking);
  const studentId         = useStore((state) => state.studentId);

  // ── Detect-concepts state ─────────────────────────────────────────────────
  const [concepts, setConcepts]           = useState([]);
  const [markedConcepts, setMarkedConcepts] = useState([]);
  const [detecting, setDetecting]         = useState(false);

  // ── Assessment state ──────────────────────────────────────────────────────
  const [correctIndex, setCorrectIndex]       = useState(null);   // learned via /detect-answer
  const [selectedOptIndex, setSelectedOptIndex] = useState(null);
  const [isSubmitting, setIsSubmitting]       = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [followUpQuestions, setFollowUpQuestions] = useState([]);
  const [followUpAnswers, setFollowUpAnswers]   = useState({});
  const [tutorFeedback, setTutorFeedback]     = useState(null);
  const [patternHash, setPatternHash]         = useState(null);
  const [predictedTopic, setPredictedTopic]   = useState(null);
  const [rlSubmitted, setRlSubmitted]         = useState(false);

  const feedbackRef = useRef(null);

  // ── Fetch questions on mount ──────────────────────────────────────────────
  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  const currentLevel = questions[currentQuestionIndex];

  // ── Update store context + pre-detect correct answer ─────────────────────
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
    setTutorFeedback(null);
    setPatternHash(null);
    setPredictedTopic(null);
    setRlSubmitted(false);
    setCorrectIndex(null);

    // Pre-fetch the correct answer via Groq so we can mark it accurately
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

  // ── Scroll to feedback when it appears ───────────────────────────────────
  useEffect(() => {
    if (tutorFeedback && feedbackRef.current) {
      feedbackRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [tutorFeedback]);

  // ── Next prompt: full reset ───────────────────────────────────────────────
  const handleNextPrompt = () => {
    nextQuestion();
    // All other resets handled by the currentLevel useEffect
  };

  // ── Detect concepts ───────────────────────────────────────────────────────
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

  // ── Add concept as weak concept (explicit button click) ───────────────────
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

  // ── Submit main answer ────────────────────────────────────────────────────
  const handleSubmit = async (isFollowUpSubmit = false) => {
    setIsSubmitting(true);
    try {
      const isCorrect = isFollowUpSubmit ? false : (selectedOptIndex === correctIndex);
      const userText  = isFollowUpSubmit
        ? '[Submitted verification answers]'
        : currentLevel.options[selectedOptIndex];

      const payload = {
        student_id: studentId,
        user_query: userText,
        current_context: currentLevel.content,
        metadata: {},
        is_correct: isCorrect,
        is_follow_up: isFollowUpSubmit,
        follow_up_answers: isFollowUpSubmit ? JSON.stringify(followUpAnswers) : null,
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

  // ── Submit RL Feedback ────────────────────────────────────────────────────
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
      <div className="flex-1 p-10 flex items-center justify-center text-slate-400">
        Loading modules...
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-10 relative">
      <div className="max-w-4xl mx-auto space-y-8 pb-16">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold tracking-widest text-cyan-500 uppercase mb-1">
              Testing Module • {currentLevel.category}
            </h2>
            <h1 className="text-4xl font-bold text-white">
              Concept Evaluation Test #{currentQuestionIndex + 1}
            </h1>
          </div>
          <div className="flex items-center gap-2 bg-slate-800/80 px-4 py-2 rounded-full border border-slate-700">
            <CheckCircle className="w-5 h-5 text-emerald-500" />
            <span className="text-sm font-medium text-slate-300">
              Phase {currentQuestionIndex + 1}/{questions.length}
            </span>
          </div>
        </div>

        {/* Main card */}
        <div className="glass-panel rounded-3xl p-8 relative overflow-hidden">
          <div className="absolute -top-32 -right-32 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Card header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/20 rounded-xl">
                <FileText className="w-6 h-6 text-cyan-400" />
              </div>
              <h3 className="text-2xl font-semibold text-slate-200">Current Challenge</h3>
            </div>
            <div className="flex items-center gap-3">
              {concepts.length === 0 && (
                <button
                  onClick={handleDetectConcepts}
                  disabled={detecting}
                  className="px-4 py-2 bg-slate-800 hover:bg-cyan-500/20 hover:text-cyan-400 text-slate-300 text-sm font-medium rounded-xl border border-slate-700 transition flex items-center gap-2"
                >
                  <Target className="w-4 h-4" />
                  {detecting ? 'Detecting…' : 'Detect Concepts'}
                </button>
              )}
              <button
                onClick={handleNextPrompt}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl border border-blue-500 transition"
              >
                Next Prompt →
              </button>
            </div>
          </div>

          {/* ── Detected concepts with explicit "Add" button ── */}
          {concepts.length > 0 && (
            <div className="mb-6 p-5 bg-slate-800/50 rounded-2xl border border-slate-700/50">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-4">
                Detected Concepts — click + to flag as weak
              </p>
              <div className="flex flex-wrap gap-3">
                {concepts.map((concept, idx) => {
                  const marked = markedConcepts.includes(concept);
                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-2 pl-3 pr-1 py-1.5 rounded-xl text-sm font-medium border transition-all ${
                        marked
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-slate-900 border-slate-700 text-slate-300'
                      }`}
                    >
                      <span>{concept}</span>
                      {marked ? (
                        <span className="px-2 py-0.5 text-xs rounded-lg bg-amber-500/30 text-amber-200 font-semibold">
                          Weak ✓
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAddWeakConcept(concept)}
                          title="Flag as weak concept"
                          className="p-1 rounded-lg bg-slate-700 hover:bg-amber-500/30 hover:text-amber-300 transition"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-slate-500 mt-3">
                Flagging weak concepts helps the AI personalise your feedback.
              </p>
            </div>
          )}

          {/* Question body */}
          <div className="bg-[#0f172a] rounded-2xl p-7 shadow-inner border border-slate-700/50 mb-6">
            <p className="text-lg text-slate-200 leading-relaxed m-0">
              {currentLevel.content}
            </p>
          </div>

          {/* ── Initial answer selection ── */}
          {!needsVerification && !tutorFeedback && (
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
              <h4 className="text-lg font-semibold text-white mb-4">Select your answer:</h4>
              <div className="space-y-3 mb-6">
                {currentLevel.options?.map((opt, i) => (
                  <label
                    key={i}
                    className={`flex items-start gap-4 p-4 rounded-xl border transition-colors cursor-pointer ${
                      selectedOptIndex === i
                        ? 'bg-blue-600/20 border-blue-500'
                        : 'hover:bg-slate-800 border-slate-700 hover:border-blue-500/50'
                    }`}
                  >
                    <input
                      type="radio"
                      onChange={() => setSelectedOptIndex(i)}
                      checked={selectedOptIndex === i}
                      name="quiz"
                      className="mt-1 flex-shrink-0"
                    />
                    <span className="text-slate-300">{opt}</span>
                  </label>
                ))}
              </div>
              <button
                onClick={() => handleSubmit(false)}
                disabled={selectedOptIndex === null || isSubmitting || correctIndex === null}
                className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:grayscale transition-all text-base"
              >
                {isSubmitting ? 'Analysing…' : correctIndex === null ? 'Preparing…' : 'Submit Answer'}
              </button>
            </div>
          )}

          {/* ── Follow-up verification ── */}
          {needsVerification && (
            <div className="bg-slate-800/80 border border-emerald-600/40 rounded-2xl p-7 shadow-lg animate-in fade-in slide-in-from-top-4">
              <div className="flex items-center gap-3 mb-4 text-emerald-400">
                <CheckCircle className="w-6 h-6" />
                <h4 className="text-lg font-bold">You got that right!</h4>
              </div>
              <p className="text-slate-300 mb-7 leading-relaxed">
                To make sure you understand the concept (not just a lucky guess), answer these two
                quick follow-up questions.
              </p>
              {followUpQuestions.map((q, qi) => (
                <div key={qi} className="mb-7">
                  <p className="text-sm font-semibold text-slate-200 mb-3">
                    {qi + 1}. {q.question}
                  </p>
                  <div className="space-y-2">
                    {q.options?.map((opt, oi) => (
                      <label
                        key={oi}
                        className="flex items-start gap-3 text-sm text-slate-300 p-3 bg-slate-900 border border-slate-700 rounded-xl hover:border-blue-500 cursor-pointer transition"
                      >
                        <input
                          type="radio"
                          name={`fu-q-${qi}`}
                          className="mt-1"
                          onChange={() =>
                            setFollowUpAnswers(prev => ({ ...prev, [`q${qi}`]: opt }))
                          }
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <button
                onClick={() => handleSubmit(true)}
                disabled={Object.keys(followUpAnswers).length < followUpQuestions.length || isSubmitting}
                className="w-full mt-2 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 transition-all text-base"
              >
                {isSubmitting ? 'Evaluating…' : 'Submit Verification'}
              </button>
            </div>
          )}

          {/* ── Socratic AI Review ── */}
          {tutorFeedback && (
            <div
              ref={feedbackRef}
              className="mt-8 bg-gradient-to-br from-slate-800/90 to-slate-900 rounded-3xl border border-cyan-500/30 shadow-2xl shadow-cyan-500/10 overflow-hidden animate-in fade-in slide-in-from-bottom-4"
            >
              {/* Review header */}
              <div className="flex items-center gap-4 px-8 py-5 border-b border-slate-700/60 bg-slate-800/60">
                <div className="p-2.5 bg-slate-900 border border-cyan-500/30 rounded-2xl">
                  <BrainCircuit className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-100">Socratic AI Review</h3>
                  <p className="text-xs text-cyan-400 font-medium mt-0.5">Context-aware personalised analysis</p>
                </div>
              </div>

              {/* Feedback body with proper prose formatting */}
              <div className="px-8 py-7">
                <div className="prose prose-invert prose-base max-w-none
                  prose-headings:text-slate-100 prose-headings:font-bold prose-headings:mb-3 prose-headings:mt-6
                  prose-p:text-slate-300 prose-p:leading-7 prose-p:mb-4
                  prose-strong:text-white prose-strong:font-semibold
                  prose-em:text-cyan-300 prose-em:not-italic
                  prose-li:text-slate-300 prose-li:leading-7 prose-li:mb-1
                  prose-ul:mb-4 prose-ol:mb-4 prose-ul:pl-5 prose-ol:pl-5
                  prose-code:text-cyan-300 prose-code:bg-slate-900/80 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
                  prose-blockquote:border-l-4 prose-blockquote:border-cyan-500 prose-blockquote:pl-4 prose-blockquote:text-slate-400 prose-blockquote:italic
                ">
                  <ReactMarkdown>{tutorFeedback}</ReactMarkdown>
                </div>
              </div>

              {/* ── RL Feedback section ── */}
              {predictedTopic && !rlSubmitted && (
                <div className="mx-8 mb-7 p-5 bg-slate-900/70 border border-slate-700 rounded-2xl">
                  <p className="text-sm text-slate-300 mb-4 leading-relaxed">
                    <span className="font-semibold text-white">AI predicted your core weakness:</span>{' '}
                    <span className="text-amber-300 font-medium">"{predictedTopic}"</span>
                    <br />
                    <span className="text-slate-400 text-xs mt-1 block">Was this diagnosis accurate?</span>
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleRLFeedback(true)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-sm font-semibold transition"
                    >
                      <ThumbsUp className="w-4 h-4" /> Yes, that's right
                    </button>
                    <button
                      onClick={() => handleRLFeedback(false)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-xl text-sm font-semibold transition"
                    >
                      <ThumbsDown className="w-4 h-4" /> No, it's off
                    </button>
                  </div>
                </div>
              )}

              {rlSubmitted && (
                <div className="mx-8 mb-7 p-4 bg-slate-900/50 border border-slate-700 rounded-2xl text-center text-sm text-slate-400">
                  ✓ Thanks for the feedback! The AI will refine its predictions.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
