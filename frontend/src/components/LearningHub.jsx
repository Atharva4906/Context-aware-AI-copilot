import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useStore } from '../store/useStore';
import { Play, Code, CheckCircle, FileText, BrainCircuit, Target, Check } from 'lucide-react';

export default function LearningHub() {
  const questions = useStore((state) => state.questions);
  const currentQuestionIndex = useStore((state) => state.currentQuestionIndex);
  const fetchQuestions = useStore((state) => state.fetchQuestions);
  const nextQuestion = useStore((state) => state.nextQuestion);
  const setContext = useStore((state) => state.setContext);
  const startTracking = useStore((state) => state.startTracking);
  const studentId = useStore((state) => state.studentId);
  const setTriggerDiagnosis = useStore((state) => state.setTriggerDiagnosis);

  const [concepts, setConcepts] = useState([]);
  const [markedConcepts, setMarkedConcepts] = useState([]);
  const [detecting, setDetecting] = useState(false);

  // Assessment State
  const [selectedOptIndex, setSelectedOptIndex] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [followUpQuestions, setFollowUpQuestions] = useState([]);
  const [followUpAnswers, setFollowUpAnswers] = useState({});
  const [tutorFeedback, setTutorFeedback] = useState(null);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const currentLevel = questions[currentQuestionIndex];

  useEffect(() => {
    if (currentLevel) {
      setContext(currentLevel.content);
      startTracking();
      setConcepts([]);
    }
  }, [currentLevel, setContext, startTracking]);

  const handleNextPrompt = () => {
    setSelectedOptIndex(null);
    setNeedsVerification(false);
    setFollowUpQuestions([]);
    setFollowUpAnswers({});
    setTutorFeedback(null);
    nextQuestion();
  };

  const handleDetectConcepts = async () => {
    setDetecting(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await axios.post(`${apiUrl}/api/detect-concepts`, {
        question_content: currentLevel.content
      });
      setConcepts(response.data.concepts || []);
    } catch (e) {
      console.error(e);
      setConcepts(["Analytical Reasoning", "Formula Application", "Problem Solving"]); // Fallback
    }
    setDetecting(false);
  };

  const handleMarkConcept = async (concept) => {
    if (markedConcepts.includes(concept)) return;
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      await axios.post(`${apiUrl}/api/weak-concepts`, {
        student_id: studentId,
        concepts: [concept]
      });
      setMarkedConcepts([...markedConcepts, concept]);
    } catch (e) {
      console.error(e);
      setMarkedConcepts([...markedConcepts, concept]);
    }
  };

  const handleSubmit = async (isFollowUpSubmit = false) => {
    setIsSubmitting(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      
      const isCorrect = selectedOptIndex === 0; // MVP mock matching
      const userText = isFollowUpSubmit ? "[Submitted verification]" : currentLevel.options[selectedOptIndex];
      
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

      const response = await axios.post(`${apiUrl}/api/analyze-response`, payload);
      const data = response.data;
      
      if (data.needs_verification && !isFollowUpSubmit) {
         setNeedsVerification(true);
         setFollowUpQuestions(data.follow_up_questions);
      } else {
         setNeedsVerification(false);
         setTutorFeedback(data.feedback);
      }
    } catch (e) {
      console.error(e);
      setTutorFeedback("Failed to reach the AI server. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentLevel) {
    return <div className="flex-1 p-10 flex items-center justify-center text-slate-400">Loading modules...</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto p-10 mt-4 relative">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold tracking-widest text-cyan-500 uppercase mb-1">Testing Module • {currentLevel.category}</h2>
            <h1 className="text-4xl font-bold text-white">Concept Evaluation Test #{currentQuestionIndex + 1}</h1>
          </div>
          <div className="flex items-center gap-2 bg-slate-800/80 px-4 py-2 rounded-full border border-slate-700">
             <CheckCircle className="w-5 h-5 text-emerald-500" />
             <span className="text-sm font-medium text-slate-300">Phase {currentQuestionIndex + 1}/{questions.length}</span>
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-8 relative overflow-hidden">
          <div className="absolute -top-32 -right-32 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-500/20 rounded-xl"><FileText className="w-6 h-6 text-cyan-400" /></div>
              <h3 className="text-2xl font-semibold text-slate-200">Current Challenge</h3>
            </div>
            <div className="flex items-center gap-3">
              {concepts.length === 0 && (
                <button onClick={handleDetectConcepts} disabled={detecting} className="px-4 py-2 bg-slate-800 hover:bg-cyan-500/20 hover:text-cyan-400 text-slate-300 text-sm font-medium rounded-xl border border-slate-700 transition flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  {detecting ? 'Detecting...' : 'Detect Concepts'}
                </button>
              )}
              <button onClick={handleNextPrompt} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl border border-blue-500 transition">
                Next Prompt &rarr;
              </button>
            </div>
          </div>

          {concepts.length > 0 && (
            <div className="mb-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-3">Detected Concepts in this Question:</p>
              <div className="flex flex-wrap gap-2">
                {concepts.map((concept, idx) => {
                  const marked = markedConcepts.includes(concept);
                  return (
                    <button 
                      key={idx} 
                      onClick={() => handleMarkConcept(concept)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition font-medium border ${marked ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'}`}
                    >
                      {marked ? <Check className="w-4 h-4" /> : null}
                      {concept}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-slate-500 mt-2">Click any concept you feel weak in to help the AI tailor your explanations.</p>
            </div>
          )}

          <div className="prose prose-invert prose-blue max-w-none">
            <div className="bg-[#0f172a] rounded-xl p-6 shadow-inner border border-slate-700/50 mb-8 relative">
              <p className="text-lg text-slate-300 leading-relaxed m-0">
                {currentLevel.content}
              </p>
            </div>

            {!needsVerification && !tutorFeedback && (
              <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
                <h4 className="text-lg font-semibold text-white mb-4">Select your answer:</h4>
                <div className="space-y-3 mb-6">
                  {currentLevel.options && currentLevel.options.map((opt, i) => (
                    <label key={i} className={`flex items-start gap-4 p-4 rounded-xl border transition-colors cursor-pointer ${selectedOptIndex === i ? 'bg-blue-600/20 border-blue-500' : 'hover:bg-slate-800 border-slate-700 hover:border-blue-500/50'}`}>
                      <input type="radio" onChange={() => setSelectedOptIndex(i)} checked={selectedOptIndex === i} name="quiz" className="mt-1 flex-shrink-0" />
                      <span className="text-slate-300">{opt}</span>
                    </label>
                  ))}
                </div>
                
                <button 
                  onClick={() => handleSubmit(false)} 
                  disabled={selectedOptIndex === null || isSubmitting}
                  className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:grayscale transition-all"
                >
                  {isSubmitting ? 'Analyzing...' : 'Submit Answer'}
                </button>
              </div>
            )}
            
            {needsVerification && (
               <div className="bg-slate-800/80 border border-slate-600 rounded-2xl p-6 shadow-lg animate-in fade-in slide-in-from-top-4">
                  <div className="flex items-center gap-3 mb-4 text-emerald-400">
                    <CheckCircle className="w-6 h-6" />
                    <h4 className="text-lg font-bold">You got that right!</h4>
                  </div>
                  <p className="text-slate-300 mb-6">To ensure you didn't just guess and really understand the core concepts, please answer these follow-up verification questions.</p>
                  
                  {followUpQuestions.map((q, qIndex) => (
                    <div key={qIndex} className="mb-6">
                      <p className="text-sm font-semibold text-slate-200 mb-3">{qIndex + 1}. {q.question}</p>
                      <div className="space-y-2">
                        {q.options.map((opt, oIndex) => (
                          <label key={oIndex} className="flex items-start gap-2 text-sm text-slate-300 p-3 bg-slate-900 border border-slate-700 rounded-lg hover:border-blue-500 cursor-pointer">
                            <input 
                              type="radio" 
                              name={`fu-q-${qIndex}`} 
                              className="mt-1"
                              onChange={() => setFollowUpAnswers(prev => ({...prev, [`q${qIndex}`]: opt}))}
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
                    className="w-full mt-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 transition-all"
                  >
                    {isSubmitting ? 'Evaluating...' : 'Submit Verification'}
                  </button>
               </div>
            )}
            
            {tutorFeedback && (
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 border border-cyan-500/30 shadow-lg shadow-cyan-500/10 mt-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-slate-900 border border-slate-700 rounded-xl"><BrainCircuit className="w-6 h-6 text-cyan-400" /></div>
                  <h3 className="text-xl font-bold text-slate-100">Socratic AI Review</h3>
                </div>
                <div className="text-slate-300 whitespace-pre-wrap leading-relaxed text-sm">
                  {tutorFeedback}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
