import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Player, Drill, TrainingState } from '../types';
import {
  Bot,
  Sparkles,
  Send,
  RefreshCw,
  Plus,
  Check,
  BookOpen,
  Users,
  Target,
  Clock,
  Zap,
  ArrowRight,
  MessageSquare,
  Lightbulb,
  CheckCircle2,
  Trash2,
  ListFilter
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  matchedDrillIds?: string[];
  focusArea?: string;
  targetGroup?: string;
}

interface JarvisScreenProps {
  players: Player[];
  drills: Drill[];
  trainingState: TrainingState;
  onUpdateTrainingState: (state: TrainingState) => void;
  onNavigateTab: (tab: string) => void;
}

const FOCUS_AREAS = [
  'All-Round AFL Skills',
  'Kicking Precision & Distance',
  'Handball in Traffic & Pressure',
  'AFL Girls Aerobic Fitness',
  'Dual Foot Mastery',
  'Contested Ball & Crumbing',
  'Defensive Shepherding & Marking',
  'Switching Play & Corridor Width',
  'Goal Kicking & Set Shots',
];

export default function JarvisScreen({
  players,
  drills,
  trainingState,
  onUpdateTrainingState,
  onNavigateTab,
}: JarvisScreenProps) {
  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: 'welcome',
      role: 'assistant',
      content: `G'day Coach! I'm **Jarvis**, your AFL Senior Coaching & Skill Development Assistant.\n\nI can help you build custom training plans, recommend targeted drills based on your squad's player profiles, and align session objectives directly with the **${drills.length} drills** in your system library.\n\nSelect an area of focus or ask me a question below!`,
      timestamp: new Date(),
    }
  ]);

  const [input, setInput] = useState('');
  const [selectedFocus, setSelectedFocus] = useState<string>('All-Round AFL Skills');
  const [selectedGroup, setSelectedGroup] = useState<string>('Whole Squad');
  const [selectedDuration, setSelectedDuration] = useState<string>('45 mins');
  const [loading, setLoading] = useState(false);
  const [addedPlanNotice, setAddedPlanNotice] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

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

    const userMessage: Message = {
      id: `msg-${Date.now()}-u`,
      role: 'user',
      content: query,
      timestamp: new Date(),
      focusArea: selectedFocus,
      targetGroup: selectedGroup,
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      // Build request payload with squad & drills context for Jarvis
      const res = await fetch('/api/jarvis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          focusArea: selectedFocus,
          targetPlayers: selectedGroup,
          duration: selectedDuration,
          squad: players,
          drills: drills,
          history: messages.slice(-6).map((m) => ({
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
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}-err`,
          role: 'assistant',
          content: `⚠️ Communication error: ${err.message || 'Could not reach Jarvis API server.'}`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Convert matched drills in Jarvis message to a new Training Plan
  const handleCreatePlanFromJarvis = (msg: Message) => {
    const matchedIds = msg.matchedDrillIds && msg.matchedDrillIds.length > 0
      ? msg.matchedDrillIds
      : drills.slice(0, 3).map(d => d.id);

    const planName = `Jarvis Plan: ${msg.focusArea || selectedFocus} (${selectedDuration})`;
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

  const handlePresetPrompt = (promptText: string) => {
    setInput(promptText);
    handleSendMessage(promptText);
  };

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
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">Jarvis AI Assistant</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active Coach Engine
                </span>
              </div>
              <p className="text-xs text-indigo-200/80 font-medium mt-1 max-w-2xl leading-relaxed">
                Your dedicated AFL senior coaching AI. Ask for customized drill recommendations, session breakdowns for specific player groups, and instant training plans aligned to your system library.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 self-start md:self-auto shrink-0">
            <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/15">
              <a
                href="https://play.afl/sites/default/files/2023-10/Junior%20Coaching%20Curriculum%20-%20Level%206%20%2811-12%20Years%29%20Guidebook.pdf"
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1.5 bg-indigo-500/30 hover:bg-indigo-500/50 text-indigo-100 hover:text-white rounded-xl text-[11px] font-extrabold transition flex items-center gap-1 border border-indigo-400/30"
                title="AFL Junior Coaching Curriculum - Level 6 Guidebook"
              >
                <span>📄 Junior (11-12Y) Guide</span>
              </a>
              <a
                href="https://play.afl/learning-resource/youth-coaching-curriculum#article-0"
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1.5 bg-blue-500/30 hover:bg-blue-500/50 text-blue-100 hover:text-white rounded-xl text-[11px] font-extrabold transition flex items-center gap-1 border border-blue-400/30"
                title="AFL Youth Coaching Curriculum"
              >
                <span>📘 Youth Curriculum</span>
              </a>
            </div>

            <div className="flex items-center gap-2.5 bg-white/5 backdrop-blur-md p-3 rounded-2xl border border-white/10">
              <div className="text-right">
                <span className="text-[10px] uppercase tracking-wider text-indigo-200/70 font-black block">Connected Library</span>
                <span className="text-sm font-black text-white">{drills.length} AFL Drills • {players.length} Players</span>
              </div>
              <button
                onClick={() => onNavigateTab('training')}
                className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <BookOpen className="w-4 h-4" />
                <span>Drills</span>
              </button>
            </div>
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

      {/* Context Control & Filtering Panel */}
      <div className="bg-white p-5 rounded-2xl border border-[var(--line)] shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h2 className="text-xs font-black uppercase tracking-wider text-[var(--navy)] flex items-center gap-2">
            <ListFilter className="w-4 h-4 text-indigo-600" />
            <span>Session & Player Focus Parameters</span>
          </h2>
          <span className="text-[11px] text-[var(--muted)] font-semibold">
            Auto-injected into Jarvis responses
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Area of Focus */}
          <div>
            <label className="block text-[11px] font-black uppercase text-[var(--muted)] mb-1.5 flex items-center gap-1">
              <Target className="w-3.5 h-3.5 text-indigo-500" />
              <span>Area of Focus</span>
            </label>
            <select
              value={selectedFocus}
              onChange={(e) => setSelectedFocus(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-extrabold text-[var(--ink)] focus:outline-none focus:border-indigo-500"
            >
              {FOCUS_AREAS.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </div>

          {/* Target Group */}
          <div>
            <label className="block text-[11px] font-black uppercase text-[var(--muted)] mb-1.5 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-indigo-500" />
              <span>Target Group / Positional Unit</span>
            </label>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-extrabold text-[var(--ink)] focus:outline-none focus:border-indigo-500"
            >
              <option value="Whole Squad">Whole Squad (All Players)</option>
              <option value="Midfielders & Rucks">Midfielders & Rucks (MID, RUK)</option>
              <option value="Defenders & Rebounders">Defenders & Rebounders (DEF)</option>
              <option value="Forwards & Key Targets">Forwards & Key Targets (FWD)</option>
              <option value="AFL Girls Squad">AFL Girls Squad Development</option>
              <option value="Resting / Interchange Group">Resting & Interchange Group</option>
            </select>
          </div>

          {/* Session Duration */}
          <div>
            <label className="block text-[11px] font-black uppercase text-[var(--muted)] mb-1.5 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              <span>Session Duration</span>
            </label>
            <select
              value={selectedDuration}
              onChange={(e) => setSelectedDuration(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-extrabold text-[var(--ink)] focus:outline-none focus:border-indigo-500"
            >
              <option value="30 mins">30 Minutes (Short Intensive)</option>
              <option value="45 mins">45 Minutes (Standard Block)</option>
              <option value="60 mins">60 Minutes (Full Session)</option>
              <option value="90 mins">90 Minutes (Pre-Season Intensive)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Preset Action Prompts */}
      <div className="space-y-2">
        <span className="text-[11px] font-black uppercase tracking-wider text-[var(--muted)] flex items-center gap-1">
          <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
          <span>Quick Coaching Questions</span>
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={() =>
              handlePresetPrompt(
                `Recommend a ${selectedDuration} training plan for ${selectedGroup} focusing on ${selectedFocus} using our system drills.`
              )
            }
            className="p-3.5 bg-white hover:bg-indigo-50/50 border border-[var(--line)] hover:border-indigo-200 rounded-2xl text-left transition shadow-xs group cursor-pointer space-y-1.5"
          >
            <div className="flex items-center gap-2 text-indigo-600 font-black text-xs group-hover:text-indigo-800">
              <Zap className="w-4 h-4 text-indigo-500 shrink-0" />
              <span>Full Training Plan</span>
            </div>
            <p className="text-xs text-[var(--muted)] font-semibold line-clamp-2">
              Build a timed {selectedDuration} plan for {selectedGroup} targeting {selectedFocus}.
            </p>
          </button>

          <button
            onClick={() =>
              handlePresetPrompt(
                `Which drills in our library best help players improve dual foot kicking and non-preferred side disposal under pressure?`
              )
            }
            className="p-3.5 bg-white hover:bg-indigo-50/50 border border-[var(--line)] hover:border-indigo-200 rounded-2xl text-left transition shadow-xs group cursor-pointer space-y-1.5"
          >
            <div className="flex items-center gap-2 text-emerald-600 font-black text-xs group-hover:text-emerald-800">
              <Target className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Dual Foot Disposal</span>
            </div>
            <p className="text-xs text-[var(--muted)] font-semibold line-clamp-2">
              Find drills for dual foot kicking and pressure handballs.
            </p>
          </button>

          <button
            onClick={() =>
              handlePresetPrompt(
                `Suggest 3 key drills to prepare our Defenders against quick corridor ball movement and aerial marking.`
              )
            }
            className="p-3.5 bg-white hover:bg-indigo-50/50 border border-[var(--line)] hover:border-indigo-200 rounded-2xl text-left transition shadow-xs group cursor-pointer space-y-1.5"
          >
            <div className="flex items-center gap-2 text-blue-600 font-black text-xs group-hover:text-blue-800">
              <BookOpen className="w-4 h-4 text-blue-500 shrink-0" />
              <span>Defensive Positioning</span>
            </div>
            <p className="text-xs text-[var(--muted)] font-semibold line-clamp-2">
              Select drills for defensive spoiled balls, marking & corridor protection.
            </p>
          </button>

          <button
            onClick={() =>
              handlePresetPrompt(
                `How can we structure warm-up and skill progression drills for AFL Girls player aerobic fitness and ball handling?`
              )
            }
            className="p-3.5 bg-white hover:bg-indigo-50/50 border border-[var(--line)] hover:border-indigo-200 rounded-2xl text-left transition shadow-xs group cursor-pointer space-y-1.5"
          >
            <div className="flex items-center gap-2 text-purple-600 font-black text-xs group-hover:text-purple-800">
              <Sparkles className="w-4 h-4 text-purple-500 shrink-0" />
              <span>Fitness & Aerobic Work</span>
            </div>
            <p className="text-xs text-[var(--muted)] font-semibold line-clamp-2">
              Combine high-intensity aerobic repetition with drill skill blocks.
            </p>
          </button>

          <button
            onClick={() =>
              handlePresetPrompt(
                `What are the core skill progression principles and small-sided game guidelines from the official AFL Junior Coaching Curriculum Level 6 (11-12 Years) Guidebook?`
              )
            }
            className="p-3.5 bg-amber-50/60 hover:bg-amber-50 border border-amber-200 hover:border-amber-300 rounded-2xl text-left transition shadow-xs group cursor-pointer space-y-1.5"
          >
            <div className="flex items-center gap-2 text-amber-700 font-black text-xs group-hover:text-amber-900">
              <BookOpen className="w-4 h-4 text-amber-600 shrink-0" />
              <span>AFL Junior Curriculum (11-12Y)</span>
            </div>
            <p className="text-xs text-amber-800/80 font-semibold line-clamp-2">
              Level 6 guidebook guidelines: small-sided games, footy prep & touch frequency.
            </p>
          </button>

          <button
            onClick={() =>
              handlePresetPrompt(
                `How does the official AFL Youth Coaching Curriculum (13-17 Years) recommend structuring tactical ball movement, corridor play, and game speed pressure?`
              )
            }
            className="p-3.5 bg-blue-50/60 hover:bg-blue-50 border border-blue-200 hover:border-blue-300 rounded-2xl text-left transition shadow-xs group cursor-pointer space-y-1.5"
          >
            <div className="flex items-center gap-2 text-blue-700 font-black text-xs group-hover:text-blue-900">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
              <span>AFL Youth Curriculum (13-17Y)</span>
            </div>
            <p className="text-xs text-blue-800/80 font-semibold line-clamp-2">
              Youth curriculum framework: tactical decision making, team defense & match speed.
            </p>
          </button>
        </div>
      </div>

      {/* Main Chat Thread Area */}
      <div className="bg-white rounded-3xl border border-[var(--line)] shadow-sm overflow-hidden flex flex-col h-[520px]">
        {/* Thread Header Bar */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <h3 className="text-xs font-black uppercase tracking-wider text-[var(--navy)]">
              Jarvis Conversation Thread
            </h3>
          </div>
          <button
            onClick={() =>
              setMessages([
                {
                  id: 'welcome',
                  role: 'assistant',
                  content: `G'day Coach! Jarvis session thread reset. How can I help with your training drills or player focus today?`,
                  timestamp: new Date(),
                },
              ])
            }
            className="text-[11px] text-gray-400 hover:text-red-600 font-bold flex items-center gap-1 transition cursor-pointer"
            title="Clear Chat Thread"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Thread</span>
          </button>
        </div>

        {/* Message History */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-[#FAFBFE]">
          {messages.map((msg) => {
            const isAssistant = msg.role === 'assistant';
            return (
              <div
                key={msg.id}
                className={`flex gap-3.5 ${isAssistant ? 'justify-start' : 'justify-end'}`}
              >
                {isAssistant && (
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    <Bot className="w-5 h-5" />
                  </div>
                )}

                <div className={`max-w-2xl space-y-3 ${isAssistant ? 'w-full' : ''}`}>
                  <div
                    className={`p-5 rounded-2xl ${
                      isAssistant
                        ? 'bg-white border border-gray-200/80 text-[var(--ink)] shadow-xs'
                        : 'bg-indigo-600 text-white ml-auto'
                    }`}
                  >
                    {msg.focusArea && !isAssistant && (
                      <div className="flex flex-wrap gap-1.5 mb-2.5 pb-2 border-b border-indigo-500/40 text-[10px] font-bold text-indigo-100 uppercase tracking-wider">
                        <span>Focus: {msg.focusArea}</span>
                        {msg.targetGroup && <span>• Group: {msg.targetGroup}</span>}
                      </div>
                    )}

                    <div className={`prose prose-sm max-w-none text-xs leading-relaxed ${isAssistant ? 'text-[var(--ink)]' : 'text-white'}`}>
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>

                    <span
                      className={`text-[10px] block mt-3 font-semibold ${
                        isAssistant ? 'text-gray-400' : 'text-indigo-200 text-right'
                      }`}
                    >
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Matched Drills Action Box for Assistant Messages */}
                  {isAssistant && msg.matchedDrillIds && msg.matchedDrillIds.length > 0 && (
                    <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase text-indigo-950 flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Matched Drills in System ({msg.matchedDrillIds.length})</span>
                        </span>
                        <button
                          onClick={() => handleCreatePlanFromJarvis(msg)}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] rounded-xl transition cursor-pointer flex items-center gap-1 shadow-xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Convert to Training Plan</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {msg.matchedDrillIds.map((drillId) => {
                          const drill = drills.find((d) => d.id === drillId);
                          if (!drill) return null;
                          return (
                            <div
                              key={drill.id}
                              className="bg-white p-3 rounded-xl border border-indigo-100 shadow-2xs flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0">
                                <span className="text-[10px] font-extrabold uppercase text-indigo-600 block truncate">
                                  {drill.cat} • {drill.mins} mins
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
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleOpenDrillInLibrary(drill.id)}
                                  title="View Drill Details"
                                  className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition cursor-pointer"
                                >
                                  <ArrowRight className="w-3.5 h-3.5" />
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
                  <div className="w-9 h-9 rounded-xl bg-gray-900 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5 font-black text-xs">
                    CO
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-3.5 items-center text-indigo-600 bg-indigo-50/60 p-4 rounded-2xl border border-indigo-100 w-fit">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-xs font-bold">
                Jarvis is analyzing drills & player profiles...
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-gray-100 bg-white">
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
              placeholder="Ask Jarvis for drill recommendations, training advice, or plan adjustments..."
              className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-[var(--ink)] focus:outline-none focus:border-indigo-500 focus:bg-white transition"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-black text-xs rounded-2xl transition cursor-pointer flex items-center gap-2 shadow-md shrink-0"
            >
              <span>Ask Jarvis</span>
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
