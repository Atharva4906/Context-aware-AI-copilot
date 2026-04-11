import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import { Users, AlertTriangle, CheckCircle2, BarChart3, LogOut, Search, Check, X, BrainCircuit, Sparkles, PlusSquare } from 'lucide-react';
import axios from 'axios';
import EducatorQuestionForm from '../components/EducatorQuestionForm';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';

export default function EducatorDashboard() {
  const user = useStore((state) => state.user);
  const logout = useStore((state) => state.logout);
  const navigate = useNavigate();
  
  const [clusters, setClusters] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [misconceptionReviews, setMisconceptionReviews] = useState([]);
  const [graphReviews, setGraphReviews] = useState([]);
  const [studentMisconceptions, setStudentMisconceptions] = useState([]);
  const [students, setStudents] = useState([]);
  const [edgePrereq, setEdgePrereq] = useState('');
  const [edgeDependent, setEdgeDependent] = useState('');
  const [reviewStatus, setReviewStatus] = useState('');
  const [activeView, setActiveView] = useState('overview');

  // Note: For hackathon purpose, if backend route is not ready, we mock it.
  useEffect(() => {
    if (!user || user.role !== 'educator') {
      navigate('/');
      return;
    }

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    const fetchClusters = async () => {
      try {
        const response = await axios.get(`${apiUrl}/api/admin/cluster-students`);
        setClusters(response.data.clusters);
        setIsLoading(false);
      } catch (err) {
        console.error("Failed to fetch clusters.", err);
        setIsLoading(false);
      }
    };

    const fetchReviews = async () => {
      try {
        const [misconceptionsRes, graphRes] = await Promise.all([
          axios.get(`${apiUrl}/api/admin/misconception-reviews`),
          axios.get(`${apiUrl}/api/admin/graph-reviews`)
        ]);
        setMisconceptionReviews(misconceptionsRes.data.items || []);
        setGraphReviews(graphRes.data.items || []);
      } catch (err) {
        console.error('Failed to fetch review queues', err);
      }
    };

    const fetchStudentData = async () => {
      try {
        const [misconceptionsRes, studentsRes] = await Promise.all([
          axios.get(`${apiUrl}/api/admin/student-misconceptions`),
          axios.get(`${apiUrl}/api/admin/students`)
        ]);
        setStudentMisconceptions(misconceptionsRes.data.items || []);
        setStudents(studentsRes.data.students || []);
      } catch (err) {
        console.error('Failed to fetch student data', err);
      }
    };

    fetchClusters();
    fetchReviews();
    fetchStudentData();
  }, [user, navigate]);

  const handleLogout = async () => {
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.error('Supabase sign out failed', err);
    } finally {
      localStorage.removeItem('pending_auth_role');
      logout();
      navigate('/');
    }
  };

  const handleReviewDecision = async (reviewId, type, decision) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const path = type === 'misconception'
        ? `/api/admin/misconception-reviews/${reviewId}/${decision}`
        : `/api/admin/graph-reviews/${reviewId}/${decision}`;
      await axios.post(`${apiUrl}${path}`);
      setReviewStatus(`${decision === 'approve' ? 'Approved' : 'Rejected'} ${type} review.`);
      const refreshed = await Promise.all([
        axios.get(`${apiUrl}/api/admin/misconception-reviews`),
        axios.get(`${apiUrl}/api/admin/graph-reviews`)
      ]);
      setMisconceptionReviews(refreshed[0].data.items || []);
      setGraphReviews(refreshed[1].data.items || []);
    } catch (err) {
      console.error(err);
      setReviewStatus('Failed to update review status.');
    }
  };

  const handleCreateEdge = async () => {
    if (!edgePrereq.trim() || !edgeDependent.trim()) {
      setReviewStatus('Both prerequisite and dependent topics are required.');
      return;
    }
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      await axios.post(`${apiUrl}/api/admin/graph-reviews`, {
        prerequisite_topic: edgePrereq.trim(),
        dependent_topic: edgeDependent.trim()
      });
      setReviewStatus('Graph edge queued for review.');
      setEdgePrereq('');
      setEdgeDependent('');
      const graphRes = await axios.get(`${apiUrl}/api/admin/graph-reviews`);
      setGraphReviews(graphRes.data.items || []);
    } catch (err) {
      console.error(err);
      setReviewStatus('Failed to queue graph edge.');
    }
  };

  const handleStatusUpdate = async (stateId, status) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      await axios.post(`${apiUrl}/api/admin/student-misconceptions/${stateId}/status`, { status });
      setReviewStatus(`Status updated to ${status}.`);
      const res = await axios.get(`${apiUrl}/api/admin/student-misconceptions`);
      setStudentMisconceptions(res.data.items || []);
    } catch (err) {
      console.error(err);
      setReviewStatus('Failed to update status.');
    }
  };

  if (!user || user.role !== 'educator') return null;

  return (
    <div className="h-screen w-full flex bg-[#0a0a0a] text-neutral-200 overflow-hidden font-sans selection:bg-purple-500/30">
      
      {/* ── Advanced Minimalist Background ── */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] h-[500px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-[#0a0a0a]/0 to-transparent opacity-50 mix-blend-screen" />
      </div>

      {/* ── Sidebar Panel ── */}
      <div className="w-64 bg-[#0a0a0a] border-r border-white/5 flex flex-col p-6 h-full relative z-10">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20">
            <BarChart3 className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">Admin Center</h1>
            <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest mt-0.5">Pragyantra</p>
          </div>
        </div>
        
        <nav className="flex-1 space-y-1">
          <button
            onClick={() => setActiveView('overview')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all relative ${
              activeView === 'overview'
                ? 'bg-white/5 text-white'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.02]'
            }`}
          >
            {activeView === 'overview' && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-purple-500 rounded-r-full" />}
            <AlertTriangle className="w-4 h-4 text-purple-400" />
            Cognitive Clusters
          </button>
          <button
            onClick={() => setActiveView('add-questions')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all relative ${
              activeView === 'add-questions'
                ? 'bg-white/5 text-white'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.02]'
            }`}
          >
            {activeView === 'add-questions' && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-purple-500 rounded-r-full" />}
            <PlusSquare className="w-4 h-4" />
            Add Questions
          </button>
          <button
            onClick={() => setActiveView('overview')}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.02] text-sm font-medium rounded-lg transition-colors"
          >
            <Users className="w-4 h-4" />
            Student Roster
          </button>
        </nav>

        <div className="mt-auto pt-6 border-t border-white/5">
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2 w-full text-sm font-medium text-neutral-500 hover:text-rose-400 transition-colors rounded-lg hover:bg-rose-500/10">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 p-6 md:p-10 overflow-y-auto relative z-10">
        {activeView === 'add-questions' ? (
          <EducatorQuestionForm />
        ) : (
        <div className="max-w-6xl mx-auto pb-16">
          
          <header className="mb-10 flex flex-col md:flex-row justify-between md:items-end gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2 text-purple-400">
                <Sparkles className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-widest">Educator Overview</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight mb-2">Cohort Cognitive Health</h2>
              <p className="text-neutral-400 text-sm">Algorithmic clustering of outstanding student misconceptions.</p>
            </div>
            
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-neutral-500" />
              <input 
                type="text" 
                placeholder="Search cohorts..." 
                className="w-full bg-[#111113] border border-white/5 rounded-full py-2.5 pl-10 pr-4 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all" 
              />
            </div>
          </header>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <div className="relative">
                <div className="absolute inset-0 blur-xl bg-purple-500/20 rounded-full animate-pulse" />
                <BrainCircuit className="w-8 h-8 relative z-10 animate-pulse text-purple-400" />
              </div>
              <p className="text-xs uppercase tracking-widest font-medium text-neutral-500">Analyzing Clusters...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {clusters.length === 0 && (
                <div className="col-span-full text-neutral-500 text-sm p-8 text-center border border-white/5 border-dashed rounded-2xl bg-[#111113]">
                  No cluster data available yet.
                </div>
              )}
              {clusters.map((cluster, idx) => (
                <div key={idx} className="bg-[#111113] p-6 rounded-2xl border border-white/5 hover:border-white/10 transition-all duration-300 group shadow-sm">
                  <div className="flex justify-between items-start mb-5">
                    <div className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded border ${
                      cluster.severity === 'High' 
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      {cluster.severity} Priority
                    </div>
                    <div className="flex items-center gap-1.5 text-purple-300 bg-purple-500/10 px-2.5 py-1 rounded border border-purple-500/20">
                      <Users className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">{cluster.studentCount} Affected</span>
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-white mb-2 leading-snug">
                    "{cluster.misconception}"
                  </h3>
                  
                  <div className="mt-5 pt-4 border-t border-white/5">
                    <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-semibold mb-3">Affected Students:</p>
                    <div className="flex flex-wrap gap-2">
                      {cluster.students.map((student, sIdx) => (
                        <span key={sIdx} className="text-xs px-2.5 py-1 bg-[#0a0a0a] text-neutral-300 rounded-md border border-white/5">
                          {student}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button className="w-full mt-6 py-2.5 bg-white text-black hover:bg-neutral-200 text-sm font-semibold rounded-xl transition-all">
                    Deploy Targeted Intervention
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ── Review Queues Section ── */}
          <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Misconception Review */}
            <div className="bg-[#111113] p-6 md:p-8 rounded-2xl border border-white/5">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  <h3 className="text-base font-semibold text-white">Misconception Review</h3>
                </div>
                <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest bg-[#0a0a0a] px-2 py-1 rounded border border-white/5">Queue</span>
              </div>
              
              {misconceptionReviews.length === 0 && (
                <div className="text-neutral-500 text-sm py-4 text-center">No pending misconceptions.</div>
              )}
              <div className="space-y-3">
                {misconceptionReviews.map((item) => (
                  <div key={item.review_id} className="rounded-xl border border-white/5 bg-white/[0.02] p-4 hover:bg-white/[0.04] transition-colors">
                    <p className="text-sm font-semibold text-white">{item.topic || 'Untitled topic'}</p>
                    <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">{item.flawed_logic_description}</p>
                    <p className="text-xs text-neutral-500 mt-2 font-medium">Remedy: <span className="text-neutral-300">{item.remedial_strategy}</span></p>
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => handleReviewDecision(item.review_id, 'misconception', 'approve')}
                        className="flex-1 flex justify-center items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-2 text-xs font-semibold text-emerald-300 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => handleReviewDecision(item.review_id, 'misconception', 'reject')}
                        className="flex-1 flex justify-center items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-2 text-xs font-semibold text-rose-300 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Curriculum Graph Review */}
            <div className="bg-[#111113] p-6 md:p-8 rounded-2xl border border-white/5">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-base font-semibold text-white">Curriculum Graph</h3>
                </div>
                <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest bg-[#0a0a0a] px-2 py-1 rounded border border-white/5">Queue</span>
              </div>

              {graphReviews.length === 0 && (
                <div className="text-neutral-500 text-sm py-4 text-center">No pending graph edges.</div>
              )}
              <div className="space-y-3">
                {graphReviews.map((item) => (
                  <div key={item.review_id} className="rounded-xl border border-white/5 bg-white/[0.02] p-4 hover:bg-white/[0.04] transition-colors">
                    <p className="text-sm font-medium text-neutral-200">
                      <span className="text-neutral-400">From:</span> {item.prerequisite_topic} <br/>
                      <span className="text-neutral-400">To:</span> {item.dependent_topic}
                    </p>
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => handleReviewDecision(item.review_id, 'graph', 'approve')}
                        className="flex-1 flex justify-center items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-2 text-xs font-semibold text-emerald-300 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => handleReviewDecision(item.review_id, 'graph', 'reject')}
                        className="flex-1 flex justify-center items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-2 text-xs font-semibold text-rose-300 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Edge Manually */}
              <div className="mt-6 pt-5 border-t border-white/5">
                <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold mb-3">Add edge manually</p>
                <div className="flex flex-col gap-3">
                  <input
                    value={edgePrereq}
                    onChange={(event) => setEdgePrereq(event.target.value)}
                    placeholder="Prerequisite topic"
                    className="w-full rounded-xl border border-white/5 bg-[#0a0a0a] px-4 py-2.5 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-purple-500/50"
                  />
                  <input
                    value={edgeDependent}
                    onChange={(event) => setEdgeDependent(event.target.value)}
                    placeholder="Dependent topic"
                    className="w-full rounded-xl border border-white/5 bg-[#0a0a0a] px-4 py-2.5 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-purple-500/50"
                  />
                  <button
                    onClick={handleCreateEdge}
                    className="rounded-xl bg-white text-black hover:bg-neutral-200 px-4 py-2.5 text-sm font-semibold transition-colors mt-1"
                  >
                    Queue Edge
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Status Banner */}
          {reviewStatus && (
            <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm font-medium text-neutral-300 flex items-center justify-center animate-in fade-in">
              {reviewStatus}
            </div>
          )}

          {/* ── Lower Section ── */}
          <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Student Misconceptions */}
            <div className="bg-[#111113] p-6 md:p-8 rounded-2xl border border-white/5">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <BrainCircuit className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-base font-semibold text-white">Student Misconceptions</h3>
                </div>
              </div>
              
              {studentMisconceptions.length === 0 && (
                <div className="text-neutral-500 text-sm py-4 text-center">No student misconception data yet.</div>
              )}
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {studentMisconceptions.map((item) => (
                  <div key={item.state_id} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                    <p className="text-sm text-white">
                      <span className="font-semibold text-cyan-400">{item.student_name || item.student_id}</span>
                      <span className="text-neutral-500 mx-2">—</span> 
                      {item.topic || 'Unknown topic'}
                    </p>
                    <p className="text-xs text-neutral-400 mt-2 font-mono">
                      Encounters: {item.encounter_count} <span className="mx-2">•</span> Status: {item.status}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={() => handleStatusUpdate(item.state_id, 'unresolved')}
                        className="rounded-lg border border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 text-[11px] font-semibold text-amber-300 transition-colors"
                      >
                        Unresolved
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(item.state_id, 'reviewing')}
                        className="rounded-lg border border-blue-500/20 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 text-[11px] font-semibold text-blue-300 transition-colors"
                      >
                        Reviewing
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(item.state_id, 'resolved')}
                        className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 text-[11px] font-semibold text-emerald-300 transition-colors"
                      >
                        Resolved
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Student Roster */}
            <div className="bg-[#111113] p-6 md:p-8 rounded-2xl border border-white/5">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-purple-400" />
                  <h3 className="text-base font-semibold text-white">Student Roster</h3>
                </div>
                <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest bg-[#0a0a0a] px-2 py-1 rounded border border-white/5">Directory</span>
              </div>

              {students.length === 0 && (
                <div className="text-neutral-500 text-sm py-4 text-center">No students found.</div>
              )}
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {students.map((student) => (
                  <div key={student.student_id} className="rounded-xl border border-white/5 bg-white/[0.02] p-4 flex items-center justify-between hover:bg-white/[0.04] transition-colors">
                    <div>
                      <p className="text-sm text-white font-semibold">{student.name}</p>
                      <p className="text-xs text-neutral-500 mt-1">{student.email || 'No email'}</p>
                    </div>
                    <span className="text-[10px] uppercase tracking-widest font-bold text-neutral-400 bg-[#0a0a0a] border border-white/5 px-2 py-1 rounded">
                      {student.role || 'student'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
        </div>
        )}
      </div>
    </div>
  );
}