import React from 'react';
import { BookOpen, Compass, Activity, LayoutDashboard, BrainCircuit, ShieldCheck, Gauge, Zap } from 'lucide-react';
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
    <div className="w-64 bg-[#0a0a0a] border-r border-white/5 flex flex-col h-full z-10 relative">
      
      {/* ── Brand Header ── */}
      <div className="flex items-center gap-3 p-6 mb-2">
        <div className="w-9 h-9 rounded-lg bg-blue-600/10 flex items-center justify-center border border-blue-500/20">
          <BrainCircuit className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight">
            Pragyantra
          </h1>
          <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest mt-0.5">
            Cognitive Engine
          </p>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 space-y-1 px-4">
        <div className="px-3 mb-3">
          <span className="text-[10px] font-semibold text-neutral-600 uppercase tracking-widest">Menu</span>
        </div>
        {navItems.map((item, idx) => {
          const isActive = currentView === item.label;
          return (
            <button
              key={idx}
              onClick={() => setCurrentView(item.label)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium relative group ${
                isActive
                  ? 'text-white bg-white/5' 
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/[0.02]'
              }`}
            >
              {/* Active Indicator Line */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-blue-500 rounded-r-full" />
              )}
              <item.icon className={`w-4 h-4 transition-colors ${isActive ? 'text-blue-400' : 'text-neutral-500 group-hover:text-neutral-400'}`} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* ── User Profile Footer ── */}
      <div className="p-4 mt-auto border-t border-white/5">
        <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.02] transition-colors cursor-pointer border border-transparent hover:border-white/5 group">
          <div className="w-9 h-9 rounded-full bg-neutral-900 flex items-center justify-center border border-white/10 group-hover:border-blue-500/30 transition-colors relative overflow-hidden">
            {/* Subtle glow inside avatar */}
            <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="text-xs font-bold text-neutral-300 relative z-10">AP</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-neutral-200 truncate">Atharva P.</p>
            <div className="flex items-center gap-1 text-[11px] text-blue-400/80 font-medium">
              <Zap className="w-3 h-3" />
              Pro Student
            </div>
          </div>
        </div>
      </div>
      
    </div>
  );
}