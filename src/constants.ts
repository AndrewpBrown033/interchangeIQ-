import { Player, Drill, SkillAssessment } from './types';

export const APP_VERSION = 'v1.4.0';

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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
    ]
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
