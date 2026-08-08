export type Gender = 'Male' | 'Female';
export type AgeGroup = 'U10' | 'U12' | 'U14' | 'U16' | 'U18' | 'Seniors';

export interface RubricLevel {
  rating: 1 | 2 | 3 | 4 | 5;
  title: string;
  colorName: string;
  badgeBg: string;
  badgeText: string;
  dotColor: string;
  emoji: string;
  meaning: string;
}

export const INTERCHANGE_IQ_SCALE: Record<number, RubricLevel> = {
  5: {
    rating: 5,
    title: 'Elite',
    colorName: 'Green',
    badgeBg: 'bg-emerald-600 text-white',
    badgeText: 'text-emerald-700 bg-emerald-50 border-emerald-300',
    dotColor: 'bg-emerald-500',
    emoji: '🟢',
    meaning: 'Elite'
  },
  4: {
    rating: 4,
    title: 'Advanced',
    colorName: 'Blue',
    badgeBg: 'bg-blue-600 text-white',
    badgeText: 'text-blue-700 bg-blue-50 border-blue-300',
    dotColor: 'bg-blue-500',
    emoji: '🔵',
    meaning: 'Advanced'
  },
  3: {
    rating: 3,
    title: 'Developing',
    colorName: 'Yellow',
    badgeBg: 'bg-amber-500 text-white',
    badgeText: 'text-amber-800 bg-amber-50 border-amber-300',
    dotColor: 'bg-amber-400',
    emoji: '🟡',
    meaning: 'Developing'
  },
  2: {
    rating: 2,
    title: 'Emerging',
    colorName: 'Orange',
    badgeBg: 'bg-orange-500 text-white',
    badgeText: 'text-orange-800 bg-orange-50 border-orange-300',
    dotColor: 'bg-orange-500',
    emoji: '🟠',
    meaning: 'Emerging'
  },
  1: {
    rating: 1,
    title: 'Needs Development',
    colorName: 'Red',
    badgeBg: 'bg-rose-600 text-white',
    badgeText: 'text-rose-700 bg-rose-50 border-rose-300',
    dotColor: 'bg-rose-500',
    emoji: '🔴',
    meaning: 'Needs Development'
  }
};

// Raw Benchmark Tables for Combine Tests
export interface CohortBenchmark {
  sprint20m: { r5: number; r4Max: number; r3Max: number; r2Max: number }; // Less is better
  agility?: { r5: number; r4Max: number; r3Max: number; r2Max: number }; // Less is better
  vertical: { r5: number; r4Min: number; r3Min: number; r2Min: number }; // Higher is better (cm)
}

