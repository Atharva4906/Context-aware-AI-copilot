import React, { useState } from 'react';
import axios from 'axios';
import { useStore } from '../store/useStore';
import { Gauge, ThumbsUp, ThumbsDown, Database, Info, Terminal } from 'lucide-react';

export default function ReinforcementLab() {
  const studentId = useStore((state) => state.studentId);
  const [patternHash, setPatternHash] = useState('');
  const [suggestedTopic, setSuggestedTopic] = useState('');
  const [status, setStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitFeedback = async (accepted) => {
    if (!patternHash.trim() || !suggestedTopic.trim()) {
      setStatus('Error: Enter both pattern hash and topic before submitting.');
      return;
    }

    setIsSubmitting(true);
    setStatus('');
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await axios.post(`${apiUrl}/api/rl-feedback`, {
        student_id: studentId,
        pattern_hash: patternHash.trim(),
        suggested_topic: suggestedTopic.trim(),
        student_feedback: accepted
      });

      setStatus(`Success: Q-Value updated. New confidence score: ${response.data?.new_confidence_score ?? 'updated'}.`);
    } catch (err) {
      console.error(err);
      setStatus('Error: Failed to submit feedback. Check the API server connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0a] text-neutral-200 p-6 md:p-10 font-sans selection:bg-emerald-500/30">
      <div className="max-w-4xl mx-auto space-y-8 pb-16">
        
        {/* Sleek Header */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="flex items-center gap-2 mb-2 text-emerald-400">
              <Terminal className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-widest">Developer Tools</span>
            </div>
            <h1 className="text-4xl font-extrabold text-white tracking-tight">Reinforcement Lab</h1>
            <p className="text-neutral-400 text-sm mt-2 max-w-xl leading-relaxed">
              Manually inject RL feedback signals to adjust Q-values and debug diagnostic policies in real-time.
            </p>
          </div>
        </div>

        {/* Info Panel */}
        <div className="bg-[#111113] p-6 md:p-8 rounded-2xl border border-white/5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="mt-0.5 p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 shrink-0">
              <Info className="w-5 h-5 text-blue-400" />
            </div>
            <div className="space-y-3 text-[15px] text-neutral-300 leading-relaxed">
              <p>
                Thumbs-up and thumbs-down signals bypass the standard UI flow and are transmitted directly to the{' '}
                <code className="text-blue-300 bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20 text-sm font-mono">/api/rl-feedback</code> endpoint.
              </p>
              <p>
                The backend engine updates the{' '}
                <code className="text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 text-sm font-mono">rl_diagnostic_policy</code>{' '}
                table in the ledger, recalculating the confidence Q-value for the provided{' '}
                <span className="text-amber-300 font-medium">pattern_hash</span> +{' '}
                <span className="text-amber-300 font-medium">topic</span> tuple.
              </p>
            </div>
          </div>
        </div>

        {/* Manual Override Form */}
        <div className="bg-[#111113] p-6 md:p-8 rounded-2xl border border-white/5 shadow-sm">
          <div className="flex items-center gap-3 mb-8 pb-4 border-b border-white/5">
            <Database className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-semibold text-white">Manual Policy Override</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2.5">
                Pattern Hash
              </label>
              <input
                type="text"
                value={patternHash}
                onChange={(event) => setPatternHash(event.target.value)}
                placeholder="e.g. 7f2d9a3b..."
                className="w-full rounded-xl border border-white/5 bg-[#0a0a0a] px-4 py-3.5 text-sm text-white placeholder-neutral-600 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-all font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2.5">
                Suggested Topic
              </label>
              <input
                type="text"
                value={suggestedTopic}
                onChange={(event) => setSuggestedTopic(event.target.value)}
                placeholder="e.g. Fraction Simplification"
                className="w-full rounded-xl border border-white/5 bg-[#0a0a0a] px-4 py-3.5 text-sm text-white placeholder-neutral-600 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-all"
              />
            </div>
          </div>

          {/* Status Banner */}
          {status && (
            <div className={`mb-6 p-4 rounded-xl border flex items-center gap-3 text-sm font-medium animate-in fade-in slide-in-from-top-2 ${
              status.startsWith('Error') 
                ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' 
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            }`}>
              <Gauge className="w-4 h-4 shrink-0" />
              {status}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20 py-3.5 text-sm font-semibold text-emerald-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => submitFeedback(true)}
              disabled={isSubmitting}
            >
              <ThumbsUp className="w-4 h-4" /> Confirm Mapping (+ Reward)
            </button>
            <button
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 py-3.5 text-sm font-semibold text-rose-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => submitFeedback(false)}
              disabled={isSubmitting}
            >
              <ThumbsDown className="w-4 h-4" /> Reject Mapping (- Reward)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}