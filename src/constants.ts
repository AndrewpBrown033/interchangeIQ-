import { Player, Drill, SkillAssessment, TeamProfile, GameHistory, LineupTemplate } from './types';

export const APP_VERSION = 'v1.6';

// New users (self sign-up or admin invite) start on a Provisional license with
// access to this sandbox team so they have something to explore immediately.
// It is automatically dropped from a user's teamIds the moment a real team is assigned.
export const DEMO_TEAM_ID = 'demo-team';

export const DEMO_TEAM: TeamProfile = {
  id: DEMO_TEAM_ID,
  name: 'Demo Team',
  createdAt: 0,
  isDemo: true,
};

export const POSITIONS: [string, string, number, number][] = [
  // Full Forward Line (Top End - Attacking Goal)
  ['LFP', 'LFP', 27, 13],
  ['FF', 'FF', 50, 9],
  ['RFP', 'RFP', 73, 13],

  // Half Forward Line
  ['LHF', 'LHF', 24, 26],
  ['CHF', 'CHF', 50, 26],
  ['RHF', 'RHF', 76, 26],

  // Midfield 1 (Center Top)
  ['C', 'C', 38, 39],
  ['R', 'R', 62, 39],

  // Wings
  ['LW', 'LW', 20, 50],
  ['RW', 'RW', 80, 50],

  // Midfield 2 (Center Bottom)
  ['RR', 'RR', 38, 61],
  ['ROV', 'ROV', 62, 61],

  // Half Back Line
  ['LBF', 'LBF', 24, 74],
  ['CHB', 'CHB', 50, 74],
  ['RBF', 'RBF', 76, 74],

  // Full Back Line (Bottom End - Defending Goal)
  ['LBP', 'LBP', 27, 87],
  ['FB', 'FB', 50, 91],
  ['RBP', 'RBP', 73, 87],
];

export const POSITION_GROUPS: Record<string, string[]> = {
  FWD: ['LFP', 'FF', 'RFP', 'LHF', 'CHF', 'RHF'],
  MID: ['LW', 'C', 'RW', 'ROV', 'RR'],
  DEF: ['LBF', 'CHB', 'RBF', 'LBP', 'FB', 'RBP'],
  RUCK: ['R'],
};

export const POSITION_FULL_NAMES: Record<string, string> = {
  LFP: 'Left Forward Pocket',
  FF: 'Full Forward',
  RFP: 'Right Forward Pocket',
  LHF: 'Left Half Forward',
  CHF: 'Centre Half Forward',
  RHF: 'Right Half Forward',
  C: 'Centre',
  ROV: 'Rover',
  RR: 'Ruck Rover',
  R: 'Ruck',
  LW: 'Left Wing',
  RW: 'Right Wing',
  LBF: 'Left Back Flank',
  RBF: 'Right Back Flank',
  LHB: 'Left Back Flank (LBF)',
  RHB: 'Right Back Flank (RBF)',
  LBP: 'Left Back Pocket',
  FB: 'Full Back',
  RBP: 'Right Back Pocket',
  'FP-L': 'Forward Pocket Left',
  'FP-R': 'Forward Pocket Right',
  'HF-L': 'Half Forward Left',
  'HF-R': 'Half Forward Right',
  'HB-L': 'Half Back Left',
  'HB-R': 'Half Back Right',
  'BP-L': 'Back Pocket Left',
  'BP-R': 'Back Pocket Right',
  M1: 'Centre',
  M2: 'Rover',
  M3: 'Ruck Rover',
};

export function normalizePosition(pos: string): string {
  if (pos === 'M1') return 'C';
  if (pos === 'M2') return 'ROV';
  if (pos === 'M3') return 'RR';
  return pos;
}

export function getZoneForPosition(pos: string): 'FWD' | 'MID' | 'DEF' | 'RUCK' {
  const norm = normalizePosition(pos);
  for (const [zone, posList] of Object.entries(POSITION_GROUPS)) {
    if (posList.includes(norm) || posList.includes(pos)) {
      return zone as 'FWD' | 'MID' | 'DEF' | 'RUCK';
    }
  }
  if (['FF', 'FP', 'FP-L', 'FP-R', 'CHF', 'HF', 'HF-L', 'HF-R', 'LFP', 'RFP', 'LHF', 'RHF'].includes(norm)) return 'FWD';
  if (['C', 'ROV', 'RR', 'W', 'W-L', 'W-R', 'LW', 'RW', 'M1', 'M2', 'M3'].includes(norm)) return 'MID';
  if (['FB', 'BP', 'BP-L', 'BP-R', 'CHB', 'HB', 'HB-L', 'HB-R', 'LBP', 'RBP', 'LBF', 'RBF'].includes(norm)) return 'DEF';
  if (['R', 'RUCK'].includes(norm)) return 'RUCK';
  return 'MID';
}

export function normalizeLineup(lineupObj: Record<string, string>): Record<string, string> {
  if (!lineupObj) return {};
  const newObj: Record<string, string> = {};
  for (const [key, val] of Object.entries(lineupObj)) {
    const normKey = normalizePosition(key);
    newObj[normKey] = val;
  }
  return newObj;
}

export function normalizePlayers<T extends { positions?: string[] }>(playersList: T[]): T[] {
  if (!Array.isArray(playersList)) return [];
  return playersList.map((p) => {
    if (!p.positions || !Array.isArray(p.positions)) return p;
    let changed = false;
    const normPositions = p.positions.map((pos) => {
      const n = normalizePosition(pos);
      if (n !== pos) changed = true;
      return n;
    });
    return changed ? { ...p, positions: normPositions } : p;
  });
}

export const DEFAULT_PLAYERS: Player[] = [
  { id: 'p1', name: 'Alex Morgan', nick: '', number: '7', positions: ['MID'], primaryZone: 'MID', status: 'available', active: 1980, bench: 720, note: '', slotTimes: { 'C': 1200, 'ROV': 480, 'RR': 300 } },
  { id: 'p2', name: 'Bella Hart', nick: '', number: '12', positions: ['FWD'], primaryZone: 'FWD', status: 'available', active: 1620, bench: 1080, note: '', slotTimes: { 'FF': 1020, 'FP-L': 600 } },
  { id: 'p3', name: 'Chloe Nguyen', nick: '', number: '18', positions: ['DEF'], primaryZone: 'DEF', status: 'available', active: 2200, bench: 500, note: '', slotTimes: { 'CHB': 1400, 'HB-L': 800 } },
  { id: 'p4', name: 'Daisy King', nick: '', number: '22', positions: ['MID'], primaryZone: 'MID', status: 'available', active: 1800, bench: 900, note: '', slotTimes: { 'W-L': 1100, 'W-R': 700 } },
  { id: 'p5', name: 'Evie Brown', nick: '', number: '31', positions: ['FWD'], primaryZone: 'FWD', status: 'available', active: 1500, bench: 1200, note: '', slotTimes: { 'CHF': 900, 'HF-R': 600 } },
  { id: 'p6', name: 'Frankie Lee', nick: '', number: '44', positions: ['DEF'], primaryZone: 'DEF', status: 'available', active: 2040, bench: 660, note: '', slotTimes: { 'FB': 1440, 'BP-R': 600 } },
  { id: 'p7', name: 'Georgia Smith', nick: '', number: '55', positions: ['RUCK'], primaryZone: 'RUCK', status: 'available', active: 2300, bench: 400, note: '', slotTimes: { 'R': 2300 } },
  { id: 'p8', name: 'Harper Jones', nick: '', number: '5', positions: ['MID'], primaryZone: 'MID', status: 'available', active: 0, bench: 0, note: '' },
  { id: 'p9', name: 'Indie Patel', nick: '', number: '9', positions: ['FWD'], primaryZone: 'FWD', status: 'available', active: 0, bench: 0, note: '' },
  { id: 'p10', name: 'Jess Taylor', nick: '', number: '14', positions: ['DEF'], primaryZone: 'DEF', status: 'available', active: 0, bench: 0, note: '' },
  { id: 'p11', name: 'Kai Wilson', nick: '', number: '23', positions: ['MID'], primaryZone: 'MID', status: 'available', active: 0, bench: 0, note: '' },
  { id: 'p12', name: 'Luca Green', nick: '', number: '33', positions: ['FWD'], primaryZone: 'FWD', status: 'available', active: 0, bench: 0, note: '' },
  { id: 'p13', name: 'Mia Clarke', nick: '', number: '41', positions: ['DEF'], primaryZone: 'DEF', status: 'available', active: 0, bench: 0, note: '' },
  { id: 'p14', name: 'Nora Hall', nick: '', number: '2', positions: ['MID'], primaryZone: 'MID', status: 'available', active: 0, bench: 0, note: '' },
  { id: 'p15', name: 'Olive White', nick: '', number: '16', positions: ['FWD'], primaryZone: 'FWD', status: 'available', active: 0, bench: 0, note: '' },
  { id: 'p16', name: 'Piper Young', nick: '', number: '27', positions: ['DEF'], primaryZone: 'DEF', status: 'available', active: 0, bench: 0, note: '' },
  { id: 'p17', name: 'Quinn Baker', nick: '', number: '36', positions: ['MID'], primaryZone: 'MID', status: 'available', active: 0, bench: 0, note: '' },
  { id: 'p18', name: 'Ruby Scott', nick: '', number: '49', positions: ['DEF'], primaryZone: 'DEF', status: 'available', active: 0, bench: 0, note: '' },
  { id: 'p19', name: 'Sasha Evans', nick: '', number: '60', positions: ['FWD'], primaryZone: 'FWD', status: 'available', active: 0, bench: 0, note: '' },
  { id: 'p20', name: 'Tilly Adams', nick: '', number: '71', positions: ['MID'], primaryZone: 'MID', status: 'available', active: 0, bench: 0, note: '' },
];

