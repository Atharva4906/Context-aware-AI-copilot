import { create } from 'zustand';
import axios from 'axios';

export const useStore = create((set) => ({
  user: null, 
  studentId: '0e66f464-6255-4730-8429-ee14e5ef9bc7', 
  lastGuessCorrect: false,
  login: (userData) => set({ user: userData, studentId: userData.id || '0e66f464-6255-4730-8429-ee14e5ef9bc7' }),
  logout: () => set({ user: null }),
  currentContext: '',
  setContext: (ctx) => set({ currentContext: ctx }),

  questions: [],
  currentQuestionIndex: 0,
  currentView: 'Learning Paths',
  setCurrentView: (view) => set({ currentView: view }),
  fetchQuestions: async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const res = await axios.get(`${apiUrl}/api/questions`);
      set({ questions: res.data });
    } catch (e) {
      console.error("Failed fetching questions", e);
    }
  },
  nextQuestion: () => set((state) => ({ 
    currentQuestionIndex: Math.min(state.currentQuestionIndex + 1, state.questions.length - 1),
    lastGuessCorrect: false
  })),

  triggerDiagnosis: false,
  setTriggerDiagnosis: (val) => set({ triggerDiagnosis: val }),
  
  // Interaction Metadata for Hesitation Detector
  startTime: null,
  switchCount: 0,
  backspaceCount: 0,
  startTracking: () => set({ startTime: Date.now(), switchCount: 0, backspaceCount: 0 }),
  incrementSwitch: () => set((state) => ({ switchCount: state.switchCount + 1 })),
  incrementBackspace: () => set((state) => ({ backspaceCount: state.backspaceCount + 1 })),
  getMetadata: () => {
    return (state) => {
      const timeTaken = state.startTime ? Math.floor((Date.now() - state.startTime) / 1000) : 0;
      return {
        time_taken_seconds: timeTaken,
        switch_count: state.switchCount,
        backspace_count: state.backspaceCount
      };
    };
  }
}));
