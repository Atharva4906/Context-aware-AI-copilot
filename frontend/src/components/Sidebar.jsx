import React from 'react';
import { BookOpen, Compass, Activity, LayoutDashboard, BrainCircuit, ShieldCheck, Gauge } from 'lucide-react';
import { useStore } from '../store/useStore';

export default function Sidebar() {
  const currentView = useStore(state => state.currentView);
  const setCurrentView = useStore(state => state.setCurrentView);
  const user = useStore(state => state.user) || { name: 'Atharva P.' };

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard' },
    { icon: Compass, label: 'Learning Paths' },
    { icon: Activity, label: 'Performance' },
    { icon: ShieldCheck, label: 'Audit Trail' },
    { icon: Gauge, label: 'Reinforcement Lab' },
  ];

  return (
    <div className="w-64 glass-panel border-r border-slate-700/50 flex flex-col h-full rounded-r-3xl m-4 mr-0 p-6 z-10">
      <div className="flex items-center gap-3 mb-12">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
          <BrainCircuit className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-400">
          Pragyantra
        </h1>
      </div>

      <nav className="flex-1 space-y-2">
        {navItems.map((item, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentView(item.label)}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 ${
              currentView === item.label
                ? 'bg-blue-500/10 text-cyan-400 font-medium border border-blue-500/20' 
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
            }`}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="mt-auto pt-6 border-t border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-700 overflow-hidden flex items-center justify-center border border-slate-600">
             <span className="text-sm font-bold text-slate-300">AP</span>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-200">Atharva P.</p>
            <p className="text-xs text-slate-400">Pro Student</p>
          </div>
        </div>
      </div>
    </div>
  );
}