export const DEFAULT_DRILLS: Drill[] = [
  {
    id: "one-v-one-kick-tennis",
    title: "1v1 Kick Tennis",
    cat: "Kicking",
    mins: 10,
    players: "Pairs",
    overview: "A two-square kicking contest that develops control of the kick and the positioning needed to cover the ball's drop.",
    steps: [
      ["Set up", "Mark two 10m x 10m squares, 15m apart. Put one player in each square."],
      ["Kick to score", "Player 1 kicks into the opposing square, aiming for the ball to land inside or force a fumble."],
      ["Read the drop", "Player 2 reads the kick and works to intercept-mark before the ball hits the ground."],
      ["Return kick", "Player 2 sets up and kicks back into Player 1's square."],
      ["Repeat", "Continue back and forth. A point is scored whenever a kick lands inside the opponent's square."]
    ],
    diagram: {
      zones: [
        { x: 120, y: 150, width: 220, height: 220, label: 'POSITION A' },
        { x: 560, y: 150, width: 220, height: 220, label: 'POSITION B' }
      ],
      cones: [
        { x: 120, y: 150 }, { x: 340, y: 150 }, { x: 120, y: 370 }, { x: 340, y: 370 },
        { x: 560, y: 150 }, { x: 780, y: 150 }, { x: 560, y: 370 }, { x: 780, y: 370 }
      ],
      players: [
        { label: '1', x: 230, y: 260 },
        { label: '2', x: 670, y: 260, kind: 'opp' }
      ],
      arrows: [
        { path: 'M255 245 C390 100,510 100,645 245', color: '#C6FF32', dash: '10 8' },
        { path: 'M645 275 C510 420,390 420,255 275', color: '#C6FF32', dash: '10 8' }
      ],
      ballPositions: [
        { x: 230, y: 260 },
        { x: 450, y: 140 },
        { x: 645, y: 245 },
        { x: 450, y: 380 },
        { x: 255, y: 275 }
      ]
    }
  },
  {
    id: "hot-spot-kick",
    title: "Hot Spot Kick & Front Square",
    cat: "Kicking",
    mins: 12,
    players: "12+",
    overview: "Kicking the ball under pressure to the hot spot, then getting front and square.",
    steps: [
      ["Setup", "Players start wide of goal with support runners front and square."],
      ["Kick", "A kicks under pressure to the marked hot spot."],
      ["Front square", "E moves toward the drop zone while support players attack the crumb."],
      ["Reset", "Players reset and rotate through the stations."]
    ],
    diagram: {
      players: [
        { label: 'A', x: 250, y: 300 },
        { label: 'E', x: 560, y: 350 },
        { label: 'D', x: 740, y: 300, kind: 'opp' }
      ],
      contestCircle: { x: 700, y: 255, r: 55, color: '#F97316', label: 'HOT SPOT' },
      arrows: [
        { path: 'M270 285 C420 190,560 170,690 240', color: '#DC2626', dash: '10 8' },
        { path: 'M560 340 C620 300,660 275,685 265', color: '#38BDF8', dash: '6 6' }
      ],
      ballPositions: [
        { x: 250, y: 300 },
        { x: 480, y: 200 },
        { x: 700, y: 255 },
        { x: 700, y: 255 }
      ]
    }
  },
  {
    id: "criss-cross-handball",
    title: "Criss-Cross Handball",
    cat: "Handball",
    mins: 12,
    players: "8-20",
    overview: "Using peripheral vision to sense incoming players is necessary to avoid being tackled or bumped. This drill simulates players approaching from the side, which requires evasive skills to avoid a collision.",
    steps: [
      ["Setup", "(A) runs and handballs diagonally across to (B)."],
      ["Peripheral vision", "(A) should keep their eyes on (B), but use peripheral vision to avoid colliding with the intersecting group."],
      ["Avoid collision", "If a collision is imminent, players must avoid this by spinning, side-stepping or holding their ground."],
      ["Call", "(B) must call with a loud voice as they will be in traffic."],
      ["Simultaneous line", "Simultaneously (C) runs and handballs diagonally across to (D), and must also avoid colliding with the intersecting group."],
      ["Repeat", "The process is repeated with (B) handballing to the next (A), and (D) handballing to the next (C)."]
    ],
    diagram: {
      cones: [{ x: 170, y: 390 }, { x: 730, y: 105 }, { x: 170, y: 105 }, { x: 730, y: 390 }],
      players: [
        { label: 'A', x: 170, y: 390 },
        { label: 'B', x: 730, y: 105 },
        { label: 'C', x: 170, y: 105, kind: 'opp' },
        { label: 'D', x: 730, y: 390, kind: 'opp' }
      ],
      arrows: [
        { path: 'M190 372 C340 260,540 210,710 120', color: '#1D4ED8', dash: '12 8' },
        { path: 'M190 122 C350 235,545 285,710 372', color: '#A3E635', dash: '12 8' }
      ],
      contestCircle: { x: 450, y: 250, r: 45, color: '#F97316' },
      ballPositions: [
        { x: 190, y: 372 },
        { x: 400, y: 220 },
        { x: 450, y: 250 },
        { x: 710, y: 120 },
        { x: 400, y: 290 },
        { x: 190, y: 372 }
      ]
    }
  },
  {
    id: "marking-contest",
    title: "Marking Contest 1-on-1",
    cat: "Marking",
    mins: 10,
    players: "Pairs",
    overview: "It's handy having smaller players who are strong overhead and can take a mark up forward. This drill pits players of similar stature against one another in a marking contest to improve marking ability.",
    steps: [
      ["Pair up", "(A) and (B) set up shoulder-to-shoulder of similar stature."],
      ["Delivery", "Coach kicks to the contest."],
      ["Contest", "Players compete to mark or spoil."],
      ["Rotate", "Next pair enters."]
    ],
    diagram: {
      cones: [{ x: 350, y: 285 }, { x: 560, y: 285 }, { x: 450, y: 420 }],
      players: [
        { label: 'C', x: 450, y: 400, kind: 'coach' },
        { label: 'A', x: 410, y: 235 },
        { label: 'B', x: 495, y: 235, kind: 'opp' }
      ],
      arrows: [{ path: 'M450 385 C445 325,450 285,455 245', color: '#DC2626' }],
      ballPositions: [
        { x: 450, y: 385 },
        { x: 450, y: 300 },
        { x: 452, y: 245 },
        { x: 452, y: 245 }
      ]
    }
  },
  {
    id: "three-man-weave",
    title: "Three Man Weave",
    cat: "Handball",
    mins: 10,
    players: "Groups of 3",
    overview: "After handballing to a teammate, players must instinctively protect them. This drill simulates protecting teammates by weaving behind and feigning a shepherd after handballing to them.",
    steps: [
      ["Start", "The middle player (A) always starts with the ball, runs and handballs sideways to either (B) or (C) who are calling for the ball."],
      ["Shepherd", "After giving, (A) must then run behind the recipient with arms outstretched, instructing them."],
      ["Weave", "The first receiver then handballs sideways to the third player who is running at pace and calling for the ball."],
      ["Shepherd again", "After giving, this player must then run behind the recipient with arms outstretched, instructing them."],
      ["Finish", "The last recipient handballs to the middle player (A) at the other end."],
      ["Repeat", "The second line repeats the process."]
    ],
    diagram: {
      players: [
        { label: 'A', x: 455, y: 400 },
        { label: 'B', x: 310, y: 260 },
        { label: 'C', x: 600, y: 260 },
        { label: 'A2', x: 455, y: 90 }
      ],
      arrows: [
        { path: 'M455 386 C400 332,360 287,320 268', color: '#1D4ED8', dash: '12 8' },
        { path: 'M320 260 C420 190,500 190,590 255', color: '#A3E635', dash: '9 8' },
        { path: 'M590 250 C540 180,500 130,460 105', color: '#1D4ED8', dash: '12 8' },
        { path: 'M455 392 C385 370,340 320,320 280', color: '#A3E635', dash: '5 8' }
      ],
      ballPositions: [
        { x: 455, y: 392 },
        { x: 320, y: 268 },
        { x: 590, y: 255 },
        { x: 460, y: 105 },
        { x: 460, y: 105 },
        { x: 455, y: 392 }
      ]
    }
  },
  {
    id: "handball-soccer",
    title: "Handball Soccer",
    cat: "Game Sense",
    mins: 15,
    players: "Two teams",
    overview: "Occasionally, games can make training more enjoyable while still making players work hard. This physically demanding drill practices working the ball with handball through traffic while the opposing team defends and looks to create a turnover.",
    steps: [
      ["Setup", "Use cones to create a field of play 30 x 40m, with 2m wide goals at each end. Players may stand anywhere within the field, and may elect to have a goalkeeper. The coach or an assistant umpires."],
      ["Attack", "Team (A) starts with the ball, using handball to move the ball past the opposition and into a position where they can handball a goal."],
      ["Contact rules", "For U/10 and older, opposition players may tackle the player with the ball; younger players should only be allowed to grab the jumper or shorts. Kicking is not allowed."],
      ["Turnover", "Once a turnover occurs, team (B) attacks their goal and team (A) must defend."],
      ["Score", "Keep score and have a short break between halves."]
    ],
    diagram: {
      surface: 'soccer',
      players: [
        { label: 'A', x: 230, y: 260 },
        { label: 'B', x: 335, y: 190 },
        { label: 'C', x: 335, y: 330 },
        { label: '1', x: 520, y: 260, kind: 'opp' },
        { label: '2', x: 620, y: 190, kind: 'opp' },
        { label: '3', x: 635, y: 330, kind: 'opp' }
      ],
      arrows: [{ path: 'M235 260 C395 120,565 145,780 255', color: '#1D4ED8', dash: '12 7' }],
      ballPositions: [
        { x: 255, y: 250 },
        { x: 420, y: 175 },
        { x: 570, y: 235 },
        { x: 775, y: 255 },
        { x: 775, y: 255 }
      ]
    }
  },
  {
    id: "eight-point-front-square",
    title: "8-Point Front and Square Handball",
    cat: "Handball",
    mins: 12,
    players: "8+",
    overview: "This drill teaches players to make the correct position front and square to make a handball as easy as possible for their teammate. If they are in the wrong position or leave too early, the handball will be prone to error.",
    steps: [
      ["Setup", "Set players up around the 8-point pattern with a ball carrier at each station."],
      ["Front and square", "Each receiver must time their run to be front and square before the handball is delivered."],
      ["Handball", "The ball carrier delivers a handball once the receiver is in the correct position."],
      ["Rotate", "Players rotate through each station around the pattern."]
    ],
    diagram: {
      cones: [
        { x: 450, y: 90 }, { x: 650, y: 140 }, { x: 730, y: 270 }, { x: 650, y: 400 },
        { x: 450, y: 450 }, { x: 250, y: 400 }, { x: 170, y: 270 }, { x: 250, y: 140 }
      ],
      players: [
        { label: 'A', x: 450, y: 90 },
        { label: 'B', x: 650, y: 140 }
      ],
      arrows: [{ path: 'M475 105 C540 115,595 125,635 145', color: '#A3E635', dash: '8 8' }],
      ballPositions: [
        { x: 450, y: 90 },
        { x: 550, y: 110 },
        { x: 650, y: 140 },
        { x: 500, y: 95 }
      ]
    }
  },
  {
    id: "switch-through-centre",
    title: "Switch Through the Centre Handball & Kick",
    cat: "Kicking",
    mins: 12,
    players: "8+",
    overview: "Quickly switching play is vital to open up space to lead into. This drill practices creating space by handballing or kicking to a player front and square in a central position, who then gives to a wider running option.",
    steps: [
      ["Setup", "Players form lines either side of a central target station."],
      ["Central delivery", "Deliver by handball or kick to the player front and square in the centre."],
      ["Switch wide", "The central player gives on to a wider running option to switch the play."],
      ["Rotate", "Players rotate through the lines and repeat."]
    ],
    diagram: {
      cones: [{ x: 450, y: 320 }],
      players: [
        { label: 'A', x: 200, y: 260 },
        { label: 'T', x: 450, y: 260 },
        { label: 'W', x: 720, y: 140 }
      ],
      arrows: [
        { path: 'M225 258 C300 258,370 258,430 260', color: '#1D4ED8', dash: '8 8' },
        { path: 'M470 250 C560 200,650 165,700 148', color: '#A3E635', dash: '8 8' }
      ],
      ballPositions: [
        { x: 200, y: 260 },
        { x: 450, y: 260 },
        { x: 650, y: 180 },
        { x: 200, y: 260 }
      ]
    }
  },
  {
    id: "crumbing-triangle",
    title: "Crumbing Triangle",
    cat: "Contested Ball",
    mins: 12,
    players: "Groups of 5",
    overview: "Working low to the ground helps strengthen a player through the hips. Requires intense concentration by the crumber, especially when tired.",
    steps: [
      ["Setup", "Mark playing triangles with cones about 5m apart. Split into groups of 5 and give each group 2 balls. Choose an attacker and a defender."],
      ["Work the sides", "The attacker has a ball, as does one outside player. The remaining 3 players work the length of one side of the triangle each."],
      ["Crumb", "Players focus on working low to the ground to win the crumb under pressure."],
      ["Rotate", "Rotate roles so every player has a turn as attacker and defender."]
    ],
    diagram: {
      cones: [{ x: 450, y: 120 }, { x: 320, y: 400 }, { x: 580, y: 400 }],
      players: [
        { label: 'B', x: 450, y: 130 },
        { label: 'E', x: 320, y: 400 },
        { label: 'F', x: 580, y: 400 },
        { label: 'A', x: 430, y: 345 },
        { label: 'D', x: 470, y: 355, kind: 'opp' }
      ],
      arrows: [{ path: 'M450 145 C450 220,450 280,450 330', color: '#DC2626', dash: '8 6' }],
      ballPositions: [
        { x: 450, y: 130 },
        { x: 450, y: 250 },
        { x: 450, y: 350 },
        { x: 450, y: 350 }
      ]
    }
  },
  {
    id: "red-rover-handball",
    title: "Red Rover Handball",
    cat: "Decision Making",
    mins: 12,
    players: "Two teams",
    overview: "Quick thinking and smart decision making are vital attributes a good player must possess. This drill makes a player weigh up whether to 'have a shot' at an opponent, or move the ball to a teammate in a better position. It also teaches evasive skills.",
    steps: [
      ["Setup", "Mark a playing area 30m long x 20m wide with 6 or more cones."],
      ["Split teams", "Form two teams: one starts scattered within the area, the other spreads across one end of the zone."],
      ["Decide", "Ball carriers must decide whether to take on the defender or move it to a better-placed teammate."],
      ["Rotate", "Swap roles and repeat with a fresh group."]
    ],
    diagram: {
      zones: [{ x: 150, y: 150, width: 600, height: 220, label: 'PLAY ZONE' }],
      players: [
        { label: 'A', x: 300, y: 260 },
        { label: 'D', x: 500, y: 260, kind: 'opp' },
        { label: 'T', x: 650, y: 200 }
      ],
      arrows: [
        { path: 'M320 255 C420 210,530 200,635 205', color: '#A3E635', dash: '8 8' },
        { path: 'M320 260 C380 260,440 260,480 260', color: '#DC2626', dash: '4 6' }
      ],
      ballPositions: [
        { x: 300, y: 260 },
        { x: 300, y: 260 },
        { x: 400, y: 250 },
        { x: 635, y: 205 }
      ]
    }
  },
  {
    id: "decision-making-lanework",
    title: "Decision Making Lanework",
    cat: "Decision Making",
    mins: 12,
    players: "Groups in lanes",
    overview: "Players must quickly decide which option is best when two are presented. Don't panic, keep a cool head under pressure and see where the overloaded defender is committing.",
    steps: [
      ["Setup", "One third of players are given a defender's strip and start in the middle of 3 lanes that begin about 30m apart, with cones (A-B-C) only a few metres apart."],
      ["Read the defender", "Ball carriers read which way the defender commits before choosing their option."],
      ["Execute", "Deliver to the free option in the lane."],
      ["Rotate", "Rotate through defender and attacker roles."]
    ],
    diagram: {
      cones: [{ x: 300, y: 260 }, { x: 450, y: 260 }, { x: 600, y: 260 }],
      players: [
        { label: 'Def', x: 450, y: 300, kind: 'opp' },
        { label: 'X', x: 450, y: 420 },
        { label: 'A', x: 300, y: 420 },
        { label: 'C', x: 600, y: 420 }
      ],
      arrows: [
        { path: 'M440 405 C400 360,350 320,310 275', color: '#38BDF8', dash: '8 8' },
        { path: 'M460 405 C500 360,550 320,590 275', color: '#38BDF8', dash: '8 8' }
      ],
      ballPositions: [
        { x: 450, y: 420 },
        { x: 450, y: 380 },
        { x: 350, y: 300 },
        { x: 450, y: 420 }
      ]
    }
  },
  {
    id: "loose-ball-1on1",
    title: "Loose Ball 1-on-1",
    cat: "Contested Ball",
    mins: 10,
    players: "2 lines",
    overview: "Being first to the ball is critical, as is attacking it fiercely. This drill makes players engage in a 1-on-1 duel to win the crumb.",
    steps: [
      ["Setup", "Coach (C) stands 15m away from 2 lines of players."],
      ["Delivery", "Coach delivers a loose ball between the front two players in each line."],
      ["Contest", "The pair engage in a 1-on-1 duel to win the crumb."],
      ["Rotate", "Next pair steps forward and repeat."]
    ],
    diagram: {
      players: [
        { label: 'C', x: 450, y: 120, kind: 'coach' },
        { label: 'A', x: 400, y: 260 },
        { label: 'B', x: 500, y: 260, kind: 'opp' }
      ],
      arrows: [{ path: 'M450 140 C450 175,450 205,450 225', color: '#DC2626', dash: '6 6' }],
      ballPositions: [
        { x: 450, y: 120 },
        { x: 450, y: 220 },
        { x: 450, y: 260 },
        { x: 450, y: 260 }
      ]
    }
  },
  {
    id: "kick-follow-up-hands",
    title: "Kick & Follow-Up Hands",
    cat: "Kicking",
    mins: 12,
    players: "4 stations",
    overview: "Defenders and midfielders are encouraged to run forward to the next contest after kicking. This drill teaches players to sprint after their kick to become a running handball option for players upfield.",
    steps: [
      ["Setup", "Two lines form at each of stations (A), (B), (C) and (D)."],
      ["Mark and return", "The left cone player marks, gives a return handball and stays at the station."],
      ["Kick and follow", "The right cone player kicks and then runs to the next station to follow up."],
      ["Rotate", "Continue through all stations."]
    ],
    diagram: {
      cones: [{ x: 250, y: 260 }, { x: 650, y: 260 }, { x: 450, y: 150 }],
      players: [
        { label: 'L', x: 230, y: 260 },
        { label: 'R', x: 670, y: 260 }
      ],
      arrows: [
        { path: 'M650 250 C550 200,400 200,260 250', color: '#DC2626', dash: '10 8' },
        { path: 'M670 250 C620 200,540 170,460 155', color: '#38BDF8', dash: '6 6' }
      ],
      ballPositions: [
        { x: 650, y: 260 },
        { x: 260, y: 255 },
        { x: 450, y: 170 },
        { x: 250, y: 260 }
      ]
    }
  },
  {
    id: "backdoor-switch-handball",
    title: "Backdoor Switch Handball",
    cat: "Strategy",
    mins: 10,
    players: "Small groups",
    overview: "When the field ahead is congested, a sideways switch is a good option as it opens up space for players to lead into. This drill replicates a mark or free to a player, who uses a player running through the backdoor who then switches laterally to an open running player.",
    steps: [
      ["Mark or free", "(A) starts with the ball, replicating a situation where they have taken a mark or been awarded a free, by backpedaling from their station. Hearing a call from (B), (A) turns and handballs backwards to (B)."],
      ["Time the run", "(B) is running towards (C) and must time their run to make (A)'s handball easy."],
      ["Switch", "(B) switches the ball laterally to the open running player."],
      ["Rotate", "Rotate through the stations and repeat."]
    ],
    diagram: {
      players: [
        { label: 'A', x: 350, y: 320 },
        { label: 'B', x: 480, y: 230 },
        { label: 'X', x: 715, y: 300 }
      ],
      arrows: [
        { path: 'M370 305 C420 275,450 250,470 235', color: '#1D4ED8', dash: '8 8' },
        { path: 'M500 225 C600 210,680 240,715 300', color: '#A3E635', dash: '8 8' }
      ],
      ballPositions: [
        { x: 350, y: 320 },
        { x: 480, y: 230 },
        { x: 715, y: 300 },
        { x: 350, y: 320 }
      ]
    }
  },
  {
    id: "kick-to-space-numbers",
    title: "Kick to Space with Numbers",
    cat: "Kicking",
    mins: 12,
    players: "Pairs",
    overview: "Kicking to a player who is leading at 45 degrees is a difficult skill, as players must judge their teammate's speed and angle and put the ball to a spot they can run onto. This drill practices kicking to players leading at 45 degrees, both defensively and into attack, working in pairs.",
    steps: [
      ["Start", "Pair (A) starts by kicking to pair (B)."],
      ["Lead", "(B) leads wide and defensively."],
      ["Kick to the spot", "Players should kick so the leading player can run onto the ball, not have to wait under it. Don't let players 'cheat' by always coming across the front - receiving around the back is more realistic."],
      ["Continue the loop", "Pairs (C), (D) and (A) repeat the actions of pair (B) to complete the loop."]
    ],
    diagram: {
      players: [
        { label: 'A', x: 200, y: 380 },
        { label: 'B', x: 480, y: 150 }
      ],
      arrows: [{ path: 'M225 365 C320 280,400 210,460 165', color: '#DC2626', dash: '10 8' }],
      ballPositions: [
        { x: 200, y: 380 },
        { x: 350, y: 260 },
        { x: 480, y: 150 },
        { x: 480, y: 150 }
      ]
    }
  },
  {
    id: "huddle-and-break",
    title: "Huddle and Break",
    cat: "Strategy",
    mins: 12,
    players: "Full group",
    overview: "The huddle is a formation where all players bunch together as the full-back prepares for the kick-in. It's an effective way to play long and safe when looking to hold onto a lead, as it allows a team to gather numbers and be first to the kick-in area.",
    steps: [
      ["Assign roles", "Designate one player as the decoy (B), one as centre half forward (D), and one as full forward (E)."],
      ["Huddle", "All players bunch together in the huddle formation as the full-back prepares the kick-in."],
      ["Break", "On the kick-in, players break from the huddle to their assigned targets."],
      ["Rotate", "Rotate roles and repeat."]
    ],
    diagram: {
      players: [
        { label: 'H', x: 200, y: 260 },
        { label: 'B', x: 400, y: 140 },
        { label: 'D', x: 550, y: 280 },
        { label: 'E', x: 750, y: 150 }
      ],
      arrows: [
        { path: 'M220 250 C280 210,340 175,390 150', color: '#A3E635', dash: '8 8' },
        { path: 'M220 265 C320 275,440 280,540 280', color: '#DC2626', dash: '10 8' },
        { path: 'M220 255 C400 200,600 175,740 155', color: '#38BDF8', dash: '6 6' }
      ],
      ballPositions: [
        { x: 200, y: 260 },
        { x: 200, y: 260 },
        { x: 550, y: 280 },
        { x: 200, y: 260 }
      ]
    }
  },
  {
    id: "left-right-combo",
    title: "Left and Right Combo",
    cat: "Fitness",
    mins: 10,
    players: "Groups of 3",
    overview: "This drill should be used pre-season and during warm-up to sharpen ball-taking reflexes and develop reflex handball with both hands. Concentration is required to keep errors from keeping in when players become tired.",
    steps: [
      ["Solo start", "One player goes solo, in this case (A), who handballs to (B)."],
      ["Reflex catch", "As the ball is in flight towards (B), (C) handballs to (A), who must take a reflex catch."],
      ["Continue", "Repeat the pattern continuously to build reflex speed."],
      ["Rotate", "Rotate positions so each player gets reps in every role."]
    ],
    diagram: {
      players: [
        { label: 'A', x: 300, y: 260 },
        { label: 'B', x: 500, y: 180 },
        { label: 'C', x: 500, y: 340 }
      ],
      arrows: [
        { path: 'M320 250 C380 220,440 200,485 185', color: '#A3E635', dash: '8 8' },
        { path: 'M485 330 C420 310,360 285,320 268', color: '#1D4ED8', dash: '8 8' }
      ],
      ballPositions: [
        { x: 300, y: 260 },
        { x: 480, y: 190 },
        { x: 320, y: 270 },
        { x: 480, y: 340 }
      ]
    }
  },
  {
    id: "tap-and-crumb",
    title: "Tap and Crumb",
    cat: "Fitness",
    mins: 10,
    players: "Pairs",
    overview: "This drill is good pre-season as it develops aerobic fitness through an intense 60-90 second period of jumping up high and bending down low. It's also useful for improving the crumbing skills of taller players.",
    steps: [
      ["Setup", "Pair up players, one at the tap and one crumbing."],
      ["Tap", "(B) handballs a ball at the feet of (A)."],
      ["Crumb", "(A) works low to the ground to gather the crumb."],
      ["Repeat", "Continue for 60-90 seconds then rotate roles."]
    ],
    diagram: {
      players: [
        { label: 'A', x: 400, y: 280 },
        { label: 'B', x: 400, y: 180 }
      ],
      arrows: [{ path: 'M400 195 C400 220,400 250,400 268', color: '#DC2626', dash: '6 6' }],
      ballPositions: [
        { x: 400, y: 180 },
        { x: 400, y: 230 },
        { x: 400, y: 280 },
        { x: 400, y: 180 }
      ]
    }
  },
  {
    id: "shuttle-run-stop-kick",
    title: "Shuttle Run Stop Kick",
    cat: "Kicking",
    mins: 10,
    players: "Pairs",
    overview: "A form of evasion is for players to stop suddenly, but this often requires a quick kick as they won't have time to regain momentum. This drill makes players run hard, then forces them to concentrate on balancing before kicking so they hit the target.",
    steps: [
      ["Setup", "Split into pairs, each pair with a footy and 2 cones. Cones go on the boundary 5m apart, leaving a 1m gap from the next pair. A third cone is set 20m infield, level with the middle of the two outer cones."],
      ["Shuttle run", "Players run hard between the cones."],
      ["Stop and kick", "Players stop suddenly, balance, and kick to the target cone."],
      ["Rotate", "Swap roles and repeat."]
    ],
    diagram: {
      cones: [{ x: 150, y: 450 }, { x: 250, y: 450 }, { x: 200, y: 200 }],
      players: [{ label: 'A', x: 200, y: 460 }],
      arrows: [{ path: 'M200 440 C200 380,200 300,200 220', color: '#DC2626', dash: '8 8' }],
      ballPositions: [
        { x: 200, y: 460 },
        { x: 200, y: 460 },
        { x: 200, y: 250 },
        { x: 200, y: 460 }
      ]
    }
  },
  {
    id: "second-effort-circuit",
    title: "Second Effort Circuit",
    cat: "Fitness",
    mins: 15,
    players: "Even numbers",
    overview: "Players should never give the ball then stop. This drill teaches players to continue running after disposal to provide a support upfield and get a second possession.",
    steps: [
      ["Setup", "Even numbers behind four stations in a rectangle approximately 70m x 30m for seniors. The basic pattern is a player receives, disposes, runs to be the receiver at the next station, then has a second disposal."],
      ["First effort", "(A) handballs to (B) running past. (B) receives, turns, runs their distance then kicks long to leading (C), while (A) sprints up the ground after (B)'s kick."],
      ["U-turn", "After kicking, (B) does a U-turn and joins station (A) - emphasize kickers must do this rather than continue running to (C)."],
      ["Second line", "(A) handballs to (D), who in turn handballs back to (C)."],
      ["Second effort", "(C) kicks long to (B), while (D) sprints up the ground to get to the next contest, then does a U-turn and joins station (D)."],
      ["Finish", "(B) marks and handballs to (D), who has run up the ground to receive; (D) then handballs to (A), who handballs to (B)."]
    ],
    diagram: {
      players: [
        { label: 'A', x: 150, y: 400 },
        { label: 'B', x: 500, y: 400 },
        { label: 'C', x: 750, y: 150 },
        { label: 'D', x: 150, y: 150 }
      ],
      arrows: [
        { path: 'M175 385 C350 300,550 220,725 165', color: '#DC2626', dash: '10 8' },
        { path: 'M175 150 C350 220,480 300,500 385', color: '#38BDF8', dash: '8 8' }
      ],
      ballPositions: [
        { x: 150, y: 400 },
        { x: 750, y: 150 },
        { x: 500, y: 380 },
        { x: 150, y: 150 },
        { x: 500, y: 380 },
        { x: 150, y: 400 }
      ]
    }
  },
  {
    id: "inside-runners",
    title: "Inside Runners",
    cat: "Kicking",
    mins: 15,
    players: "6 stations (A-F)",
    overview: "Kicks to players on long leads are difficult and require precision to maintain possession. Players leading towards the boundary make their next kick easier to defend, so to break the lines, an inside runner is the tonic for gaining yards and setting up a longer next kick.",
    steps: [
      ["Setup", "Form even numbers behind stations (A) to (F)."],
      ["Kick-out", "(A) starts with a kick-out from full-back to (B), who has led from the edge of the square at CHB. Players join the next station in sequence after disposal."],
      ["Inside run", "(B) marks, wheels around looking to play on, but instead hears a call from (C) streaming through on the inside and handballs to them. The timing of (C)'s run is crucial - too early won't work, too late and they'll be covered."],
      ["Break the lines", "(C) must be steaming through at pace, then makes yards before kicking long to leading (D). A bounce is acceptable for weaker kicks."],
      ["Far wing lead", "(D) simulates a defensive mark, back-pedals, then honours a lead made by (E) to the far wing. (F) cuts inside and delivers a kick to (A), who marks and the circuit begins again."],
      ["Progression", "Optional: introduce defenders to stand the marks of (B & E), who can tackle runners (C & F) or apply token pressure."]
    ],
    diagram: {
      players: [
        { label: 'A', x: 100, y: 450 },
        { label: 'B', x: 260, y: 360 },
        { label: 'C', x: 430, y: 260 },
        { label: 'D', x: 600, y: 170 },
        { label: 'E', x: 760, y: 110 },
        { label: 'F', x: 820, y: 300 }
      ],
      arrows: [
        { path: 'M125 435 C170 405,215 385,250 370', color: '#DC2626', dash: '10 8' },
        { path: 'M280 350 C330 320,375 290,415 270', color: '#A3E635', dash: '9 8' },
        { path: 'M450 250 C500 220,550 195,585 178', color: '#1D4ED8', dash: '10 8' },
        { path: 'M620 160 C670 140,715 122,748 115', color: '#38BDF8', dash: '8 8' },
        { path: 'M800 290 C700 380,400 440,130 460', color: '#7C3AED', dash: '6 8' }
      ],
      ballPositions: [
        { x: 100, y: 450 },
        { x: 260, y: 360 },
        { x: 430, y: 260 },
        { x: 600, y: 170 },
        { x: 760, y: 110 },
        { x: 820, y: 300 }
      ]
    }
  },
  {
    id: "front-square-cutover",
    title: "Front and Square Cutover",
    cat: "Handball",
    mins: 12,
    players: "Even numbers",
    overview: "A warm-up drill that focuses on accurate delivery of kicks, plus the timing of a front & square runner who releases a link player out wide.",
    steps: [
      ["Setup", "Players form even numbers behind cones. If there are 24+ players, split into two groups using both ends of the ground, or use 2 balls."],
      ["First handball", "(A) starts by running out and handballing to (B) cutting across, who has timed their run to be front and square."],
      ["Second handball", "(B) takes and handballs to (C) running wider."],
      ["Long kick", "(C) runs, steadies and kicks long to leading (D), who marks and gives quickly to (E) cutting across front and square."]
    ],
    diagram: {
      players: [
        { label: 'A', x: 200, y: 380 },
        { label: 'B', x: 350, y: 300 },
        { label: 'C', x: 520, y: 260 },
        { label: 'D', x: 700, y: 160 },
        { label: 'E', x: 760, y: 220 }
      ],
      arrows: [
        { path: 'M225 365 C270 340,310 320,335 305', color: '#A3E635', dash: '8 8' },
        { path: 'M370 295 C420 280,470 270,505 262', color: '#A3E635', dash: '8 8' },
        { path: 'M540 250 C600 220,650 195,685 170', color: '#DC2626', dash: '10 8' },
        { path: 'M715 165 C730 180,745 195,755 210', color: '#38BDF8', dash: '5 6' }
      ],
      ballPositions: [
        { x: 200, y: 380 },
        { x: 350, y: 300 },
        { x: 520, y: 260 },
        { x: 700, y: 160 }
      ]
    }
  },
  {
    id: "fat-side-avenue",
    title: "Fat Side Avenue to Goal",
    cat: "Game Sense",
    mins: 18,
    players: "Large group + opposition",
    overview: "Collingwood are famous for 'going wide' instead of down the middle as their avenue to goal. This opens up play and allows a team to utilise the space on the 'fat' side. This competitive drill simulates switching to the fat side and attacking down the open wing.",
    steps: [
      ["Setup", "Choose 4 red opposition players (1-4). Everyone else forms even numbers behind stations, with (C) and opposition (1) starting in the northern goalsquare, (G), (H) and defender (4) in the southern goalsquare, and opposition (5) and (6) held in reserve."],
      ["Win the overlap", "On the whistle (A) starts by simulating a defensive mark, backpedaling and looking upfield. Teammates (A) and (B), plus opposition (1), immediately engage - the goal is to win the 3-on-1 and work the ball through the northern goalsquare by hand and foot under full match conditions (including tackling)."],
      ["Break the fat side", "Either (A), (B) or (C) must hit (D) with a kick. These 4 players carry the ball past opposition (1) and (2) using the open fat side, with kicks allowed but everything play-on."],
      ["Wing support", "The next recipient is either (E) or (F), who have sprinted from the far wing, with defender (3) trying to cover both."],
      ["Finish", "After a target is hit, take a shot, or runners assist to kick the goal if the ball hits the ground. Attacking players (A-D) then join stations (E-H) and vice versa, rotating around one station each time; swap opposition players after 2 ends and introduce extra defenders (5) and (6) for added difficulty."]
    ],
    diagram: {
      players: [
        { label: 'A', x: 600, y: 340 },
        { label: '1', x: 630, y: 310, kind: 'opp' },
        { label: 'D', x: 480, y: 420 },
        { label: 'E', x: 200, y: 460 }
      ],
      arrows: [
        { path: 'M600 355 C560 390,520 415,485 420', color: '#DC2626', dash: '10 8' },
        { path: 'M460 415 C380 440,290 455,215 460', color: '#A3E635', dash: '8 8' },
        { path: 'M220 445 C350 380,550 300,690 260', color: '#38BDF8', dash: '6 8' }
      ],
      ballPositions: [
        { x: 600, y: 340 },
        { x: 600, y: 340 },
        { x: 480, y: 420 },
        { x: 200, y: 460 },
        { x: 700, y: 258 }
      ]
    }
  },
  {
    id: "draw-the-opponent",
    title: "Draw the Opponent 3-on-1",
    cat: "Decision Making",
    mins: 12,
    players: "2 lines + defenders",
    overview: "When an opponent must cover two players, they must choose to keep covering the ball carrier, cover the next probable recipient, or commit to tackling the player with the ball. Players must learn to draw the opponent, then give to a free player.",
    steps: [
      ["Draw", "The middle player in Line (A) starts with the ball, running towards opposition player (B), 10m away."],
      ["Handball off", "When (A) has drawn the opponent, they fire a handball sideways to a teammate, looking at the teammate rather than the opponent."],
      ["Continue", "Once Line (A) is past (B), they handball to the middle player in Line (D)."],
      ["Repeat", "Line (D) then repeats the process, with (C) defending them."],
      ["Increase difficulty", "To increase difficulty, (B) and (C) defend against both lines; lengthen the drill if you choose this option."]
    ],
    diagram: {
      players: [
        { label: 'A', x: 230, y: 320 },
        { label: 'B', x: 420, y: 320, kind: 'opp' },
        { label: 'T1', x: 230, y: 200 },
        { label: 'D', x: 650, y: 320 },
        { label: 'C', x: 650, y: 200, kind: 'opp' },
        { label: 'T2', x: 650, y: 200 }
      ],
      arrows: [
        { path: 'M250 305 C310 300,360 305,400 315', color: '#DC2626', dash: '4 6' },
        { path: 'M235 305 C235 275,232 240,230 215', color: '#A3E635', dash: '8 8' },
        { path: 'M280 200 C400 210,540 215,635 210', color: '#1D4ED8', dash: '8 8' }
      ],
      ballPositions: [
        { x: 230, y: 320 },
        { x: 230, y: 200 },
        { x: 650, y: 320 },
        { x: 650, y: 200 },
        { x: 650, y: 200 }
      ]
    }
  },
  {
    id: "rolling-ball-rising-handball",
    title: "Rolling Ball, Rising Handball",
    cat: "Handball",
    mins: 10,
    players: "Groups of 4",
    overview: "A crumbing player with their head over the ball must often dispose of it immediately as they will be hit hard. This drill teaches players to pick up an erratically bouncing ball, get front and square of a crumber using a loud voice to guide them, and handball on-the-up.",
    steps: [
      ["Roll", "(A) rolls the ball out in front of (B), making it bounce oddly to make it difficult to pick up."],
      ["Gather and give", "(B) gathers and handballs on-the-up to (C)."],
      ["Call and receive", "(C) must be front and square and call with a loud voice."],
      ["Continue", "(C) rolls the ball out in front of (D), who gathers and handballs on-the-up to (A) to continue the cycle."]
    ],
    diagram: {
      players: [
        { label: 'A', x: 200, y: 300 },
        { label: 'B', x: 380, y: 300 },
        { label: 'C', x: 560, y: 300 },
        { label: 'D', x: 740, y: 300 }
      ],
      arrows: [
        { path: 'M220 305 C260 320,320 320,360 308', color: '#F97316', dash: '3 6' },
        { path: 'M400 295 C440 275,500 270,540 290', color: '#A3E635', dash: '8 8' },
        { path: 'M580 305 C620 320,680 320,720 308', color: '#F97316', dash: '3 6' }
      ],
      ballPositions: [
        { x: 290, y: 300 },
        { x: 380, y: 300 },
        { x: 560, y: 300 },
        { x: 740, y: 300 }
      ]
    }
  },
  {
    id: "hashtag-drill",
    title: "AFL Hashtag Drill",
    cat: "Kicking",
    mins: 15,
    players: "8-16",
    overview: "A continuous rotation drill using two connected squares (a '#' hashtag shape) that develops kicking accuracy, leading patterns, timing of movement, communication, ball movement and decision making, plus aerobic conditioning through continuous rotation.",
    steps: [
      ["Setup", "Set up two squares connected together to form a hashtag (#) shape using 8 cones (A-H), with a player starting at each cone and one football at Cone (A)."],
      ["Kick A to B", "Player (A) kicks to Player (B) - hit the leading target and kick to advantage."],
      ["Follow your kick", "After kicking, (A) sprints to follow their kick and joins the back of Cone (B)'s line."],
      ["Kick B to D", "Player (B) marks the ball and immediately kicks to Player (D), then follows their kick and joins Cone (D)."],
      ["Kick D to C", "Player (D) turns and kicks to Player (C), then follows their kick and joins Cone (C)."],
      ["Kick C to A", "Player (C) kicks back to Player (A)'s line and follows their kick - this completes the first square."],
      ["Continue second square", "The same pattern continues through the second square: (E) to (F), (F) to (H), (H) to (G), (G) back to (E), with every player following their kick."],
      ["Progress the drill", "Once the pattern is understood, introduce a second football, increase pace, and have receivers lead before receiving so the drill becomes continuous with multiple balls moving around the hashtag."]
    ],
    diagram: {
      zones: [
        { x: 300, y: 90, width: 300, height: 140, label: 'SQUARE 1' },
        { x: 300, y: 290, width: 300, height: 140, label: 'SQUARE 2' }
      ],
      cones: [
        { x: 300, y: 90 }, { x: 600, y: 90 }, { x: 300, y: 230 }, { x: 600, y: 230 },
        { x: 300, y: 290 }, { x: 600, y: 290 }, { x: 300, y: 430 }, { x: 600, y: 430 }
      ],
      players: [
        { label: 'A', x: 300, y: 90 },
        { label: 'B', x: 600, y: 90 },
        { label: 'C', x: 300, y: 230 },
        { label: 'D', x: 600, y: 230 },
        { label: 'E', x: 300, y: 290 },
        { label: 'F', x: 600, y: 290 },
        { label: 'G', x: 300, y: 430 },
        { label: 'H', x: 600, y: 430 }
      ],
      arrows: [
        { path: 'M320 90 L580 90', color: '#A3E635', dash: '10 8' },
        { path: 'M600 110 L600 210', color: '#A3E635', dash: '10 8' },
        { path: 'M580 230 L320 230', color: '#A3E635', dash: '10 8' },
        { path: 'M300 210 L300 110', color: '#A3E635', dash: '10 8' },
        { path: 'M320 290 L580 290', color: '#1D4ED8', dash: '10 8' },
        { path: 'M600 310 L600 410', color: '#1D4ED8', dash: '10 8' },
        { path: 'M580 430 L320 430', color: '#1D4ED8', dash: '10 8' },
        { path: 'M300 410 L300 310', color: '#1D4ED8', dash: '10 8' }
      ],
      ballPositions: [
        { x: 300, y: 90 },
        { x: 450, y: 90 },
        { x: 600, y: 90 },
        { x: 600, y: 160 },
        { x: 450, y: 230 },
        { x: 300, y: 160 },
        { x: 300, y: 290 },
        { x: 600, y: 430 }
      ]
    }
  },
  {
    id: "circle-work",
    title: "Circle Work",
    cat: "Kicking",
    mins: 10,
    players: "7-11 (6-10 outside + 1 middle)",
    overview: "Kicking to leading targets, using the ball under pressure, and quick decision making with a middle player leading to receive from, and kick back out to, players spread around a circle.",
    steps: [
      ["Setup", "Form a circle of 6-10 players with 1 player in the middle."],
      ["Lead", "The middle player leads sharply towards a player on the outside."],
      ["Kick to the lead", "The outside player presents hands early and kicks to the lead - kicking to space, not directly at the player."],
      ["Mark", "The middle player marks the ball."],
      ["Kick out", "The middle player turns and kicks to another outside player, then continue for 30-60 seconds before rotating the middle player."]
    ],
    diagram: {
      players: [
        { label: '1', x: 680, y: 270 },
        { label: '2', x: 613, y: 390 },
        { label: '3', x: 450, y: 440 },
        { label: '4', x: 287, y: 390 },
        { label: '5', x: 220, y: 270 },
        { label: '6', x: 287, y: 150 },
        { label: '7', x: 450, y: 100 },
        { label: '8', x: 613, y: 150 },
        { label: 'M', x: 450, y: 270 }
      ],
      arrows: [
        { path: 'M450 115 L450 255', color: '#DC2626', dash: '8 8' },
        { path: 'M465 280 L600 375', color: '#A3E635', dash: '8 8' }
      ],
      ballPositions: [
        { x: 450, y: 100 },
        { x: 450, y: 185 },
        { x: 450, y: 270 },
        { x: 531, y: 330 },
        { x: 613, y: 390 }
      ]
    }
  },
  {
    id: "diamond-drill",
    title: "Diamond Drill",
    cat: "Kicking",
    mins: 10,
    players: "Groups of 4",
    overview: "Angled kicking, leading patterns and supporting runs, using a diamond formation where each player kicks to the next point and follows their kick around the diamond.",
    steps: [
      ["Setup", "Form a diamond with (A) at left, (B) at top, (C) at right and (D) at bottom."],
      ["A to B", "(A) kicks to (B), hitting the lead, and follows their kick to join (B)'s line."],
      ["B to C", "(B) kicks to (C), using both sides of the body, and follows their kick to join (C)'s line."],
      ["C to D", "(C) kicks to (D) and follows their kick to join (D)'s line."],
      ["D to A", "(D) kicks back to (A), completing the diamond, and follows their kick to keep moving into (A)'s line."]
    ],
    diagram: {
      players: [
        { label: 'A', x: 280, y: 270 },
        { label: 'B', x: 450, y: 120 },
        { label: 'C', x: 620, y: 270 },
        { label: 'D', x: 450, y: 420 }
      ],
      arrows: [
        { path: 'M300 250 C350 200,400 160,435 135', color: '#A3E635', dash: '10 8' },
        { path: 'M470 135 C520 170,570 210,605 250', color: '#A3E635', dash: '10 8' },
        { path: 'M610 290 C570 330,520 370,470 405', color: '#A3E635', dash: '10 8' },
        { path: 'M430 410 C380 370,330 320,295 285', color: '#A3E635', dash: '10 8' }
      ],
      ballPositions: [
        { x: 280, y: 270 },
        { x: 450, y: 120 },
        { x: 620, y: 270 },
        { x: 450, y: 420 },
        { x: 280, y: 270 }
      ]
    }
  },
  {
    id: "chaos-ball",
    title: "Chaos Ball Drill",
    cat: "Contested Ball",
    mins: 12,
    players: "Small groups",
    overview: "Ground ball gets, quick decisions and pressure handling, with the coach rolling multiple footballs into a small contested square to force fast, clean hands under traffic.",
    steps: [
      ["Setup", "Mark a 15m x 15m square. Have several footballs ready with the coach positioned at one edge."],
      ["Roll into contest", "The coach rolls a ball into the contest - players stay low and read the ball early."],
      ["Compete", "Players compete hard for possession, prioritising first hands clean."],
      ["Handball immediately", "The player who wins the ball reacts quickly and handballs immediately rather than holding it."],
      ["Add balls", "The coach continually adds more balls into the square to increase chaos and decision-making load."]
    ],
    diagram: {
      zones: [{ x: 340, y: 170, width: 220, height: 220, label: 'CONTEST ZONE' }],
      players: [
        { label: 'C', x: 450, y: 80, kind: 'coach' },
        { label: 'A', x: 400, y: 300 },
        { label: 'B', x: 500, y: 300, kind: 'opp' },
        { label: 'D', x: 450, y: 340 }
      ],
      arrows: [{ path: 'M450 100 C450 160,450 210,450 250', color: '#DC2626', dash: '4 6' }],
      ballPositions: [
        { x: 450, y: 120 },
        { x: 450, y: 270 },
        { x: 450, y: 270 },
        { x: 420, y: 250 },
        { x: 470, y: 285 }
      ]
    }
  },
  {
    id: "numbers-game",
    title: "Numbers Game",
    cat: "Game Sense",
    mins: 15,
    players: "Variable (2v1 up to 4v3)",
    overview: "Decision making and transition offence/defence, using a zone between two goals where the coach calls a number of attackers and defenders to enter and play out an advantage situation (e.g. 2v1, 3v2, 4v3).",
    steps: [
      ["Setup", "Mark a full-width zone between two goals. All players wait outside the zone until called."],
      ["Coach calls numbers", "The coach calls a number (e.g. 2v1, 3v2, 4v3) and that many attackers and defenders enter the zone."],
      ["Play the advantage", "Attackers spread quickly and use overlap runners to work the ball toward the danger space, while defenders work to defend it."],
      ["Score or reset", "Attackers finish with a shot on goal or the ball goes out of the zone; players reset and the coach calls new numbers."]
    ],
    diagram: {
      zones: [{ x: 150, y: 150, width: 600, height: 220, label: 'PLAY ZONE' }],
      players: [
        { label: 'C', x: 450, y: 80, kind: 'coach' },
        { label: 'A1', x: 250, y: 260 },
        { label: 'A2', x: 300, y: 300 },
        { label: 'D1', x: 600, y: 260, kind: 'opp' }
      ],
      arrows: [{ path: 'M320 290 C450 320,600 300,700 260', color: '#A3E635', dash: '8 8' }],
      ballPositions: [
        { x: 250, y: 260 },
        { x: 250, y: 260 },
        { x: 500, y: 280 },
        { x: 700, y: 258 }
      ]
    }
  },
  {
    id: "wave-drill",
    title: "Wave Drill",
    cat: "Fitness",
    mins: 15,
    players: "Full group",
    overview: "Team transition, running patterns and conditioning, where the team attacks one goal, then must sprint the length of the ground to transition and defend a new ball released by the coach at the opposite end.",
    steps: [
      ["Attack", "The team attacks one goal, working the ball forward with quick decisions."],
      ["Shot", "A shot is taken at goal to finish the attacking sequence."],
      ["Release", "As the shot goes up, the coach releases a new ball at the opposite end of the ground."],
      ["Transition", "The entire group sprints to transition back, spreading wide, protecting the corridor, and recovering quickly to defend the new ball."]
    ],
    diagram: {
      players: [
        { label: 'C', x: 450, y: 80, kind: 'coach' },
        { label: 'A1', x: 300, y: 260 },
        { label: 'A2', x: 350, y: 300 }
      ],
      arrows: [
        { path: 'M280 260 C450 220,600 220,760 255', color: '#DC2626', dash: '8 8' },
        { path: 'M760 300 C600 340,400 340,250 320', color: '#38BDF8', dash: '8 8' }
      ],
      ballPositions: [
        { x: 280, y: 260 },
        { x: 760, y: 255 },
        { x: 450, y: 80 },
        { x: 250, y: 320 }
      ]
    }
  },
  {
    id: "front-and-centre",
    title: "Front-and-Centre Drill",
    cat: "Contested Ball",
    mins: 12,
    players: "Small groups",
    overview: "Crumbing, reading contests and goal kicking, with the coach kicking long to a marking contest while crumbing players position front and centre to gather any loose ball and shoot on goal.",
    steps: [
      ["Coach kicks long", "The coach kicks long to a contest near goal."],
      ["Contest the mark", "Two players read the ball early and compete for it in the air."],
      ["Crumb position", "Crumbing players position front and centre, staying balanced and ready to pounce on any loose ball."],
      ["Gather and shoot", "The crumber gathers cleanly, accelerates through the ball, and shoots on goal."]
    ],
    diagram: {
      players: [
        { label: 'C', x: 450, y: 80, kind: 'coach' },
        { label: 'M1', x: 680, y: 255 },
        { label: 'M2', x: 700, y: 230, kind: 'opp' },
        { label: 'Cr', x: 660, y: 290 }
      ],
      arrows: [
        { path: 'M450 100 C550 150,640 200,690 240', color: '#DC2626', dash: '8 8' },
        { path: 'M660 295 C680 280,695 265,705 255', color: '#A3E635', dash: '6 6' }
      ],
      ballPositions: [
        { x: 450, y: 100 },
        { x: 690, y: 240 },
        { x: 660, y: 290 },
        { x: 700, y: 255 }
      ]
    }
  }
];

