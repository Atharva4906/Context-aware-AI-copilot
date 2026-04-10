import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { BrainCircuit, BookOpen, User, Lock, Mail } from 'lucide-react';
import axios from 'axios';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  
  const navigate = useNavigate();
  const login = useStore((state) => state.login);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      if (isLogin) {
        // Mock API call for Login
        // In a real hackathon MVP without the full backend yet, we can mock it 
        // to return a dummy user if the backend route isn't up
        login({ id: 'dummy-123', name: email.split('@')[0], role: role });
        navigate(role === 'educator' ? '/admin' : '/dashboard');
      } else {
        // Mock Register
        login({ id: 'dummy-123', name: name, role: role });
        navigate(role === 'educator' ? '/admin' : '/dashboard');
      }
    } catch (err) {
      setError('An error occurred during authentication.');
    }
  };

  return (
    <div className="h-screen w-full flex items-center justify-center bg-slate-900 relative overflow-hidden">
      {/* Background blur */}
      <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-cyan-500/20 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="glass-panel w-full max-w-md p-8 rounded-3xl z-10 animate-in fade-in zoom-in-95 duration-500">
        
        <div className="flex flex-col items-center justify-center text-center space-y-4 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
            <BrainCircuit className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-400">Pragyantra</h1>
            <p className="text-slate-400 text-sm mt-1">Context-Aware AI Learning</p>
          </div>
        </div>

        <div className="flex bg-slate-800/50 p-1 rounded-xl mb-6 border border-slate-700/50">
          <button 
            type="button"
            onClick={() => setRole('student')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${role === 'student' ? 'bg-cyan-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Student
          </button>
          <button 
            type="button"
            onClick={() => setRole('educator')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${role === 'educator' ? 'bg-purple-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Educator
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="relative">
              <User className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
              <input 
                type="text" 
                placeholder="Full Name" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                required
              />
            </div>
          )}
          
          <div className="relative">
            <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
            <input 
              type="email" 
              placeholder="Email Address" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
              required
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
            <input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
              required
            />
          </div>

          {error && <p className="text-rose-400 text-xs text-center">{error}</p>}

          <button 
            type="submit" 
            className={`w-full py-3 rounded-xl font-bold text-white transition-all shadow-lg hover:scale-[1.02] ${
              role === 'student' 
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 shadow-cyan-500/20' 
                : 'bg-gradient-to-r from-purple-500 to-pink-600 shadow-purple-500/20'
            }`}
          >
            {isLogin ? 'Sign In to Dashboard' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-400">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button 
            onClick={() => setIsLogin(!isLogin)} 
            className={`font-semibold hover:underline ${role === 'student' ? 'text-cyan-400' : 'text-purple-400'}`}
          >
            {isLogin ? 'Register' : 'Login'}
          </button>
        </div>
      </div>
    </div>
  );
}
