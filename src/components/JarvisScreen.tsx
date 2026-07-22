import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Player, Drill, TrainingState, SkillAssessment } from '../types';
import {
  Bot,
  Sparkles,
  Send,
  RefreshCw,
  Plus,
  CheckCircle2,
  BookOpen,
  Users,
  Target,
  Clock,
  Zap,
  ArrowRight,
  MessageSquare,
  Trash2,
  User,
  Activity,
  Award,
  History,
  Edit3,
  Check,
  Flame,
  Search,
  ExternalLink
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  matchedDrillIds?: string[];
  focusArea?: string;
  targetGroup?: string;
  selectedPlayerName?: string;
}

interface ConversationThread {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
  selectedPlayerId?: string;
  selectedFocus?: string;
}

interface JarvisScreenProps {
  players: Player[];
  drills: Drill[];
  growthRecords?: SkillAssessment[];
  trainingState: TrainingState;
  onUpdateTrainingState: (state: TrainingState) => void;
  onNavigateTab: (tab: string) => void;
}

const DEFAULT_WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content: `G'day Coach! I'm **Jarvis**, your AFL Senior Coaching & Skill Development Assistant.\n\nAsk me **anything in open conversation** regarding:\n\n• 👤 **Individual Player Performance & Skill Levels** (Kick Accuracy, Opposite Foot Rating, 2km Time Trial, Handball, Marking, Tackling)\n• 🗺️ **Position Heatmaps & Ground Time** (Time recorded in specific field slots like Full Back, Midfield, Wing, Bench, and rotation efficiency)\n• ⚡ **AFL Drill Recommendations & Session Plans** (Aligned directly to your **library drills**)\n• 🏆 **Match Strategy & AFL Junior/Youth Curriculum Standards**\n\nUse the **Quick Asks** below or select a player to begin!`,
  timestamp: new Date(),
};

const QUICK_ASKS = [
  { label: 'Opposite Foot Audit', prompt: 'Identify our players with the lowest opposite foot kicking ratings and suggest targeted drills to develop dual-foot mastery.' },
  { label: 'Position Heatmap Breakdown', prompt: 'Show ground time heatmap breakdown for Midfielders vs Defenders across the squad and highlight any rotation imbalances.' },
  { label: '2km Time Trial Ranking', prompt: 'Who has the highest 2km time trial and fitness score in our player growth records?' },
  { label: 'Corridor Ball Movement', prompt: 'Build a 45-minute AFL session targeting fast transition through the corridor with low-trajectory kicking and rapid handballs.' },
  { label: 'Stoppages & Clearances', prompt: 'Recommend a high-intensity stoppage clearance session for Midfielders and Rucks to maximize ground-ball gets.' },
  { label: 'Defensive Zone Wall', prompt: 'Develop a tactical blueprint and 3-drill block to teach our back six how to setup the defensive zone wall against quick opposition kick-ins.' },
];

