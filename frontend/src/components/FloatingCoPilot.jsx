import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useStore } from '../store/useStore';
import { Send, Cpu, Loader2, Sparkles, ChevronDown, MessageCircle } from 'lucide-react';
import ChatBubble from './ChatBubble';

export default function FloatingCoPilot() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputTimer, setInputTimer] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I am actively tracking the lesson on your left. Whenever you make a mistake, just drop your logic here and I will diagnose it!' }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [agentStatus, setAgentStatus] = useState('');

  const messagesEndRef = useRef(null);
  
  const studentId = useStore((state) => state.studentId);
  const currentContext = useStore((state) => state.currentContext);
  const incrementSwitch = useStore((state) => state.incrementSwitch);
  const incrementBackspace = useStore((state) => state.incrementBackspace);
  const startTracking = useStore((state) => state.startTracking);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(scrollToBottom, [messages, isTyping]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    if (val.length < inputValue.length) {
      incrementBackspace();
    }
    setInputValue(val);
  };

  // Simulates user hesitating if they keep switching tab/input focus
  const handleFocus = () => {
    incrementSwitch();
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const userMessage = { role: 'user', content: inputValue };
    setMessages(prev => [...prev, userMessage]);
    
    setInputValue('');
    setIsTyping(true);
    
    const statusSequence = [
      { text: "🧠 Cognitive Tracker mapping logic...", delay: 500 },
      { text: "⚖️ Verifying against MiRAGE vectors...", delay: 2000 },
      { text: "🔮 RL Engine predicting future failures...", delay: 4000 },
      { text: "✍️ Socrates generating guidance...", delay: 6000 }
    ];
    
    statusSequence.forEach(({ text, delay }) => {
      setTimeout(() => setAgentStatus(text), delay);
    });

    try {
      const questionId = useStore.getState().currentQuestionId;
      const category = useStore.getState().currentQuestionCategory;
      const tracking = useStore.getState();
      const metadata = {
        time_taken_seconds: tracking.startTime ? Math.floor((Date.now() - tracking.startTime) / 1000) : 0,
        switch_count: tracking.switchCount || 0,
        backspace_count: tracking.backspaceCount || 0,
      };
      
      const payload = {
        student_id: studentId,
        user_query: userMessage.content,
        student_explanation: userMessage.content,
        current_context: currentContext,
        metadata,
        is_correct: false,
        is_follow_up: false,
        follow_up_answers: null,
        question_id: questionId,
        category: category
      };

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await axios.post(`${apiUrl}/api/analyze-response`, payload);
      const data = response.data;
      
      const aiMessage = {
        role: 'assistant',
        content: data.feedback,
        mcq: data.mcq,
        predictedTopic: data.predicted_topic,
        patternHash: data.pattern_hash
      };
      setMessages(prev => [...prev, aiMessage]);
      startTracking(); 

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', content: '\`[Connection Error]\` I am having trouble reaching the API.'}]);
    } finally {
      setIsTyping(false);
      setAgentStatus('');
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 w-16 h-16 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 shadow-2xl shadow-cyan-500/50 flex items-center justify-center hover:scale-105 transition-transform animate-pulse-ring"
      >
        <MessageCircle className="w-8 h-8 text-white" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-8 right-8 w-[450px] h-[650px] shadow-2xl glass-panel flex flex-col rounded-3xl overflow-hidden border border-slate-700/60 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
      
      <div className="bg-slate-800/80 p-4 border-b border-slate-700 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center relative">
             <div className="absolute top-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900"></div>
             <Sparkles className="w-5 h-5 text-cyan-400" />
           </div>
           <div>
             <h3 className="font-bold text-slate-100">AI Co-Pilot</h3>
             <p className="text-xs text-cyan-400 font-medium tracking-wide">Context-Aware</p>
           </div>
        </div>
        <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-slate-700 rounded-full transition-colors">
          <ChevronDown className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 scroll-smooth">
        {messages.map((msg, i) => (
          <div key={i}>
            <ChatBubble message={msg} onMcqComplete={(isCorrect) => {}} />
          </div>
        ))}
        
        {isTyping && (
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-full border border-cyan-400/50 bg-slate-800 flex items-center justify-center animate-pulse">
               <Cpu className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-3 px-4 shadow-sm">
               <div className="flex items-center gap-2">
                 <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                 <span className="text-xs text-cyan-200 mt-0.5">{agentStatus || "Thinking..."}</span>
               </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-slate-800/90 border-t border-slate-700 backdrop-blur-xl">
        <form onSubmit={handleSend} className="relative flex items-center">
          <input 
            type="text" 
            value={inputValue}
            onFocus={handleFocus}
            onChange={handleInputChange}
            placeholder="Ask a question..."
            className="w-full bg-slate-900 border border-slate-700 rounded-full py-4 pl-5 pr-14 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all shadow-inner"
          />
          <button 
            type="submit" 
            disabled={!inputValue.trim() || isTyping}
            className="absolute right-2 p-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full text-white disabled:opacity-50 disabled:grayscale hover:scale-105 transition-transform shadow-md"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </form>
        <p className="text-[10px] text-center text-slate-500 mt-3 font-medium">
          Powered by CrewAI • MiRAGE Vectors
        </p>
      </div>
    </div>
  );
}
