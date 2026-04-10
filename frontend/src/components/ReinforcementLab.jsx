import React, { useState } from 'react';
import axios from 'axios';
import { useStore } from '../store/useStore';
import { Gauge, ThumbsUp, ThumbsDown, Database, Info } from 'lucide-react';

export default function ReinforcementLab() {
  const studentId = useStore((state) => state.studentId);
  const [patternHash, setPatternHash] = useState('');
  const [suggestedTopic, setSuggestedTopic] = useState('');
  const [status, setStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitFeedback = async (accepted) => {
    if (!patternHash.trim() || !suggestedTopic.trim()) {
      setStatus('Enter both pattern hash and topic before submitting.');
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

      setStatus(`Saved. New confidence score: ${response.data?.new_confidence_score ?? 'updated'}.`);
    } catch (err) {
      console.error(err);
      setStatus('Failed to submit feedback. Check the API server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-10 mt-4 relative">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/20 rounded-xl">
            <Gauge className="w-6 h-6 text-emerald-300" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white">Reinforcement Lab</h1>
            <p className="text-sm text-slate-400">Manually push RL feedback and inspect where it is stored.</p>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-slate-700/50">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-cyan-300 mt-0.5" />
            <div className="space-y-2 text-sm text-slate-300">
              <p>
                Thumbs-up / thumbs-down signals are sent to <span className="text-cyan-300 font-semibold">/api/rl-feedback</span>.
              </p>
              <p>
                The backend updates the <span className="text-emerald-300 font-semibold">rl_diagnostic_policy</span> table
                in Supabase, adjusting the Q-value for the provided <span className="text-amber-200">pattern_hash</span> +
                <span className="text-amber-200"> topic</span> pair.
              </p>
            </div>
          </div>
        </div>

        <div className="glass-panel p-8 rounded-3xl border border-slate-700/50">
          <div className="flex items-center gap-3 mb-6">
            <Database className="w-5 h-5 text-emerald-300" />
            <h2 className="text-2xl font-semibold text-white">Force feedback</h2>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <label className="text-sm text-slate-300">
              Pattern hash
              <input
                type="text"
                value={patternHash}
                onChange={(event) => setPatternHash(event.target.value)}
                placeholder="e.g. 7f2d9a..."
                className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm text-slate-200 focus:border-emerald-400/60 focus:outline-none"
              />
            </label>

            <label className="text-sm text-slate-300">
              Suggested topic
              <input
                type="text"
                value={suggestedTopic}
                onChange={(event) => setSuggestedTopic(event.target.value)}
                placeholder="e.g. Fraction Simplification"
                className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm text-slate-200 focus:border-emerald-400/60 focus:outline-none"
              />
            </label>
          </div>

          {status && (
            <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-200">
              {status}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              className="flex items-center gap-2 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200"
              onClick={() => submitFeedback(true)}
              disabled={isSubmitting}
            >
              <ThumbsUp className="w-4 h-4" /> Confirm (Thumbs Up)
            </button>
            <button
              className="flex items-center gap-2 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-200"
              onClick={() => submitFeedback(false)}
              disabled={isSubmitting}
            >
              <ThumbsDown className="w-4 h-4" /> Reject (Thumbs Down)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
