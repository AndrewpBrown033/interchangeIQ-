import { Player, SkillAssessment } from '../types';
import { Gender, AgeGroup, HeightGroup, resolvePlayerHeightGroup } from './interchangeIQRubric';

export interface PositionProgression {
  u10: { boys: string; girls: string; both: string };
  u12: { boys: string; girls: string; both: string };
  u14: { boys: string; girls: string; both: string };
  u16: { boys: string; girls: string; both: string };
  u18Seniors: { boys: string; girls: string; both: string };
}

export interface PositionalRubricGroup {
  id: string;
  title: string;
  code: 'KPD' | 'RDEF' | 'KFWD' | 'SFWD' | 'MID' | 'RUCK';
  slots: string[];
  iconEmoji: string;
  coreSkills: string[];
  genderNotes: {
    boys: string;
    girls: string;
  };
  progression: PositionProgression;
  // AFL positional height convention (e.g. Ruck/Key posts favor Tall,
  // crumbing small forwards favor Small) — factored into suitabilityScore.
  heightPreference: HeightGroup;
  heightNote: string;
}

export const AFL_POSITIONAL_RUBRIC: Record<string, PositionalRubricGroup> = {
  KPD: {
    id: 'KPD',
    title: 'Key Position Defenders (FB / CHB)',
    code: 'KPD',
    slots: ['FB', 'CHB'],
    iconEmoji: '🛡️',
    heightPreference: 'Tall',
    heightNote: 'Last line of defense against key forwards — height wins one-on-one marking contests.',
    coreSkills: [
      'Spoiling basics',
      'Simple marking — chest marks first',
      'Goal-side positioning',
      'Short reliable kicks'
    ],
    genderNotes: {
      boys: 'Earlier aerial confidence',
      girls: 'Earlier positioning awareness'
    },
    progression: {
      u10: { both: 'Basic spoils, staying goal-side, chest marks only', boys: 'Enjoys early contested marking attempts', girls: 'Focuses on getting body position right before the contest' },
      u12: { both: 'Short kicks to space & simple intercepts', boys: 'Starting to test overhead marking in a genuine contest', girls: "Building confidence reading the ball off opponents' boot" },
      u14: {
        girls: 'Still developing kicking distance',
        boys: 'Beginning overhead marking',
        both: 'Learning body positioning & goal-side discipline'
      },
      u16: { both: 'More confident contests & basic rebound', boys: 'Increasingly competitive in one-on-one marking', girls: 'Developing physical strength to match aerial intent' },
      u18Seniors: { both: 'Intercepting & structured defensive leadership', boys: 'Well-established aerial dominance', girls: 'Strong all-round intercept marking and organisational leadership' }
    }
  },
  RDEF: {
    id: 'RDEF',
    title: 'Running Defenders (HB Flank / BP)',
    code: 'RDEF',
    slots: ['LHB', 'RHB', 'LBP', 'RBP', 'BP', 'HBF'],
    iconEmoji: '🏃',
    heightPreference: 'Medium',
    heightNote: 'Rebounding defender role — mobility and reading the ball matter as much as height.',
    coreSkills: [
      'Run & carry',
      'Short accurate kicking',
      'Basic tackling'
    ],
    genderNotes: {
      boys: 'More speed-based rebound',
      girls: 'Stronger decision-making and support play'
    },
    progression: {
      u10: { both: 'Run forward, simple handball chains', boys: 'Enjoys running end-to-end with the ball', girls: 'Looks for the safe short option before running' },
      u12: { both: 'Short kicks to teammates, basic switches', boys: 'Starting to use speed to beat the first line of pressure', girls: 'Building awareness of when to switch play' },
      u14: {
        girls: 'Still developing kicking strength',
        boys: 'Beginning to break lines',
        both: 'Learning defensive transition & positioning'
      },
      u16: { both: 'Reliable short kicks & better pressure reads', boys: 'Using speed to consistently break defensive lines', girls: 'Reading pressure and picking the right rebound option' },
      u18Seniors: { both: 'Structured rebound & tempo control', boys: 'Explosive line-breaking running off half back', girls: 'Composed, low-risk ball use under sustained pressure' }
    }
  },
  KFWD: {
    id: 'KFWD',
    title: 'Key Forwards (FF / CHF)',
    code: 'KFWD',
    slots: ['FF', 'CHF'],
    iconEmoji: '🎯',
    heightPreference: 'Tall',
    heightNote: 'Key forward target who leads and marks overhead inside 50.',
    coreSkills: [
      'Simple leading patterns',
      'Basic marking',
      'Short-range goal kicking'
    ],
    genderNotes: {
      boys: 'Earlier contest strength',
      girls: 'Better timing and space creation'
    },
    progression: {
      u10: { both: 'Straight leads, chest marks', boys: 'Enjoys physical one-on-one contests early', girls: 'Times leads well to find space' },
      u12: { both: 'Short set shots, simple body work', boys: 'Building strength to hold position at the contest', girls: 'Refining lead timing against a defender' },
      u14: {
        girls: 'Still developing kicking power',
        boys: 'Beginning contested marking',
        both: 'Learning repeat leads & space creation'
      },
      u16: { both: 'More reliable marking & scoreboard impact', boys: 'Increasingly dominant in contested one-on-ones', girls: 'Consistently creating separation through smart leading' },
      u18Seniors: { both: 'Tactical leading & pack presence', boys: 'Genuine contested marking target', girls: 'Elite lead timing and structured forward craft' }
    }
  },
  SFWD: {
    id: 'SFWD',
    title: 'Small / Running Forwards (FP / HFF)',
    code: 'SFWD',
    slots: ['LFP', 'RFP', 'FP', 'LHF', 'RHF', 'HFF'],
    iconEmoji: '⚡',
    heightPreference: 'Small',
    heightNote: 'Crumbing forward role thrives on agility and a low centre of gravity, not height.',
    coreSkills: [
      'Crumbing basics',
      'Pressure acts',
      'Short snaps'
    ],
    genderNotes: {
      boys: 'Faster pressure chains',
      girls: 'Stronger positioning and repeat efforts'
    },
    progression: {
      u10: { both: 'Chase, tackle, front-and-centre basics', boys: 'Loves the chase and simple tackling', girls: 'Works hard to stay front-and-centre of the ball' },
      u12: { both: 'Simple snaps, pressure acts', boys: 'Applying quicker chase pressure', girls: 'Building consistency with repeat pressure efforts' },
      u14: {
        girls: 'Still developing kicking consistency',
        boys: 'Speed-based pressure',
        both: 'Learning scoring involvement & tackling inside 50'
      },
      u16: { both: 'Repeat efforts & scoreboard impact', boys: 'Using speed to apply relentless forward pressure', girls: 'Reliable repeat pressure and smart crumbing positioning' },
      u18Seniors: { both: 'Tactical pressure & scoring craft', boys: 'Explosive small-forward craft under pressure', girls: 'Composed set-shot craft and elite repeat pressure' }
    }
  },
  MID: {
    id: 'MID',
    title: 'Midfielders (Centre / Wing / Rover)',
    code: 'MID',
    slots: ['C', 'LW', 'RW', 'W', 'R', 'RR', 'MID'],
    iconEmoji: '🔥',
    heightPreference: 'Medium',
    heightNote: 'Engine room role — height is a bonus at stoppages/throw-ins, not a requirement.',
    coreSkills: [
      'Clean hands',
      'Short kicking under pressure',
      'Basic tackling',
      'Spread from contest'
    ],
    genderNotes: {
      boys: 'More burst speed',
      girls: 'Stronger game sense and positioning'
    },
    progression: {
      u10: { both: 'Handball chains, basic positioning', boys: 'Enjoys quick bursts out of a contest', girls: 'Reads where support is needed' },
      u12: { both: 'Spread + support running', boys: 'Beginning to use speed to break away from stoppages', girls: 'Building awareness of team structure and spread' },
      u14: {
        girls: 'Still developing kicking distance',
        boys: 'Beginning clearance strength',
        both: 'Learning stoppage roles & spread'
      },
      u16: { both: 'Reliable short kicks & better defensive running', boys: 'Winning more clearances through strength and burst', girls: 'Strong tactical reads and consistent defensive effort' },
      u18Seniors: { both: 'Tactical midfield control & pace/endurance execution', boys: 'High-impact clearance and outside speed', girls: 'Elite decision-making and stoppage craft' }
    }
  },
  RUCK: {
    id: 'RUCK',
    title: 'Ruck',
    code: 'RUCK',
    slots: ['RK', 'RUCK'],
    iconEmoji: '⛰️',
    heightPreference: 'Tall',
    heightNote: 'Ruck contests are won in the air — taller athletes get a clear reach and tap advantage.',
    coreSkills: [
      'Basic tap work',
      'Follow-up effort',
      'Simple marking'
    ],
    genderNotes: {
      boys: 'Height + leap advantage earlier',
      girls: 'Stronger positioning + repeat efforts'
    },
    progression: {
      u10: { both: 'Simple taps, basic positioning', boys: 'Often the tallest and enjoys the aerial contest', girls: 'Focuses on good body position at the bounce' },
      u12: { both: 'Direct taps, follow-up ground work', boys: 'Beginning to use height advantage more deliberately', girls: 'Building reliable tap placement to teammates' },
      u14: {
        girls: 'Still developing marking confidence',
        boys: 'Beginning aerial impact',
        both: 'Learning stoppage structure & second efforts'
      },
      u16: { both: 'Stronger tap placement & contest work', boys: 'Growing physical dominance in ruck contests', girls: 'Consistent tap accuracy and strong follow-up efforts' },
      u18Seniors: { both: 'Tactical ruck leadership & hitout-to-advantage accuracy', boys: 'Genuine aerial dominance at stoppages', girls: 'Elite tap craft and stoppage leadership' }
    }
  }
};