export const DEFAULT_GROWTH_RECORDS: SkillAssessment[] = [
  {
    id: 'g1',
    playerId: 'p1',
    date: '2025-02-15',
    seasonLabel: '2025 Start of Season',
    timeTrial2km: '09:12',
    yoyoLevel: '14.2',
    sprint20m: '3.62s',
    fitnessRating: 6,
    preferredFoot: 'Right',
    kickDistanceMeters: 28,
    kickAccuracyRating: 6,
    oppositeFootRating: 4,
    handballRating: 7,
    markingRating: 6,
    tacklingRating: 7,
    gameSenseRating: 7,
    developmentGoals: 'Build kicking penetration over 30m and develop left foot confidence.',
    coachNotes: 'Alex showed great enthusiasm at initial testing. Needs work on kicking through the ball.'
  },
  {
    id: 'g2',
    playerId: 'p1',
    date: '2026-02-10',
    seasonLabel: '2026 Pre-Season',
    timeTrial2km: '08:25',
    yoyoLevel: '15.8',
    sprint20m: '3.42s',
    fitnessRating: 8,
    preferredFoot: 'Right',
    kickDistanceMeters: 36,
    kickAccuracyRating: 8,
    oppositeFootRating: 7,
    handballRating: 8,
    markingRating: 7,
    tacklingRating: 8,
    gameSenseRating: 9,
    developmentGoals: 'Maintain high aerobic base and lead mid-rotation inside 50 entries.',
    coachNotes: 'Massive year-on-year growth! Opposite foot kicking improved tremendously. Time trial down by 47s!'
  },
  {
    id: 'g3',
    playerId: 'p2',
    date: '2025-02-15',
    seasonLabel: '2025 Start of Season',
    timeTrial2km: '09:45',
    yoyoLevel: '13.5',
    sprint20m: '3.55s',
    fitnessRating: 5,
    preferredFoot: 'Right',
    kickDistanceMeters: 30,
    kickAccuracyRating: 7,
    oppositeFootRating: 3,
    handballRating: 6,
    markingRating: 8,
    tacklingRating: 5,
    gameSenseRating: 6,
    developmentGoals: 'Improve repeat sprint ability and forward press defensive tackling.',
    coachNotes: 'Strong aerial hands. Needs off-season conditioning for running games.'
  },
  {
    id: 'g4',
    playerId: 'p2',
    date: '2026-02-10',
    seasonLabel: '2026 Pre-Season',
    timeTrial2km: '08:50',
    yoyoLevel: '15.1',
    sprint20m: '3.38s',
    fitnessRating: 8,
    preferredFoot: 'Right',
    kickDistanceMeters: 38,
    kickAccuracyRating: 8,
    oppositeFootRating: 6,
    handballRating: 8,
    markingRating: 9,
    tacklingRating: 7,
    gameSenseRating: 8,
    developmentGoals: 'Focus on set shot routine consistency under fatigue.',
    coachNotes: 'Outstanding progress in fitness and kicking power (+8m distance gain).'
  },
  {
    id: 'g5',
    playerId: 'p3',
    date: '2025-02-15',
    seasonLabel: '2025 Start of Season',
    timeTrial2km: '08:50',
    yoyoLevel: '14.8',
    sprint20m: '3.48s',
    fitnessRating: 7,
    preferredFoot: 'Left',
    kickDistanceMeters: 32,
    kickAccuracyRating: 7,
    oppositeFootRating: 4,
    handballRating: 7,
    markingRating: 7,
    tacklingRating: 8,
    gameSenseRating: 7,
    developmentGoals: 'Develop right foot kick for defensive exits under pressure.',
    coachNotes: 'Solid defensive Reader. Work on right side clearance option.'
  },
  {
    id: 'g6',
    playerId: 'p3',
    date: '2026-02-10',
    seasonLabel: '2026 Pre-Season',
    timeTrial2km: '08:15',
    yoyoLevel: '16.2',
    sprint20m: '3.35s',
    fitnessRating: 9,
    preferredFoot: 'Left',
    kickDistanceMeters: 40,
    kickAccuracyRating: 9,
    oppositeFootRating: 7,
    handballRating: 9,
    markingRating: 8,
    tacklingRating: 9,
    gameSenseRating: 9,
    developmentGoals: 'Key defensive pillar - organize back 6 zone positioning.',
    coachNotes: 'Top 2km time trial in squad. Right foot now very reliable under heat.'
  }
];

