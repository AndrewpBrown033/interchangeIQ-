import React, { useState, useEffect } from 'react';
import { TeamProfile, UserProfile, TacticalPrompt, Player, LineupTemplate, GameHistory } from '../types';
import { DEFAULT_PLAYERS } from '../constants';
import {
  Plus,
  Trash,
  Users,
  Landmark,
  UserPlus,
  Shield,
  Copy,
  Check,
  Mail,
  Calendar,
  Sparkles,
  X,
  ShieldAlert,
  UserCheck,
  Bot,
  Zap,
  Target,
  Search,
  Filter,
  Edit3,
  Play,
  RotateCcw,
  BookOpen,
  Clock,
  Layers,
  CheckCircle2,
  Trash2,
  Trophy,
  Activity,
  Award,
  FileText
} from 'lucide-react';

interface AdminScreenProps {
  teams: TeamProfile[];
  onUpdateTeams: (teams: TeamProfile[]) => void;
  users: UserProfile[];
  onUpdateUsers: (users: UserProfile[]) => void;
  activeTeamId: string | null;
  onSelectTeam: (teamId: string) => void;
  currentUserRole: string;
  onNavigateTab?: (tab: string) => void;
  players?: Player[];
  onUpdatePlayers?: (players: Player[]) => void;
  savedLineups?: LineupTemplate[];
  history?: GameHistory[];
  lineup?: Record<string, string>;
}

export const DEFAULT_TACTICAL_PROMPTS: TacticalPrompt[] = [
  {
    id: 'prompt-1',
    title: 'Corridor Ball Movement & Rebound',
    category: 'Ball Movement',
    focusArea: 'Switching Play & Corridor Width',
    targetUnit: 'Whole Squad',
    duration: '45 mins',
    promptText: 'Build a 45-minute AFL session targeting fast transition through the corridor. Focus on low-trajectory kicked passes, diagonal field switches, and rapid handball receives under high physical pressure.',
    isSystemDefault: true,
    createdBy: 'System Default',
    createdAt: 1700000000000,
  },
  {
    id: 'prompt-2',
    title: 'Player Skill Audit & Non-Preferred Foot',
    category: 'Player Analysis',
    focusArea: 'Dual Foot Mastery',
    targetUnit: 'Individual Players',
    duration: '30 mins',
    promptText: 'Analyze our squad skill assessment data. Identify players who need work on their opposite foot kicking accuracy and recommended drills to elevate their dual foot disposal.',
    isSystemDefault: true,
    createdBy: 'System Default',
    createdAt: 1700000000500,
  },
  {
    id: 'prompt-3',
    title: 'Positional Heatmap & Ground Time Analysis',
    category: 'Position Heatmap',
    focusArea: 'All-Round AFL Skills',
    targetUnit: 'Whole Squad',
    duration: '45 mins',
    promptText: 'Provide a breakdown of time recorded in positions across our team heatmap. Which players spend the most time in Midfield vs Forward vs Bench, and how can we optimize our rotation ratio?',
    isSystemDefault: true,
    createdBy: 'System Default',
    createdAt: 1700000000800,
  },
  {
    id: 'prompt-4',
    title: 'Defensive Zone Wall & Kick-In Trap',
    category: 'Defensive Structure',
    focusArea: 'Defensive Shepherding & Marking',
    targetUnit: 'Defenders & Rebounders',
    duration: '30 mins',
    promptText: 'Develop a tactical blueprint and 3-drill block to teach our back six how to setup the defensive zone wall against quick opposition kick-ins and force long, contested turnovers.',
    isSystemDefault: true,
    createdBy: 'System Default',
    createdAt: 1700000001000,
  },
  {
    id: 'prompt-5',
    title: 'Stoppage Clearances & First Possession',
    category: 'Stoppages & Ruck',
    focusArea: 'Contested Ball & Crumbing',
    targetUnit: 'Midfielders & Rucks',
    duration: '45 mins',
    promptText: 'Recommend a high-intensity stoppage clearance session for Midfielders and Rucks to maximize ground-ball gets, first possession extraction, and crumbing inside the contest.',
    isSystemDefault: true,
    createdBy: 'System Default',
    createdAt: 1700000002000,
  },
  {
    id: 'prompt-6',
    title: '2km Time Trial & Aerobic Fitness Ranking',
    category: 'Player Analysis',
    focusArea: 'AFL Girls Aerobic Fitness',
    targetUnit: 'Whole Squad',
    duration: '60 mins',
    promptText: 'Evaluate our squad 2km time trial times, yoyo levels, and overall fitness ratings. Suggest drill blocks that combine repeat speed endurance with skilled ball handling.',
    isSystemDefault: true,
    createdBy: 'System Default',
    createdAt: 1700000002500,
  },
  {
    id: 'prompt-7',
    title: 'AFL Girls Aerobic & Dual-Foot Mastery',
    category: 'Fitness & Conditioning',
    focusArea: 'Dual Foot Mastery',
    targetUnit: 'AFL Girls Squad',
    duration: '60 mins',
    promptText: 'Construct a high-repeat 60-minute session combining 2km time trial pace intervals with non-preferred foot kicking accuracy and 25m stab passes under fatigue.',
    isSystemDefault: true,
    createdBy: 'System Default',
    createdAt: 1700000003000,
  },
  {
    id: 'prompt-8',
    title: 'Match-Sim Intercept & Counter Attack',
    category: 'Match Strategy',
    focusArea: 'Defensive Shepherding & Marking',
    targetUnit: 'Whole Squad',
    duration: '45 mins',
    promptText: 'Structure a 45-minute match simulation sequence focusing on intercept marking, spoiled balls, and rapid counter-attack transitions from defense into forward 50 entry.',
    isSystemDefault: true,
    createdBy: 'System Default',
    createdAt: 1700000004000,
  },
  {
    id: 'prompt-9',
    title: 'Set Shot Goal Kicking Under Fatigue',
    category: 'Skill Benchmark',
    focusArea: 'Goal Kicking & Set Shots',
    targetUnit: 'Forwards & Key Targets',
    duration: '30 mins',
    promptText: 'Create a goal kicking routine and drill block designed to test set shot accuracy and routine composure when players are under heavy aerobic fatigue.',
    isSystemDefault: true,
    createdBy: 'System Default',
    createdAt: 1700000005000,
  },
];