export const COHORT_BENCHMARKS: Record<Gender, Record<AgeGroup, CohortBenchmark>> = {
  Male: {
    U10: {
      sprint20m: { r5: 3.70, r4Max: 3.85, r3Max: 4.00, r2Max: 4.15 },
      agility: { r5: 9.70, r4Max: 10.00, r3Max: 10.30, r2Max: 10.60 },
      vertical: { r5: 38, r4Min: 34, r3Min: 30, r2Min: 26 }
    },
    U12: {
      sprint20m: { r5: 3.50, r4Max: 3.64, r3Max: 3.79, r2Max: 3.94 },
      agility: { r5: 9.30, r4Max: 9.59, r3Max: 9.89, r2Max: 10.19 },
      vertical: { r5: 45, r4Min: 41, r3Min: 37, r2Min: 33 }
    },
    U14: {
      sprint20m: { r5: 3.30, r4Max: 3.39, r3Max: 3.49, r2Max: 3.59 },
      agility: { r5: 8.90, r4Max: 8.99, r3Max: 9.09, r2Max: 9.29 },
      vertical: { r5: 52, r4Min: 49, r3Min: 46, r2Min: 43 }
    },
    U16: {
      sprint20m: { r5: 3.15, r4Max: 3.19, r3Max: 3.29, r2Max: 3.39 },
      agility: { r5: 8.50, r4Max: 8.59, r3Max: 8.69, r2Max: 8.89 },
      vertical: { r5: 60, r4Min: 56, r3Min: 52, r2Min: 48 }
    },
    U18: {
      sprint20m: { r5: 3.00, r4Max: 3.04, r3Max: 3.14, r2Max: 3.24 },
      agility: { r5: 8.20, r4Max: 8.29, r3Max: 8.39, r2Max: 8.59 },
      vertical: { r5: 70, r4Min: 65, r3Min: 60, r2Min: 55 }
    },
    Seniors: {
      sprint20m: { r5: 2.95, r4Max: 3.02, r3Max: 3.10, r2Max: 3.20 },
      agility: { r5: 8.10, r4Max: 8.20, r3Max: 8.32, r2Max: 8.50 },
      vertical: { r5: 72, r4Min: 67, r3Min: 62, r2Min: 57 }
    }
  },
  Female: {
    U10: {
      sprint20m: { r5: 3.95, r4Max: 4.10, r3Max: 4.25, r2Max: 4.40 },
      vertical: { r5: 32, r4Min: 28, r3Min: 24, r2Min: 20 }
    },
    U12: {
      sprint20m: { r5: 3.75, r4Max: 3.89, r3Max: 4.04, r2Max: 4.19 },
      vertical: { r5: 38, r4Min: 34, r3Min: 30, r2Min: 26 }
    },
    U14: {
      sprint20m: { r5: 3.45, r4Max: 3.59, r3Max: 3.74, r2Max: 3.89 },
      vertical: { r5: 45, r4Min: 42, r3Min: 38, r2Min: 35 }
    },
    U16: {
      sprint20m: { r5: 3.25, r4Max: 3.39, r3Max: 3.54, r2Max: 3.69 },
      vertical: { r5: 50, r4Min: 47, r3Min: 43, r2Min: 39 }
    },
    U18: {
      sprint20m: { r5: 3.15, r4Max: 3.24, r3Max: 3.39, r2Max: 3.54 },
      agility: { r5: 8.50, r4Max: 8.59, r3Max: 8.79, r2Max: 8.99 },
      vertical: { r5: 55, r4Min: 52, r3Min: 48, r2Min: 44 }
    },
    Seniors: {
      sprint20m: { r5: 3.10, r4Max: 3.20, r3Max: 3.32, r2Max: 3.45 },
      agility: { r5: 8.40, r4Max: 8.50, r3Max: 8.68, r2Max: 8.88 },
      vertical: { r5: 58, r4Min: 54, r3Min: 50, r2Min: 45 }
    }
  }
};

// Helper: Parse numerical string safely
export function parseNumber(val?: string | number): number | null {
  if (val === undefined || val === null || val === '') return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  const match = val.toString().replace(/,/g, '.').match(/[\d.]+/);
  if (!match) return null;
  const num = parseFloat(match[0]);
  return isNaN(num) ? null : num;
}

// Helper: Parse 2km time trial string "mm:ss" to seconds
export function parseTimeTrialSeconds(val?: string): number | null {
  if (!val) return null;
  const str = val.trim();
  if (str.includes(':')) {
    const parts = str.split(':');
    const m = parseInt(parts[0], 10) || 0;
    const s = parseInt(parts[1], 10) || 0;
    return m * 60 + s;
  }
  const sec = parseNumber(val);
  return sec ? sec * 60 : null; // assume minutes if just a number like 8.5
}

// Grade 20m Sprint (Lower time is better)
export function gradeSprint20m(sprintSeconds: number, gender: Gender, ageGroup: AgeGroup): 1 | 2 | 3 | 4 | 5 {
  const bm = COHORT_BENCHMARKS[gender]?.[ageGroup]?.sprint20m || COHORT_BENCHMARKS.Female.U16.sprint20m;
  if (sprintSeconds < bm.r5) return 5;
  if (sprintSeconds <= bm.r4Max) return 4;
  if (sprintSeconds <= bm.r3Max) return 3;
  if (sprintSeconds <= bm.r2Max) return 2;
  return 1;
}

