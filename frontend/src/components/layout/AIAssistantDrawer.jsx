import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, Bot, User, ArrowRight, CornerDownLeft, RotateCcw } from 'lucide-react';
import { useCareer } from '../../context/CareerContext';
import API from '../../services/api';

export default function AIAssistantDrawer() {
  const { isAiDrawerOpen, setIsAiDrawerOpen, profile } = useCareer();
  const targetRole = profile?.targetRole || 'Software Engineer';

  const [messages, setMessages] = useState([
    { 
      sender: 'ai', 
      text: `Hello ${profile?.name || 'there'}! I am your real-time AI Career & Engineering Mentor. Ask me any technical coding questions (e.g., closures, React, JWT, DSA), ask about your skill gaps, or let me help you prepare for ${targetRole} interviews!` 
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState([
    'What skills am I missing for my target role?',
    'Explain closures in JavaScript with an example',
    'How does JWT authentication work?',
    'Give me a DSA problem to practice'
  ]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isAiDrawerOpen) {
      scrollToBottom();
    }
  }, [messages, isAiDrawerOpen]);

  const handleSend = async (textToSend) => {
    const query = (textToSend || input).trim();
    if (!query) return;

    const userMessage = { sender: 'user', text: query };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsTyping(true);

    try {
      // Build conversation history for the backend LLM
      const historyForApi = updatedMessages.slice(-6).map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text
      }));

      const res = await API.post('/assistant/chat', {
        message: query,
        conversationHistory: historyForApi
      });

      if (res.data && res.data.success && res.data.data) {
        const { reply, suggestedNextQuestions } = res.data.data;
        setMessages(prev => [...prev, { sender: 'ai', text: reply }]);
        if (Array.isArray(suggestedNextQuestions) && suggestedNextQuestions.length > 0) {
          setSuggestedQuestions(suggestedNextQuestions);
        }
      } else {
        setMessages(prev => [
          ...prev, 
          { sender: 'ai', text: 'I encountered an issue processing your request. Please try asking again.' }
        ]);
      }
    } catch (err) {
      console.error('AI chat error:', err);
      setMessages(prev => [
        ...prev, 
        { sender: 'ai', text: 'CareerAI service is momentarily unavailable. Please check your connection and try again.' }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  // Helper to render markdown-like text with code blocks
  const renderMessageContent = (text) => {
    if (!text) return null;

    // Detect code blocks (```code```)
    const codeBlockRegex = /```([a-zA-Z0-9]*)\n?([\s\S]*?)```/g;
    const parts = [];
    let lastIdx = 0;
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      if (match.index > lastIdx) {
        parts.push({ type: 'text', content: text.substring(lastIdx, match.index) });
      }
      parts.push({ type: 'code', lang: match[1], content: match[2].trim() });
      lastIdx = match.index + match[0].length;
    }
    if (lastIdx < text.length) {
      parts.push({ type: 'text', content: text.substring(lastIdx) });
    }

    return (
      <div className="space-y-2">
        {parts.map((p, i) => {
          if (p.type === 'code') {
            return (
              <pre key={i} className="bg-slate-900 text-slate-100 p-3 rounded-xl overflow-x-auto text-[11px] font-mono leading-relaxed border border-slate-800">
                <code>{p.content}</code>
              </pre>
            );
          }
          return (
            <div key={i} className="whitespace-pre-line leading-relaxed">
              {p.content}
            </div>
          );
        })}
      </div>
    );
  };

  if (!isAiDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs font-sans">
      <div className="w-full max-w-lg bg-white h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm">CareerAI Mentor</h3>
              <p className="text-[10px] text-slate-400">Context: <span className="text-indigo-300 font-semibold">{targetRole}</span></p>
            </div>
          </div>
          <button 
            id="close-ai-assistant-btn"
            onClick={() => setIsAiDrawerOpen(false)}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat History */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/60">
          {messages.map((m, idx) => (
            <div 
              key={idx} 
              className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.sender === 'ai' && (
                <div className="w-7 h-7 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-1 shadow-xs">
                  <Bot className="w-4 h-4" />
                </div>
              )}
              <div className={`p-3.5 rounded-2xl max-w-[85%] text-xs shadow-xs ${
                m.sender === 'user' 
                  ? 'bg-indigo-600 text-white rounded-br-none' 
                  : 'bg-white text-slate-800 rounded-bl-none border border-slate-200'
              }`}>
                {renderMessageContent(m.text)}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-2.5 items-center text-xs text-slate-400 pl-2">
              <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 animate-spin" />
              </div>
              <span className="font-medium text-slate-500">Thinking...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Next Questions */}
        {suggestedQuestions.length > 0 && !isTyping && (
          <div className="p-3 bg-white border-t border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Suggested Questions:
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {suggestedQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(q)}
                  className="text-[11px] px-2.5 py-1 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 border border-slate-200 transition text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-3 border-t border-slate-200 bg-white">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex items-center gap-2"
          >
            <input
              id="ai-assistant-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask anything about ${targetRole}, React, DSA, or your resume...`}
              disabled={isTyping}
              className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:border-indigo-500 focus:bg-white transition"
            />
            <button
              id="ai-assistant-send-btn"
              type="submit"
              disabled={isTyping || !input.trim()}
              className="p-2.5 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition disabled:opacity-40 shadow-xs"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