export default function JarvisScreen({
  players,
  drills,
  growthRecords = [],
  trainingState,
  onUpdateTrainingState,
  onNavigateTab,
}: JarvisScreenProps) {
  // Navigation sub-tab: 'thread' or 'history'
  const [activeTab, setActiveTab] = useState<'thread' | 'history'>('thread');

  // Load saved conversation threads
  const [threads, setThreads] = useState<ConversationThread[]>(() => {
    try {
      const saved = localStorage.getItem('iiq_jarvis_history_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Convert string timestamps back to Date objects in messages
          return parsed.map((t: any) => ({
            ...t,
            messages: Array.isArray(t.messages)
              ? t.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }))
              : [DEFAULT_WELCOME_MESSAGE],
          }));
        }
      }
    } catch (_e) {}

    // Initial default thread
    return [
      {
        id: `thread-${Date.now()}`,
        title: 'Initial Coaching Session',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [DEFAULT_WELCOME_MESSAGE],
      },
    ];
  });

  const [activeThreadId, setActiveThreadId] = useState<string>(() => {
    return threads[0]?.id || `thread-${Date.now()}`;
  });

  // Current active thread messages
  const activeThread = threads.find((t) => t.id === activeThreadId) || threads[0];
  const messages = activeThread ? activeThread.messages : [DEFAULT_WELCOME_MESSAGE];

  // Input & Filters State
  const [input, setInput] = useState('');
  const [selectedFocus, setSelectedFocus] = useState<string>('All-Round AFL Skills');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [addedPlanNotice, setAddedPlanNotice] = useState<string | null>(null);

  // Thread editing
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editingTitleText, setEditingTitleText] = useState('');
  const [historySearch, setHistorySearch] = useState('');

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (activeTab === 'thread') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading, activeTab]);

  // Persist threads to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem('iiq_jarvis_history_v2', JSON.stringify(threads));
    } catch (_e) {}
  }, [threads]);

  // Check for pending prompt passed from Admin screen
  useEffect(() => {
    try {
      const pending = localStorage.getItem('iiq_pending_jarvis_prompt');
      if (pending) {
        localStorage.removeItem('iiq_pending_jarvis_prompt');
        setActiveTab('thread');
        handleSendMessage(pending);
      }
    } catch (_e) {}
  }, []);

  // Focused player instance
  const focusedPlayer = players.find((p) => p.id === selectedPlayerId);
  const focusedPlayerGrowth = focusedPlayer
    ? growthRecords.filter((r) => r.playerId === focusedPlayer.id).slice(-1)[0]
    : null;

  // Helper to update active thread's messages
  const updateActiveThreadMessages = (newMessages: Message[], customTitle?: string) => {
    setThreads((prevThreads) =>
      prevThreads.map((t) => {
        if (t.id === activeThreadId) {
          let updatedTitle = t.title;
          if (customTitle) {
            updatedTitle = customTitle;
          } else if (t.title === 'Initial Coaching Session' || t.title === 'New Conversation') {
            const firstUserMsg = newMessages.find((m) => m.role === 'user');
            if (firstUserMsg) {
              updatedTitle = firstUserMsg.content.slice(0, 32) + (firstUserMsg.content.length > 32 ? '...' : '');
            }
          }
          return {
            ...t,
            title: updatedTitle,
            updatedAt: Date.now(),
            messages: newMessages,
          };
        }
        return t;
      })
    );
  };

  // Start new conversation thread
  const handleCreateNewThread = () => {
    const newThread: ConversationThread = {
      id: `thread-${Date.now()}`,
      title: 'New Conversation',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [
        {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: `New thread started! Ask me any question on squad skill assessments, ground time heatmaps, or training sessions.`,
          timestamp: new Date(),
        },
      ],
    };
    setThreads((prev) => [newThread, ...prev]);
    setActiveThreadId(newThread.id);
    setActiveTab('thread');
  };

  // Delete thread
  const handleDeleteThread = (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (threads.length <= 1) {
      // Just reset the single thread
      const resetThread: ConversationThread = {
        id: `thread-${Date.now()}`,
        title: 'Initial Coaching Session',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [DEFAULT_WELCOME_MESSAGE],
      };
      setThreads([resetThread]);
      setActiveThreadId(resetThread.id);
      return;
    }
    const filtered = threads.filter((t) => t.id !== threadId);
    setThreads(filtered);
    if (activeThreadId === threadId) {
      setActiveThreadId(filtered[0].id);
    }
  };

  // Save thread title edit
  const handleSaveTitleEdit = (threadId: string) => {
    if (!editingTitleText.trim()) {
      setEditingThreadId(null);
      return;
    }
    setThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, title: editingTitleText.trim() } : t))
    );
    setEditingThreadId(null);
  };

  // Extract matching drill IDs from Jarvis's response text
  const detectMatchedDrills = (text: string): string[] => {
    const matches: string[] = [];
    const lowerText = text.toLowerCase();
    drills.forEach((drill) => {
      if (
        lowerText.includes(drill.title.toLowerCase()) ||
        (drill.id && lowerText.includes(drill.id.toLowerCase()))
      ) {
        matches.push(drill.id);
      }
    });
    return Array.from(new Set(matches));
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    let enrichedQuery = query;
    if (focusedPlayer) {
      enrichedQuery = `[Query regarding Player: ${focusedPlayer.name} (#${focusedPlayer.number})]\n${query}`;
    }

    const userMessage: Message = {
      id: `msg-${Date.now()}-u`,
      role: 'user',
      content: query,
      timestamp: new Date(),
      focusArea: selectedFocus,
      selectedPlayerName: focusedPlayer ? focusedPlayer.name : undefined,
    };

    const newMessages = [...messages, userMessage];
    updateActiveThreadMessages(newMessages);

    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/jarvis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: enrichedQuery,
          focusArea: selectedFocus,
          targetPlayers: focusedPlayer ? focusedPlayer.name : 'Whole Squad',
          squad: players,
          drills: drills,
          growthRecords: growthRecords,
          history: newMessages.slice(-6).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const resText = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(resText);
      } catch (_e) {
        throw new Error(`Server returned invalid response (Status ${res.status}).`);
      }

      const reply = data.reply || data.error || 'Sorry Coach, I could not generate a response right now.';
      const matchedIds = detectMatchedDrills(reply);

      const assistantMessage: Message = {
        id: `msg-${Date.now()}-a`,
        role: 'assistant',
        content: reply,
        timestamp: new Date(),
        matchedDrillIds: matchedIds,
        selectedPlayerName: focusedPlayer ? focusedPlayer.name : undefined,
      };

      updateActiveThreadMessages([...newMessages, assistantMessage]);
    } catch (err: any) {
      const errMessage: Message = {
        id: `msg-${Date.now()}-err`,
        role: 'assistant',
        content: `⚠️ Communication error: ${err.message || 'Could not reach Jarvis API server.'}`,
        timestamp: new Date(),
      };
      updateActiveThreadMessages([...newMessages, errMessage]);
    } finally {
      setLoading(false);
    }
  };

  // Convert matched drills in Jarvis message to a new Training Plan
  const handleCreatePlanFromJarvis = (msg: Message) => {
    const matchedIds = msg.matchedDrillIds && msg.matchedDrillIds.length > 0
      ? msg.matchedDrillIds
      : drills.slice(0, 3).map(d => d.id);

    const planName = `Jarvis Plan: ${msg.selectedPlayerName ? `${msg.selectedPlayerName} - ` : ''}${msg.focusArea || selectedFocus}`;
    const newPlan = {
      id: `plan-${Date.now()}`,
      name: planName,
      drills: matchedIds,
    };

    const updatedPlans = [...trainingState.plans, newPlan];
    onUpdateTrainingState({
      ...trainingState,
      plans: updatedPlans,
      activePlanId: newPlan.id,
      view: 'plans',
    });

    setAddedPlanNotice(`Created training plan "${planName}" with ${matchedIds.length} drills!`);
    setTimeout(() => setAddedPlanNotice(null), 4000);
  };

  // Add a specific single drill to active or new plan
  const handleAddDrillToActivePlan = (drillId: string) => {
    const drill = drills.find((d) => d.id === drillId);
    if (!drill) return;

    let activePlan = trainingState.plans.find((p) => p.id === trainingState.activePlanId);
    let updatedPlans = [...trainingState.plans];

    if (!activePlan) {
      activePlan = {
        id: `plan-${Date.now()}`,
        name: `Jarvis Recommended Plan`,
        drills: [drillId],
      };
      updatedPlans.push(activePlan);
    } else {
      if (!activePlan.drills.includes(drillId)) {
        updatedPlans = updatedPlans.map((p) =>
          p.id === activePlan?.id
            ? { ...p, drills: [...p.drills, drillId] }
            : p
        );
      }
    }

    onUpdateTrainingState({
      ...trainingState,
      plans: updatedPlans,
      activePlanId: activePlan.id,
    });

    setAddedPlanNotice(`Added "${drill.title}" to Training Plan!`);
    setTimeout(() => setAddedPlanNotice(null), 3500);
  };

  const handleOpenDrillInLibrary = (drillId: string) => {
    onUpdateTrainingState({
      ...trainingState,
      activeId: drillId,
      view: 'viewer',
    });
    onNavigateTab('training');
  };

  const filteredHistoryThreads = threads.filter((t) => {
    if (!historySearch.trim()) return true;
    const q = historySearch.toLowerCase();
    return t.title.toLowerCase().includes(q) || t.messages.some((m) => m.content.toLowerCase().includes(q));
  });

  return (
    <div className="space-y-6">
      {/* Header Banner & Navigation Tabs */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white rounded-3xl p-6 border border-indigo-800/40 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-blue-400 p-0.5 shadow-lg shrink-0">
              <div className="w-full h-full bg-indigo-950 rounded-[14px] flex items-center justify-center text-indigo-300">
                <Bot className="w-8 h-8 text-indigo-300" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">Jarvis AI Coaching Assistant</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Assistant Mode
                </span>
              </div>
              <p className="text-xs text-indigo-200/80 font-medium mt-1 max-w-2xl leading-relaxed">
                Clear, direct coaching conversation thread. Ask about specific player skill scores, ground time heatmaps, or session drill recommendations.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto shrink-0">
            {/* View Switcher: Coaching Thread vs Conversation History */}
            <div className="flex bg-white/10 backdrop-blur-md p-1 rounded-2xl border border-white/15">
              <button
                onClick={() => setActiveTab('thread')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
                  activeTab === 'thread'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-indigo-200 hover:text-white'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Coaching Thread</span>
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer ${
                  activeTab === 'history'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-indigo-200 hover:text-white'
                }`}
              >
                <History className="w-4 h-4" />
                <span>Conversation History</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/20 font-black">
                  {threads.length}
                </span>
              </button>
            </div>

            <button
              onClick={handleCreateNewThread}
              className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-md"
              title="Start New Chat Session"
            >
              <Plus className="w-4 h-4" />
              <span>New Chat</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notice Banner */}
      {addedPlanNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{addedPlanNotice}</span>
          </div>
          <button
            onClick={() => {
              onUpdateTrainingState({ ...trainingState, view: 'plans' });
              onNavigateTab('training');
            }}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shrink-0"
          >
            View Active Plans
          </button>
        </div>
      )}

      {/* TAB 1: MAIN COACHING THREAD */}
      {activeTab === 'thread' && (
        <div className="space-y-4">
          {/* Target Player Bar (Minimal & Clean) */}
          <div className="bg-white p-3.5 rounded-2xl border border-[var(--line)] shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-xl">
                <User className="w-4 h-4" />
              </span>
              <div>
                <span className="text-[10px] font-black uppercase text-[var(--muted)] block">Target Player Focus</span>
                <select
                  value={selectedPlayerId}
                  onChange={(e) => setSelectedPlayerId(e.target.value)}
                  className="bg-transparent text-xs font-black text-[var(--navy)] focus:outline-none cursor-pointer"
                >
                  <option value="all">⚡ Entire Squad (General Coaching Query)</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      #{p.number} {p.name} ({p.positions?.join(', ') || 'Utility'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {focusedPlayer && (
              <div className="flex items-center gap-3 bg-indigo-50/70 border border-indigo-100 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-950">
                <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black">
                  #{focusedPlayer.number}
                </div>
                <span>{focusedPlayer.name}</span>
                <span className="text-gray-400">•</span>
                <span className="text-emerald-700">On Field: {Math.round((focusedPlayer.active || 0) / 60)}m</span>
                {focusedPlayerGrowth && (
                  <>
                    <span className="text-gray-400">•</span>
                    <span className="text-indigo-700">Opp Foot: {focusedPlayerGrowth.oppositeFootRating}/10</span>
                  </>
                )}
                <button
                  onClick={() => setSelectedPlayerId('all')}
                  className="text-gray-400 hover:text-gray-700 font-black ml-1"
                  title="Clear Player Selection"
                >
                  ✕
                </button>
              </div>
            )}

            <button
              onClick={() => onNavigateTab('admin')}
              className="text-[11px] font-extrabold text-indigo-600 hover:text-indigo-800 transition flex items-center gap-1 self-end sm:self-auto"
            >
              <span>Manage Prompts & System Settings in Admin</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Asks Strip */}
          <div className="bg-white p-3 rounded-2xl border border-[var(--line)] shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-black uppercase tracking-wider text-indigo-700 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-indigo-600" />
                <span>Quick Asks</span>
              </span>
              <span className="text-[10px] font-semibold text-[var(--muted)]">Tap any suggestion to run immediately</span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {QUICK_ASKS.map((qa, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(qa.prompt)}
                  disabled={loading}
                  className="px-3 py-1.5 bg-gray-50 hover:bg-indigo-600 hover:text-white border border-gray-200 hover:border-indigo-600 text-gray-800 text-[11px] font-extrabold rounded-xl transition cursor-pointer shrink-0 shadow-2xs flex items-center gap-1.5"
                >
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>{qa.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Main Conversation Window */}
          <div className="bg-white rounded-3xl border border-[var(--line)] shadow-sm overflow-hidden flex flex-col h-[520px]">
            {/* Thread Top Bar */}
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-xs font-black uppercase tracking-wider text-[var(--navy)]">
                  {activeThread.title}
                </span>
                <span className="text-[10px] font-semibold text-gray-400">
                  ({messages.length} messages)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCreateNewThread}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-extrabold flex items-center gap-1 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Conversation</span>
                </button>
              </div>
            </div>

            {/* Chat Messages List */}
            <div className="flex-1 p-5 overflow-y-auto space-y-5 bg-[#FAFBFE]">
              {messages.map((msg) => {
                const isAssistant = msg.role === 'assistant';
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${isAssistant ? 'justify-start' : 'justify-end'}`}
                  >
                    {isAssistant && (
                      <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    <div className={`max-w-2xl space-y-2.5 ${isAssistant ? 'w-full' : ''}`}>
                      <div
                        className={`p-4 rounded-2xl ${
                          isAssistant
                            ? 'bg-white border border-gray-200/80 text-[var(--ink)] shadow-2xs'
                            : 'bg-indigo-600 text-white ml-auto'
                        }`}
                      >
                        <div className={`prose prose-sm max-w-none text-xs leading-relaxed ${isAssistant ? 'text-[var(--ink)]' : 'text-white'}`}>
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>

                        <span
                          className={`text-[9px] block mt-2 font-semibold ${
                            isAssistant ? 'text-gray-400' : 'text-indigo-200 text-right'
                          }`}
                        >
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Matched Drills Action Box for Assistant Messages */}
                      {isAssistant && msg.matchedDrillIds && msg.matchedDrillIds.length > 0 && (
                        <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-3.5 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase text-indigo-950 flex items-center gap-1.5">
                              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Referenced Library Drills ({msg.matchedDrillIds.length})</span>
                            </span>
                            <button
                              onClick={() => handleCreatePlanFromJarvis(msg)}
                              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] rounded-lg transition cursor-pointer flex items-center gap-1 shadow-2xs"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Convert to Plan</span>
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {msg.matchedDrillIds.map((drillId) => {
                              const drill = drills.find((d) => d.id === drillId);
                              if (!drill) return null;
                              return (
                                <div
                                  key={drill.id}
                                  className="bg-white p-2.5 rounded-xl border border-indigo-100 shadow-2xs flex items-center justify-between gap-2"
                                >
                                  <div className="min-w-0">
                                    <span className="text-[9px] font-extrabold uppercase text-indigo-600 block truncate">
                                      {drill.cat} • {drill.mins}m
                                    </span>
                                    <h4 className="text-xs font-black text-[var(--navy)] truncate">
                                      {drill.title}
                                    </h4>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      onClick={() => handleAddDrillToActivePlan(drill.id)}
                                      title="Add to Active Plan"
                                      className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition cursor-pointer"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => handleOpenDrillInLibrary(drill.id)}
                                      title="View Drill Details"
                                      className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition cursor-pointer"
                                    >
                                      <ArrowRight className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {!isAssistant && (
                      <div className="w-8 h-8 rounded-xl bg-gray-900 text-white flex items-center justify-center shrink-0 shadow-2xs mt-0.5 font-black text-[10px]">
                        CO
                      </div>
                    )}
                  </div>
                );
              })}

              {loading && (
                <div className="flex gap-3 items-center text-indigo-600 bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-100 w-fit">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span className="text-xs font-bold">
                    Jarvis is analyzing player metrics & drills...
                  </span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-3.5 border-t border-gray-100 bg-white">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    focusedPlayer
                      ? `Ask Jarvis about ${focusedPlayer.name}'s heatmap, skills, or drills...`
                      : "Ask Jarvis questions on players, position heatmaps, skill levels, or drills..."
                  }
                  className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-[var(--ink)] focus:outline-none focus:border-indigo-500 focus:bg-white transition"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-black text-xs rounded-2xl transition cursor-pointer flex items-center gap-2 shadow-md shrink-0"
                >
                  <span>Ask Jarvis</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CONVERSATION HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-3xl border border-[var(--line)] shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-lg font-black text-[var(--navy)] flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                <span>Saved Conversation Threads ({threads.length})</span>
              </h2>
              <p className="text-xs text-[var(--muted)] font-medium mt-0.5">
                Review past coaching analysis sessions and jump back into previous threads anytime.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Search threads..."
                  className="pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-extrabold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                onClick={handleCreateNewThread}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>New Conversation</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredHistoryThreads.map((t) => {
              const isActive = t.id === activeThreadId;
              const isEditing = editingThreadId === t.id;
              const lastMsg = t.messages[t.messages.length - 1];

              return (
                <div
                  key={t.id}
                  onClick={() => {
                    if (!isEditing) {
                      setActiveThreadId(t.id);
                      setActiveTab('thread');
                    }
                  }}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-4 ${
                    isActive
                      ? 'border-indigo-500 bg-indigo-50/50 shadow-md ring-2 ring-indigo-500/20'
                      : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-gray-50/80 shadow-2xs'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      {isEditing ? (
                        <div className="flex items-center gap-2 w-full" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editingTitleText}
                            onChange={(e) => setEditingTitleText(e.target.value)}
                            className="px-2 py-1 bg-white border border-indigo-300 rounded-lg text-xs font-black text-indigo-900 w-full focus:outline-none"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveTitleEdit(t.id)}
                            className="p-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <h3 className="font-extrabold text-sm text-[var(--navy)] line-clamp-1 flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                          <span>{t.title}</span>
                        </h3>
                      )}

                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        {!isEditing && (
                          <button
                            onClick={() => {
                              setEditingThreadId(t.id);
                              setEditingTitleText(t.title);
                            }}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-gray-100 transition"
                            title="Rename Thread"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={(e) => handleDeleteThread(t.id, e)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100 transition"
                          title="Delete Thread"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {lastMsg && (
                      <p className="text-xs text-[var(--muted)] font-medium line-clamp-2 leading-relaxed bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                        "{lastMsg.content.slice(0, 120)}..."
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 pt-2 border-t border-gray-100">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      {new Date(t.updatedAt).toLocaleDateString()} • {t.messages.length} messages
                    </span>

                    <span className="text-indigo-600 font-extrabold flex items-center gap-1">
                      <span>Open Thread</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredHistoryThreads.length === 0 && (
              <div className="col-span-full text-center py-12 border border-dashed border-gray-200 rounded-2xl space-y-2 bg-gray-50">
                <History className="w-8 h-8 text-gray-300 mx-auto" />
                <p className="text-xs font-extrabold text-gray-400">No matching conversation threads found.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
