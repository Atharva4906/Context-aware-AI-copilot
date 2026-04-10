import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useStore } from '../store/useStore';
import {
  Activity,
  BrainCircuit,
  Database,
  Gauge,
  GitBranch,
  ShieldCheck,
  Sparkles,
  Timer
} from 'lucide-react';

export default function AuditTrail() {
  const studentId = useStore((state) => state.studentId);
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const fetchAuditData = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const [statsRes, historyRes] = await Promise.all([
          axios.get(`${apiUrl}/api/student/${studentId}/dashboard`),
          axios.get(`${apiUrl}/api/student/${studentId}/history`)
        ]);
        setStats(statsRes.data);
        setHistory(historyRes.data.history || []);
      } catch (err) {
        console.error(err);
      }
    };

    fetchAuditData();
  }, [studentId]);

  return (
    <div className="flex-1 overflow-y-auto p-10 mt-4 relative">
      <div className="max-w-5xl mx-auto space-y-10">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/20 rounded-xl">
            <ShieldCheck className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white">Audit Trail</h1>
            <p className="text-sm text-slate-400">Transparent view of the LangGraph + RL pipeline</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel p-6 rounded-3xl border border-slate-700/50">
            <div className="flex items-center gap-3 mb-3">
              <Activity className="w-5 h-5 text-cyan-400" />
              <p className="text-sm text-slate-300">Total interactions</p>
            </div>
            <p className="text-3xl font-bold text-white">{stats?.total_questions_answered ?? '—'}</p>
          </div>
          <div className="glass-panel p-6 rounded-3xl border border-slate-700/50">
            <div className="flex items-center gap-3 mb-3">
              <Gauge className="w-5 h-5 text-emerald-400" />
              <p className="text-sm text-slate-300">Resolved misconceptions</p>
            </div>
            <p className="text-3xl font-bold text-white">{stats?.resolved_misconceptions ?? '—'}</p>
          </div>
          <div className="glass-panel p-6 rounded-3xl border border-slate-700/50">
            <div className="flex items-center gap-3 mb-3">
              <Timer className="w-5 h-5 text-amber-300" />
              <p className="text-sm text-slate-300">Active weaknesses</p>
            </div>
            <p className="text-3xl font-bold text-white">{stats?.active_misconceptions ?? '—'}</p>
          </div>
        </div>

        <div className="glass-panel p-8 rounded-3xl border border-slate-700/50">
          <div className="flex items-center gap-3 mb-6">
            <GitBranch className="w-6 h-6 text-cyan-400" />
            <h2 className="text-2xl font-semibold text-white">Pipeline Walkthrough</h2>
          </div>
          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-slate-800 rounded-xl">
                <Sparkles className="w-4 h-4 text-cyan-300" />
              </div>
              <div>
                <p className="text-slate-200 font-semibold">Question ingestion</p>
                <p className="text-sm text-slate-400">Raw student input is parsed into JSON and stored in Supabase.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-slate-800 rounded-xl">
                <BrainCircuit className="w-4 h-4 text-blue-300" />
              </div>
              <div>
                <p className="text-slate-200 font-semibold">LangGraph reasoning</p>
                <p className="text-sm text-slate-400">Reasoner → Judge → Tutor + Architect generate diagnosis and feedback.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-slate-800 rounded-xl">
                <Gauge className="w-4 h-4 text-emerald-300" />
              </div>
              <div>
                <p className="text-slate-200 font-semibold">Reinforcement learning</p>
                <p className="text-sm text-slate-400">Epsilon-greedy policy updates Q-values based on student feedback.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-slate-800 rounded-xl">
                <Database className="w-4 h-4 text-amber-300" />
              </div>
              <div>
                <p className="text-slate-200 font-semibold">Audit logging</p>
                <p className="text-sm text-slate-400">Every interaction is stored with timestamps, topic labels, and resolution state.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-panel p-8 rounded-3xl border border-slate-700/50">
          <div className="flex items-center gap-3 mb-6">
            <Activity className="w-6 h-6 text-purple-400" />
            <h2 className="text-2xl font-semibold text-white">Recent interactions</h2>
          </div>
          {history.length === 0 && (
            <div className="text-slate-400">No audit records yet.</div>
          )}
          {history.slice(0, 5).map((log, idx) => (
            <div key={idx} className="mb-4 last:mb-0 rounded-2xl border border-slate-700/60 bg-slate-900/50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-widest text-cyan-400">
                  {log.category || 'General'}
                </span>
                <span className="text-[11px] text-slate-500">{new Date(log.created_at).toLocaleString()}</span>
              </div>
              <p className="mt-2 text-sm text-slate-200">{log.user_query}</p>
              <p className="mt-1 text-xs text-slate-400">Predicted misconception: {log.predicted_misconception || 'None'}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
