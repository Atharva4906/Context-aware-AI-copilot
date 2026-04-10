import React from 'react';
import ReactMarkdown from 'react-markdown';
import { User, BrainCircuit } from 'lucide-react';
import GenerativeMCQ from './GenerativeMCQ';

export default function ChatBubble({ message, onMcqComplete }) {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} mb-6 `}>
      
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border shadow-sm ${
        isUser 
          ? 'bg-slate-700 border-slate-600' 
          : 'bg-gradient-to-br from-cyan-500 to-blue-600 border-cyan-400 shadow-cyan-500/30'
      }`}>
        {isUser ? <User className="w-4 h-4 text-slate-300" /> : <BrainCircuit className="w-5 h-5 text-white" />}
      </div>
      
      {/* Content Bubble */}
      <div className={`max-w-[85%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        
        {/* Name Label */}
        <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-500 mb-1 px-1">
          {isUser ? 'You' : 'Co-Pilot'}
        </span>
        
        {/* Main Bubble */}
        <div className={`p-4 rounded-2xl ${
          isUser 
            ? 'bg-blue-600 text-white rounded-tr-sm border border-blue-500' 
            : 'bg-slate-800 text-slate-200 rounded-tl-sm border border-slate-700 shadow-md shadow-black/20'
        }`}>
          {isUser ? (
            <p className="text-sm">{message.content}</p>
          ) : (
            <div className="prose prose-invert prose-sm prose-p:leading-relaxed prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-700 max-w-none">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>
        
        {/* Generative MCQ Extension */}
        {message.mcq && message.mcq.distractors && message.mcq.distractors.length > 0 && (
          <div className="mt-2 w-full">
            <GenerativeMCQ 
              mcqData={message.mcq} 
              patternHash={message.patternHash}
              predictedTopic={message.predictedTopic}
              onComplete={onMcqComplete}
            />
          </div>
        )}
      </div>
    </div>
  );
}
