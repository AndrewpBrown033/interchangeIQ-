import React, { useState } from 'react';
import { FileText, ExternalLink, ShieldAlert, Award, Users, BookOpen, Search, CheckCircle2, AlertTriangle, Layers, Clock, Flame, ChevronRight, HelpCircle, ArrowUpRight } from 'lucide-react';
import { TeamProfile } from '../types';
import { AGE_GROUPS, PLAYING_TEMPLATES } from '../constants';

interface JuniorRulesScreenProps {
  activeTeamProfile?: TeamProfile;
}

interface RuleSection {
  id: string;
  category: string;
  title: string;
  summary: string;
  details: string[];
  badge?: string;
  badgeColor?: string;
}

interface AgeGroupRulesData {
  title: string;
  ageSpan: string;
  fieldSize: string;
  teamSize: string;
  ballSize: string;
  quarterLength: string;
  competitiveStatus: string;
  sections: RuleSection[];
}

const RULES_DOCUMENT_URL = 'https://play.afl/sites/default/files/2024-06/JuniorRules_May24_Final.pdf';

const RULES_BY_AGE_CATEGORY: Record<string, AgeGroupRulesData> = {
  'U8-U10': {
    title: 'Under 8 – Under 10 (Junior Foundation)',
    ageSpan: 'Ages 7 to 10',
    fieldSize: 'Modified Pitch (80m x 50m - 3 Equal Zones)',
    teamSize: '9 to 12-a-side (3 Forwards, 3 Midfielders, 3 Defenders)',
    ballSize: 'Size 2 Leather / Synthetic AFL Ball',
    quarterLength: '4 x 10 Minute Quarters (No Time On)',
    competitiveStatus: 'Non-Competitive (No Ladders, No Finals, Equal Participation Focus)',
    sections: [
      {
        id: 'tackling-u810',
        category: 'Contact & Tackling',
        title: 'Strict No-Tackle Rule (Wrap & Hold Only)',
        summary: 'Protect young players while teaching proper position and disposal technique.',
        badge: 'No Tackling',
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        details: [
          'No slinging, bumping, pushing in the back, or grounded tackles.',
          'A player in possession can be tagged or wrapped loosely ("Hold") around the body with arms.',
          'Upon being held, the player has 3 seconds to legally dispose of the ball via a handpass or kick.',
          'No barging into packs or fending off with an open arm ("Don\'t Argue" is strictly illegal).'
        ]
      },
      {
        id: 'zones-u810',
        category: 'Field Zones & Wristbands',
        title: 'Color-Coded Wristband Zone System',
        summary: 'Ensures equal rotational experience across Forwards, Midfielders, and Defenders.',
        badge: 'Rotational Wristbands',
        badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
        details: [
          'Players are divided into 3 equal zone groups: Forward (Red), Midfield (Yellow), Defender (Blue).',
          'Players MUST wear matching colored wristbands corresponding to their assigned zone.',
          'Players MUST rotate zones every quarter so every player plays in every position group during the match.',
          'Forward and Defender wristband groups must remain within their designated zone line until ball leaves center circle.'
        ]
      },
      {
        id: 'bouncing-u810',
        category: 'Disposal & Possession',
        title: 'Max 1 Bounce & Kicking Distance',
        summary: 'Encourages team play, quick disposal, and vision.',
        badge: '1 Bounce Max',
        badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
        details: [
          'Maximum of ONE bounce per possession allowed before disposing.',
          'Mark awarded for any controlled catch from a kick that travels at least 10 meters.',
          'Opposing players must stand 5 meters back from the mark.',
          'No stealing the ball directly out of an opponent\'s hands.'
        ]
      },
      {
        id: 'equal-time-u810',
        category: 'Participation Policy',
        title: 'Guaranteed 75%+ Equal Playing Time',
        summary: 'Every registered child must play at least 3 out of 4 quarters.',
        badge: 'Mandatory Equal Time',
        badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
        details: [
          'Coaches MUST rotate bench players equally across quarters.',
          'No player should sit on the bench for two consecutive quarters.',
          'Focus is entirely on fun, social connection, and skill mastery over winning.'
        ]
      }
    ]
  },
  'U11-U12': {
    title: 'Under 11 – Under 12 (Junior Transition)',
    ageSpan: 'Ages 10 to 12',
    fieldSize: 'Reduced Pitch (110m x 75m - Half to 3/4 Full Oval)',
    teamSize: '12 to 15-a-side (4 FWD, 4 MID, 4 DEF)',
    ballSize: 'Size 3 Leather / Synthetic AFL Ball',
    quarterLength: '4 x 12 Minute Quarters',
    competitiveStatus: 'Transition Competition (Scores recorded, modified finals rules apply)',
    sections: [
      {
        id: 'tackling-u1112',
        category: 'Contact & Tackling',
        title: 'Modified Wrapping Tackle Allowed',
        summary: 'Introduces controlled body contact around the torso.',
        badge: 'Modified Tackle',
        badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300',
        details: [
          'Tackling is permitted ONLY between the shoulders and knees.',
          'NO slinging, throwing to the ground, or forceful hip-and-shoulder bumps.',
          'Player tackling must wrap arms and hold. If ball carrier is tackled, they must attempt immediate disposal.',
          'Dangerous tackles incur an immediate 25m penalty and yellow card warning.'
        ]
      },
      {
        id: 'bouncing-u1112',
        category: 'Disposal & Mark',
        title: 'Max 2 Bounces & 15m Mark Distance',
        summary: 'Brings play closer to full Australian Football rules.',
        badge: '2 Bounces Max',
        badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
        details: [
          'Maximum of TWO bounces allowed per possession run.',
          'Mark awarded for controlled catch from a kick traveling 15 meters or more.',
          '50m penalty reduced to a 25m penalty for junior pitch dimensions.',
          'Full distance out of out-of-bounds boundary throw-ins used.'
        ]
      },
      {
        id: 'rotation-u1112',
        category: 'Participation & Rotations',
        title: 'Position Diversity & Rotation Protocol',
        summary: 'Prevents early specialization in fixed positions.',
        badge: 'Multi-Position Focus',
        badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
        details: [
          'Players should spend time in at least 2 different position lines (e.g. FWD and MID) during each game.',
          'Equal playing time rule remains mandatory (minimum 75% match participation for every player).'
        ]
      }
    ]
  },
  'U13-U15': {
    title: 'Under 13 – Under 15 (Youth Competition)',
    ageSpan: 'Ages 12 to 15',
    fieldSize: 'Full Standard AFL Ground',
    teamSize: '15 to 16-a-side (5 FWD, 6 MID, 5 DEF)',
    ballSize: 'Size 4 Leather AFL Ball',
    quarterLength: '4 x 15 Minute Quarters',
    competitiveStatus: 'Full Youth Competition (Official Ladders, Premiership Finals & Awards)',
    sections: [
      {
        id: 'tackling-u1315',
        category: 'Contact & Rules',
        title: 'Full AFL Competition Tackling',
        summary: 'Standard laws of Australian Football apply with strict concussion safeguards.',
        badge: 'Full AFL Tackling',
        badgeColor: 'bg-red-100 text-red-800 border-red-300',
        details: [
          'Full legal tackling around torso and legs above knees.',
          'Strict zero-tolerance for dangerous tackles, tackles after disposal, or head-high contact.',
          'Head Contact Protocol: Any player suspected of concussion MUST be removed immediately for HIA assessment.'
        ]
      },
      {
        id: 'bouncing-u1315',
        category: 'Game Play',
        title: 'Standard AFL Bouncing & 50m Penalties',
        summary: 'Full regulation match conditions.',
        badge: 'Full Rules',
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        details: [
          'Unlimited bounces (subject to 15m distance run requirement between bounces).',
          'Standard 50m penalty for time wasting or abuse of umpire.',
          'Full team line-up numbers on pitch.'
        ]
      }
    ]
  },
  'U16-Seniors': {
    title: 'Under 16 – Seniors (Open Competition)',
    ageSpan: 'Ages 15+',
    fieldSize: 'Full Standard AFL Ground',
    teamSize: '18-a-side (6 FWD, 6 MID/RUCK, 6 DEF + 4 Bench Interchange)',
    ballSize: 'Size 5 Full Adult Leather AFL Ball',
    quarterLength: '4 x 20 Minute Quarters + Time On',
    competitiveStatus: 'Official Senior & Youth Competition',
    sections: [
      {
        id: 'full-afl-senior',
        category: 'Standard AFL Laws',
        title: 'AFL Laws of Australian Football',
        summary: 'Governed directly by the official AFL Laws of the Game.',
        badge: '18-a-side Standard',
        badgeColor: 'bg-slate-900 text-white border-slate-700',
        details: [
          '6-6-6 Starting position structure at every center bounce.',
          'Full interchange cap and rotation tracking rules.',
          'Yellow / Red card send-off system strictly enforced by accredited umpires.'
        ]
      }
    ]
  }
};

