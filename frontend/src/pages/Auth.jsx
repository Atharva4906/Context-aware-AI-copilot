import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { BrainCircuit, User, Lock, Mail, Sparkles } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';

const PENDING_ROLE_KEY = 'pending_auth_role';

function profileFromSession(session, fallbackRole = 'student') {
  const user = session?.user;
  const fullName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';
  const role = user?.user_metadata?.role || fallbackRole || 'student';
  return {
    id: user?.id,
    name: fullName,
    role,
    email: user?.email || null,
  };
}

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [oauthLoading, setOauthLoading] = useState(false);
  
  const navigate = useNavigate();
  const login = useStore((state) => state.login);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    const pendingRole = localStorage.getItem(PENDING_ROLE_KEY) || role;

    supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (sessionError) return;
      if (data?.session) {
        const profile = profileFromSession(data.session, pendingRole);
        login(profile);
        localStorage.removeItem(PENDING_ROLE_KEY);
        navigate(profile.role === 'educator' ? '/admin' : '/dashboard');
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const savedRole = localStorage.getItem(PENDING_ROLE_KEY) || role;
        const profile = profileFromSession(session, savedRole);
        login(profile);
        localStorage.removeItem(PENDING_ROLE_KEY);
        navigate(profile.role === 'educator' ? '/admin' : '/dashboard');
      }
    });

    return () => subscription.unsubscribe();
  }, [login, navigate, role]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const hackathon_uuid = '0e66f464-6255-4730-8429-ee14e5ef9bc7';
      if (isLogin) {
        // Mock API call for Login
        login({ id: hackathon_uuid, name: email.split('@')[0], role: role });
        navigate(role === 'educator' ? '/admin' : '/dashboard');
      } else {
        // Mock Register
        login({ id: hackathon_uuid, name: name, role: role });
        navigate(role === 'educator' ? '/admin' : '/dashboard');
      }
    } catch (err) {
      setError('An error occurred during authentication.');
    }
  };

  const handleGoogleAuth = async () => {
    setError('');
    if (!isSupabaseConfigured || !supabase) {
      setError('Supabase OAuth is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      return;
    }

    try {
      setOauthLoading(true);
      localStorage.setItem(PENDING_ROLE_KEY, role);
      const redirectTo = `${window.location.origin}/`;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
        },
      });
      if (oauthError) {
        throw oauthError;
      }
    } catch (oauthErr) {
      setOauthLoading(false);
      setError(oauthErr?.message || 'Google sign-in failed.');
    }
  };

  const isStudent = role === 'student';

  return (
    <div className="h-screen w-full flex items-center justify-center bg-[#0a0a0a] text-neutral-200 relative overflow-hidden font-sans selection:bg-blue-500/30">
      
      {/* ── Advanced Minimalist Background ── */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Subtle top glow matching the role */}
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] h-[500px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] ${isStudent ? 'from-blue-900/20' : 'from-purple-900/20'} via-[#0a0a0a]/0 to-transparent opacity-60 mix-blend-screen transition-colors duration-700`} />
      </div>

      <div className="w-full max-w-md p-8 md:p-10 bg-[#111113] border border-white/5 rounded-3xl z-10 relative shadow-2xl animate-in fade-in zoom-in-[0.98] duration-500">
        
        {/* Header */}
        <div className="flex flex-col items-center justify-center text-center space-y-4 mb-8">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-colors duration-500 ${isStudent ? 'bg-blue-500/10 border-blue-500/20' : 'bg-purple-500/10 border-purple-500/20'}`}>
            <BrainCircuit className={`w-6 h-6 ${isStudent ? 'text-blue-400' : 'text-purple-400'}`} />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Pragyantra</h1>
            <p className="text-neutral-500 text-sm mt-1.5 font-medium tracking-wide flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Context-Aware Engine
            </p>
          </div>
        </div>

        {/* Role Toggle */}
        <div className="flex bg-[#0a0a0a] p-1.5 rounded-xl mb-8 border border-white/5">
          <button 
            type="button"
            onClick={() => setRole('student')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-300 ${
              isStudent 
                ? 'bg-[#111113] text-blue-400 border border-white/5 shadow-sm' 
                : 'text-neutral-500 hover:text-neutral-300 border border-transparent'
            }`}
          >
            Student
          </button>
          <button 
            type="button"
            onClick={() => setRole('educator')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-300 ${
              !isStudent 
                ? 'bg-[#111113] text-purple-400 border border-white/5 shadow-sm' 
                : 'text-neutral-500 hover:text-neutral-300 border border-transparent'
            }`}
          >
            Educator
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="relative group">
              <User className="absolute left-4 top-3.5 w-5 h-5 text-neutral-600 group-focus-within:text-neutral-400 transition-colors" />
              <input 
                type="text" 
                placeholder="Full Name" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full bg-[#0a0a0a] border border-white/5 rounded-xl py-3.5 pl-12 pr-4 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-${isStudent ? 'blue' : 'purple'}-500/50 focus:ring-1 focus:ring-${isStudent ? 'blue' : 'purple'}-500/20 transition-all`}
                required
              />
            </div>
          )}
          
          <div className="relative group">
            <Mail className="absolute left-4 top-3.5 w-5 h-5 text-neutral-600 group-focus-within:text-neutral-400 transition-colors" />
            <input 
              type="email" 
              placeholder="Email Address" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full bg-[#0a0a0a] border border-white/5 rounded-xl py-3.5 pl-12 pr-4 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-${isStudent ? 'blue' : 'purple'}-500/50 focus:ring-1 focus:ring-${isStudent ? 'blue' : 'purple'}-500/20 transition-all`}
              required
            />
          </div>

          <div className="relative group">
            <Lock className="absolute left-4 top-3.5 w-5 h-5 text-neutral-600 group-focus-within:text-neutral-400 transition-colors" />
            <input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full bg-[#0a0a0a] border border-white/5 rounded-xl py-3.5 pl-12 pr-4 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-${isStudent ? 'blue' : 'purple'}-500/50 focus:ring-1 focus:ring-${isStudent ? 'blue' : 'purple'}-500/20 transition-all`}
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-medium text-center animate-in fade-in">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className={`w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-[1.02] shadow-lg ${
              isStudent 
                ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20' 
                : 'bg-purple-600 hover:bg-purple-500 shadow-purple-500/20'
            }`}
          >
            {isLogin ? 'Access Cognitive Engine' : 'Initialize Profile'}
          </button>

          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center" aria-hidden>
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-[#111113] px-3 text-[11px] uppercase tracking-wider text-neutral-500">or</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={oauthLoading}
            className="w-full py-3.5 rounded-xl text-sm font-semibold text-white border border-white/10 bg-[#0a0a0a] hover:bg-neutral-900 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
          >
            <span className="inline-flex w-5 h-5 rounded-full bg-white text-black items-center justify-center text-xs font-bold">G</span>
            {oauthLoading ? 'Redirecting to Google...' : `Continue with Google (${isStudent ? 'Student' : 'Educator'})`}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-neutral-500">
          {isLogin ? "Don't have a profile yet? " : "Already initialized? "}
          <button 
            onClick={() => setIsLogin(!isLogin)} 
            className={`font-semibold hover:underline transition-colors ${
              isStudent ? 'text-blue-400 hover:text-blue-300' : 'text-purple-400 hover:text-purple-300'
            }`}
          >
            {isLogin ? 'Register' : 'Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
}