export default function AdminScreen({
  teams,
  onUpdateTeams,
  users,
  onUpdateUsers,
  activeTeamId,
  onSelectTeam,
  currentUserRole,
  onNavigateTab,
  players = [],
  onUpdatePlayers,
  savedLineups = [],
  history = [],
  lineup = {},
}: AdminScreenProps) {
  const [adminSection, setAdminSection] = useState<'access' | 'prompts'>('access');

  // Squad summary metrics calculations
  const squadCount = players.length;
  const availableCount = players.filter((p) => p.status === 'available').length;
  const injuredCount = players.filter((p) => p.status === 'injured').length;
  const awayCount = players.filter((p) => p.status === 'away').length;

  const totalGames = history.length;
  const winsCount = history.filter((g) => {
    const hTotal = (g.score?.home?.goals || 0) * 6 + (g.score?.home?.behinds || 0);
    const aTotal = (g.score?.away?.goals || 0) * 6 + (g.score?.away?.behinds || 0);
    return hTotal > aTotal;
  }).length;
  const lossesCount = history.filter((g) => {
    const hTotal = (g.score?.home?.goals || 0) * 6 + (g.score?.home?.behinds || 0);
    const aTotal = (g.score?.away?.goals || 0) * 6 + (g.score?.away?.behinds || 0);
    return hTotal < aTotal;
  }).length;
  const drawsCount = Math.max(0, totalGames - winsCount - lossesCount);

  const activeOnFieldCount = Object.values(lineup).filter(Boolean).length;
  const activeOnBenchCount = players.filter(
    (p) => p.status === 'available' && !Object.values(lineup).includes(p.id)
  ).length;

  const lineupsCount = savedLineups.length;

  // Tactical Prompts State
  const [prompts, setPrompts] = useState<TacticalPrompt[]>(() => {
    try {
      const saved = localStorage.getItem('iiq_tactical_prompts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_e) {}
    return DEFAULT_TACTICAL_PROMPTS;
  });

  const [promptCategoryFilter, setPromptCategoryFilter] = useState<string>('All');
  const [promptSearch, setPromptSearch] = useState<string>('');
  const [showPromptModal, setShowPromptModal] = useState<boolean>(false);
  const [editingPrompt, setEditingPrompt] = useState<TacticalPrompt | null>(null);
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);

  // Form state
  const [formPromptTitle, setFormPromptTitle] = useState('');
  const [formPromptCategory, setFormPromptCategory] = useState<TacticalPrompt['category']>('Ball Movement');
  const [formPromptFocus, setFormPromptFocus] = useState('All-Round AFL Skills');
  const [formPromptTarget, setFormPromptTarget] = useState('Whole Squad');
  const [formPromptDuration, setFormPromptDuration] = useState('45 mins');
  const [formPromptText, setFormPromptText] = useState('');

  // Admin access state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'Coach' | 'Manager' | 'Admin'>('Coach');
  const [inviteSelectedTeams, setInviteSelectedTeams] = useState<string[]>(activeTeamId ? [activeTeamId] : []);
  const [activeUserSubTab, setActiveUserSubTab] = useState<'active' | 'pending'>('active');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Save prompts to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('iiq_tactical_prompts', JSON.stringify(prompts));
    } catch (_e) {}
  }, [prompts]);

  const handleOpenNewPromptModal = () => {
    setEditingPrompt(null);
    setFormPromptTitle('');
    setFormPromptCategory('Ball Movement');
    setFormPromptFocus('All-Round AFL Skills');
    setFormPromptTarget('Whole Squad');
    setFormPromptDuration('45 mins');
    setFormPromptText('');
    setShowPromptModal(true);
  };

  const handleOpenEditPromptModal = (p: TacticalPrompt) => {
    setEditingPrompt(p);
    setFormPromptTitle(p.title);
    setFormPromptCategory(p.category);
    setFormPromptFocus(p.focusArea || 'All-Round AFL Skills');
    setFormPromptTarget(p.targetUnit || 'Whole Squad');
    setFormPromptDuration(p.duration || '45 mins');
    setFormPromptText(p.promptText);
    setShowPromptModal(true);
  };

  const handleSavePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPromptTitle.trim()) {
      alert('Please enter a prompt title.');
      return;
    }
    if (!formPromptText.trim()) {
      alert('Please enter prompt instructions.');
      return;
    }

    if (editingPrompt) {
      const updated = prompts.map((p) =>
        p.id === editingPrompt.id
          ? {
              ...p,
              title: formPromptTitle.trim(),
              category: formPromptCategory,
              focusArea: formPromptFocus,
              targetUnit: formPromptTarget,
              duration: formPromptDuration,
              promptText: formPromptText.trim(),
            }
          : p
      );
      setPrompts(updated);
    } else {
      const newPrompt: TacticalPrompt = {
        id: `prompt-custom-${Date.now()}`,
        title: formPromptTitle.trim(),
        category: formPromptCategory,
        focusArea: formPromptFocus,
        targetUnit: formPromptTarget,
        duration: formPromptDuration,
        promptText: formPromptText.trim(),
        isSystemDefault: false,
        createdBy: 'Coach Admin',
        createdAt: Date.now(),
      };
      setPrompts([newPrompt, ...prompts]);
    }

    setShowPromptModal(false);
  };

  const handleDeletePrompt = (id: string) => {
    if (!window.confirm('Delete this tactical prompt template?')) return;
    setPrompts(prompts.filter((p) => p.id !== id));
  };

  const handleResetDefaultPrompts = () => {
    if (window.confirm('Reset prompt library to default AFL tactical prompts? Custom prompts will be cleared.')) {
      setPrompts(DEFAULT_TACTICAL_PROMPTS);
    }
  };

  const handleRunPromptInJarvis = (p: TacticalPrompt) => {
    localStorage.setItem('iiq_pending_jarvis_prompt', p.promptText);
    if (onNavigateTab) {
      onNavigateTab('jarvis');
    }
  };

  const handleCopyPromptText = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopiedPromptId(id);
        setTimeout(() => setCopiedPromptId(null), 2000);
      })
      .catch((err) => console.error('Copy failed:', err));
  };

  const getCategoryBadgeStyle = (cat: TacticalPrompt['category']) => {
    switch (cat) {
      case 'Ball Movement':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Defensive Structure':
        return 'bg-slate-100 text-slate-800 border-slate-300';
      case 'Stoppages & Ruck':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Skill Benchmark':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Match Strategy':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Fitness & Conditioning':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const filteredPrompts = prompts.filter((p) => {
    const matchesCat = promptCategoryFilter === 'All' || p.category === promptCategoryFilter;
    const matchesQuery =
      !promptSearch.trim() ||
      p.title.toLowerCase().includes(promptSearch.toLowerCase()) ||
      p.promptText.toLowerCase().includes(promptSearch.toLowerCase()) ||
      (p.focusArea && p.focusArea.toLowerCase().includes(promptSearch.toLowerCase()));
    return matchesCat && matchesQuery;
  });


  const handleCreateTeam = () => {
    const name = prompt('New team name?');
    if (!name || !name.trim()) return;
    const newTeam: TeamProfile = {
      id: `team-${Date.now()}`,
      name: name.trim(),
      createdAt: Date.now(),
    };
    onUpdateTeams([...teams, newTeam]);
    if (!activeTeamId) {
      onSelectTeam(newTeam.id);
    }
  };

  const handleRenameTeam = (teamId: string) => {
    const team = teams.find((t) => t.id === teamId);
    if (!team) return;
    const name = prompt('Rename team:', team.name);
    if (!name || !name.trim()) return;
    onUpdateTeams(teams.map((t) => (t.id === teamId ? { ...t, name: name.trim() } : t)));
  };

  const handleDeleteTeam = (teamId: string) => {
    if (!window.confirm('Delete this team? All its lineup, roster and matches will be deleted.')) return;
    onUpdateTeams(teams.filter((t) => t.id !== teamId));
  };

  const handleOpenInviteModal = () => {
    setInviteEmail('');
    setInviteName('');
    setInviteRole('Coach');
    setInviteSelectedTeams(activeTeamId ? [activeTeamId] : []);
    setShowInviteModal(true);
  };

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      alert('Please enter an email address.');
      return;
    }
    if (!inviteName.trim()) {
      alert('Please enter a name.');
      return;
    }

    // Generate unique invitation code
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();

    const newUser: UserProfile = {
      uid: `invite-${code}`,
      email: inviteEmail.trim().toLowerCase(),
      name: inviteName.trim(),
      role: inviteRole,
      teamIds: inviteSelectedTeams,
      status: 'Pending',
      invitedBy: 'Administrator',
      invitedAt: Date.now(),
      inviteCode: code,
    };

    onUpdateUsers([...users, newUser]);
    setShowInviteModal(false);
    setActiveUserSubTab('pending');
  };

  const handleToggleTeamSelection = (teamId: string) => {
    setInviteSelectedTeams((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]
    );
  };

  const handleSelectAllTeams = () => {
    setInviteSelectedTeams(teams.map((t) => t.id));
  };

  const handleClearTeams = () => {
    setInviteSelectedTeams([]);
  };

  const handleCopyLink = (code: string) => {
    const link = `${window.location.origin}/?invite=${code}`;
    navigator.clipboard.writeText(link)
      .then(() => {
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
      })
      .catch((err) => {
        console.error('Failed to copy text: ', err);
      });
  };

  const handleDeleteUser = (uid: string) => {
    if (!window.confirm('Remove this user or invitation from the system?')) return;
    onUpdateUsers(users.filter((u) => u.uid !== uid));
  };

  const handleAssignTeamToUser = (uid: string, teamId: string) => {
    const updated = users.map((u) => {
      if (u.uid === uid) {
        const ids = u.teamIds.includes(teamId)
          ? u.teamIds.filter((id) => id !== teamId)
          : [...u.teamIds, teamId];
        return { ...u, teamIds: ids };
      }
      return u;
    });
    onUpdateUsers(updated);
  };

  const activeCoaches = users.filter((u) => u.status !== 'Pending' && u.email !== 'anonymous@interchangeiq.com');
  const pendingInvites = users.filter((u) => u.status === 'Pending');

  return (
    <div className="space-y-6">
      {/* Top Header & Sub-navigation Header Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[var(--line)] shadow-xs">
        <div>
          <h2 className="text-xl font-black text-[var(--navy)] tracking-tight">Admin Dashboard</h2>
          <p className="text-xs text-[var(--muted)] font-semibold mt-1">
            Configure squads, coach credentials, and custom Jarvis tactical prompts
          </p>
        </div>
        
        {/* Navigation Switcher */}
        <div className="flex bg-gray-100 p-1 rounded-2xl border border-gray-200/80">
          <button
            onClick={() => setAdminSection('access')}
            className={`py-2 px-4 rounded-xl font-black text-xs transition flex items-center gap-2 cursor-pointer ${
              adminSection === 'access'
                ? 'bg-white text-[var(--navy)] shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Shield className="w-4 h-4 text-blue-500" />
            <span>Squad Access & Licenses</span>
          </button>
          <button
            onClick={() => setAdminSection('prompts')}
            className={`py-2 px-4 rounded-xl font-black text-xs transition flex items-center gap-2 cursor-pointer ${
              adminSection === 'prompts'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Bot className="w-4 h-4 text-indigo-300" />
            <span>Jarvis Tactical Prompts</span>
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
              adminSection === 'prompts' ? 'bg-indigo-500 text-white' : 'bg-indigo-100 text-indigo-700'
            }`}>
              {prompts.length}
            </span>
          </button>
        </div>
      </div>

      {/* SECTION 1: Squad Access & Licenses */}
      {adminSection === 'access' && (
        <>
          <div className="flex justify-end gap-2">
            <button
              onClick={handleCreateTeam}
              className="px-3.5 py-2 text-xs font-bold bg-[var(--green)] text-white rounded-xl hover:opacity-95 transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Team</span>
            </button>
            <button
              onClick={handleOpenInviteModal}
              className="px-3.5 py-2 text-xs font-bold bg-[var(--blue)] text-white rounded-xl hover:opacity-95 transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Invite User</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Teams Management */}
            <div className="bg-white p-5 rounded-2xl border border-[var(--line)] shadow-xs space-y-4">
              <h3 className="font-black text-sm text-[var(--navy)] flex items-center gap-2">
                <Landmark className="w-4 h-4 text-[var(--blue)]" />
                <span>Teams & Clubs ({teams.length})</span>
              </h3>
              <p className="text-xs text-[var(--muted)] font-semibold leading-relaxed">
                Manage your registered sports clubs. Active coaches can be assigned directly to individual team datasets.
              </p>

              {/* Squad Summary Counts Box */}
              <div className="bg-[#f8fafc] border border-slate-200 p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-600" />
                    <span className="font-extrabold text-xs text-[var(--navy)] uppercase tracking-wider">
                      Squad Summary & Metrics
                    </span>
                  </div>
                  <span className="text-[10px] font-extrabold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                    Live Counts
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {/* Squad Count */}
                  <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                      <span>Squad Count</span>
                      <Users className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <div className="text-xl font-black text-[var(--navy)]">
                      {squadCount} <span className="text-xs font-semibold text-slate-500">Players</span>
                    </div>
                    <div className="flex flex-wrap gap-1 text-[9px] font-extrabold">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {availableCount} Avail
                      </span>
                      {injuredCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
                          {injuredCount} Injured
                        </span>
                      )}
                      {awayCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                          {awayCount} Away
                        </span>
                      )}
                    </div>
                    {onUpdatePlayers && (
                      <button
                        onClick={() => {
                          if (squadCount > 0 && !window.confirm("Reload default 22-player AFL squad? This will replace current team roster.")) return;
                          onUpdatePlayers(DEFAULT_PLAYERS);
                        }}
                        className="text-[9px] font-bold text-blue-600 hover:underline flex items-center gap-1 pt-0.5 cursor-pointer"
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
                        <span>{squadCount === 0 ? 'Load Default 22 Squad' : 'Reset Default Squad'}</span>
                      </button>
                    )}
                  </div>

                  {/* Games */}
                  <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                      <span>Games Played</span>
                      <Trophy className="w-3.5 h-3.5 text-amber-500" />
                    </div>
                    <div className="text-xl font-black text-[var(--navy)]">
                      {totalGames} <span className="text-xs font-semibold text-slate-500">Matches</span>
                    </div>
                    <div className="flex flex-wrap gap-1 text-[9px] font-extrabold">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {winsCount} Wins
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
                        {lossesCount} Losses
                      </span>
                      {drawsCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {drawsCount} Draws
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Players Field / Bench Status */}
                  <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                      <span>Field vs Bench</span>
                      <Shield className="w-3.5 h-3.5 text-indigo-600" />
                    </div>
                    <div className="text-xl font-black text-[var(--navy)]">
                      {activeOnFieldCount} <span className="text-xs font-semibold text-slate-500">Field</span> / {activeOnBenchCount} <span className="text-xs font-semibold text-slate-500">Bench</span>
                    </div>
                    <div className="text-[9px] font-extrabold text-slate-600">
                      Starter slots: <span className="text-indigo-600">{activeOnFieldCount}/18</span> set
                    </div>
                  </div>

                  {/* Lineups */}
                  <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                      <span>Lineups Saved</span>
                      <Layers className="w-3.5 h-3.5 text-cyan-600" />
                    </div>
                    <div className="text-xl font-black text-[var(--navy)]">
                      {lineupsCount} <span className="text-xs font-semibold text-slate-500">Presets</span>
                    </div>
                    <button
                      onClick={() => onNavigateTab?.('team')}
                      className="text-[9px] font-bold text-cyan-700 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Manage Lineups →</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                {teams.map((t, index) => {
                  const isActive = activeTeamId === t.id;
                  return (
                    <div
                      key={`team-profile-${t.id || 'new'}-${index}`}
                      className={`p-4 border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${
                        isActive ? 'border-[var(--green)] bg-green-50/50' : 'border-gray-100 bg-white hover:bg-gray-50'
                      }`}
                    >
                      <div className="space-y-1">
                        <b className="text-sm font-extrabold text-[var(--ink)] block">{t.name}</b>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500">
                          <span>ID: {t.id}</span>
                          {isActive && <span className="text-emerald-600 font-extrabold">• Active Selection</span>}
                        </div>
                        {isActive && (
                          <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px] font-bold text-slate-600">
                            <span className="px-2 py-0.5 rounded bg-white border border-slate-200">
                              Squad: <strong className="text-slate-900">{squadCount}</strong>
                            </span>
                            <span className="px-2 py-0.5 rounded bg-white border border-slate-200">
                              Games: <strong className="text-slate-900">{totalGames}</strong>
                            </span>
                            <span className="px-2 py-0.5 rounded bg-white border border-slate-200">
                              Lineups: <strong className="text-slate-900">{lineupsCount}</strong>
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => {
                            onSelectTeam(t.id);
                            onNavigateTab?.('team');
                          }}
                          className={`px-3.5 py-1.5 text-[11px] font-extrabold rounded-lg border transition cursor-pointer flex items-center gap-1 ${
                            isActive
                              ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs hover:bg-emerald-700'
                              : 'bg-blue-600 text-white border-blue-700 hover:bg-blue-700 shadow-2xs'
                          }`}
                          title="Select team and open Squad Summary & Metrics tab"
                        >
                          <span>{isActive ? 'View Team View →' : 'Open →'}</span>
                        </button>
                        <button
                          onClick={() => handleRenameTeam(t.id)}
                          className="px-2.5 py-1.5 text-xs font-bold bg-[#F0F1F5] text-gray-700 rounded-lg cursor-pointer hover:bg-gray-200"
                        >
                          Rename
                        </button>
                        <button
                          onClick={() => handleDeleteTeam(t.id)}
                          className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg cursor-pointer"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Users & Invites Management */}
            <div className="bg-white p-5 rounded-2xl border border-[var(--line)] shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                <h3 className="font-black text-sm text-[var(--navy)] flex items-center gap-2">
                  <Users className="w-4 h-4 text-[var(--blue)]" />
                  <span>Coaches & Roles</span>
                </h3>
                
                {/* Inner Sub-tab Switcher */}
                <div className="flex bg-gray-100 p-1 rounded-xl">
                  <button
                    onClick={() => setActiveUserSubTab('active')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      activeUserSubTab === 'active'
                        ? 'bg-white text-[var(--navy)] shadow-xs'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Active ({activeCoaches.length})
                  </button>
                  <button
                    onClick={() => setActiveUserSubTab('pending')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeUserSubTab === 'pending'
                        ? 'bg-white text-[var(--navy)] shadow-xs'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Invited ({pendingInvites.length})
                    {pendingInvites.length > 0 && (
                      <span className="w-2 h-2 rounded-full bg-[var(--blue)] animate-pulse" />
                    )}
                  </button>
                </div>
              </div>

              <p className="text-xs text-[var(--muted)] font-semibold leading-relaxed">
                {activeUserSubTab === 'active'
                  ? 'Currently authorized users on this platform. Admins have system-wide setup permissions while Coaches manage assigned rosters.'
                  : 'Sent invitation profiles. Instruct the recipient to load their custom acceptance URL to immediately claim their credentials.'}
              </p>

              {/* Active Members Sub-view */}
              {activeUserSubTab === 'active' && (
                <div className="space-y-3">
                  {activeCoaches.map((u, idx) => (
                    <div
                      key={`active-coach-${u.uid || 'coach'}-${idx}`}
                      className="p-4 border border-gray-100 bg-white rounded-xl space-y-3 shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <b className="text-sm font-extrabold text-[var(--ink)] block flex items-center gap-1.5">
                            {u.name}
                            {u.role === 'Admin' && <Shield className="w-3.5 h-3.5 text-red-500" />}
                          </b>
                          <span className="text-xs text-[var(--muted)] font-semibold">{u.email}</span>
                        </div>
                        <span className={`px-2.5 py-0.5 text-[10px] font-black rounded-full uppercase ${
                          u.role === 'Admin' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-[var(--blue)]'
                        }`}>
                          {u.role}
                        </span>
                      </div>

                      {/* Team assignments */}
                      {u.role !== 'Admin' && (
                        <div className="pt-2 border-t border-dashed border-gray-100">
                          <span className="text-[10px] font-black uppercase text-gray-400 block mb-1.5">
                            Assign Team Access
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {teams.map((t, tIdx) => {
                              const isAssigned = u.teamIds.includes(t.id);
                              return (
                                <button
                                  key={`assign-team-${u.uid || 'user'}-${t.id || 'team'}-${tIdx}`}
                                  onClick={() => handleAssignTeamToUser(u.uid, t.id)}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold border transition cursor-pointer ${
                                    isAssigned
                                      ? 'bg-green-50 text-[#0E7A48] border-green-200'
                                      : 'bg-gray-50 text-gray-400 border-gray-200 hover:text-gray-600'
                                  }`}
                                >
                                  {t.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end pt-2">
                        <button
                          onClick={() => handleDeleteUser(u.uid)}
                          className="px-2.5 py-1 text-[11px] font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg cursor-pointer"
                        >
                          Remove Access
                        </button>
                      </div>
                    </div>
                  ))}

                  {activeCoaches.length === 0 && (
                    <div className="text-center py-8 border border-dashed border-gray-100 rounded-xl">
                      <UserCheck className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-gray-400">No active coaches configured.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Pending Invitations Sub-view */}
              {activeUserSubTab === 'pending' && (
                <div className="space-y-3">
                  {pendingInvites.map((u, idx) => {
                    const inviteCodeStr = u.inviteCode || '';
                    const isCopied = copiedCode === inviteCodeStr;
                    return (
                      <div
                        key={`pending-invite-${u.uid || 'invite'}-${idx}`}
                        className="p-4 border border-blue-100/60 bg-blue-50/15 rounded-xl space-y-3 shadow-xs relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl pointer-events-none" />
                        
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <b className="text-sm font-extrabold text-[var(--ink)] block">{u.name}</b>
                              <span className="px-1.5 py-0.5 text-[8px] font-black bg-orange-100 text-orange-600 rounded uppercase">
                                Pending Invite
                              </span>
                            </div>
                            <span className="text-xs text-[var(--muted)] font-semibold block mt-0.5">{u.email}</span>
                          </div>
                          
                          <div className="flex flex-col items-end gap-1">
                            <span className="px-2 py-0.5 bg-blue-50 text-[var(--blue)] text-[9px] font-black rounded uppercase">
                              {u.role}
                            </span>
                            {u.invitedAt && (
                              <span className="text-[9px] text-gray-400 font-bold flex items-center gap-0.5">
                                <Calendar className="w-2.5 h-2.5" />
                                {new Date(u.invitedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Assigned Teams */}
                        <div className="pt-2 border-t border-dashed border-gray-100 space-y-1">
                          <span className="text-[9px] font-black uppercase text-gray-400 block">
                            Assigned Access
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {u.teamIds.length > 0 ? (
                              u.teamIds.map((tid, tIdx) => {
                                const teamName = teams.find((t) => t.id === tid)?.name || tid;
                                return (
                                  <span
                                    key={`pending-team-badge-${u.uid || 'invite'}-${tid || 'team'}-${tIdx}`}
                                    className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[9px] font-bold"
                                  >
                                    {teamName}
                                  </span>
                                );
                              })
                            ) : (
                              <span className="text-[9px] text-gray-400 font-bold">No specific team access assigned</span>
                            )}
                          </div>
                        </div>

                        {/* Quick copy invite actions */}
                        <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                          <div className="bg-white px-2.5 py-1.5 border border-gray-200 rounded-lg flex items-center justify-between gap-2 text-[10px] font-mono font-bold text-gray-500 overflow-hidden">
                            <span className="truncate">Code: <b className="text-[var(--navy)]">{inviteCodeStr}</b></span>
                          </div>
                          
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleCopyLink(inviteCodeStr)}
                              className={`px-3 py-1.5 text-xs font-bold rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer ${
                                isCopied
                                  ? 'bg-green-600 text-white border-green-700'
                                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{isCopied ? 'Copied' : 'Copy Invite Link'}</span>
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u.uid)}
                              className="px-2.5 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg cursor-pointer"
                              title="Revoke Invitation"
                            >
                              Revoke
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {pendingInvites.length === 0 && (
                    <div className="text-center py-10 border border-dashed border-gray-200 rounded-xl space-y-2 bg-gray-50/50">
                      <Mail className="w-8 h-8 text-gray-300 mx-auto" />
                      <div>
                        <p className="text-xs font-black text-gray-400">No pending invitations</p>
                        <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                          Invite managers and assistants using the "Invite User" button.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* SECTION 2: Jarvis Tactical Prompts Builder */}
      {adminSection === 'prompts' && (
        <div className="space-y-6">
          {/* Top Prompts Header Banner */}
          <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white p-6 rounded-3xl border border-indigo-800/40 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="flex items-start gap-4 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-blue-400 p-0.5 shadow-lg shrink-0">
                <div className="w-full h-full bg-indigo-950 rounded-[14px] flex items-center justify-center text-indigo-300">
                  <Bot className="w-6 h-6 text-indigo-300" />
                </div>
              </div>
              <div>
                <h3 className="text-lg md:text-xl font-black text-white tracking-tight flex items-center gap-2">
                  <span>Jarvis Tactical Prompts Builder</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {prompts.length} Prompts Total
                  </span>
                </h3>
                <p className="text-xs text-indigo-200/80 font-medium mt-1 leading-relaxed max-w-2xl">
                  Build, customize, and test structured tactical AI prompts for match preparations, unit drill blocks, and skill benchmarks. Custom prompts created here automatically synchronize with Jarvis!
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 relative z-10 shrink-0">
              <button
                onClick={handleResetDefaultPrompts}
                className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer border border-white/10"
                title="Reset to default AFL tactical prompts"
              >
                <RotateCcw className="w-3.5 h-3.5 text-indigo-300" />
                <span>Reset Defaults</span>
              </button>
              <button
                onClick={handleOpenNewPromptModal}
                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-black rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-lg active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>New Tactical Prompt</span>
              </button>
            </div>
          </div>

          {/* Search & Category Filter Controls */}
          <div className="bg-white p-4 rounded-2xl border border-[var(--line)] shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={promptSearch}
                onChange={(e) => setPromptSearch(e.target.value)}
                placeholder="Search tactical prompts by title, instructions or focus..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-[var(--ink)] focus:outline-none focus:border-indigo-500 focus:bg-white transition"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              <span className="text-[10px] font-black uppercase text-gray-400 mr-1 flex items-center gap-1 shrink-0">
                <Filter className="w-3 h-3" /> Filter:
              </span>
              {[
                'All',
                'Ball Movement',
                'Defensive Structure',
                'Stoppages & Ruck',
                'Skill Benchmark',
                'Match Strategy',
                'Fitness & Conditioning',
              ].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setPromptCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                    promptCategoryFilter === cat
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Prompts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredPrompts.map((p) => {
              const badgeStyle = getCategoryBadgeStyle(p.category);
              const isCopied = copiedPromptId === p.id;

              return (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl border border-[var(--line)] hover:border-indigo-200 shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between gap-4 relative group"
                >
                  <div className="space-y-3">
                    {/* Header Badges */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border ${badgeStyle}`}>
                        {p.category}
                      </span>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
                        {p.isSystemDefault ? (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md font-extrabold uppercase text-[9px]">
                            AFL Default
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md font-extrabold uppercase text-[9px]">
                            ⚡ Admin Custom
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Prompt Title */}
                    <div>
                      <h4 className="text-sm font-black text-[var(--navy)] tracking-tight group-hover:text-indigo-600 transition">
                        {p.title}
                      </h4>
                      <div className="flex items-center gap-2 text-[10px] text-gray-500 font-bold mt-1 flex-wrap">
                        {p.targetUnit && <span>🎯 {p.targetUnit}</span>}
                        {p.duration && <span>⏱️ {p.duration}</span>}
                        {p.focusArea && <span>📌 {p.focusArea}</span>}
                      </div>
                    </div>

                    {/* Prompt Instruction Box */}
                    <div className="bg-gray-50 border border-gray-100 p-3.5 rounded-xl font-mono text-[11px] text-gray-700 leading-relaxed max-h-36 overflow-y-auto whitespace-pre-wrap">
                      {p.promptText}
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleRunPromptInJarvis(p)}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                      title="Run prompt directly in Jarvis AI assistant"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Run in Jarvis</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCopyPromptText(p.promptText, p.id)}
                        className={`p-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                          isCopied
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                            : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                        }`}
                        title="Copy prompt text to clipboard"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        onClick={() => handleOpenEditPromptModal(p)}
                        className="p-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl border border-gray-200 transition cursor-pointer"
                        title="Edit prompt settings"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {!p.isSystemDefault && (
                        <button
                          onClick={() => handleDeletePrompt(p.id)}
                          className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl border border-red-100 transition cursor-pointer"
                          title="Delete custom prompt"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredPrompts.length === 0 && (
              <div className="col-span-full text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200 p-8 space-y-3">
                <Bot className="w-10 h-10 text-gray-300 mx-auto" />
                <div>
                  <h4 className="text-sm font-black text-gray-500">No tactical prompts found</h4>
                  <p className="text-xs text-gray-400 font-semibold mt-1">
                    Try adjusting your category filter or search terms, or create a new prompt template.
                  </p>
                </div>
                <button
                  onClick={handleOpenNewPromptModal}
                  className="px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Build New Prompt</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Invite User Modal Overlay */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg border border-[var(--line)] shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[var(--blue)] flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[var(--navy)]">Invite System User</h3>
                  <p className="text-[10px] font-bold text-[var(--muted)]">Send credential credentials & team scopes</p>
                </div>
              </div>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendInvite} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-[10px] font-black uppercase tracking-wider text-gray-400">
                    Recipient Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="e.g. Liam Smith"
                    className="w-full p-2.5 border border-gray-200 bg-white rounded-xl focus:outline-none text-xs font-bold text-[var(--ink)]"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-[10px] font-black uppercase tracking-wider text-gray-400">
                    Recipient Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="e.g. liam@interchangeiq.com"
                    className="w-full p-2.5 border border-gray-200 bg-white rounded-xl focus:outline-none text-xs font-bold text-[var(--ink)]"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 text-[10px] font-black uppercase tracking-wider text-gray-400">
                  Assigned System Role *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Coach', 'Manager', 'Admin'] as const).map((role, idx) => (
                    <button
                      key={`role-option-${role}-${idx}`}
                      type="button"
                      onClick={() => setInviteRole(role)}
                      className={`p-2.5 border rounded-xl flex flex-col items-center justify-center gap-1.5 transition cursor-pointer ${
                        inviteRole === role
                          ? 'border-[var(--blue)] bg-blue-50/20 text-[var(--blue)]'
                          : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <Shield className={`w-4 h-4 ${inviteRole === role ? 'text-[var(--blue)]' : 'text-gray-400'}`} />
                      <span className="text-[10px] font-black tracking-wider uppercase">{role}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[9px] text-gray-400 mt-1 font-bold">
                  {inviteRole === 'Admin' && 'Admins possess full read/write clearance across all rosters and license configs.'}
                  {inviteRole === 'Coach' && 'Coaches are bounded to squad-specific lineup plans and timer controllers.'}
                  {inviteRole === 'Manager' && 'Managers enjoy strategic planner utilities without administrative profile edits.'}
                </p>
              </div>

              {inviteRole !== 'Admin' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                      Team Scope Assignments
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleSelectAllTeams}
                        className="text-[9px] font-black uppercase text-[var(--blue)] hover:underline cursor-pointer"
                      >
                        Select All
                      </button>
                      <span className="text-[9px] text-gray-300 font-bold">|</span>
                      <button
                        type="button"
                        onClick={handleClearTeams}
                        className="text-[9px] font-black uppercase text-gray-400 hover:underline cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <div className="border border-gray-100 rounded-xl max-h-36 overflow-y-auto p-2 bg-gray-50/50 space-y-1">
                    {teams.map((t, tIdx) => {
                      const isChecked = inviteSelectedTeams.includes(t.id);
                      return (
                        <label
                          key={`invite-team-select-${t.id || 'team'}-${tIdx}`}
                          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition ${
                            isChecked ? 'bg-white border border-gray-150' : 'hover:bg-gray-100/50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleTeamSelection(t.id)}
                              className="rounded border-gray-300 text-[var(--blue)] focus:ring-[var(--blue)]"
                            />
                            <span className="text-xs font-bold text-[var(--ink)]">{t.name}</span>
                          </div>
                          <span className="text-[9px] font-mono text-gray-400">ID: {t.id}</span>
                        </label>
                      );
                    })}

                    {teams.length === 0 && (
                      <p className="text-[10px] text-gray-400 font-semibold text-center py-3">
                        No teams available to assign. Please create a team first.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {inviteRole === 'Admin' && (
                <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-3 flex gap-2.5">
                  <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-black text-amber-800 uppercase block">Administrative Privilege</span>
                    <p className="text-[9px] text-amber-700 font-semibold leading-relaxed mt-0.5">
                      Admins inherit universal dashboard credentials. Choosing this role will automatically enable access across all current and future team databases.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 border-t border-gray-100 pt-4 mt-4">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-[var(--blue)] hover:opacity-90 text-white rounded-xl cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate & Send Invite</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create / Edit Tactical Prompt Modal Overlay */}
      {showPromptModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl border border-[var(--line)] shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Bot className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[var(--navy)]">
                    {editingPrompt ? 'Edit Tactical AI Prompt' : 'Build New Tactical AI Prompt'}
                  </h3>
                  <p className="text-xs text-[var(--muted)] font-semibold">
                    Configure prompt instructions and default parameters for Jarvis
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPromptModal(false)}
                className="p-1.5 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-600 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePromptSubmit} className="space-y-4">
              <div>
                <label className="block mb-1 text-[10px] font-black uppercase tracking-wider text-gray-400">
                  Prompt Title *
                </label>
                <input
                  type="text"
                  required
                  value={formPromptTitle}
                  onChange={(e) => setFormPromptTitle(e.target.value)}
                  placeholder="e.g. Corridor Ball Transition & Quick Kick-Ins"
                  className="w-full p-3 border border-gray-200 bg-white rounded-xl focus:outline-none text-xs font-bold text-[var(--ink)] focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-[10px] font-black uppercase tracking-wider text-gray-400">
                    Tactical Category *
                  </label>
                  <select
                    value={formPromptCategory}
                    onChange={(e) => setFormPromptCategory(e.target.value as any)}
                    className="w-full p-2.5 border border-gray-200 bg-white rounded-xl focus:outline-none text-xs font-extrabold text-[var(--ink)]"
                  >
                    <option value="Ball Movement">Ball Movement</option>
                    <option value="Defensive Structure">Defensive Structure</option>
                    <option value="Stoppages & Ruck">Stoppages & Ruck</option>
                    <option value="Skill Benchmark">Skill Benchmark</option>
                    <option value="Match Strategy">Match Strategy</option>
                    <option value="Fitness & Conditioning">Fitness & Conditioning</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1 text-[10px] font-black uppercase tracking-wider text-gray-400">
                    Target Unit / Group
                  </label>
                  <select
                    value={formPromptTarget}
                    onChange={(e) => setFormPromptTarget(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 bg-white rounded-xl focus:outline-none text-xs font-extrabold text-[var(--ink)]"
                  >
                    <option value="Whole Squad">Whole Squad</option>
                    <option value="Midfielders & Rucks">Midfielders & Rucks</option>
                    <option value="Defenders & Rebounders">Defenders & Rebounders</option>
                    <option value="Forwards & Key Targets">Forwards & Key Targets</option>
                    <option value="AFL Girls Squad">AFL Girls Squad</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-[10px] font-black uppercase tracking-wider text-gray-400">
                    Session Duration
                  </label>
                  <select
                    value={formPromptDuration}
                    onChange={(e) => setFormPromptDuration(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 bg-white rounded-xl focus:outline-none text-xs font-extrabold text-[var(--ink)]"
                  >
                    <option value="30 mins">30 Minutes (Short Intensive)</option>
                    <option value="45 mins">45 Minutes (Standard Block)</option>
                    <option value="60 mins">60 Minutes (Full Session)</option>
                    <option value="90 mins">90 Minutes (Pre-Season)</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1 text-[10px] font-black uppercase tracking-wider text-gray-400">
                    Focus Area Tag
                  </label>
                  <input
                    type="text"
                    value={formPromptFocus}
                    onChange={(e) => setFormPromptFocus(e.target.value)}
                    placeholder="e.g. Kicking Precision & Distance"
                    className="w-full p-2.5 border border-gray-200 bg-white rounded-xl focus:outline-none text-xs font-bold text-[var(--ink)]"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                    Tactical Prompt Instructions (Sent to Jarvis) *
                  </label>
                  <span className="text-[10px] text-gray-400 font-mono">
                    {formPromptText.length} chars
                  </span>
                </div>
                <textarea
                  required
                  rows={5}
                  value={formPromptText}
                  onChange={(e) => setFormPromptText(e.target.value)}
                  placeholder="Describe what Jarvis should analyze or generate. e.g. Build a 45-minute training plan focusing on dual foot kicking, corridor switches, and pressure handballs using our system drills..."
                  className="w-full p-3 border border-gray-200 bg-white rounded-xl focus:outline-none text-xs font-mono text-[var(--ink)] focus:border-indigo-500 leading-relaxed"
                />
                <p className="text-[10px] text-gray-400 font-medium mt-1">
                  💡 Tip: Mention drill goals, player groups, or AFL Curriculum guidelines (Level 6 Junior or Youth).
                </p>
              </div>

              <div className="flex justify-end gap-2 border-t border-gray-100 pt-4 mt-4">
                <button
                  type="button"
                  onClick={() => setShowPromptModal(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl cursor-pointer flex items-center gap-1.5 shadow-md"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{editingPrompt ? 'Update Prompt' : 'Save Tactical Prompt'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