// Grade Agility (Lower time is better)
export function gradeAgility(agilitySeconds: number, gender: Gender, ageGroup: AgeGroup): 1 | 2 | 3 | 4 | 5 {
  const bm = COHORT_BENCHMARKS[gender]?.[ageGroup]?.agility;
  // If agility benchmark isn't explicitly listed (e.g. U12-U16 female), use generic scaled thresholds
  const fallbackAgility = { r5: 8.80, r4Max: 9.10, r3Max: 9.40, r2Max: 9.70 };
  const target = bm || fallbackAgility;

  if (agilitySeconds < target.r5) return 5;
  if (agilitySeconds <= target.r4Max) return 4;
  if (agilitySeconds <= target.r3Max) return 3;
  if (agilitySeconds <= target.r2Max) return 2;
  return 1;
}

// Grade Standing Vertical Jump (Higher height in cm is better)
export function gradeVerticalJump(verticalCm: number, gender: Gender, ageGroup: AgeGroup): 1 | 2 | 3 | 4 | 5 {
  const bm = COHORT_BENCHMARKS[gender]?.[ageGroup]?.vertical || COHORT_BENCHMARKS.Female.U16.vertical;
  if (verticalCm >= bm.r5) return 5;
  if (verticalCm >= bm.r4Min) return 4;
  if (verticalCm >= bm.r3Min) return 3;
  if (verticalCm >= bm.r2Min) return 2;
  return 1;
}

// Grade Endurance (2km Time Trial or Yo-Yo or Fitness Rating 1-10)
export function gradeEndurance(timeTrialStr?: string, yoyoStr?: string, fitnessRating10?: number): 1 | 2 | 3 | 4 | 5 {
  const ttSeconds = parseTimeTrialSeconds(timeTrialStr);
  if (ttSeconds !== null) {
    // 2km Time Trial bounds
    if (ttSeconds < 465) return 5; // < 7:45
    if (ttSeconds <= 510) return 4; // 7:45 - 8:30
    if (ttSeconds <= 570) return 3; // 8:31 - 9:30
    if (ttSeconds <= 630) return 2; // 9:31 - 10:30
    return 1; // > 10:30
  }

  const yoyoLevel = parseNumber(yoyoStr);
  if (yoyoLevel !== null) {
    if (yoyoLevel >= 17.0) return 5;
    if (yoyoLevel >= 15.8) return 4;
    if (yoyoLevel >= 14.5) return 3;
    if (yoyoLevel >= 13.5) return 2;
    return 1;
  }

  if (fitnessRating10 !== undefined && fitnessRating10 !== null) {
    if (fitnessRating10 >= 9) return 5;
    if (fitnessRating10 >= 7) return 4;
    if (fitnessRating10 >= 5) return 3;
    if (fitnessRating10 >= 3) return 2;
    return 1;
  }

  return 3; // default developing
}

// Grade Football Skill Assessment (1-5 scale derived from average 1-10 fundamentals)
export function gradeFootballSkills(skills: {
  kickAcc?: number;
  oppFoot?: number;
  handball?: number;
  marking?: number;
  tackling?: number;
  gameSense?: number;
}): number {
  const arr = [
    skills.kickAcc,
    skills.oppFoot,
    skills.handball,
    skills.marking,
    skills.tackling,
    skills.gameSense
  ].filter((v): v is number => v !== undefined && v !== null && !isNaN(v));

  if (arr.length === 0) return 3.0;
  const avg10 = arr.reduce((a, b) => a + b, 0) / arr.length; // 1-10 scale
  return Math.min(5.0, Math.max(1.0, parseFloat((avg10 / 2).toFixed(2))));
}

// Complete InterchangeIQ Assessment Result Interface
export interface InterchangeIQGradingResult {
  sprintRating: 1 | 2 | 3 | 4 | 5 | null;
  agilityRating: 1 | 2 | 3 | 4 | 5 | null;
  jumpRating: 1 | 2 | 3 | 4 | 5 | null;
  enduranceRating: 1 | 2 | 3 | 4 | 5 | null;
  skillRating: number; // 1.0 to 5.0
  overallScore: number; // 1.0 to 5.0
  overallTier: RubricLevel;
}