export interface PositionEvaluation {
  group: PositionalRubricGroup;
  suitabilityScore: number; // 0 - 100%
  tier: 'Strong Match' | 'Good Fit' | 'Developing Option' | 'Secondary Role';
  whyComment: string;
  ageStageExpectation: string;
  growthFocus: string;
}

// Height-fit adjustment, on the same pre-division scale as the existing
// preferred-position bonus (a flat +10 there). A calculated height rating
// (from a real heightCm) that falls squarely in a position's ideal band adds
// a stronger nudge than a manual heightGroupOverride flag, since the flag is
// unverified. Height with no data at all (heightCm=0 and no override) is
// fully neutral — it never penalizes a player for not having height on file.
const HEIGHT_GROUP_RATING: Record<HeightGroup, 1 | 2 | 3 | 4 | 5> = { Small: 2, Medium: 3, Tall: 4 };
const IDEAL_RATING_RANGE: Record<HeightGroup, [number, number]> = {
  Tall: [4, 5],
  Medium: [2, 4],
  Small: [1, 3],
};

function getHeightFitBonus(player: Player, preference: HeightGroup): number {
  const resolved = resolvePlayerHeightGroup(player);
  if (!resolved) return 0; // no height data at all — neutral, never penalized

  const rating = resolved.rating ?? HEIGHT_GROUP_RATING[resolved.group];
  const [lo, hi] = IDEAL_RATING_RANGE[preference];
  const scale = resolved.source === 'calculated' ? 1 : 0.5; // manual flag counts for less than a measured height

  if (rating >= lo && rating <= hi) return 20 * scale;   // squarely in the ideal band
  const distance = rating < lo ? lo - rating : rating - hi;
  if (distance === 1) return 0;                          // one tier outside — neutral
  return -15 * scale;                                     // clear mismatch (e.g. Small player evaluated for Ruck)
}