export const DEMO_TEAM_SAMPLE_GROWTH_RECORDS: SkillAssessment[] = [
  {
    id: 'demo-g1-a',
    playerId: 'dp1',
    date: '2025-11-12',
    seasonLabel: '2025 Post-Season Baseline',
    gender: 'Female',
    ageGroup: 'U16',
    timeTrial2km: '08:45',
    yoyoLevel: '15.2',
    sprint20m: '3.42s',
    agilityTime: '8.80s',
    standingVerticalCm: 48,
    fitnessRating: 7,
    preferredFoot: 'Right',
    kickDistanceMeters: 32,
    kickAccuracyRating: 7,
    oppositeFootRating: 5,
    handballRating: 8,
    markingRating: 7,
    tacklingRating: 8,
    gameSenseRating: 8,
    overallInterchangeIqScore: 3.8,
    overallRatingBadge: 'Advanced',
    developmentGoals: 'Build opposite foot kicking power and repeat sprint endurance.',
    coachNotes: 'Captain set the benchmark early in pre-season.'
  },
  {
    id: 'demo-g1-b',
    playerId: 'dp1',
    date: '2026-02-15',
    seasonLabel: '2026 Pre-Season Benchmark',
    gender: 'Female',
    ageGroup: 'U16',
    timeTrial2km: '08:12',
    yoyoLevel: '16.5',
    sprint20m: '3.28s',
    agilityTime: '8.45s',
    standingVerticalCm: 53,
    fitnessRating: 9,
    preferredFoot: 'Right',
    kickDistanceMeters: 38,
    kickAccuracyRating: 9,
    oppositeFootRating: 7,
    handballRating: 9,
    markingRating: 8,
    tacklingRating: 9,
    gameSenseRating: 9,
    overallInterchangeIqScore: 4.6,
    overallRatingBadge: 'Elite',
    developmentGoals: 'Lead midfield stoppage setup and maintain elite work rate.',
    coachNotes: 'Massive YoY gains! Sprint down by 0.14s, 2km time trial improved by 33s.'
  },
  {
    id: 'demo-g2-a',
    playerId: 'dp2',
    date: '2025-11-12',
    seasonLabel: '2025 Post-Season Baseline',
    gender: 'Female',
    ageGroup: 'U16',
    timeTrial2km: '09:20',
    yoyoLevel: '14.0',
    sprint20m: '3.55s',
    agilityTime: '9.10s',
    standingVerticalCm: 45,
    fitnessRating: 6,
    preferredFoot: 'Right',
    kickDistanceMeters: 34,
    kickAccuracyRating: 7,
    oppositeFootRating: 4,
    handballRating: 7,
    markingRating: 8,
    tacklingRating: 6,
    gameSenseRating: 7,
    overallInterchangeIqScore: 3.3,
    overallRatingBadge: 'Developing',
    developmentGoals: 'Improve aerial jump timing and forward pressure tackling.',
    coachNotes: 'Natural forward line instincts. Focus on aerobic base.'
  },
  {
    id: 'demo-g2-b',
    playerId: 'dp2',
    date: '2026-02-15',
    seasonLabel: '2026 Pre-Season Benchmark',
    gender: 'Female',
    ageGroup: 'U16',
    timeTrial2km: '08:35',
    yoyoLevel: '15.6',
    sprint20m: '3.36s',
    agilityTime: '8.65s',
    standingVerticalCm: 52,
    fitnessRating: 8,
    preferredFoot: 'Right',
    kickDistanceMeters: 42,
    kickAccuracyRating: 9,
    oppositeFootRating: 6,
    handballRating: 8,
    markingRating: 9,
    tacklingRating: 8,
    gameSenseRating: 8,
    overallInterchangeIqScore: 4.2,
    overallRatingBadge: 'Advanced',
    developmentGoals: 'Focus on set shot routine consistency under fatigue.',
    coachNotes: 'Gained +8m on kick distance! Strong overhead mark in pack situations.'
  },
  {
    id: 'demo-g3-a',
    playerId: 'dp3',
    date: '2025-11-12',
    seasonLabel: '2025 Post-Season Baseline',
    gender: 'Female',
    ageGroup: 'U16',
    timeTrial2km: '08:55',
    yoyoLevel: '14.8',
    sprint20m: '3.48s',
    agilityTime: '8.95s',
    standingVerticalCm: 46,
    fitnessRating: 7,
    preferredFoot: 'Left',
    kickDistanceMeters: 30,
    kickAccuracyRating: 7,
    oppositeFootRating: 4,
    handballRating: 8,
    markingRating: 8,
    tacklingRating: 8,
    gameSenseRating: 8,
    overallInterchangeIqScore: 3.6,
    overallRatingBadge: 'Advanced',
    developmentGoals: 'Enhance right foot exit kicking out of defense.',
    coachNotes: 'Vice Captain leadership in key defender line.'
  },
  {
    id: 'demo-g3-b',
    playerId: 'dp3',
    date: '2026-02-15',
    seasonLabel: '2026 Pre-Season Benchmark',
    gender: 'Female',
    ageGroup: 'U16',
    timeTrial2km: '08:18',
    yoyoLevel: '16.1',
    sprint20m: '3.32s',
    agilityTime: '8.50s',
    standingVerticalCm: 51,
    fitnessRating: 9,
    preferredFoot: 'Left',
    kickDistanceMeters: 37,
    kickAccuracyRating: 9,
    oppositeFootRating: 7,
    handballRating: 9,
    markingRating: 9,
    tacklingRating: 9,
    gameSenseRating: 9,
    overallInterchangeIqScore: 4.5,
    overallRatingBadge: 'Elite',
    developmentGoals: 'Direct backline zone shifts during transition.',
    coachNotes: 'Elite defensive rating. Right foot exit kick is now a weapon.'
  },
  {
    id: 'demo-g4-a',
    playerId: 'dp4',
    date: '2025-11-12',
    seasonLabel: '2025 Post-Season Baseline',
    gender: 'Female',
    ageGroup: 'U16',
    timeTrial2km: '08:30',
    yoyoLevel: '15.5',
    sprint20m: '3.38s',
    agilityTime: '8.70s',
    standingVerticalCm: 47,
    fitnessRating: 8,
    preferredFoot: 'Right',
    kickDistanceMeters: 31,
    kickAccuracyRating: 7,
    oppositeFootRating: 5,
    handballRating: 8,
    markingRating: 7,
    tacklingRating: 7,
    gameSenseRating: 8,
    overallInterchangeIqScore: 3.9,
    overallRatingBadge: 'Advanced',
    developmentGoals: 'Improve wing running patterns and defensive tracking.',
    coachNotes: 'Excellent natural speed on the wing.'
  },
  {
    id: 'demo-g4-b',
    playerId: 'dp4',
    date: '2026-02-15',
    seasonLabel: '2026 Pre-Season Benchmark',
    gender: 'Female',
    ageGroup: 'U16',
    timeTrial2km: '07:58',
    yoyoLevel: '17.0',
    sprint20m: '3.22s',
    agilityTime: '8.25s',
    standingVerticalCm: 54,
    fitnessRating: 10,
    preferredFoot: 'Right',
    kickDistanceMeters: 36,
    kickAccuracyRating: 8,
    oppositeFootRating: 7,
    handballRating: 9,
    markingRating: 8,
    tacklingRating: 8,
    gameSenseRating: 9,
    overallInterchangeIqScore: 4.7,
    overallRatingBadge: 'Elite',
    developmentGoals: 'Maintain top-level wing endurance and inside 50 delivery.',
    coachNotes: 'First player under 8 mins in 2km trial! Fastest 20m sprint in squad (3.22s).'
  },
  {
    id: 'demo-g7-a',
    playerId: 'dp7',
    date: '2025-11-12',
    seasonLabel: '2025 Post-Season Baseline',
    gender: 'Female',
    ageGroup: 'U16',
    timeTrial2km: '09:40',
    yoyoLevel: '13.8',
    sprint20m: '3.65s',
    agilityTime: '9.30s',
    standingVerticalCm: 52,
    fitnessRating: 6,
    preferredFoot: 'Right',
    kickDistanceMeters: 32,
    kickAccuracyRating: 6,
    oppositeFootRating: 4,
    handballRating: 7,
    markingRating: 8,
    tacklingRating: 7,
    gameSenseRating: 7,
    overallInterchangeIqScore: 3.4,
    overallRatingBadge: 'Developing',
    developmentGoals: 'Increase vertical jump reach and hitout direction targeting.',
    coachNotes: 'Tallest player on roster. High ceiling.'
  },
  {
    id: 'demo-g7-b',
    playerId: 'dp7',
    date: '2026-02-15',
    seasonLabel: '2026 Pre-Season Benchmark',
    gender: 'Female',
    ageGroup: 'U16',
    timeTrial2km: '08:48',
    yoyoLevel: '15.4',
    sprint20m: '3.45s',
    agilityTime: '8.80s',
    standingVerticalCm: 61,
    fitnessRating: 8,
    preferredFoot: 'Right',
    kickDistanceMeters: 38,
    kickAccuracyRating: 8,
    oppositeFootRating: 6,
    handballRating: 8,
    markingRating: 9,
    tacklingRating: 8,
    gameSenseRating: 8,
    overallInterchangeIqScore: 4.3,
    overallRatingBadge: 'Advanced',
    developmentGoals: 'Follow up hitouts as extra midfielder around stoppages.',
    coachNotes: 'Squad leader in vertical jump (61cm)! +9cm gain YoY.'
  }
];

