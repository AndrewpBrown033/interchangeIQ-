export interface Player {
  id: string;
  name: string;
  nick: string;
  number: string;
  positions: string[];
  primaryZone: string;
  status: 'available' | 'away' | 'injured';
  active: number; // in seconds
  bench: number;  // in seconds
  note: string;
}

export interface ScoreDetail {
  goals: number;
  behinds: number;
  quarters: { g: number; b: number }[];
}

export interface Score {
  quarter: number;
  home: ScoreDetail;
  away: ScoreDetail;
}

export interface Rotation {
  id: string;
  planId: string;
  quarter: number;
  minute: number;
  type: 'bench' | 'onfield';
  outId: string;
  inId: string;
  out: string; // descriptive text
  inn: string; // descriptive text
  note: string;
  applied: boolean;
  status: 'scheduled' | 'applied';
}

export interface Plan {
  id: string;
  name: string;
}

export interface LineupTemplate {
  id: string;
  name: string;
  slots: Record<string, string>; // slotName -> playerId
}

export interface GameInfo {
  team: string;
  round: string;
  date: string;
}

export interface GameHistory {
  id: string;
  team: string; // opponent name
  round: string;
  date: string;
  score: Score;
  rotations: Rotation[];
  lineup: Record<string, string>;
  players: {
    id: string;
    name: string;
    nick: string;
    number: string;
    active: number;
    bench: number;
    slot: string;
  }[];
}

export interface Drill {
  id: string;
  title: string;
  cat: string;
  mins: number;
  players: string;
  overview: string;
  steps: [string, string][]; // [stepTitle, stepContent]
}

export interface TrainingState {
  view: 'library' | 'viewer' | 'plans';
  filter: string;
  activeId: string;
  step: number;
  motionPaused: boolean;
  plans: {
    id: string;
    name: string;
    drills: string[]; // drillIds
  }[];
  activePlanId: string | null;
}

export interface AuditLogEntry {
  ts: number;
  user: string;
  action: string;
}

export interface TeamProfile {
  id: string;
  name: string;
  createdAt: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: 'Coach' | 'Manager' | 'Admin';
  teamIds: string[];
  status?: 'Pending' | 'Active';
  invitedBy?: string;
  invitedAt?: number;
  inviteCode?: string;
}
