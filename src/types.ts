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
  slotTimes?: Record<string, number>;
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
  groupId?: string;
  groupType?: '3-way' | 'pair' | string;
  groupP1Id?: string;
  groupP2Id?: string;
  groupP3Id?: string;
  groupInterval?: number;
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
  opponent?: string;
  round: string;
  date: string;
  time?: string;
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

// Data-driven training-diagram schema. Each drill supplies its own spec so the
// diagram accurately reflects that drill's actual setup instead of being
// guessed from the title.
export interface DiagramCone {
  x: number;
  y: number;
}

export interface DiagramPlayer {
  label: string;
  x: number;
  y: number;
  kind?: 'own' | 'opp' | 'coach'; // default 'own'
}

export interface DiagramArrow {
  path: string; // SVG path, drawn in the 900x520 field viewBox
  color: string;
  dash?: string; // strokeDasharray override
}

export interface DiagramZone {
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
}

export interface DiagramContestCircle {
  x: number;
  y: number;
  r: number;
  color?: string;
  label?: string;
}

export interface DiagramSpec {
  surface?: 'aussie' | 'soccer'; // which base playing surface to draw; default 'aussie'
  cones?: DiagramCone[];
  players?: DiagramPlayer[];
  arrows?: DiagramArrow[];
  zones?: DiagramZone[];
  contestCircle?: DiagramContestCircle;
  // Ball position for each step of the drill (cycled with stepIndex % length).
  // Should have one entry per entry in `steps`, in order.
  ballPositions: { x: number; y: number }[];
}

export interface ApiKeySettings {
  anthropicApiKey?: string;
  geminiApiKey?: string;
  updatedAt?: number;
  updatedBy?: string;
}

export interface NotificationSettings {
  // Channel toggles
  emailEnabled?: boolean;
  pulseEnabled?: boolean;
  pushEnabled?: boolean;
  // SMTP transport used for the Email channel (moved here from server .env so
  // it can be managed in-app instead of editing files on the server)
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUser?: string;
  smtpPass?: string;
  smtpFrom?: string;
  mailerSendApiKey?: string;
  updatedAt?: number;
  updatedBy?: string;
}

export interface Drill {
  id: string;
  title: string;
  cat: string;
  mins: number;
  players: string;
  overview: string;
  steps: [string, string][]; // [stepTitle, stepContent]
  diagram?: DiagramSpec; // optional - falls back to a generic diagram if omitted
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
  showTraining?: boolean;
  showPlayerGrowth?: boolean;
  showJarvis?: boolean;
  isInactive?: boolean;
  isDemo?: boolean;
}

export interface SkillAssessment {
  id: string;
  playerId: string;
  date: string; // e.g. "2026-03-01"
  seasonLabel: string; // e.g. "2025 Start of Season", "2026 Pre-Season", "2026 Mid-Season"
  // Fitness
  timeTrial2km?: string; // e.g. "08:45"
  yoyoLevel?: string; // e.g. "15.2"
  sprint20m?: string; // e.g. "3.40s"
  fitnessRating: number; // 1-10
  // Kicking
  preferredFoot: 'Right' | 'Left';
  kickDistanceMeters: number; // e.g. 35
  kickAccuracyRating: number; // 1-10
  oppositeFootRating: number; // 1-10 (Crucial for AFL Girls year-on-year growth)
  // Fundamental Skills
  handballRating: number; // 1-10
  markingRating: number; // 1-10
  tacklingRating: number; // 1-10
  gameSenseRating: number; // 1-10
  // Goals & Notes
  developmentGoals: string;
  coachNotes: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: 'Provisional' | 'Coach' | 'Assistant Coach' | 'Manager' | 'Admin' | string;
  teamIds: string[];
  status?: 'Pending' | 'Active';
  invitedBy?: string;
  invitedAt?: number;
  inviteCode?: string;
  allowedFeatures?: string[];
}

export interface TacticalPrompt {
  id: string;
  title: string;
  category: 'Ball Movement' | 'Defensive Structure' | 'Stoppages & Ruck' | 'Skill Benchmark' | 'Match Strategy' | 'Fitness & Conditioning' | 'Player Analysis' | 'Position Heatmap';
  promptText: string;
  focusArea?: string;
  targetUnit?: string;
  duration?: string;
  isSystemDefault?: boolean;
  createdBy?: string;
  createdAt: number;
}
