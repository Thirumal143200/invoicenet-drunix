import React, { useState, useEffect, useRef } from 'react';
import { UserPersona, CopilotMessage, CopilotEvidenceItem, Invoice } from '../types';
import {
  Sparkles,
  Bot,
  Send,
  Trash2,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Layers,
  Cpu,
  RefreshCw,
  Info,
  CheckCircle2,
  Clock,
  HelpCircle,
  Hash,
  Activity,
  ArrowRight,
} from 'lucide-react';

interface CopilotWorkspaceViewProps {
  currentPersona: UserPersona;
  invoices: Invoice[];
  blockHeight: number;
  onInspectInvoiceProof?: (invoiceId: string) => void;
  onOpenRiskEngine?: (invoiceId?: string) => void;
}

export const CopilotWorkspaceView: React.FC<CopilotWorkspaceViewProps> = ({
  currentPersona,
  invoices,
  blockHeight,
  onInspectInvoiceProof,
  onOpenRiskEngine,
}) => {
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedInvoiceContext, setSelectedInvoiceContext] = useState<Invoice | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter invoices for current persona
  const authorizedInvoices = invoices.filter((inv) => {
    if (currentPersona.role === 'EXPLORER') return true;
    if (currentPersona.role === 'SUPPLIER') {
      return (
        inv.supplierOrg.toLowerCase().includes(currentPersona.org.toLowerCase()) ||
        currentPersona.org.toLowerCase().includes(inv.supplierOrg.toLowerCase())
      );
    }
    if (currentPersona.role === 'BUYER') {
      return (
        inv.buyerOrg.toLowerCase().includes(currentPersona.org.toLowerCase()) ||
        currentPersona.org.toLowerCase().includes(inv.buyerOrg.toLowerCase())
      );
    }
    if (currentPersona.role === 'FINANCIER') {
      return ['ACCEPTED', 'FINANCING_REQUESTED', 'FINANCED', 'SETTLED'].includes(inv.status);
    }
    return false;
  });

  // Fetch suggestions and history when persona changes
  useEffect(() => {
    fetchSuggestions();
    fetchHistory();
  }, [currentPersona]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

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

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/copilot/history', {
        headers: {
          'x-user-role': currentPersona.role,
          'x-user-id': currentPersona.name,
          'x-user-org': currentPersona.org,
          'x-user-msp': currentPersona.orgMsp,
        },
      });
      const data = await res.json();
      if (data.success && data.data?.messages && data.data.messages.length > 0) {
        setMessages(
          data.data.messages.map((m: any, idx: number) => ({
            id: `hist-${idx}`,
            role: m.role,
            content: m.content,
            timestamp: m.timestamp
              ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '',
            evidence: m.evidence,
            suggestedActions: m.suggestedActions,
          }))
        );
      } else {
        // Welcome message tailored by persona
        setMessages([
          {
            id: 'welcome-workspace-msg',
            role: 'model',
            content: `👋 Hello **${currentPersona.name}**! Welcome to the **InvoiceNet AI Financial Copilot**.\n\nI am grounded directly on the **DRUNIX Distributed Ledger** and the **AI Invoice Risk Engine**. I provide explainable answers for your receivables, payment status, risk factors, ERP purchase order matching, and blockchain proofs under your **${currentPersona.role}** role.\n\nAsk me any question below, or select a suggested topic to begin.`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            suggestedActions: suggestions.slice(0, 3),
          },
        ]);
      }
    } catch (err) {
      console.warn('Could not fetch conversation history:', err);
    }
  };

  const handleClearHistory = async () => {
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
      setMessages([
        {
          id: `reset-${Date.now()}`,
          role: 'model',
          content: `🧹 Conversation history cleared. Ask me anything about your authorized receivables on DRUNIX.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  };

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
          content: `⚠️ **Service Advisory:** ${data.error || 'Unable to process your request at this time.'}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isError: true,
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (err: any) {
      const errorMsg: CopilotMessage = {
        id: `err-${Date.now()}`,
        role: 'model',
        content: `⚠️ **Network Exception:** Could not communicate with InvoiceNet Copilot Gateway: ${err.message}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const getSourceBadge = (source?: string) => {
    switch (source) {
      case 'DRUNIX ledger data':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="h-3 w-3" />
            <span>DRUNIX Ledger</span>
          </span>
        );
      case 'InvoiceNet application data':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <FileText className="h-3 w-3" />
            <span>InvoiceNet ERP</span>
          </span>
        );
      case 'AI-generated explanation':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <Sparkles className="h-3 w-3" />
            <span>AI Risk Engine</span>
          </span>
        );
      case 'Forecast or estimate':
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Clock className="h-3 w-3" />
            <span>Forecast/Estimate</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-500/10 text-slate-500 border border-slate-500/20">
            <span>Verified System Data</span>
          </span>
        );
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] bg-slate-50 dark:bg-[#070B13] overflow-hidden">
      {/* Top Workspace Header */}
      <div className="bg-white dark:bg-[#0B111E] border-b border-slate-200 dark:border-slate-800 px-6 py-3 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-cyan-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                AI Financial Copilot Workspace
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                DRUNIX Grounded
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Role: <span className="font-semibold text-slate-700 dark:text-slate-300">{currentPersona.role}</span> ({currentPersona.org}) • Consensus Block #{blockHeight}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleClearHistory}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium flex items-center space-x-1.5 transition-colors"
            title="Clear active conversation history"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Reset Chat</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Layout: Left Sidebar + Center Chat */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Context Side Panel */}
        <div className="hidden lg:flex flex-col w-80 bg-white dark:bg-[#0B111E] border-r border-slate-200 dark:border-slate-800 overflow-y-auto p-4 space-y-5">
          {/* Persona Card */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
                Active Underwriting Persona
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                {currentPersona.role}
              </span>
            </div>
            <p className="font-semibold text-slate-900 dark:text-white">{currentPersona.name}</p>
            <p className="text-slate-500 text-[11px] truncate">{currentPersona.org} ({currentPersona.orgMsp})</p>
          </div>

          {/* Quick Suggested Queries */}
          <div className="space-y-2.5">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>Suggested Queries</span>
            </div>
            <div className="space-y-1.5">
              {suggestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(q)}
                  disabled={isLoading}
                  className="w-full text-left p-2.5 rounded-lg text-xs bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/40 dark:hover:bg-slate-800/80 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 transition-all leading-snug group flex items-start justify-between"
                >
                  <span className="group-hover:text-indigo-600 dark:group-hover:text-cyan-400">{q}</span>
                  <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5 ml-1" />
                </button>
              ))}
            </div>
          </div>

          {/* Quick Invoice Context Selector */}
          <div className="space-y-2.5 flex-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
              <div className="flex items-center space-x-1.5">
                <Layers className="h-3.5 w-3.5 text-cyan-500" />
                <span>Authorized Invoices ({authorizedInvoices.length})</span>
              </div>
            </div>
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {authorizedInvoices.slice(0, 6).map((inv) => (
                <div
                  key={inv.id}
                  onClick={() => {
                    setSelectedInvoiceContext(inv);
                    handleSendMessage(`What is the risk assessment and payment status of invoice ${inv.invoiceNumber}?`);
                  }}
                  className="p-2.5 rounded-lg text-xs bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/40 dark:hover:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 cursor-pointer transition-all"
                >
                  <div className="flex items-center justify-between font-semibold text-slate-900 dark:text-white">
                    <span>{inv.invoiceNumber}</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">₹{(inv.amount / 1000).toFixed(0)}k</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                    <span className="truncate max-w-[130px]">{inv.buyerOrg}</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-slate-200 dark:bg-slate-800">
                      {inv.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trust & Read-Only Notice */}
          <div className="p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/15 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
            <div className="flex items-center space-x-1 text-cyan-600 dark:text-cyan-400 font-semibold text-xs">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Enterprise Read-Only Policy</span>
            </div>
            <p>
              AI Copilot answers are synthesized from deterministic DRUNIX ledger state. The model cannot independently alter invoice statuses or commit financial transactions.
            </p>
          </div>
        </div>

        {/* Center / Chat Message Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-100/50 dark:bg-[#070B13]">
          {/* Scrollable Messages */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-4xl mx-auto`}
                >
                  <div className="flex items-start space-x-2.5 max-w-3xl">
                    {!isUser && (
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white flex-shrink-0 shadow-sm mt-0.5">
                        <Bot className="h-4 w-4" />
                      </div>
                    )}

                    <div className="space-y-2">
                      <div
                        className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-sm ${
                          isUser
                            ? 'bg-indigo-600 text-white rounded-br-none'
                            : msg.isError
                            ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-900 rounded-bl-none'
                            : 'bg-white dark:bg-[#0D1527] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-bl-none'
                        }`}
                      >
                        {/* Message Content with Markdown Formatting */}
                        <div className="prose prose-xs dark:prose-invert max-w-none whitespace-pre-line">
                          {msg.content}
                        </div>
                      </div>

                      {/* Evidence Cards for Model Responses */}
                      {!isUser && msg.evidence && msg.evidence.length > 0 && (
                        <div className="space-y-2 pt-1">
                          <div className="flex items-center space-x-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                            <span>Verified Supporting Evidence ({msg.evidence.length})</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {msg.evidence.map((ev, eIdx) => (
                              <div
                                key={eIdx}
                                className="p-3 rounded-xl bg-white dark:bg-[#0A101D] border border-slate-200 dark:border-slate-800/80 shadow-xs space-y-1.5"
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                                    {ev.title}
                                  </span>
                                  {getSourceBadge(ev.source)}
                                </div>

                                {ev.details && (
                                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                                    {ev.details}
                                  </p>
                                )}

                                {ev.riskFindings && (
                                  <p className="text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                                    {ev.riskFindings}
                                  </p>
                                )}

                                <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                                  <span>
                                    {ev.blockNumber ? `Block #${ev.blockNumber}` : ev.sourceTimestamp ? new Date(ev.sourceTimestamp).toLocaleDateString() : 'Consensus Verified'}
                                  </span>
                                  {ev.invoiceId && (
                                    <button
                                      onClick={() => onInspectInvoiceProof?.(ev.invoiceId!)}
                                      className="text-cyan-600 dark:text-cyan-400 hover:underline flex items-center space-x-0.5 font-sans font-medium"
                                    >
                                      <span>Inspect Proof</span>
                                      <ExternalLink className="h-2.5 w-2.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Suggested Follow-up Actions */}
                      {!isUser && msg.suggestedActions && msg.suggestedActions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {msg.suggestedActions.map((act, aIdx) => (
                            <button
                              key={aIdx}
                              onClick={() => handleSendMessage(act)}
                              disabled={isLoading}
                              className="px-2.5 py-1 rounded-full text-[11px] bg-slate-200/60 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors flex items-center space-x-1"
                            >
                              <span>{act}</span>
                              <ArrowRight className="h-2.5 w-2.5" />
                            </button>
                          ))}
                        </div>
                      )}

                      <span className="text-[10px] text-slate-400 px-1 block">
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-start space-x-2.5 max-w-3xl mx-auto">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white flex-shrink-0 animate-pulse">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="p-3.5 rounded-2xl bg-white dark:bg-[#0D1527] border border-slate-200 dark:border-slate-800 rounded-bl-none text-xs text-slate-500 flex items-center space-x-2 shadow-sm">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin text-indigo-500" />
                  <span>Consulting DRUNIX distributed ledger & AI risk models...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Chat Input Bar */}
          <div className="p-4 bg-white dark:bg-[#0B111E] border-t border-slate-200 dark:border-slate-800">
            <div className="max-w-4xl mx-auto">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center space-x-2"
              >
                <div className="relative flex-1">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder={`Ask Copilot as ${currentPersona.role} (e.g. "Which invoices are overdue?" or "Inspect INV-2026-001")`}
                    disabled={isLoading}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !inputMessage.trim()}
                  className="px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 disabled:opacity-40 text-white font-semibold text-xs sm:text-sm flex items-center space-x-1.5 transition-all shadow-sm"
                >
                  <Send className="h-4 w-4" />
                  <span className="hidden sm:inline">Send</span>
                </button>
              </form>

              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 px-1">
                <span>Press Enter to send query</span>
                <span className="flex items-center space-x-1">
                  <ShieldCheck className="h-3 w-3 text-emerald-500" />
                  <span>Strict Role & Org Isolation Active</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
