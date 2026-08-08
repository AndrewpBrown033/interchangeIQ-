import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Player, Drill, TrainingState, SkillAssessment, ApiKeySettings, Rotation } from '../types';
import { getZoneForPosition } from '../constants';
import {
  Bot,
  Sparkles,
  Send,
  RefreshCw,
  Plus,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  MessageSquare,
  Trash2,
  History,
  Edit3,
  Check,
  Search,
  Cpu,
  Zap,
  Users
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  matchedDrillIds?: string[];
  debugLogs?: string[];
  provider?: 'claude' | 'gemini';
}

interface ConversationThread {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
}

export interface JarvisActionItem {
  id: string;
  type: 'swap' | 'assign';
  outPlayer?: Player;
  inPlayer?: Player;
  targetPlayer?: Player;
  slotKey?: string;
  reason: string;
  zoneBadge?: 'FWD' | 'MID' | 'BACK' | 'RUCK' | 'POS';
}

function detectJarvisActionRecommendations(content: string, squad: Player[]): JarvisActionItem[] {
  const actions: JarvisActionItem[] = [];
  if (!content) return actions;

  // 1. Structured tag check: [ACTION: SWAP | OUT: #X ... | IN: #Y ... | REASON: ...]
  const swapRegex = /\[ACTION:\s*SWAP\s*\|\s*OUT:\s*#?(\d+)?\s*([^\|]+)\|\s*IN:\s*#?(\d+)?\s*([^\|]+)(?:\|\s*REASON:\s*([^\]]+))?\]/gi;
  let match: RegExpExecArray | null;

  while ((match = swapRegex.exec(content)) !== null) {
    const outNum = match[1];
    const outName = match[2]?.trim();
    const inNum = match[3];
    const inName = match[4]?.trim();
    const reason = match[5]?.trim() || 'Recommended rotation swap';

    const outP = squad.find(p => (outNum && p.number === outNum) || (outName && p.name.toLowerCase().includes(outName.toLowerCase())));
    const inP = squad.find(p => (inNum && p.number === inNum) || (inName && p.name.toLowerCase().includes(inName.toLowerCase())));

    if (outP && inP) {
      const zone = inP.primaryZone || (inP.positions?.[0] ? getZoneForPosition(inP.positions[0]) : 'POS');
      const zoneBadge = zone === 'FWD' ? 'FWD' : zone === 'MID' ? 'MID' : zone === 'DEF' ? 'BACK' : zone === 'RUCK' ? 'RUCK' : 'POS';
      actions.push({
        id: `jact-${outP.id}-${inP.id}-${actions.length}`,
        type: 'swap',
        outPlayer: outP,
        inPlayer: inP,
        reason,
        zoneBadge,
      });
    }
  }

  // 2. Structured tag check: [ACTION: ASSIGN | PLAYER: #X ... | SLOT: C | REASON: ...]
  const assignRegex = /\[ACTION:\s*ASSIGN\s*\|\s*PLAYER:\s*#?(\d+)?\s*([^\|]+)\|\s*SLOT:\s*([^\|]+)(?:\|\s*REASON:\s*([^\]]+))?\]/gi;
  while ((match = assignRegex.exec(content)) !== null) {
    const pNum = match[1];
    const pName = match[2]?.trim();
    const slot = match[3]?.trim();
    const reason = match[4]?.trim() || `Assign to position ${slot}`;

    const targetP = squad.find(p => (pNum && p.number === pNum) || (pName && p.name.toLowerCase().includes(pName.toLowerCase())));
    if (targetP && slot) {
      const zone = targetP.primaryZone || (targetP.positions?.[0] ? getZoneForPosition(targetP.positions[0]) : 'POS');
      const zoneBadge = zone === 'FWD' ? 'FWD' : zone === 'MID' ? 'MID' : zone === 'DEF' ? 'BACK' : zone === 'RUCK' ? 'RUCK' : 'POS';
      actions.push({
        id: `jact-assign-${targetP.id}-${slot}-${actions.length}`,
        type: 'assign',
        targetPlayer: targetP,
        slotKey: slot,
        reason,
        zoneBadge,
      });
    }
  }

  // 3. Fallback pattern match for markdown OUT #X Name ➔ IN #Y Name
  if (actions.length === 0) {
    const textSwapRegex = /OUT\s+#(\d+)\s+([^\(\n➔\->]+).*?(?:➔|->)\s+IN\s+#(\d+)\s+([^\(\n]+)/gi;
    while ((match = textSwapRegex.exec(content)) !== null) {
      const outNum = match[1];
      const inNum = match[3];

      const outP = squad.find(p => p.number === outNum);
      const inP = squad.find(p => p.number === inNum);

      if (outP && inP) {
        const zone = inP.primaryZone || (inP.positions?.[0] ? getZoneForPosition(inP.positions[0]) : 'POS');
        const zoneBadge = zone === 'FWD' ? 'FWD' : zone === 'MID' ? 'MID' : zone === 'DEF' ? 'BACK' : zone === 'RUCK' ? 'RUCK' : 'POS';
        actions.push({
          id: `jact-text-${outP.id}-${inP.id}-${actions.length}`,
          type: 'swap',
          outPlayer: outP,
          inPlayer: inP,
          reason: `Position Match (${inP.positions?.join('/') || inP.primaryZone}) - OUT #${outP.number} ➔ IN #${inP.number}`,
          zoneBadge,
        });
      }
    }
  }

  return actions;
}

interface JarvisScreenProps {
  players: Player[];
  onUpdatePlayers?: (players: Player[]) => void;
  lineup?: Record<string, string>;
  onUpdateLineup?: (lineup: Record<string, string>) => void;
  rotations?: Rotation[];
  onUpdateRotations?: (rotations: Rotation[]) => void;
  drills: Drill[];
  growthRecords?: SkillAssessment[];
  trainingState: TrainingState;
  onUpdateTrainingState: (state: TrainingState) => void;
  onNavigateTab: (tab: string) => void;
  apiKeys?: ApiKeySettings;
}

const DEFAULT_WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content: `G'day Coach! I'm **Jarvis**, your autonomous AFL Coaching & Performance Intelligence Agent.\n\nI automatically analyze your squad data, ground time heatmaps, and skill assessment records in real-time.\n\nAsk me **anything in open conversation** — for example:\n• *"How is Jack Higgins performing on kick accuracy and opposite foot?"*\n• *"Show me our midfield rotation ground times and who needs more bench rest"*\n• *"Who has the highest 2km time trial and fitness score?"*\n• *"Design a 45-minute corridor ball movement session with 3 drills from our library"*\n\nI will automatically identify the relevant players and suggest actionable coaching strategies!`,
  timestamp: new Date(),
};

export default function JarvisScreen({
  players,
  onUpdatePlayers,
  lineup,
  onUpdateLineup,
  rotations,
  onUpdateRotations,
  drills,
  growthRecords = [],
  trainingState,
  onUpdateTrainingState,
  onNavigateTab,
  apiKeys,
}: JarvisScreenProps) {
  // Navigation sub-tab: 'thread' or 'history'
  const [activeTab, setActiveTab] = useState<'thread' | 'history'>('thread');
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [appliedActionIds, setAppliedActionIds] = useState<Record<string, boolean>>({});

  // Load saved conversation threads
  const [threads, setThreads] = useState<ConversationThread[]>(() => {
    try {
      const saved = localStorage.getItem('iiq_jarvis_history_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((t: any) => ({
            ...t,
            messages: Array.isArray(t.messages)
              ? t.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }))
              : [DEFAULT_WELCOME_MESSAGE],
          }));
        }
      }
    } catch (_e) {}

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

  const activeThread = threads.find((t) => t.id === activeThreadId) || threads[0];
  const messages = activeThread ? activeThread.messages : [DEFAULT_WELCOME_MESSAGE];

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [addedPlanNotice, setAddedPlanNotice] = useState<string | null>(null);

  // AI provider selection - shared with the "Import with AI" feature in Training
  const [aiProvider, setAiProvider] = useState<'claude' | 'gemini'>(() => {
    try {
      const saved = localStorage.getItem('iiq_ai_provider');
      return saved === 'gemini' ? 'gemini' : 'claude';
    } catch (_e) {
      return 'claude';
    }
  });

  const handleSetAiProvider = (p: 'claude' | 'gemini') => {
    setAiProvider(p);
    try {
      localStorage.setItem('iiq_ai_provider', p);
    } catch (_e) {}
  };


  const [expandedDebugMsgIds, setExpandedDebugMsgIds] = useState<Record<string, boolean>>({});

  const toggleDebugLogs = (msgId: string) => {
    setExpandedDebugMsgIds((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };
  const [editingTitleText, setEditingTitleText] = useState('');
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [historySearch, setHistorySearch] = useState('');

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (activeTab === 'thread') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading, activeTab]);

  useEffect(() => {
    try {
      localStorage.setItem('iiq_jarvis_history_v3', JSON.stringify(threads));
    } catch (_e) {}
  }, [threads]);

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
              updatedTitle = firstUserMsg.content.slice(0, 36) + (firstUserMsg.content.length > 36 ? '...' : '');
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
          content: `New thread started! Ask me any question regarding your players, position heatmaps, ground time, or drill sessions.`,
          timestamp: new Date(),
        },
      ],
    };
    setThreads((prev) => [newThread, ...prev]);
    setActiveThreadId(newThread.id);
    setActiveTab('thread');
  };

  const handleDeleteThread = (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (threads.length <= 1) {
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

    const userMessage: Message = {
      id: `msg-${Date.now()}-u`,
      role: 'user',
      content: query,
      timestamp: new Date(),
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
          message: query,
          squad: players,
          drills: drills,
          growthRecords: growthRecords,
          provider: aiProvider,
          apiKeyOverride: aiProvider === 'gemini' ? apiKeys?.geminiApiKey : apiKeys?.anthropicApiKey,
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
        debugLogs: Array.isArray(data.debugLogs) ? data.debugLogs : undefined,
        provider: data.provider || aiProvider,
      };

      updateActiveThreadMessages([...newMessages, assistantMessage]);
    } catch (err: any) {
      const errMessage: Message = {
        id: `msg-${Date.now()}-err`,
        role: 'assistant',
        content: `⚠️ Communication error: ${err.message || 'Could not reach Jarvis API server.'}`,
        timestamp: new Date(),
        debugLogs: (err as any)?.debugLogs || undefined,
        provider: aiProvider,
      };
      updateActiveThreadMessages([...newMessages, errMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlanFromJarvis = (msg: Message) => {
    const matchedIds = msg.matchedDrillIds && msg.matchedDrillIds.length > 0
      ? msg.matchedDrillIds
      : drills.slice(0, 3).map(d => d.id);

    const planName = `Jarvis Plan (${new Date().toLocaleDateString()})`;
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

  const handleApplyJarvisAction = (action: JarvisActionItem) => {
    if (action.type === 'swap' && action.outPlayer && action.inPlayer) {
      const outId = action.outPlayer.id;
      const inId = action.inPlayer.id;

      let updatedLineup = { ...(lineup || {}) };
      const slotKey = Object.keys(updatedLineup).find(k => updatedLineup[k] === outId);

      if (slotKey) {
        updatedLineup[slotKey] = inId;
      } else {
        const openSlot = Object.keys(updatedLineup).find(k => !updatedLineup[k]);
        if (openSlot) updatedLineup[openSlot] = inId;
      }

      if (onUpdateLineup) {
        onUpdateLineup(updatedLineup);
      }

      if (rotations && onUpdateRotations) {
        const newRot: Rotation = {
          id: `rot-${Date.now()}`,
          planId: 'jarvis-ai',
          quarter: 1,
          minute: 5,
          type: 'onfield',
          outId: outId,
          inId: inId,
          out: `#${action.outPlayer.number} ${action.outPlayer.name}`,
          inn: `#${action.inPlayer.number} ${action.inPlayer.name}`,
          applied: true,
          status: 'applied',
          note: `Executed from Jarvis AI Recommendation (${action.reason})`,
        };
        onUpdateRotations([...rotations, newRot]);
      }

      setAppliedActionIds(prev => ({ ...prev, [action.id]: true }));
      setActionNotice(`⚡ Action Executed! Swapped OUT #${action.outPlayer.number} ${action.outPlayer.name} for IN #${action.inPlayer.number} ${action.inPlayer.name}!`);
      setTimeout(() => setActionNotice(null), 4000);
    } else if (action.type === 'assign' && action.targetPlayer && action.slotKey) {
      let updatedLineup = { ...(lineup || {}) };
      updatedLineup[action.slotKey] = action.targetPlayer.id;

      if (onUpdateLineup) {
        onUpdateLineup(updatedLineup);
      }

      setAppliedActionIds(prev => ({ ...prev, [action.id]: true }));
      setActionNotice(`⚡ Action Executed! Assigned #${action.targetPlayer.number} ${action.targetPlayer.name} to ${action.slotKey}!`);
      setTimeout(() => setActionNotice(null), 4000);
    }
  };

  const filteredHistoryThreads = threads.filter((t) => {
    if (!historySearch.trim()) return true;
    const q = historySearch.toLowerCase();
    return t.title.toLowerCase().includes(q) || t.messages.some((m) => m.content.toLowerCase().includes(q));
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
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
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">Jarvis Agentic AI Assistant</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Agentic Mode
                </span>
              </div>
              <p className="text-xs text-indigo-200/80 font-medium mt-1 max-w-2xl leading-relaxed">
                Autonomous coaching intelligence. Ask anything about your players, heatmaps, skill ratings, or drill recommendations — Jarvis will automatically deduce player context from squad data.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto shrink-0">
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
                <span>History</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/20 font-black">
                  {threads.length}
                </span>
              </button>
            </div>

            <div className="flex bg-white/10 backdrop-blur-md p-1 rounded-2xl border border-white/15" title="Choose which AI provider powers Jarvis">
              <button
                onClick={() => handleSetAiProvider('claude')}
                className={`px-3 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                  aiProvider === 'claude'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-indigo-200 hover:text-white'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>Claude</span>
              </button>
              <button
                onClick={() => handleSetAiProvider('gemini')}
                className={`px-3 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                  aiProvider === 'gemini'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-indigo-200 hover:text-white'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>Gemini</span>
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

      {/* Notice Banners */}
      {actionNotice && (
        <div className="bg-purple-50 border-2 border-purple-300 text-purple-950 p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold animate-fadeIn shadow-sm">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-600 shrink-0" />
            <span>{actionNotice}</span>
          </div>
          <button
            onClick={() => onNavigateTab('gameday')}
            className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-black transition cursor-pointer shrink-0 shadow-xs"
          >
            View GameDay Lineup
          </button>
        </div>
      )}

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

      {/* MAIN COACHING THREAD */}
      {activeTab === 'thread' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-[var(--line)] shadow-sm overflow-hidden flex flex-col h-[580px]">
            {/* Thread Top Bar */}
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-xs font-black uppercase tracking-wider text-[var(--navy)]">
                  {activeThread.title}
                </span>
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

                        {/* Collapsible AI Debug Trace */}
                        {isAssistant && msg.debugLogs && msg.debugLogs.length > 0 && (
                          <div className="mt-2.5 pt-2 border-t border-gray-100">
                            <button
                              type="button"
                              onClick={() => toggleDebugLogs(msg.id)}
                              className="text-[10px] font-mono font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-1.5 cursor-pointer bg-slate-100 hover:bg-slate-200/80 px-2.5 py-1 rounded-lg transition"
                            >
                              <Cpu className="w-3 h-3 text-indigo-500" />
                              <span>{expandedDebugMsgIds[msg.id] ? 'Hide AI Debug Trace' : `Show AI Debug Trace (${(msg.provider || 'AI').toUpperCase()})`}</span>
                              <span className="text-[9px] px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded font-bold">
                                {msg.debugLogs.length} logs
                              </span>
                            </button>

                            {expandedDebugMsgIds[msg.id] && (
                              <div className="mt-2 p-3 bg-slate-950 text-emerald-400 font-mono text-[10px] rounded-xl space-y-1 overflow-x-auto shadow-inner border border-slate-800 leading-relaxed max-h-60">
                                <div className="text-slate-400 font-bold border-b border-slate-800 pb-1 mb-1.5 flex items-center justify-between">
                                  <span>⚡ JARVIS DEBUG TRACE — PROVIDER: {(msg.provider || 'AI').toUpperCase()}</span>
                                  <span>{msg.timestamp.toLocaleTimeString()}</span>
                                </div>
                                {msg.debugLogs.map((logLine, lIdx) => (
                                  <div key={lIdx} className="whitespace-pre-wrap break-all">
                                    {logLine}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Matched Drills Action Box */}
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

                      {/* Actionable Position Recommendations Card */}
                      {isAssistant && (() => {
                        const recActions = detectJarvisActionRecommendations(msg.content, players);
                        if (recActions.length === 0) return null;

                        return (
                          <div className="bg-purple-50/90 border-2 border-purple-200 rounded-2xl p-3.5 space-y-2.5 shadow-2xs">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <span className="text-[10px] font-black uppercase text-purple-950 flex items-center gap-1.5 tracking-wider">
                                <Sparkles className="w-3.5 h-3.5 text-purple-600 animate-pulse" />
                                <span>Jarvis Recommended Position Actions ({recActions.length})</span>
                              </span>
                              <span className="text-[10px] font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-md border border-purple-200">
                                Position Logic Enabled
                              </span>
                            </div>

                            <div className="space-y-2 pt-0.5">
                              {recActions.map((act) => {
                                const isDone = appliedActionIds[act.id];
                                return (
                                  <div key={act.id} className="p-3 bg-white/95 rounded-xl border border-purple-200 shadow-2xs flex items-center justify-between gap-3 flex-wrap">
                                    <div className="space-y-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase border ${
                                          act.zoneBadge === 'FWD' ? 'bg-orange-100 text-orange-950 border-orange-300' :
                                          act.zoneBadge === 'MID' ? 'bg-blue-100 text-blue-950 border-blue-300' :
                                          act.zoneBadge === 'BACK' ? 'bg-emerald-100 text-emerald-950 border-emerald-300' :
                                          'bg-purple-100 text-purple-950 border-purple-300'
                                        }`}>
                                          {act.zoneBadge} Position Match
                                        </span>
                                        {act.type === 'swap' && act.outPlayer && act.inPlayer && (
                                          <span className="text-xs font-black text-slate-950">
                                            OUT #{act.outPlayer.number} {act.outPlayer.nick || act.outPlayer.name} ➔ IN #{act.inPlayer.number} {act.inPlayer.nick || act.inPlayer.name}
                                          </span>
                                        )}
                                        {act.type === 'assign' && act.targetPlayer && act.slotKey && (
                                          <span className="text-xs font-black text-slate-950">
                                            Assign #{act.targetPlayer.number} {act.targetPlayer.name} ➔ {act.slotKey}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[11px] text-slate-600 font-medium">{act.reason}</p>
                                    </div>

                                    <button
                                      disabled={isDone}
                                      onClick={() => handleApplyJarvisAction(act)}
                                      className={`px-3 py-1.5 font-extrabold text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0 ${
                                        isDone
                                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-default'
                                          : 'bg-purple-700 hover:bg-purple-800 text-white active:scale-95'
                                      }`}
                                    >
                                      {isDone ? (
                                        <>
                                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                          <span>Action Executed</span>
                                        </>
                                      ) : (
                                        <>
                                          <Zap className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                                          <span>Apply Action Now</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
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
                    Jarvis is scanning squad records, heatmaps & drills...
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
                  placeholder="Ask Jarvis about players, heatmaps, opposite foot ratings, or session plans..."
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

      {/* CONVERSATION HISTORY TAB */}
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
              const msgs = Array.isArray(t.messages) ? t.messages : [];
              const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;

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