// ---------------------------------------------------------------------------
// Demo Team sample dataset — seeds the sandbox "Demo Team" (isDemo: true)
// with a realistic 20-player squad, 3 completed games, a live match-day
// lineup, and 2 saved lineup templates, so new/Provisional users exploring
// the demo have something populated to look at instead of an empty squad.
// Scoped entirely to DEMO_TEAM_ID — never applied to any real team.
// ---------------------------------------------------------------------------

export const DEMO_TEAM_SAMPLE_PLAYERS: Player[] = [
  { id: 'dp1', name: 'Zoe Campbell', nick: '', number: '7', positions: ['MID'], primaryZone: 'MID', status: 'available', active: 1860, bench: 660, note: 'Captain', slotTimes: { 'C': 1200, 'ROV': 660 } },
  { id: 'dp2', name: 'Maddie Foster', nick: '', number: '12', positions: ['FWD'], primaryZone: 'FWD', status: 'available', active: 1560, bench: 900, note: '', slotTimes: { 'FF': 1560 } },
  { id: 'dp3', name: 'Priya Anand', nick: '', number: '18', positions: ['DEF'], primaryZone: 'DEF', status: 'available', active: 2100, bench: 480, note: 'Vice-Captain', slotTimes: { 'CHB': 1500, 'BP-L': 600 } },
  { id: 'dp4', name: 'Aisha Osei', nick: '', number: '22', positions: ['MID'], primaryZone: 'MID', status: 'available', active: 1740, bench: 780, note: '', slotTimes: { 'W-L': 1080, 'W-R': 660 } },
  { id: 'dp5', name: 'Charlotte Reyes', nick: 'Charlie', number: '31', positions: ['FWD'], primaryZone: 'FWD', status: 'available', active: 1440, bench: 1140, note: '', slotTimes: { 'CHF': 900, 'HF-L': 540 } },
  { id: 'dp6', name: 'Grace Thompson', nick: '', number: '44', positions: ['DEF'], primaryZone: 'DEF', status: 'available', active: 1980, bench: 540, note: '', slotTimes: { 'FB': 1500, 'BP-R': 480 } },
  { id: 'dp7', name: 'Willow Baxter', nick: '', number: '55', positions: ['RUCK'], primaryZone: 'RUCK', status: 'available', active: 2160, bench: 420, note: '', slotTimes: { 'R': 2160 } },
  { id: 'dp8', name: 'Talia Nguyen', nick: '', number: '5', positions: ['MID'], primaryZone: 'MID', status: 'injured', active: 600, bench: 300, note: 'Hamstring strain — reassess in 2 weeks', slotTimes: { 'C': 600 } },
  { id: 'dp9', name: 'Sienna Walsh', nick: '', number: '9', positions: ['FWD'], primaryZone: 'FWD', status: 'available', active: 1320, bench: 960, note: '', slotTimes: { 'FP-R': 1320 } },
  { id: 'dp10', name: 'Ruby Fitzgerald', nick: '', number: '14', positions: ['DEF'], primaryZone: 'DEF', status: 'available', active: 1620, bench: 720, note: '', slotTimes: { 'HB-L': 1020, 'BP-L': 600 } },
  { id: 'dp11', name: 'Isla McKenzie', nick: '', number: '23', positions: ['MID'], primaryZone: 'MID', status: 'available', active: 1500, bench: 900, note: '', slotTimes: { 'ROV': 900, 'RR': 600 } },
  { id: 'dp12', name: 'Ebony Carter', nick: '', number: '33', positions: ['FWD'], primaryZone: 'FWD', status: 'away', active: 0, bench: 0, note: 'Rep squad duty this round' },
  { id: 'dp13', name: 'Freya Douglas', nick: '', number: '41', positions: ['DEF'], primaryZone: 'DEF', status: 'available', active: 1380, bench: 1020, note: '', slotTimes: { 'HB-R': 1380 } },
  { id: 'dp14', name: 'Amelia Novak', nick: '', number: '2', positions: ['MID'], primaryZone: 'MID', status: 'available', active: 1260, bench: 1140, note: '', slotTimes: { 'W-R': 1260 } },
  { id: 'dp15', name: 'Layla Simmons', nick: '', number: '16', positions: ['FWD'], primaryZone: 'FWD', status: 'available', active: 1140, bench: 1260, note: '', slotTimes: { 'FP-L': 1140 } },
  { id: 'dp16', name: 'Poppy Hendricks', nick: '', number: '27', positions: ['DEF'], primaryZone: 'DEF', status: 'injured', active: 420, bench: 300, note: 'Rolled ankle — team physio managing', slotTimes: { 'BP-R': 420 } },
  { id: 'dp17', name: 'Harriet Cole', nick: '', number: '36', positions: ['MID'], primaryZone: 'MID', status: 'available', active: 0, bench: 0, note: '' },
  { id: 'dp18', name: 'Violet Marsh', nick: '', number: '49', positions: ['DEF'], primaryZone: 'DEF', status: 'available', active: 0, bench: 0, note: '' },
  { id: 'dp19', name: 'Matilda Grant', nick: '', number: '60', positions: ['FWD'], primaryZone: 'FWD', status: 'available', active: 0, bench: 0, note: '' },
  { id: 'dp20', name: 'Scarlett Boyd', nick: '', number: '71', positions: ['MID'], primaryZone: 'MID', status: 'available', active: 0, bench: 0, note: '' },
];

