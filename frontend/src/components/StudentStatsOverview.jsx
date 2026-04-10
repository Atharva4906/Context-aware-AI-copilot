import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useStore } from '../store/useStore';
import { 
  Activity, CheckCircle2, AlertTriangle, Target, 
  TrendingDown, BookOpen, BrainCircuit, Clock, Sparkles
} from 'lucide-react';

export default function StudentStatsOverview() {
  const studentId = useStore(state => state.studentId);
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const [dashboardRes, historyRes] = await Promise.all([
          axios.get(`${apiUrl}/api/student/${studentId}/dashboard`),
          axios.get(`${apiUrl}/api/student/${studentId}/history`)
        ]);

        setStats(dashboardRes.data);
        setHistory(historyRes.data.history || []);
      } catch (err) {
        console.error('Error fetching analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    
    if (studentId) {
      fetchAnalytics();
    }
  }, [studentId]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-neutral-500 space-y-4 bg-[#0a0a0a]">
        <div className="relative">
          <div className="absolute inset-0 blur-xl bg-blue-500/20 rounded-full animate-pulse" />
          <BrainCircuit className="w-8 h-8 relative z-10 animate-pulse text-blue-400" />
        </div>
        <p className="text-sm uppercase tracking-widest font-medium">Compiling Data...</p>
      </div>
    );
  }

  if (!stats) return <div className="flex-1 p-10 text-neutral-500 bg-[#0a0a0a]">No data available.</div>;

  // Derive Advanced Analytics from History
  const totalMisconceptions = stats.resolved_misconceptions + stats.active_misconceptions;
  const resolutionRate = totalMisconceptions > 0 
    ? Math.round((stats.resolved_misconceptions / totalMisconceptions) * 100) 
    : 0;

  const categoryDistribution = history.reduce((acc, curr) => {
    if (curr.category) {
      acc[curr.category] = (acc[curr.category] || 0) + 1;
    }
    return acc;
  }, {});

  const maxCategoryCount = Math.max(...Object.values(categoryDistribution), 1);

  // Extract active (unresolved) misconceptions from history
  const unresolvedMisconceptions = history
    .filter(h => !h.is_resolved && h.predicted_misconception)
    .map(h => h.predicted_misconception)
    .reduce((acc, curr) => {
      if (!acc.includes(curr)) acc.push(curr);
      return acc;
    }, [])
    .slice(0, 5);

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0a] text-neutral-200 p-6 md:p-10 font-sans selection:bg-blue-500/30">
      <div className="max-w-6xl mx-auto space-y-8 pb-16">
        
        {/* Sleek Header */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <div className="flex items-center gap-2 mb-2 text-blue-400">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-widest">Dashboard</span>
            </div>
            <h1 className="text-4xl font-extrabold text-white tracking-tight">Cognitive Analytics</h1>
            <p className="text-neutral-400 text-sm mt-2 max-w-xl leading-relaxed">
              A real-time, multidimensional breakdown of your learning patterns, structural weaknesses, and resolution progress.
            </p>
          </div>
        </div>

        {/* Minimalist KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1 */}
          <div className="bg-[#111113] p-6 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-blue-500/30 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Activity className="w-16 h-16 text-blue-500" />
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 mb-4">
              <Activity className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-neutral-500 text-xs font-semibold uppercase tracking-wider mb-1">Total Interactions</p>
            <p className="text-3xl font-bold text-white">{stats.total_questions_answered}</p>
          </div>
          
          {/* Card 2 */}
          <div className="bg-[#111113] p-6 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <CheckCircle2 className="w-16 h-16 text-emerald-500" />
            </div>
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 mb-4">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-neutral-500 text-xs font-semibold uppercase tracking-wider mb-1">Resolved Issues</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-white">{stats.resolved_misconceptions}</p>
              <span className="text-emerald-400/80 text-sm font-medium">{resolutionRate}% rate</span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-[#111113] p-6 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-amber-500/30 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <AlertTriangle className="w-16 h-16 text-amber-500" />
            </div>
            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20 mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <p className="text-neutral-500 text-xs font-semibold uppercase tracking-wider mb-1">Active Weaknesses</p>
            <p className="text-3xl font-bold text-white">{stats.active_misconceptions}</p>
          </div>

          {/* Card 4 */}
          <div className="bg-[#111113] p-6 rounded-2xl border border-white/5 relative overflow-hidden group hover:border-rose-500/30 transition-colors">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <TrendingDown className="w-16 h-16 text-rose-500" />
            </div>
            <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center border border-rose-500/20 mb-4">
              <Target className="w-5 h-5 text-rose-400" />
            </div>
            <p className="text-neutral-500 text-xs font-semibold uppercase tracking-wider mb-1">Current Struggle</p>
            <p className="text-2xl font-bold text-white capitalize truncate">{stats.most_struggled_category || 'None'}</p>
          </div>
        </div>

        {/* Mid Section */}
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
          
          {/* Subject Performance */}
          <div className="xl:col-span-2 bg-[#111113] border border-white/5 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
              <BookOpen className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-semibold text-white">Focus Distribution</h3>
            </div>
            {Object.keys(categoryDistribution).length === 0 ? (
              <div className="h-32 flex items-center justify-center text-xs text-neutral-500">Awaiting data...</div>
            ) : (
              <div className="space-y-6">
                {Object.entries(categoryDistribution).map(([category, count]) => {
                  const percentage = Math.round((count / stats.total_questions_answered) * 100);
                  const barWidth = `${(count / maxCategoryCount) * 100}%`;
                  return (
                    <div key={category} className="group">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium text-neutral-300">{category}</span>
                        <span className="text-neutral-500 font-mono text-xs">{count} ({percentage}%)</span>
                      </div>
                      <div className="h-1.5 w-full bg-neutral-800/50 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-indigo-500 to-blue-400 rounded-full transition-all duration-1000 ease-out group-hover:opacity-80" 
                          style={{ width: barWidth }} 
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Misconception Radar */}
          <div className="xl:col-span-3 bg-[#111113] border border-white/5 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <BrainCircuit className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-semibold text-white">Targeted Weaknesses</h3>
              </div>
              <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 rounded border border-amber-500/20">
                Action Required
              </span>
            </div>
            
            {unresolvedMisconceptions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-emerald-500/60">
                <CheckCircle2 className="w-10 h-10 mb-3 opacity-50" />
                <p className="text-sm font-medium">All logic paths are clear.</p>
              </div>
            ) : (
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {unresolvedMisconceptions.map((misc, idx) => (
                  <li key={idx} className="flex items-start gap-3 p-4 rounded-xl bg-neutral-900/50 border border-white/5 hover:bg-neutral-900 transition-colors group">
                    <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)] shrink-0" />
                    <span className="text-sm text-neutral-300 leading-relaxed">{misc}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

        </div>

        {/* Bottom Section: Sleek Timeline */}
        <div className="bg-[#111113] border border-white/5 rounded-2xl p-6 md:p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-neutral-400" />
              <h3 className="text-base font-semibold text-white">Activity Log</h3>
            </div>
            <span className="text-xs font-mono text-neutral-500">LATEST 5</span>
          </div>

          {history.length === 0 ? (
            <p className="text-sm text-neutral-500 text-center py-10">No interactions logged yet.</p>
          ) : (
            <div className="relative pl-4 md:pl-0">
              {/* Vertical line for desktop */}
              <div className="hidden md:block absolute left-[120px] top-2 bottom-2 w-px bg-neutral-800" />
              
              <div className="space-y-6">
                {history.slice(0, 5).map((log, idx) => {
                  const dateObj = new Date(log.created_at);
                  return (
                    <div key={idx} className="relative flex flex-col md:flex-row gap-4 md:gap-8 md:items-start group">
                      
                      {/* Timestamp (Desktop left side) */}
                      <div className="md:w-[100px] shrink-0 pt-1 md:text-right">
                        <span className="text-xs font-mono text-neutral-500">
                          {dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}<br/>
                          <span className="text-neutral-600">{dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                        </span>
                      </div>

                      {/* Timeline Node */}
                      <div className="hidden md:flex absolute left-[116px] top-2 w-2 h-2 rounded-full bg-neutral-700 ring-4 ring-[#111113] group-hover:bg-blue-400 transition-colors" />

                      {/* Content Card */}
                      <div className="flex-1 bg-neutral-900/40 hover:bg-neutral-900/80 border border-transparent hover:border-white/5 transition-all p-4 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-neutral-800 text-neutral-300 rounded">
                              {log.category || 'General'}
                            </span>
                            {log.is_resolved ? (
                              <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                                <CheckCircle2 className="w-3 h-3" /> Resolved
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-400">
                                <Activity className="w-3 h-3" /> Pending
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <p className="text-sm text-neutral-200 leading-relaxed mb-3 line-clamp-2">
                          "{log.user_query}"
                        </p>
                        
                        {log.predicted_misconception && (
                          <div className="inline-flex items-start gap-2 p-2.5 rounded-lg bg-red-500/5 border border-red-500/10 w-full max-w-2xl">
                            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                            <p className="text-xs text-red-200/70 font-medium leading-relaxed">
                              <span className="text-red-300">Flagged:</span> {log.predicted_misconception}
                            </p>
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
    </div>
  );
}