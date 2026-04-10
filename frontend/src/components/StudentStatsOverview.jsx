import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useStore } from '../store/useStore';
import { LayoutDashboard, CheckCircle, AlertCircle, HelpCircle } from 'lucide-react';

export default function StudentStatsOverview() {
  const studentId = useStore(state => state.studentId);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const res = await axios.get(`${apiUrl}/api/student/${studentId}/dashboard`);
        setStats(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchDashboard();
  }, [studentId]);

  if (!stats) {
    return <div className="flex-1 p-10 flex items-center justify-center text-slate-400">Loading Dashboard...</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto p-10 mt-4 relative">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-cyan-500/20 rounded-xl">
            <LayoutDashboard className="w-6 h-6 text-cyan-400" />
          </div>
          <h1 className="text-4xl font-bold text-white">Your Analytics</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-panel p-6 rounded-3xl border border-slate-700/50 flex flex-col items-center justify-center">
            <HelpCircle className="w-10 h-10 text-blue-400 mb-2" />
            <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Total Interactions</p>
            <p className="text-4xl font-bold text-slate-100">{stats.total_questions_answered}</p>
          </div>
          
          <div className="glass-panel p-6 rounded-3xl border border-slate-700/50 flex flex-col items-center justify-center">
            <CheckCircle className="w-10 h-10 text-emerald-400 mb-2" />
            <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Resolved Misconceptions</p>
            <p className="text-4xl font-bold text-slate-100">{stats.resolved_misconceptions}</p>
          </div>

          <div className="glass-panel p-6 rounded-3xl border border-slate-700/50 flex flex-col items-center justify-center">
            <AlertCircle className="w-10 h-10 text-amber-400 mb-2" />
            <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Active Weaknesses</p>
            <p className="text-4xl font-bold text-slate-100">{stats.active_misconceptions}</p>
          </div>

          <div className="glass-panel p-6 rounded-3xl border border-slate-700/50 flex flex-col items-center justify-center text-center">
            <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Struggling Area</p>
            <p className="text-2xl font-bold text-red-300 mt-2">{stats.most_struggled_category}</p>
          </div>
        </div>

      </div>
    </div>
  );
}