// Best-18 match-day lineup used both as the "live" current lineup and as the
// basis for the first saved lineup template below.
export const DEMO_TEAM_SAMPLE_LINEUP: Record<string, string> = {
  LFP: 'dp15', FF: 'dp2', RFP: 'dp9',
  LHF: 'dp5', CHF: 'dp5', RHF: 'dp5',
  C: 'dp1', R: 'dp7',
  LW: 'dp4', RW: 'dp14',
  RR: 'dp11', ROV: 'dp11',
  LBF: 'dp13', CHB: 'dp3', RBF: 'dp13',
  LBP: 'dp10', FB: 'dp6', RBP: 'dp6',
};

export const DEMO_TEAM_SAMPLE_SAVED_LINEUPS: LineupTemplate[] = [
  {
    id: 'dl1',
    name: 'Round 3 Best 18',
    slots: {
      LFP: 'dp15', FF: 'dp2', RFP: 'dp9',
      LHF: 'dp5', CHF: 'dp2', RHF: 'dp19',
      C: 'dp1', R: 'dp7',
      LW: 'dp4', RW: 'dp14',
      RR: 'dp11', ROV: 'dp8',
      LBF: 'dp13', CHB: 'dp3', RBF: 'dp18',
      LBP: 'dp10', FB: 'dp6', RBP: 'dp16',
    },
  },
  {
    id: 'dl2',
    name: 'Development Rotation A',
    slots: {
      LFP: 'dp19', FF: 'dp9', RFP: 'dp15',
      LHF: 'dp2', CHF: 'dp5', RHF: 'dp20',
      C: 'dp17', R: 'dp7',
      LW: 'dp14', RW: 'dp4',
      RR: 'dp8', ROV: 'dp1',
      LBF: 'dp18', CHB: 'dp10', RBF: 'dp13',
      LBP: 'dp16', FB: 'dp3', RBP: 'dp6',
    },
  },
];

