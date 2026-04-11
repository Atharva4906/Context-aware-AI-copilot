import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { useStore } from '../store/useStore';
import SimulationView from './SimulationView';
import { 
  Sparkles, X, Send, AlertCircle, Bot, 
  ThumbsUp, ThumbsDown, Activity, Target, 
  Search, AlertTriangle, HelpCircle, Compass, Plus
} from 'lucide-react';

const CATEGORY_OPTIONS = ["Math", "Physics", "English", "Coding"];

// Helper function kept outside the component to prevent recreation on every render
const getSectionStyle = (title) => {
  const t = title.toLowerCase();
  if (t.includes('reflect') || t.includes('progress')) 
    return { icon: Activity, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' };
  if (t.includes('challenge') || t.includes('problem') || t.includes('current')) 
    return { icon: Target, color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' };
  if (t.includes('approach') || t.includes('analy')) 
    return { icon: Search, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' };
  if (t.includes('misconception') || t.includes('error') || t.includes('address')) 
    return { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' };
  if (t.includes('question') || t.includes('guid')) 
    return { icon: HelpCircle, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' };
  if (t.includes('forward') || t.includes('success') || t.includes('path')) 
    return { icon: Compass, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
  
  return { icon: Sparkles, color: 'text-neutral-300', bg: 'bg-neutral-800', border: 'border-white/10' };
};

export default function FloatingQuestionIngest() {
  const [pipWindow, setPipWindow] = useState(null);
  const [rawText, setRawText] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [category, setCategory] = useState('Math');
  
  const [parsed, setParsed] = useState(null);
  const [savedQuestionId, setSavedQuestionId] = useState(null);
  const [error, setError] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [correctIndex, setCorrectIndex] = useState(null);
  const [selectedOptIndex, setSelectedOptIndex] = useState(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [followUpQuestions, setFollowUpQuestions] = useState([]);
  const [followUpAnswers, setFollowUpAnswers] = useState({});
  const [studentExplanation, setStudentExplanation] = useState('');
  const [tutorFeedback, setTutorFeedback] = useState(null);
  const [simulationSpec, setSimulationSpec] = useState(null);
  const [patternHash, setPatternHash] = useState(null);
  const [predictedTopic, setPredictedTopic] = useState(null);
  const [rlSubmitted, setRlSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Detect-concepts state ──
  const [concepts, setConcepts] = useState([]);
  const [markedConcepts, setMarkedConcepts] = useState([]);
  const [detecting, setDetecting] = useState(false);
  
  const containerRef = useRef(null);
  const scrollRef = useRef(null);
  const studentId = useStore((state) => state.studentId);
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  // Parse the wall of text into distinct sections the moment it arrives
  const parsedFeedbackSections = useMemo(() => {
    if (!tutorFeedback) return [];
    
    const lines = tutorFeedback.split('\n');
    const parsedSections = [];
    let currentSection = { title: 'Feedback Overview', content: [] };

    lines.forEach(line => {
      const cleanLine = line.trim();
      if (!cleanLine) return; 

      const isHeader = cleanLine.startsWith('#') || 
                      (cleanLine.startsWith('**') && cleanLine.endsWith('**')) ||
                      (cleanLine.length < 50 && !cleanLine.match(/[.!?]$/) && !cleanLine.startsWith('-'));

      if (isHeader) {
        if (currentSection.content.length > 0) {
          parsedSections.push({ ...currentSection, content: currentSection.content.join('\n\n') });
        }
        currentSection = { 
          title: cleanLine.replace(/^[#*]+ */, '').replace(/\*+$/, ''), 
          content: [] 
        };
      } else {
        currentSection.content.push(cleanLine);
      }
    });

    if (currentSection.content.length > 0) {
      parsedSections.push({ ...currentSection, content: currentSection.content.join('\n\n') });
    }

    return parsedSections;
  }, [tutorFeedback]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [parsed, tutorFeedback, needsVerification, error, isParsing, isSubmitting, concepts]);

  useEffect(() => {
    return () => {
      if (pipWindow && !pipWindow.closed) pipWindow.close();
    };
  }, [pipWindow]);

  const openPiP = async () => {
    if (!('documentPictureInPicture' in window)) return;
    if (pipWindow && !pipWindow.closed) return;

    try {
      const pip = await window.documentPictureInPicture.requestWindow({ width: 400, height: 650 });
      pip.document.body.style.cssText = 'margin:0; padding:0; background:#171717; height:100vh; overflow:hidden; display:flex; flex-direction:column;';

      const container = pip.document.createElement('div');
      container.style.cssText = 'height:100vh; width:100%; display:flex; flex-direction:column;';
      pip.document.body.appendChild(container);
      containerRef.current = container;

      [...document.styleSheets].forEach((styleSheet) => {
        try {
          const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join('');
          const style = pip.document.createElement('style');
          style.textContent = cssRules;
          pip.document.head.appendChild(style);
        } catch (e) {
          if (!styleSheet.href) return;
          const link = pip.document.createElement('link');
          link.rel = 'stylesheet';
          link.href = styleSheet.href;
          pip.document.head.appendChild(link);
        }
      });

      pip.addEventListener('pagehide', () => {
        containerRef.current = null;
        setPipWindow(null);
      });

      setPipWindow(pip);
    } catch (error) {
      console.error('PiP open failed:', error);
    }
  };

  const handleParse = async () => {
    setError('');
    setParsed(null);
    setSavedQuestionId(null);
    setCorrectIndex(null);
    setSelectedOptIndex(null);
    setNeedsVerification(false);
    setFollowUpQuestions([]);
    setFollowUpAnswers({});
    setStudentExplanation('');
    setTutorFeedback(null);
    setSimulationSpec(null);
    setPatternHash(null);
    setPredictedTopic(null);
    setRlSubmitted(false);
    setConcepts([]);
    setMarkedConcepts([]);

    if (!rawText.trim()) return;

    setIsParsing(true);
    try {
      const response = await axios.post(`${apiUrl}/api/parse-question`, { raw_text: rawText, category });
      const parsedQuestion = response.data.parsed;
      setParsed(parsedQuestion);

      const saveResponse = await axios.post(`${apiUrl}/api/questions`, parsedQuestion);
      setSavedQuestionId(saveResponse.data?.id || null);

      if (parsedQuestion?.options?.length) {
        try {
          const detectResponse = await axios.post(`${apiUrl}/api/detect-answer`, {
            question_content: parsedQuestion.content,
            options: parsedQuestion.options
          });
          setCorrectIndex(detectResponse.data.correct_index);
        } catch (detectError) {
          setCorrectIndex(null);
        }
      }
    } catch (parseError) {
      setError(parseError?.response?.data?.detail || 'Parsing failed. Try again.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleDetectConcepts = async () => {
    if (!parsed?.content) return;
    setDetecting(true);
    try {
      const res = await axios.post(`${apiUrl}/api/detect-concepts`, {
        question_content: parsed.content
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
      await axios.post(`${apiUrl}/api/weak-concepts`, {
        student_id: studentId,
        subject: parsed?.category || category,
        concepts: [concept]
      });
      setMarkedConcepts(prev => [...prev, concept]);
    } catch (e) {
      console.error(e);
      setMarkedConcepts(prev => [...prev, concept]);
    }
  };

  const handleSubmitQuestion = async (event) => {
    event.preventDefault();
    if (!inputValue.trim()) return;
    setRawText(inputValue);
    setInputValue('');
    await handleParse();
  };

  const handleSubmit = async (isFollowUpSubmit = false) => {
    if (!parsed) return;
    setIsSubmitting(true);
    try {
      const tracking = useStore.getState();
      const metadata = {
        time_taken_seconds: tracking.startTime ? Math.floor((Date.now() - tracking.startTime) / 1000) : 0,
        switch_count: tracking.switchCount || 0,
        backspace_count: tracking.backspaceCount || 0,
      };
      const isCorrect = isFollowUpSubmit ? false : (selectedOptIndex === correctIndex);
      const userText = isFollowUpSubmit ? '[Submitted verification answers]' : parsed.options?.[selectedOptIndex] || '';

      const payload = {
        student_id: studentId,
        user_query: userText,
        current_context: parsed.content,
        metadata,
        is_correct: isCorrect,
        is_follow_up: isFollowUpSubmit,
        follow_up_answers: isFollowUpSubmit ? JSON.stringify(followUpAnswers) : null,
        student_explanation: studentExplanation.trim() || null,
        question_id: savedQuestionId,
        category: parsed.category
      };

      const { data } = await axios.post(`${apiUrl}/api/analyze-response`, payload);

      if (data.needs_verification && !isFollowUpSubmit) {
        setNeedsVerification(true);
        setFollowUpQuestions(data.follow_up_questions || []);
        setSimulationSpec(null);
      } else {
        setNeedsVerification(false);
        setTutorFeedback(data.feedback);
        setSimulationSpec(data.simulation || null);
        if (data.pattern_hash) setPatternHash(data.pattern_hash);
        if (data.predicted_topic) setPredictedTopic(data.predicted_topic);
      }
    } catch (submitError) {
      setTutorFeedback('Failed to reach the AI server. Please try again.');
      setSimulationSpec(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRLFeedback = async (accepted) => {
    if (!patternHash || !predictedTopic || rlSubmitted) return;
    setRlSubmitted(true);
    try {
      await axios.post(`${apiUrl}/api/rl-feedback`, {
        student_id: studentId,
        pattern_hash: patternHash,
        suggested_topic: predictedTopic,
        student_feedback: accepted
      });
    } catch (feedbackError) {
      console.error('[rl-feedback]', feedbackError);
    }
  };

  if (!pipWindow) {
    return (
      <button
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full border border-neutral-700 bg-neutral-900 px-5 py-3.5 text-sm font-medium text-white shadow-xl hover:bg-neutral-800 transition-all"
        onClick={openPiP}
      >
        <Sparkles className="h-4 w-4" /> Ask anything
      </button>
    );
  }

  if (!containerRef.current) return null;

  return createPortal(
    <div className="flex flex-col h-full w-full bg-[#171717] text-neutral-200 font-sans">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-[#171717] shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600/20 text-blue-400">
            <Bot className="h-4 w-4" />
          </div>
          <span className="font-semibold text-sm">AI Companion</span>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="bg-transparent text-xs text-neutral-400 outline-none cursor-pointer hover:text-white transition-colors"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option} value={option} className="bg-neutral-800 text-white">{option}</option>
            ))}
          </select>
          <button onClick={() => pipWindow.close()} className="text-neutral-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6">
        {!parsed && !isParsing && !rawText && (
          <div className="flex flex-col items-center justify-center h-full text-center opacity-50 space-y-3">
            <Sparkles className="h-8 w-8 text-neutral-500" />
            <p className="text-sm">How can I help you today?</p>
          </div>
        )}

        {rawText && (
          <div className="flex justify-end">
            <div className="bg-neutral-800 px-4 py-3 rounded-2xl rounded-tr-sm max-w-[90%] text-sm text-neutral-200 shadow-sm whitespace-pre-wrap">
              {rawText}
            </div>
          </div>
        )}

        {isParsing && (
          <div className="flex items-center gap-2 text-xs text-neutral-500 animate-pulse">
            <Bot className="h-4 w-4" /> Parsing question...
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 p-3 rounded-xl text-red-400 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {parsed && parsed.content && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs text-neutral-400 font-medium ml-1">
              <Bot className="h-4 w-4" /> Question Extracted
            </div>
            <div className="bg-neutral-800/50 border border-white/5 rounded-xl p-4 text-sm leading-relaxed">
              <p className="mb-4">{parsed.content}</p>

              {/* ── Detect Concepts UI (Compact) ── */}
              {!needsVerification && !tutorFeedback && (
                <div className="mb-4 border-b border-white/5 pb-4">
                  {concepts.length === 0 ? (
                    <button
                      onClick={handleDetectConcepts}
                      disabled={detecting || isSubmitting}
                      className="flex items-center gap-2 px-3 py-1.5 bg-neutral-800 hover:bg-blue-500/20 hover:text-blue-400 text-neutral-300 text-xs font-medium rounded-lg border border-white/10 transition-colors w-fit"
                    >
                      <Target className="w-3.5 h-3.5" />
                      {detecting ? 'Detecting...' : 'Detect Concepts'}
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">
                        Detected Concepts (Click + to flag as weak)
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {concepts.map((concept, idx) => {
                          const marked = markedConcepts.includes(concept);
                          return (
                            <div
                              key={idx}
                              className={`flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-md text-[11px] font-medium border transition-all ${
                                marked
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  : 'bg-neutral-800 border-white/10 text-neutral-300'
                              }`}
                            >
                              <span>{concept}</span>
                              {marked ? (
                                <span className="px-1 py-0.5 text-[9px] rounded border border-amber-500/30 bg-amber-500/10 text-amber-200">
                                  Weak ✓
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleAddWeakConcept(concept)}
                                  className="p-1 rounded bg-neutral-700 hover:bg-amber-500/30 hover:text-amber-300 transition-colors"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Options */}
              {parsed.options?.length > 0 ? (
                !needsVerification && !tutorFeedback && (
                  <div className="space-y-2">
                    {parsed.options.map((opt, idx) => (
                      <label
                        key={idx}
                        className={`flex items-start gap-3 rounded-lg border p-3 text-sm transition-all cursor-pointer ${
                          selectedOptIndex === idx ? 'border-blue-500/50 bg-blue-500/10 text-white' : 'border-white/10 hover:bg-neutral-800'
                        }`}
                      >
                        <input
                          type="radio"
                          onChange={() => setSelectedOptIndex(idx)}
                          checked={selectedOptIndex === idx}
                          name="pip-answer"
                          className="mt-0.5"
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                    <div className="mt-4">
                      <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                        Optional: Explain your reasoning
                      </label>
                      <textarea
                        value={studentExplanation}
                        onChange={(event) => setStudentExplanation(event.target.value)}
                        rows={3}
                        placeholder="How did you solve this?"
                        className="w-full rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 placeholder-neutral-500 outline-none focus:border-blue-500/40"
                      />
                    </div>
                    <button
                      onClick={() => handleSubmit(false)}
                      disabled={selectedOptIndex === null || isSubmitting || correctIndex === null}
                      className="mt-4 w-full rounded-lg bg-white py-2.5 text-sm font-semibold text-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-200 transition-colors"
                    >
                      {isSubmitting ? 'Analysing...' : correctIndex === null ? 'Preparing...' : 'Submit Answer'}
                    </button>
                  </div>
                )
              ) : (
                <div className="mt-3 text-xs text-neutral-500">No multiple-choice options detected.</div>
              )}
            </div>
          </div>
        )}

        {needsVerification && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs text-neutral-400 font-medium ml-1">
              <Bot className="h-4 w-4" /> Quick Check
            </div>
            <div className="bg-neutral-800/50 border border-emerald-500/20 rounded-xl p-4 text-sm">
              {followUpQuestions.map((q, qi) => (
                <div key={qi} className="mb-5 last:mb-0">
                  <p className="font-medium text-emerald-100 mb-3">{qi + 1}. {q.question}</p>
                  <div className="space-y-2">
                    {q.options?.map((opt, oi) => (
                      <label
                        key={oi}
                        className="flex items-start gap-3 rounded-lg border border-white/5 bg-neutral-900/50 p-2.5 text-sm transition-colors hover:border-emerald-500/30 cursor-pointer"
                      >
                        <input
                          type="radio"
                          name={`pip-fu-${qi}`}
                          className="mt-0.5 accent-emerald-500"
                          onChange={() => setFollowUpAnswers((prev) => ({ ...prev, [`q${qi}`]: opt }))}
                        />
                        <span className="text-neutral-300">{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <div className="mt-1">
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-emerald-300/80">
                  Optional: Explain your final reasoning
                </label>
                <textarea
                  value={studentExplanation}
                  onChange={(event) => setStudentExplanation(event.target.value)}
                  rows={3}
                  placeholder="Share how you reasoned through the final answer"
                  className="w-full rounded-lg border border-white/10 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 placeholder-neutral-500 outline-none focus:border-emerald-500/40"
                />
              </div>
              <button
                onClick={() => handleSubmit(true)}
                disabled={Object.keys(followUpAnswers).length < followUpQuestions.length || isSubmitting}
                className="mt-2 w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50 hover:bg-emerald-500 transition-colors"
              >
                {isSubmitting ? 'Evaluating...' : 'Confirm'}
              </button>
            </div>
          </div>
        )}

        {/* INLINE RENDERING OF STRUCTURED FEEDBACK */}
        {tutorFeedback && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs text-neutral-400 font-medium ml-1 mb-1">
              <Bot className="h-4 w-4" /> Diagnosis & Feedback
            </div>
            
            <div className="flex flex-col gap-3">
              {parsedFeedbackSections.map((section, idx) => {
                const Style = getSectionStyle(section.title);
                const Icon = Style.icon;

                return (
                  <div key={idx} className={`rounded-xl border ${Style.border} ${Style.bg} overflow-hidden`}>
                    <div className={`flex items-center gap-2 px-3 py-2 bg-black/20 border-b ${Style.border}`}>
                      <Icon className={`h-4 w-4 ${Style.color}`} />
                      <h4 className={`text-xs font-bold uppercase tracking-wider ${Style.color}`}>
                        {section.title}
                      </h4>
                    </div>
                    <div className="px-3 py-2.5 text-sm text-neutral-200 leading-relaxed prose prose-invert prose-p:my-1 prose-ul:my-1 max-w-none">
                      <ReactMarkdown>{section.content}</ReactMarkdown>
                    </div>
                  </div>
                );
              })}

              {simulationSpec && <SimulationView simulation={simulationSpec} />}
            </div>

            {predictedTopic && !rlSubmitted && (
              <div className="mt-4 rounded-xl border border-white/10 bg-neutral-800/40 p-3">
                <p className="text-xs text-neutral-400">
                  Did you struggle with <span className="text-white font-medium">"{predictedTopic}"</span>?
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => handleRLFeedback(true)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-md border border-white/10 bg-neutral-800 py-1.5 text-xs text-neutral-300 hover:bg-neutral-700 hover:text-white transition-colors"
                  >
                    <ThumbsUp className="h-3.5 w-3.5" /> Yes
                  </button>
                  <button
                    onClick={() => handleRLFeedback(false)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-md border border-white/10 bg-neutral-800 py-1.5 text-xs text-neutral-300 hover:bg-neutral-700 hover:text-white transition-colors"
                  >
                    <ThumbsDown className="h-3.5 w-3.5" /> No
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-white/10 bg-[#171717] shrink-0">
        <form onSubmit={handleSubmitQuestion} className="relative flex items-center">
          <input
            type="text"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            placeholder="Ask anything..."
            className="w-full rounded-full border border-white/10 bg-neutral-800 py-3 pl-4 pr-12 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isParsing}
            className="absolute right-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-white text-black disabled:opacity-50 disabled:bg-neutral-700 disabled:text-neutral-400 transition-colors"
          >
            <Send className="h-4 w-4 ml-0.5" />
          </button>
        </form>
      </div>
    </div>,
    containerRef.current
  );
}