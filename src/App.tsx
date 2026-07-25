import React, { useState, useEffect, useRef } from 'react';
import {
  Player, Score, Rotation, Plan, LineupTemplate, GameInfo, GameHistory,
  Drill, TrainingState, AuditLogEntry, TeamProfile, UserProfile, SkillAssessment
} from './types';
import { DEFAULT_PLAYERS, DEFAULT_DRILLS, DEFAULT_GROWTH_RECORDS, APP_VERSION } from './constants';

// Firebase Integrations
import { auth, db, signInAnonymously, onAuthStateChanged, User } from './lib/firebase';
import { doc, setDoc, getDoc, onSnapshot, collection, deleteDoc, getDocs } from 'firebase/firestore';

// Screens imports
import SummaryScreen from './components/SummaryScreen';
import JarvisScreen from './components/JarvisScreen';
import GameDayScreen from './components/GameDayScreen';
import RotationsScreen from './components/RotationsScreen';
import TeamScreen from './components/TeamScreen';
import PlayerGrowthScreen from './components/PlayerGrowthScreen';
import HistoryScreen from './components/HistoryScreen';
import ScoringScreen from './components/ScoringScreen';
import TrainingScreen from './components/TrainingScreen';
import AdminScreen from './components/AdminScreen';
import SettingsScreen from './components/SettingsScreen';
import LoginScreen from './components/LoginScreen';

// Lucide Icons
import {
  LayoutDashboard, Play, RefreshCw, Users, History, BarChart3,
  BookOpen, Shield, Settings, Menu, ChevronLeft, ChevronRight, X, Download, Lock, LogOut, TrendingUp, ShieldAlert, Bot, Landmark
} from 'lucide-react';

// Helper functions to serialize/deserialize Drill steps to avoid nested arrays in Firestore
const sanitizeDrillList = (drillsList: any[]) => {
  return (drillsList || []).map((drill: any) => ({
    id: drill.id || '',
    title: drill.title || '',
    cat: drill.cat || 'General',
    mins: Number(drill.mins) || 10,
    players: drill.players || 'Custom',
    overview: drill.overview || '',
    steps: (drill.steps || []).map((step: any) => {
      if (Array.isArray(step)) {
        return {
          title: step[0] || '',
          content: step[1] || ''
        };
      } else if (step && typeof step === 'object') {
        return {
          title: step.title || '',
          content: step.content || ''
        };
      }
      return { title: '', content: '' };
    })
  }));
};

const parseDrillList = (drillsList: any[]) => {
  return (drillsList || []).map((d: any) => ({
    id: d.id,
    title: d.title || '',
    cat: d.cat || 'General',
    mins: Number(d.mins) || 10,
    players: d.players || 'Custom',
    overview: d.overview || '',
    steps: Array.isArray(d.steps)
      ? d.steps.map((step: any) => {
          if (Array.isArray(step)) {
            return [step[0] || '', step[1] || ''] as [string, string];
          } else if (step && typeof step === 'object') {
            return [step.title || '', step.content || ''] as [string, string];
          }
          return ['', ''] as [string, string];
        })
      : [['Step', '']]
  }));
};