export default function JuniorRulesScreen({ activeTeamProfile }: JuniorRulesScreenProps) {
  // Select active age group tab (default to active team's age group or U11-U12)
  const defaultTab = activeTeamProfile?.ageGroup?.includes('8') || activeTeamProfile?.ageGroup?.includes('9') || activeTeamProfile?.ageGroup?.includes('10')
    ? 'U8-U10'
    : activeTeamProfile?.ageGroup?.includes('13') || activeTeamProfile?.ageGroup?.includes('14') || activeTeamProfile?.ageGroup?.includes('15')
    ? 'U13-U15'
    : activeTeamProfile?.ageGroup?.includes('16') || activeTeamProfile?.ageGroup?.includes('17') || activeTeamProfile?.ageGroup?.includes('18') || activeTeamProfile?.ageGroup?.includes('Senior')
    ? 'U16-Seniors'
    : 'U11-U12';

  const [activeCategory, setActiveCategory] = useState<string>(defaultTab);
  const [searchQuery, setSearchQuery] = useState('');

  const activeRules = RULES_BY_AGE_CATEGORY[activeCategory];

  // Filter sections by search query
  const filteredSections = activeRules.sections.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.title.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q) ||
      s.summary.toLowerCase().includes(q) ||
      s.details.some((d) => d.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Top Banner with Official PDF Link */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-white/10">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/20 border border-cyan-400/30 rounded-full text-cyan-300 text-xs font-black uppercase tracking-wider">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Official AFL Junior Policy & Rulebook</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              AFL Junior Match Rules & Age Group Guidelines
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed font-medium">
              Comprehensive rule summary for Australian Rules Junior & Youth football. Easily check age-group playing formats, contact rules, field sizes, and equal participation guidelines.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row gap-3 shrink-0">
            <a
              href={RULES_DOCUMENT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <span>Download Official Rules PDF</span>
              <ArrowUpRight className="w-4 h-4 stroke-[3]" />
            </a>
          </div>
        </div>

        {/* Team Profile Context Card */}
        {activeTeamProfile && (
          <div className="mt-6 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs font-semibold text-slate-300">
            <div className="flex items-center gap-3">
              {(activeTeamProfile.logoUrl || activeTeamProfile.iconUrl) && (
                <img src={activeTeamProfile.logoUrl || activeTeamProfile.iconUrl} alt="Team Logo" className="w-6 h-6 object-contain rounded bg-white/10 p-0.5" />
              )}
              <span>Active Team: <strong className="text-white font-black">{activeTeamProfile.name}</strong></span>
              <span className="px-2 py-0.5 bg-white/10 rounded-md text-amber-300 font-bold">
                {activeTeamProfile.ageGroup || 'Age Group Unset'}
              </span>
            </div>
            <div className="text-slate-400">
              Default Field Format: <span className="text-cyan-300 font-bold">{PLAYING_TEMPLATES[activeTeamProfile.defaultPlayingTemplateId || '18-a-side']?.name || '18-a-side'}</span>
            </div>
          </div>
        )}
      </div>

      {/* Age Group Selector Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-2 flex flex-wrap gap-1.5">
        {[
          { id: 'U8-U10', label: 'Under 8 – U10', desc: 'Modified / Non-Comp' },
          { id: 'U11-U12', label: 'Under 11 – U12', desc: 'Junior Transition' },
          { id: 'U13-U15', label: 'Under 13 – U15', desc: 'Youth Competition' },
          { id: 'U16-Seniors', label: 'Under 16 – Seniors', desc: 'Full AFL Rules' },
        ].map((tab) => {
          const isActive = activeCategory === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              className={`flex-1 min-w-[140px] px-4 py-3 rounded-xl text-left transition-all cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <div className="text-xs font-black uppercase tracking-wider">{tab.label}</div>
              <div className={`text-[10px] font-bold ${isActive ? 'text-amber-400' : 'text-slate-500'}`}>
                {tab.desc}
              </div>
            </button>
          );
        })}
      </div>

      {/* Overview Specs for Active Age Group */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-slate-50 rounded-2xl border border-indigo-100 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-600" />
            <span>{activeRules.title} Specifications</span>
          </h2>
          <span className="text-xs font-extrabold text-indigo-700 bg-indigo-100/80 px-3 py-1 rounded-full border border-indigo-200">
            {activeRules.competitiveStatus}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-1">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-blue-500" />
              <span>Team Size</span>
            </div>
            <div className="text-xs font-black text-slate-900">{activeRules.teamSize}</div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-1">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              <span>Field Layout</span>
            </div>
            <div className="text-xs font-black text-slate-900">{activeRules.fieldSize}</div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-1">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>Match Time</span>
            </div>
            <div className="text-xs font-black text-slate-900">{activeRules.quarterLength}</div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-1">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-red-500" />
              <span>Ball Spec</span>
            </div>
            <div className="text-xs font-black text-slate-900">{activeRules.ballSize}</div>
          </div>
        </div>
      </div>

      {/* Search Filter */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter rules (e.g. tackle, bounce, wristband, zones, equal time)..."
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-3 text-xs text-slate-400 hover:text-slate-600 font-extrabold"
          >
            Clear
          </button>
        )}
      </div>

      {/* Detailed Rule Cards */}
      <div className="space-y-4">
        {filteredSections.map((sec) => (
          <div
            key={sec.id}
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
                  {sec.category}
                </span>
                <h3 className="text-sm font-black text-slate-900">{sec.title}</h3>
              </div>
              {sec.badge && (
                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${sec.badgeColor || 'bg-slate-100 text-slate-800'}`}>
                  {sec.badge}
                </span>
              )}
            </div>

            <p className="text-xs font-medium text-slate-600 leading-relaxed">{sec.summary}</p>

            <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-100 space-y-2">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                Rule Directives & Enforcement
              </div>
              <ul className="space-y-1.5 text-xs text-slate-700 font-semibold">
                {sec.details.map((detail, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}

        {filteredSections.length === 0 && (
          <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 space-y-2">
            <HelpCircle className="w-8 h-8 text-slate-300 mx-auto" />
            <div className="text-sm font-bold text-slate-700">No matching rules found</div>
            <p className="text-xs">Try searching for broader terms like "kick", "handpass", "tackle", or "time".</p>
          </div>
        )}
      </div>

      {/* Footer Official Link Card */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <div className="text-xs font-black uppercase tracking-wider text-amber-400">
            AFL Play Football Official Guidelines
          </div>
          <p className="text-xs text-slate-300">
            For full League Constitution, AFL Safeguards for Children, and State League Bylaws, consult the official AFL Rules document.
          </p>
        </div>
        <a
          href={RULES_DOCUMENT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-white text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 hover:bg-amber-400 transition cursor-pointer shrink-0"
        >
          <span>Open Full PDF Document</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}