export function evaluatePlayerPositionalRubric(
  player: Player,
  assessment?: SkillAssessment
): PositionEvaluation[] {
  const gender: Gender = assessment?.gender || player.gender || 'Male';
  const ageGroup: AgeGroup = assessment?.ageGroup || player.ageGroup || 'U14';

  // Extract ratings — Static player attributes are primary so point-in-time Combine test snapshots do NOT override static attributes
  const kickAcc = player.kickAccuracyRating ?? assessment?.kickAccuracyRating ?? 6;
  const kickDist = player.kickDistanceMeters ?? assessment?.kickDistanceMeters ?? 28;
  const oppFoot = player.oppositeFootRating ?? assessment?.oppositeFootRating ?? 5;
  const handball = player.handballRating ?? assessment?.handballRating ?? 6;
  const marking = player.markingRating ?? assessment?.markingRating ?? 6;
  const tackling = player.tacklingRating ?? assessment?.tacklingRating ?? 6;
  const gameSense = player.gameSenseRating ?? assessment?.gameSenseRating ?? 6;
  const fitness = player.fitnessRating ?? assessment?.fitnessRating ?? 6;

  // Position-specific sub-ratings
  const spoiling = player.spoilingRating ?? assessment?.spoilingRating ?? Math.min(10, Math.round((marking + tackling) / 2));
  const overheadMark = player.overheadMarkingRating ?? assessment?.overheadMarkingRating ?? marking;
  const crumbing = player.crumbingRating ?? assessment?.crumbingRating ?? Math.min(10, Math.round((handball + gameSense) / 2));
  const pressure = player.pressureActsRating ?? assessment?.pressureActsRating ?? tackling;
  const ruckTap = player.ruckTapRating ?? assessment?.ruckTapRating ?? Math.min(10, Math.round((marking + fitness) / 2));
  const leading = player.leadingTimingRating ?? assessment?.leadingTimingRating ?? Math.min(10, Math.round((marking + gameSense) / 2));
  const snapGoal = player.snapGoalRating ?? assessment?.snapGoalRating ?? kickAcc;
  const defTransition = player.defensiveTransitionRating ?? assessment?.defensiveTransitionRating ?? Math.min(10, Math.round((tackling + gameSense) / 2));

  const preferredPosStr = (player.positions || []).join(' ').toUpperCase();

  const results: PositionEvaluation[] = [];

  // 1. Key Defender Evaluation (FB/CHB)
  let kpdScore = (spoiling * 20) + (marking * 20) + (gameSense * 20) + (tackling * 15) + (kickAcc * 15) + (fitness * 10);
  if (preferredPosStr.includes('FB') || preferredPosStr.includes('CHB') || player.primaryZone === 'Defenders') kpdScore += 10;
  kpdScore += getHeightFitBonus(player, AFL_POSITIONAL_RUBRIC.KPD.heightPreference);
  kpdScore = Math.min(100, Math.round(kpdScore / 10));

  let kpdExpectation = '';
  if (ageGroup === 'U10') kpdExpectation = 'Chest marks, basic spoils & staying goal-side.';
  else if (ageGroup === 'U12') kpdExpectation = 'Short kicks to space & simple intercepts.';
  else if (ageGroup === 'U14') {
    kpdExpectation = gender === 'Female' 
      ? 'U14 Girls KPD stage: still developing kicking distance & positioning awareness.'
      : 'U14 Boys KPD stage: beginning overhead marking & body positioning.';
  } else if (ageGroup === 'U16') kpdExpectation = 'Confident contests & basic rebound.';
  else kpdExpectation = 'Intercepting & structured defensive leadership.';

  let kpdWhy = `#${player.number} ${player.name} fits Key Defender (${kpdExpectation}). Rated ${marking}/10 marking and ${spoiling}/10 spoiling with ${kickAcc}/10 kick accuracy. `;
  if (gender === 'Female') {
    kpdWhy += `Exhibits strong positioning awareness earlier in the pathway. Kicking distance (${kickDist}m) is developing safely toward long rebound targets.`;
  } else {
    kpdWhy += `Shows growing aerial confidence and body positioning in defensive contests. Target next step: transitioning chest spoils into controlled intercept marks.`;
  }

  results.push({
    group: AFL_POSITIONAL_RUBRIC.KPD,
    suitabilityScore: kpdScore,
    tier: kpdScore >= 75 ? 'Strong Match' : kpdScore >= 60 ? 'Good Fit' : 'Developing Option',
    whyComment: kpdWhy,
    ageStageExpectation: kpdExpectation,
    growthFocus: ageGroup === 'U14' ? 'Short reliable kicks out of defense & goal-side body position.' : 'Intercept reading & direct spoils.'
  });

  // 2. Running Defender Evaluation (HB/BP)
  let rdefScore = (kickAcc * 25) + (tackling * 20) + (gameSense * 20) + (handball * 15) + (defTransition * 10) + (fitness * 10);
  if (preferredPosStr.includes('HB') || preferredPosStr.includes('BP') || preferredPosStr.includes('HBF')) rdefScore += 10;
  rdefScore += getHeightFitBonus(player, AFL_POSITIONAL_RUBRIC.RDEF.heightPreference);
  rdefScore = Math.min(100, Math.round(rdefScore / 10));

  let rdefExpectation = '';
  if (ageGroup === 'U10') rdefExpectation = 'Run forward with handball chains.';
  else if (ageGroup === 'U12') rdefExpectation = 'Short kicks to teammates & simple switches.';
  else if (ageGroup === 'U14') {
    rdefExpectation = gender === 'Female'
      ? 'U14 Girls Running Defender: strong decision-making & support play while kicking strength develops.'
      : 'U14 Boys Running Defender: beginning to break lines with speed-based rebound.';
  } else if (ageGroup === 'U16') rdefExpectation = 'Reliable short kicks & better pressure reads.';
  else rdefExpectation = 'Structured rebound & tempo control.';

  let rdefWhy = `#${player.number} ${player.name} scores ${rdefScore}% for Running Defender (${rdefExpectation}). Key strengths: ${kickAcc}/10 short kick accuracy and ${tackling}/10 tackling. `;
  if (gender === 'Female') {
    rdefWhy += `Aligns well with U14 girls development: strong decision-making and support running while building kicking power (${kickDist}m).`;
  } else {
    rdefWhy += `Uses line-breaking speed and active rebounding. Next focus: defensive transition and short switch accuracy.`;
  }

  results.push({
    group: AFL_POSITIONAL_RUBRIC.RDEF,
    suitabilityScore: rdefScore,
    tier: rdefScore >= 75 ? 'Strong Match' : rdefScore >= 60 ? 'Good Fit' : 'Developing Option',
    whyComment: rdefWhy,
    ageStageExpectation: rdefExpectation,
    growthFocus: 'Short accurate kicks on transition and defensive accountability.'
  });

  // 3. Key Forward Evaluation (FF/CHF)
  let kfwdScore = (marking * 25) + (leading * 20) + (kickAcc * 20) + (overheadMark * 15) + (gameSense * 10) + (fitness * 10);
  if (preferredPosStr.includes('FF') || preferredPosStr.includes('CHF')) kfwdScore += 10;
  kfwdScore += getHeightFitBonus(player, AFL_POSITIONAL_RUBRIC.KFWD.heightPreference);
  kfwdScore = Math.min(100, Math.round(kfwdScore / 10));

  let kfwdExpectation = '';
  if (ageGroup === 'U10') kfwdExpectation = 'Straight leads & chest marks.';
  else if (ageGroup === 'U12') kfwdExpectation = 'Short set shots & simple body work.';
  else if (ageGroup === 'U14') {
    kfwdExpectation = gender === 'Female'
      ? 'U14 Girls Key Forward: excellent timing and space creation as kicking power matures.'
      : 'U14 Boys Key Forward: beginning contested marking and repeat leading.';
  } else if (ageGroup === 'U16') kfwdExpectation = 'Reliable marking & scoreboard impact.';
  else kfwdExpectation = 'Tactical leading patterns & pack presence.';

  let kfwdWhy = `#${player.number} ${player.name} brings ${marking}/10 marking and ${leading}/10 leading timing for Key Forward (${kfwdExpectation}). `;
  if (gender === 'Female') {
    kfwdWhy += `Exhibits smart timing and space creation. Goal kicking set-shots are reliable inside 25m.`;
  } else {
    kfwdWhy += `Building contest strength and repeat leading efforts. Work on opposite foot (${oppFoot}/10) and set shot routine.`;
  }

  results.push({
    group: AFL_POSITIONAL_RUBRIC.KFWD,
    suitabilityScore: kfwdScore,
    tier: kfwdScore >= 75 ? 'Strong Match' : kfwdScore >= 60 ? 'Good Fit' : 'Developing Option',
    whyComment: kfwdWhy,
    ageStageExpectation: kfwdExpectation,
    growthFocus: 'Repeat leads, set-shot goal kicking routine & chest-to-overhead mark transition.'
  });

  // 4. Small / Running Forward Evaluation (FP/HFF)
  let sfwdScore = (pressure * 25) + (crumbing * 20) + (tackling * 20) + (snapGoal * 15) + (gameSense * 10) + (fitness * 10);
  if (preferredPosStr.includes('FP') || preferredPosStr.includes('HFF') || preferredPosStr.includes('LFP') || preferredPosStr.includes('RFP')) sfwdScore += 10;
  sfwdScore += getHeightFitBonus(player, AFL_POSITIONAL_RUBRIC.SFWD.heightPreference);
  sfwdScore = Math.min(100, Math.round(sfwdScore / 10));

  let sfwdExpectation = '';
  if (ageGroup === 'U10') sfwdExpectation = 'Chase, tackle & front-and-centre ground balls.';
  else if (ageGroup === 'U12') sfwdExpectation = 'Simple snaps & pressure acts inside 50.';
  else if (ageGroup === 'U14') {
    sfwdExpectation = gender === 'Female'
      ? 'U14 Girls Small Forward: repeat pressure efforts, positioning & ground ball gets.'
      : 'U14 Boys Small Forward: speed-based pressure chains & crumbing at drop of ball.';
  } else if (ageGroup === 'U16') sfwdExpectation = 'Repeat efforts & scoreboard impact.';
  else sfwdExpectation = 'Tactical pressure & scoring craft.';

  let sfwdWhy = `#${player.number} ${player.name} rates ${sfwdScore}% for Small/Running Forward (${sfwdExpectation}). Features ${tackling}/10 tackling, ${pressure}/10 pressure acts, and ${crumbing}/10 crumbing. `;
  if (gender === 'Female') {
    sfwdWhy += `Demonstrates strong repeat positioning and defensive chase pressure inside 50.`;
  } else {
    sfwdWhy += `Brings high burst speed and crumbing instinct. Target: short snap execution under tackle pressure.`;
  }

  results.push({
    group: AFL_POSITIONAL_RUBRIC.SFWD,
    suitabilityScore: sfwdScore,
    tier: sfwdScore >= 75 ? 'Strong Match' : sfwdScore >= 60 ? 'Good Fit' : 'Developing Option',
    whyComment: sfwdWhy,
    ageStageExpectation: sfwdExpectation,
    growthFocus: 'Front-and-centre crumbing, pressure tackles inside 50 & short snaps.'
  });

  // 5. Midfielder Evaluation (Centre / Wing / Rover)
  let midScore = (handball * 25) + (kickAcc * 20) + (gameSense * 20) + (fitness * 15) + (tackling * 10) + (oppFoot * 10);
  if (preferredPosStr.includes('MID') || preferredPosStr.includes('C') || preferredPosStr.includes('WING') || preferredPosStr.includes('ROVER') || player.primaryZone === 'Midfielders') midScore += 10;
  midScore += getHeightFitBonus(player, AFL_POSITIONAL_RUBRIC.MID.heightPreference);
  midScore = Math.min(100, Math.round(midScore / 10));

  let midExpectation = '';
  if (ageGroup === 'U10') midExpectation = 'Handball chains & basic stoppage positioning.';
  else if (ageGroup === 'U12') midExpectation = 'Spread & support running from contests.';
  else if (ageGroup === 'U14') {
    midExpectation = gender === 'Female'
      ? 'U14 Girls Midfielder: strong game sense, positioning & clean hands.'
      : 'U14 Boys Midfielder: beginning clearance strength & spread from stoppage.';
  } else if (ageGroup === 'U16') midExpectation = 'Reliable short kicks & defensive two-way running.';
  else midExpectation = 'Tactical midfield control, dual-foot disposal & tempo management.';

  let midWhy = `#${player.number} ${player.name} is a ${midScore}% fit for Midfield (${midExpectation}). Backed by ${handball}/10 handball, ${kickAcc}/10 kicking under pressure, and ${gameSense}/10 game sense. `;
  if (gender === 'Female') {
    midWhy += `Executes clean hands and smart positional spreads. Focus: expanding kicking distance (${kickDist}m) and opposite foot disposal (${oppFoot}/10).`;
  } else {
    midWhy += `Brings clearance drive and spread. Focus: short kicking accuracy under contest pressure and defensive running.`;
  }

  results.push({
    group: AFL_POSITIONAL_RUBRIC.MID,
    suitabilityScore: midScore,
    tier: midScore >= 75 ? 'Strong Match' : midScore >= 60 ? 'Good Fit' : 'Developing Option',
    whyComment: midWhy,
    ageStageExpectation: midExpectation,
    growthFocus: 'Clean hands at stoppage, short kicking under pressure & spread.'
  });

  // 6. Ruck Evaluation
  let ruckScore = (ruckTap * 25) + (marking * 20) + (tackling * 20) + (fitness * 20) + (gameSense * 15);
  if (preferredPosStr.includes('RK') || preferredPosStr.includes('RUCK')) ruckScore += 15;
  ruckScore += getHeightFitBonus(player, AFL_POSITIONAL_RUBRIC.RUCK.heightPreference);
  ruckScore = Math.min(100, Math.round(ruckScore / 10));

  let ruckExpectation = '';
  if (ageGroup === 'U10') ruckExpectation = 'Simple taps & basic contest positioning.';
  else if (ageGroup === 'U12') ruckExpectation = 'Direct taps & follow-up ground work.';
  else if (ageGroup === 'U14') {
    ruckExpectation = gender === 'Female'
      ? 'U14 Girls Ruck: strong positioning, repeat efforts & tap work as marking confidence develops.'
      : 'U14 Boys Ruck: beginning aerial impact & tap placement at stoppages.';
  } else if (ageGroup === 'U16') ruckExpectation = 'Stronger tap placement & aerial contest work.';
  else ruckExpectation = 'Tactical ruck leadership & hitouts to advantage.';

  let ruckWhy = `#${player.number} ${player.name} evaluates at ${ruckScore}% for Ruck (${ruckExpectation}). Features ${ruckTap}/10 tap work, ${marking}/10 marking, and ${fitness}/10 work rate. `;
  if (gender === 'Female') {
    ruckWhy += `Presents strong positioning and repeat effort ground work at stoppages. Next step: building aerial marking confidence.`;
  } else {
    ruckWhy += `Utilizes aerial reach and stoppage follow-up efforts. Next step: hitout placement to advantage.`;
  }

  results.push({
    group: AFL_POSITIONAL_RUBRIC.RUCK,
    suitabilityScore: ruckScore,
    tier: ruckScore >= 75 ? 'Strong Match' : ruckScore >= 60 ? 'Good Fit' : 'Developing Option',
    whyComment: ruckWhy,
    ageStageExpectation: ruckExpectation,
    growthFocus: 'Tap placement to advantage, follow-up ground tackles & aerial marking.'
  });

  // Sort descending by suitability score
  return results.sort((a, b) => b.suitabilityScore - a.suitabilityScore);
}
