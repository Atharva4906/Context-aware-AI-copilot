import { create } from 'zustand';

export const useStore = create((set) => ({
  user: null, // { id: 'uuid', role: 'student' | 'educator', name: 'Atharva' }
  studentId: 'student-uuid-123', // Keeping as fallback or update dynamically
  login: (userData) => set({ user: userData, studentId: userData.id }),
  logout: () => set({ user: null }),
  currentContext: '',
  setContext: (context) => set({ currentContext: context }),
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
