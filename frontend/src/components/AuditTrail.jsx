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
  Timer,
  Clock,
  AlertCircle
} from 'lucide-react';

export default function AuditTrail() {
  const studentId = useStore((state) => state.studentId);
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

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
      } finally {
        setLoading(false);
      }
    };

    if (studentId) {
      fetchAuditData();
    }
  }, [studentId]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-neutral-500 space-y-4 bg-[#0a0a0a]">
        <div className="relative">
          <div className="absolute inset-0 blur-xl bg-amber-500/20 rounded-full animate-pulse" />
          <ShieldCheck className="w-8 h-8 relative z-10 animate-pulse text-amber-400" />
        </div>
        <p className="text-sm uppercase tracking-widest font-medium">Verifying Ledger...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0a] text-neutral-200 p-6 md:p-10 font-sans selection:bg-amber-500/30">
      <div className="max-w-5xl mx-auto space-y-8 pb-16">
        
        {/* Sleek Header */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="flex items-center gap-2 mb-2 text-amber-400">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-widest">System Status</span>
            </div>
            <h1 className="text-4xl font-extrabold text-white tracking-tight">Audit Trail</h1>
            <p className="text-neutral-400 text-sm mt-2 max-w-xl leading-relaxed">
              Transparent ledger of the LangGraph reasoning pipeline, reinforcement learning states, and data ingestion.
            </p>
          </div>
        </div>

        {/* Minimalist KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#111113] p-6 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-cyan-500/30 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Activity className="w-16 h-16 text-cyan-500" />
            </div>
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 mb-4">
              <Activity className="w-5 h-5 text-cyan-400" />
            </div>
            <p className="text-neutral-500 text-xs font-semibold uppercase tracking-wider mb-1">Total Interactions</p>
            <p className="text-3xl font-bold text-white">{stats?.total_questions_answered ?? '0'}</p>
          </div>
          
          <div className="bg-[#111113] p-6 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Gauge className="w-16 h-16 text-emerald-500" />
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 mb-4">
              <Gauge className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-neutral-500 text-xs font-semibold uppercase tracking-wider mb-1">Resolved Logic Flaws</p>
            <p className="text-3xl font-bold text-white">{stats?.resolved_misconceptions ?? '0'}</p>
          </div>
          
          <div className="bg-[#111113] p-6 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-amber-500/30 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Timer className="w-16 h-16 text-amber-500" />
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 mb-4">
              <Timer className="w-5 h-5 text-amber-400" />
            </div>
            <p className="text-neutral-500 text-xs font-semibold uppercase tracking-wider mb-1">Active Weaknesses</p>
            <p className="text-3xl font-bold text-white">{stats?.active_misconceptions ?? '0'}</p>
          </div>
        </div>

        {/* Pipeline Walkthrough */}
        <div className="bg-[#111113] p-6 md:p-8 rounded-2xl border border-white/5">
          <div className="flex items-center gap-3 mb-8 pb-4 border-b border-white/5">
            <GitBranch className="w-5 h-5 text-neutral-400" />
            <h2 className="text-lg font-semibold text-white">Pipeline Architecture</h2>
          </div>
          
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[1.15rem] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
            
            <div className="relative flex items-start gap-4">
              <div className="w-10 h-10 shrink-0 bg-[#0a0a0a] rounded-full border-2 border-white/10 flex items-center justify-center relative z-10 shadow-[0_0_10px_rgba(0,0,0,0.5)]">
                <Sparkles className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="pt-2">
                <p className="text-sm font-semibold text-white mb-1">1. Question Ingestion</p>
                <p className="text-sm text-neutral-400 leading-relaxed">Raw student input is parsed, categorized using LLMs, structured into JSON arrays, and safely stored in the Supabase ledger.</p>
              </div>
            </div>
            
            <div className="relative flex items-start gap-4">
              <div className="w-10 h-10 shrink-0 bg-[#0a0a0a] rounded-full border-2 border-white/10 flex items-center justify-center relative z-10 shadow-[0_0_10px_rgba(0,0,0,0.5)]">
                <BrainCircuit className="w-4 h-4 text-blue-400" />
              </div>
              <div className="pt-2">
                <p className="text-sm font-semibold text-white mb-1">2. LangGraph Reasoning</p>
                <p className="text-sm text-neutral-400 leading-relaxed">The input flows through autonomous agent nodes: <span className="text-neutral-300">Reasoner → Judge → Tutor → Architect</span> to generate verified diagnosis and structured feedback.</p>
              </div>
            </div>
            
            <div className="relative flex items-start gap-4">
              <div className="w-10 h-10 shrink-0 bg-[#0a0a0a] rounded-full border-2 border-white/10 flex items-center justify-center relative z-10 shadow-[0_0_10px_rgba(0,0,0,0.5)]">
                <Gauge className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="pt-2">
                <p className="text-sm font-semibold text-white mb-1">3. Reinforcement Learning</p>
                <p className="text-sm text-neutral-400 leading-relaxed">An Epsilon-greedy policy model updates Q-values in the database based on explicit human-in-the-loop verification from the student.</p>
              </div>
            </div>
            
            <div className="relative flex items-start gap-4">
              <div className="w-10 h-10 shrink-0 bg-[#0a0a0a] rounded-full border-2 border-white/10 flex items-center justify-center relative z-10 shadow-[0_0_10px_rgba(0,0,0,0.5)]">
                <Database className="w-4 h-4 text-amber-400" />
              </div>
              <div className="pt-2">
                <p className="text-sm font-semibold text-white mb-1">4. Audit & Telemetry Logging</p>
                <p className="text-sm text-neutral-400 leading-relaxed">Every state change, latency metric, hesitation count, and topic label is permanently recorded to construct the cognitive profile.</p>
              </div>
            </div>
            
          </div>
        </div>

        {/* Recent Audit Records */}
        <div className="bg-[#111113] p-6 md:p-8 rounded-2xl border border-white/5">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-neutral-400" />
              <h2 className="text-lg font-semibold text-white">Latest Telemetry</h2>
            </div>
            <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
              LATEST 5
            </span>
          </div>
          
          {history.length === 0 && (
            <div className="py-10 text-center text-neutral-500 text-sm">
              No audit records have been generated yet.
            </div>
          )}
          
          <div className="space-y-3">
            {history.slice(0, 5).map((log, idx) => (
              <div key={idx} className="group bg-[#0a0a0a] border border-white/5 hover:border-white/10 rounded-xl p-4 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 bg-neutral-900 text-neutral-300 rounded">
                    {log.category || 'General'}
                  </span>
                  <span className="text-xs font-mono text-neutral-500">
                    {new Date(log.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm text-neutral-200 mb-3 truncate">
                  "{log.user_query}"
                </p>
                <div className="flex items-center gap-2">
                  {log.predicted_misconception ? (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20 w-fit">
                      <AlertCircle className="w-3 h-3 text-amber-400" />
                      <span className="text-[10px] font-medium text-amber-300">Flagged: {log.predicted_misconception}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/[0.02] border border-white/5 w-fit">
                      <Sparkles className="w-3 h-3 text-neutral-500" />
                      <span className="text-[10px] font-medium text-neutral-400">Standard clear</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        
      </div>
    </div>
  );
}