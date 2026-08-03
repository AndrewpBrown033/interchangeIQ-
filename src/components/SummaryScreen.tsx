import React, { useState } from 'react';
import { Player, GameInfo, TeamProfile } from '../types';
import { ShieldCheck, UserX, Users, Trophy, History, Settings, CloudLightning, TrendingUp, RefreshCw, CheckCircle2, Landmark, Check, BookOpen, Bot } from 'lucide-react';

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
  onForceSync?: () => Promise<boolean>;
  teams?: TeamProfile[];
  activeTeamId?: string | null;
  onSelectTeam?: (teamId: string) => void;
  isTrainingEnabled?: boolean;
  isGrowthEnabled?: boolean;
  isJarvisEnabled?: boolean;
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
  onForceSync,
  teams = [],
  activeTeamId = null,
  onSelectTeam,
  isTrainingEnabled = true,
  isGrowthEnabled = true,
  isJarvisEnabled = true,
}: SummaryScreenProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
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

      {/* Squad / Team Select Toggle Tab Bar */}
      {teams && teams.length > 0 && onSelectTeam && (
        <div className="bg-white p-4.5 rounded-2xl border border-[var(--line)] shadow-sm space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-900 text-white rounded-lg shadow-2xs">
                <Landmark className="w-4 h-4" />
              </div>
              <span className="text-xs font-black tracking-wider uppercase text-[var(--navy)]">Select Active Squad</span>
            </div>
            <span className="text-[11px] font-bold text-[var(--muted)]">{teams.length} Squads Registered</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {teams.map((t) => {
              const isActive = t.id === activeTeamId;
              return (
                <button
                  key={`summary-team-tab-${t.id}`}
                  onClick={() => onSelectTeam(t.id)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer shrink-0 flex items-center gap-2 border ${
                    isActive
                      ? 'bg-blue-900 hover:bg-blue-950 text-white border-blue-950 shadow-sm scale-[1.01]'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {isActive && <Check className="w-3.5 h-3.5 stroke-[3] text-blue-300" />}
                  <span>{t.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

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

      {/* Main Grid: Game Details, Modules & History */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                    {gameInfo.team ? `${gameInfo.team}${gameInfo.opponent ? ` vs ${gameInfo.opponent}` : ''}` : (gameInfo.opponent ? `vs ${gameInfo.opponent}` : 'Match Setup')}
                  </p>
                  <p className="text-xs text-[var(--muted)] font-semibold">
                    Date: {gameInfo.date}{gameInfo.time ? ` @ ${gameInfo.time}` : ''}
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

        {/* Training Module */}
        {isTrainingEnabled && (
          <div
            onClick={() => onNavigate('training')}
            className="bg-white p-6 rounded-2xl border border-[var(--line)] hover:border-indigo-200 cursor-pointer transition shadow-sm space-y-4 flex flex-col justify-between group"
          >
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-100 transition">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h3 className="text-base font-black text-[var(--navy)] group-hover:text-indigo-950 transition">Training & Tactical Drills</h3>
              </div>
              <p className="text-sm text-indigo-950 font-extrabold">
                Drill Library & Session Builder
              </p>
              <p className="text-xs text-[var(--muted)] font-semibold leading-relaxed">
                Build tactical training plans, manage drill drills catalog, create practice sessions, and share field exercises.
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNavigate('training');
              }}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition cursor-pointer mt-2"
            >
              Open Training Module
            </button>
          </div>
        )}

        {/* Player Growth & Progression */}
        {isGrowthEnabled && (
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
        )}

        {/* JARVIS AI Assistant */}
        {isJarvisEnabled && (
          <div
            onClick={() => onNavigate('jarvis')}
            className="bg-white p-6 rounded-2xl border border-[var(--line)] hover:border-purple-200 cursor-pointer transition shadow-sm space-y-4 flex flex-col justify-between group"
          >
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-xl group-hover:bg-purple-100 transition">
                  <Bot className="w-5 h-5" />
                </div>
                <h3 className="text-base font-black text-[var(--navy)] group-hover:text-purple-950 transition">JARVIS AI Assistant</h3>
              </div>
              <p className="text-sm text-purple-950 font-extrabold">
                Tactical AI Recommendations
              </p>
              <p className="text-xs text-[var(--muted)] font-semibold leading-relaxed">
                AI-driven rotation strategies, player workload balance analysis, match recommendations, and session generation.
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNavigate('jarvis');
              }}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition cursor-pointer mt-2"
            >
              Launch JARVIS AI
            </button>
          </div>
        )}

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
          {syncNotice && (
            <p className="text-xs font-bold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{syncNotice}</span>
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`px-3 py-1 text-[10px] font-black rounded-full uppercase ${
            cloudConnected ? 'bg-[#E6F6EE] text-[#0E7A48]' : 'bg-[#FFF4DB] text-[#8A5A00]'
          }`}>
            {cloudConnected ? 'Live Connection Active' : 'Offline Mode'}
          </span>

          {onForceSync && (
            <button
              disabled={isSyncing}
              onClick={async () => {
                setIsSyncing(true);
                setSyncNotice(null);
                const success = await onForceSync();
                setIsSyncing(false);
                if (success) {
                  setSyncNotice("Synced squad & team data to Cloud!");
                  setTimeout(() => setSyncNotice(null), 4000);
                } else {
                  setSyncNotice("Sync failed. Check connection.");
                  setTimeout(() => setSyncNotice(null), 4000);
                }
              }}
              className="px-3.5 py-1.5 bg-[var(--navy)] hover:bg-[var(--navy)]/90 text-white font-extrabold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          )}

          <button
            onClick={() => onNavigate('settings')}
            className="p-2 bg-gray-50 border border-[var(--line)] hover:bg-gray-100 rounded-xl transition text-gray-500 cursor-pointer"
            title="Open settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
