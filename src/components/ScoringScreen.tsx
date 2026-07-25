import React from 'react';
import { Score, GameInfo } from '../types';
import { Minus, Plus, RefreshCw } from 'lucide-react';

interface ScoringScreenProps {
  score: Score;
  onUpdateScore: (score: Score) => void;
  gameInfo: GameInfo;
  onUpdateGameInfo: (info: GameInfo) => void;
}

export default function ScoringScreen({
  score,
  onUpdateScore,
  gameInfo,
  onUpdateGameInfo,
}: ScoringScreenProps) {
  const currentQIndex = score.quarter - 1;

  const handleScore = (side: 'home' | 'away', type: 'goal' | 'behind' | 'undoGoal' | 'undoBehind') => {
    const updated = { ...score };
    const detail = updated[side];

    if (type === 'goal') {
      detail.goals += 1;
      detail.quarters[currentQIndex].g += 1;
    } else if (type === 'behind') {
      detail.behinds += 1;
      detail.quarters[currentQIndex].b += 1;
    } else if (type === 'undoGoal' && detail.goals > 0) {
      detail.goals -= 1;
      if (detail.quarters[currentQIndex].g > 0) {
        detail.quarters[currentQIndex].g -= 1;
      }
    } else if (type === 'undoBehind' && detail.behinds > 0) {
      detail.behinds -= 1;
      if (detail.quarters[currentQIndex].b > 0) {
        detail.quarters[currentQIndex].b -= 1;
      }
    }

    onUpdateScore(updated);
  };

  const handleSetQuarter = (q: number) => {
    onUpdateScore({ ...score, quarter: q });
  };

  const totalPoints = (sDetail: any) => sDetail.goals * 6 + sDetail.behinds;

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-2xl border border-[var(--line)] shadow-sm space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-xl font-black text-[var(--navy)] tracking-tight">Match Scoring</h2>
            <p className="text-xs text-[var(--muted)] font-semibold mt-0.5">
              Direct scoreboard panel to increment goals and behinds
            </p>
          </div>
        </div>

        {/* Game Details Bar */}
        <div className="pt-3 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">
              Round / Match Title
            </label>
            <input
              type="text"
              value={gameInfo.round || ''}
              onChange={(e) => onUpdateGameInfo({ ...gameInfo, round: e.target.value })}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-xs font-bold text-gray-800 focus:outline-none focus:border-[var(--blue)]"
              placeholder="e.g. Round 1"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">
              Match Date
            </label>
            <input
              type="date"
              value={gameInfo.date || ''}
              onChange={(e) => onUpdateGameInfo({ ...gameInfo, date: e.target.value })}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold text-gray-800 focus:outline-none focus:border-[var(--blue)]"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">
              Match Time
            </label>
            <input
              type="time"
              value={gameInfo.time || ''}
              onChange={(e) => onUpdateGameInfo({ ...gameInfo, time: e.target.value })}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs font-bold text-gray-800 focus:outline-none focus:border-[var(--blue)]"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-3xl border border-[var(--line)] shadow-md">
        {/* Quarter Selectors */}
        <div className="col-span-1 md:col-span-2 flex items-center justify-between bg-gray-50 p-4 rounded-2xl border border-gray-100 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black tracking-widest text-[var(--muted)] uppercase">Active Quarter</span>
            <span className="px-2.5 py-1 bg-[var(--blue)] text-white font-black text-xs rounded-lg uppercase">
              Quarter {score.quarter}
            </span>
          </div>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4].map((q) => (
              <button
                key={q}
                onClick={() => handleSetQuarter(q)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
                  score.quarter === q
                    ? 'bg-[var(--blue)] text-white shadow-xs'
                    : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                Q{q}
              </button>
            ))}
          </div>
        </div>

        {/* Home Score Card */}
        <div className="p-6 rounded-2xl border border-gray-100 bg-[#FAFBFF] space-y-6 flex flex-col items-center justify-between min-h-[300px]">
          <div className="text-center space-y-1">
            <input
              type="text"
              value={gameInfo.team}
              onChange={(e) => onUpdateGameInfo({ ...gameInfo, team: e.target.value })}
              className="text-center text-sm font-black text-gray-400 tracking-wider uppercase bg-transparent border-b border-transparent hover:border-gray-300 focus:border-[var(--blue)] focus:outline-none focus:bg-white px-2 py-1"
              placeholder="OUR TEAM NAME"
            />
            <div className="text-5xl font-black text-[var(--blue)] font-mono">
              {totalPoints(score.home)}
            </div>
            <span className="text-sm font-bold text-gray-400 block mt-1">
              ({score.home.goals} Goals • {score.home.behinds} Behinds)
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full">
            {/* Goals controllers */}
            <div className="bg-white p-3 rounded-xl border border-gray-100 flex flex-col items-center space-y-2">
              <span className="text-[10px] font-black text-gray-400 uppercase">Goals</span>
              <div className="text-xl font-bold text-gray-900">{score.home.goals}</div>
              <div className="flex gap-1.5 w-full justify-center">
                <button
                  onClick={() => handleScore('home', 'undoGoal')}
                  className="p-1.5 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-lg"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleScore('home', 'goal')}
                  className="p-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Behinds controllers */}
            <div className="bg-white p-3 rounded-xl border border-gray-100 flex flex-col items-center space-y-2">
              <span className="text-[10px] font-black text-gray-400 uppercase">Behinds</span>
              <div className="text-xl font-bold text-gray-900">{score.home.behinds}</div>
              <div className="flex gap-1.5 w-full justify-center">
                <button
                  onClick={() => handleScore('home', 'undoBehind')}
                  className="p-1.5 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-lg"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleScore('home', 'behind')}
                  className="p-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Away Score Card */}
        <div className="p-6 rounded-2xl border border-gray-100 bg-[#FAFBFF] space-y-6 flex flex-col items-center justify-between min-h-[300px]">
          <div className="text-center space-y-1">
            <input
              type="text"
              value={gameInfo.opponent || ''}
              onChange={(e) => onUpdateGameInfo({ ...gameInfo, opponent: e.target.value })}
              className="text-center text-sm font-black text-red-500 tracking-wider uppercase bg-transparent border-b border-transparent hover:border-gray-300 focus:border-[var(--blue)] focus:outline-none focus:bg-white px-2 py-1"
              placeholder="OPPONENT NAME"
            />
            <div className="text-5xl font-black text-red-500 font-mono">
              {totalPoints(score.away)}
            </div>
            <span className="text-sm font-bold text-gray-400 block mt-1">
              ({score.away.goals} Goals • {score.away.behinds} Behinds)
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full">
            {/* Goals controllers */}
            <div className="bg-white p-3 rounded-xl border border-gray-100 flex flex-col items-center space-y-2">
              <span className="text-[10px] font-black text-gray-400 uppercase">Goals</span>
              <div className="text-xl font-bold text-gray-900">{score.away.goals}</div>
              <div className="flex gap-1.5 w-full justify-center">
                <button
                  onClick={() => handleScore('away', 'undoGoal')}
                  className="p-1.5 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-lg"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleScore('away', 'goal')}
                  className="p-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Behinds controllers */}
            <div className="bg-white p-3 rounded-xl border border-gray-100 flex flex-col items-center space-y-2">
              <span className="text-[10px] font-black text-gray-400 uppercase">Behinds</span>
              <div className="text-xl font-bold text-gray-900">{score.away.behinds}</div>
              <div className="flex gap-1.5 w-full justify-center">
                <button
                  onClick={() => handleScore('away', 'undoBehind')}
                  className="p-1.5 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-lg"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleScore('away', 'behind')}
                  className="p-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
