import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Search, Brain, Loader2, ExternalLink, RefreshCw } from 'lucide-react';
import { askFarmAssistant, searchWeb, AIResponse } from '../services/geminiService';
import { ChatMessage, RabbitStatus, CrossingStatus, TransactionType } from '../types';
import { FarmService } from '../services/farmService';
import { useFarm } from '../contexts/FarmContext';

export const AIChat: React.FC = () => {
  const { farmName, currencySymbol } = useFarm();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'model', text: 'Hello! I have access to your farm data. Ask me about upcoming deliveries, weaning tasks, or your finances.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [contextLoading, setContextLoading] = useState(false);
  const [farmContext, setFarmContext] = useState('');
  const [mode, setMode] = useState<'assistant' | 'search'>('assistant');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Fetch real data when chat is opened
  useEffect(() => {
    if (isOpen) {
      buildContext();
    }
  }, [isOpen]);

  const buildContext = async () => {
    setContextLoading(true);
    try {
      const [rabbits, crossings, transactions] = await Promise.all([
        FarmService.getRabbits(),
        FarmService.getCrossings(),
        FarmService.getTransactions()
      ]);

      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];

      // 1. Livestock Summary
      const totalRabbits = rabbits.filter(r => ['Alive', 'Pregnant', 'Weaned'].includes(r.status)).length;
      const does = rabbits.filter(r => r.sex === 'Female' && r.status === 'Alive').length;
      const bucks = rabbits.filter(r => r.sex === 'Male' && r.status === 'Alive').length;
      const kits = rabbits.filter(r => r.status === 'Weaned').length;

      // 2. Breeding / Deliveries
      const activePregnancies = crossings.filter(c => c.status === CrossingStatus.Pregnant);
      const dueDeliveries = activePregnancies.map(c => 
        `- Doe ${c.doeName || c.doeId} mated with ${c.sireName || c.sireId}. Due: ${c.expectedDeliveryDate}`
      ).join('\n');

      // 3. Weaning Candidates (approx 30-40 days old)
      const weaningCandidates = rabbits.filter(r => {
        if (!r.dateOfBirth || r.status !== RabbitStatus.Alive) return false;
        const ageDays = Math.floor((now.getTime() - new Date(r.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24));
        return ageDays >= 28 && ageDays <= 45;
      }).map(r => `- ${r.tag} (${r.breed}), Age: ${Math.floor((now.getTime() - new Date(r.dateOfBirth!).getTime()) / (1000 * 60 * 60 * 24))} days`);

      // 4. Finances
      const income = transactions.filter(t => t.type === TransactionType.Income).reduce((sum, t) => sum + t.amount, 0);
      const expense = transactions.filter(t => t.type === TransactionType.Expense).reduce((sum, t) => sum + t.amount, 0);
      
      const contextString = `
        Farm Name: ${farmName}
        Today's Date: ${todayStr}
        Currency: ${currencySymbol}

        LIVESTOCK SUMMARY:
        Total Active: ${totalRabbits}
        Does: ${does}, Bucks: ${bucks}, Weaned Kits: ${kits}

        UPCOMING DELIVERIES (Pregnant Does):
        ${dueDeliveries || "No active pregnancies."}

        WEANING CANDIDATES (28-45 days old):
        ${weaningCandidates.length > 0 ? weaningCandidates.join('\n') : "No rabbits currently ready for weaning."}

        FINANCIAL OVERVIEW (All Time):
        Total Income: ${income}
        Total Expenses: ${expense}
        Net Profit: ${income - expense}
      `;

      setFarmContext(contextString);
    } catch (error) {
      console.error("Error building context:", error);
    } finally {
      setContextLoading(false);
    }
  };

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
        result = await askFarmAssistant(userMsg.text, farmContext);
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
          <div>
            <h3 className="font-semibold text-sm">Farm Intelligence</h3>
            {contextLoading && <span className="text-[10px] opacity-80 flex items-center gap-1"><Loader2 size={8} className="animate-spin"/> Syncing Data...</span>}
          </div>
        </div>
        <div className="flex gap-2">
            <button onClick={buildContext} className="hover:bg-farm-700 p-1 rounded" title="Refresh Context">
                <RefreshCw size={16} />
            </button>
            <button onClick={() => setIsOpen(false)} className="hover:bg-farm-700 p-1 rounded">
                <X size={20} />
            </button>
        </div>
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
          <span>My Farm</span>
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
              {mode === 'assistant' ? 'Analyzing farm data...' : 'Searching the web...'}
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
            placeholder={mode === 'assistant' ? "E.g. Any weaning due?" : "Search rabbit prices..."}
            className="flex-1 px-4 py-2 bg-white border rounded-full focus:outline-none focus:ring-2 focus:ring-farm-500 text-sm"
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