export const DEMO_TEAM_SAMPLE_HISTORY: GameHistory[] = [
  {
    id: 'dg1',
    team: 'Thunder Cats',
    round: 'Round 1',
    date: '2026-04-05',
    score: {
      quarter: 4,
      home: { goals: 8, behinds: 6, quarters: [{ g: 1, b: 2 }, { g: 3, b: 1 }, { g: 2, b: 1 }, { g: 2, b: 2 }] },
      away: { goals: 5, behinds: 4, quarters: [{ g: 0, b: 1 }, { g: 2, b: 1 }, { g: 1, b: 1 }, { g: 2, b: 1 }] },
    },
    rotations: [],
    lineup: { ...DEMO_TEAM_SAMPLE_LINEUP },
    players: [
      { id: 'dp1', name: 'Zoe Campbell', nick: '', number: '7', active: 1740, bench: 660, slot: 'C' },
      { id: 'dp2', name: 'Maddie Foster', nick: '', number: '12', active: 1440, bench: 900, slot: 'FF' },
      { id: 'dp3', name: 'Priya Anand', nick: '', number: '18', active: 1920, bench: 480, slot: 'CHB' },
      { id: 'dp5', name: 'Charlotte Reyes', nick: 'Charlie', number: '31', active: 1380, bench: 1080, slot: 'CHF' },
      { id: 'dp6', name: 'Grace Thompson', nick: '', number: '44', active: 1860, bench: 540, slot: 'FB' },
      { id: 'dp7', name: 'Willow Baxter', nick: '', number: '55', active: 2040, bench: 420, slot: 'R' },
      { id: 'dp9', name: 'Sienna Walsh', nick: '', number: '9', active: 1260, bench: 960, slot: 'RFP' },
      { id: 'dp10', name: 'Ruby Fitzgerald', nick: '', number: '14', active: 1500, bench: 720, slot: 'LBP' },
      { id: 'dp11', name: 'Isla McKenzie', nick: '', number: '23', active: 1440, bench: 900, slot: 'ROV' },
      { id: 'dp15', name: 'Layla Simmons', nick: '', number: '16', active: 1080, bench: 1260, slot: 'LFP' },
    ],
  },
  {
    id: 'dg2',
    team: 'Eagles Ridge',
    round: 'Round 2',
    date: '2026-04-12',
    score: {
      quarter: 4,
      home: { goals: 4, behinds: 7, quarters: [{ g: 1, b: 2 }, { g: 1, b: 1 }, { g: 1, b: 2 }, { g: 1, b: 2 }] },
      away: { goals: 6, behinds: 5, quarters: [{ g: 1, b: 1 }, { g: 2, b: 1 }, { g: 1, b: 2 }, { g: 2, b: 1 }] },
    },
    rotations: [],
    lineup: { ...DEMO_TEAM_SAMPLE_LINEUP, CHF: 'dp2', FF: 'dp5' },
    players: [
      { id: 'dp1', name: 'Zoe Campbell', nick: '', number: '7', active: 1800, bench: 600, slot: 'C' },
      { id: 'dp3', name: 'Priya Anand', nick: '', number: '18', active: 2040, bench: 360, slot: 'CHB' },
      { id: 'dp4', name: 'Aisha Osei', nick: '', number: '22', active: 1680, bench: 720, slot: 'LW' },
      { id: 'dp6', name: 'Grace Thompson', nick: '', number: '44', active: 1920, bench: 480, slot: 'FB' },
      { id: 'dp7', name: 'Willow Baxter', nick: '', number: '55', active: 2160, bench: 300, slot: 'R' },
      { id: 'dp8', name: 'Talia Nguyen', nick: '', number: '5', active: 600, bench: 300, slot: 'C' },
      { id: 'dp13', name: 'Freya Douglas', nick: '', number: '41', active: 1320, bench: 1020, slot: 'HB-R' },
      { id: 'dp14', name: 'Amelia Novak', nick: '', number: '2', active: 1200, bench: 1140, slot: 'RW' },
    ],
  },
  {
    id: 'dg3',
    team: 'Coastal Sharks',
    round: 'Round 3',
    date: '2026-04-19',
    score: {
      quarter: 4,
      home: { goals: 9, behinds: 5, quarters: [{ g: 2, b: 1 }, { g: 2, b: 2 }, { g: 3, b: 1 }, { g: 2, b: 1 }] },
      away: { goals: 3, behinds: 8, quarters: [{ g: 1, b: 2 }, { g: 0, b: 3 }, { g: 1, b: 2 }, { g: 1, b: 1 }] },
    },
    rotations: [],
    lineup: { ...DEMO_TEAM_SAMPLE_LINEUP },
    players: [
      { id: 'dp1', name: 'Zoe Campbell', nick: '', number: '7', active: 1860, bench: 660, slot: 'C' },
      { id: 'dp2', name: 'Maddie Foster', nick: '', number: '12', active: 1560, bench: 900, slot: 'FF' },
      { id: 'dp5', name: 'Charlotte Reyes', nick: 'Charlie', number: '31', active: 1440, bench: 1140, slot: 'CHF' },
      { id: 'dp7', name: 'Willow Baxter', nick: '', number: '55', active: 2160, bench: 420, slot: 'R' },
      { id: 'dp9', name: 'Sienna Walsh', nick: '', number: '9', active: 1320, bench: 960, slot: 'FP-R' },
      { id: 'dp10', name: 'Ruby Fitzgerald', nick: '', number: '14', active: 1620, bench: 720, slot: 'LBP' },
      { id: 'dp11', name: 'Isla McKenzie', nick: '', number: '23', active: 1500, bench: 900, slot: 'ROV' },
      { id: 'dp16', name: 'Poppy Hendricks', nick: '', number: '27', active: 420, bench: 300, slot: 'BP-R' },
      { id: 'dp18', name: 'Violet Marsh', nick: '', number: '49', active: 1080, bench: 1260, slot: 'RBP' },
      { id: 'dp19', name: 'Matilda Grant', nick: '', number: '60', active: 960, bench: 1380, slot: 'RHF' },
    ],
  },
];
