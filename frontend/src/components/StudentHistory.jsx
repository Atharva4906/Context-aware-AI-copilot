import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useStore } from '../store/useStore';
import { Activity, XCircle, CheckCircle } from 'lucide-react';

export default function StudentHistory() {
  const studentId = useStore(state => state.studentId);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const res = await axios.get(`${apiUrl}/api/student/${studentId}/history`);
        setHistory(res.data.history || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchHistory();
  }, [studentId]);

  return (
    <div className="flex-1 overflow-y-auto p-10 mt-4 relative">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-purple-500/20 rounded-xl">
            <Activity className="w-6 h-6 text-purple-400" />
          </div>
          <h1 className="text-4xl font-bold text-white">Interaction History</h1>
        </div>

        {history.length === 0 && (
          <div className="text-slate-400 text-center mt-10">No history found. Start learning to see your log!</div>
        )}

        {history.map((log, idx) => (
          <div key={idx} className="glass-panel p-6 rounded-2xl border border-slate-700/50 flex flex-col gap-3">
             <div className="flex justify-between items-start">
               <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                    {log.category || 'General'}
                  </span>
                  <p className="text-sm text-slate-500 mt-1">{new Date(log.created_at).toLocaleString()}</p>
               </div>
               <div className={`px-3 py-1 rounded-full text-xs font-bold border ${log.is_resolved ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                 {log.is_resolved ? 'Resolved' : 'Active Misconception'}
               </div>
             </div>
             <p className="text-slate-200 mt-2"><strong>Query:</strong> {log.user_query}</p>
             <p className="text-slate-400 text-sm italic"><strong>Predicted Weakness:</strong> {log.predicted_misconception || 'None'}</p>
          </div>
        ))}

      </div>
    </div>
  );
}
