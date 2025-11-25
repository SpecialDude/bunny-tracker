import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Search, Brain, Loader2, ExternalLink } from 'lucide-react';
import { askFarmAssistant, searchWeb, AIResponse } from '../services/geminiService';
import { ChatMessage } from '../types';

export const AIChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'model', text: 'Hello! I am your AI Farm Assistant. Ask me about your rabbits, finances, or search the web for prices.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'assistant' | 'search'>('assistant');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Mock context data - in a real app, this would come from a Context provider or Store
  const mockFarmContext = `
    Farm Name: Sunny Rabbits.
    Total Rabbits: 45.
    Breeds: Rex, New Zealand White.
    Active Pregnancies: 3.
    Low feed stock alert.
  `;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      let result: AIResponse;
      
      if (mode === 'assistant') {
        result = await askFarmAssistant(userMsg.text, mockFarmContext);
      } else {
        result = await searchWeb(userMsg.text);
      }

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: result.text,
        groundingUrls: result.groundingUrls
      };

      setMessages(prev => [...prev, botMsg]);

    } catch (e) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "Error communicating with AI." }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-farm-600 hover:bg-farm-700 text-white p-4 rounded-full shadow-xl transition-all z-50 flex items-center gap-2"
      >
        <MessageSquare size={24} />
        <span className="hidden md:inline font-medium">AI Assistant</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-[90vw] md:w-96 h-[600px] bg-white rounded-xl shadow-2xl border border-gray-200 z-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-farm-600 p-4 flex justify-between items-center text-white">
        <div className="flex items-center gap-2">
          <Brain size={20} />
          <h3 className="font-semibold">Farm Intelligence</h3>
        </div>
        <button onClick={() => setIsOpen(false)} className="hover:bg-farm-700 p-1 rounded">
          <X size={20} />
        </button>
      </div>

      {/* Mode Toggle */}
      <div className="flex p-2 bg-gray-50 border-b">
        <button
          onClick={() => setMode('assistant')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-colors ${
            mode === 'assistant' ? 'bg-white text-farm-700 shadow-sm border' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Brain size={16} />
          <span>Reasoning</span>
        </button>
        <button
          onClick={() => setMode('search')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-colors ${
            mode === 'search' ? 'bg-white text-blue-600 shadow-sm border' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Search size={16} />
          <span>Web Search</span>
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-lg p-3 ${
              msg.role === 'user' 
                ? 'bg-farm-600 text-white rounded-br-none' 
                : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none shadow-sm'
            }`}>
              <div className="prose prose-sm max-w-none text-sm whitespace-pre-wrap">
                {msg.text}
              </div>
              
              {/* Grounding Sources */}
              {msg.groundingUrls && msg.groundingUrls.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1">
                    <Search size={10} /> Sources found:
                  </p>
                  <div className="flex flex-col gap-1">
                    {msg.groundingUrls.map((url, idx) => (
                      <a 
                        key={idx} 
                        href={url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-xs text-blue-500 hover:underline flex items-center gap-1 truncate"
                      >
                        <ExternalLink size={10} />
                        {new URL(url).hostname}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white p-3 rounded-lg rounded-bl-none border shadow-sm flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="animate-spin" size={16} />
              {mode === 'assistant' ? 'Thinking deeply...' : 'Searching the web...'}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={mode === 'assistant' ? "Ask about your rabbits..." : "Search rabbit prices..."}
            className="flex-1 px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-farm-500 text-sm"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-farm-600 hover:bg-farm-700 disabled:opacity-50 text-white p-2 rounded-full transition-colors"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};
