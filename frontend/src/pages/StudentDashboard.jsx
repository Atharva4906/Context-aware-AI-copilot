import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import Sidebar from '../components/Sidebar';
import LearningHub from '../components/LearningHub';
import FloatingCoPilot from '../components/FloatingCoPilot';
import StudentStatsOverview from '../components/StudentStatsOverview';
import StudentHistory from '../components/StudentHistory';
import AuditTrail from '../components/AuditTrail';
import ReinforcementLab from '../components/ReinforcementLab';

export default function StudentDashboard() {
  const user = useStore((state) => state.user);
  const currentView = useStore((state) => state.currentView);
  const navigate = useNavigate();

  useEffect(() => {
    // Basic Auth Guard
    if (!user || user.role !== 'student') {
      navigate('/');
    }
  }, [user, navigate]);

  if (!user || user.role !== 'student') return null;

  return (
    <div className="h-screen w-full flex bg-[#0a0a0a] text-neutral-200 overflow-hidden relative selection:bg-blue-500/30 font-sans">
      
      {/* ── Advanced Minimalist Background (Grid Removed) ── */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Subtle top glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] h-[500px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-[#0a0a0a]/0 to-transparent opacity-60 mix-blend-screen" />
        
        {/* Deep bottom corner ambient glows */}
        <div className="absolute bottom-[-20%] left-[-10%] w-[40vw] h-[40vw] bg-indigo-500/[0.02] rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[40vw] h-[40vw] bg-blue-500/[0.02] rounded-full blur-[120px]" />
      </div>

      {/* ── Application Layout ── */}
      {/* Wrapper ensures Sidebar and Content sit above the background */}
      <div className="relative z-10 flex h-full w-full">
        <Sidebar />
        
        <main className="flex-1 relative flex flex-col h-full overflow-hidden">
          {currentView === 'Learning Paths' && <LearningHub />}
          {currentView === 'Dashboard' && <StudentStatsOverview />}
          {currentView === 'Performance' && <StudentHistory />}
          {currentView === 'Audit Trail' && <AuditTrail />}
          {currentView === 'Reinforcement Lab' && <ReinforcementLab />}
        </main>
      </div>

    </div>
  );
}