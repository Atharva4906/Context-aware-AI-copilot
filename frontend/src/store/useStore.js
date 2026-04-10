import { create } from 'zustand';

export const useStore = create((set) => ({
  studentId: 'student-uuid-123', // Hardcoded for hackathon
  currentContext: '',
  setContext: (context) => set({ currentContext: context }),
  
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