// Calculate Overall InterchangeIQ Athlete Score
// Weights: Speed = 25%, Agility = 20%, Jumping = 20%, Endurance = 25%, Football Skill = 10%
export function calculateInterchangeIQGrade(params: {
  sprint20m?: string | number;
  agilityTime?: string | number;
  standingVerticalCm?: string | number;
  timeTrial2km?: string;
  yoyoLevel?: string;
  fitnessRating?: number;
  kickAccuracyRating?: number;
  oppositeFootRating?: number;
  handballRating?: number;
  markingRating?: number;
  tacklingRating?: number;
  gameSenseRating?: number;
  gender?: Gender;
  ageGroup?: AgeGroup;
}): InterchangeIQGradingResult {
  const gender = params.gender || 'Female';
  const ageGroup = params.ageGroup || 'U16';

  const sprintVal = parseNumber(params.sprint20m);
  const sprintRating = sprintVal !== null ? gradeSprint20m(sprintVal, gender, ageGroup) : null;

  const agilityVal = parseNumber(params.agilityTime);
  const agilityRating = agilityVal !== null ? gradeAgility(agilityVal, gender, ageGroup) : null;

  const jumpVal = parseNumber(params.standingVerticalCm);
  const jumpRating = jumpVal !== null ? gradeVerticalJump(jumpVal, gender, ageGroup) : null;

  const enduranceRating = gradeEndurance(params.timeTrial2km, params.yoyoLevel, params.fitnessRating);

  const skillRating = gradeFootballSkills({
    kickAcc: params.kickAccuracyRating,
    oppFoot: params.oppositeFootRating,
    handball: params.handballRating,
    marking: params.markingRating,
    tackling: params.tacklingRating,
    gameSense: params.gameSenseRating
  });

  // Calculate Weighted Overall Score
  // Base Weights: Speed=25%, Agility=20%, Jump=20%, Endurance=25%, Skill=10%
  let totalWeight = 0;
  let weightedSum = 0;

  if (sprintRating !== null) {
    weightedSum += sprintRating * 0.25;
    totalWeight += 0.25;
  }
  if (agilityRating !== null) {
    weightedSum += agilityRating * 0.20;
    totalWeight += 0.20;
  }
  if (jumpRating !== null) {
    weightedSum += jumpRating * 0.20;
    totalWeight += 0.20;
  }
  if (enduranceRating !== null) {
    weightedSum += enduranceRating * 0.25;
    totalWeight += 0.25;
  }
  if (skillRating !== null) {
    weightedSum += skillRating * 0.10;
    totalWeight += 0.10;
  }

  const rawOverall = totalWeight > 0 ? weightedSum / totalWeight : 3.0;
  const overallScore = parseFloat(Math.min(5.0, Math.max(1.0, rawOverall)).toFixed(2));

  // Rating Scale Classification:
  // 4.5 - 5.0 -> Elite (5)
  // 3.8 - 4.49 -> Advanced (4)
  // 3.0 - 3.79 -> Developing (3)
  // 2.0 - 2.99 -> Emerging (2)
  // < 2.0 -> Needs Development (1)
  let numericRating: 1 | 2 | 3 | 4 | 5 = 3;
  if (overallScore >= 4.5) numericRating = 5;
  else if (overallScore >= 3.8) numericRating = 4;
  else if (overallScore >= 3.0) numericRating = 3;
  else if (overallScore >= 2.0) numericRating = 2;
  else numericRating = 1;

  return {
    sprintRating,
    agilityRating,
    jumpRating,
    enduranceRating,
    skillRating,
    overallScore,
    overallTier: INTERCHANGE_IQ_SCALE[numericRating]
  };
}

