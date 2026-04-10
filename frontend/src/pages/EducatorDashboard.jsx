import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import { Users, AlertTriangle, CheckCircle, BarChart3, LogOut, Search } from 'lucide-react';
import axios from 'axios';

export default function EducatorDashboard() {
  const user = useStore((state) => state.user);
  const logout = useStore((state) => state.logout);
  const navigate = useNavigate();
  
  const [clusters, setClusters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Note: For hackathon purpose, if backend route is not ready, we mock it.
  useEffect(() => {
    if (!user || user.role !== 'educator') {
      navigate('/');
      return;
    }

    const fetchClusters = async () => {
      try {
        const response = await axios.get('http://localhost:8000/api/admin/cluster-students');
        setClusters(response.data.clusters);
      } catch (err) {
        console.error("Failed to fetch clusters. Using mock data for UI demo.", err);
        // Fallback Mock Data for UI presentation
        setTimeout(() => {
          setClusters([
            {
              misconception: "Variable Scope (Lexical vs Global)",
              severity: "High",
              studentCount: 8,
              students: ["Atharva P.", "John D.", "Sarah M.", "Alex K.", "Priya S.", "Liam W.", "Emma R.", "Noah B."]
            },
            {
              misconception: "For-Loop Off-by-One Error",
              severity: "Medium",
              studentCount: 3,
              students: ["David L.", "Mia C.", "James P."]
            },
            {
              misconception: "Confusion between Force and Velocity",
              severity: "High",
              studentCount: 5,
              students: ["Atharva P.", "Chloe S.", "Ben T.", "Sophia H.", "Elijah G."]
            }
          ]);
          setIsLoading(false);
        }, 800);
      }
    };

    fetchClusters();
  }, [user, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!user || user.role !== 'educator') return null;

  return (
    <div className="h-screen w-full flex bg-[#0B1120] text-slate-200 overflow-hidden font-sans">
      
      {/* Sidebar Panel */}
      <div className="w-64 glass-panel border-r border-slate-800 flex flex-col p-6 h-full relative z-10">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
            Admin Center
          </h1>
        </div>
        
        <nav className="flex-1 space-y-2">
          <a href="#" className="flex items-center gap-3 px-4 py-3 bg-purple-500/10 text-purple-300 font-medium rounded-xl border border-purple-500/20">
            <AlertTriangle className="w-5 h-5" />
            Misconception Clusters
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 rounded-xl transition-colors">
            <Users className="w-5 h-5" />
            Student Roster
          </a>
        </nav>

        <div className="mt-auto pt-6 border-t border-slate-800">
          <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-2 w-full text-slate-400 hover:text-rose-400 transition-colors">
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-10 overflow-y-auto relative">
        {/* Glow effect */}
        <div className="absolute top-[-5%] right-[-5%] w-[40rem] h-[40rem] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="max-w-6xl mx-auto">
          <header className="mb-10 flex justify-between items-end">
            <div>
              <h2 className="text-3xl font-bold text-white tracking-tight mb-2">Cohort Cognitive Health</h2>
              <p className="text-slate-400">Algorithmic clustering of outstanding student misconceptions.</p>
            </div>
            
            <div className="relative w-64">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input type="text" placeholder="Search cohorts..." className="w-full bg-slate-900 border border-slate-800 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-purple-500/50" />
            </div>
          </header>

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
               <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {clusters.map((cluster, idx) => (
                <div key={idx} className="glass-panel p-6 rounded-3xl hover:border-purple-500/30 transition-all duration-300 group">
                  <div className="flex justify-between items-start mb-4">
                    <div className={`px-3 py-1 text-xs font-semibold rounded-full border ${
                      cluster.severity === 'High' 
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      {cluster.severity} Priority
                    </div>
                    <div className="flex items-center gap-1.5 text-purple-300 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
                      <Users className="w-3.5 h-3.5" />
                      <span className="text-xs font-bold">{cluster.studentCount} Affected</span>
                    </div>
                  </div>
                  
                  <h3 className="text-xl font-semibold text-slate-100 mb-2 leading-snug">
                    "{cluster.misconception}"
                  </h3>
                  
                  <div className="mt-6 pt-4 border-t border-slate-700/50">
                    <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-3">Affected Students:</p>
                    <div className="flex flex-wrap gap-2">
                      {cluster.students.map((student, sIdx) => (
                        <span key={sIdx} className="text-xs px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg border border-slate-700 group-hover:border-slate-600 transition-colors">
                          {student}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button className="w-full mt-6 py-2.5 bg-slate-800 hover:bg-purple-600 text-sm font-medium rounded-xl transition-all border border-slate-700 hover:border-purple-500">
                    Deploy Targeted Intervention
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
