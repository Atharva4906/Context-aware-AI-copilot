import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import { Users, AlertTriangle, CheckCircle, BarChart3, LogOut, Search, Check, X } from 'lucide-react';
import axios from 'axios';

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

  const handleLogout = () => {
    logout();
    navigate('/');
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
              {clusters.length === 0 && (
                <div className="col-span-full text-slate-400">No cluster data available yet.</div>
              )}
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

          <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-panel p-6 rounded-3xl border border-slate-700/50">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <h3 className="text-xl font-semibold text-white">Misconception Review</h3>
              </div>
              {misconceptionReviews.length === 0 && (
                <div className="text-slate-400 text-sm">No pending misconceptions.</div>
              )}
              {misconceptionReviews.map((item) => (
                <div key={item.review_id} className="mb-4 rounded-2xl border border-slate-700/60 bg-slate-900/60 p-4">
                  <p className="text-sm font-semibold text-slate-100">{item.topic || 'Untitled topic'}</p>
                  <p className="text-xs text-slate-400 mt-2">{item.flawed_logic_description}</p>
                  <p className="text-xs text-slate-500 mt-2">Remedy: {item.remedial_strategy}</p>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleReviewDecision(item.review_id, 'misconception', 'approve')}
                      className="flex items-center gap-2 rounded-xl border border-emerald-400/30 px-3 py-2 text-xs text-emerald-200"
                    >
                      <Check className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button
                      onClick={() => handleReviewDecision(item.review_id, 'misconception', 'reject')}
                      className="flex items-center gap-2 rounded-xl border border-rose-400/30 px-3 py-2 text-xs text-rose-200"
                    >
                      <X className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="glass-panel p-6 rounded-3xl border border-slate-700/50">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <h3 className="text-xl font-semibold text-white">Curriculum Graph Review</h3>
              </div>
              {graphReviews.length === 0 && (
                <div className="text-slate-400 text-sm">No pending graph edges.</div>
              )}
              {graphReviews.map((item) => (
                <div key={item.review_id} className="mb-4 rounded-2xl border border-slate-700/60 bg-slate-900/60 p-4">
                  <p className="text-sm text-slate-100">{item.prerequisite_topic} → {item.dependent_topic}</p>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleReviewDecision(item.review_id, 'graph', 'approve')}
                      className="flex items-center gap-2 rounded-xl border border-emerald-400/30 px-3 py-2 text-xs text-emerald-200"
                    >
                      <Check className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button
                      onClick={() => handleReviewDecision(item.review_id, 'graph', 'reject')}
                      className="flex items-center gap-2 rounded-xl border border-rose-400/30 px-3 py-2 text-xs text-rose-200"
                    >
                      <X className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                </div>
              ))}

              <div className="mt-4 border-t border-slate-700/60 pt-4">
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Add edge manually</p>
                <div className="flex flex-col gap-2">
                  <input
                    value={edgePrereq}
                    onChange={(event) => setEdgePrereq(event.target.value)}
                    placeholder="Prerequisite topic"
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-xs text-slate-200"
                  />
                  <input
                    value={edgeDependent}
                    onChange={(event) => setEdgeDependent(event.target.value)}
                    placeholder="Dependent topic"
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2 text-xs text-slate-200"
                  />
                  <button
                    onClick={handleCreateEdge}
                    className="rounded-xl border border-emerald-400/40 px-3 py-2 text-xs text-emerald-200"
                  >
                    Queue Edge
                  </button>
                </div>
              </div>
            </div>
          </div>

          {reviewStatus && (
            <div className="mt-6 rounded-2xl border border-slate-700/60 bg-slate-900/60 p-4 text-xs text-slate-300">
              {reviewStatus}
            </div>
          )}

          <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-panel p-6 rounded-3xl border border-slate-700/50">
              <div className="flex items-center gap-3 mb-4">
                <Users className="w-5 h-5 text-cyan-300" />
                <h3 className="text-xl font-semibold text-white">Student Misconceptions</h3>
              </div>
              {studentMisconceptions.length === 0 && (
                <div className="text-slate-400 text-sm">No student misconception data yet.</div>
              )}
              {studentMisconceptions.map((item) => (
                <div key={item.state_id} className="mb-4 rounded-2xl border border-slate-700/60 bg-slate-900/60 p-4">
                  <p className="text-sm text-slate-100">
                    <span className="font-semibold">{item.student_name || item.student_id}</span> — {item.topic || 'Unknown topic'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Encounters: {item.encounter_count} • Status: {item.status}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => handleStatusUpdate(item.state_id, 'unresolved')}
                      className="rounded-xl border border-amber-400/30 px-3 py-1.5 text-[11px] text-amber-200"
                    >
                      Mark Unresolved
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(item.state_id, 'reviewing')}
                      className="rounded-xl border border-blue-400/30 px-3 py-1.5 text-[11px] text-blue-200"
                    >
                      Mark Reviewing
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(item.state_id, 'resolved')}
                      className="rounded-xl border border-emerald-400/30 px-3 py-1.5 text-[11px] text-emerald-200"
                    >
                      Mark Resolved
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="glass-panel p-6 rounded-3xl border border-slate-700/50">
              <div className="flex items-center gap-3 mb-4">
                <Users className="w-5 h-5 text-purple-300" />
                <h3 className="text-xl font-semibold text-white">Student Roster</h3>
              </div>
              {students.length === 0 && (
                <div className="text-slate-400 text-sm">No students found.</div>
              )}
              <div className="space-y-3">
                {students.map((student) => (
                  <div key={student.student_id} className="rounded-2xl border border-slate-700/60 bg-slate-900/60 p-3">
                    <p className="text-sm text-slate-100 font-semibold">{student.name}</p>
                    <p className="text-xs text-slate-400">{student.email || 'No email'} • {student.role || 'student'}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
