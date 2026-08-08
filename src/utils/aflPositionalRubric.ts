import { Player, SkillAssessment } from '../types';
import { Gender, AgeGroup } from './interchangeIQRubric';

export interface PositionProgression {
  u10: string[];
  u12: string[];
  u14: {
    girls: string;
    boys: string;
    both: string;
  };
  u16: string[];
  u18Seniors: string[];
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
}

export const AFL_POSITIONAL_RUBRIC: Record<string, PositionalRubricGroup> = {
  KPD: {
    id: 'KPD',
    title: 'Key Position Defenders (FB / CHB)',
    code: 'KPD',
    slots: ['FB', 'CHB'],
    iconEmoji: '🛡️',
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
      u10: ['Basic spoils', 'Stay goal-side', 'Chest marks only'],
      u12: ['Short kicks to space', 'Simple intercepts'],
      u14: {
        girls: 'Still developing kicking distance',
        boys: 'Beginning overhead marking',
        both: 'Learning body positioning & goal-side discipline'
      },
      u16: ['More confident contests', 'Basic rebound'],
      u18Seniors: ['Intercepting', 'Structured defensive leadership']
    }
  },
  RDEF: {
    id: 'RDEF',
    title: 'Running Defenders (HB Flank / BP)',
    code: 'RDEF',
    slots: ['LHB', 'RHB', 'LBP', 'RBP', 'BP', 'HBF'],
    iconEmoji: '🏃',
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
      u10: ['Run forward', 'Simple handball chains'],
      u12: ['Short kicks to teammates', 'Basic switches'],
      u14: {
        girls: 'Still developing kicking strength',
        boys: 'Beginning to break lines',
        both: 'Learning defensive transition & positioning'
      },
      u16: ['Reliable short kicks', 'Better pressure reads'],
      u18Seniors: ['Structured rebound', 'Tempo control']
    }
  },
  KFWD: {
    id: 'KFWD',
    title: 'Key Forwards (FF / CHF)',
    code: 'KFWD',
    slots: ['FF', 'CHF'],
    iconEmoji: '🎯',
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
      u10: ['Straight leads', 'Chest marks'],
      u12: ['Short set shots', 'Simple body work'],
      u14: {
        girls: 'Still developing kicking power',
        boys: 'Beginning contested marking',
        both: 'Learning repeat leads & space creation'
      },
      u16: ['More reliable marking', 'Scoreboard impact'],
      u18Seniors: ['Tactical leading', 'Pack presence']
    }
  },
  SFWD: {
    id: 'SFWD',
    title: 'Small / Running Forwards (FP / HFF)',
    code: 'SFWD',
    slots: ['LFP', 'RFP', 'FP', 'LHF', 'RHF', 'HFF'],
    iconEmoji: '⚡',
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
      u10: ['Chase', 'Tackle', 'Front-and-centre basics'],
      u12: ['Simple snaps', 'Pressure acts'],
      u14: {
        girls: 'Still developing kicking consistency',
        boys: 'Speed-based pressure',
        both: 'Learning scoring involvement & tackling inside 50'
      },
      u16: ['Repeat efforts', 'Scoreboard impact'],
      u18Seniors: ['Tactical pressure', 'Scoring craft']
    }
  },
  MID: {
    id: 'MID',
    title: 'Midfielders (Centre / Wing / Rover)',
    code: 'MID',
    slots: ['C', 'LW', 'RW', 'W', 'R', 'RR', 'MID'],
    iconEmoji: '🔥',
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
      u10: ['Handball chains', 'Basic positioning'],
      u12: ['Spread + support running'],
      u14: {
        girls: 'Still developing kicking distance',
        boys: 'Beginning clearance strength',
        both: 'Learning stoppage roles & spread'
      },
      u16: ['Reliable short kicks', 'Better defensive running'],
      u18Seniors: ['Tactical midfield control', 'Pace & endurance execution']
    }
  },
  RUCK: {
    id: 'RUCK',
    title: 'Ruck',
    code: 'RUCK',
    slots: ['RK', 'RUCK'],
    iconEmoji: '⛰️',
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
      u10: ['Simple taps', 'Basic positioning'],
      u12: ['Direct taps', 'Follow-up ground work'],
      u14: {
        girls: 'Still developing marking confidence',
        boys: 'Beginning aerial impact',
        both: 'Learning stoppage structure & second efforts'
      },
      u16: ['Stronger tap placement', 'Contest work'],
      u18Seniors: ['Tactical ruck leadership', 'Hitout-to-advantage accuracy']
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

export function evaluatePlayerPositionalRubric(
  player: Player,
  assessment?: SkillAssessment
): PositionEvaluation[] {
  const gender: Gender = assessment?.gender || player.gender || 'Male';
  const ageGroup: AgeGroup = assessment?.ageGroup || player.ageGroup || 'U14';

  // Extract ratings (fallbacks if not assessed)
  const kickAcc = assessment?.kickAccuracyRating ?? 6;
  const kickDist = assessment?.kickDistanceMeters ?? 28;
  const oppFoot = assessment?.oppositeFootRating ?? 5;
  const handball = assessment?.handballRating ?? 6;
  const marking = assessment?.markingRating ?? 6;
  const tackling = assessment?.tacklingRating ?? 6;
  const gameSense = assessment?.gameSenseRating ?? 6;
  const fitness = assessment?.fitnessRating ?? 6;

  // Position-specific sub-ratings
  const spoiling = assessment?.spoilingRating ?? Math.min(10, Math.round((marking + tackling) / 2));
  const overheadMark = assessment?.overheadMarkingRating ?? marking;
  const crumbing = assessment?.crumbingRating ?? Math.min(10, Math.round((handball + gameSense) / 2));
  const pressure = assessment?.pressureActsRating ?? tackling;
  const ruckTap = assessment?.ruckTapRating ?? Math.min(10, Math.round((marking + fitness) / 2));
  const leading = assessment?.leadingTimingRating ?? Math.min(10, Math.round((marking + gameSense) / 2));
  const snapGoal = assessment?.snapGoalRating ?? kickAcc;
  const defTransition = assessment?.defensiveTransitionRating ?? Math.min(10, Math.round((tackling + gameSense) / 2));

  const preferredPosStr = (player.positions || []).join(' ').toUpperCase();

  const results: PositionEvaluation[] = [];

  // 1. Key Defender Evaluation (FB/CHB)
  let kpdScore = (spoiling * 20) + (marking * 20) + (gameSense * 20) + (tackling * 15) + (kickAcc * 15) + (fitness * 10);
  if (preferredPosStr.includes('FB') || preferredPosStr.includes('CHB') || player.primaryZone === 'Defenders') kpdScore += 10;
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
