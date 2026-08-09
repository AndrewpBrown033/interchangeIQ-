import React, { useState } from 'react';
import { Target, Award, Zap, BookOpen, CheckCircle2, ChevronRight, X, Sparkles, Activity, Shield, Brain, Layers, Users } from 'lucide-react';
import { COHORT_BENCHMARKS, INTERCHANGE_IQ_SCALE, Gender, AgeGroup } from '../utils/interchangeIQRubric';
import { AFL_POSITIONAL_RUBRIC, PositionalRubricGroup } from '../utils/aflPositionalRubric';

interface SkillRubricModalProps {
  onClose: () => void;
  onSelectScore?: (category: 'kick' | 'oppFoot' | 'handball' | 'marking' | 'tackling' | 'gameSense' | 'fitness', score: number) => void;
}

export interface RubricTier {
  scoreRange: string;
  levelName: string;
  color: string;
  badgeBg: string;
  description: string;
  biomechanicsKeypoints: string[];
  testingIndicators: string;
  numericScore: number;
}

export interface SkillCategoryRubric {
  id: 'kick' | 'oppFoot' | 'handball' | 'marking' | 'tackling' | 'gameSense' | 'fitness';
  title: string;
  icon: string;
  summary: string;
  testingDrill: string;
  tiers: RubricTier[];
}

