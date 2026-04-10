import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useStore } from '../store/useStore';
import { 
  Activity, CheckCircle2, AlertCircle, Clock, 
  BrainCircuit, ChevronRight, BookOpen, Sparkles 
} from 'lucide-react';

export default function StudentHistory() {
  const studentId = useStore(state => state.studentId);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const res = await axios.get(`${apiUrl}/api/student/${studentId}/history`);
        setHistory(res.data.history || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (studentId) {
      fetchHistory();
    }
  }, [studentId]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-neutral-500 space-y-4 bg-[#0a0a0a]">
        <div className="relative">
          <div className="absolute inset-0 blur-xl bg-purple-500/20 rounded-full animate-pulse" />
          <Activity className="w-8 h-8 relative z-10 animate-pulse text-purple-400" />
        </div>
        <p className="text-sm uppercase tracking-widest font-medium">Loading History...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0a] text-neutral-200 p-6 md:p-10 font-sans selection:bg-blue-500/30">
      <div className="max-w-5xl mx-auto space-y-8 pb-16">
        
        {/* Sleek Header */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="flex items-center gap-2 mb-2 text-purple-400">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-widest">Activity Log</span>
            </div>
            <h1 className="text-4xl font-extrabold text-white tracking-tight">Interaction History</h1>
            <p className="text-neutral-400 text-sm mt-2 max-w-xl leading-relaxed">
              A chronological ledger of your queries, diagnostic results, and conceptual resolutions.
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 bg-[#111113] px-4 py-2 rounded-full border border-white/5">
            <Clock className="w-4 h-4 text-neutral-500" />
            <span className="text-sm font-medium text-neutral-400">
              {history.length} Records
            </span>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-[#111113] border border-white/5 rounded-3xl border-dashed">
            <BookOpen className="w-12 h-12 text-neutral-600 mb-4" />
            <p className="text-neutral-400 font-medium">No history found.</p>
            <p className="text-neutral-500 text-sm mt-1">Start learning to populate your cognitive log.</p>
          </div>
        ) : (
          <div className="relative">
            {/* Vertical Desktop Timeline Line */}
            <div className="hidden md:block absolute left-[140px] top-4 bottom-4 w-px bg-white/5" />
            
            <div className="space-y-6">
              {history.map((log, idx) => {
                const dateObj = new Date(log.created_at);
                const isResolved = log.is_resolved;
                const hasMisconception = !!log.predicted_misconception;

                return (
                  <div key={idx} className="relative flex flex-col md:flex-row gap-4 md:gap-8 group">
                    
                    {/* Timestamp Area */}
                    <div className="md:w-[120px] shrink-0 pt-5 md:text-right">
                      <span className="text-xs font-mono font-medium text-neutral-500 group-hover:text-neutral-300 transition-colors">
                        {dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        <br className="hidden md:block"/>
                        <span className="text-neutral-600 ml-2 md:ml-0">{dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                      </span>
                    </div>

                    {/* Timeline Node Marker */}
                    <div className="hidden md:flex absolute left-[136px] top-6 w-2.5 h-2.5 rounded-full bg-neutral-800 ring-4 ring-[#0a0a0a] border border-white/10 group-hover:border-purple-400 group-hover:bg-purple-500/20 transition-all" />

                    {/* Main Log Card */}
                    <div className="flex-1 bg-[#111113] border border-white/5 hover:border-white/10 rounded-2xl p-6 transition-all shadow-sm hover:shadow-xl hover:shadow-black/50">
                      
                      {/* Card Header: Category & Status */}
                      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-white/5 flex items-center justify-center">
                            <BookOpen className="w-4 h-4 text-purple-400" />
                          </div>
                          <span className="text-xs font-bold uppercase tracking-widest text-neutral-300">
                            {log.category || 'General Assessment'}
                          </span>
                        </div>

                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider border ${
                          isResolved 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {isResolved ? (
                            <><CheckCircle2 className="w-3.5 h-3.5" /> Resolved</>
                          ) : (
                            <><AlertCircle className="w-3.5 h-3.5" /> Active Flaw</>
                          )}
                        </div>
                      </div>

                      {/* User Query */}
                      <div className="mb-5">
                        <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold mb-1.5">Submitted Query</p>
                        <p className="text-base text-neutral-200 leading-relaxed font-medium bg-white/[0.02] border border-white/[0.02] rounded-xl p-4">
                          "{log.user_query}"
                        </p>
                      </div>

                      {/* Diagnostic Result */}
                      {hasMisconception ? (
                        <div className="flex items-start gap-3 p-4 rounded-xl bg-neutral-900/50 border border-white/5">
                          <BrainCircuit className="w-5 h-5 text-neutral-400 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold mb-1">AI Diagnostic Profile</p>
                            <p className="text-sm text-neutral-300 leading-snug">
                              Mapped to fundamental weakness:{' '}
                              <span className="text-white font-semibold">"{log.predicted_misconception}"</span>
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-xs font-medium text-neutral-500 pl-1">
                          <CheckCircle2 className="w-4 h-4 text-neutral-600" />
                          No specific misconception mapped.
                        </div>
                      )}
                      
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}