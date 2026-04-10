import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import Sidebar from '../components/Sidebar';
import LearningHub from '../components/LearningHub';
import FloatingCoPilot from '../components/FloatingCoPilot';
import StudentStatsOverview from '../components/StudentStatsOverview';
import StudentHistory from '../components/StudentHistory';

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
    <div className="h-screen w-full flex bg-slate-900 overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[20%] left-[10%] w-[40rem] h-[40rem] bg-blue-600/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[10%] right-[10%] w-[30rem] h-[30rem] bg-cyan-500/10 rounded-full blur-[100px]"></div>
      </div>

      <Sidebar />
      {currentView === 'Learning Paths' && <LearningHub />}
      {currentView === 'Dashboard' && <StudentStatsOverview />}
      {currentView === 'Performance' && <StudentHistory />}
      
      <FloatingCoPilot />
    </div>
  );
}
