import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import axios from 'axios';
import { Sparkles, Bot, CheckCircle, XCircle } from 'lucide-react';
import { useStore } from '../store/useStore';

export default function GenerativeMCQ({ mcqData, patternHash, predictedTopic, onComplete }) {
  const [selectedOption, setSelectedOption] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null); // 'correct' or 'incorrect'
  const studentId = useStore((state) => state.studentId);

  const handleSelect = async (optionStr, mappedId) => {
    if (result) return; // Prevent clicking after answered
    setSelectedOption(optionStr);
    setIsSubmitting(true);

    const isCorrect = optionStr === mcqData.correct_answer;
    
    try {
      // Send Human-in-the-Loop Feedback to Backend
      // If student gets it right, it means the fundamental topic review was successful (positive reward)
      // If wrong, they might still be struggling (negative reward or needs more help)
      await axios.post('http://localhost:8000/api/rl-feedback', {
        student_id: studentId,
        pattern_hash: patternHash,
        suggested_topic: predictedTopic,
        student_feedback: isCorrect
      });
      
      setResult(isCorrect ? 'correct' : 'incorrect');
      if (onComplete) {
        onComplete(isCorrect, mappedId);
      }
    } catch (err) {
      console.error("Failed to submit RL feedback:", err);
      // Fallback UI
      setResult(isCorrect ? 'correct' : 'incorrect');
    } finally {
      setIsSubmitting(false);
    }
  };

  const allOptions = [mcqData.correct_answer, ...mcqData.distractors.map(d => d.option)].sort(() => Math.random() - 0.5);

  return (
    <div className="my-4 bg-slate-800/80 rounded-2xl border border-cyan-500/30 overflow-hidden shadow-lg shadow-cyan-500/10">
      <div className="bg-gradient-to-r from-cyan-900/50 to-blue-900/50 px-4 py-3 border-b border-cyan-500/20 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-cyan-400" />
        <span className="text-xs font-semibold tracking-wider text-cyan-300 uppercase">Diagnostic Check</span>
      </div>
      
      <div className="p-5">
        <h4 className="text-sm font-medium text-slate-200 mb-4">{mcqData.question}</h4>
        
        <div className="space-y-2">
          {allOptions.map((opt, idx) => {
            const isDistractor = mcqData.distractors.find(d => d.option === opt);
            const mappedId = isDistractor ? isDistractor.mapped_misconception_id : null;
            
            let btnClass = "w-full text-left p-3 rounded-xl border transition-all duration-200 flex items-start gap-3 ";
            
            if (result) {
              if (opt === mcqData.correct_answer) {
                btnClass += "bg-emerald-500/10 border-emerald-500/50 text-emerald-200 opacity-100";
              } else if (selectedOption === opt) {
                btnClass += "bg-rose-500/10 border-rose-500/50 text-rose-200 opacity-100";
              } else {
                btnClass += "bg-slate-800/50 border-slate-700 text-slate-500 opacity-50";
              }
            } else {
              if (selectedOption === opt) {
                btnClass += "bg-blue-500/20 border-blue-500 text-blue-200 scale-[0.98]";
              } else {
                btnClass += "bg-slate-800 border-slate-700 hover:border-cyan-500/50 hover:bg-slate-750 text-slate-300";
              }
            }

            return (
              <button 
                key={idx}
                disabled={isSubmitting || result !== null}
                onClick={() => handleSelect(opt, mappedId)}
                className={btnClass}
              >
                <div className="mt-0.5 mt-1 flex-shrink-0">
                  {result && opt === mcqData.correct_answer && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                  {result && selectedOption === opt && opt !== mcqData.correct_answer && <XCircle className="w-4 h-4 text-rose-400" />}
                  {!result && <div className={`w-4 h-4 rounded-full border ${selectedOption === opt ? 'border-blue-400 bg-blue-500/50' : 'border-slate-500'}`}></div>}
                </div>
                <span className="text-sm">{opt}</span>
              </button>
            )
          })}
        </div>
        
        {result === 'correct' && (
          <div className="mt-4 p-3 bg-emerald-500/10 rounded-xl text-emerald-300 text-sm flex items-start gap-2">
            <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>Excellent! You've successfully grasped this fundamental concept. The system has updated your cognitive profile.</p>
          </div>
        )}
      </div>
    </div>
  );
}