// ---------------------------------------------------------------------------
// InterchangeIQ Height Classification — Small / Medium / Tall + 1-5 rating,
// benchmarked against CDC stature-for-age percentiles for youth athletes.
// Applied automatically whenever a player's heightCm is entered (> 0).
// ---------------------------------------------------------------------------

export type HeightGroup = 'Small' | 'Medium' | 'Tall';

export interface HeightBand {
  low: number;  // cm - lower bound of the Medium band
  high: number; // cm - upper bound of the Medium band
}

// Medium band per age cohort/gender, taken directly from the published
// single-age table (U12=age12, U14=age14, U16=age16, U18=age18 — same
// age-to-band convention already used for the combine benchmarks above).
// U10 and Seniors weren't published, so they're a straight-line extrapolation
// of the age12->age13 (and age17->age18) trend rather than real CDC figures —
// treat those two cohorts as an estimate.
export const HEIGHT_MEDIUM_BAND: Record<Gender, Record<AgeGroup, HeightBand>> = {
  Male: {
    U10: { low: 134, high: 146 }, // extrapolated
    U12: { low: 148, high: 160 },
    U14: { low: 162, high: 174 },
    U16: { low: 170, high: 182 },
    U18: { low: 173, high: 185 },
    Seniors: { low: 173, high: 185 }, // assumed stable post-18
  },
  Female: {
    U10: { low: 142, high: 153 }, // extrapolated
    U12: { low: 150, high: 161 },
    U14: { low: 156, high: 168 },
    U16: { low: 158, high: 170 },
    U18: { low: 160, high: 172 },
    Seniors: { low: 160, high: 172 }, // assumed stable post-18
  }
};

const HEIGHT_RATING_LABELS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'Very Small',
  2: 'Small',
  3: 'Medium',
  4: 'Tall',
  5: 'Exceptional Height'
};

export interface HeightGradingResult {
  group: HeightGroup;
  rating: 1 | 2 | 3 | 4 | 5;
  label: string;
  tier: RubricLevel; // same badge/color styling as the InterchangeIQ scale
}

// Classifies a raw height (cm) against the age/gender Medium band, using a
// +/-5cm buffer either side of that band to produce the finer 1-5 rating
// (e.g. 16yo male: <165=1, 165-170=2, 170-182=3, 182-187=4, >187=5).
export function classifyHeight(heightCm: number, gender: Gender, ageGroup: AgeGroup): HeightGradingResult | null {
  if (!heightCm || heightCm <= 0 || isNaN(heightCm)) return null;
  const band = HEIGHT_MEDIUM_BAND[gender]?.[ageGroup];
  if (!band) return null;

  let rating: 1 | 2 | 3 | 4 | 5;
  let group: HeightGroup;
  if (heightCm < band.low - 5) { rating = 1; group = 'Small'; }
  else if (heightCm < band.low) { rating = 2; group = 'Small'; }
  else if (heightCm <= band.high) { rating = 3; group = 'Medium'; }
  else if (heightCm <= band.high + 5) { rating = 4; group = 'Tall'; }
  else { rating = 5; group = 'Tall'; }

  return { group, rating, label: HEIGHT_RATING_LABELS[rating], tier: INTERCHANGE_IQ_SCALE[rating] };
}

// Resolves a player's effective height group: calculated from heightCm
// whenever one is recorded (always takes precedence), otherwise falls back
// to a manual heightGroupOverride flag, otherwise null (unknown).
export function resolvePlayerHeightGroup(player: {
  heightCm?: number;
  gender?: Gender;
  ageGroup?: AgeGroup;
  heightGroupOverride?: HeightGroup;
}): { group: HeightGroup; rating: (1 | 2 | 3 | 4 | 5) | null; source: 'calculated' | 'manual' } | null {
  if (player.heightCm && player.heightCm > 0) {
    const result = classifyHeight(player.heightCm, player.gender || 'Female', player.ageGroup || 'U16');
    if (result) return { group: result.group, rating: result.rating, source: 'calculated' };
  }
  if (player.heightGroupOverride) {
    return { group: player.heightGroupOverride, rating: null, source: 'manual' };
  }
  return null;
}