export default function App() {
  // Navigation active tab
  const [activeTab, setActiveTab] = useState<string>('summary');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Global Squad / Match stats
  const [players, setPlayers] = useState<Player[]>(() => {
    try {
      const saved = localStorage.getItem('iiq_players');
      const parsed = saved ? JSON.parse(saved) : null;
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      console.warn("Failed to parse players:", e);
    }
    return DEFAULT_PLAYERS;
  });

  const [lineup, setLineup] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('iiq_lineup');
      const parsed = saved ? JSON.parse(saved) : null;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
    } catch (e) {
      console.warn("Failed to parse lineup:", e);
    }
    return {};
  });

  const [score, setScore] = useState<Score>(() => {
    try {
      const saved = localStorage.getItem('iiq_score');
      const parsed = saved ? JSON.parse(saved) : null;
      if (parsed && typeof parsed === 'object' && 'quarter' in parsed) return parsed;
    } catch (e) {
      console.warn("Failed to parse score:", e);
    }
    return {
      quarter: 1,
      home: { goals: 0, behinds: 0, quarters: [{ g: 0, b: 0 }, { g: 0, b: 0 }, { g: 0, b: 0 }, { g: 0, b: 0 }] },
      away: { goals: 0, behinds: 0, quarters: [{ g: 0, b: 0 }, { g: 0, b: 0 }, { g: 0, b: 0 }, { g: 0, b: 0 }] },
    };
  });

  const [gameInfo, setGameInfo] = useState<GameInfo>(() => {
    try {
      const saved = localStorage.getItem('iiq_game_info');
      const parsed = saved ? JSON.parse(saved) : null;
      if (parsed && typeof parsed === 'object') return parsed;
    } catch (e) {
      console.warn("Failed to parse gameInfo:", e);
    }
    return { team: 'QUEENSLAND', round: 'Round 1', date: new Date().toISOString().slice(0, 10) };
  });

  const [rotations, setRotations] = useState<Rotation[]>(() => {
    try {
      const saved = localStorage.getItem('iiq_rotations');
      const parsed = saved ? JSON.parse(saved) : null;
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      console.warn("Failed to parse rotations:", e);
    }
    return [];
  });

  const [plans, setPlans] = useState<Plan[]>(() => {
    try {
      const saved = localStorage.getItem('iiq_plans');
      const parsed = saved ? JSON.parse(saved) : null;
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      console.warn("Failed to parse plans:", e);
    }
    return [{ id: 'plan1', name: 'Q1 Rotation' }];
  });

  const [activePlanIds, setActivePlanIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('iiq_active_plan_ids');
      const parsed = saved ? JSON.parse(saved) : null;
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      console.warn("Failed to parse activePlanIds:", e);
    }
    return ['plan1'];
  });

  const [history, setHistory] = useState<GameHistory[]>(() => {
    try {
      const saved = localStorage.getItem('iiq_history');
      const parsed = saved ? JSON.parse(saved) : null;
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      console.warn("Failed to parse history:", e);
    }
    return [];
  });

  // Theme states
  const [currentTheme, setCurrentTheme] = useState<string>(() => {
    return localStorage.getItem('iiq_theme') || 'classic';
  });

  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem('iiq_username') || 'Coach Andrew';
  });

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem('iiq_audit_logs');
      const parsed = saved ? JSON.parse(saved) : null;
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      console.warn("Failed to parse auditLogs:", e);
    }
    return [];
  });

  // Training / Drills States
  const [drills, setDrills] = useState<Drill[]>(() => {
    try {
      const saved = localStorage.getItem('iiq_drills');
      const parsed = saved ? JSON.parse(saved) : null;
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      console.warn("Failed to parse drills:", e);
    }
    return DEFAULT_DRILLS;
  });

  // Player Growth & Progression Testing Records
  const [growthRecords, setGrowthRecords] = useState<SkillAssessment[]>(() => {
    try {
      const saved = localStorage.getItem('iiq_growth_records');
      const parsed = saved ? JSON.parse(saved) : null;
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      console.warn("Failed to parse growthRecords:", e);
    }
    return DEFAULT_GROWTH_RECORDS;
  });

  const [trainingState, setTrainingState] = useState<TrainingState>(() => {
    try {
      const saved = localStorage.getItem('iiq_training_state');
      const parsed = saved ? JSON.parse(saved) : null;
      if (parsed && typeof parsed === 'object') return parsed;
    } catch (e) {
      console.warn("Failed to parse trainingState:", e);
    }
    return {
      view: 'library',
      filter: 'All',
      activeId: 'one-v-one-kick-tennis',
      step: 0,
      motionPaused: false,
      plans: [],
      activePlanId: null,
    };
  });

  // Admin database states
  const [teams, setTeams] = useState<TeamProfile[]>(() => {
    try {
      const saved = localStorage.getItem('iiq_teams');
      const parsed = saved ? JSON.parse(saved) : null;
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      console.warn("Failed to parse teams:", e);
    }
    return [{ id: 'team1', name: 'Valiants Squad', createdAt: Date.now() }];
  });

  const [users, setUsers] = useState<UserProfile[]>(() => {
    try {
      const saved = localStorage.getItem('iiq_users');
      const parsed = saved ? JSON.parse(saved) : null;
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      console.warn("Failed to parse users:", e);
    }
    return [
      { uid: 'u1', email: 'coach@example.com', name: 'Coach Andrew', role: 'Admin', teamIds: ['team1'] }
    ];
  });

  const [activeTeamId, setActiveTeamId] = useState<string | null>(() => {
    return localStorage.getItem('iiq_active_team_id') || 'team1';
  });

  // Local modals triggers
  const [showLoadLineupModal, setShowLoadLineupModal] = useState(false);
  const [showNewGameModal, setShowNewGameModal] = useState(false);
  const [savedLineups, setSavedLineups] = useState<LineupTemplate[]>(() => {
    try {
      const saved = localStorage.getItem('iiq_saved_lineups');
      const parsed = saved ? JSON.parse(saved) : null;
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      console.warn("Failed to parse savedLineups:", e);
    }
    return [];
  });

  // Load Lineup dialog states
  const [formNewGameOpponent, setFormNewGameOpponent] = useState('');
  const [formNewGameRound, setFormNewGameRound] = useState('Round 1');
  const [formNewGameDate, setFormNewGameDate] = useState(new Date().toISOString().slice(0, 10));
  const [formNewGameLineupId, setFormNewGameLineupId] = useState('');

  // Selected player ID for deep linking profile card
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  // Passkey Biometrics Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('iiq_authenticated') === 'true';
  });

  // Session Inactivity Timeout state
  const [isTimedOut, setIsTimedOut] = useState<boolean>(() => {
    return localStorage.getItem('iiq_session_timed_out') === 'true';
  });

  // Sound & Vibration State (Persisted in localStorage)
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('iiq_sound_enabled');
    return saved !== null ? saved === 'true' : true;
  });
  const [soundVolume, setSoundVolume] = useState<number>(() => {
    const saved = localStorage.getItem('iiq_sound_volume');
    return saved !== null ? parseFloat(saved) : 0.8;
  });
  const [soundTone, setSoundTone] = useState<string>(() => {
    return localStorage.getItem('iiq_sound_tone') || 'acoustic';
  });
  const [hapticEnabled, setHapticEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('iiq_haptic_enabled');
    return saved !== null ? saved === 'true' : true;
  });
  const [hapticPattern, setHapticPattern] = useState<string>(() => {
    return localStorage.getItem('iiq_haptic_pattern') || 'pulse';
  });

  // Firebase integration states
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [cloudConnected, setCloudConnected] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [isSyncingFromServer, setIsSyncingFromServer] = useState(false);
  const isSyncingFromServerRef = useRef(false);
  const currentTeamSyncedIdRef = useRef<string | null>(null);

  // Switch active team
  const handleSwitchTeam = (teamId: string) => {
    if (!teamId) return;
    setActiveTeamId(teamId);
    localStorage.setItem('iiq_active_team_id', teamId);
  };

  // Real-time Firestore teams collection subscriber
  useEffect(() => {
    const teamsRef = collection(db, 'teams');
    const unsubscribe = onSnapshot(teamsRef, (snapshot) => {
      const teamsList: TeamProfile[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const teamId = data.id || docSnap.id;
        if (teamId) {
          teamsList.push({
            id: teamId,
            name: data.name || 'Unnamed Squad',
            createdAt: typeof data.createdAt === 'number' && data.createdAt > 0 ? data.createdAt : 0,
          });
        }
      });
      if (teamsList.length > 0) {
        // Sort teams deterministically: highest createdAt first, then alphabetically by name/id
        teamsList.sort((a, b) => {
          if ((b.createdAt || 0) !== (a.createdAt || 0)) {
            return (b.createdAt || 0) - (a.createdAt || 0);
          }
          return a.id.localeCompare(b.id);
        });

        // Only update state if team list actually changed to avoid re-render loops
        setTeams((prevTeams) => {
          if (Array.isArray(prevTeams) && JSON.stringify(prevTeams) === JSON.stringify(teamsList)) {
            return prevTeams;
          }
          localStorage.setItem('iiq_teams', JSON.stringify(teamsList));
          return teamsList;
        });
      }
    }, (error) => {
      console.warn("Teams collection listener notice:", error.message);
    });

    return () => unsubscribe();
  }, []);

  // Ensure activeTeamId points to a valid team in teams array
  useEffect(() => {
    if (Array.isArray(teams) && teams.length > 0) {
      if (!activeTeamId) {
        handleSwitchTeam(teams[0].id);
      } else {
        const exists = teams.some(t => t.id === activeTeamId);
        if (!exists) {
          handleSwitchTeam(teams[0].id);
        }
      }
    }
  }, [teams, activeTeamId]);

  // Sync team updates and deletions to Firestore
  const handleUpdateTeams = async (newTeamsList: TeamProfile[]) => {
    if (!Array.isArray(newTeamsList)) return;
    const currentTeamIds = new Set(newTeamsList.map(t => t.id));
    const previousTeams = Array.isArray(teams) ? teams : [];
    
    // 1. Delete removed team documents from Firestore
    const deletedTeams = previousTeams.filter(t => !currentTeamIds.has(t.id));
    for (const deleted of deletedTeams) {
      await deleteDoc(doc(db, 'teams', deleted.id)).catch(err => console.warn("Error deleting team doc from Firestore:", err));
    }

    // 2. Unconditionally set/merge each team in newTeamsList to Firestore
    for (const t of newTeamsList) {
      const teamDocRef = doc(db, 'teams', t.id);
      await setDoc(teamDocRef, {
        id: t.id,
        name: t.name,
        createdAt: t.createdAt || Date.now(),
        updatedAt: Date.now()
      }, { merge: true }).catch(err => console.warn("Error saving team doc to Firestore:", err));
    }

    setTeams(newTeamsList);
    localStorage.setItem('iiq_teams', JSON.stringify(newTeamsList));

    // If active team was deleted, select the first remaining team
    if (activeTeamId && !currentTeamIds.has(activeTeamId)) {
      const nextActiveId = newTeamsList.length > 0 ? newTeamsList[0].id : null;
      if (nextActiveId) {
        handleSwitchTeam(nextActiveId);
      }
    }
  };

  // Dedicated Admin Team Sync: pushes local teams & pulls all remote teams from Firestore
  const handleForceSyncTeams = async (): Promise<{ success: boolean; teamCount: number; message: string }> => {
    try {
      setIsSyncingFromServer(true);
      isSyncingFromServerRef.current = true;

      const currentTeams = Array.isArray(teams) ? teams : [];

      // 1. Push all local teams to Firestore
      for (const t of currentTeams) {
        const teamDocRef = doc(db, 'teams', t.id);
        if (t.id === activeTeamId) {
          const fullData = JSON.parse(JSON.stringify({
            id: t.id,
            name: t.name,
            createdAt: t.createdAt || Date.now(),
            players: Array.isArray(players) ? players : [],
            lineup,
            score,
            gameInfo,
            rotations,
            plans,
            history,
            savedLineups,
            drills: sanitizeDrillList(drills),
            growthRecords,
            updatedAt: Date.now()
          }));
          await setDoc(teamDocRef, fullData, { merge: true });
        } else {
          await setDoc(teamDocRef, {
            id: t.id,
            name: t.name,
            createdAt: t.createdAt || Date.now(),
            updatedAt: Date.now()
          }, { merge: true });
        }
      }

      // 2. Query ALL team docs from Firestore
      const querySnap = await getDocs(collection(db, 'teams'));
      const teamMap = new Map<string, TeamProfile>();
      currentTeams.forEach(t => teamMap.set(t.id, t));

      querySnap.forEach((docSnap) => {
        const data = docSnap.data();
        const teamId = data.id || docSnap.id;
        if (teamId) {
          teamMap.set(teamId, {
            id: teamId,
            name: data.name || 'Unnamed Squad',
            createdAt: data.createdAt || Date.now(),
          });
        }
      });

      const mergedList = Array.from(teamMap.values());
      mergedList.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      setTeams(mergedList);
      localStorage.setItem('iiq_teams', JSON.stringify(mergedList));

      setLastSyncedAt(Date.now());
      setCloudConnected(true);
      isSyncingFromServerRef.current = false;
      setIsSyncingFromServer(false);

      return {
        success: true,
        teamCount: mergedList.length,
        message: `Successfully synced ${mergedList.length} team(s) with the Cloud database! Mobile & desktop devices can now switch between all these teams.`
      };
    } catch (err: any) {
      console.warn("Error force syncing teams:", err);
      isSyncingFromServerRef.current = false;
      setIsSyncingFromServer(false);
      return {
        success: false,
        teamCount: teams.length,
        message: `Sync warning: ${err?.message || 'Could not connect to Cloud database.'}`
      };
    }
  };

  // Manual Force Sync function
  const handleForceSync = async (): Promise<boolean> => {
    if (!activeTeamId) return false;
    try {
      const docRef = doc(db, 'teams', activeTeamId);
      const currentTeams = Array.isArray(teams) ? teams : [];
      const teamName = currentTeams.find(t => t.id === activeTeamId)?.name || 'New Team';
      const cleanData = JSON.parse(JSON.stringify({
        id: activeTeamId,
        name: teamName,
        players: Array.isArray(players) ? players : [],
        lineup,
        score,
        gameInfo,
        rotations,
        plans,
        history,
        savedLineups,
        drills: sanitizeDrillList(drills),
        growthRecords,
        updatedAt: Date.now()
      }));
      await setDoc(docRef, cleanData);
      setLastSyncedAt(Date.now());
      setCloudConnected(true);
      return true;
    } catch (err: any) {
      console.warn("Manual force sync error:", err);
      setCloudConnected(false);
      return false;
    }
  };

  // Invite acceptance states
  const [pendingInviteToAccept, setPendingInviteToAccept] = useState<UserProfile | null>(null);
  const [acceptingInviteName, setAcceptingInviteName] = useState('');
  const [isAcceptingInvite, setIsAcceptingInvite] = useState(false);

  // Theme attribute controller
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme === 'classic' ? '' : currentTheme);
    localStorage.setItem('iiq_theme', currentTheme);
  }, [currentTheme]);

  // Sync state modifications to localStorage
  useEffect(() => { localStorage.setItem('iiq_players', JSON.stringify(players)); }, [players]);
  useEffect(() => { localStorage.setItem('iiq_lineup', JSON.stringify(lineup)); }, [lineup]);
  useEffect(() => { localStorage.setItem('iiq_score', JSON.stringify(score)); }, [score]);
  useEffect(() => { localStorage.setItem('iiq_game_info', JSON.stringify(gameInfo)); }, [gameInfo]);
  useEffect(() => { localStorage.setItem('iiq_rotations', JSON.stringify(rotations)); }, [rotations]);
  useEffect(() => { localStorage.setItem('iiq_plans', JSON.stringify(plans)); }, [plans]);
  useEffect(() => { localStorage.setItem('iiq_active_plan_ids', JSON.stringify(activePlanIds)); }, [activePlanIds]);
  useEffect(() => { localStorage.setItem('iiq_history', JSON.stringify(history)); }, [history]);
  useEffect(() => { localStorage.setItem('iiq_username', userName); }, [userName]);
  useEffect(() => { localStorage.setItem('iiq_audit_logs', JSON.stringify(auditLogs)); }, [auditLogs]);
  useEffect(() => { localStorage.setItem('iiq_drills', JSON.stringify(drills)); }, [drills]);
  useEffect(() => { localStorage.setItem('iiq_growth_records', JSON.stringify(growthRecords)); }, [growthRecords]);
  useEffect(() => { localStorage.setItem('iiq_training_state', JSON.stringify(trainingState)); }, [trainingState]);
  useEffect(() => { localStorage.setItem('iiq_teams', JSON.stringify(teams)); }, [teams]);
  useEffect(() => { localStorage.setItem('iiq_users', JSON.stringify(users)); }, [users]);
  useEffect(() => { if (activeTeamId) localStorage.setItem('iiq_active_team_id', activeTeamId); }, [activeTeamId]);
  useEffect(() => { localStorage.setItem('iiq_saved_lineups', JSON.stringify(savedLineups)); }, [savedLineups]);

  // Sync sound & haptic preferences to localStorage
  useEffect(() => { localStorage.setItem('iiq_sound_enabled', String(soundEnabled)); }, [soundEnabled]);
  useEffect(() => { localStorage.setItem('iiq_sound_volume', String(soundVolume)); }, [soundVolume]);
  useEffect(() => { localStorage.setItem('iiq_sound_tone', soundTone); }, [soundTone]);
  useEffect(() => { localStorage.setItem('iiq_haptic_enabled', String(hapticEnabled)); }, [hapticEnabled]);
  useEffect(() => { localStorage.setItem('iiq_haptic_pattern', hapticPattern); }, [hapticPattern]);

  // Firebase auth, profile sync, and session initialization
  useEffect(() => {
    let active = true;

    const handleAuthenticatedUser = (user: User) => {
      if (!active) return;
      setCurrentUser(user);
      
      // ONLY write user profile records to Firestore for registered non-anonymous users with emails.
      // Guest / anonymous sessions must NOT create dummy 'anonymous@interchangeiq.com' documents in Firestore.
      if (user.email && !user.isAnonymous) {
        const userRef = doc(db, 'users', user.uid);
        getDoc(userRef).then((snap) => {
          if (!active) return;
          if (!snap.exists()) {
            setDoc(userRef, {
              uid: user.uid,
              email: user.email,
              name: userName || 'Coach Andrew',
              role: 'Admin',
              teamIds: [activeTeamId || 'team1']
            }).catch(e => console.warn("Error setting user profile in Firestore:", e.message));
          }
        }).catch(e => console.warn("Error getting user profile from Firestore:", e.message));
      }
    };

    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        handleAuthenticatedUser(user);
      } else {
        // Only trigger anonymous sign-in if no active Firebase Auth session exists
        signInAnonymously(auth)
          .then((cred) => {
            if (active) console.log('Firebase Anonymous Session Active:', cred.user.uid);
          })
          .catch((err) => {
            console.warn('Firebase Auth fallback to local mode:', err.message);
            const fallbackUid = localStorage.getItem('iiq_fallback_uid') || `local_${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem('iiq_fallback_uid', fallbackUid);
            
            const fallbackUser = {
              uid: fallbackUid,
              email: '',
              displayName: userName || 'Coach Andrew',
              isAnonymous: true,
            } as any;

            if (active) {
              setCurrentUser(fallbackUser);
            }
          });
      }
    });

    return () => {
      active = false;
      unsub();
    };
  }, [userName]);

  // Real-time Firestore users synchronization
  useEffect(() => {
    const usersRef = collection(db, 'users');
    const unsubscribe = onSnapshot(usersRef, (snapshot) => {
      const usersList: UserProfile[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        usersList.push({
          uid: data.uid,
          email: data.email,
          name: data.name,
          role: data.role,
          teamIds: data.teamIds || [],
          status: data.status,
          invitedBy: data.invitedBy,
          invitedAt: data.invitedAt,
          inviteCode: data.inviteCode,
        });
      });
      if (snapshot.size > 0) {
        setUsers((prevUsers) => {
          if (Array.isArray(prevUsers) && JSON.stringify(prevUsers) === JSON.stringify(usersList)) {
            return prevUsers;
          }
          return usersList;
        });
      }
    }, (error) => {
      console.warn("Error subscribing to users collection:", error.message);
    });

    return () => unsubscribe();
  }, []);

  // Check for URL ?invite=<code> parameter on mount and when users list is populated
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteCode = params.get('invite');
    if (!inviteCode || !Array.isArray(users) || users.length === 0) return;

    const matchedInvite = users.find(u => u.inviteCode === inviteCode && u.status === 'Pending');
    if (matchedInvite && !pendingInviteToAccept) {
      setPendingInviteToAccept(matchedInvite);
      setAcceptingInviteName(matchedInvite.name);
    }
  }, [users, pendingInviteToAccept]);

  const handleAcceptInviteConfirm = async () => {
    if (!pendingInviteToAccept) return;
    if (!acceptingInviteName.trim()) {
      alert('Please enter your full name.');
      return;
    }

    setIsAcceptingInvite(true);
    try {
      const uid = currentUser?.uid || `local_${Math.random().toString(36).substr(2, 9)}`;
      
      // Write new active user profile to Firestore (associated with active authenticated uid)
      await setDoc(doc(db, 'users', uid), {
        uid,
        email: pendingInviteToAccept.email,
        name: acceptingInviteName.trim(),
        role: pendingInviteToAccept.role,
        teamIds: pendingInviteToAccept.teamIds || [],
        status: 'Active',
      });

      // Delete the temporary invitation record
      await deleteDoc(doc(db, 'users', pendingInviteToAccept.uid));

      // Update local settings & active user representation
      setUserName(acceptingInviteName.trim());
      localStorage.setItem('iiq_username', acceptingInviteName.trim());

      if (pendingInviteToAccept.teamIds && pendingInviteToAccept.teamIds.length > 0) {
        const assignedTeamId = pendingInviteToAccept.teamIds[0];
        setActiveTeamId(assignedTeamId);
        localStorage.setItem('iiq_active_team_id', assignedTeamId);
      }

      logAudit(`Accepted invitation as ${pendingInviteToAccept.role} (${acceptingInviteName.trim()})`);
      alert(`Welcome, ${acceptingInviteName.trim()}! Your invitation has been successfully accepted.`);

      // Clear the query parameter from address bar
      const url = new URL(window.location.href);
      url.searchParams.delete('invite');
      window.history.replaceState({}, document.title, url.toString());

      setPendingInviteToAccept(null);
    } catch (err: any) {
      console.error("Error accepting invitation:", err);
      alert(`Failed to accept invitation: ${err.message}`);
    } finally {
      setIsAcceptingInvite(false);
    }
  };

  const handleDeclineInvite = () => {
    // Clear URL param without deleting invitation
    const url = new URL(window.location.href);
    url.searchParams.delete('invite');
    window.history.replaceState({}, document.title, url.toString());
    setPendingInviteToAccept(null);
  };

  const handleUpdateUsers = async (newUsers: UserProfile[]) => {
    if (!Array.isArray(newUsers)) return;
    // Sync updates and deletions directly to Firestore
    const currentUids = new Set(newUsers.map(u => u.uid));
    const currentUsers = Array.isArray(users) ? users : [];
    const deletedUsers = currentUsers.filter(u => !currentUids.has(u.uid));

    for (const u of deletedUsers) {
      await deleteDoc(doc(db, 'users', u.uid)).catch(e => console.warn("Error deleting user from Firestore:", e));
    }

    for (const u of newUsers) {
      const oldU = currentUsers.find(old => old.uid === u.uid);
      if (!oldU || JSON.stringify(oldU) !== JSON.stringify(u)) {
        await setDoc(doc(db, 'users', u.uid), {
          uid: u.uid,
          email: u.email,
          name: u.name,
          role: u.role,
          teamIds: u.teamIds || [],
          status: u.status || 'Active',
          invitedBy: u.invitedBy || '',
          invitedAt: u.invitedAt || 0,
          inviteCode: u.inviteCode || '',
        }).catch(e => console.warn("Error syncing user to Firestore:", e));
      }
    }

    setUsers(newUsers);
  };

  // Helper to generate a fresh, team-isolated squad (empty by default for new teams)
  const createFreshSquadForTeam = (_teamId: string): Player[] => {
    return [];
  };

  // Real-time Firestore document subscriber (Downstream sync)
  useEffect(() => {
    if (!activeTeamId) return;

    setCloudConnected(false);
    // Block upstream sync while changing active team
    isSyncingFromServerRef.current = true;
    setIsSyncingFromServer(true);

    const docRef = doc(db, 'teams', activeTeamId);

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Mark that we are applying remote updates using ref and state
        isSyncingFromServerRef.current = true;
        setIsSyncingFromServer(true);

        if (data.players && Array.isArray(data.players) && data.players.length > 0) {
          setPlayers(data.players);
        } else {
          setPlayers(createFreshSquadForTeam(activeTeamId));
        }
        if (data.lineup && typeof data.lineup === 'object' && !Array.isArray(data.lineup)) setLineup(data.lineup);
        else setLineup({});

        if (data.score && typeof data.score === 'object' && !Array.isArray(data.score)) setScore(data.score);
        if (data.gameInfo && typeof data.gameInfo === 'object' && !Array.isArray(data.gameInfo)) setGameInfo(data.gameInfo);
        if (data.rotations && Array.isArray(data.rotations)) setRotations(data.rotations); else setRotations([]);
        if (data.plans && Array.isArray(data.plans)) setPlans(data.plans);
        if (data.history && Array.isArray(data.history)) setHistory(data.history); else setHistory([]);
        if (data.savedLineups && Array.isArray(data.savedLineups)) setSavedLineups(data.savedLineups); else setSavedLineups([]);
        if (data.drills && Array.isArray(data.drills)) setDrills(parseDrillList(data.drills));
        if (data.growthRecords && Array.isArray(data.growthRecords)) setGrowthRecords(data.growthRecords);

        setLastSyncedAt(data.updatedAt || Date.now());
        setCloudConnected(true);

        // Mark activeTeamId as fully downloaded
        currentTeamSyncedIdRef.current = activeTeamId;

        // Reset the server-sync flag after states have processed
        setTimeout(() => {
          isSyncingFromServerRef.current = false;
          setIsSyncingFromServer(false);
        }, 800);
      } else {
        // Document does not exist in Firestore yet (new team). We create a fresh isolated squad!
        setCloudConnected(true);
        setLastSyncedAt(Date.now());
        const currentTeams = Array.isArray(teams) ? teams : [];
        const freshPlayers = createFreshSquadForTeam(activeTeamId);
        const initialData = JSON.parse(JSON.stringify({
          id: activeTeamId,
          name: currentTeams.find(t => t.id === activeTeamId)?.name || 'New Team',
          players: freshPlayers,
          lineup: {},
          score: {
            quarter: 1,
            home: { goals: 0, behinds: 0, quarters: [{ g: 0, b: 0 }, { g: 0, b: 0 }, { g: 0, b: 0 }, { g: 0, b: 0 }] },
            away: { goals: 0, behinds: 0, quarters: [{ g: 0, b: 0 }, { g: 0, b: 0 }, { g: 0, b: 0 }, { g: 0, b: 0 }] },
          },
          gameInfo,
          rotations: [],
          plans: [{ id: 'plan1', name: 'Q1 Rotation' }],
          history: [],
          savedLineups: [],
          drills: sanitizeDrillList(drills),
          growthRecords,
          updatedAt: Date.now()
        }));

        setPlayers(freshPlayers);
        setLineup({});
        setSavedLineups([]);
        setHistory([]);
        setRotations([]);

        setDoc(docRef, initialData).catch(err => console.warn("Error creating team doc:", err.message));

        currentTeamSyncedIdRef.current = activeTeamId;

        setTimeout(() => {
          isSyncingFromServerRef.current = false;
          setIsSyncingFromServer(false);
        }, 800);
      }
    }, (error) => {
      console.warn("Firestore onSnapshot notice:", error.message);
      setCloudConnected(false);
      setTimeout(() => {
        isSyncingFromServerRef.current = false;
        setIsSyncingFromServer(false);
      }, 800);
    });

    return () => unsubscribe();
  }, [activeTeamId]);

  // Firestore document publisher with debounce (Upstream sync)
  useEffect(() => {
    // CRITICAL: Lock upstream publishing if server sync is active OR if activeTeamId has changed but downstream sync has not completed
    if (
      !activeTeamId ||
      isSyncingFromServer ||
      isSyncingFromServerRef.current ||
      currentTeamSyncedIdRef.current !== activeTeamId
    ) {
      return;
    }

    const docRef = doc(db, 'teams', activeTeamId);
    const currentTeams = Array.isArray(teams) ? teams : [];
    const data = JSON.parse(JSON.stringify({
      id: activeTeamId,
      name: currentTeams.find(t => t.id === activeTeamId)?.name || 'New Team',
      players: Array.isArray(players) ? players : [],
      lineup,
      score,
      gameInfo,
      rotations,
      plans,
      history,
      savedLineups,
      drills: sanitizeDrillList(drills),
      growthRecords,
      updatedAt: Date.now()
    }));

    const timer = setTimeout(() => {
      setDoc(docRef, data)
        .then(() => {
          setLastSyncedAt(Date.now());
          setCloudConnected(true);
        })
        .catch((err) => {
          console.warn('Firestore write deferred:', err.message);
          setCloudConnected(false);
        });
    }, 1000); // 1.0 second debounce

    return () => clearTimeout(timer);
  }, [players, lineup, score, gameInfo, rotations, plans, history, savedLineups, drills, growthRecords, activeTeamId, isSyncingFromServer]);

  // Log audit helper
  const logAudit = (action: string) => {
    const entry: AuditLogEntry = {
      ts: Date.now(),
      user: userName || 'Admin',
      action,
    };
    setAuditLogs((prev) => [entry, ...prev].slice(0, 200));
  };

  // Inactivity timeout handling (10 minutes)
  useEffect(() => {
    if (!isAuthenticated || isTimedOut) return;

    let timeoutTimer: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutTimer);
      // 10 minutes = 10 * 60 * 1000 = 600,000 ms
      timeoutTimer = setTimeout(() => {
        localStorage.removeItem('iiq_authenticated');
        localStorage.setItem('iiq_session_timed_out', 'true');
        setIsAuthenticated(false);
        setIsTimedOut(true);
        logAudit('Session automatically terminated due to 10 minutes of complete inactivity.');
      }, 600000);
    };

    resetTimer();

    const activityEvents = [
      'mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'
    ];

    const handleUserActivity = () => {
      resetTimer();
    };

    activityEvents.forEach(event => {
      window.addEventListener(event, handleUserActivity);
    });

    return () => {
      clearTimeout(timeoutTimer);
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleUserActivity);
      });
    };
  }, [isAuthenticated, isTimedOut]);

  // Click & Focus Tab Reset logic (Training button opens library view!)
  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);

    if (tabId === 'training') {
      setTrainingState((prev) => ({
        ...prev,
        view: 'library', // Always opens library view when Training tab is clicked!
      }));
    }
  };

  // Toggle running state of single plan
  const handleTogglePlanRunning = (planId: string) => {
    if (activePlanIds.includes(planId)) {
      setActivePlanIds(activePlanIds.filter((id) => id !== planId));
      logAudit(`Paused rotation plan: ${plans.find((p) => p.id === planId)?.name}`);
    } else {
      if (activePlanIds.length >= 4) {
        alert('You can run up to 4 plans at once.');
        return;
      }
      setActivePlanIds([...activePlanIds, planId]);
      logAudit(`Running rotation plan: ${plans.find((p) => p.id === planId)?.name}`);
    }
  };

  // Complete game and archive helper
  const handleCompleteGame = () => {
    if (!window.confirm('Finish this game and save it to history? All clock state & scores will be archived.')) return;

    // Build historical entry
    const archivedGame: GameHistory = {
      id: `game-${Date.now()}`,
      team: gameInfo.team || 'Opponent',
      round: gameInfo.round || 'Active Match',
      date: gameInfo.date || new Date().toISOString().slice(0, 10),
      score: { ...score },
      rotations: rotations.filter((r) => r.applied),
      lineup: { ...lineup },
      players: players.map((p) => ({
        id: p.id,
        name: p.name,
        nick: p.nick,
        number: p.number,
        active: p.active,
        bench: p.bench,
        slot: Object.keys(lineup).find((k) => lineup[k] === p.id) || '',
      })),
    };

    setHistory((prev) => [archivedGame, ...prev]);
    logAudit(`Archived game vs ${archivedGame.team} (${score.home.goals}.${score.home.behinds} to ${score.away.goals}.${score.away.behinds})`);

    // Reset current active states
    setLineup({});
    setScore({
      quarter: 1,
      home: { goals: 0, behinds: 0, quarters: [{ g: 0, b: 0 }, { g: 0, b: 0 }, { g: 0, b: 0 }, { g: 0, b: 0 }] },
      away: { goals: 0, behinds: 0, quarters: [{ g: 0, b: 0 }, { g: 0, b: 0 }, { g: 0, b: 0 }, { g: 0, b: 0 }] },
    });
    setRotations(rotations.map((r) => ({ ...r, applied: false, status: 'scheduled' })));
    setPlayers(players.map((p) => ({ ...p, active: 0, bench: 0 })));
    setGameInfo({ team: '', round: '', date: new Date().toISOString().slice(0, 10) });

    setActiveTab('history');
  };

  // Quick save lineup template
  const handleSaveLineup = () => {
    const name = prompt('Save current field placements as a lineup template? Enter name:');
    if (!name || !name.trim()) return;

    const newTemplate: LineupTemplate = {
      id: `l-${Date.now()}`,
      name: name.trim(),
      slots: { ...lineup },
    };

    setSavedLineups((prev) => [...prev, newTemplate]);
    logAudit(`Saved lineup template: ${newTemplate.name}`);
    alert(`Lineup template "${newTemplate.name}" saved!`);
  };

  // Load Lineup trigger
  const handleLoadSavedLineup = (id: string) => {
    const template = savedLineups.find((l) => l.id === id);
    if (!template) return;
    setLineup({ ...template.slots });
    logAudit(`Loaded lineup template: ${template.name}`);
    setShowLoadLineupModal(false);
  };

  // Delete saved lineup template
  const handleDeleteLineupTemplate = (id: string) => {
    if (!window.confirm('Delete this template?')) return;
    setSavedLineups(savedLineups.filter((l) => l.id !== id));
  };

  // New Game Trigger
  const handleStartNewGame = () => {
    setFormNewGameOpponent('');
    setFormNewGameRound(`Round ${history.length + 1}`);
    setFormNewGameDate(new Date().toISOString().slice(0, 10));
    setFormNewGameLineupId('');
    setShowNewGameModal(true);
  };

  const handleConfirmNewGame = () => {
    if (!formNewGameOpponent.trim()) {
      alert('Please fill in Opponent name.');
      return;
    }

    setGameInfo({
      team: formNewGameOpponent.trim(),
      round: formNewGameRound.trim(),
      date: formNewGameDate,
    });

    // Reset timers & scores
    setPlayers(players.map((p) => ({ ...p, active: 0, bench: 0 })));
    setScore({
      quarter: 1,
      home: { goals: 0, behinds: 0, quarters: [{ g: 0, b: 0 }, { g: 0, b: 0 }, { g: 0, b: 0 }, { g: 0, b: 0 }] },
      away: { goals: 0, behinds: 0, quarters: [{ g: 0, b: 0 }, { g: 0, b: 0 }, { g: 0, b: 0 }, { g: 0, b: 0 }] },
    });
    setRotations(rotations.map((r) => ({ ...r, applied: false, status: 'scheduled' })));

    if (formNewGameLineupId) {
      const template = savedLineups.find((l) => l.id === formNewGameLineupId);
      if (template) {
        setLineup({ ...template.slots });
      }
    } else {
      setLineup({});
    }

    logAudit(`Began new match vs ${formNewGameOpponent.trim()}`);
    setShowNewGameModal(false);
    setActiveTab('lineup');
  };

  // JSON Export / Import backups
  const handleExportData = () => {
    const payload = {
      players, lineup, score, gameInfo, rotations, plans, history, savedLineups, userName, drills
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `interchangeiq-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    logAudit('Downloaded full database backup file.');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm('Importing this file will completely overwrite all local configurations. Proceed?')) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(String(event.target?.result || ''));
        if (data.players) setPlayers(data.players);
        if (data.lineup) setLineup(data.lineup);
        if (data.score) setScore(data.score);
        if (data.gameInfo) setGameInfo(data.gameInfo);
        if (data.rotations) setRotations(data.rotations);
        if (data.plans) setPlans(data.plans);
        if (data.history) setHistory(data.history);
        if (data.savedLineups) setSavedLineups(data.savedLineups);
        if (data.userName) setUserName(data.userName);
        if (data.drills) setDrills(data.drills);

        logAudit('Restored database from external JSON backup.');
        alert('Data successfully imported!');
      } catch (err: any) {
        alert(`Failed to parse backup file: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  // Nav configuration
  const navItems = [
    { id: 'summary', label: 'Summary', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'lineup', label: 'Game Day', icon: <Play className="w-5 h-5 text-[var(--green)]" /> },
    { id: 'rotations', label: 'Rotations', icon: <RefreshCw className="w-5 h-5 text-[var(--cyan)]" /> },
    { id: 'jarvis', label: 'JARVIS AI', icon: <Bot className="w-5 h-5 text-purple-600" /> },
    { id: 'team', label: 'Team View', icon: <Users className="w-5 h-5 text-blue-600" /> },
    { id: 'growth', label: 'Player Growth', icon: <TrendingUp className="w-5 h-5 text-emerald-500" /> },
    { id: 'training', label: 'Training', icon: <BookOpen className="w-5 h-5 text-indigo-400" /> },
    { id: 'history', label: 'History', icon: <History className="w-5 h-5" /> },
    { id: 'scoring', label: 'Scoring', icon: <BarChart3 className="w-5 h-5" /> },
    { id: 'admin', label: 'Admin', icon: <Shield className="w-5 h-5 text-red-400" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
  ];

  if (isTimedOut) {
    return (
      <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950 via-slate-950 to-slate-950 flex items-center justify-center p-4">
        <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl p-10 flex flex-col items-center justify-center border border-slate-100">
          
          {/* Shield Icon Container */}
          <div className="w-20 h-20 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center mb-8">
            <ShieldAlert className="w-10 h-10 text-blue-600" strokeWidth={2.0} />
          </div>

          {/* Heading */}
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-950 text-center mb-4 tracking-tight">
            Session Securely Terminated
          </h1>

          {/* Description */}
          <p className="text-sm md:text-base text-slate-500 font-medium leading-relaxed text-center mb-10 max-w-md px-2">
            For your security, your <span className="font-semibold text-gray-800">InterchangeIQ</span> cloud connection was logged out due to 10 minutes of complete inactivity. Your local database state has been cleared from memory.
          </p>

          {/* Action Button */}
          <button
            onClick={() => {
              localStorage.removeItem('iiq_session_timed_out');
              setIsTimedOut(false);
              setIsAuthenticated(false);
            }}
            className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/10 hover:shadow-xl transition-all duration-200 text-center cursor-pointer text-base"
          >
            Sign In Again
          </button>

        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <LoginScreen
        defaultUserName={userName}
        onLoginSuccess={(name, email) => {
          setUserName(name);
          localStorage.setItem('iiq_username', name);
          localStorage.setItem('iiq_authenticated', 'true');
          setIsAuthenticated(true);
          
          const entry = {
            ts: Date.now(),
            user: name || 'Admin',
            action: `Logged in with device passkey as Coach: ${name}`
          };
          setAuditLogs((prev) => [entry, ...prev].slice(0, 200));
        }}
      />
    );
  }

  return (
    <div className={`min-h-screen bg-[var(--bg)] transition-all ${sidebarCollapsed ? 'ps-16 md:ps-20' : 'ps-0 md:ps-60'}`}>
      
      {/* Mobile top navigation header */}
      <header className="flex md:hidden items-center justify-between px-4 py-3 bg-white border-b border-[var(--line)] sticky top-0 z-50 ios-header">
        <button
          onClick={() => setActiveTab('summary')}
          className="flex items-center gap-2 cursor-pointer focus:outline-none text-left"
        >
          <div className="w-8 h-8 rounded-lg bg-white border border-gray-150 flex items-center justify-center text-blue-600 shadow-sm shrink-0">
            <TrendingUp className="w-5 h-5" strokeWidth={2.5} />
          </div>
          <span className="font-black text-sm tracking-tight text-[var(--navy)]">InterchangeIQ</span>
        </button>
        <div className="flex items-center gap-1.5">
          {teams.length > 0 && (
            <select
              value={activeTeamId || ''}
              onChange={(e) => handleSwitchTeam(e.target.value)}
              className="bg-slate-50 border border-gray-200 rounded-lg px-2 py-1 text-[11px] font-black text-[var(--navy)] focus:outline-none max-w-[130px] truncate cursor-pointer"
            >
              {teams.map((t) => (
                <option key={`mobile-team-${t.id}`} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={() => {
              localStorage.removeItem('iiq_authenticated');
              setIsAuthenticated(false);
              logAudit('Logged out manually via mobile header.');
            }}
            title="Log Out"
            className="p-2 text-gray-400 hover:text-red-600 transition shrink-0 cursor-pointer"
          >
            <LogOut className="w-5 h-5" />
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-gray-500 hover:text-gray-700"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Sidebar navigation */}
      <aside className={`fixed inset-y-0 left-0 bg-white border-r border-[var(--line)] flex flex-col justify-between z-40 transition-all ios-sidebar ${
        sidebarCollapsed ? 'w-16 md:w-20' : 'w-60'
      } ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div>
          {/* Logo Brand */}
          <div className="flex items-center justify-between p-4 border-b border-[var(--line)]">
            <button
              onClick={() => {
                setActiveTab('summary');
                setMobileMenuOpen(false);
              }}
              className="flex items-center gap-3 cursor-pointer text-left focus:outline-none"
            >
              <div className="w-9 h-9 rounded-xl bg-white border border-gray-150 flex items-center justify-center text-blue-600 shadow-sm shrink-0">
                <TrendingUp className="w-5.5 h-5.5" strokeWidth={2.5} />
              </div>
              {!sidebarCollapsed && (
                <div>
                  <h1 className="text-sm font-black text-[var(--navy)] tracking-tight">InterchangeIQ</h1>
                  <span className="text-[10px] text-[var(--muted)] font-bold">making coaching easier {APP_VERSION}</span>
                </div>
              )}
            </button>
            {/* Desktop toggle collapse arrow */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden md:flex p-1 hover:bg-gray-100 rounded-lg text-gray-400"
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
            {/* Mobile close toggle */}
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="flex md:hidden p-1 hover:bg-gray-100 rounded-lg text-gray-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>



          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectTab(item.id)}
                  className={`w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl font-black text-xs transition ${
                    isActive
                      ? 'bg-blue-50 text-[var(--blue)] shadow-xs'
                      : 'text-[var(--muted)] hover:bg-gray-50 hover:text-[var(--ink)]'
                  }`}
                >
                  <span className="shrink-0">{item.icon}</span>
                  {(!sidebarCollapsed || mobileMenuOpen) && <span>{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Card inside Sidebar */}
        {sidebarCollapsed ? (
          <div className="p-3 border-t border-[var(--line)] bg-gray-50/50 flex flex-col items-center gap-3 py-4">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-[var(--blue)] flex items-center justify-center font-black text-xs" title={userName}>
              {userName ? userName.slice(0, 2).toUpperCase() : 'CO'}
            </div>
            <button
              onClick={() => {
                localStorage.removeItem('iiq_authenticated');
                setIsAuthenticated(false);
                logAudit('Logged out manually via collapsed sidebar.');
              }}
              title="Log Out"
              className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="p-4 border-t border-[var(--line)] bg-gray-50/50 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <b className="text-xs text-[var(--ink)] font-black block truncate">{userName}</b>
              <span className="text-[10px] text-[var(--muted)] font-bold uppercase block tracking-wider mt-0.5">
                Coach Administrator
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  localStorage.removeItem('iiq_authenticated');
                  setIsAuthenticated(false);
                  logAudit('Locked screen manually via sidebar.');
                }}
                title="Lock Screen"
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-700 transition shrink-0 cursor-pointer"
              >
                <Lock className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('iiq_authenticated');
                  setIsAuthenticated(false);
                  logAudit('Logged out manually via sidebar.');
                }}
                title="Log Out"
                className="p-1.5 hover:bg-red-50 rounded-lg text-gray-500 hover:text-red-600 transition shrink-0 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <main className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 ios-main pb-24 md:pb-6">
        {activeTab === 'summary' && (
          <SummaryScreen
            players={players}
            gameInfo={gameInfo}
            historyCount={history.length}
            cloudConnected={cloudConnected}
            cloudRoom={teams.find(t => t.id === activeTeamId)?.name || 'your squad'}
            lastSyncedAt={lastSyncedAt}
            userName={userName}
            role="Admin"
            email={currentUser?.email || `${(userName || 'coach').toLowerCase().replace(/\s+/g, '.')}@interchangeiq.com`}
            onNavigate={handleSelectTab}
            onStartNewGame={handleStartNewGame}
            onForceSync={handleForceSync}
            teams={teams}
            activeTeamId={activeTeamId}
            onSelectTeam={handleSwitchTeam}
          />
        )}
        {activeTab === 'lineup' && (
          <GameDayScreen
            players={players}
            onUpdatePlayers={setPlayers}
            lineup={lineup}
            onUpdateLineup={setLineup}
            score={score}
            onUpdateScore={setScore}
            gameInfo={gameInfo}
            onUpdateGameInfo={setGameInfo}
            rotations={rotations}
            onUpdateRotations={setRotations}
            plans={plans}
            onUpdatePlans={setPlans}
            activePlanIds={activePlanIds}
            onTogglePlanRunning={handleTogglePlanRunning}
            onCompleteGame={handleCompleteGame}
            onSaveGameToHistory={() => {}}
            onOpenLoadLineup={() => setShowLoadLineupModal(true)}
            onOpenNewGame={handleStartNewGame}
            onSaveLineup={handleSaveLineup}
            onSelectPlayerId={setSelectedPlayerId}
            onNavigate={handleSelectTab}
            soundEnabled={soundEnabled}
            soundVolume={soundVolume}
            soundTone={soundTone}
            hapticEnabled={hapticEnabled}
            hapticPattern={hapticPattern}
          />
        )}
        {activeTab === 'rotations' && (
          <RotationsScreen
            players={players}
            rotations={rotations}
            onUpdateRotations={setRotations}
            plans={plans}
            onUpdatePlans={setPlans}
            activePlanIds={activePlanIds}
            onTogglePlanRunning={handleTogglePlanRunning}
            lineup={lineup}
            onUpdateLineup={setLineup}
          />
        )}
        {activeTab === 'jarvis' && (
          <JarvisScreen
            players={players}
            drills={drills}
            growthRecords={growthRecords}
            trainingState={trainingState}
            onUpdateTrainingState={setTrainingState}
            onNavigateTab={handleSelectTab}
          />
        )}
        {activeTab === 'team' && (
          <TeamScreen
            players={players}
            onUpdatePlayers={setPlayers}
            selectedPlayerId={selectedPlayerId}
            onSelectPlayerId={setSelectedPlayerId}
            lineup={lineup}
            onUpdateLineup={setLineup}
            savedLineups={savedLineups}
            history={history}
            teamName={teams.find(t => t.id === activeTeamId)?.name}
            onNavigateTab={handleSelectTab}
          />
        )}
        {activeTab === 'growth' && (
          <PlayerGrowthScreen
            players={players}
            growthRecords={growthRecords}
            onUpdateGrowthRecords={setGrowthRecords}
            selectedPlayerId={selectedPlayerId}
            onSelectPlayerId={setSelectedPlayerId}
          />
        )}
        {activeTab === 'training' && (
          <TrainingScreen
            drills={drills}
            onUpdateDrills={setDrills}
            trainingState={trainingState}
            onUpdateTrainingState={setTrainingState}
            onNavigateToJarvis={() => handleSelectTab('jarvis')}
          />
        )}
        {activeTab === 'history' && (
          <HistoryScreen
            history={history}
            onUpdateHistory={setHistory}
          />
        )}
        {activeTab === 'scoring' && (
          <ScoringScreen
            score={score}
            onUpdateScore={setScore}
            gameInfo={gameInfo}
            onUpdateGameInfo={setGameInfo}
          />
        )}
        {activeTab === 'admin' && (
          <AdminScreen
            teams={teams}
            onUpdateTeams={handleUpdateTeams}
            users={users}
            onUpdateUsers={handleUpdateUsers}
            activeTeamId={activeTeamId}
            onSelectTeam={handleSwitchTeam}
            currentUserRole="Admin"
            onNavigateTab={handleSelectTab}
            players={players}
            onUpdatePlayers={setPlayers}
            savedLineups={savedLineups}
            history={history}
            lineup={lineup}
            onForceSyncTeams={handleForceSyncTeams}
          />
        )}
        {activeTab === 'settings' && (
          <SettingsScreen
            currentTheme={currentTheme}
            onChangeTheme={setCurrentTheme}
            userName={userName}
            onChangeUserName={setUserName}
            onExportData={handleExportData}
            onImportData={handleImportBackup}
            auditLogs={auditLogs}
            onClearLogs={() => setAuditLogs([])}
            onLockSystem={() => {
              localStorage.removeItem('iiq_authenticated');
              setIsAuthenticated(false);
              logAudit('Locked screen manually and logged out of session.');
            }}
            onSimulateTimeout={() => {
              localStorage.removeItem('iiq_authenticated');
              localStorage.setItem('iiq_session_timed_out', 'true');
              setIsAuthenticated(false);
              setIsTimedOut(true);
              logAudit('Simulated 10 minutes of complete inactivity to trigger session secure termination.');
            }}
            soundEnabled={soundEnabled}
            onChangeSoundEnabled={setSoundEnabled}
            soundVolume={soundVolume}
            onChangeSoundVolume={setSoundVolume}
            soundTone={soundTone}
            onChangeSoundTone={setSoundTone}
            hapticEnabled={hapticEnabled}
            onChangeHapticEnabled={setHapticEnabled}
            hapticPattern={hapticPattern}
            onChangeHapticPattern={setHapticPattern}
            players={players}
            onUpdatePlayers={setPlayers}
            onUpdateLineup={setLineup}
          />
        )}
      </main>

      {/* MODAL overlay: Load Saved Lineup dialog */}
      {showLoadLineupModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md border border-[var(--line)] shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="text-sm font-black text-[var(--navy)]">Load Saved Lineup</h3>
              <button onClick={() => setShowLoadLineupModal(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {savedLineups.map((l) => (
                <div key={l.id} className="p-3 border border-gray-100 rounded-xl bg-gray-50 flex items-center justify-between">
                  <div>
                    <b className="text-xs text-[var(--ink)] block font-extrabold">{l.name}</b>
                    <span className="text-[10px] text-gray-400 font-bold">
                      {Object.keys(l.slots).length} active slots
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleLoadSavedLineup(l.id)}
                      className="px-2.5 py-1.5 text-xs font-bold bg-[var(--green)] text-white rounded-lg hover:opacity-90"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => handleDeleteLineupTemplate(l.id)}
                      className="px-2.5 py-1.5 text-xs font-bold bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {savedLineups.length === 0 && (
                <p className="text-xs text-gray-400 font-semibold text-center py-6">
                  No saved lineups yet. Create and save one from the Game Day panel.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL overlay: New Game Configuration dialog */}
      {showNewGameModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md border border-[var(--line)] shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h3 className="text-sm font-black text-[var(--navy)]">Began New Match</h3>
              <button onClick={() => setShowNewGameModal(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-semibold text-gray-500">
              <div>
                <label className="block mb-1 text-[10px] font-black uppercase tracking-wider text-gray-400">
                  Opposing Team *
                </label>
                <input
                  type="text"
                  value={formNewGameOpponent}
                  onChange={(e) => setFormNewGameOpponent(e.target.value)}
                  placeholder="e.g. SOUTHPORT"
                  className="w-full p-2.5 border border-gray-200 bg-white rounded-xl focus:outline-none text-sm font-bold text-[var(--ink)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-[10px] font-black uppercase tracking-wider text-gray-400">
                    Round / Match Title
                  </label>
                  <input
                    type="text"
                    value={formNewGameRound}
                    onChange={(e) => setFormNewGameRound(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 bg-white rounded-xl focus:outline-none text-sm font-bold text-[var(--ink)]"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-[10px] font-black uppercase tracking-wider text-gray-400">
                    Match Date
                  </label>
                  <input
                    type="date"
                    value={formNewGameDate}
                    onChange={(e) => setFormNewGameDate(e.target.value)}
                    className="w-full p-2.5 border border-gray-200 bg-white rounded-xl focus:outline-none text-sm font-bold text-[var(--ink)]"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 text-[10px] font-black uppercase tracking-wider text-gray-400">
                  Apply Starting Lineup template
                </label>
                <select
                  value={formNewGameLineupId}
                  onChange={(e) => setFormNewGameLineupId(e.target.value)}
                  className="w-full p-2.5 border border-gray-200 bg-white rounded-xl focus:outline-none text-sm font-bold text-[var(--ink)]"
                >
                  <option value="">Start with empty field</option>
                  {savedLineups.map((l) => (
                    <option key={l.id} value={l.id}>{l.name} ({Object.keys(l.slots).length} slots)</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-100 pt-3 mt-4">
              <button
                onClick={() => setShowNewGameModal(false)}
                className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmNewGame}
                className="px-4 py-2 text-xs font-bold bg-[var(--green)] hover:opacity-90 text-white rounded-xl"
              >
                Start New Game
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Accept Invitation Modal Overlay */}
      {pendingInviteToAccept && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[3000] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md border border-[var(--line)] shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-blue-50 text-[var(--blue)] rounded-full flex items-center justify-center mx-auto shadow-xs text-xl">
                🏉
              </div>
              <h3 className="text-lg font-black text-[var(--navy)] tracking-tight">Accept Invitation</h3>
              <p className="text-xs text-[var(--muted)] font-semibold leading-relaxed">
                You've been invited by <b className="text-[var(--ink)]">{pendingInviteToAccept.invitedBy || 'an Administrator'}</b> to join <b>InterchangeIQ</b> as a <b>{pendingInviteToAccept.role}</b>.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block mb-1 text-[10px] font-black uppercase tracking-wider text-gray-400">
                  Your Full Name
                </label>
                <input
                  type="text"
                  required
                  value={acceptingInviteName}
                  onChange={(e) => setAcceptingInviteName(e.target.value)}
                  placeholder="e.g. Liam Smith"
                  className="w-full p-2.5 border border-gray-200 bg-white rounded-xl focus:outline-none text-xs font-bold text-[var(--ink)]"
                />
              </div>

              <div>
                <label className="block mb-1 text-[10px] font-black uppercase tracking-wider text-gray-400">
                  Email Address
                </label>
                <input
                  type="email"
                  disabled
                  value={pendingInviteToAccept.email}
                  className="w-full p-2.5 border border-gray-150 bg-gray-50 rounded-xl text-xs font-semibold text-gray-400 focus:outline-none"
                />
              </div>

              <div className="space-y-1 pt-1">
                <span className="text-[9px] font-black uppercase text-gray-400 block">
                  Assigned Team Access
                </span>
                <div className="flex flex-wrap gap-1">
                  {pendingInviteToAccept.teamIds.length > 0 ? (
                    pendingInviteToAccept.teamIds.map((tid) => {
                      const teamName = teams.find((t) => t.id === tid)?.name || tid;
                      return (
                        <span
                          key={tid}
                          className="px-2 py-0.5 bg-blue-50 text-[var(--blue)] rounded text-[9px] font-bold"
                        >
                          {teamName}
                        </span>
                      );
                    })
                  ) : (
                    <span className="text-[9px] text-gray-400 font-bold">Universal clearance assigned</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={handleAcceptInviteConfirm}
                disabled={isAcceptingInvite}
                className="w-full py-2.5 text-xs font-black bg-[var(--blue)] text-white rounded-xl hover:opacity-90 transition shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isAcceptingInvite ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Activating Access...</span>
                  </>
                ) : (
                  <span>Claim Invitation & Join Platform</span>
                )}
              </button>
              <button
                onClick={handleDeclineInvite}
                disabled={isAcceptingInvite}
                className="w-full py-2 text-xs font-bold text-gray-400 hover:text-gray-600 transition hover:bg-gray-50 rounded-xl cursor-pointer"
              >
                Ignore
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-50 flex items-center justify-around px-2 pt-2 pb-[calc(env(safe-area-inset-bottom)+8px)] shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur-md bg-white/95">
        {[
          { id: 'summary', label: 'Summary', icon: <LayoutDashboard className="w-5 h-5" /> },
          { id: 'lineup', label: 'Game Day', icon: <Play className="w-5 h-5 text-[var(--green)]" /> },
          { id: 'rotations', label: 'Rotations', icon: <RefreshCw className="w-5 h-5 text-[var(--cyan)]" /> },
          { id: 'scoring', label: 'Scoring', icon: <BarChart3 className="w-5 h-5 text-amber-500" /> },
          { id: 'more', label: 'More', icon: <Menu className="w-5 h-5" />, action: () => setMobileMenuOpen(true) }
        ].map((item) => {
          const isActive = activeTab === item.id;
          const isMore = item.id === 'more';
          
          return (
            <button
              key={item.id}
              onClick={isMore ? item.action : () => handleSelectTab(item.id)}
              className={`flex-1 flex flex-col items-center justify-center py-1 select-none cursor-pointer transition-all active:scale-95 ${
                isActive 
                  ? 'text-blue-600 font-extrabold scale-105' 
                  : 'text-gray-400 font-semibold hover:text-gray-600'
              }`}
            >
              <div className={`transition-transform duration-150 ${isActive ? 'scale-110 text-blue-600' : ''}`}>
                {item.icon}
              </div>
              <span className="text-[10px] mt-1 tracking-tight leading-none">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