export const SKILL_RUBRICS: SkillCategoryRubric[] = [
  {
    id: 'kick',
    title: 'Kicking Accuracy & Drop Punt Technique',
    icon: '🦵',
    summary: 'Evaluates ball drop mechanics, contact consistency, trajectory control, and target precision.',
    testingDrill: '20m & 35m Lead Target Test: 10 kicks to moving target in chest/stride lead.',
    tiers: [
      {
        scoreRange: '1 - 2',
        numericScore: 2,
        levelName: 'Emerging',
        color: 'text-rose-600 border-rose-200 bg-rose-50',
        badgeBg: 'bg-rose-500 text-white',
        description: 'Inconsistent drop punt ball drop; often slaps or rotates ball sideways. High percentage of wobbling or floating kicks.',
        biomechanicsKeypoints: [
          'High or two-handed ball drop',
          'Foot meets ball too late or off-center',
          'Poor follow-through across the body'
        ],
        testingIndicators: '< 30% target accuracy at 20m. Kick distance under 25m.'
      },
      {
        scoreRange: '3 - 4',
        numericScore: 4,
        levelName: 'Developing',
        color: 'text-amber-600 border-amber-200 bg-amber-50',
        badgeBg: 'bg-amber-500 text-white',
        description: 'Basic drop punt grip established. Good execution on stationary kicks, but accuracy breaks down under pressure or on the move.',
        biomechanicsKeypoints: [
          'Guided one-hand drop, slight hip rotation',
          'Inconsistent leg speed at impact',
          'Struggles to lower trajectory into wind'
        ],
        testingIndicators: '40-50% target accuracy at 20m. Max distance 25-30m.'
      },
      {
        scoreRange: '5 - 6',
        numericScore: 6,
        levelName: 'Competent',
        color: 'text-blue-600 border-blue-200 bg-blue-50',
        badgeBg: 'bg-blue-500 text-white',
        description: 'Reliable drop punt technique on preferred foot. Consistent backspin and weighted passes to stationary and leading targets under light pressure.',
        biomechanicsKeypoints: [
          'Low, controlled ball release',
          'Firm ankle at impact with clear end-over-end spin',
          'Balanced chest posture over foot contact'
        ],
        testingIndicators: '60-70% target accuracy at 25-30m. Max distance 35m.'
      },
      {
        scoreRange: '7 - 8',
        numericScore: 8,
        levelName: 'Advanced',
        color: 'text-indigo-600 border-indigo-200 bg-indigo-50',
        badgeBg: 'bg-indigo-500 text-white',
        description: 'Penetrating kick with high accuracy into tight corridors. Hits moving targets in stride on both 15m short passes and 40m long drives.',
        biomechanicsKeypoints: [
          'Rhythmic running approach with zero deceleration',
          'Explosive leg drive and crisp contact point',
          'Adapts ball trajectory (low stab vs high weighted)'
        ],
        testingIndicators: '75-85% target accuracy under full speed. Distance 40m+.'
      },
      {
        scoreRange: '9 - 10',
        numericScore: 10,
        levelName: 'Elite',
        color: 'text-emerald-600 border-emerald-200 bg-emerald-50',
        badgeBg: 'bg-emerald-600 text-white',
        description: 'Mastery level. Flawless field kicking under heavy physical pressure. Hits targets through congested zones with weight and precision.',
        biomechanicsKeypoints: [
          'Laser-like, low ball drop right over kicking boot',
          'Perfect hip torque & posture control',
          'Instantaneous decision making & execution'
        ],
        testingIndicators: '90%+ target accuracy under heavy pressure. Distance 45m+.'
      }
    ]
  },
  {
    id: 'oppFoot',
    title: 'Opposite Foot Kicking (Dual-Foot Ability)',
    icon: '👣',
    summary: 'Assesses non-preferred foot fluency, mechanical comfort, and willingness to kick on opposite side in match play.',
    testingDrill: 'Dual-Side Corridor Drill: 5 kicks left foot, 5 kicks right foot at 20m targets.',
    tiers: [
      {
        scoreRange: '1 - 2',
        numericScore: 2,
        levelName: 'Emerging',
        color: 'text-rose-600 border-rose-200 bg-rose-50',
        badgeBg: 'bg-rose-500 text-white',
        description: 'Avoids using opposite foot entirely. High panic or miskick rate when forced onto weak side.',
        biomechanicsKeypoints: [
          'Awkward non-preferred stance & poor balance',
          'Ball dropped from shoulder height or thrown',
          'No leg follow-through'
        ],
        testingIndicators: 'Misses target consistently (< 20% accuracy at 15m).'
      },
      {
        scoreRange: '3 - 4',
        numericScore: 4,
        levelName: 'Developing',
        color: 'text-amber-600 border-amber-200 bg-amber-50',
        badgeBg: 'bg-amber-500 text-white',
        description: 'Can attempt short 10-15m side passes when unpressured. Mechanical execution feels stiff but achieves basic contact.',
        biomechanicsKeypoints: [
          'Visual hesitation before drop',
          'Stiff hip movement and lower power output',
          'Occasional end-over-end spin'
        ],
        testingIndicators: '30-40% target accuracy at 15-20m.'
      },
      {
        scoreRange: '5 - 6',
        numericScore: 6,
        levelName: 'Competent',
        color: 'text-blue-600 border-blue-200 bg-blue-50',
        badgeBg: 'bg-blue-500 text-white',
        description: 'Confident exit option on non-preferred foot. Uses opposite foot fluidly for 20-25m field passes in match situations.',
        biomechanicsKeypoints: [
          'Smooth non-preferred ball drop',
          'Locked ankle at impact with steady balance',
          'Consistent end-over-end backspin'
        ],
        testingIndicators: '55-65% target accuracy at 20-25m.'
      },
      {
        scoreRange: '7 - 8',
        numericScore: 8,
        levelName: 'Advanced',
        color: 'text-indigo-600 border-indigo-200 bg-indigo-50',
        badgeBg: 'bg-indigo-500 text-white',
        description: 'Fluid dual-sided player. Opponents cannot force onto a weak side; hits targets up to 35m with confidence under pressure.',
        biomechanicsKeypoints: [
          'Symmetrical running stride on both feet',
          'Explosive leg speed and low ball drop',
          'Natural body shape and posture'
        ],
        testingIndicators: '70-80% target accuracy under pressure. Distance 35m+.'
      },
      {
        scoreRange: '9 - 10',
        numericScore: 10,
        levelName: 'Elite',
        color: 'text-emerald-600 border-emerald-200 bg-emerald-50',
        badgeBg: 'bg-emerald-600 text-white',
        description: 'Truly ambidextrous. Indistinguishable kicking action between preferred and non-preferred feet in distance and precision.',
        biomechanicsKeypoints: [
          'Perfect symmetry in bio-mechanics',
          'Elite penetration over 40m on opposite foot',
          'Instant decision execution under heavy pressure'
        ],
        testingIndicators: '85%+ target accuracy. Equal distance to preferred foot.'
      }
    ]
  },
  {
    id: 'handball',
    title: 'Handballing & Clean Hands',
    icon: '🏉',
    summary: 'Evaluates fist contact, punch power, off-hand release, clean ground ball gathers, and speed of hands in stoppage traffic.',
    testingDrill: 'Rapid Fire Grid Test: 10 quick handballs off left/right hand at target wall/teammate.',
    tiers: [
      {
        scoreRange: '1 - 2',
        numericScore: 2,
        levelName: 'Emerging',
        color: 'text-rose-600 border-rose-200 bg-rose-50',
        badgeBg: 'bg-rose-500 text-white',
        description: 'Uses open palm or pushing action (throw risk). Double handles ground balls and hesitates before releasing.',
        biomechanicsKeypoints: [
          'Fist not clenched tightly; thumb exposed',
          'Pushes ball with platform hand rather than punching',
          'Eyes off ball before gather'
        ],
        testingIndicators: 'Sluggish release (> 2.5s). Inaccurate off target.'
      },
      {
        scoreRange: '3 - 4',
        numericScore: 4,
        levelName: 'Developing',
        color: 'text-amber-600 border-amber-200 bg-amber-50',
        badgeBg: 'bg-amber-500 text-white',
        description: 'Clenched fist contact established. Clean on stationary pick-ups, but struggles with off-hand release or high-speed gathers.',
        biomechanicsKeypoints: [
          'Correct clenched fist with tucked thumb',
          'Slight delay when switching to non-preferred hand',
          'Bends at waist instead of knees on ground balls'
        ],
        testingIndicators: '50-60% clean gather rate. Reliable short handballs.'
      },
      {
        scoreRange: '5 - 6',
        numericScore: 6,
        levelName: 'Competent',
        color: 'text-blue-600 border-blue-200 bg-blue-50',
        badgeBg: 'bg-blue-500 text-white',
        description: 'Crisp, weighted handball off both hands. First-time clean gather on the move and quick giveaway under tackle pressure.',
        biomechanicsKeypoints: [
          'Firm platform hand with explosive punching arm',
          'Soft funneling hands on ground ball pick-up',
          'Good hip rotation to clear traffic'
        ],
        testingIndicators: '70-80% clean gather rate. Release time < 1.2s.'
      },
      {
        scoreRange: '7 - 8',
        numericScore: 8,
        levelName: 'Advanced',
        color: 'text-indigo-600 border-indigo-200 bg-indigo-50',
        badgeBg: 'bg-indigo-500 text-white',
        description: 'Fast, rocket handballs over 10-15m. One-touch gather at full speed and immediate giveaway to open runner.',
        biomechanicsKeypoints: [
          'Compact punch action with minimal backswing',
          'Vision remains up scanning while gathering ball',
          'Equal power off left and right hands'
        ],
        testingIndicators: '85-90% clean gather rate under speed. 10m+ rocket handball.'
      },
      {
        scoreRange: '9 - 10',
        numericScore: 10,
        levelName: 'Elite',
        color: 'text-emerald-600 border-emerald-200 bg-emerald-50',
        badgeBg: 'bg-emerald-600 text-white',
        description: 'Elite stoppage specialist clean hands. Picks up fumbles, absorbs tackles, and dishes pinpoint handballs in 360-degree traffic.',
        biomechanicsKeypoints: [
          'Instantaneous release (< 0.6s)',
          'Feather touch pick-up on wet/unpredictable bounces',
          'Uncanny peripheral vision and directional control'
        ],
        testingIndicators: '95%+ clean gather rate in heavy traffic.'
      }
    ]
  },
  {
    id: 'marking',
    title: 'Marking & Aerial Contests',
    icon: '🤲',
    summary: 'Measures chest marking, overhead extension, leading mark timing, body protection, and aerial judgment.',
    testingDrill: 'High Ball & Leading Mark Test: 10 high kicks and leading passes with body contact defender.',
    tiers: [
      {
        scoreRange: '1 - 2',
        numericScore: 2,
        levelName: 'Emerging',
        color: 'text-rose-600 border-rose-200 bg-rose-50',
        badgeBg: 'bg-rose-500 text-white',
        description: 'Waits for football to hit chest or ground. Misjudges flight path and lets fingers collapse on impact.',
        biomechanicsKeypoints: [
          'Hands close to body; no arm extension',
          'Eyes leave ball as opponent approaches',
          'Flat-footed stance in flight line'
        ],
        testingIndicators: '< 30% mark completion rate on overheads.'
      },
      {
        scoreRange: '3 - 4',
        numericScore: 4,
        levelName: 'Developing',
        color: 'text-amber-600 border-amber-200 bg-amber-50',
        badgeBg: 'bg-amber-500 text-white',
        description: 'Secure chest mark when uncontested. Basic fingers-extended W-grip overhead, but struggles when defender makes body contact.',
        biomechanicsKeypoints: [
          'Extends arms for W-grip on unpressured marks',
          'Slight hesitation when jumping into pack',
          'Body turned side-on when leading'
        ],
        testingIndicators: '50-60% mark completion rate uncontested.'
      },
      {
        scoreRange: '5 - 6',
        numericScore: 6,
        levelName: 'Competent',
        color: 'text-blue-600 border-blue-200 bg-blue-50',
        badgeBg: 'bg-blue-500 text-white',
        description: 'Reaches for ball at highest point with hands out in front. Holds ground in 1v1 contests and takes leading marks at speed.',
        biomechanicsKeypoints: [
          'Fingers spread, thumbs together forming firm cage',
          'Meets ball in front of face/chest',
          'Protects drop zone with hips/body'
        ],
        testingIndicators: '70% mark completion on leading passes.'
      },
      {
        scoreRange: '7 - 8',
        numericScore: 8,
        levelName: 'Advanced',
        color: 'text-indigo-600 border-indigo-200 bg-indigo-50',
        badgeBg: 'bg-indigo-500 text-white',
        description: 'Dominant aerial reader. Takes high-point overhead marks on the lead or in contested 1v1 situations.',
        biomechanicsKeypoints: [
          'Explosive single-leg jump with knee drive',
          'Locks ball in strong vice-like grip',
          'Absorbs contact in air without dropping ball'
        ],
        testingIndicators: '80%+ overhead & 1v1 contested mark success.'
      },
      {
        scoreRange: '9 - 10',
        numericScore: 10,
        levelName: 'Elite',
        color: 'text-emerald-600 border-emerald-200 bg-emerald-50',
        badgeBg: 'bg-emerald-600 text-white',
        description: 'Key position / aerial weapon. Commands the sky, reads flight early, and takes contested pack marks under extreme pressure.',
        biomechanicsKeypoints: [
          'Flawless flight trajectory assessment',
          'Maximum extension and soft-touch vice grip',
          'Elite body positioning to push defender off line'
        ],
        testingIndicators: '90%+ mark retention in contested situations.'
      }
    ]
  },
  {
    id: 'tackling',
    title: 'Tackling, Pressure & Defensive Contests',
    icon: '💥',
    summary: 'Evaluates legal tackling technique, shoulder-to-hip engagement, arm wrapping, and defensive closing speed.',
    testingDrill: 'Contest & Wrap Drill: 5 legal tackling reps against running ball carrier.',
    tiers: [
      {
        scoreRange: '1 - 2',
        numericScore: 2,
        levelName: 'Emerging',
        color: 'text-rose-600 border-rose-200 bg-rose-50',
        badgeBg: 'bg-rose-500 text-white',
        description: 'Reaches out with arms only (high tackle penalty risk). Avoids physical contact or slips off ball carrier easily.',
        biomechanicsKeypoints: [
          'High chest upright posture; no hip drop',
          'Grasps jerseys instead of wrapping arms',
          'Hesitates on contact'
        ],
        testingIndicators: '< 30% tackle stick rate. High penalty count.'
      },
      {
        scoreRange: '3 - 4',
        numericScore: 4,
        levelName: 'Developing',
        color: 'text-amber-600 border-amber-200 bg-amber-50',
        badgeBg: 'bg-amber-500 text-white',
        description: 'Attempts correct wrap below shoulders. Holds opponent briefly but lacks leg drive or hip lock to bring runner to ground.',
        biomechanicsKeypoints: [
          'Lowers center of gravity before impact',
          'Wraps arms around torso, but misses ball arm pin',
          'Struggles with lateral closing speed'
        ],
        testingIndicators: '50% tackle stick rate. Opponent often handballs out.'
      },
      {
        scoreRange: '5 - 6',
        numericScore: 6,
        levelName: 'Competent',
        color: 'text-blue-600 border-blue-200 bg-blue-50',
        badgeBg: 'bg-blue-500 text-white',
        description: 'Solid shoulder-to-hip contact with strong arm wrap. Legally locks ball/arms to force holding-the-ball or stoppage.',
        biomechanicsKeypoints: [
          'Shoulder contacts target between hip and sternum',
          'Drives legs through impact to finish tackle',
          'Pins at least one arm of ball carrier'
        ],
        testingIndicators: '70% tackle retention rate. Minimal high penalties.'
      },
      {
        scoreRange: '7 - 8',
        numericScore: 8,
        levelName: 'Advanced',
        color: 'text-indigo-600 border-indigo-200 bg-indigo-50',
        badgeBg: 'bg-indigo-500 text-white',
        description: 'Defensive enforcer. Rapid closing speed, explosive legal tackle impact, and instant turnover creation.',
        biomechanicsKeypoints: [
          'Anticipates opponent evasion step',
          'Viscious wrap-and-roll technique driving through hips',
          'Relentless second and third effort pressure'
        ],
        testingIndicators: '85%+ tackle stick rate. Forces multiple holding-the-ball turnovers.'
      },
      {
        scoreRange: '9 - 10',
        numericScore: 10,
        levelName: 'Elite',
        color: 'text-emerald-600 border-emerald-200 bg-emerald-50',
        badgeBg: 'bg-emerald-600 text-white',
        description: 'Master defender & pressure machine. Textbook legal execution, zero penalty risk, and dominant physical tackle execution.',
        biomechanicsKeypoints: [
          'Flawless timing, angle of approach, & hip drop',
          'Pins both arms instantly preventing disposal',
          'Sets team tone for defensive intensity'
        ],
        testingIndicators: '95%+ tackle efficiency rate.'
      }
    ]
  },
  {
    id: 'gameSense',
    title: 'Game Sense, Vision & Spatial Awareness',
    icon: '🧠',
    summary: 'Assesses scanning frequency, option selection, corridor awareness, voice/communication, and tactical positioning.',
    testingDrill: '3v2 Stoppage & Corridor Pressure Test: Decision making in small-sided match games.',
    tiers: [
      {
        scoreRange: '1 - 2',
        numericScore: 2,
        levelName: 'Emerging',
        color: 'text-rose-600 border-rose-200 bg-rose-50',
        badgeBg: 'bg-rose-500 text-white',
        description: 'Tunnel vision on the football. Turns directly into opposition pressure or kicks aimlessly into congestion.',
        biomechanicsKeypoints: [
          'Head down when carrying ball',
          'Does not scan before receiving possession',
          'Silent on field; no communication'
        ],
        testingIndicators: 'High turnover rate in traffic (> 50%).'
      },
      {
        scoreRange: '3 - 4',
        numericScore: 4,
        levelName: 'Developing',
        color: 'text-amber-600 border-amber-200 bg-amber-50',
        badgeBg: 'bg-amber-500 text-white',
        description: 'Looks for obvious first option. Can execute simple team structure, but hesitates or panics under heavy pressure.',
        biomechanicsKeypoints: [
          'Occasional head-up scanning before mark/gather',
          'Focuses on closest teammate regardless of coverage',
          'Basic positional discipline'
        ],
        testingIndicators: 'Makes correct decision 50-60% of time.'
      },
      {
        scoreRange: '5 - 6',
        numericScore: 6,
        levelName: 'Competent',
        color: 'text-blue-600 border-blue-200 bg-blue-50',
        badgeBg: 'bg-blue-500 text-white',
        description: 'Scans field prior to receiving. Identifies free teammate, switches play when corridor is blocked, and talks on field.',
        biomechanicsKeypoints: [
          'Regular 360-degree shoulder checking',
          'Balances risk vs reward options appropriately',
          'Vocal in directing defensive positioning'
        ],
        testingIndicators: '70-75% effective decision execution.'
      },
      {
        scoreRange: '7 - 8',
        numericScore: 8,
        levelName: 'Advanced',
        color: 'text-indigo-600 border-indigo-200 bg-indigo-50',
        badgeBg: 'bg-indigo-500 text-white',
        description: 'Antipates play 2 steps ahead. Manipulates defenders with eyes, opens up corridor, and sets up scoring passages.',
        biomechanicsKeypoints: [
          'Elite pre-possession scanning',
          'Deceives opponent with body language/look-offs',
          'Directs teammates into space with clear voice'
        ],
        testingIndicators: '85%+ effective decision making in match simulation.'
      },
      {
        scoreRange: '9 - 10',
        numericScore: 10,
        levelName: 'Elite',
        color: 'text-emerald-600 border-emerald-200 bg-emerald-50',
        badgeBg: 'bg-emerald-600 text-white',
        description: 'On-field general & play-maker. Reads game tempo, exploits tactical flaws in opposition, and makes elite decisions under fatigue.',
        biomechanicsKeypoints: [
          'Flawless spatial map of all 36 players',
          'Pinpoint execution to high-value corridor options',
          'Inspirational leader in team communication'
        ],
        testingIndicators: '90%+ elite decision execution under match pressure.'
      }
    ]
  },
  {
    id: 'fitness',
    title: 'Fitness, Yo-Yo & Speed Benchmarks',
    icon: '🏃',
    summary: 'Standardized physical performance metrics for 2km Time Trial, Yo-Yo Intermittent Recovery Test, and 20m Sprint.',
    testingDrill: '2km Shuttle / Yo-Yo Test Level & Electronic Timing Gate 20m Sprint.',
    tiers: [
      {
        scoreRange: '1 - 2',
        numericScore: 2,
        levelName: 'Emerging',
        color: 'text-rose-600 border-rose-200 bg-rose-50',
        badgeBg: 'bg-rose-500 text-white',
        description: 'Requires aerobic conditioning foundation. Early fatigue impacts skill execution in 2nd half.',
        biomechanicsKeypoints: [
          '2km Time Trial: > 10:30 mins',
          'Yo-Yo Level: < 13.5',
          '20m Sprint: > 3.75s'
        ],
        testingIndicators: 'Rating 1-2/10'
      },
      {
        scoreRange: '3 - 4',
        numericScore: 4,
        levelName: 'Developing',
        color: 'text-amber-600 border-amber-200 bg-amber-50',
        badgeBg: 'bg-amber-500 text-white',
        description: 'Building base endurance. Holds steady pace through 3 quarters of match play.',
        biomechanicsKeypoints: [
          '2km Time Trial: 09:30 - 10:30 mins',
          'Yo-Yo Level: 13.5 - 14.5',
          '20m Sprint: 3.55s - 3.75s'
        ],
        testingIndicators: 'Rating 3-4/10'
      },
      {
        scoreRange: '5 - 6',
        numericScore: 6,
        levelName: 'Competent',
        color: 'text-blue-600 border-blue-200 bg-blue-50',
        badgeBg: 'bg-blue-500 text-white',
        description: 'Good match fitness standard for regional / club level. Consistent repeat-sprint ability.',
        biomechanicsKeypoints: [
          '2km Time Trial: 08:30 - 09:30 mins',
          'Yo-Yo Level: 14.6 - 15.8',
          '20m Sprint: 3.40s - 3.55s'
        ],
        testingIndicators: 'Rating 5-6/10'
      },
      {
        scoreRange: '7 - 8',
        numericScore: 8,
        levelName: 'Advanced',
        color: 'text-indigo-600 border-indigo-200 bg-indigo-50',
        badgeBg: 'bg-indigo-500 text-white',
        description: 'High-level state/pathway athletic benchmark. Elite repeat-sprint effort through 4 quarters.',
        biomechanicsKeypoints: [
          '2km Time Trial: 07:45 - 08:30 mins',
          'Yo-Yo Level: 15.9 - 17.2',
          '20m Sprint: 3.25s - 3.40s'
        ],
        testingIndicators: 'Rating 7-8/10'
      },
      {
        scoreRange: '9 - 10',
        numericScore: 10,
        levelName: 'Elite',
        color: 'text-emerald-600 border-emerald-200 bg-emerald-50',
        badgeBg: 'bg-emerald-600 text-white',
        description: 'National AFLW / AFL Talent pathway standard. Extraordinary aerobic engine and acceleration.',
        biomechanicsKeypoints: [
          '2km Time Trial: < 07:45 mins',
          'Yo-Yo Level: 17.3+',
          '20m Sprint: < 3.25s'
        ],
        testingIndicators: 'Rating 9-10/10'
      }
    ]
  }
];

