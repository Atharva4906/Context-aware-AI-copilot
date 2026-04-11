import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useStore } from '../store/useStore';
import { Layers, AlertTriangle, Sparkles, Filter, Activity } from 'lucide-react';

export default function StudentMisconceptionsBySubject() {
  const studentId = useStore((state) => state.studentId);
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // New state for the subject filter
  const [selectedSubject, setSelectedSubject] = useState('All');

  useEffect(() => {
    const fetchRows = async () => {
      setIsLoading(true);
      setError('');
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const res = await axios.get(`${apiUrl}/api/student/${studentId}/misconceptions-by-subject`);
        setRows(res.data?.items || []);
      } catch (e) {
        setError('Failed to load subject-wise misconceptions.');
      } finally {
        setIsLoading(false);
      }
    };

    if (studentId) {
      fetchRows();
    }
  }, [studentId]);

  // Extract unique subjects for the dropdown
  const uniqueSubjects = useMemo(() => {
    const subjects = rows.map(r => r.subject).filter(Boolean);
    return [...new Set(subjects)];
  }, [rows]);

  // Compute the top summary cards
  const subjectSummary = useMemo(() => {
    const map = {};
    rows.forEach((row) => {
      const key = row.subject || 'Unknown';
      if (!map[key]) {
        map[key] = { concepts: 0, totalEncounters: 0 };
      }
      map[key].concepts += 1;
      map[key].totalEncounters += Number(row.total_encounters || 0);
    });
    return Object.entries(map);
  }, [rows]);

  // Filter the table rows based on the dropdown selection
  const filteredRows = useMemo(() => {
    if (selectedSubject === 'All') return rows;
    return rows.filter(row => row.subject === selectedSubject);
  }, [rows, selectedSubject]);

  return (
    <div className="flex-1 overflow-y-auto bg-[#0a0a0a] text-neutral-200 p-6 md:p-10 font-sans selection:bg-blue-500/30">
      <div className="max-w-6xl mx-auto space-y-8 pb-16">
        
        {/* ── Header & Filters ── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 text-blue-400">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-widest">Performance Breakdown</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              Subject-wise Misconceptions
            </h1>
            <p className="text-sm text-neutral-400 mt-2 max-w-2xl leading-relaxed">
              Your weak concepts are grouped by subject along with encounter and resolution metrics. Use the filter to drill down.
            </p>
          </div>

          {/* Subject Filter Dropdown */}
          <div className="relative shrink-0">
            <select 
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="appearance-none bg-[#111113] border border-white/5 hover:border-white/10 text-white text-sm font-medium py-2.5 pl-4 pr-10 rounded-xl focus:outline-none focus:border-blue-500/50 transition-colors cursor-pointer shadow-sm w-full md:w-auto"
            >
              <option value="All" className="bg-neutral-900">All Subjects</option>
              {uniqueSubjects.map(sub => (
                <option key={sub} value={sub} className="bg-neutral-900">{sub}</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <Filter className="w-4 h-4 text-neutral-500" />
            </div>
          </div>
        </div>

        {/* ── Summary KPI Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {subjectSummary.map(([subject, summary]) => {
            // Dim cards that are not currently selected (if a specific filter is applied)
            const isFaded = selectedSubject !== 'All' && selectedSubject !== subject;
            
            return (
              <div 
                key={subject} 
                className={`rounded-2xl border transition-all duration-300 p-5 ${
                  isFaded 
                    ? 'bg-[#111113]/40 border-white/[0.02] opacity-50' 
                    : 'bg-[#111113] border-white/5 hover:border-white/10 shadow-sm'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <p className="text-xs uppercase tracking-widest font-bold text-neutral-500">{subject}</p>
                  <Activity className="w-4 h-4 text-blue-500/50" />
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-extrabold text-white">{summary.concepts}</p>
                  <p className="text-xs text-neutral-500 font-medium">Concepts</p>
                </div>
                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Encounters</span>
                  <span className="text-xs font-mono font-medium text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                    {summary.totalEncounters}
                  </span>
                </div>
              </div>
            );
          })}
          
          {!subjectSummary.length && !isLoading && (
            <div className="col-span-full rounded-2xl border border-white/5 border-dashed bg-[#111113] p-10 text-center text-sm text-neutral-500 flex flex-col items-center justify-center">
              <Layers className="w-8 h-8 mb-3 opacity-50" />
              No subject-wise misconception data found yet.
            </div>
          )}
        </div>

        {/* ── Detailed Table ── */}
        <div className="bg-[#111113] rounded-3xl p-6 md:p-8 border border-white/5 shadow-sm overflow-hidden flex flex-col">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <Layers className="w-4 h-4 text-blue-400" />
            </div>
            <h3 className="text-lg font-bold text-white">Cognitive Log Details</h3>
          </div>

          {isLoading && (
            <div className="py-10 text-center text-neutral-500 text-sm animate-pulse">
              Syncing ledger...
            </div>
          )}
          
          {error && (
            <div className="flex items-center gap-3 text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 mb-4">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              {error}
            </div>
          )}

          {!isLoading && !error && filteredRows.length > 0 && (
            <div className="overflow-x-auto custom-scrollbar pb-4">
              <table className="w-full text-sm text-left whitespace-nowrap min-w-[800px]">
                <thead className="text-[10px] uppercase tracking-widest text-neutral-500 border-b border-white/5">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Subject</th>
                    <th className="py-3 px-4 font-semibold">Flagged Concept</th>
                    <th className="py-3 px-4 font-semibold text-center">Encounters</th>
                    <th className="py-3 px-4 font-semibold text-center">Resolved</th>
                    <th className="py-3 px-4 font-semibold text-center">Unresolved</th>
                    <th className="py-3 px-4 font-semibold text-right">Last Seen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredRows.map((row, idx) => (
                    <tr key={`${row.subject}-${row.concept}-${idx}`} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="py-4 px-4 text-blue-400 font-semibold text-xs tracking-wide uppercase">
                        {row.subject}
                      </td>
                      <td className="py-4 px-4 text-neutral-200 font-medium">
                        {row.concept}
                      </td>
                      <td className="py-4 px-4 text-center font-mono text-neutral-400">
                        {row.total_encounters}
                      </td>
                      <td className="py-4 px-4 text-center font-mono">
                        {row.resolved_count > 0 ? (
                          <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">{row.resolved_count}</span>
                        ) : (
                          <span className="text-neutral-600">0</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center font-mono">
                        {row.unresolved_count > 0 ? (
                          <span className="text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">{row.unresolved_count}</span>
                        ) : (
                          <span className="text-neutral-600">0</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right text-xs text-neutral-500 group-hover:text-neutral-400 transition-colors">
                        {row.last_seen_at ? new Date(row.last_seen_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!isLoading && !error && filteredRows.length === 0 && (
             <div className="py-12 text-center text-neutral-500 text-sm border border-white/5 border-dashed rounded-2xl bg-white/[0.01]">
               No details available for the selected view.
             </div>
          )}
        </div>
      </div>
    </div>
  );
}