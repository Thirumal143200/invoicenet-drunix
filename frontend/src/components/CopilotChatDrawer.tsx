import React, { useState, useEffect, useRef } from 'react';
import { UserPersona, CopilotMessage, CopilotEvidenceItem } from '../types';
import {
  Bot,
  Send,
  X,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  FileText,
  Hash,
  AlertTriangle,
  TrendingUp,
  Cpu,
  Layers,
  ChevronRight,
  ExternalLink,
  Info,
} from 'lucide-react';

interface CopilotChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentPersona: UserPersona;
  onInspectInvoiceProof?: (invoiceId: string) => void;
}

export const CopilotChatDrawer: React.FC<CopilotChatDrawerProps> = ({
  isOpen,
  onClose,
  currentPersona,
  onInspectInvoiceProof,
}) => {
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch suggestions when drawer opens or persona changes
  useEffect(() => {
    if (!isOpen) return;

    const fetchSuggestions = async () => {
      try {
        const res = await fetch('/api/copilot/suggestions', {
          headers: {
            'x-user-role': currentPersona.role,
            'x-user-id': currentPersona.name,
            'x-user-org': currentPersona.org,
            'x-user-msp': currentPersona.orgMsp,
          },
        });
        const data = await res.json();
        if (data.success && data.data?.suggestions) {
          setSuggestions(data.data.suggestions);
        }
      } catch (err) {
        console.warn('Could not fetch suggestions:', err);
      }
    };

    fetchSuggestions();

    // Add initial welcome message if empty
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome-msg',
          role: 'model',
          content: `👋 Hello **${currentPersona.name}**! I am your **InvoiceNet AI Copilot**, grounded directly on the **DRUNIX Distributed Ledger**.\n\nI can answer questions regarding your authorized receivables, blockchain transaction proofs, payment due dates, and factoring APR comparisons under your active **${currentPersona.role}** role.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  }, [isOpen, currentPersona]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || isLoading) return;

    const userMsg: CopilotMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/copilot/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentPersona.role,
          'x-user-id': currentPersona.name,
          'x-user-org': currentPersona.org,
          'x-user-msp': currentPersona.orgMsp,
        },
        body: JSON.stringify({
          message: query,
          conversationHistory: messages.map((m) => ({ role: m.role, content: m.content })),
          persona: currentPersona,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success && data.data) {
        const reply = data.data;
        const modelMsg: CopilotMessage = {
          id: `model-${Date.now()}`,
          role: 'model',
          content: reply.content,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          evidence: reply.evidence,
          suggestedActions: reply.suggestedActions,
        };
        setMessages((prev) => [...prev, modelMsg]);
        if (reply.suggestedActions && reply.suggestedActions.length > 0) {
          setSuggestions(reply.suggestedActions);
        }
      } else {
        const errorMsg: CopilotMessage = {
          id: `err-${Date.now()}`,
          role: 'model',
          content: `⚠️ **Service Notice:** ${data.error || 'Unable to process your request at this time.'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isError: true,
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (err: any) {
      const errorMsg: CopilotMessage = {
        id: `err-${Date.now()}`,
        role: 'model',
        content: `⚠️ **Network Exception:** Could not reach InvoiceNet AI Copilot gateway: ${err.message}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = async () => {
    try {
      await fetch('/api/copilot/history', {
        method: 'DELETE',
        headers: {
          'x-user-role': currentPersona.role,
          'x-user-id': currentPersona.name,
          'x-user-org': currentPersona.org,
          'x-user-msp': currentPersona.orgMsp,
        },
      });
    } catch (e) {
      console.warn('Failed to clear backend history:', e);
    }
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'model',
        content: `Conversation reset. I am ready to answer role-authorized questions for **${currentPersona.name}** (${currentPersona.role}).`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      {/* Background click to dismiss */}
      <div className="flex-1" onClick={onClose} />

      {/* Slide-over Drawer Panel */}
      <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col border-l border-softGray-border animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="px-5 py-4 border-b border-softGray-border bg-gradient-to-r from-navy to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-lg bg-royal/80 border border-royal-border flex items-center justify-center shadow-inner">
              <Sparkles className="h-5 w-5 text-amber-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-white tracking-wide">InvoiceNet AI Copilot</h2>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                  DRUNIX Grounded
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Role Context: <strong className="text-white">{currentPersona.role}</strong> ({currentPersona.orgMsp})
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <button
              onClick={clearChat}
              className="p-1.5 rounded-md hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
              title="Reset conversation"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
              title="Close panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Security Persona Banner */}
        <div className="px-4 py-2 bg-softGray border-b border-softGray-border flex items-center justify-between text-xs">
          <div className="flex items-center space-x-1.5 text-slate-600">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald" />
            <span className="text-[11px]">
              Active User: <strong className="text-navy">{currentPersona.name}</strong> •{' '}
              <span className="text-slate-500">{currentPersona.org}</span>
            </span>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-100/70 text-royal font-semibold">
            Read-Only Guardrails Active
          </span>
        </div>

        {/* Message History */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[88%] rounded-xl px-4 py-3 text-xs leading-relaxed shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-royal text-white rounded-br-none'
                    : msg.isError
                    ? 'bg-rose-50 border border-rose-200 text-rose-800 rounded-bl-none'
                    : 'bg-white border border-softGray-border text-slate-800 rounded-bl-none'
                }`}
              >
                {/* Message Content with basic formatting */}
                <div className="space-y-1.5 whitespace-pre-line font-sans">
                  {msg.content.split('\n\n').map((paragraph, i) => (
                    <p key={i}>
                      {paragraph.split('**').map((part, index) =>
                        index % 2 === 1 ? (
                          <strong key={index} className={msg.role === 'user' ? 'text-white' : 'text-navy font-bold'}>
                            {part}
                          </strong>
                        ) : (
                          part
                        )
                      )}
                    </p>
                  ))}
                </div>

                {/* Evidence Cards attached to response */}
                {msg.evidence && msg.evidence.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-2">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1">
                      <Layers className="h-3 w-3 text-royal" />
                      <span>DRUNIX Verified Evidence</span>
                    </div>

                    <div className="space-y-1.5">
                      {msg.evidence.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-lg bg-softGray/80 border border-softGray-border flex items-start justify-between gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-1.5">
                              {item.type === 'INVOICE' && <FileText className="h-3.5 w-3.5 text-royal shrink-0" />}
                              {item.type === 'BLOCKCHAIN_TX' && <Hash className="h-3.5 w-3.5 text-emerald shrink-0" />}
                              {item.type === 'RISK_ALERT' && <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                              {item.type === 'NETWORK_METRIC' && <Cpu className="h-3.5 w-3.5 text-indigo-500 shrink-0" />}
                              <span className="font-bold text-navy text-[11px] truncate">{item.title}</span>
                            </div>

                            {item.details && (
                              <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2">{item.details}</p>
                            )}

                            {item.amount !== undefined && (
                              <div className="text-[11px] font-mono text-royal font-bold mt-1">
                                ₹{item.amount.toLocaleString('en-IN')}
                                {item.status && (
                                  <span className="ml-2 font-sans font-semibold text-[10px] px-1.5 py-0.2 rounded bg-white text-slate-700 border border-slate-200">
                                    {item.status}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {item.invoiceId && onInspectInvoiceProof && (
                            <button
                              onClick={() => onInspectInvoiceProof(item.invoiceId!)}
                              className="px-2 py-1 rounded bg-white border border-softGray-border hover:bg-royal hover:text-white text-[10px] font-semibold text-royal transition-all flex items-center space-x-1 shrink-0 shadow-2xs"
                              title="Inspect on-chain proof"
                            >
                              <span>Proof</span>
                              <ExternalLink className="h-2.5 w-2.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div
                  className={`text-[9px] mt-1.5 text-right ${
                    msg.role === 'user' ? 'text-blue-100' : 'text-slate-400'
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isLoading && (
            <div className="flex items-center space-x-2 text-xs text-slate-500 bg-white border border-softGray-border rounded-xl px-4 py-3 w-fit shadow-xs animate-pulse">
              <Sparkles className="h-4 w-4 text-royal animate-spin" />
              <span>Grounded reasoning against DRUNIX ledger...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Queries Chips */}
        {suggestions.length > 0 && (
          <div className="px-4 py-2 border-t border-softGray-border bg-white">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Suggested Prompts ({currentPersona.role})
            </div>
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 no-scrollbar">
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(s)}
                  disabled={isLoading}
                  className="px-2.5 py-1 rounded-full bg-softGray hover:bg-blue-50 hover:text-royal hover:border-blue-200 border border-softGray-border text-[11px] text-slate-600 font-medium whitespace-nowrap transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-3 border-t border-softGray-border bg-white">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center space-x-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={`Ask Copilot as ${currentPersona.role} (e.g. "What invoices are due?")`}
              disabled={isLoading}
              className="flex-1 px-3.5 py-2 text-xs border border-softGray-border rounded-lg focus:outline-none focus:ring-1 focus:ring-royal focus:border-royal bg-slate-50/50"
            />

            <button
              type="submit"
              disabled={isLoading || !inputMessage.trim()}
              className="p-2 rounded-lg bg-royal hover:bg-royal-hover disabled:bg-slate-300 text-white transition-all shadow-sm shrink-0 cursor-pointer"
              title="Send query"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>

          <div className="mt-2 text-[10px] text-slate-600 text-center flex items-center justify-center space-x-1">
            <Info className="h-2.5 w-2.5" />
            <span>Role-based data isolation strictly enforced on the DRUNIX consensus network.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