export default function SkillRubricModal({ onClose, onSelectScore }: SkillRubricModalProps) {
  const [activeTabId, setActiveTabId] = useState<string>('interchangeIQ');
  const [selectedGender, setSelectedGender] = useState<Gender>('Male');
  const [selectedAge, setSelectedAge] = useState<AgeGroup>('U14');

  const activeCategory = SKILL_RUBRICS.find((r) => r.id === activeTabId);

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 md:p-6 overflow-hidden">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[var(--navy)] via-[#1E293B] to-indigo-950 p-5 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-300 shadow-inner">
              <BookOpen className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-lg text-white tracking-tight">InterchangeIQ & AFL Skill Rubrics</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-extrabold text-[10px] uppercase border border-emerald-500/30">
                  Standardized Grading
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium">
                Cohort combine benchmarks (20m Sprint, Agility, Standing Vertical) & 1-10 technical skill rubrics
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Tabs Bar */}
        <div className="bg-slate-100 p-2 border-b border-slate-200 overflow-x-auto flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setActiveTabId('positionalRubric')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTabId === 'positionalRubric'
                ? 'bg-amber-500 text-slate-950 shadow-md ring-2 ring-amber-400/50'
                : 'bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300/60'
            }`}
          >
            <span>🏉</span>
            <span>AFL Positional Rubric (U10 → Seniors)</span>
          </button>

          <button
            onClick={() => setActiveTabId('interchangeIQ')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTabId === 'interchangeIQ'
                ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-500/30'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <span>🏆</span>
            <span>Combine Benchmarks</span>
          </button>

          {SKILL_RUBRICS.map((cat) => {
            const isActive = activeTabId === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveTabId(cat.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-white text-[var(--navy)] shadow-md border border-slate-200 ring-2 ring-indigo-500/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.title.split(' ')[0]} {cat.title.split(' ')[1] || ''}</span>
              </button>
            );
          })}
        </div>

        {/* AFL POSITIONAL RUBRIC VIEW */}
        {activeTabId === 'positionalRubric' ? (
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-slate-50">
            {/* Takeaway Header Banner */}
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-2xl border border-indigo-900/50 shadow-md space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🏉</span>
                  <div>
                    <h3 className="font-black text-base text-white tracking-tight flex items-center gap-2">
                      <span>AFL Positional Rubric Across All Ages</span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase">
                        Boys & Girls
                      </span>
                    </h3>
                    <p className="text-xs text-indigo-200 font-medium">
                      Realistic community footy development pathway (U10 → U12 → U14 → U16 → U18/Seniors)
                    </p>
                  </div>
                </div>

                {/* Age & Gender Selector for Rubric View */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex bg-white/10 p-1 rounded-xl border border-white/15">
                    {(['Male', 'Female'] as Gender[]).map((g) => (
                      <button
                        key={g}
                        onClick={() => setSelectedGender(g)}
                        className={`px-3 py-1 text-xs font-black rounded-lg transition cursor-pointer ${
                          selectedGender === g ? 'bg-amber-400 text-slate-950 shadow-xs' : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>

                  <div className="flex bg-white/10 p-1 rounded-xl border border-white/15">
                    {(['U10', 'U12', 'U14', 'U16', 'U18', 'Seniors'] as AgeGroup[]).map((a) => (
                      <button
                        key={a}
                        onClick={() => setSelectedAge(a)}
                        className={`px-2.5 py-1 text-xs font-black rounded-lg transition cursor-pointer ${
                          selectedAge === a ? 'bg-indigo-500 text-white shadow-xs' : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Takeaway Note */}
              <div className="bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/15 text-xs text-indigo-100 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white font-extrabold uppercase tracking-wider block mb-0.5">Core Takeaway:</strong>
                  Skill development is non-linear and boys/girls progress differently. This rubric focuses on foundations first (chest marking, short reliable kicks, basic positioning), building toward role-specific skills as confidence matures. Note: Many U14 girls & boys are actively building kicking distance & marking confidence.
                </div>
              </div>
            </div>

            {/* 6 Positional Groups Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.values(AFL_POSITIONAL_RUBRIC).map((group) => {
                const progBand = selectedAge === 'U10' ? group.progression.u10
                  : selectedAge === 'U12' ? group.progression.u12
                  : selectedAge === 'U14' ? group.progression.u14
                  : selectedAge === 'U16' ? group.progression.u16
                  : group.progression.u18Seniors;

                const genderSpecific = selectedGender === 'Female' ? progBand.girls : progBand.boys;
                const currentExpectations = `${progBand.both}. ${selectedGender === 'Female' ? 'Girls' : 'Boys'}: ${genderSpecific}`;

                return (
                  <div key={group.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 transition space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      {/* Title & Badge */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl p-2 bg-slate-100 rounded-xl">{group.iconEmoji}</span>
                          <div>
                            <h4 className="font-black text-sm text-slate-900">{group.title}</h4>
                            <span className="text-[11px] text-slate-500 font-semibold">
                              Slots: {group.slots.join(', ')}
                            </span>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 text-[11px] font-black uppercase">
                          {group.code}
                        </span>
                      </div>

                      {/* Core Skills */}
                      <div>
                        <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1.5">
                          Core Skills:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {group.coreSkills.map((sk, idx) => (
                            <span key={idx} className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 text-[11px] font-bold border border-slate-200">
                              ✓ {sk}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Boys vs Girls Notes */}
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="font-extrabold text-blue-700 block mb-0.5">👦 Boys Dev Note:</span>
                          <span className="text-slate-700 font-medium">{group.genderNotes.boys}</span>
                        </div>
                        <div>
                          <span className="font-extrabold text-pink-700 block mb-0.5">👧 Girls Dev Note:</span>
                          <span className="text-slate-700 font-medium">{group.genderNotes.girls}</span>
                        </div>
                      </div>

                      {/* Selected Age Expectations */}
                      <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-xs">
                        <div className="flex items-center justify-between font-black text-amber-900 mb-1">
                          <span className="uppercase text-[10px] tracking-wider">
                            🎯 {selectedGender} {selectedAge} Milestone:
                          </span>
                          <span className="text-[10px] bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded font-bold">
                            Current Stage
                          </span>
                        </div>
                        <p className="text-amber-950 font-bold leading-relaxed">
                          {currentExpectations}
                        </p>
                      </div>
                    </div>

                    {/* Full Pathway Timeline Accordion Summary */}
                    <div className="bg-slate-100 p-2.5 rounded-xl border border-slate-200/60 text-[10px] space-y-1 text-slate-600 font-semibold">
                      <span className="font-extrabold text-slate-800 block uppercase">Full Progression Pathway:</span>
                      <div className="flex flex-wrap gap-x-2 gap-y-1">
                        <span className={selectedAge === 'U10' ? 'text-indigo-700 font-black underline' : ''}>U10: {group.progression.u10[0]}</span>
                        <span>•</span>
                        <span className={selectedAge === 'U12' ? 'text-indigo-700 font-black underline' : ''}>U12: {group.progression.u12[0]}</span>
                        <span>•</span>
                        <span className={selectedAge === 'U14' ? 'text-indigo-700 font-black underline' : ''}>U14: {group.progression.u14.both}</span>
                        <span>•</span>
                        <span className={selectedAge === 'U16' ? 'text-indigo-700 font-black underline' : ''}>U16: {group.progression.u16[0]}</span>
                        <span>•</span>
                        <span className={selectedAge === 'Seniors' || selectedAge === 'U18' ? 'text-indigo-700 font-black underline' : ''}>U18+: {group.progression.u18Seniors[0]}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* INTERCHANGE IQ COMBINE BENCHMARKS VIEW */}
        {activeTabId === 'interchangeIQ' ? (
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-slate-50">
            {/* InterchangeIQ 5-Tier Scale Overview */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📊</span>
                  <h3 className="font-black text-sm text-slate-900 uppercase tracking-tight">
                    InterchangeIQ 5-Tier Player Rating Scale
                  </h3>
                </div>
                <span className="text-xs text-slate-500 font-semibold">Standardized Cohort Benchmark</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {[5, 4, 3, 2, 1].map((r) => {
                  const scale = INTERCHANGE_IQ_SCALE[r];
                  return (
                    <div key={r} className={`p-3 rounded-xl border flex flex-col items-center text-center ${scale.badgeText}`}>
                      <span className="text-lg mb-1">{scale.emoji}</span>
                      <span className="font-black text-xs uppercase block">{scale.title}</span>
                      <span className="text-[10px] font-bold opacity-80 mt-0.5">Rating {r}</span>
                    </div>
                  );
                })}
              </div>

              {/* Weighting formula badge */}
              <div className="bg-indigo-50/80 p-3 rounded-xl border border-indigo-100 text-xs text-indigo-950 font-medium flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>
                    <b>Overall Score Formula:</b> Speed (20m Sprint) = 25% | Agility = 20% | Jumping (Vertical) = 20% | Endurance = 25% | Football Skill = 10%
                  </span>
                </div>
                <span className="text-[11px] font-bold bg-white px-2.5 py-1 rounded-lg border border-indigo-200">
                  Overall Grade: 4.5+ 🟢 Elite | 3.8-4.49 🔵 Advanced | 3.0-3.79 🟡 Developing
                </span>
              </div>
            </div>

            {/* Cohort Selector Tabs */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  <span>Age & Gender Cohort Benchmarks</span>
                </h3>

                <div className="flex items-center gap-3">
                  {/* Gender Selector */}
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    {(['Male', 'Female'] as Gender[]).map((g) => (
                      <button
                        key={g}
                        onClick={() => setSelectedGender(g)}
                        className={`px-3 py-1 text-xs font-black rounded-lg transition cursor-pointer ${
                          selectedGender === g ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>

                  {/* Age Group Selector */}
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    {(['U12', 'U14', 'U16', 'U18'] as AgeGroup[]).map((a) => (
                      <button
                        key={a}
                        onClick={() => setSelectedAge(a)}
                        className={`px-3 py-1 text-xs font-black rounded-lg transition cursor-pointer ${
                          selectedAge === a ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Specific Cohort Table */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-sm text-slate-800">
                    {selectedGender.toUpperCase()} {selectedAge} COMBINE BENCHMARKS
                  </h4>
                  <span className="text-xs text-slate-500 font-semibold">
                    Electronic Timing & Jump Gate Standards
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* 20m Sprint Table */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                    <b className="text-xs font-black text-slate-900 block border-b border-slate-200 pb-1.5">
                      ⚡ 20m Sprint (Seconds)
                    </b>
                    {selectedGender === 'Male' && selectedAge === 'U12' && (
                      <ul className="text-xs space-y-1 font-semibold text-slate-700">
                        <li>🟢 5 Elite: &lt; 3.50s</li>
                        <li>🔵 4 Advanced: 3.50s - 3.64s</li>
                        <li>🟡 3 Developing: 3.65s - 3.79s</li>
                        <li>🟠 2 Emerging: 3.80s - 3.94s</li>
                        <li>🔴 1 Needs Dev: &gt; 3.94s</li>
                      </ul>
                    )}
                    {selectedGender === 'Male' && selectedAge === 'U14' && (
                      <ul className="text-xs space-y-1 font-semibold text-slate-700">
                        <li>🟢 5 Elite: &lt; 3.30s</li>
                        <li>🔵 4 Advanced: 3.30s - 3.39s</li>
                        <li>🟡 3 Developing: 3.40s - 3.49s</li>
                        <li>🟠 2 Emerging: 3.50s - 3.59s</li>
                        <li>🔴 1 Needs Dev: &gt; 3.59s</li>
                      </ul>
                    )}
                    {selectedGender === 'Male' && selectedAge === 'U16' && (
                      <ul className="text-xs space-y-1 font-semibold text-slate-700">
                        <li>🟢 5 Elite: &lt; 3.15s</li>
                        <li>🔵 4 Advanced: 3.15s - 3.19s</li>
                        <li>🟡 3 Developing: 3.20s - 3.29s</li>
                        <li>🟠 2 Emerging: 3.30s - 3.39s</li>
                        <li>🔴 1 Needs Dev: &gt; 3.39s</li>
                      </ul>
                    )}
                    {selectedGender === 'Male' && selectedAge === 'U18' && (
                      <ul className="text-xs space-y-1 font-semibold text-slate-700">
                        <li>🟢 5 Elite: &lt; 3.00s</li>
                        <li>🔵 4 Advanced: 3.00s - 3.04s</li>
                        <li>🟡 3 Developing: 3.05s - 3.14s</li>
                        <li>🟠 2 Emerging: 3.15s - 3.24s</li>
                        <li>🔴 1 Needs Dev: &gt; 3.24s</li>
                      </ul>
                    )}
                    {selectedGender === 'Female' && selectedAge === 'U12' && (
                      <ul className="text-xs space-y-1 font-semibold text-slate-700">
                        <li>🟢 5 Elite: &lt; 3.75s</li>
                        <li>🔵 4 Advanced: 3.75s - 3.89s</li>
                        <li>🟡 3 Developing: 3.90s - 4.04s</li>
                        <li>🟠 2 Emerging: 4.05s - 4.19s</li>
                        <li>🔴 1 Needs Dev: &gt; 4.19s</li>
                      </ul>
                    )}
                    {selectedGender === 'Female' && selectedAge === 'U14' && (
                      <ul className="text-xs space-y-1 font-semibold text-slate-700">
                        <li>🟢 5 Elite: &lt; 3.45s</li>
                        <li>🔵 4 Advanced: 3.45s - 3.59s</li>
                        <li>🟡 3 Developing: 3.60s - 3.74s</li>
                        <li>🟠 2 Emerging: 3.75s - 3.89s</li>
                        <li>🔴 1 Needs Dev: &gt; 3.89s</li>
                      </ul>
                    )}
                    {selectedGender === 'Female' && selectedAge === 'U16' && (
                      <ul className="text-xs space-y-1 font-semibold text-slate-700">
                        <li>🟢 5 Elite: &lt; 3.25s</li>
                        <li>🔵 4 Advanced: 3.25s - 3.39s</li>
                        <li>🟡 3 Developing: 3.40s - 3.54s</li>
                        <li>🟠 2 Emerging: 3.55s - 3.69s</li>
                        <li>🔴 1 Needs Dev: &gt; 3.69s</li>
                      </ul>
                    )}
                    {selectedGender === 'Female' && selectedAge === 'U18' && (
                      <ul className="text-xs space-y-1 font-semibold text-slate-700">
                        <li>🟢 5 Elite: &lt; 3.15s</li>
                        <li>🔵 4 Advanced: 3.15s - 3.24s</li>
                        <li>🟡 3 Developing: 3.25s - 3.39s</li>
                        <li>🟠 2 Emerging: 3.40s - 3.54s</li>
                        <li>🔴 1 Needs Dev: &gt; 3.54s</li>
                      </ul>
                    )}
                  </div>

                  {/* Agility Table */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                    <b className="text-xs font-black text-slate-900 block border-b border-slate-200 pb-1.5">
                      🏃 Agility Test (Seconds)
                    </b>
                    {selectedGender === 'Male' && selectedAge === 'U12' && (
                      <ul className="text-xs space-y-1 font-semibold text-slate-700">
                        <li>🟢 5 Elite: &lt; 9.30s</li>
                        <li>🔵 4 Advanced: 9.30s - 9.59s</li>
                        <li>🟡 3 Developing: 9.60s - 9.89s</li>
                        <li>🟠 2 Emerging: 9.90s - 10.19s</li>
                        <li>🔴 1 Needs Dev: &gt; 10.19s</li>
                      </ul>
                    )}
                    {selectedGender === 'Male' && selectedAge === 'U14' && (
                      <ul className="text-xs space-y-1 font-semibold text-slate-700">
                        <li>🟢 5 Elite: &lt; 8.90s</li>
                        <li>🔵 4 Advanced: 8.90s - 8.99s</li>
                        <li>🟡 3 Developing: 9.00s - 9.09s</li>
                        <li>🟠 2 Emerging: 9.10s - 9.29s</li>
                        <li>🔴 1 Needs Dev: &gt; 9.29s</li>
                      </ul>
                    )}
                    {selectedGender === 'Male' && selectedAge === 'U16' && (
                      <ul className="text-xs space-y-1 font-semibold text-slate-700">
                        <li>🟢 5 Elite: &lt; 8.50s</li>
                        <li>🔵 4 Advanced: 8.50s - 8.59s</li>
                        <li>🟡 3 Developing: 8.60s - 8.69s</li>
                        <li>🟠 2 Emerging: 8.70s - 8.89s</li>
                        <li>🔴 1 Needs Dev: &gt; 8.89s</li>
                      </ul>
                    )}
                    {selectedGender === 'Male' && selectedAge === 'U18' && (
                      <ul className="text-xs space-y-1 font-semibold text-slate-700">
                        <li>🟢 5 Elite: &lt; 8.20s</li>
                        <li>🔵 4 Advanced: 8.20s - 8.29s</li>
                        <li>🟡 3 Developing: 8.30s - 8.39s</li>
                        <li>🟠 2 Emerging: 8.40s - 8.59s</li>
                        <li>🔴 1 Needs Dev: &gt; 8.59s</li>
                      </ul>
                    )}
                    {selectedGender === 'Female' && selectedAge === 'U18' && (
                      <ul className="text-xs space-y-1 font-semibold text-slate-700">
                        <li>🟢 5 Elite: &lt; 8.50s</li>
                        <li>🔵 4 Advanced: 8.50s - 8.59s</li>
                        <li>🟡 3 Developing: 8.60s - 8.79s</li>
                        <li>🟠 2 Emerging: 8.80s - 8.99s</li>
                        <li>🔴 1 Needs Dev: &gt; 8.99s</li>
                      </ul>
                    )}
                    {selectedGender === 'Female' && selectedAge !== 'U18' && (
                      <div className="p-2 bg-amber-50 rounded-lg text-amber-900 text-[11px]">
                        <b>Note:</b> Optional test for Female {selectedAge}. Evaluated using standard scaled agility bounds when recorded.
                      </div>
                    )}
                  </div>

                  {/* Standing Vertical Jump Table */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                    <b className="text-xs font-black text-slate-900 block border-b border-slate-200 pb-1.5">
                      🦘 Standing Vertical (cm)
                    </b>
                    {selectedGender === 'Male' && selectedAge === 'U12' && (
                      <ul className="text-xs space-y-1 font-semibold text-slate-700">
                        <li>🟢 5 Elite: 45+ cm</li>
                        <li>🔵 4 Advanced: 41 - 44 cm</li>
                        <li>🟡 3 Developing: 37 - 40 cm</li>
                        <li>🟠 2 Emerging: 33 - 36 cm</li>
                        <li>🔴 1 Needs Dev: &lt; 33 cm</li>
                      </ul>
                    )}
                    {selectedGender === 'Male' && selectedAge === 'U14' && (
                      <ul className="text-xs space-y-1 font-semibold text-slate-700">
                        <li>🟢 5 Elite: 52+ cm</li>
                        <li>🔵 4 Advanced: 49 - 51 cm</li>
                        <li>🟡 3 Developing: 46 - 48 cm</li>
                        <li>🟠 2 Emerging: 43 - 45 cm</li>
                        <li>🔴 1 Needs Dev: &lt; 43 cm</li>
                      </ul>
                    )}
                    {selectedGender === 'Male' && selectedAge === 'U16' && (
                      <ul className="text-xs space-y-1 font-semibold text-slate-700">
                        <li>🟢 5 Elite: 60+ cm</li>
                        <li>🔵 4 Advanced: 56 - 59 cm</li>
                        <li>🟡 3 Developing: 52 - 55 cm</li>
                        <li>🟠 2 Emerging: 48 - 51 cm</li>
                        <li>🔴 1 Needs Dev: &lt; 48 cm</li>
                      </ul>
                    )}
                    {selectedGender === 'Male' && selectedAge === 'U18' && (
                      <ul className="text-xs space-y-1 font-semibold text-slate-700">
                        <li>🟢 5 Elite: 70+ cm</li>
                        <li>🔵 4 Advanced: 65 - 69 cm</li>
                        <li>🟡 3 Developing: 60 - 64 cm</li>
                        <li>🟠 2 Emerging: 55 - 59 cm</li>
                        <li>🔴 1 Needs Dev: &lt; 55 cm</li>
                      </ul>
                    )}
                    {selectedGender === 'Female' && selectedAge === 'U12' && (
                      <ul className="text-xs space-y-1 font-semibold text-slate-700">
                        <li>🟢 5 Elite: 38+ cm</li>
                        <li>🔵 4 Advanced: 34 - 37 cm</li>
                        <li>🟡 3 Developing: 30 - 33 cm</li>
                        <li>🟠 2 Emerging: 26 - 29 cm</li>
                        <li>🔴 1 Needs Dev: &lt; 26 cm</li>
                      </ul>
                    )}
                    {selectedGender === 'Female' && selectedAge === 'U14' && (
                      <ul className="text-xs space-y-1 font-semibold text-slate-700">
                        <li>🟢 5 Elite: 45+ cm</li>
                        <li>🔵 4 Advanced: 42 - 44 cm</li>
                        <li>🟡 3 Developing: 38 - 41 cm</li>
                        <li>🟠 2 Emerging: 35 - 37 cm</li>
                        <li>🔴 1 Needs Dev: &lt; 35 cm</li>
                      </ul>
                    )}
                    {selectedGender === 'Female' && selectedAge === 'U16' && (
                      <ul className="text-xs space-y-1 font-semibold text-slate-700">
                        <li>🟢 5 Elite: 50+ cm</li>
                        <li>🔵 4 Advanced: 47 - 49 cm</li>
                        <li>🟡 3 Developing: 43 - 46 cm</li>
                        <li>🟠 2 Emerging: 39 - 42 cm</li>
                        <li>🔴 1 Needs Dev: &lt; 39 cm</li>
                      </ul>
                    )}
                    {selectedGender === 'Female' && selectedAge === 'U18' && (
                      <ul className="text-xs space-y-1 font-semibold text-slate-700">
                        <li>🟢 5 Elite: 55+ cm</li>
                        <li>🔵 4 Advanced: 52 - 54 cm</li>
                        <li>🟡 3 Developing: 48 - 51 cm</li>
                        <li>🟠 2 Emerging: 44 - 47 cm</li>
                        <li>🔴 1 Needs Dev: &lt; 44 cm</li>
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeCategory ? (
          <>
            {/* Selected Skill Banner & Drill Info */}
            <div className="p-4 bg-indigo-50/70 border-b border-indigo-100 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{activeCategory.icon}</span>
                  <h3 className="font-black text-base text-slate-900">{activeCategory.title}</h3>
                </div>
                <p className="text-xs text-slate-600 font-medium">{activeCategory.summary}</p>
              </div>

              <div className="bg-white p-2.5 rounded-xl border border-indigo-200 text-xs shadow-xs max-w-md">
                <span className="font-black text-indigo-900 block mb-0.5">🎯 Recommended Testing Protocol:</span>
                <span className="text-slate-700 font-medium">{activeCategory.testingDrill}</span>
              </div>
            </div>

            {/* Rubric Tiers List */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-slate-50">
              {activeCategory.tiers.map((tier) => (
                <div
                  key={tier.scoreRange}
                  className={`p-4 md:p-5 rounded-2xl border transition-all ${tier.color} bg-white shadow-xs hover:shadow-md flex flex-col gap-3 relative`}
                >
                  {/* Top Row: Score Badge & Level Title */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-xl font-black text-xs shadow-xs ${tier.badgeBg}`}>
                        Score {tier.scoreRange} / 10
                      </span>
                      <h4 className="font-extrabold text-sm text-slate-900">{tier.levelName} Level</h4>
                    </div>

                    {onSelectScore && (
                      <button
                        onClick={() => {
                          onSelectScore(activeCategory.id, tier.numericScore);
                          onClose();
                        }}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>Use Score {tier.numericScore}/10</span>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-700 font-semibold leading-relaxed">
                    {tier.description}
                  </p>

                  {/* Biomechanics & Keypoints Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                      <span className="text-[11px] font-black text-slate-900 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                        <Activity className="w-3 h-3 text-indigo-600" />
                        <span>Biomechanical Indicators</span>
                      </span>
                      <ul className="space-y-1">
                        {tier.biomechanicsKeypoints.map((kp, idx) => (
                          <li key={idx} className="text-[11px] text-slate-600 font-medium flex items-start gap-1.5">
                            <span className="text-indigo-500 font-bold">•</span>
                            <span>{kp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                      <span className="text-[11px] font-black text-slate-900 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                        <Target className="w-3 h-3 text-emerald-600" />
                        <span>Testing Benchmark Performance</span>
                      </span>
                      <p className="text-[11px] text-slate-700 font-bold bg-white p-2 rounded-lg border border-slate-200">
                        {tier.testingIndicators}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : null}

        {/* Modal Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Standardized InterchangeIQ rubrics ensure consistent player grading across age groups and seasons.</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition cursor-pointer"
          >
            Close Rubric
          </button>
        </div>

      </div>
    </div>
  );
}
