import React, { useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { AFL_POSITIONAL_RUBRIC, PositionalRubricGroup } from '../utils/aflPositionalRubric';

const GROUP_ACCENT: Record<string, { chip: string; glow: string }> = {
  KPD: { chip: 'from-blue-600 to-indigo-700', glow: 'shadow-blue-900/30' },
  RDEF: { chip: 'from-cyan-600 to-blue-700', glow: 'shadow-cyan-900/30' },
  KFWD: { chip: 'from-rose-600 to-orange-600', glow: 'shadow-rose-900/30' },
  SFWD: { chip: 'from-amber-500 to-orange-600', glow: 'shadow-amber-900/30' },
  MID: { chip: 'from-fuchsia-600 to-purple-700', glow: 'shadow-fuchsia-900/30' },
  RUCK: { chip: 'from-emerald-600 to-teal-700', glow: 'shadow-emerald-900/30' },
};

const AGE_BANDS: { key: keyof PositionalRubricGroup['progression']; label: string }[] = [
  { key: 'u10', label: 'U10' },
  { key: 'u12', label: 'U12' },
  { key: 'u14', label: 'U14' },
  { key: 'u16', label: 'U16' },
  { key: 'u18Seniors', label: 'U18 / Seniors' },
];

interface Props {
  onClose: () => void;
  initialGroupId?: string;
}

export default function PositionalRubricModal({ onClose, initialGroupId }: Props) {
  const groups = Object.values(AFL_POSITIONAL_RUBRIC) as PositionalRubricGroup[];
  const [activeId, setActiveId] = useState<string>(initialGroupId || groups[0]?.id);
  const active = AFL_POSITIONAL_RUBRIC[activeId] || groups[0];
  const accent = GROUP_ACCENT[active.code] || GROUP_ACCENT.MID;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[2100] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-3xl border border-gray-200 shadow-2xl max-h-[92vh] overflow-hidden flex flex-col">
        {/* Blue heading */}
        <div className="bg-gradient-to-br from-[var(--navy)] via-[#102A43] to-indigo-900">
          <div className="flex items-center justify-between p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[var(--amber)] animate-pulse" />
              <div>
                <h3 className="text-sm font-black text-[var(--amber)] uppercase tracking-wider">AFL Positional Rubric</h3>
                <p className="text-[11px] text-indigo-300 font-semibold">
                  Core skills, height convention & Boys/Girls progression for every position group
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-white/10 text-indigo-300 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Group tabs */}
          <div className="flex gap-1.5 overflow-x-auto px-5 pb-4">
            {groups.map((g) => {
              const isActive = activeId === g.id;
              const a = GROUP_ACCENT[g.code] || GROUP_ACCENT.MID;
              return (
                <button
                  key={g.id}
                  onClick={() => setActiveId(g.id)}
                  className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-black border transition cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? `bg-gradient-to-br ${a.chip} text-white border-white/20 shadow-md ${a.glow}`
                      : 'bg-white/5 text-indigo-200 border-white/10 hover:bg-white/10'
                  }`}
                >
                  <span>{g.iconEmoji}</span>
                  <span>{g.code}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* White details — from Core Skills down */}
        {active && (
          <div className="p-5 space-y-4 overflow-y-auto bg-white">
            <div className={`bg-gradient-to-br ${accent.chip} rounded-2xl p-4 shadow-md ${accent.glow} flex items-start justify-between flex-wrap gap-3`}>
              <div>
                <h4 className="text-lg font-black text-white flex items-center gap-2">
                  <span>{active.iconEmoji}</span>
                  <span>{active.title}</span>
                </h4>
                <p className="text-[11px] text-white/80 font-bold mt-0.5">
                  Slots: {active.slots.join(', ')}
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-lg border text-xs font-black bg-black/20 text-white border-white/30">
                📏 Prefers {active.heightPreference}
              </span>
            </div>

            <p className="text-xs text-slate-600 font-medium bg-slate-50 border border-slate-200 rounded-xl p-3 italic leading-relaxed">
              {active.heightNote}
            </p>

            <div>
              <span className="text-[10px] font-black uppercase text-indigo-700 tracking-wider block mb-1.5">
                Core Skills
              </span>
              <div className="flex flex-wrap gap-1.5">
                {active.coreSkills.map((skill) => (
                  <span key={skill} className="text-[11px] font-bold text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <span className="text-[10px] font-black uppercase text-blue-700 block mb-1">🔵 Boys — General Notes</span>
                <p className="text-xs text-slate-700 font-medium">{active.genderNotes.boys}</p>
              </div>
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                <span className="text-[10px] font-black uppercase text-rose-700 block mb-1">🌸 Girls — General Notes</span>
                <p className="text-xs text-slate-700 font-medium">{active.genderNotes.girls}</p>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-black uppercase text-indigo-700 tracking-wider block mb-2">
                Age-Stage Progression — Boys & Girls
              </span>
              <div className="space-y-2.5">
                {AGE_BANDS.map(({ key, label }) => {
                  const band = active.progression[key];
                  return (
                    <div key={key} className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5">
                      <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">{label}</span>
                      <p className="text-xs text-slate-900 font-bold">{band.both}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                        <p className="text-[11px] text-blue-700 font-medium flex items-start gap-1">
                          <span className="shrink-0">🔵</span><span><strong className="text-blue-800">Boys:</strong> {band.boys}</span>
                        </p>
                        <p className="text-[11px] text-rose-700 font-medium flex items-start gap-1">
                          <span className="shrink-0">🌸</span><span><strong className="text-rose-800">Girls:</strong> {band.girls}</span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
