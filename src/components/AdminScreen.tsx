import React, { useState } from 'react';
import { TeamProfile, UserProfile } from '../types';
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
  UserCheck
} from 'lucide-react';

interface AdminScreenProps {
  teams: TeamProfile[];
  onUpdateTeams: (teams: TeamProfile[]) => void;
  users: UserProfile[];
  onUpdateUsers: (users: UserProfile[]) => void;
  activeTeamId: string | null;
  onSelectTeam: (teamId: string) => void;
  currentUserRole: string;
}

export default function AdminScreen({
  teams,
  onUpdateTeams,
  users,
  onUpdateUsers,
  activeTeamId,
  onSelectTeam,
  currentUserRole,
}: AdminScreenProps) {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'Coach' | 'Manager' | 'Admin'>('Coach');
  const [inviteSelectedTeams, setInviteSelectedTeams] = useState<string[]>(activeTeamId ? [activeTeamId] : []);
  const [activeUserSubTab, setActiveUserSubTab] = useState<'active' | 'pending'>('active');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

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

  const activeCoaches = users.filter((u) => u.status !== 'Pending');
  const pendingInvites = users.filter((u) => u.status === 'Pending');

  return (
    <div className="space-y-6">
      {/* Top action header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[var(--line)] shadow-xs">
        <div>
          <h2 className="text-xl font-black text-[var(--navy)] tracking-tight">Admin Dashboard</h2>
          <p className="text-xs text-[var(--muted)] font-semibold mt-1">
            Configure squads, team licenses, and coach/manager credentials
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
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

          <div className="space-y-2">
            {teams.map((t, index) => {
              const isActive = activeTeamId === t.id;
              return (
                <div
                  key={`team-profile-${t.id || 'new'}-${index}`}
                  className={`p-4 border rounded-xl flex items-center justify-between gap-4 transition ${
                    isActive ? 'border-[var(--green)] bg-green-50/50' : 'border-gray-100 bg-white hover:bg-gray-50'
                  }`}
                >
                  <div>
                    <b className="text-sm font-extrabold text-[var(--ink)] block">{t.name}</b>
                    <span className="text-[10px] font-bold text-gray-500">
                      ID: {t.id} {isActive ? '• Active selection' : ''}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => onSelectTeam(t.id)}
                      className={`px-3 py-1.5 text-[11px] font-bold rounded-lg border transition cursor-pointer ${
                        isActive
                          ? 'bg-green-600 text-white border-green-700'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {isActive ? 'Opened' : 'Open'}
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
    </div>
  );
}
