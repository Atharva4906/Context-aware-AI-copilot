import React, { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Play, Code, CheckCircle, FileText, BrainCircuit } from 'lucide-react';

export default function LearningHub() {
  const setContext = useStore((state) => state.setContext);
  const startTracking = useStore((state) => state.startTracking);

  const currentLessonContent = `
# Topic: Variable Scope in Python
Analyze the following code snippet. 

\`\`\`python
def calculate_total(price, tax):
    total = price + (price * tax)
    return total

print(total)
\`\`\`

Question: What happens when this code is executed?
Options:
A) It prints the total calculated amount.
B) It throws a NameError because 'total' is not defined in the global scope.
C) It prints 0.
D) It prompts the user for input.
  `.trim();

  // On mount, set the context for the agent and begin tracking hesitation
  useEffect(() => {
    setContext(currentLessonContent);
    startTracking();
  }, [currentLessonContent, setContext, startTracking]);

  return (
    <div className="flex-1 overflow-y-auto p-10 mt-4 relative">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header Ribbon */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold tracking-widest text-cyan-500 uppercase mb-1">Module 4 • Lesson 2</h2>
            <h1 className="text-4xl font-bold text-white">Functions & Variable Scope</h1>
          </div>
          <div className="flex items-center gap-2 bg-slate-800/80 px-4 py-2 rounded-full border border-slate-700">
             <CheckCircle className="w-5 h-5 text-emerald-500" />
             <span className="text-sm font-medium text-slate-300">45% Completed</span>
          </div>
        </div>

        {/* Lesson Content Area */}
        <div className="glass-panel rounded-3xl p-8 relative overflow-hidden">
          {/* Decorative background blur */}
          <div className="absolute -top-32 -right-32 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-blue-500/20 rounded-xl">
              <FileText className="w-6 h-6 text-cyan-400" />
            </div>
            <h3 className="text-2xl font-semibold text-slate-200">Current Challenge</h3>
          </div>

          <div className="prose prose-invert prose-blue max-w-none">
            <p className="text-lg text-slate-300 leading-relaxed mb-6">
              Review the Python function below. Understanding how variables exist within functions is critical for debugging complex applications.
            </p>
            
            <div className="bg-[#0f172a] rounded-xl p-6 font-mono text-sm shadow-inner border border-slate-700/50 mb-8 relative">
              <div className="absolute top-0 right-0 px-4 py-1 bg-slate-800 rounded-bl-lg rounded-tr-xl border-b border-l border-slate-700 text-xs text-slate-400">python</div>
              <span className="text-purple-400">def</span> <span className="text-blue-400">calculate_total</span>(price, tax):<br/>
              &nbsp;&nbsp;&nbsp;&nbsp;total = price + (price * tax)<br/>
              &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-purple-400">return</span> total<br/>
              <br/>
              <span className="text-yellow-300">print</span>(total)
            </div>

            <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
              <h4 className="text-lg font-semibold text-white mb-4">What happens when this code is executed?</h4>
              <div className="space-y-3">
                {['A) It prints the total calculated amount.', "B) It throws a NameError because 'total' is not defined in the global scope.", "C) It prints 0.", "D) It prompts the user for input."].map((opt, i) => (
                  <label key={i} className="flex items-start gap-4 p-4 rounded-xl hover:bg-slate-800 border border-slate-700 hover:border-blue-500/50 transition-colors cursor-pointer">
                    <input type="radio" onClick={() => useStore.getState().setTriggerDiagnosis(true)} name="quiz" className="mt-1 flex-shrink-0" />
                    <span className="text-slate-300">{opt}</span>
                  </label>
                ))}
              </div>
              <div className="mt-6 border-t border-slate-700/50 pt-6 flex justify-between items-center">
                <p className="text-sm text-slate-400">Not sure why you got it wrong?</p>
                <button 
                  onClick={() => useStore.getState().setTriggerDiagnosis(true)}
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl text-white font-medium shadow-lg hover:scale-105 transition-transform flex items-center gap-2"
                >
                  <BrainCircuit className="w-5 h-5" />
                  Diagnose Misconception
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
