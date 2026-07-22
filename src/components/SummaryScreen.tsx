import React from 'react';
import { Player, GameInfo } from '../types';
import { ShieldCheck, UserX, Users, Trophy, History, Settings, CloudLightning, TrendingUp, Bot, Sparkles, ArrowRight } from 'lucide-react';

interface SummaryScreenProps {
  players: Player[];
  gameInfo: GameInfo;
  historyCount: number;
  cloudConnected: boolean;
  cloudRoom: string;
  lastSyncedAt: number | null;
  userName: string;
  role: string;
  email: string;
  onNavigate: (tabId: string) => void;
  onStartNewGame: () => void;
}

export default function SummaryScreen({
  players,
  gameInfo,
  historyCount,
  cloudConnected,
  cloudRoom,
  lastSyncedAt,
  userName,
  role,
  email,
  onNavigate,
  onStartNewGame,
}: SummaryScreenProps) {
  const availablePlayers = players.filter((p) => p.status === 'available');
  const injuredPlayers = players.filter((p) => p.status === 'injured');
  const awayPlayers = players.filter((p) => p.status === 'away');

  const formatSyncTime = (ts: number | null) => {
    if (!ts) return 'Never';
    const d = new Date(ts);
    return `${d.toLocaleDateString()} at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return 'Good morning';
    if (hours < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-[var(--line)] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[var(--navy)] tracking-tight">
            {getGreeting()}, {userName || email || 'Coach'} 👋
          </h2>
          <p className="text-xs text-[var(--muted)] font-semibold mt-1">
            Welcome back to InterchangeIQ — managing {cloudRoom || 'your squad'}
          </p>
        </div>
        <button
          onClick={onStartNewGame}
          className="bg-[var(--green)] text-white px-4 py-2.5 rounded-xl font-bold text-xs hover:opacity-95 transition shadow-sm"
        >
          New Game Line Up
        </button>
      </div>

      {/* Jarvis AI Coaching Assistant Banner */}
      <div
        onClick={() => onNavigate('jarvis')}
        className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white p-6 rounded-2xl border border-indigo-800/40 shadow-md hover:shadow-xl transition-all cursor-pointer group flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden"
      >
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 group-hover:scale-105 transition-transform shrink-0">
            <Bot className="w-7 h-7 text-indigo-300" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-white tracking-tight flex items-center gap-1.5">
                <span>Jarvis AI Assistant</span>
                <Sparkles className="w-4 h-4 text-amber-400" />
              </h3>
              <span className="px-2 py-0.5 rounded-md bg-indigo-500/30 text-indigo-200 font-bold text-[10px] uppercase">
                AFL Senior Coach
              </span>
            </div>
            <p className="text-xs text-indigo-200/90 font-medium">
              Get instant training recommendations, dual foot skill plans, and match drill suggestions aligned to your squad.
            </p>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNavigate('jarvis');
          }}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-sm group-hover:translate-x-0.5"
        >
          <span>Talk to Jarvis AI</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Stats Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Available */}
        <div
          onClick={() => onNavigate('team')}
          className="bg-white p-5 rounded-2xl border border-[var(--line)] hover:border-[var(--green)]/60 cursor-pointer transition shadow-sm relative overflow-hidden group"
        >
          <div className="flex justify-between items-start">
            <h3 className="text-sm font-extrabold text-gray-500 uppercase tracking-wider group-hover:text-[var(--green)] transition">Available</h3>
            <div className="p-2 bg-green-50 text-green-600 rounded-xl group-hover:bg-green-100 transition">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="text-4xl font-black text-[var(--green)] mt-2">
            {availablePlayers.length}
          </div>
          <p className="text-xs text-[var(--muted)] font-semibold mt-1">Ready for selection</p>
        </div>

        {/* Unavailable */}
        <div
          onClick={() => onNavigate('team')}
          className="bg-white p-5 rounded-2xl border border-[var(--line)] hover:border-[var(--red)]/60 cursor-pointer transition shadow-sm relative overflow-hidden group"
        >
          <div className="flex justify-between items-start">
            <h3 className="text-sm font-extrabold text-gray-500 uppercase tracking-wider group-hover:text-[var(--red)] transition">Unavailable</h3>
            <div className="p-2 bg-red-50 text-red-500 rounded-xl group-hover:bg-red-100 transition">
              <UserX className="w-5 h-5" />
            </div>
          </div>
          <div className="text-4xl font-black text-[var(--red)] mt-2">
            {injuredPlayers.length + awayPlayers.length}
          </div>
          <p className="text-xs text-[var(--muted)] font-semibold mt-1">
            {injuredPlayers.length} injured • {awayPlayers.length} away
          </p>
        </div>

        {/* Total Squad */}
        <div
          onClick={() => onNavigate('team')}
          className="bg-white p-5 rounded-2xl border border-[var(--line)] hover:border-[var(--blue)]/60 cursor-pointer transition shadow-sm relative overflow-hidden group"
        >
          <div className="flex justify-between items-start">
            <h3 className="text-sm font-extrabold text-gray-500 uppercase tracking-wider group-hover:text-[var(--blue)] transition">Squad Size</h3>
            <div className="p-2 bg-blue-50 text-[var(--blue)] rounded-xl group-hover:bg-blue-100 transition">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-4xl font-black text-[var(--navy)] mt-2">
            {players.length}
          </div>
          <p className="text-xs text-[var(--muted)] font-semibold mt-1">Registered players</p>
        </div>
      </div>

      {/* Main Grid: Game Details & History */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Current Match */}
        <div
          onClick={() => onNavigate('lineup')}
          className="bg-white p-6 rounded-2xl border border-[var(--line)] hover:border-indigo-200 cursor-pointer transition shadow-sm space-y-4 group flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-100 transition">
                <Trophy className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-[var(--navy)] group-hover:text-indigo-950 transition">Current Match Details</h3>
            </div>
            <div className="bg-[#FAFBFF] p-4 rounded-xl border border-gray-100">
              {gameInfo.round || gameInfo.team ? (
                <div className="space-y-1">
                  <span className="text-[10px] font-black tracking-widest text-[var(--blue)] uppercase">
                    {gameInfo.round || 'Active Round'}
                  </span>
                  <p className="text-lg font-black text-[var(--ink)]">
                    vs {gameInfo.team || 'Opponent'}
                  </p>
                  <p className="text-xs text-[var(--muted)] font-semibold">
                    Date: {gameInfo.date}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-[var(--muted)] font-bold">No active game. Start one below!</p>
              )}
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNavigate('lineup');
            }}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition cursor-pointer mt-2"
          >
            Open Current Match
          </button>
        </div>

        {/* Player Growth & Progression */}
        <div
          onClick={() => onNavigate('growth')}
          className="bg-white p-6 rounded-2xl border border-[var(--line)] hover:border-emerald-200 cursor-pointer transition shadow-sm space-y-4 flex flex-col justify-between group"
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-100 transition">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-[var(--navy)] group-hover:text-emerald-950 transition">Player Growth & Skill Testing</h3>
            </div>
            <p className="text-sm text-emerald-900 font-extrabold">
              AFL Girls Year-on-Year Progression
            </p>
            <p className="text-xs text-[var(--muted)] font-semibold leading-relaxed">
              Record 2km time trials, aerobic fitness ratings, dominant kick distance, and non-preferred foot mastery.
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNavigate('growth');
            }}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition cursor-pointer mt-2"
          >
            View Player Growth & Assessments
          </button>
        </div>

        {/* Saved Game History */}
        <div
          onClick={() => onNavigate('history')}
          className="bg-white p-6 rounded-2xl border border-[var(--line)] hover:border-amber-200 cursor-pointer transition shadow-sm space-y-4 flex flex-col justify-between group"
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl group-hover:bg-amber-100 transition">
                <History className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-[var(--navy)] group-hover:text-amber-950 transition">Game History</h3>
            </div>
            <p className="text-sm text-[var(--ink)] font-bold">
              You have <span className="text-[var(--blue)] font-black">{historyCount}</span> matches saved.
            </p>
            <p className="text-xs text-[var(--muted)] font-semibold leading-relaxed">
              Historical performance, quarters scoreboards, applied rotations, and detailed player usage statistics.
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNavigate('history');
            }}
            className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-[var(--ink)] font-bold text-xs rounded-xl transition cursor-pointer mt-2"
          >
            Open Match History
          </button>
        </div>
      </div>

      {/* Sync Status Banner */}
      <div className="bg-white p-6 rounded-2xl border border-[var(--line)] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-base font-black text-[var(--navy)] flex items-center gap-2">
            <CloudLightning className={`w-5 h-5 ${cloudConnected ? 'text-[var(--green)]' : 'text-gray-400'}`} />
            <span>Cloud Sync Status</span>
          </h3>
          <p className="text-xs font-semibold text-[var(--muted)]">
            Last synced: <span className="font-bold text-[var(--ink)]">{formatSyncTime(lastSyncedAt)}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 text-[10px] font-black rounded-full uppercase ${
            cloudConnected ? 'bg-[#E6F6EE] text-[#0E7A48]' : 'bg-[#FFF4DB] text-[#8A5A00]'
          }`}>
            {cloudConnected ? 'Live Connection Active' : 'Offline Mode'}
          </span>
          <button
            onClick={() => onNavigate('settings')}
            className="p-2 bg-gray-50 border border-[var(--line)] hover:bg-gray-100 rounded-xl transition text-gray-500"
            title="Open settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
