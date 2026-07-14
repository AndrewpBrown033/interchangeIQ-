import React, { useState } from 'react';
import { GameHistory } from '../types';
import { Calendar, Trash2, Award, ClipboardList, Eye, ArrowLeft, Trophy, Users } from 'lucide-react';

interface HistoryScreenProps {
  history: GameHistory[];
  onUpdateHistory: (history: GameHistory[]) => void;
}

export default function HistoryScreen({ history, onUpdateHistory }: HistoryScreenProps) {
  const [selectedGameId, setSelectedPlayerId] = useState<string | null>(null);

  const activeGame = history.find((g) => g.id === selectedGameId) || null;

  const handleDeleteGame = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this game permanently from historical logs?')) return;
    onUpdateHistory(history.filter((g) => g.id !== id));
    if (selectedGameId === id) {
      setSelectedPlayerId(null);
    }
  };

  const totalPoints = (sDetail: any) => sDetail.goals * 6 + sDetail.behinds;
  const gbStr = (sDetail: any) => `${sDetail.goals}.${sDetail.behinds}`;

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-4 rounded-2xl border border-[var(--line)] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[var(--navy)] tracking-tight">Game History</h2>
          <p className="text-xs text-[var(--muted)] font-semibold mt-1">
            Review detailed player usage, applied rotations and scoreboards from past games
          </p>
        </div>
        {selectedGameId && (
          <button
            onClick={() => setSelectedPlayerId(null)}
            className="px-3.5 py-2 text-xs font-bold bg-[#F0F1F5] text-gray-700 rounded-xl hover:bg-gray-200 transition flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Logs</span>
          </button>
        )}
      </div>

      {activeGame ? (
        /* Detailed Game Report View */
        <div className="space-y-6">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-[var(--line)] shadow-sm">
              <span className="text-[10px] font-black tracking-widest text-[var(--muted)] uppercase block mb-1">
                Final Result
              </span>
              <div className="text-2xl font-black text-[var(--blue)]">
                {gbStr(activeGame.score.home)} ({totalPoints(activeGame.score.home)})
              </div>
              <p className="text-xs text-gray-500 font-semibold mt-1">
                vs {activeGame.team} ({gbStr(activeGame.score.away)} - {totalPoints(activeGame.score.away)})
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[var(--line)] shadow-sm">
              <span className="text-[10px] font-black tracking-widest text-[var(--muted)] uppercase block mb-1">
                Players Engaged
              </span>
              <div className="text-2xl font-black text-[var(--navy)]">
                {activeGame.players.length} players
              </div>
              <p className="text-xs text-gray-500 font-semibold mt-1">Logged with game timers</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[var(--line)] shadow-sm">
              <span className="text-[10px] font-black tracking-widest text-[var(--muted)] uppercase block mb-1">
                Rotations Completed
              </span>
              <div className="text-2xl font-black text-[var(--green)]">
                {activeGame.rotations.length} swaps
              </div>
              <p className="text-xs text-gray-500 font-semibold mt-1">Quarter timing triggers</p>
            </div>
          </div>

          {/* Player stats logs */}
          <div className="bg-white p-5 rounded-2xl border border-[var(--line)] shadow-sm space-y-4">
            <h3 className="font-black text-sm text-[var(--navy)]">Player Engagement Stats</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-2 text-[10px] font-black text-gray-400 uppercase">Player</th>
                    <th className="py-2 text-[10px] font-black text-gray-400 uppercase">On Ground</th>
                    <th className="py-2 text-[10px] font-black text-gray-400 uppercase">Bench</th>
                    <th className="py-2 text-[10px] font-black text-gray-400 uppercase">% Played</th>
                    <th className="py-2 text-[10px] font-black text-gray-400 uppercase">Last Slot</th>
                  </tr>
                </thead>
                <tbody>
                  {activeGame.players.map((p) => {
                    const total = p.active + p.bench;
                    const pct = total > 0 ? Math.round((p.active / total) * 100) : 0;
                    return (
                      <tr key={p.id} className="border-b border-gray-100 text-xs">
                        <td className="py-2.5 font-bold text-gray-900">
                          #{p.number} {p.nick ? `${p.nick} (${p.name})` : p.name}
                        </td>
                        <td className="py-2.5 font-semibold text-gray-600">{formatSeconds(p.active)}</td>
                        <td className="py-2.5 font-semibold text-gray-600">{formatSeconds(p.bench)}</td>
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 rounded-full font-black ${
                            pct > 80 ? 'bg-red-50 text-red-700' : pct > 50 ? 'bg-blue-50 text-[var(--blue)]' : 'bg-green-50 text-[#0E7A48]'
                          }`}>
                            {pct}%
                          </span>
                        </td>
                        <td className="py-2.5 font-extrabold text-[var(--blue)] uppercase">{p.slot || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Rotations list */}
          <div className="bg-white p-5 rounded-2xl border border-[var(--line)] shadow-sm space-y-4">
            <h3 className="font-black text-sm text-[var(--navy)]">Applied Swaps</h3>
            <div className="space-y-2">
              {activeGame.rotations.map((r, i) => (
                <div key={i} className="p-3 border border-gray-100 rounded-xl bg-gray-50 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[var(--blue)] text-white text-[10px] font-black flex flex-col items-center justify-center shrink-0">
                    <span>Q{r.quarter}</span>
                    <span>{r.minute}m</span>
                  </div>
                  <div>
                    <b className="text-xs text-gray-900">{r.out} ➔ {r.inn}</b>
                    {r.note && <p className="text-[10px] text-gray-500 font-semibold mt-0.5">{r.note}</p>}
                  </div>
                </div>
              ))}
              {activeGame.rotations.length === 0 && (
                <p className="text-xs text-gray-400 font-semibold py-4 text-center">
                  No interchanges or on-field swaps recorded during this match.
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* History logs list view */
        <div className="space-y-4">
          {history.map((g) => (
            <div
              key={g.id}
              onClick={() => setSelectedPlayerId(g.id)}
              className="bg-white p-5 rounded-2xl border border-[var(--line)] shadow-sm hover:shadow-md transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <b className="text-base text-[var(--navy)] font-black">
                    {g.round} vs {g.team}
                  </b>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-[var(--muted)]">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{g.date}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    <span>{g.players.length} players</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Award className="w-3.5 h-3.5" />
                    <span>{g.rotations.length} swaps</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 self-end md:self-center">
                <div className="text-right">
                  <span className="text-lg font-black text-[var(--blue)] block">
                    {totalPoints(g.score.home)} - {totalPoints(g.score.away)}
                  </span>
                  <span className="text-[10px] text-gray-400 font-bold">
                    ({gbStr(g.score.home)} vs {gbStr(g.score.away)})
                  </span>
                </div>

                <div className="flex gap-1.5">
                  <button
                    onClick={() => setSelectedPlayerId(g.id)}
                    className="p-2 bg-gray-50 border border-gray-100 hover:bg-gray-100 rounded-xl transition text-gray-500"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteGame(g.id, e)}
                    className="p-2 bg-red-50 hover:bg-red-100 rounded-xl transition text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {history.length === 0 && (
            <div className="bg-white p-12 text-center rounded-2xl border border-[var(--line)] shadow-sm">
              <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base font-extrabold text-[var(--navy)]">No Game History Logged</h3>
              <p className="text-xs text-[var(--muted)] mt-1 max-w-xs mx-auto">
                Completed matches saved from the Game Day panel will be listed here with performance statistics.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
