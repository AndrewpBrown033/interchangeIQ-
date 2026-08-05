import React, { useState, useEffect, useRef, useMemo } from 'react';
import { TeamProfile, UserProfile, TacticalPrompt, Player, LineupTemplate, GameHistory, ApiKeySettings, NotificationSettings } from '../types';
import { DEFAULT_PLAYERS, DEMO_TEAM_ID } from '../constants';
import { sendPasswordReset } from '../lib/firebase';
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
  FileText,
  Download,
  TrendingUp,
  Terminal,
  Loader2,
  Key,
  Eye,
  EyeOff,
  Bell,
  Smartphone,
  Radio
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
  onForceSyncTeams?: () => Promise<{ success: boolean; teamCount: number; message: string }>;
  isDebugEnabled?: boolean;
  onToggleDebug?: (enabled: boolean) => void;
  onOpenDebugModal?: () => void;
  apiKeys?: ApiKeySettings;
  onUpdateApiKeys?: (keys: ApiKeySettings) => void;
  notificationSettings?: NotificationSettings;
  onUpdateNotificationSettings?: (settings: NotificationSettings) => void;
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
  onForceSyncTeams,
  isDebugEnabled = false,
  onToggleDebug,
  onOpenDebugModal,
  apiKeys,
  onUpdateApiKeys,
  notificationSettings,
  onUpdateNotificationSettings,
}: AdminScreenProps) {
  const [adminSection, setAdminSection] = useState<'access' | 'prompts' | 'notifications'>('access');
  const [jarvisSubTab, setJarvisSubTab] = useState<'keys' | 'prompts'>('keys');
  const [isSyncingTeams, setIsSyncingTeams] = useState(false);
  const [teamSyncMsg, setTeamSyncMsg] = useState<string | null>(null);

  // Jarvis Settings > API Keys panel state
  const [anthropicInput, setAnthropicInput] = useState('');
  const [geminiInput, setGeminiInput] = useState('');
  const [showAnthropicInput, setShowAnthropicInput] = useState(false);
  const [showGeminiInput, setShowGeminiInput] = useState(false);
  const [isSavingKeys, setIsSavingKeys] = useState(false);
  const [keysSavedNotice, setKeysSavedNotice] = useState('');

  const maskKey = (key?: string) => {
    if (!key) return '';
    if (key.length <= 10) return '•'.repeat(key.length);
    return `${key.slice(0, 6)}${'•'.repeat(8)}${key.slice(-4)}`;
  };

  // Notification Settings panel state (Email/Pulse/Push channels + SMTP transport,
  // moved in-app instead of editing SMTP_* values in the server's .env file)
  const [smtpHostInput, setSmtpHostInput] = useState(notificationSettings?.smtpHost || '');
  const [smtpPortInput, setSmtpPortInput] = useState(String(notificationSettings?.smtpPort || 587));
  const [smtpSecureInput, setSmtpSecureInput] = useState(!!notificationSettings?.smtpSecure);
  const [smtpUserInput, setSmtpUserInput] = useState(notificationSettings?.smtpUser || '');
  const [smtpPassInput, setSmtpPassInput] = useState('');
  const [smtpFromInput, setSmtpFromInput] = useState(notificationSettings?.smtpFrom || '');
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);
  const [notifSavedNotice, setNotifSavedNotice] = useState('');

  const handleToggleNotificationChannel = (channel: 'emailEnabled' | 'pulseEnabled' | 'pushEnabled') => {
    if (!onUpdateNotificationSettings) return;
    onUpdateNotificationSettings({ [channel]: !notificationSettings?.[channel] });
  };

  const handleSaveSmtpSettings = async () => {
    if (!onUpdateNotificationSettings) return;
    setIsSavingNotifications(true);
    try {
      const updates: NotificationSettings = {
        smtpHost: smtpHostInput.trim(),
        smtpPort: Number(smtpPortInput) || 587,
        smtpSecure: smtpSecureInput,
        smtpUser: smtpUserInput.trim(),
        smtpFrom: smtpFromInput.trim(),
      };
      if (smtpPassInput.trim()) updates.smtpPass = smtpPassInput.trim();
      await onUpdateNotificationSettings(updates);
      setSmtpPassInput('');
      setNotifSavedNotice('Saved! Email invitations will now send through this SMTP server.');
    } catch (err: any) {
      setNotifSavedNotice(`Save failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSavingNotifications(false);
      setTimeout(() => setNotifSavedNotice(''), 5000);
    }
  };

  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [smtpDebugLogs, setSmtpDebugLogs] = useState<string[] | null>(null);

  const handleTestSmtpConnection = async () => {
    const host = smtpHostInput.trim() || notificationSettings?.smtpHost || '';
    const user = smtpUserInput.trim() || notificationSettings?.smtpUser || '';
    const pass = smtpPassInput.trim() || notificationSettings?.smtpPass || '';
    const port = Number(smtpPortInput) || notificationSettings?.smtpPort || 587;
    const from = smtpFromInput.trim() || notificationSettings?.smtpFrom || user;

    if (!host && !pass.startsWith('mlsn.') && !user.startsWith('mlsn.')) {
      setNotifSavedNotice('Error: Enter at least SMTP Host or a MailerSend API Token (starts with mlsn.) to test connection.');
      setTimeout(() => setNotifSavedNotice(''), 5000);
      return;
    }

    setIsTestingSmtp(true);
    setSmtpDebugLogs(null);
    setNotifSavedNotice('Testing mail server connection and running diagnostics...');
    try {
      const res = await fetch('/api/test-smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host, port, user, pass, from }),
      });
      const data = await res.json().catch(() => ({}));
      if (Array.isArray(data.debugLogs)) {
        setSmtpDebugLogs(data.debugLogs);
      }

      if (res.ok && data.success) {
        setNotifSavedNotice(`SMTP / MailerSend Test Successful! Verified via ${data.transport || 'SMTP'}. Test message sent to ${data.recipient}.`);
      } else {
        setNotifSavedNotice(`SMTP Test Failed: ${data.error || 'Connection failed'}. ${data.details || ''}`);
      }
    } catch (err: any) {
      setNotifSavedNotice(`SMTP Test Error: ${err.message || 'Network error'}`);
    } finally {
      setIsTestingSmtp(false);
    }
  };

  const handleClearSmtpSettings = async () => {
    if (!onUpdateNotificationSettings) return;
    if (!window.confirm('Clear the saved SMTP configuration? Email invitations will fall back to the server\'s own SMTP/Resend setup (if any), or stop sending until reconfigured.')) return;
    setIsSavingNotifications(true);
    try {
      await onUpdateNotificationSettings({ smtpHost: '', smtpPort: 587, smtpSecure: false, smtpUser: '', smtpPass: '', smtpFrom: '' });
      setSmtpHostInput('');
      setSmtpPortInput('587');
      setSmtpSecureInput(false);
      setSmtpUserInput('');
      setSmtpFromInput('');
      setSmtpPassInput('');
      setNotifSavedNotice('SMTP configuration cleared.');
    } finally {
      setIsSavingNotifications(false);
      setTimeout(() => setNotifSavedNotice(''), 3000);
    }
  };

  const handleSaveApiKeys = async () => {
    if (!onUpdateApiKeys) return;
    const updates: ApiKeySettings = {};
    if (anthropicInput.trim()) updates.anthropicApiKey = anthropicInput.trim();
    if (geminiInput.trim()) updates.geminiApiKey = geminiInput.trim();

    if (Object.keys(updates).length === 0) {
      setKeysSavedNotice('Enter at least one key to save.');
      setTimeout(() => setKeysSavedNotice(''), 3000);
      return;
    }

    setIsSavingKeys(true);
    try {
      await onUpdateApiKeys(updates);
      setAnthropicInput('');
      setGeminiInput('');
      setShowAnthropicInput(false);
      setShowGeminiInput(false);
      setKeysSavedNotice('Saved! These keys are now available to every coach on your team.');
    } catch (err: any) {
      setKeysSavedNotice(`Save failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSavingKeys(false);
      setTimeout(() => setKeysSavedNotice(''), 5000);
    }
  };

  const handleRemoveApiKey = async (provider: 'anthropic' | 'gemini') => {
    if (!onUpdateApiKeys) return;
    const confirmed = window.confirm(`Remove the saved ${provider === 'anthropic' ? 'Claude' : 'Gemini'} API key? Jarvis will fall back to the server's default key (if any) for this provider.`);
    if (!confirmed) return;
    setIsSavingKeys(true);
    try {
      await onUpdateApiKeys(provider === 'anthropic' ? { anthropicApiKey: '' } : { geminiApiKey: '' });
      setKeysSavedNotice('Key removed.');
    } finally {
      setIsSavingKeys(false);
      setTimeout(() => setKeysSavedNotice(''), 3000);
    }
  };

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
  const [inviteRole, setInviteRole] = useState<'Provisional' | 'Coach' | 'Assistant Coach' | 'Manager' | 'Admin'>('Provisional');
  const [inviteAllowedFeatures, setInviteAllowedFeatures] = useState<string[]>([]);
  const [inviteSelectedTeams, setInviteSelectedTeams] = useState<string[]>(activeTeamId ? [activeTeamId] : []);
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [activeUserSubTab, setActiveUserSubTab] = useState<'active' | 'pending'>('active');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Coach <-> Team assignment widget state (scales to 10s of coaches / 10s of teams)
  const [assignScope, setAssignScope] = useState<'coach' | 'team'>('coach');
  const [assignRosterSearch, setAssignRosterSearch] = useState('');
  const [selectedAssignCoachId, setSelectedAssignCoachId] = useState<string | null>(null);
  const [selectedAssignTeamId, setSelectedAssignTeamId] = useState<string | null>(null);
  const [bulkAssignMode, setBulkAssignMode] = useState(false);
  const [bulkSelectedIds, setBulkSelectedIds] = useState<string[]>([]);
  const [bulkTargetId, setBulkTargetId] = useState('');
  const [coachListSearch, setCoachListSearch] = useState('');
  const [teamListSearch, setTeamListSearch] = useState('');
  const assignPanelRef = useRef<HTMLDivElement>(null);

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
    const newTeamId = `team-${Date.now()}`;
    const newTeam: TeamProfile = {
      id: newTeamId,
      name: name.trim(),
      createdAt: Date.now(),
    };

    // 1. Update teams list
    onUpdateTeams([...teams, newTeam]);

    // 2. Automatically assign new teamId to active coaches/users so they have permission & access
    if (Array.isArray(users) && users.length > 0) {
      const updatedUsers = users.map((u) => {
        const currentTeamIds = Array.isArray(u.teamIds) ? u.teamIds : [];
        const nextTeamIds = currentTeamIds.includes(newTeamId) ? currentTeamIds : [...currentTeamIds, newTeamId];
        return {
          ...u,
          teamIds: withDemoTeamRule(nextTeamIds),
        };
      });
      onUpdateUsers(updatedUsers);
    }

    // 3. Immediately select the new team so the coach switches to the 2nd team squad
    onSelectTeam(newTeamId);
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

  const handleOpenInviteModal = (teamId?: string) => {
    setInviteEmail('');
    setInviteName('');
    if (teamId) {
      setInviteRole('Coach');
      setInviteAllowedFeatures(['training', 'growth', 'jarvis']);
      setInviteSelectedTeams([teamId]);
    } else {
      setInviteRole('Provisional');
      setInviteAllowedFeatures([]);
      setInviteSelectedTeams([DEMO_TEAM_ID]);
    }
    setShowInviteModal(true);
  };

  const handleInviteRoleChange = (role: 'Provisional' | 'Coach' | 'Assistant Coach' | 'Manager' | 'Admin') => {
    setInviteRole(role);
    if (role === 'Provisional') {
      setInviteAllowedFeatures([]);
      setInviteSelectedTeams([DEMO_TEAM_ID]);
    } else if (role === 'Admin' || role === 'Coach') {
      setInviteAllowedFeatures(['training', 'growth', 'jarvis']);
      setInviteSelectedTeams((prev) => prev.filter((id) => id !== DEMO_TEAM_ID));
    } else if (role === 'Assistant Coach') {
      setInviteAllowedFeatures(['training', 'growth']);
      setInviteSelectedTeams((prev) => prev.filter((id) => id !== DEMO_TEAM_ID));
    } else {
      setInviteAllowedFeatures(['training']);
      setInviteSelectedTeams((prev) => prev.filter((id) => id !== DEMO_TEAM_ID));
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      alert('Please enter an email address.');
      return;
    }
    if (!inviteName.trim()) {
      alert('Please enter a name.');
      return;
    }

    setIsSendingInvite(true);

    // Generate unique invitation code
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    const trimmedEmail = inviteEmail.trim().toLowerCase();
    const trimmedName = inviteName.trim();

    const newUser: UserProfile = {
      uid: `invite-${code}`,
      email: trimmedEmail,
      name: trimmedName,
      role: inviteRole,
      teamIds: inviteSelectedTeams.length > 0 ? inviteSelectedTeams : [DEMO_TEAM_ID],
      allowedFeatures: inviteAllowedFeatures,
      status: 'Pending',
      invitedBy: 'Administrator',
      invitedAt: Date.now(),
      inviteCode: code,
    };

    // Persist the pending invite first so it's not lost even if the email fails to send.
    onUpdateUsers([...users, newUser]);

    const inviteLink = `${window.location.origin}/?invite=${code}`;
    const teamName = inviteSelectedTeams.length > 0
      ? teams.find((t) => t.id === inviteSelectedTeams[0])?.name
      : undefined;

    // Respect the Email channel toggle in Admin > Notification Settings
    if (notificationSettings?.emailEnabled === false) {
      setIsSendingInvite(false);
      setShowInviteModal(false);
      setActiveUserSubTab('pending');
      alert(
        `${trimmedName} was added to Pending Invites, but the Email notification channel is turned off ` +
        `(Admin > Notification Settings). Use "Copy Link" on their pending invite row to share it manually.`
      );
      return;
    }

    try {
      const res = await fetch('/api/send-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toEmail: trimmedEmail,
          toName: trimmedName,
          inviterName: 'Administrator',
          role: inviteRole,
          inviteLink,
          teamName,
          // Admin-entered SMTP config from Notification Settings, used in place
          // of the server's own SMTP_*/RESEND_API_KEY env vars for this send.
          smtpOverride: notificationSettings?.smtpHost
            ? {
                host: notificationSettings.smtpHost,
                port: notificationSettings.smtpPort,
                secure: notificationSettings.smtpSecure,
                user: notificationSettings.smtpUser,
                pass: notificationSettings.smtpPass,
                from: notificationSettings.smtpFrom,
              }
            : undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        console.warn('Invite email did not send:', data);
        alert(
          `${trimmedName} was added to Pending Invites, but the invite email could not be sent ` +
          `(${data.details || data.error || 'email provider not configured'}).\n\n` +
          `Use "Copy Invite Link" on their pending invite row to share it manually.`
        );
      } else {
        alert(`Invitation email sent to ${trimmedEmail}.`);
      }
    } catch (err: any) {
      console.error('Invite email request failed:', err);
      alert(
        `${trimmedName} was added to Pending Invites, but the invite email request failed ` +
        `(${err.message || 'network error'}).\n\n` +
        `Use "Copy Invite Link" on their pending invite row to share it manually.`
      );
    } finally {
      setIsSendingInvite(false);
      setShowInviteModal(false);
      setActiveUserSubTab('pending');
    }
  };

  const handleToggleTeamSelection = (teamId: string) => {
    setInviteSelectedTeams((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]
    );
  };

  const handleSelectAllTeams = () => {
    setInviteSelectedTeams(teams.filter((t) => !t.isDemo).map((t) => t.id));
  };

  const handleClearTeams = () => {
    setInviteSelectedTeams([]);
  };

  const buildInviteLink = (code: string) => `${window.location.origin}/?invite=${code}`;

  const handleCopyLink = (code: string) => {
    const link = buildInviteLink(code);
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

  // Inline "Edit coach details" state for the Coaches & Roles list
  const [editingUserUid, setEditingUserUid] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [resettingPasswordUid, setResettingPasswordUid] = useState<string | null>(null);
  const [passwordResetNotice, setPasswordResetNotice] = useState<{
    uid: string;
    status: 'success' | 'warning' | 'error';
    text: string;
    details?: string;
    link?: string;
    transport?: string;
  } | null>(null);

  const handleStartEditUser = (u: UserProfile) => {
    setEditingUserUid(u.uid);
    setEditName(u.name);
    setEditEmail(u.email);
    setPasswordResetNotice(null);
  };

  const handleCancelEditUser = () => {
    setEditingUserUid(null);
    setEditName('');
    setEditEmail('');
  };

  const handleSaveUserEdit = (uid: string) => {
    const trimmedName = editName.trim();
    const trimmedEmail = editEmail.trim().toLowerCase();
    if (!trimmedName || !trimmedEmail) {
      alert('Name and email cannot be empty.');
      return;
    }
    onUpdateUsers(
      users.map((u) => (u.uid === uid ? { ...u, name: trimmedName, email: trimmedEmail } : u))
    );
    setEditingUserUid(null);
  };

  // Sends a password reset email to this coach's sign-in address. Uses both
  // Firebase Auth and custom SMTP/Resend endpoints configured in Admin > Notification Settings.
  const handleResetUserPassword = async (u: UserProfile) => {
    if (!window.confirm(`Send a password reset email to ${u.email}?`)) return;
    setResettingPasswordUid(u.uid);
    setPasswordResetNotice(null);

    const smtpOverride = notificationSettings?.smtpHost
      ? {
          host: notificationSettings.smtpHost,
          port: notificationSettings.smtpPort,
          secure: notificationSettings.smtpSecure,
          user: notificationSettings.smtpUser,
          pass: notificationSettings.smtpPass,
          from: notificationSettings.smtpFrom,
        }
      : undefined;

    const result = await sendPasswordReset(u.email, {
      name: u.name,
      smtpOverride,
    });

    setResettingPasswordUid(null);

    if (result.ok && (result.transport === 'smtp' || result.transport === 'smtp-override' || result.transport === 'resend')) {
      setPasswordResetNotice({
        uid: u.uid,
        status: 'success',
        text: `Password reset email dispatched via ${result.transport} to ${u.email}.`,
        link: result.resetLink,
        transport: result.transport,
      });
    } else if (result.ok) {
      setPasswordResetNotice({
        uid: u.uid,
        status: 'warning',
        text: `Password reset issued for ${u.email}.`,
        details: result.details || 'If no email arrives, your SMTP mail server is not configured in Admin > Notification Settings. You can copy the direct reset link below to share manually.',
        link: result.resetLink,
        transport: 'firebase',
      });
    } else {
      setPasswordResetNotice({
        uid: u.uid,
        status: 'error',
        text: result.error || 'Password reset email delivery failed.',
        details: result.details || 'To deliver automatic emails to inboxes, enter your mail server credentials in Admin > Notification Settings.',
        link: result.resetLink || `${window.location.origin}/?resetEmail=${encodeURIComponent(u.email)}`,
      });
    }
  };

  // A Provisional user's Demo Team access is a placeholder — the moment they have any
  // real team, the Demo Team is no longer needed and is dropped automatically.
  const withDemoTeamRule = (teamIds: string[]): string[] => {
    const hasRealTeam = teamIds.some((id) => id !== DEMO_TEAM_ID);
    return hasRealTeam ? teamIds.filter((id) => id !== DEMO_TEAM_ID) : teamIds;
  };

  const handleAssignTeamToUser = (uid: string, teamId: string) => {
    const updated = users.map((u) => {
      if (u.uid === uid) {
        const ids = u.teamIds.includes(teamId)
          ? u.teamIds.filter((id) => id !== teamId)
          : [...u.teamIds, teamId];
        return { ...u, teamIds: withDemoTeamRule(ids) };
      }
      return u;
    });
    onUpdateUsers(updated);
  };

  const handleBulkAssignTeamToCoaches = (coachUids: string[], teamId: string) => {
    if (!teamId || coachUids.length === 0) return;
    const updated = users.map((u) => {
      if (!coachUids.includes(u.uid)) return u;
      const ids = u.teamIds.includes(teamId) ? u.teamIds : [...u.teamIds, teamId];
      return { ...u, teamIds: withDemoTeamRule(ids) };
    });
    onUpdateUsers(updated);
    setBulkSelectedIds([]);
    setBulkTargetId('');
    setBulkAssignMode(false);
  };

  const handleOpenAssignPanelForCoach = (uid: string) => {
    setAssignScope('coach');
    setSelectedAssignCoachId(uid);
    setTimeout(() => assignPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };

  const handleChangeUserRole = (uid: string, newRole: string) => {
    const updated = users.map((u) => {
      if (u.uid === uid) {
        return { ...u, role: newRole };
      }
      return u;
    });
    onUpdateUsers(updated);
  };

  const handleToggleUserFeature = (uid: string, featureKey: string) => {
    const updated = users.map((u) => {
      if (u.uid === uid) {
        const currentFeatures = u.allowedFeatures ?? (
          u.role === 'Admin' || u.role === 'Coach'
            ? ['training', 'growth', 'jarvis']
            : u.role === 'Assistant Coach'
            ? ['training', 'growth']
            : []
        );
        const exists = currentFeatures.includes(featureKey);
        const newFeatures = exists
          ? currentFeatures.filter((f) => f !== featureKey)
          : [...currentFeatures, featureKey];
        return { ...u, allowedFeatures: newFeatures };
      }
      return u;
    });
    onUpdateUsers(updated);
  };

  const handleToggleRoleFeature = (role: string, featureKey: string) => {
    const updated = users.map((u) => {
      if (u.role === role) {
        const currentFeatures = u.allowedFeatures ?? (
          u.role === 'Admin' || u.role === 'Coach'
            ? ['training', 'growth', 'jarvis']
            : u.role === 'Assistant Coach'
            ? ['training', 'growth']
            : []
        );
        const isAllowed = currentFeatures.includes(featureKey);
        const newFeatures = isAllowed
          ? currentFeatures.filter((f) => f !== featureKey)
          : [...currentFeatures, featureKey];
        return { ...u, allowedFeatures: newFeatures };
      }
      return u;
    });
    onUpdateUsers(updated);
  };

  const isElevatedRole = currentUserRole === 'Admin' || currentUserRole === 'Coach';

  const handleExportCSV = () => {
    if (!players || players.length === 0) {
      alert('No players in squad to export.');
      return;
    }
    const headers = ['Name', 'Nickname', 'Jumper Number', 'Primary Zone', 'Positions', 'Status', 'Note'];
    const rows = players.map((p) => [
      `"${p.name || ''}"`,
      `"${p.nick || ''}"`,
      `"${p.number || ''}"`,
      `"${p.primaryZone || ''}"`,
      `"${(p.positions || []).join(';')}"`,
      `"${p.status || 'available'}"`,
      `"${(p.note || '').replace(/"/g, '""')}"`,
    ]);
    const activeTeamName = teams.find((t) => t.id === activeTeamId)?.name || 'squad';
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${activeTeamName.toLowerCase().replace(/\s+/g, '_')}_roster.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleToggleTeamFeature = (teamId: string, featureKey: 'showTraining' | 'showPlayerGrowth' | 'showJarvis') => {
    const updated = teams.map((t) => {
      if (t.id === teamId) {
        const currentVal = t[featureKey] !== false;
        return { ...t, [featureKey]: !currentVal };
      }
      return t;
    });
    onUpdateTeams(updated);
  };

  const handleToggleTeamInactive = (teamId: string) => {
    const updated = teams.map((t) => {
      if (t.id === teamId) {
        return { ...t, isInactive: !t.isInactive };
      }
      return t;
    });
    onUpdateTeams(updated);
  };

  const activeCoaches = users.filter((u) => u.status !== 'Pending' && u.email !== 'anonymous@interchangeiq.com');
  const pendingInvites = users.filter((u) => u.status === 'Pending');

  // Only non-Admins get explicit team assignments — Admins already have universal access
  const assignableCoaches = useMemo(
    () => activeCoaches.filter((u) => u.role !== 'Admin'),
    [activeCoaches]
  );

  const filteredAssignRoster = useMemo(() => {
    const q = assignRosterSearch.trim().toLowerCase();
    if (assignScope === 'coach') {
      return assignableCoaches.filter(
        (u) => !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      );
    }
    return teams.filter((t) => !q || t.name.toLowerCase().includes(q));
  }, [assignScope, assignRosterSearch, assignableCoaches, teams]);

  const effectiveSelectedCoach =
    assignableCoaches.find((u) => u.uid === selectedAssignCoachId) || assignableCoaches[0] || null;
  const effectiveSelectedTeam =
    teams.find((t) => t.id === selectedAssignTeamId) || teams[0] || null;

  const filteredCoachListForCards = useMemo(() => {
    const q = coachListSearch.trim().toLowerCase();
    return activeCoaches.filter(
      (u) => !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [activeCoaches, coachListSearch]);

  const filteredTeamsForCards = useMemo(() => {
    const q = teamListSearch.trim().toLowerCase();
    return teams.filter((t) => !q || t.name.toLowerCase().includes(q));
  }, [teams, teamListSearch]);

  return (
    <div className="space-y-6">
      {/* Top Header & Sub-navigation Header Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[var(--line)] shadow-xs">
        <div>
          <h2 className="text-xl font-black text-[var(--navy)] tracking-tight">Admin Dashboard</h2>
          <p className="text-xs text-[var(--muted)] font-semibold mt-1">
            Configure squads, coach credentials, Jarvis AI provider keys, and tactical prompts
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
            <span>Jarvis Settings</span>
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
              adminSection === 'prompts' ? 'bg-indigo-500 text-white' : 'bg-indigo-100 text-indigo-700'
            }`}>
              {prompts.length}
            </span>
          </button>
          <button
            onClick={() => setAdminSection('notifications')}
            className={`py-2 px-4 rounded-xl font-black text-xs transition flex items-center gap-2 cursor-pointer ${
              adminSection === 'notifications'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Bell className="w-4 h-4 text-amber-400" />
            <span>Notification Settings</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: Squad Access & Licenses */}
      {adminSection === 'access' && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-4 rounded-2xl border border-[var(--line)] shadow-xs">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-red-500" />
              <div>
                <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">Admin & Coach Controls</h3>
                <p className="text-[11px] text-gray-500 font-medium">Manage team rosters, elevated feature access, and user credentials</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleExportCSV}
                className="px-3.5 py-2 text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl border border-emerald-200 transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                title="Export active team squad to CSV file"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>Export Players (.CSV)</span>
              </button>
              <button
                onClick={handleCreateTeam}
                className="px-3.5 py-2 text-xs font-bold bg-[var(--green)] text-white rounded-xl hover:opacity-95 transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>New Team</span>
              </button>
              <button
                onClick={() => handleOpenInviteModal()}
                className="px-3.5 py-2 text-xs font-bold bg-[var(--blue)] text-white rounded-xl hover:opacity-95 transition flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Invite User</span>
              </button>
            </div>
          </div>

          {/* Elevated Access & Team Feature Toggles Card */}
          <div className="bg-white p-5 rounded-2xl border border-[var(--line)] shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-black text-sm text-[var(--navy)] flex items-center gap-2">
                  <Zap className="w-4 h-4 text-purple-600" />
                  <span>Enabled Feature Access ({teams.find(t => t.id === activeTeamId)?.name || 'Active Team'})</span>
                </h3>
                <p className="text-xs text-gray-500 font-semibold mt-0.5">
                  Choose which features are enabled for this active team. Feature permissions for specific coaches and roles can be configured per user in the Coaches & Roles section below.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                  Role: {currentUserRole}
                </span>
              </div>
            </div>

            {!isElevatedRole && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs font-bold flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Elevated access restricted. Only Coaches and Admins can configure or access these features.</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              {/* Training Toggle */}
              <div className={`p-4 rounded-xl border transition ${
                (teams.find(t => t.id === activeTeamId)?.showTraining !== false)
                  ? 'bg-indigo-50/60 border-indigo-200'
                  : 'bg-gray-50 border-gray-200 opacity-60'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-black text-gray-900">Training Module</span>
                  </div>
                  <button
                    disabled={!isElevatedRole}
                    onClick={() => activeTeamId && handleToggleTeamFeature(activeTeamId, 'showTraining')}
                    className={`w-10 h-6 rounded-full p-1 transition cursor-pointer disabled:cursor-not-allowed ${
                      (teams.find(t => t.id === activeTeamId)?.showTraining !== false)
                        ? 'bg-indigo-600 justify-end'
                        : 'bg-gray-300 justify-start'
                    } flex items-center`}
                    title="Toggle Training module visibility"
                  >
                    <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
                  </button>
                </div>
                <p className="text-[11px] text-gray-500 font-semibold">
                  Drill library, tactical training plans, and session builder.
                </p>
              </div>

              {/* Player Growth Toggle */}
              <div className={`p-4 rounded-xl border transition ${
                (teams.find(t => t.id === activeTeamId)?.showPlayerGrowth !== false)
                  ? 'bg-emerald-50/60 border-emerald-200'
                  : 'bg-gray-50 border-gray-200 opacity-60'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-black text-gray-900">Player Growth</span>
                  </div>
                  <button
                    disabled={!isElevatedRole}
                    onClick={() => activeTeamId && handleToggleTeamFeature(activeTeamId, 'showPlayerGrowth')}
                    className={`w-10 h-6 rounded-full p-1 transition cursor-pointer disabled:cursor-not-allowed ${
                      (teams.find(t => t.id === activeTeamId)?.showPlayerGrowth !== false)
                        ? 'bg-emerald-600 justify-end'
                        : 'bg-gray-300 justify-start'
                    } flex items-center`}
                    title="Toggle Player Growth module visibility"
                  >
                    <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
                  </button>
                </div>
                <p className="text-[11px] text-gray-500 font-semibold">
                  Skill assessments, 2km time trials, and year-on-year player metrics.
                </p>
              </div>

              {/* Jarvis AI Toggle */}
              <div className={`p-4 rounded-xl border transition ${
                (teams.find(t => t.id === activeTeamId)?.showJarvis !== false)
                  ? 'bg-purple-50/60 border-purple-200'
                  : 'bg-gray-50 border-gray-200 opacity-60'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-black text-gray-900">JARVIS AI Assistant</span>
                  </div>
                  <button
                    disabled={!isElevatedRole}
                    onClick={() => activeTeamId && handleToggleTeamFeature(activeTeamId, 'showJarvis')}
                    className={`w-10 h-6 rounded-full p-1 transition cursor-pointer disabled:cursor-not-allowed ${
                      (teams.find(t => t.id === activeTeamId)?.showJarvis !== false)
                        ? 'bg-purple-600 justify-end'
                        : 'bg-gray-300 justify-start'
                    } flex items-center`}
                    title="Toggle JARVIS AI Assistant visibility"
                  >
                    <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
                  </button>
                </div>
                <p className="text-[11px] text-gray-500 font-semibold">
                  Tactical AI analysis, session prompt builder, and AI recommendations.
                </p>
              </div>

              {/* Developer & System Debugger Toggle */}
              <div className={`p-4 rounded-xl border transition ${
                isDebugEnabled
                  ? 'bg-blue-50/70 border-blue-200'
                  : 'bg-gray-50 border-gray-200 opacity-60'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-black text-gray-900">System Debugger</span>
                  </div>
                  <button
                    disabled={!isElevatedRole}
                    onClick={() => onToggleDebug && onToggleDebug(!isDebugEnabled)}
                    className={`w-10 h-6 rounded-full p-1 transition cursor-pointer disabled:cursor-not-allowed ${
                      isDebugEnabled
                        ? 'bg-blue-600 justify-end'
                        : 'bg-gray-300 justify-start'
                    } flex items-center`}
                    title="Toggle System Debugger button on Login screen and top navigation bar"
                  >
                    <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
                  </button>
                </div>
                <p className="text-[11px] text-gray-500 font-semibold mb-2">
                  Shows or hides the live system & Firebase diagnostics button on Login screen and app header.
                </p>
                {isDebugEnabled && onOpenDebugModal && (
                  <button
                    type="button"
                    onClick={onOpenDebugModal}
                    className="mt-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[10px] flex items-center gap-1 transition cursor-pointer shadow-2xs"
                  >
                    <Terminal className="w-3 h-3" />
                    <span>Run Debugger</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Turn On / Off Features by Role Group Card */}
          <div className="bg-white p-5 rounded-2xl border border-[var(--line)] shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-black text-sm text-[var(--navy)] flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  <span>Turn On / Off Features by Role Group</span>
                </h3>
                <p className="text-xs text-gray-500 font-semibold mt-0.5">
                  Batch toggle module access (Training, Growth, JARVIS) for all coaches assigned to a specific role group across the platform.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              {[
                { role: 'Coach', label: 'Coaches' },
                { role: 'Assistant Coach', label: 'Assistant Coaches' },
                { role: 'Manager', label: 'Managers' },
              ].map((roleGroup) => (
                <div key={`role-group-${roleGroup.role}`} className="p-3.5 bg-gray-50/70 rounded-xl border border-gray-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-gray-900 uppercase tracking-wide">{roleGroup.label}</span>
                    <span className="text-[10px] font-bold text-gray-400">
                      {users.filter((u) => u.role === roleGroup.role).length} user(s)
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { key: 'training', label: 'Train', icon: <BookOpen className="w-3 h-3 text-indigo-600" /> },
                      { key: 'growth', label: 'Growth', icon: <TrendingUp className="w-3 h-3 text-emerald-600" /> },
                      { key: 'jarvis', label: 'JARVIS', icon: <Bot className="w-3 h-3 text-purple-600" /> },
                    ].map((feat) => {
                      const usersInRole = users.filter((u) => u.role === roleGroup.role);
                      const enabledCount = usersInRole.filter((u) => {
                        const current = u.allowedFeatures ?? (
                          u.role === 'Coach' ? ['training', 'growth', 'jarvis'] : u.role === 'Assistant Coach' ? ['training', 'growth'] : []
                        );
                        return current.includes(feat.key);
                      }).length;
                      const isAllEnabled = usersInRole.length > 0 && enabledCount === usersInRole.length;

                      return (
                        <button
                          key={`role-feat-${roleGroup.role}-${feat.key}`}
                          type="button"
                          onClick={() => handleToggleRoleFeature(roleGroup.role, feat.key)}
                          className={`px-2 py-2 rounded-lg text-xs font-bold border transition flex flex-col items-center justify-center gap-1 cursor-pointer ${
                            isAllEnabled
                              ? 'bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100'
                              : enabledCount > 0
                              ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                              : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'
                          }`}
                          title={`Toggle ${feat.label} for all ${roleGroup.label}`}
                        >
                          <div className="flex items-center gap-1">
                            {feat.icon}
                            <span className="text-[11px] font-bold">{feat.label}</span>
                          </div>
                          <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                            isAllEnabled ? 'bg-emerald-200 text-emerald-900' : enabledCount > 0 ? 'bg-amber-200 text-amber-900' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {isAllEnabled ? 'ON' : enabledCount > 0 ? `${enabledCount} ON` : 'OFF'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Coach <-> Team Assignments — scales to 10s of coaches and 10s of teams */}
          <div ref={assignPanelRef} className="bg-white p-5 rounded-2xl border border-[var(--line)] shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-black text-sm text-[var(--navy)] flex items-center gap-2">
                  <Users className="w-4 h-4 text-[var(--blue)]" />
                  <span>Coach & Team Assignments</span>
                </h3>
                <p className="text-xs text-gray-500 font-semibold mt-0.5">
                  Search a coach or a team, then add or remove access. Admins aren't listed here — they already have access to every team.
                </p>
              </div>
              <div className="flex bg-gray-100 p-1 rounded-xl">
                <button
                  onClick={() => { setAssignScope('coach'); setBulkAssignMode(false); setBulkSelectedIds([]); }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    assignScope === 'coach' ? 'bg-white text-[var(--navy)] shadow-xs' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  By coach
                </button>
                <button
                  onClick={() => { setAssignScope('team'); setBulkAssignMode(false); setBulkSelectedIds([]); }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    assignScope === 'team' ? 'bg-white text-[var(--navy)] shadow-xs' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  By team
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-0 border border-gray-100 rounded-2xl overflow-hidden">
              {/* Roster panel */}
              <div className="border-b sm:border-b-0 sm:border-r border-gray-100 bg-gray-50/50">
                <div className="p-2.5 border-b border-gray-100 flex items-center gap-2">
                  {assignScope === 'coach' ? (
                    <>
                      <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <input
                        type="text"
                        value={assignRosterSearch}
                        onChange={(e) => setAssignRosterSearch(e.target.value)}
                        placeholder="Search coaches..."
                        className="w-full bg-transparent text-xs font-semibold focus:outline-none"
                      />
                    </>
                  ) : (
                    <>
                      <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <input
                        type="text"
                        value={assignRosterSearch}
                        onChange={(e) => setAssignRosterSearch(e.target.value)}
                        placeholder="Search teams..."
                        className="w-full bg-transparent text-xs font-semibold focus:outline-none"
                      />
                    </>
                  )}
                </div>

                {assignScope === 'coach' && (
                  <div className="px-2.5 py-1.5 border-b border-gray-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => { setBulkAssignMode((v) => !v); setBulkSelectedIds([]); }}
                      className={`text-[10px] font-black uppercase tracking-wider cursor-pointer ${
                        bulkAssignMode ? 'text-[var(--blue)]' : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      {bulkAssignMode ? 'Cancel bulk select' : 'Bulk select'}
                    </button>
                    {bulkAssignMode && (
                      <span className="text-[10px] font-bold text-gray-400">{bulkSelectedIds.length} selected</span>
                    )}
                  </div>
                )}

                <div className="max-h-80 overflow-y-auto">
                  {filteredAssignRoster.length === 0 && (
                    <p className="text-[11px] text-gray-400 font-semibold text-center py-6 px-2">
                      No {assignScope === 'coach' ? 'coaches' : 'teams'} match "{assignRosterSearch}".
                    </p>
                  )}
                  {assignScope === 'coach' && (filteredAssignRoster as UserProfile[]).map((u) => {
                    const isSelected = effectiveSelectedCoach?.uid === u.uid;
                    const isChecked = bulkSelectedIds.includes(u.uid);
                    return (
                      <div
                        key={`assign-roster-coach-${u.uid}`}
                        onClick={() => (bulkAssignMode
                          ? setBulkSelectedIds((prev) => prev.includes(u.uid) ? prev.filter((id) => id !== u.uid) : [...prev, u.uid])
                          : setSelectedAssignCoachId(u.uid))}
                        className={`px-3 py-2 flex items-center justify-between gap-2 cursor-pointer border-b border-gray-100/80 last:border-b-0 transition ${
                          isSelected && !bulkAssignMode ? 'bg-blue-50' : 'hover:bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {bulkAssignMode && (
                            <input type="checkbox" readOnly checked={isChecked} className="shrink-0" />
                          )}
                          <span className={`text-xs font-bold truncate ${isSelected && !bulkAssignMode ? 'text-[var(--blue)]' : 'text-gray-700'}`}>
                            {u.name}
                          </span>
                        </div>
                        <span className="text-[10px] font-black text-gray-400 shrink-0">{u.teamIds.length}</span>
                      </div>
                    );
                  })}
                  {assignScope === 'team' && (filteredAssignRoster as TeamProfile[]).map((t) => {
                    const isSelected = effectiveSelectedTeam?.id === t.id;
                    const coachCount = assignableCoaches.filter((u) => u.teamIds.includes(t.id)).length;
                    return (
                      <div
                        key={`assign-roster-team-${t.id}`}
                        onClick={() => setSelectedAssignTeamId(t.id)}
                        className={`px-3 py-2 flex items-center justify-between gap-2 cursor-pointer border-b border-gray-100/80 last:border-b-0 transition ${
                          isSelected ? 'bg-blue-50' : 'hover:bg-white'
                        }`}
                      >
                        <span className={`text-xs font-bold truncate flex items-center gap-1.5 ${isSelected ? 'text-[var(--blue)]' : 'text-gray-700'}`}>
                          {t.name}
                          {t.isDemo && (
                            <span className="px-1.5 py-0.5 text-[8px] font-black bg-amber-100 text-amber-700 rounded uppercase shrink-0">
                              Sandbox
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] font-black text-gray-400 shrink-0">{coachCount}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Detail panel */}
              <div className="p-4">
                {bulkAssignMode && assignScope === 'coach' ? (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-gray-700">
                      Assign {bulkSelectedIds.length || 0} selected coach{bulkSelectedIds.length === 1 ? '' : 'es'} to a team
                    </p>
                    <div className="flex gap-2">
                      <select
                        value={bulkTargetId}
                        onChange={(e) => setBulkTargetId(e.target.value)}
                        className="flex-1 px-2.5 py-2 text-xs font-bold bg-gray-50 border border-gray-200 rounded-lg focus:outline-none"
                      >
                        <option value="">Choose a team...</option>
                        {teams.filter((t) => !t.isDemo).map((t) => (
                          <option key={`bulk-team-opt-${t.id}`} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                      <button
                        disabled={!bulkTargetId || bulkSelectedIds.length === 0}
                        onClick={() => handleBulkAssignTeamToCoaches(bulkSelectedIds, bulkTargetId)}
                        className="px-3 py-2 text-xs font-bold bg-[var(--blue)] text-white rounded-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Assign
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-400 font-semibold">
                      Tick coaches on the left, pick a team, then apply. This adds the team without removing any of their existing teams.
                    </p>
                  </div>
                ) : assignScope === 'coach' ? (
                  effectiveSelectedCoach ? (
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-extrabold text-[var(--ink)] flex items-center gap-1.5">
                          {effectiveSelectedCoach.name}
                          {effectiveSelectedCoach.role === 'Provisional' && (
                            <span className="px-1.5 py-0.5 text-[8px] font-black bg-amber-100 text-amber-700 rounded uppercase">
                              Provisional
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 font-semibold">{effectiveSelectedCoach.email} • {effectiveSelectedCoach.role}</p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {effectiveSelectedCoach.teamIds.length === 0 && (
                          <span className="text-[11px] text-gray-400 font-semibold">No teams assigned yet.</span>
                        )}
                        {effectiveSelectedCoach.teamIds.map((tid) => {
                          const t = teams.find((tm) => tm.id === tid);
                          return (
                            <span
                              key={`coach-chip-${effectiveSelectedCoach.uid}-${tid}`}
                              className={`pl-2.5 pr-1.5 py-1 border rounded-lg text-[11px] font-bold flex items-center gap-1 ${
                                t?.isDemo
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-blue-50 text-[var(--blue)] border-blue-200'
                              }`}
                              title={t?.isDemo ? 'Temporary sandbox access — removed once a real team is assigned' : undefined}
                            >
                              {t?.name || tid}
                              <button
                                onClick={() => handleAssignTeamToUser(effectiveSelectedCoach.uid, tid)}
                                className={`rounded p-0.5 cursor-pointer ${t?.isDemo ? 'hover:bg-amber-100' : 'hover:bg-blue-100'}`}
                                title={`Remove ${t?.name || tid}`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                      <div className="flex gap-2 pt-1">
                        <select
                          value=""
                          onChange={(e) => e.target.value && handleAssignTeamToUser(effectiveSelectedCoach.uid, e.target.value)}
                          className="flex-1 px-2.5 py-2 text-xs font-bold bg-gray-50 border border-gray-200 rounded-lg focus:outline-none"
                        >
                          <option value="">Add a team...</option>
                          {teams.filter((t) => !t.isDemo && !effectiveSelectedCoach.teamIds.includes(t.id)).map((t) => (
                            <option key={`add-team-opt-${t.id}`} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 font-semibold text-center py-8">No coaches to assign yet.</p>
                  )
                ) : (
                  effectiveSelectedTeam ? (
                    <div className="space-y-3">
                      <p className="text-sm font-extrabold text-[var(--ink)] flex items-center gap-1.5">
                        {effectiveSelectedTeam.name}
                        {effectiveSelectedTeam.isDemo && (
                          <span className="px-1.5 py-0.5 text-[8px] font-black bg-amber-100 text-amber-700 rounded uppercase">
                            Sandbox
                          </span>
                        )}
                      </p>
                      {effectiveSelectedTeam.isDemo && (
                        <p className="text-[10px] text-amber-700 font-semibold -mt-2">
                          Everyone here is on temporary Provisional access. Assign them a real team below to move them off the Demo Team automatically.
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1.5">
                        {assignableCoaches.filter((u) => u.teamIds.includes(effectiveSelectedTeam.id)).length === 0 && (
                          <span className="text-[11px] text-gray-400 font-semibold">No coaches assigned yet.</span>
                        )}
                        {assignableCoaches.filter((u) => u.teamIds.includes(effectiveSelectedTeam.id)).map((u) => (
                          <span
                            key={`team-chip-${effectiveSelectedTeam.id}-${u.uid}`}
                            className="pl-2.5 pr-1.5 py-1 bg-blue-50 text-[var(--blue)] border border-blue-200 rounded-lg text-[11px] font-bold flex items-center gap-1"
                          >
                            {u.name}
                            <button
                              onClick={() => handleAssignTeamToUser(u.uid, effectiveSelectedTeam.id)}
                              className="hover:bg-blue-100 rounded p-0.5 cursor-pointer"
                              title={`Remove ${u.name}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2 pt-1">
                        <select
                          value=""
                          onChange={(e) => e.target.value && handleAssignTeamToUser(e.target.value, effectiveSelectedTeam.id)}
                          className="flex-1 px-2.5 py-2 text-xs font-bold bg-gray-50 border border-gray-200 rounded-lg focus:outline-none"
                        >
                          <option value="">Add a coach...</option>
                          {assignableCoaches.filter((u) => !u.teamIds.includes(effectiveSelectedTeam.id)).map((u) => (
                            <option key={`add-coach-opt-${u.uid}`} value={u.uid}>{u.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 font-semibold text-center py-8">No teams to assign yet.</p>
                  )
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Teams Management */}
            <div className="bg-white p-5 rounded-2xl border border-[var(--line)] shadow-xs space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="font-black text-sm text-[var(--navy)] flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-[var(--blue)]" />
                  <span>Teams & Clubs ({teams.length})</span>
                </h3>
                {onForceSyncTeams && (
                  <button
                    disabled={isSyncingTeams}
                    onClick={async () => {
                      setIsSyncingTeams(true);
                      setTeamSyncMsg(null);
                      const res = await onForceSyncTeams();
                      setIsSyncingTeams(false);
                      setTeamSyncMsg(res.message);
                      setTimeout(() => setTeamSyncMsg(null), 8000);
                    }}
                    className="px-3 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                    title="Push all local team profiles to Cloud Firestore and sync remote team roster data"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${isSyncingTeams ? 'animate-spin' : ''}`} />
                    <span>{isSyncingTeams ? 'Syncing...' : 'Sync Teams to Cloud'}</span>
                  </button>
                )}
              </div>
              <p className="text-xs text-[var(--muted)] font-semibold leading-relaxed">
                Manage your registered sports clubs. Active coaches can be assigned directly to individual team datasets.
              </p>

              {teamSyncMsg && (
                <div className="p-3 bg-indigo-50 border border-indigo-200 text-indigo-950 rounded-xl text-xs font-bold flex items-center justify-between gap-2 shadow-2xs">
                  <span>{teamSyncMsg}</span>
                  <button onClick={() => setTeamSyncMsg(null)} className="text-indigo-600 hover:text-indigo-800 p-0.5 rounded cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {teams.length > 6 && (
                <div className="flex items-center gap-2 px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg">
                  <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                  <input
                    type="text"
                    value={teamListSearch}
                    onChange={(e) => setTeamListSearch(e.target.value)}
                    placeholder="Search teams..."
                    className="w-full bg-transparent text-xs font-semibold focus:outline-none"
                  />
                </div>
              )}

              <div className="space-y-2 pt-1 max-h-[28rem] overflow-y-auto pr-0.5">
                {filteredTeamsForCards.length === 0 && (
                  <p className="text-xs text-gray-400 font-semibold text-center py-6">No teams match "{teamListSearch}".</p>
                )}
                {filteredTeamsForCards.map((t, index) => {
                  const isActive = activeTeamId === t.id;
                  const isInactive = !!t.isInactive;
                  return (
                    <div
                      key={`team-profile-${t.id || 'new'}-${index}`}
                      className={`p-4 border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition ${
                        isInactive
                          ? 'border-amber-200 bg-amber-50/30'
                          : isActive
                          ? 'border-[var(--green)] bg-green-50/50'
                          : 'border-gray-100 bg-white hover:bg-gray-50'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <b className={`text-sm font-extrabold block ${isInactive ? 'text-gray-600 line-through decoration-amber-500/60' : 'text-[var(--ink)]'}`}>{t.name}</b>
                          {isInactive && (
                            <span className="px-2 py-0.5 text-[10px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-200 rounded-md">
                              Inactive • Season Finished
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500">
                          <span>ID: {t.id}</span>
                          {isActive && <span className="text-emerald-600 font-extrabold">• Active Selection</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        <button
                          onClick={() => {
                            onSelectTeam(t.id);
                            if (onNavigateTab) onNavigateTab('team');
                          }}
                          className={`px-3 py-1.5 text-[11px] font-extrabold rounded-lg border transition cursor-pointer flex items-center gap-1 ${
                            isActive
                              ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs hover:bg-emerald-700'
                              : 'bg-blue-600 text-white border-blue-700 hover:bg-blue-700 shadow-2xs'
                          }`}
                          title="Select team and view Team View page"
                        >
                          <span>{isActive ? 'View Team View →' : 'Open →'}</span>
                        </button>
                        <button
                          onClick={() => handleOpenInviteModal(t.id)}
                          className="px-2.5 py-1.5 text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg cursor-pointer transition flex items-center gap-1"
                          title={`Invite a coach for ${t.name}`}
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Invite Coach</span>
                        </button>
                        <button
                          onClick={() => handleToggleTeamInactive(t.id)}
                          className={`px-2.5 py-1.5 text-xs font-bold rounded-lg cursor-pointer transition border ${
                            isInactive
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                          }`}
                          title={isInactive ? "Reactivate team for new season" : "Mark team as inactive when season finishes"}
                        >
                          {isInactive ? 'Reactivate' : 'End Season'}
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
                
                {/* Inner Sub-tab Switcher & Invite Coach Button */}
                <div className="flex items-center gap-2 flex-wrap">
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
                  <button
                    onClick={() => handleOpenInviteModal()}
                    className="px-3 py-1.5 text-xs font-bold bg-[var(--blue)] text-white hover:opacity-95 rounded-xl transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Invite Coach</span>
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
                  {activeCoaches.length > 6 && (
                    <div className="flex items-center gap-2 px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg">
                      <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <input
                        type="text"
                        value={coachListSearch}
                        onChange={(e) => setCoachListSearch(e.target.value)}
                        placeholder="Search coaches by name or email..."
                        className="w-full bg-transparent text-xs font-semibold focus:outline-none"
                      />
                    </div>
                  )}

                  {coachListSearch.trim() && filteredCoachListForCards.length === 0 && (
                    <p className="text-xs text-gray-400 font-semibold text-center py-6">No coaches match "{coachListSearch}".</p>
                  )}
                  <div className="space-y-3 max-h-[36rem] overflow-y-auto pr-0.5">
                  {filteredCoachListForCards.map((u, idx) => (
                    <div
                      key={`active-coach-${u.uid || 'coach'}-${idx}`}
                      className="p-4 border border-gray-100 bg-white rounded-xl space-y-3 shadow-xs"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        {editingUserUid === u.uid ? (
                          <div className="flex-1 min-w-[200px] space-y-1.5">
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              placeholder="Full name"
                              className="w-full px-2.5 py-1.5 text-xs font-extrabold bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <input
                              type="email"
                              value={editEmail}
                              onChange={(e) => setEditEmail(e.target.value)}
                              placeholder="Email"
                              className="w-full px-2.5 py-1.5 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <p className="text-[9px] text-gray-400 font-semibold leading-tight">
                              This updates their profile record. It doesn't change the email/password they sign in with.
                            </p>
                          </div>
                        ) : (
                          <div>
                            <b className="text-sm font-extrabold text-[var(--ink)] block flex items-center gap-1.5">
                              {u.name}
                              {u.role === 'Admin' && <Shield className="w-3.5 h-3.5 text-red-500" />}
                              {u.role === 'Provisional' && (
                                <span className="px-1.5 py-0.5 text-[8px] font-black bg-amber-100 text-amber-700 rounded uppercase">
                                  Provisional
                                </span>
                              )}
                            </b>
                            <span className="text-xs text-[var(--muted)] font-semibold">{u.email}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          {editingUserUid === u.uid ? (
                            <>
                              <button
                                onClick={() => handleSaveUserEdit(u.uid)}
                                className="px-2.5 py-1.5 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer"
                              >
                                Save
                              </button>
                              <button
                                onClick={handleCancelEditUser}
                                className="px-2.5 py-1.5 text-[11px] font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg cursor-pointer"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleStartEditUser(u)}
                              className="p-1.5 text-gray-500 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg cursor-pointer"
                              title="Edit coach details"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <label className="text-[10px] font-black uppercase text-gray-400">Role:</label>
                          <select
                            value={u.role}
                            onChange={(e) => handleChangeUserRole(u.uid, e.target.value)}
                            className="px-2.5 py-1 text-xs font-extrabold bg-gray-50 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                          >
                            <option value="Provisional">Provisional</option>
                            <option value="Coach">Coach</option>
                            <option value="Assistant Coach">Assistant Coach</option>
                            <option value="Manager">Manager</option>
                            <option value="Admin">Admin</option>
                          </select>
                        </div>
                      </div>

                      {passwordResetNotice && passwordResetNotice.uid === u.uid && (
                        <p className="text-[10px] font-bold text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
                          {passwordResetNotice.text}
                        </p>
                      )}

                      {/* Team assignments — compact preview, edit via the searchable widget above */}
                      {u.role !== 'Admin' && (
                        <div className="pt-2 border-t border-dashed border-gray-100">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-black uppercase text-gray-400">
                              Team Access ({u.teamIds.length})
                            </span>
                            <button
                              onClick={() => handleOpenAssignPanelForCoach(u.uid)}
                              className="text-[10px] font-black uppercase text-[var(--blue)] hover:underline cursor-pointer"
                            >
                              Manage →
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {u.teamIds.length === 0 && (
                              <span className="text-[10px] text-gray-400 font-bold">No teams assigned</span>
                            )}
                            {u.teamIds.slice(0, 3).map((tid, tIdx) => {
                              const t = teams.find((tm) => tm.id === tid);
                              return (
                                <span
                                  key={`assign-preview-${u.uid || 'user'}-${tid || 'team'}-${tIdx}`}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                    t?.isDemo
                                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                                      : 'bg-green-50 text-[#0E7A48] border-green-200'
                                  }`}
                                  title={t?.isDemo ? 'Temporary sandbox access — removed once a real team is assigned' : undefined}
                                >
                                  {t?.name || tid}
                                </span>
                              );
                            })}
                            {u.teamIds.length > 3 && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold border bg-gray-50 text-gray-500 border-gray-200">
                                +{u.teamIds.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Feature Permissions for this user */}
                      <div className="pt-2 border-t border-dashed border-gray-100">
                        <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                          <span className="text-[10px] font-black uppercase text-gray-500">
                            Turn On / Off Features for {u.name}
                          </span>
                          {u.role === 'Admin' ? (
                            <span className="text-[9px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded">
                              Admin Full Clearance
                            </span>
                          ) : (
                            <span className="text-[9px] text-gray-400 font-bold">
                              Click feature to enable or disable
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { key: 'training', label: 'Training Module', icon: <BookOpen className="w-3.5 h-3.5 text-indigo-600" /> },
                            { key: 'growth', label: 'Player Growth', icon: <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> },
                            { key: 'jarvis', label: 'JARVIS AI', icon: <Bot className="w-3.5 h-3.5 text-purple-600" /> },
                          ].map((feat) => {
                            const isAllowed = u.role === 'Admin' || (
                              u.allowedFeatures
                                ? u.allowedFeatures.includes(feat.key)
                                : (u.role === 'Coach' ? true : u.role === 'Assistant Coach' ? feat.key !== 'jarvis' : false)
                            );

                            return (
                              <button
                                key={`user-feat-${u.uid}-${feat.key}`}
                                disabled={u.role === 'Admin'}
                                onClick={() => handleToggleUserFeature(u.uid, feat.key)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed ${
                                  isAllowed
                                    ? 'bg-emerald-50 text-emerald-950 border-emerald-300 shadow-2xs'
                                    : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100 hover:text-gray-600'
                                }`}
                                title={u.role === 'Admin' ? 'Admins have full access' : `Turn ${feat.label} ${isAllowed ? 'OFF' : 'ON'} for ${u.name}`}
                              >
                                {feat.icon}
                                <span>{feat.label}</span>
                                <span className={`px-1.5 py-0.5 text-[9px] font-black uppercase rounded ${
                                  isAllowed ? 'bg-emerald-200 text-emerald-900' : 'bg-gray-200 text-gray-500'
                                }`}>
                                  {isAllowed ? 'ENABLED' : 'DISABLED'}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {passwordResetNotice && passwordResetNotice.uid === u.uid && (
                        <div className={`p-3 rounded-xl border text-xs font-semibold space-y-2 mt-2 ${
                          passwordResetNotice.status === 'success'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                            : passwordResetNotice.status === 'warning'
                            ? 'bg-amber-50 border-amber-200 text-amber-900'
                            : 'bg-red-50 border-red-200 text-red-900'
                        }`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5 font-extrabold text-xs">
                              <Mail className="w-4 h-4 shrink-0" />
                              <span>{passwordResetNotice.text}</span>
                            </div>
                            <button
                              onClick={() => setPasswordResetNotice(null)}
                              className="text-gray-400 hover:text-gray-600 cursor-pointer p-0.5"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {passwordResetNotice.details && (
                            <p className="text-[11px] leading-relaxed opacity-90">{passwordResetNotice.details}</p>
                          )}

                          {passwordResetNotice.link && (
                            <div className="pt-1.5 border-t border-black/10 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                              <input
                                type="text"
                                readOnly
                                value={passwordResetNotice.link}
                                onFocus={(e) => e.currentTarget.select()}
                                className="flex-1 min-w-0 bg-white/80 px-2 py-1 border border-black/10 rounded text-[10px] font-mono font-bold text-gray-700 focus:outline-none"
                              />
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(passwordResetNotice.link!);
                                  alert('Direct Password Reset link copied to clipboard!');
                                }}
                                className="px-2.5 py-1 text-[11px] font-bold bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 rounded flex items-center justify-center gap-1 shrink-0 cursor-pointer"
                              >
                                <Copy className="w-3 h-3" />
                                <span>Copy Reset Link</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          onClick={() => handleResetUserPassword(u)}
                          disabled={resettingPasswordUid === u.uid}
                          className="px-2.5 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg cursor-pointer disabled:opacity-50"
                        >
                          {resettingPasswordUid === u.uid ? 'Sending...' : 'Reset Password'}
                        </button>
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
                            <select
                              value={u.role}
                              onChange={(e) => handleChangeUserRole(u.uid, e.target.value)}
                              className="px-2 py-0.5 bg-white border border-blue-200 text-[var(--blue)] text-[10px] font-black rounded uppercase focus:outline-none cursor-pointer"
                            >
                              <option value="Provisional">Provisional</option>
                              <option value="Coach">Coach</option>
                              <option value="Assistant Coach">Assistant Coach</option>
                              <option value="Manager">Manager</option>
                              <option value="Admin">Admin</option>
                            </select>
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

                        {/* Feature Permissions for Pending Invite */}
                        <div className="pt-2 border-t border-dashed border-gray-100">
                          <span className="text-[9px] font-black uppercase text-gray-400 block mb-1">
                            Feature Access Permissions
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {[
                              { key: 'training', label: 'Training', icon: <BookOpen className="w-3 h-3 text-indigo-600" /> },
                              { key: 'growth', label: 'Player Growth', icon: <TrendingUp className="w-3 h-3 text-emerald-600" /> },
                              { key: 'jarvis', label: 'JARVIS AI', icon: <Bot className="w-3 h-3 text-purple-600" /> },
                            ].map((feat) => {
                              const isAllowed = u.role === 'Admin' || (
                                u.allowedFeatures
                                  ? u.allowedFeatures.includes(feat.key)
                                  : (u.role === 'Coach' ? true : u.role === 'Assistant Coach' ? feat.key !== 'jarvis' : false)
                              );

                              return (
                                <button
                                  key={`pending-feat-${u.uid}-${feat.key}`}
                                  disabled={u.role === 'Admin'}
                                  onClick={() => handleToggleUserFeature(u.uid, feat.key)}
                                  className={`px-2 py-0.5 rounded text-[9px] font-bold border transition flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed ${
                                    isAllowed
                                      ? 'bg-blue-50 text-blue-900 border-blue-200'
                                      : 'bg-gray-50 text-gray-400 border-gray-200 hover:text-gray-600'
                                  }`}
                                >
                                  {feat.icon}
                                  <span>{feat.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Quick copy invite actions */}
                        <div className="pt-3 border-t border-gray-100 space-y-2">
                          <span className="text-[9px] font-black uppercase text-gray-400 block">
                            Registration Link
                          </span>
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            <input
                              type="text"
                              readOnly
                              value={buildInviteLink(inviteCodeStr)}
                              onFocus={(e) => e.currentTarget.select()}
                              className="flex-1 min-w-0 bg-white px-2.5 py-1.5 border border-gray-200 rounded-lg text-[10px] font-mono font-bold text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-400 cursor-text"
                            />
                            <div className="flex gap-2 shrink-0">
                              <button
                                onClick={() => handleCopyLink(inviteCodeStr)}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg border flex items-center gap-1.5 transition-all cursor-pointer ${
                                  isCopied
                                    ? 'bg-green-600 text-white border-green-700'
                                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                                }`}
                              >
                                {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                <span>{isCopied ? 'Copied' : 'Copy Link'}</span>
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
                          <p className="text-[9px] text-gray-400 font-semibold">
                            Send this link to {u.name} directly (text, WhatsApp, etc.) if the invite email doesn't reach them — it registers them straight into this pending invite.
                          </p>
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

          {/* Jarvis Settings Sub-Tab Switcher */}
          <div className="flex bg-gray-100 p-1 rounded-2xl border border-gray-200/80 w-fit">
            <button
              onClick={() => setJarvisSubTab('keys')}
              className={`py-2 px-4 rounded-xl font-black text-xs transition flex items-center gap-2 cursor-pointer ${
                jarvisSubTab === 'keys'
                  ? 'bg-white text-[var(--navy)] shadow-xs'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Key className="w-3.5 h-3.5 text-amber-500" />
              <span>API Keys</span>
            </button>
            <button
              onClick={() => setJarvisSubTab('prompts')}
              className={`py-2 px-4 rounded-xl font-black text-xs transition flex items-center gap-2 cursor-pointer ${
                jarvisSubTab === 'prompts'
                  ? 'bg-white text-[var(--navy)] shadow-xs'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Bot className="w-3.5 h-3.5 text-indigo-500" />
              <span>Tactical Prompts</span>
            </button>
          </div>

          {/* SUB-SECTION: API Keys */}
          {jarvisSubTab === 'keys' && (
            <div className="space-y-5">
              <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 text-white p-6 rounded-3xl border border-indigo-800/40 shadow-xl relative overflow-hidden">
                <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="flex items-start gap-4 relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-400 p-0.5 shadow-lg shrink-0">
                    <div className="w-full h-full bg-indigo-950 rounded-[14px] flex items-center justify-center text-amber-300">
                      <Key className="w-6 h-6" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg md:text-xl font-black text-white tracking-tight">Jarvis AI Provider API Keys</h3>
                    <p className="text-xs text-indigo-200/80 font-medium mt-1 leading-relaxed max-w-2xl">
                      Add or update the API keys Jarvis uses for Claude and Gemini. Saved keys sync to your whole team via Firestore, so any coach on any device can use them once saved here - no redeploy needed.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 font-medium leading-relaxed">
                  <strong>Security note:</strong> keys entered here are stored in Firestore and sent from the browser with each Jarvis/Import request. Anyone who can read your Firestore database or inspect network traffic from a signed-in coach's device could see them. For production use, tightening <code className="bg-amber-100 px-1 py-0.5 rounded">firestore.rules</code> is strongly recommended - this panel is a convenience for quickly adding/rotating keys, not a substitute for a proper secrets manager.
                </p>
              </div>

              {keysSavedNotice && (
                <div className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
                  {keysSavedNotice}
                </div>
              )}

              {/* Claude / Anthropic Key */}
              <div className="bg-white p-5 rounded-2xl border border-[var(--line)] shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-gray-900">Claude (Anthropic)</h4>
                      <p className="text-[11px] text-gray-400 font-semibold">Used when the AI provider toggle is set to Claude</p>
                    </div>
                  </div>
                  {apiKeys?.anthropicApiKey && (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-700 border border-emerald-200">
                      Configured
                    </span>
                  )}
                </div>

                {apiKeys?.anthropicApiKey && (
                  <div className="flex items-center justify-between gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                    <span className="font-mono text-xs text-gray-600 truncate">{maskKey(apiKeys.anthropicApiKey)}</span>
                    <button
                      onClick={() => handleRemoveApiKey('anthropic')}
                      disabled={isSavingKeys}
                      className="text-[11px] font-bold text-red-600 hover:text-red-700 cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                )}

                <div className="flex items-stretch gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showAnthropicInput ? 'text' : 'password'}
                      value={anthropicInput}
                      onChange={(e) => setAnthropicInput(e.target.value)}
                      placeholder={apiKeys?.anthropicApiKey ? 'Enter a new key to replace it...' : 'sk-ant-...'}
                      className="w-full p-2.5 pr-10 text-xs border border-gray-200 bg-white rounded-xl text-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAnthropicInput((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showAnthropicInput ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 font-semibold">
                  Create a key at <span className="font-mono">console.anthropic.com</span>
                </p>
              </div>

              {/* Gemini Key */}
              <div className="bg-white p-5 rounded-2xl border border-[var(--line)] shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-gray-900">Gemini (Google)</h4>
                      <p className="text-[11px] text-gray-400 font-semibold">Used when the AI provider toggle is set to Gemini, and for Import with AI</p>
                    </div>
                  </div>
                  {apiKeys?.geminiApiKey && (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-700 border border-emerald-200">
                      Configured
                    </span>
                  )}
                </div>

                {apiKeys?.geminiApiKey && (
                  <div className="flex items-center justify-between gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                    <span className="font-mono text-xs text-gray-600 truncate">{maskKey(apiKeys.geminiApiKey)}</span>
                    <button
                      onClick={() => handleRemoveApiKey('gemini')}
                      disabled={isSavingKeys}
                      className="text-[11px] font-bold text-red-600 hover:text-red-700 cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                )}

                <div className="flex items-stretch gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showGeminiInput ? 'text' : 'password'}
                      value={geminiInput}
                      onChange={(e) => setGeminiInput(e.target.value)}
                      placeholder={apiKeys?.geminiApiKey ? 'Enter a new key to replace it...' : 'AIza...'}
                      className="w-full p-2.5 pr-10 text-xs border border-gray-200 bg-white rounded-xl text-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowGeminiInput((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showGeminiInput ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 font-semibold">
                  Create a key at <span className="font-mono">aistudio.google.com/app/apikey</span>
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSaveApiKeys}
                  disabled={isSavingKeys || (!anthropicInput.trim() && !geminiInput.trim())}
                  className="px-5 py-2.5 bg-[var(--navy)] hover:opacity-90 text-white font-black text-xs rounded-xl transition flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSavingKeys ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Save API Keys</span>
                    </>
                  )}
                </button>
              </div>

              {apiKeys?.updatedAt && (
                <p className="text-[10px] text-gray-400 font-semibold text-right">
                  Last updated {new Date(apiKeys.updatedAt).toLocaleString()}
                  {apiKeys.updatedBy ? ` by ${apiKeys.updatedBy}` : ''}
                </p>
              )}
            </div>
          )}

          {/* SUB-SECTION: Tactical Prompts (existing builder) */}
          {jarvisSubTab === 'prompts' && (
        <>
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
        </>
          )}
        </div>
      )}

      {/* SECTION 3: Notification Settings */}
      {adminSection === 'notifications' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-[var(--line)] shadow-xs">
            <h3 className="font-black text-sm text-[var(--navy)] flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-500" />
              <span>Notification Channels</span>
            </h3>
            <p className="text-xs text-gray-500 font-semibold mt-1 mb-4">
              Turn each notification channel on or off for the whole club.
            </p>

            <div className="space-y-3">
              {/* Email channel */}
              <div className="flex items-start justify-between gap-4 p-3.5 border border-gray-100 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <Mail className="w-4.5 h-4.5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-[var(--ink)]">Email</p>
                    <p className="text-[11px] text-gray-500 font-semibold leading-relaxed">
                      Coach invitations are sent by email through the SMTP server configured below. This is fully wired up and live.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggleNotificationChannel('emailEnabled')}
                  className={`shrink-0 w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    notificationSettings?.emailEnabled !== false ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      notificationSettings?.emailEnabled !== false ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* Pulse channel */}
              <div className="flex items-start justify-between gap-4 p-3.5 border border-gray-100 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                    <Radio className="w-4.5 h-4.5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-[var(--ink)] flex items-center gap-1.5">
                      Pulse
                      <span className="px-1.5 py-0.5 text-[8px] font-black bg-gray-100 text-gray-500 rounded uppercase">Preference only</span>
                    </p>
                    <p className="text-[11px] text-gray-500 font-semibold leading-relaxed">
                      In-app weekly activity digest (roster changes, upcoming games, pending invites). This toggle saves your preference now — the digest itself isn't generated yet, so nothing will be delivered until that's built.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggleNotificationChannel('pulseEnabled')}
                  className={`shrink-0 w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    notificationSettings?.pulseEnabled !== false ? 'bg-purple-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      notificationSettings?.pulseEnabled !== false ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* Push channel */}
              <div className="flex items-start justify-between gap-4 p-3.5 border border-gray-100 rounded-xl">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                    <Smartphone className="w-4.5 h-4.5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-extrabold text-[var(--ink)] flex items-center gap-1.5">
                      Push
                      <span className="px-1.5 py-0.5 text-[8px] font-black bg-gray-100 text-gray-500 rounded uppercase">Preference only</span>
                    </p>
                    <p className="text-[11px] text-gray-500 font-semibold leading-relaxed">
                      Mobile push notifications on iOS/Android. This toggle saves your preference now, but actually sending pushes needs Firebase Cloud Messaging / Apple Push credentials wired into the app first — not set up yet.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggleNotificationChannel('pushEnabled')}
                  className={`shrink-0 w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    notificationSettings?.pushEnabled ? 'bg-emerald-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      notificationSettings?.pushEnabled ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* SMTP configuration — moved in from the server .env file */}
          <div className="bg-white p-5 rounded-2xl border border-[var(--line)] shadow-xs space-y-4">
            <div>
              <h3 className="font-black text-sm text-[var(--navy)] flex items-center gap-2">
                <Key className="w-4 h-4 text-blue-500" />
                <span>Email (SMTP) Server Setup</span>
              </h3>
              <p className="text-xs text-gray-500 font-semibold mt-1">
                Configure your mail server (MailerSend, Gmail, SendGrid, Mailgun, Postmark, etc.) so password resets and coach invitations are sent directly to user inboxes.
              </p>
            </div>

            {/* Provider Quick Presets */}
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                Quick Setup Presets
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSmtpHostInput('smtp.mailersend.net');
                    setSmtpPortInput('587');
                    setSmtpSecureInput(false);
                    setNotifSavedNotice('Applied MailerSend SMTP preset. Enter your MailerSend Username, Password/Token, and verified From Address.');
                    setTimeout(() => setNotifSavedNotice(''), 6000);
                  }}
                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>MailerSend</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSmtpHostInput('smtp.gmail.com');
                    setSmtpPortInput('587');
                    setSmtpSecureInput(false);
                    setNotifSavedNotice('Applied Gmail SMTP preset. Make sure to use a Gmail App Password, not your regular password.');
                    setTimeout(() => setNotifSavedNotice(''), 6000);
                  }}
                  className="px-2.5 py-1.5 bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Gmail SMTP</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSmtpHostInput('smtp.sendgrid.net');
                    setSmtpPortInput('587');
                    setSmtpUserInput('apikey');
                    setSmtpSecureInput(false);
                    setNotifSavedNotice('Applied SendGrid preset. Username set to "apikey". Enter your SendGrid API key as the password.');
                    setTimeout(() => setNotifSavedNotice(''), 6000);
                  }}
                  className="px-2.5 py-1.5 bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>SendGrid</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">SMTP Host</label>
                <input
                  type="text"
                  value={smtpHostInput}
                  onChange={(e) => setSmtpHostInput(e.target.value)}
                  placeholder="smtp.yourprovider.com"
                  className="w-full px-3 py-2 text-sm font-semibold bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Port</label>
                <input
                  type="number"
                  value={smtpPortInput}
                  onChange={(e) => setSmtpPortInput(e.target.value)}
                  placeholder="587"
                  className="w-full px-3 py-2 text-sm font-semibold bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">SMTP Username</label>
                <input
                  type="text"
                  value={smtpUserInput}
                  onChange={(e) => setSmtpUserInput(e.target.value)}
                  placeholder="mailer@yourdomain.com"
                  className="w-full px-3 py-2 text-sm font-semibold bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">SMTP Password</label>
                <input
                  type="password"
                  value={smtpPassInput}
                  onChange={(e) => setSmtpPassInput(e.target.value)}
                  placeholder={notificationSettings?.smtpPass ? '•••••••• (saved — enter a new one to replace it)' : 'App password or SMTP password'}
                  className="w-full px-3 py-2 text-sm font-semibold bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">From Address</label>
                <input
                  type="text"
                  value={smtpFromInput}
                  onChange={(e) => setSmtpFromInput(e.target.value)}
                  placeholder="InterchangeIQ <mailer@yourdomain.com>"
                  className="w-full px-3 py-2 text-sm font-semibold bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <label className="flex items-center gap-2 sm:col-span-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={smtpSecureInput}
                  onChange={(e) => setSmtpSecureInput(e.target.checked)}
                  className="cursor-pointer"
                />
                <span className="text-xs font-bold text-gray-600">Use implicit TLS (only for port 465 — leave unchecked for 587/STARTTLS)</span>
              </label>
            </div>

            {notifSavedNotice && (
              <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-xs font-bold space-y-1">
                <div>{notifSavedNotice}</div>
                {notifSavedNotice.includes('Failed') && (
                  <p className="text-[11px] font-medium text-blue-700">
                    💡 <b>MailerSend Tip:</b> Container environments often block raw TCP ports 587/465. If using MailerSend, paste your MailerSend API Token (starts with <code className="bg-blue-100 px-1 py-0.5 rounded font-mono">mlsn.</code>) into the SMTP Password field. InterchangeIQ will automatically route over HTTPS port 443!
                  </p>
                )}
              </div>
            )}

            {smtpDebugLogs && smtpDebugLogs.length > 0 && (
              <div className="p-3 bg-gray-900 text-emerald-400 font-mono text-[11px] rounded-xl border border-gray-800 shadow-inner space-y-1 overflow-x-auto max-h-48">
                <div className="flex items-center justify-between text-gray-400 border-b border-gray-800 pb-1 text-[10px] font-bold uppercase tracking-wider">
                  <span>SMTP Connection Debug Log</span>
                  <button
                    type="button"
                    onClick={() => setSmtpDebugLogs(null)}
                    className="hover:text-white cursor-pointer"
                  >
                    Close Log
                  </button>
                </div>
                {smtpDebugLogs.map((logLine, idx) => (
                  <div key={idx} className="whitespace-pre-wrap">{logLine}</div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                onClick={handleSaveSmtpSettings}
                disabled={isSavingNotifications || !smtpHostInput.trim()}
                className="px-4 py-2 text-xs font-bold bg-[var(--blue)] text-white rounded-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {isSavingNotifications ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>Save SMTP Settings</span>
              </button>
              <button
                onClick={handleTestSmtpConnection}
                disabled={isTestingSmtp || (!smtpHostInput.trim() && !notificationSettings?.smtpHost && !smtpPassInput.startsWith('mlsn.'))}
                className="px-3.5 py-2 text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 rounded-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {isTestingSmtp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Radio className="w-3.5 h-3.5 text-emerald-600" />}
                <span>Test Connection</span>
              </button>
              {onOpenDebugModal && (
                <button
                  type="button"
                  onClick={onOpenDebugModal}
                  className="px-3.5 py-2 text-xs font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg cursor-pointer flex items-center gap-1.5"
                  title="Open Full System & Mail Debugger"
                >
                  <Activity className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Open System Debugger</span>
                </button>
              )}
              {notificationSettings?.smtpHost && (
                <button
                  onClick={handleClearSmtpSettings}
                  disabled={isSavingNotifications}
                  className="px-4 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg cursor-pointer disabled:opacity-40"
                >
                  Clear
                </button>
              )}
              {notificationSettings?.updatedAt && (
                <span className="text-[10px] text-gray-400 font-semibold ml-auto">
                  Last updated {new Date(notificationSettings.updatedAt).toLocaleString()}
                  {notificationSettings.updatedBy ? ` by ${notificationSettings.updatedBy}` : ''}
                </span>
              )}
            </div>

            <p className="text-[10px] text-gray-400 font-semibold border-t border-gray-100 pt-3">
              These settings are shared with every coach who has Admin access on this club and are sent to the server only when an invite email is triggered — the password is stored, not displayed, once saved. If left blank, the server falls back to its own SMTP_* / RESEND_API_KEY environment configuration (if any).
            </p>
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
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['Provisional', 'Coach', 'Assistant Coach', 'Manager', 'Admin'] as const).map((role, idx) => (
                    <button
                      key={`role-option-${role}-${idx}`}
                      type="button"
                      onClick={() => handleInviteRoleChange(role)}
                      className={`p-2 border rounded-xl flex flex-col items-center justify-center gap-1 transition cursor-pointer ${
                        inviteRole === role
                          ? 'border-[var(--blue)] bg-blue-50/20 text-[var(--blue)]'
                          : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <Shield className={`w-3.5 h-3.5 ${inviteRole === role ? 'text-[var(--blue)]' : 'text-gray-400'}`} />
                      <span className="text-[9px] font-black tracking-wider uppercase text-center">{role}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[9px] text-gray-400 mt-1 font-bold">
                  {inviteRole === 'Admin' && 'Admins possess full universal clearance across all rosters and features.'}
                  {inviteRole === 'Provisional' && 'Provisional users get temporary access to a sandbox Demo Team to explore InterchangeIQ. This is automatically replaced the moment they\'re assigned a real team.'}
                  {inviteRole === 'Coach' && 'Coaches have elevated access to Training, Growth, and Jarvis features.'}
                  {inviteRole === 'Assistant Coach' && 'Assistant Coaches manage lineups and rotations with restricted feature access.'}
                  {inviteRole === 'Manager' && 'Managers view stats and game plans without administrative profile edits.'}
                </p>
              </div>

              {inviteRole !== 'Admin' && inviteRole !== 'Provisional' && (
                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400">
                    Granted Feature Permissions
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'training', label: 'Training', desc: 'Drills & Plans', icon: <BookOpen className="w-3.5 h-3.5 text-indigo-600" /> },
                      { key: 'growth', label: 'Player Growth', desc: 'Assessments', icon: <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> },
                      { key: 'jarvis', label: 'JARVIS AI', desc: 'Tactical AI', icon: <Bot className="w-3.5 h-3.5 text-purple-600" /> },
                    ].map((feat) => {
                      const isChecked = inviteAllowedFeatures.includes(feat.key);
                      return (
                        <button
                          key={`invite-feat-${feat.key}`}
                          type="button"
                          onClick={() => {
                            setInviteAllowedFeatures((prev) =>
                              prev.includes(feat.key)
                                ? prev.filter((k) => k !== feat.key)
                                : [...prev, feat.key]
                            );
                          }}
                          className={`p-2.5 border rounded-xl flex flex-col items-start gap-1 transition cursor-pointer text-left ${
                            isChecked
                              ? 'border-blue-500 bg-blue-50/40 text-blue-900 shadow-2xs'
                              : 'border-gray-200 bg-white text-gray-400 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-1.5">
                              {feat.icon}
                              <span className="text-[10px] font-black tracking-wider uppercase">{feat.label}</span>
                            </div>
                            <span className={`w-2 h-2 rounded-full ${isChecked ? 'bg-blue-600' : 'bg-gray-300'}`} />
                          </div>
                          <span className="text-[9px] text-gray-500 font-semibold">{feat.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {inviteRole === 'Provisional' && (
                <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3 flex gap-2.5">
                  <UserCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-black text-blue-800 uppercase block">Demo Team Access</span>
                    <p className="text-[9px] text-blue-700 font-semibold leading-relaxed mt-0.5">
                      This user will be placed on the Demo Team so they can explore the app right away. As soon as you assign them to a real team from Coach & Team Assignments, Demo Team access is removed automatically.
                    </p>
                  </div>
                </div>
              )}

              {inviteRole !== 'Admin' && inviteRole !== 'Provisional' && (
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
                    {teams.filter((t) => !t.isDemo).map((t, tIdx) => {
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
                  disabled={isSendingInvite}
                  className="px-4 py-2 text-xs font-bold bg-[var(--blue)] hover:opacity-90 text-white rounded-xl cursor-pointer flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSendingInvite ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Generate & Send Invite</span>
                    </>
                  )}
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
