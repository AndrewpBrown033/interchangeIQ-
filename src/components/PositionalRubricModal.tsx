import React, { useState } from 'react';
import { X, Ruler } from 'lucide-react';
import { AFL_POSITIONAL_RUBRIC, PositionalRubricGroup } from '../utils/aflPositionalRubric';

const HEIGHT_BADGE_STYLE: Record<string, string> = {
  Tall: 'bg-blue-50 text-blue-700 border-blue-300',
  Medium: 'bg-amber-50 text-amber-800 border-amber-300',
  Small: 'bg-emerald-50 text-emerald-700 border-emerald-300',
};

interface Props {
  onClose: () => void;
  initialGroupId?: string;
}

export default function PositionalRubricModal({ onClose, initialGroupId }: Props) {
  const groups = Object.values(AFL_POSITIONAL_RUBRIC) as PositionalRubricGroup[];
  const [activeId, setActiveId] = useState<string>(initialGroupId || groups[0]?.id);
  const active = AFL_POSITIONAL_RUBRIC[activeId] || groups[0];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[2100] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-3xl border border-[var(--line)] shadow-2xl max-h-[92vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Ruler className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="text-base font-black text-[var(--navy)]">AFL Positional Rubric</h3>
              <p className="text-[11px] text-gray-500 font-semibold">
                Core skills, height convention & age-stage progression for every position group
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Group tabs */}
        <div className="flex gap-1.5 overflow-x-auto px-5 pt-4 pb-1 border-b border-gray-100">
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => setActiveId(g.id)}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-black border transition cursor-pointer ${
                activeId === g.id
                  ? 'bg-indigo-950 text-white border-indigo-950'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {g.iconEmoji} {g.code}
            </button>
          ))}
        </div>

        {/* Active group detail */}
        {active && (
          <div className="p-5 space-y-4 overflow-y-auto">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <h4 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <span>{active.iconEmoji}</span>
                  <span>{active.title}</span>
                </h4>
                <p className="text-[11px] text-gray-500 font-semibold mt-0.5">
                  Slots: {active.slots.join(', ')}
                </p>
              </div>
              <span className={`px-2.5 py-1 rounded-lg border text-xs font-black ${HEIGHT_BADGE_STYLE[active.heightPreference]}`}>
                📏 Prefers {active.heightPreference}
              </span>
            </div>

            <p className="text-xs text-gray-600 font-medium bg-slate-50 border border-slate-200 rounded-xl p-3 italic leading-relaxed">
              {active.heightNote}
            </p>

            <div>
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block mb-1.5">
                Core Skills
              </span>
              <div className="flex flex-wrap gap-1.5">
                {active.coreSkills.map((skill) => (
                  <span key={skill} className="text-[11px] font-bold text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3">
                <span className="text-[10px] font-black uppercase text-blue-900 block mb-1">Boys — Typical Notes</span>
                <p className="text-xs text-slate-700 font-medium">{active.genderNotes.boys}</p>
              </div>
              <div className="bg-rose-50/60 border border-rose-100 rounded-xl p-3">
                <span className="text-[10px] font-black uppercase text-rose-900 block mb-1">Girls — Typical Notes</span>
                <p className="text-xs text-slate-700 font-medium">{active.genderNotes.girls}</p>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider block mb-2">
                Age-Stage Progression
              </span>
              <div className="space-y-2">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <span className="text-[10px] font-black text-slate-500 uppercase">U10</span>
                  <p className="text-xs text-slate-700 font-medium mt-0.5">{active.progression.u10.join(' • ')}</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <span className="text-[10px] font-black text-slate-500 uppercase">U12</span>
                  <p className="text-xs text-slate-700 font-medium mt-0.5">{active.progression.u12.join(' • ')}</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1">
                  <span className="text-[10px] font-black text-slate-500 uppercase">U14</span>
                  <p className="text-xs text-slate-700 font-medium">
                    <strong className="text-slate-500">Both:</strong> {active.progression.u14.both}
                  </p>
                  <p className="text-xs text-slate-700 font-medium">
                    <strong className="text-blue-600">Boys:</strong> {active.progression.u14.boys}
                  </p>
                  <p className="text-xs text-slate-700 font-medium">
                    <strong className="text-rose-600">Girls:</strong> {active.progression.u14.girls}
                  </p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <span className="text-[10px] font-black text-slate-500 uppercase">U16</span>
                  <p className="text-xs text-slate-700 font-medium mt-0.5">{active.progression.u16.join(' • ')}</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <span className="text-[10px] font-black text-slate-500 uppercase">U18 / Seniors</span>
                  <p className="text-xs text-slate-700 font-medium mt-0.5">{active.progression.u18Seniors.join(' • ')}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
