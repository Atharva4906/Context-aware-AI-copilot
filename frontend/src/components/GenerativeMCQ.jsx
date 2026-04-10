import React, { useState } from 'react';
import axios from 'axios';
import { Sparkles, CheckCircle2, XCircle, BrainCircuit } from 'lucide-react';
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

  // Note: For a true random sort that avoids React re-render hydration issues, 
  // you might want to wrap this in a useMemo in the future, but this works for now.
  const allOptions = [mcqData.correct_answer, ...mcqData.distractors.map(d => d.option)].sort(() => Math.random() - 0.5);

  return (
    <div className="my-6 bg-[#111113] rounded-2xl border border-white/5 overflow-hidden shadow-sm">
      {/* Sleek Header */}
      <div className="px-5 py-3.5 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-blue-500/10 border border-blue-500/20">
            <BrainCircuit className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <span className="text-xs font-bold tracking-widest text-neutral-300 uppercase">
            Diagnostic Verification
          </span>
        </div>
        {isSubmitting && (
          <span className="text-[10px] font-mono text-neutral-500 uppercase animate-pulse">
            Analyzing...
          </span>
        )}
      </div>
      
      <div className="p-5 md:p-6">
        <h4 className="text-sm md:text-base font-medium text-neutral-200 mb-5 leading-relaxed">
          {mcqData.question}
        </h4>
        
        <div className="space-y-2.5">
          {allOptions.map((opt, idx) => {
            const isDistractor = mcqData.distractors.find(d => d.option === opt);
            const mappedId = isDistractor ? isDistractor.mapped_misconception_id : null;
            
            let btnClass = "w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-start gap-3.5 group ";
            let IndicatorIcon = null;
            
            if (result) {
              if (opt === mcqData.correct_answer) {
                // Correct Answer Styling
                btnClass += "bg-emerald-500/10 border-emerald-500/30 text-emerald-300";
                IndicatorIcon = <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />;
              } else if (selectedOption === opt) {
                // Wrong Answer Styling
                btnClass += "bg-rose-500/10 border-rose-500/30 text-rose-300";
                IndicatorIcon = <XCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />;
              } else {
                // Unselected/Muted Styling
                btnClass += "bg-transparent border-white/5 text-neutral-600 opacity-60";
                IndicatorIcon = <div className="w-4 h-4 rounded-full border border-neutral-700 mt-0.5 shrink-0"></div>;
              }
            } else {
              if (selectedOption === opt) {
                // Pending/Selected Styling
                btnClass += "bg-blue-500/10 border-blue-500/40 text-blue-300 scale-[0.99]";
                IndicatorIcon = <div className="w-4 h-4 rounded-full border-2 border-blue-400 bg-blue-500/20 mt-0.5 shrink-0"></div>;
              } else {
                // Default Interactive Styling
                btnClass += "bg-[#1a1a1c] border-white/5 hover:border-white/10 hover:bg-white/[0.04] text-neutral-300";
                IndicatorIcon = <div className="w-4 h-4 rounded-full border border-neutral-600 group-hover:border-neutral-400 transition-colors mt-0.5 shrink-0"></div>;
              }
            }

            return (
              <button 
                key={idx}
                disabled={isSubmitting || result !== null}
                onClick={() => handleSelect(opt, mappedId)}
                className={btnClass}
              >
                {IndicatorIcon}
                <span className="text-sm font-medium leading-snug">{opt}</span>
              </button>
            )
          })}
        </div>
        
        {/* Success Feedback Footer */}
        {result === 'correct' && (
          <div className="mt-5 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-emerald-200/80 text-sm leading-relaxed">
              <span className="text-emerald-300 font-semibold">Excellent.</span> You've successfully grasped this fundamental concept. The engine has updated your cognitive profile.
            </p>
          </div>
        )}

        {/* Incorrect Feedback Footer (Optional, can be removed if not needed) */}
        {result === 'incorrect' && (
          <div className="mt-5 p-4 bg-neutral-800/50 border border-white/5 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
            <BrainCircuit className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
            <p className="text-neutral-400 text-sm leading-relaxed">
              <span className="text-neutral-300 font-semibold">Not quite.</span> Review the feedback above to bridge this gap in understanding. Your profile has been updated to reflect this weakness.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}