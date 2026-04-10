import React from 'react';
import Sidebar from './components/Sidebar';
import LearningHub from './components/LearningHub';
import FloatingCoPilot from './components/FloatingCoPilot';

function App() {
  return (
    <div className="h-screen w-full flex bg-slate-900 overflow-hidden relative">
      {/* Dynamic Background */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[-20%] h-[-20%]"></div>
        <div className="absolute top-[20%] left-[10%] w-[40rem] h-[40rem] bg-blue-600/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[10%] right-[10%] w-[30rem] h-[30rem] bg-cyan-500/10 rounded-full blur-[100px]"></div>
      </div>

      <Sidebar />
      <LearningHub />
      <FloatingCoPilot />
    </div>
  );
}

export default App;
