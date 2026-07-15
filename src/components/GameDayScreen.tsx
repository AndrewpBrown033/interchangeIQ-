import React, { useState, useEffect, useRef } from 'react';
import { Player, Score, Rotation, Plan, GameInfo } from '../types';
import { POSITIONS, POSITION_GROUPS } from '../constants';
import { Play, Pause, RotateCcw, AlertTriangle, Check, RefreshCw, X, Award, ChevronDown, ChevronUp, AlertCircle, Info, Ban, Volume2, VolumeX, Smartphone, Bell } from 'lucide-react';

const POSITION_DESCRIPTIONS: Record<string, string> = {
  'FP-L': 'Forward Pocket Left',
  'FF': 'Full Forward',
  'FP-R': 'Forward Pocket Right',
  'HF-L': 'Half Forward Left',
  'CHF': 'Centre Half Forward',
  'HF-R': 'Half Forward Right',
  'W-L': 'Wing Left',
  'C': 'Centre',
  'W-R': 'Wing Right',
  'R': 'Ruck',
  'ROV': 'Rover',
  'RR': 'Ruck Rover',
  'HB-L': 'Half Back Left',
  'CHB': 'Centre Half Back',
  'HB-R': 'Half Back Right',
  'BP-L': 'Back Pocket Left',
  'FB': 'Full Back',
  'BP-R': 'Back Pocket Right',
};

interface GameDayScreenProps {
  players: Player[];
  onUpdatePlayers: (players: Player[]) => void;
  lineup: Record<string, string>;
  onUpdateLineup: (lineup: Record<string, string>) => void;
  score: Score;
  onUpdateScore: (score: Score) => void;
  gameInfo: GameInfo;
  onUpdateGameInfo: (info: GameInfo) => void;
  rotations: Rotation[];
  onUpdateRotations: (rotations: Rotation[]) => void;
  plans: Plan[];
  activePlanIds: string[];
  onTogglePlanRunning: (planId: string) => void;
  onCompleteGame: () => void;
  onSaveGameToHistory: () => void;
  onOpenLoadLineup: () => void;
  onOpenNewGame: () => void;
  onSaveLineup: () => void;
  onSelectPlayerId: (id: string | null) => void;
  onNavigate: (tabId: string) => void;
}

export default function GameDayScreen({
  players,
  onUpdatePlayers,
  lineup,
  onUpdateLineup,
  score,
  onUpdateScore,
  gameInfo,
  onUpdateGameInfo,
  rotations,
  onUpdateRotations,
  plans,
  activePlanIds,
  onTogglePlanRunning,
  onCompleteGame,
  onSaveGameToHistory,
  onOpenLoadLineup,
  onOpenNewGame,
  onSaveLineup,
  onSelectPlayerId,
  onNavigate,
}: GameDayScreenProps) {
  // Clock state
  const [clockRemaining, setClockRemaining] = useState(15 * 60);
  const [clockRunning, setClockRunning] = useState(false);
  const clockIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // UI state overlays
  const [scoreExpanded, setScoreExpanded] = useState(false);
  const [insightsCollapsed, setInsightsCollapsed] = useState(true);
  const [alertCollapsed, setAlertCollapsed] = useState(false);
  const [gameDayInsightsCollapsed, setGameDayInsightsCollapsed] = useState(true);
  const [scoreboardCollapsed, setScoreboardCollapsed] = useState(false);

  // Drag State
  const [draggedPlayerId, setDraggedPlayerId] = useState<string | null>(null);

  // Player Action Menu state
  const [actionMenuPlayerId, setActionMenuPlayerId] = useState<string | null>(null);
  const [pendingActionPlayerId, setPendingActionPlayerId] = useState<string | null>(null);
  const [pendingActionMode, setPendingActionMode] = useState<'swap' | 'move' | null>(null);

  // Guide Swap active
  const [guidedRotationId, setGuidedRotationId] = useState<string | null>(null);

  // Mobile Touch-Swipe state
  const [swipingPlayerId, setSwipingPlayerId] = useState<string | null>(null);
  const [swipeOffset, setSwipeOffset] = useState<number>(0);
  const [swipePickerPlayer, setSwipePickerPlayer] = useState<Player | null>(null);

  // Toggle layout mode on mobile (field = visual absolute board, list = clear zones list)
  const [fieldViewMode, setFieldViewMode] = useState<'field' | 'list'>('field');
  const [assigningSlot, setAssigningSlot] = useState<string | null>(null);

  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const isSwipeGesture = useRef<boolean>(false);

  const handleTouchStart = (e: React.TouchEvent, playerId: string) => {
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    setSwipingPlayerId(playerId);
    setSwipeOffset(0);
    isSwipeGesture.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!swipingPlayerId) return;
    const touch = e.touches[0];
    const diffX = touch.clientX - touchStartX.current;
    const diffY = touch.clientY - touchStartY.current;

    if (!isSwipeGesture.current) {
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 8) {
        isSwipeGesture.current = true;
      } else if (Math.abs(diffY) > 8) {
        setSwipingPlayerId(null);
        return;
      }
    }

    if (isSwipeGesture.current) {
      if (e.cancelable) e.preventDefault();
      setSwipeOffset(diffX);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!swipingPlayerId) return;
    const finalOffset = swipeOffset;
    const playerId = swipingPlayerId;

    setSwipingPlayerId(null);
    setSwipeOffset(0);

    if (isSwipeGesture.current && Math.abs(finalOffset) > 65) {
      const p = players.find((x) => x.id === playerId);
      if (!p) return;

      const activeFldIds = new Set(Object.values(lineup));
      const isBenchPlayer = !activeFldIds.has(playerId) && p.status === 'available';

      if (isBenchPlayer) {
        if (finalOffset > 65) {
          // Swipe Right: Quick Placement Drawer
          setSwipePickerPlayer(p);
          playSatisfactionChime('test');
          playSatisfactionVibration('test');
        } else if (finalOffset < -65) {
          // Swipe Left: Set Injured/Away
          onUpdatePlayers(
            players.map((x) => (x.id === playerId ? { ...x, status: 'injured' } : x))
          );
          // If in lineup, remove
          const currentSlot = Object.keys(lineup).find((k) => lineup[k] === playerId);
          if (currentSlot) {
            const nextLineup = { ...lineup };
            delete nextLineup[currentSlot];
            onUpdateLineup(nextLineup);
          }
          playSatisfactionChime('rotation-due');
          playSatisfactionVibration('timer-end');
        }
      } else {
        // Field Player -> Swiped left or right: Bench them!
        const currentSlot = Object.keys(lineup).find((k) => lineup[k] === playerId);
        if (currentSlot) {
          const nextLineup = { ...lineup };
          delete nextLineup[currentSlot];
          onUpdateLineup(nextLineup);
          playSatisfactionChime('rotation-due');
          playSatisfactionVibration('test');
        }
      }
    }
  };

  // Audio Context for beep alerts
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Sound & Vibration State (Persisted in localStorage)
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('iiq_sound_enabled');
    return saved !== null ? saved === 'true' : true;
  });
  const [soundVolume, setSoundVolume] = useState(() => {
    const saved = localStorage.getItem('iiq_sound_volume');
    return saved !== null ? parseFloat(saved) : 0.8;
  });
  const [soundTone, setSoundTone] = useState(() => {
    return localStorage.getItem('iiq_sound_tone') || 'acoustic';
  });
  const [hapticEnabled, setHapticEnabled] = useState(() => {
    const saved = localStorage.getItem('iiq_haptic_enabled');
    return saved !== null ? saved === 'true' : true;
  });
  const [hapticPattern, setHapticPattern] = useState(() => {
    return localStorage.getItem('iiq_haptic_pattern') || 'pulse';
  });

  // Persist settings changes
  useEffect(() => {
    localStorage.setItem('iiq_sound_enabled', String(soundEnabled));
  }, [soundEnabled]);

  useEffect(() => {
    localStorage.setItem('iiq_sound_volume', String(soundVolume));
  }, [soundVolume]);

  useEffect(() => {
    localStorage.setItem('iiq_sound_tone', soundTone);
  }, [soundTone]);

  useEffect(() => {
    localStorage.setItem('iiq_haptic_enabled', String(hapticEnabled));
  }, [hapticEnabled]);

  useEffect(() => {
    localStorage.setItem('iiq_haptic_pattern', hapticPattern);
  }, [hapticPattern]);

  // Global listener to unlock iOS Safari Web Audio restrictions on any user gesture
  useEffect(() => {
    const unlockAudio = () => {
      try {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        const ctx = audioCtxRef.current;
        if (ctx && ctx.state === 'suspended') {
          ctx.resume();
        }
        // Play a short silent buffer to satisfy iOS auto-play gesture requirements
        if (ctx) {
          const buffer = ctx.createBuffer(1, 1, 22050);
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(ctx.destination);
          source.start(0);
        }
      } catch (e) {
        console.warn('Silent audio unlock failed', e);
      }
    };

    window.addEventListener('click', unlockAudio, { once: true });
    window.addEventListener('touchstart', unlockAudio, { once: true });
    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  // Integrated Chime & Vibration Player
  const playSatisfactionChime = (triggerType: 'timer-end' | 'rotation-due' | 'test') => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const mainVolume = soundVolume;
      const now = ctx.currentTime;

      const playTone = (freq: number, startDelay: number, duration: number, type: OscillatorType = 'sine', decayMult = 1.0) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = type;
        osc.frequency.value = freq;

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        const startTime = now + startDelay;
        gainNode.gain.setValueAtTime(0.0001, startTime);
        
        // Attack
        gainNode.gain.linearRampToValueAtTime(mainVolume * 0.35, startTime + 0.015);
        // Decay
        gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * decayMult);

        osc.start(startTime);
        osc.stop(startTime + duration + 0.05);
      };

      if (triggerType === 'rotation-due') {
        if (soundTone === 'acoustic') {
          // Double upbeat acoustic bell
          playTone(587.33, 0.0, 0.45, 'sine'); // D5
          playTone(587.33 * 1.5, 0.0, 0.3, 'sine');
          playTone(880.00, 0.12, 0.55, 'sine'); // A5
          playTone(880.00 * 1.5, 0.12, 0.4, 'sine');
        } else if (soundTone === 'marimba') {
          // Playful woodblock tap pair
          playTone(440.00, 0.0, 0.18, 'triangle');
          playTone(554.37, 0.08, 0.22, 'triangle');
        } else if (soundTone === 'digital') {
          // Tech electronic beep
          playTone(1046.50, 0.0, 0.08, 'square'); // C6
          playTone(1567.98, 0.08, 0.12, 'square'); // G6
        } else {
          // Classic beep
          playTone(880, 0.0, 0.15, 'sine');
          playTone(880, 0.2, 0.15, 'sine');
        }
      } else if (triggerType === 'timer-end') {
        if (soundTone === 'acoustic') {
          // Lush major chord chime sequence: C5, E5, G5, C6
          const notes = [523.25, 659.25, 783.99, 1046.50];
          notes.forEach((freq, idx) => {
            playTone(freq, idx * 0.1, 0.8, 'sine');
            playTone(freq * 1.5, idx * 0.1, 0.6, 'sine');
          });
          // Staggered second repetition
          notes.forEach((freq, idx) => {
            playTone(freq, 0.7 + idx * 0.08, 0.8, 'sine');
            playTone(freq * 1.5, 0.7 + idx * 0.08, 0.6, 'sine');
          });
        } else if (soundTone === 'marimba') {
          // Warm repeating marimba roll
          const notes = [329.63, 392.00, 523.25, 659.25];
          notes.forEach((freq, idx) => {
            playTone(freq, idx * 0.08, 0.3, 'triangle');
            playTone(freq, 0.35 + idx * 0.08, 0.3, 'triangle');
            playTone(freq, 0.7 + idx * 0.08, 0.5, 'triangle');
          });
        } else if (soundTone === 'digital') {
          // Futuristic alarm melody
          for (let i = 0; i < 4; i++) {
            playTone(1320, i * 0.18, 0.12, 'square');
            playTone(1760, i * 0.18 + 0.06, 0.12, 'sawtooth');
          }
        } else {
          // Classic
          playTone(880, 0.0, 0.25, 'sine');
          playTone(880, 0.3, 0.25, 'sine');
          playTone(880, 0.6, 0.25, 'sine');
        }
      } else if (triggerType === 'test') {
        if (soundTone === 'acoustic') {
          // Clean chime preview
          playTone(523.25, 0.0, 0.7, 'sine');
          playTone(523.25 * 1.5, 0.0, 0.5, 'sine');
        } else if (soundTone === 'marimba') {
          // Warm marimba tap
          playTone(523.25, 0.0, 0.25, 'triangle');
        } else if (soundTone === 'digital') {
          // High electronic chirp
          playTone(1200, 0.0, 0.08, 'square');
        } else {
          playTone(880, 0.0, 0.18, 'sine');
        }
      }
    } catch (e) {
      console.warn('Audio feedback failed', e);
    }
  };

  const playSatisfactionVibration = (triggerType: 'timer-end' | 'rotation-due' | 'test') => {
    if (!hapticEnabled) return;
    try {
      if (!navigator.vibrate) return;
      let pattern: number[] = [];

      if (hapticPattern === 'pulse') {
        if (triggerType === 'rotation-due') {
          pattern = [100, 50, 100];
        } else if (triggerType === 'timer-end') {
          pattern = [200, 100, 200, 100, 200];
        } else {
          pattern = [100];
        }
      } else if (hapticPattern === 'double-tap') {
        if (triggerType === 'rotation-due') {
          pattern = [50, 40, 50];
        } else if (triggerType === 'timer-end') {
          pattern = [70, 50, 70, 100, 70, 50, 70];
        } else {
          pattern = [60, 40, 60];
        }
      } else if (hapticPattern === 'heartbeat') {
        if (triggerType === 'rotation-due') {
          pattern = [80, 100, 150];
        } else if (triggerType === 'timer-end') {
          pattern = [120, 120, 250, 120, 120, 250];
        } else {
          pattern = [90, 90, 120];
        }
      } else if (hapticPattern === 'intense') {
        if (triggerType === 'rotation-due') {
          pattern = [250, 80, 250];
        } else if (triggerType === 'timer-end') {
          pattern = [400, 80, 400, 80, 400];
        } else {
          pattern = [300];
        }
      }

      if (pattern.length > 0) {
        navigator.vibrate(pattern);
      }
    } catch (e) {}
  };

  // Tracking seconds on ground & bench
  useEffect(() => {
    if (clockRunning) {
      clockIntervalRef.current = setInterval(() => {
        setClockRemaining((prev) => {
          if (prev <= 1) {
            setClockRunning(false);
            playSatisfactionChime('timer-end');
            playSatisfactionVibration('timer-end');
            return 0;
          }
          return prev - 1;
        });

        // Update player timers
        const updatedPlayers = players.map((p) => {
          if (p.status !== 'available') return p;
          const currentSlot = Object.keys(lineup).find((key) => lineup[key] === p.id);
          if (currentSlot) {
            const nextSlotTimes = { ...(p.slotTimes || {}) };
            nextSlotTimes[currentSlot] = (nextSlotTimes[currentSlot] || 0) + 1;
            return {
              ...p,
              active: p.active + 1,
              slotTimes: nextSlotTimes,
            };
          } else {
            return { ...p, bench: p.bench + 1 };
          }
        });
        onUpdatePlayers(updatedPlayers);
      }, 1000);
    } else {
      if (clockIntervalRef.current) {
        clearInterval(clockIntervalRef.current);
        clockIntervalRef.current = null;
      }
    }

    return () => {
      if (clockIntervalRef.current) {
        clearInterval(clockIntervalRef.current);
      }
    };
  }, [clockRunning, lineup, players]);

  // Handle auto alert when rotation is due
  const elapsedMinute = Math.max(0, Math.min(15, Math.floor((15 * 60 - clockRemaining) / 60)));

  const plannedRotations = rotations.filter(
    (r) => activePlanIds.includes(r.planId) && r.outId && r.inId
  );

  const dueRotations = plannedRotations.filter(
    (r) => !r.applied && r.quarter === score.quarter && r.minute <= elapsedMinute
  );

  const nextRotation = plannedRotations
    .filter((r) => !r.applied && r.quarter === score.quarter && r.minute > elapsedMinute)
    .sort((a, b) => a.minute - b.minute)[0] || null;

  // Beep whenever a new rotation becomes due
  const prevDueCountRef = useRef(0);
  useEffect(() => {
    if (dueRotations.length > prevDueCountRef.current) {
      playSatisfactionChime('rotation-due');
      playSatisfactionVibration('rotation-due');
      setAlertCollapsed(false); // expand alert card
    }
    prevDueCountRef.current = dueRotations.length;
  }, [dueRotations.length]);

  // Format MM:SS helper
  const fmt = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Coaching Insights calculator
  const coachingInsights = () => {
    const onGroundIds = new Set(Object.values(lineup));
    const plannedOutIds = new Set(plannedRotations.map((r) => r.outId));
    const plannedInIds = new Set(plannedRotations.map((r) => r.inId));

    const onGroundUnplanned = players.filter(
      (p) => p.status === 'available' && onGroundIds.has(p.id) && !plannedOutIds.has(p.id)
    );
    const onBenchUnplanned = players.filter(
      (p) => p.status === 'available' && !onGroundIds.has(p.id) && !plannedInIds.has(p.id)
    );

    const needRest = onGroundUnplanned
      .filter((p) => p.active >= 6 * 60) // 6 mins of active play
      .sort((a, b) => b.active - a.active);

    const fresh = onBenchUnplanned
      .filter((p) => p.bench >= 2 * 60) // 2 mins of bench wait
      .sort((a, b) => b.bench - a.bench);

    const outPlayer = needRest[0] || onGroundUnplanned.sort((a, b) => b.active - a.active)[0];
    const inPlayer = fresh[0] || onBenchUnplanned.sort((a, b) => b.bench - a.bench)[0];

    let suggestion = 'No immediate rotation needed';
    if (outPlayer && inPlayer) {
      suggestion = `Swap OUT #${outPlayer.number} ${outPlayer.nick || outPlayer.name} ➔ IN #${inPlayer.number} ${inPlayer.nick || inPlayer.name}`;
    }

    return { needRest, fresh, outPlayer, inPlayer, suggestion };
  };

  const insights = coachingInsights();

  // Score handlers
  const handleScore = (side: 'home' | 'away', type: 'goal' | 'behind' | 'undoGoal' | 'undoBehind') => {
    const currentQIndex = score.quarter - 1;
    const updated = { ...score };
    const detail = updated[side];

    if (type === 'goal') {
      detail.goals += 1;
      detail.quarters[currentQIndex].g += 1;
    } else if (type === 'behind') {
      detail.behinds += 1;
      detail.quarters[currentQIndex].b += 1;
    } else if (type === 'undoGoal' && detail.goals > 0) {
      detail.goals -= 1;
      if (detail.quarters[currentQIndex].g > 0) {
        detail.quarters[currentQIndex].g -= 1;
      }
    } else if (type === 'undoBehind' && detail.behinds > 0) {
      detail.behinds -= 1;
      if (detail.quarters[currentQIndex].b > 0) {
        detail.quarters[currentQIndex].b -= 1;
      }
    }

    onUpdateScore(updated);

    // Satisfying scoring confirmation tap/chime
    playSatisfactionChime('test');
    playSatisfactionVibration('test');
  };

  const handleSetQuarter = (q: number) => {
    setClockRunning(false);
    setClockRemaining(15 * 60);
    onUpdateScore({ ...score, quarter: q });
  };

  // Apply a rotation
  const handleApplyRotation = (rotId: string) => {
    const rot = rotations.find((r) => r.id === rotId);
    if (!rot) return;

    // Execute swap
    const nextLineup = { ...lineup };
    const outSlot = Object.keys(lineup).find((k) => lineup[k] === rot.outId);
    const inSlot = Object.keys(lineup).find((k) => lineup[k] === rot.inId);

    if (outSlot && inSlot) {
      nextLineup[outSlot] = rot.inId;
      nextLineup[inSlot] = rot.outId;
    } else if (outSlot) {
      nextLineup[outSlot] = rot.inId;
    } else if (inSlot) {
      nextLineup[inSlot] = rot.outId;
    }

    onUpdateLineup(nextLineup);

    // Mark applied
    onUpdateRotations(
      rotations.map((r) => (r.id === rotId ? { ...r, applied: true, status: 'applied' } : r))
    );

    // Play successful swap arpeggio chime and vibration
    playSatisfactionChime('rotation-due');
    playSatisfactionVibration('rotation-due');
  };

  // Guided Swap logic
  const handleConfirmGuidedSwap = () => {
    if (!guidedRotationId) return;
    handleApplyRotation(guidedRotationId);
    setGuidedRotationId(null);
  };

  // Move player to slot helper
  const handleMovePlayer = (pid: string, targetSlot: string) => {
    const nextLineup = { ...lineup };
    const currentSlot = Object.keys(lineup).find((k) => lineup[k] === pid);

    if (currentSlot) {
      delete nextLineup[currentSlot];
    }

    const occupantPid = lineup[targetSlot];
    if (occupantPid && currentSlot) {
      nextLineup[currentSlot] = occupantPid;
    }

    nextLineup[targetSlot] = pid;
    onUpdateLineup(nextLineup);
  };

  // HTML5 Drag events
  const handleDragStart = (e: React.DragEvent, pid: string) => {
    setDraggedPlayerId(pid);
    e.dataTransfer.setData('text/plain', pid);
  };

  const handleDropOnSlot = (e: React.DragEvent, slot: string) => {
    e.preventDefault();
    const pid = draggedPlayerId || e.dataTransfer.getData('text/plain');
    if (!pid) return;

    const p = players.find((x) => x.id === pid);
    if (p && p.status === 'available') {
      handleMovePlayer(pid, slot);
    }
    setDraggedPlayerId(null);
  };

  const handleDropOnBench = (e: React.DragEvent) => {
    e.preventDefault();
    const pid = draggedPlayerId || e.dataTransfer.getData('text/plain');
    if (!pid) return;

    const currentSlot = Object.keys(lineup).find((k) => lineup[k] === pid);
    if (currentSlot) {
      const nextLineup = { ...lineup };
      delete nextLineup[currentSlot];
      onUpdateLineup(nextLineup);
    }
    setDraggedPlayerId(null);
  };

  const handleDropOnInjured = (e: React.DragEvent) => {
    e.preventDefault();
    const pid = draggedPlayerId || e.dataTransfer.getData('text/plain');
    if (!pid) return;

    // Mark injured
    onUpdatePlayers(
      players.map((p) => (p.id === pid ? { ...p, status: 'injured' } : p))
    );

    // Remove from slot
    const currentSlot = Object.keys(lineup).find((k) => lineup[k] === pid);
    if (currentSlot) {
      const nextLineup = { ...lineup };
      delete nextLineup[currentSlot];
      onUpdateLineup(nextLineup);
    }
    setDraggedPlayerId(null);
  };

  // Click & tap handlers for Action Sheets (Failsafe for mobile/non-drag devices)
  const handleTapEntity = (pid: string) => {
    const p = players.find((x) => x.id === pid);
    if (!p || p.status !== 'available') return;

    if (pendingActionMode === 'swap' && pendingActionPlayerId) {
      if (pendingActionPlayerId === pid) {
        // click on same player opens menu
        setPendingActionPlayerId(null);
        setPendingActionMode(null);
        setActionMenuPlayerId(pid);
        return;
      }
      // Swap players
      const nextLineup = { ...lineup };
      const aSlot = Object.keys(lineup).find((k) => lineup[k] === pendingActionPlayerId);
      const bSlot = Object.keys(lineup).find((k) => lineup[k] === pid);

      if (aSlot && bSlot) {
        nextLineup[aSlot] = pid;
        nextLineup[bSlot] = pendingActionPlayerId;
      } else if (aSlot) {
        nextLineup[aSlot] = pid;
      } else if (bSlot) {
        nextLineup[bSlot] = pendingActionPlayerId;
      }

      onUpdateLineup(nextLineup);
      setPendingActionPlayerId(null);
      setPendingActionMode(null);
      return;
    }

    setActionMenuPlayerId(pid);
  };

  const handleTapSlot = (slot: string) => {
    if (pendingActionMode === 'move' && pendingActionPlayerId) {
      handleMovePlayer(pendingActionPlayerId, slot);
      setPendingActionPlayerId(null);
      setPendingActionMode(null);
    } else {
      setAssigningSlot(slot);
    }
  };

  const handleMenuAction = (action: 'swap' | 'bench' | 'move' | 'injured' | 'details') => {
    if (!actionMenuPlayerId) return;
    const pid = actionMenuPlayerId;
    setActionMenuPlayerId(null);

    if (action === 'swap') {
      setPendingActionPlayerId(pid);
      setPendingActionMode('swap');
    } else if (action === 'move') {
      setPendingActionPlayerId(pid);
      setPendingActionMode('move');
    } else if (action === 'bench') {
      const currentSlot = Object.keys(lineup).find((k) => lineup[k] === pid);
      if (currentSlot) {
        const nextLineup = { ...lineup };
        delete nextLineup[currentSlot];
        onUpdateLineup(nextLineup);
      }
    } else if (action === 'injured') {
      onUpdatePlayers(
        players.map((p) => (p.id === pid ? { ...p, status: 'injured' } : p))
      );
      const currentSlot = Object.keys(lineup).find((k) => lineup[k] === pid);
      if (currentSlot) {
        const nextLineup = { ...lineup };
        delete nextLineup[currentSlot];
        onUpdateLineup(nextLineup);
      }
    } else if (action === 'details') {
      onSelectPlayerId(pid);
      onNavigate('team');
    }
  };

  // Suggestion Apply
  const handleApplySuggestion = () => {
    const { outPlayer, inPlayer } = insights;
    if (outPlayer && inPlayer) {
      const nextLineup = { ...lineup };
      const outSlot = Object.keys(lineup).find((k) => lineup[k] === outPlayer.id);
      if (outSlot) {
        nextLineup[outSlot] = inPlayer.id;
      }
      onUpdateLineup(nextLineup);
    }
  };

  // Derived available players lists
  const availablePlayers = players.filter((p) => p.status === 'available');
  const activeFldIds = new Set(Object.values(lineup));
  const benchPlayers = availablePlayers.filter((p) => !activeFldIds.has(p.id));
  const unavailablePlayers = players.filter((p) => p.status !== 'available');

  const totalPoints = (sDetail: any) => sDetail.goals * 6 + sDetail.behinds;

  return (
    <div className="space-y-6 relative">
      {/* Top action header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[var(--line)] shadow-sm">
        <div>
          <h2 className="text-xl font-black text-[var(--navy)] tracking-tight">Game Day</h2>
          <p className="text-xs text-[var(--muted)] font-semibold mt-1">
            Match management, scoreboard scoring, dynamic oval lineup and alerts
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onCompleteGame}
            className="px-3.5 py-2 text-xs font-bold bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition shadow-xs"
          >
            Game Complete
          </button>
          <button
            onClick={onSaveLineup}
            className="px-3.5 py-2 text-xs font-bold bg-[#FAFBFF] text-[var(--blue)] border border-blue-100 rounded-xl hover:bg-blue-50 transition"
          >
            Save Lineup Template
          </button>
          <button
            onClick={onOpenLoadLineup}
            className="px-3.5 py-2 text-xs font-bold bg-[#F0F1F5] text-gray-700 rounded-xl hover:bg-gray-200 transition"
          >
            Load Saved Lineup
          </button>
        </div>
      </div>

      {/* Guided Swap Banner */}
      {guidedRotationId && (
        <div className="bg-[#FFF8E6] border-2 border-[var(--amber)] rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[var(--amber)] text-white rounded-full flex items-center justify-center font-black">
              🔁
            </div>
            <div>
              <b className="text-sm font-black text-amber-900 block">Guided swap in progress</b>
              <p className="text-xs text-amber-800 font-semibold mt-0.5">
                Apply: {rotations.find((r) => r.id === guidedRotationId)?.out} ➔ {rotations.find((r) => r.id === guidedRotationId)?.inn}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleConfirmGuidedSwap}
              className="px-4 py-2 text-xs font-bold bg-[var(--green)] text-white rounded-xl hover:opacity-90 transition"
            >
              Confirm swap
            </button>
            <button
              onClick={() => setGuidedRotationId(null)}
              className="px-4 py-2 text-xs font-bold bg-white text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Gamebar Score + Clock collapsible container */}
      <div className="bg-white rounded-2xl border border-[var(--line)] shadow-xs overflow-hidden">
        <div
          onClick={() => setScoreboardCollapsed(!scoreboardCollapsed)}
          className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50/80 transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-[var(--blue)] flex items-center justify-center font-bold text-sm">
              🏉
            </div>
            <div>
              <h3 className="font-black text-sm text-[var(--navy)]">
                Scoreboard & Quarter Clock
              </h3>
              {scoreboardCollapsed && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs font-bold text-gray-500">
                  <span className="px-1.5 py-0.5 bg-[var(--cyan)] text-black text-[10px] font-black rounded uppercase">
                    Q{score.quarter}
                  </span>
                  <span className="font-mono text-gray-700">{fmt(clockRemaining)}</span>
                  <span className="w-1 h-1 rounded-full bg-gray-300" />
                  <span className="text-gray-700">
                    {gameInfo.team || 'OUR TEAM'}: <b className="text-[var(--navy)]">{totalPoints(score.home)}</b> ({score.home.goals}.{score.home.behinds})
                  </span>
                  <span className="text-gray-300 font-normal">vs</span>
                  <span className="text-gray-700">
                    OPPONENT: <b className="text-red-600">{totalPoints(score.away)}</b> ({score.away.goals}.{score.away.behinds})
                  </span>
                  {clockRunning && (
                    <span className="flex items-center gap-1 text-emerald-600 animate-pulse ml-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      Live
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-gray-400 bg-gray-100 px-2.5 py-1 rounded-lg uppercase tracking-wider">
              {scoreboardCollapsed ? 'Expand Score' : 'Collapse Score'}
            </span>
            {scoreboardCollapsed ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            )}
          </div>
        </div>

        {!scoreboardCollapsed && (
          <div className="p-4 border-t border-gray-100 bg-gray-50/20">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Clock Card */}
              <div className="bg-gradient-to-br from-[var(--navy)] to-[var(--blue)] text-white p-4 rounded-2xl shadow-md flex flex-col justify-between min-h-[140px]">
                <div>
                  <span className="text-[10px] font-black tracking-widest text-[var(--cyan)] uppercase">Quarter Clock</span>
                  <div className="text-4xl font-black mt-1 font-mono tracking-tight">{fmt(clockRemaining)}</div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setClockRunning(!clockRunning);
                    }}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                      clockRunning ? 'bg-amber-500 text-black' : 'bg-[var(--green)] text-white'
                    }`}
                  >
                    {clockRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{clockRunning ? 'Pause' : 'Start'}</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setClockRunning(false);
                      setClockRemaining(15 * 60);
                    }}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-bold"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Scoreboard Card */}
              <div className="lg:col-span-2 bg-gradient-to-br from-gray-900 to-[var(--navy)] text-white p-4 rounded-2xl shadow-md flex flex-col justify-between min-h-[140px]">
                <div className="flex justify-between items-center pb-2 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-[var(--cyan)] text-black font-black text-[10px] rounded-md uppercase">
                      Q{score.quarter}
                    </span>
                    <span className="text-[10px] font-black uppercase text-gray-300">
                      AFL Live Scores
                    </span>
                  </div>
                  <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {[1, 2, 3, 4].map((q) => (
                      <button
                        key={q}
                        onClick={() => handleSetQuarter(q)}
                        className={`px-2 py-0.5 rounded text-[10px] font-black transition ${
                          score.quarter === q ? 'bg-[var(--blue)] text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'
                        }`}
                      >
                        Q{q}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 py-3">
                  {/* Home Side */}
                  <div className="flex flex-col items-center border-r border-white/10 pr-2">
                    <div className="text-[11px] font-black text-gray-400 tracking-wider uppercase mb-1">
                      {gameInfo.team || 'OUR TEAM'}
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-[var(--cyan)]">{totalPoints(score.home)}</span>
                      <span className="text-sm font-bold text-gray-300">({score.home.goals}.{score.home.behinds})</span>
                    </div>
                    <div className="flex gap-1 mt-2.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleScore('home', 'goal')}
                        className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md text-[10px] font-black"
                      >
                        +G
                      </button>
                      <button
                        onClick={() => handleScore('home', 'behind')}
                        className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-md text-[10px] font-black"
                      >
                        +B
                      </button>
                      <button
                        onClick={() => handleScore('home', 'undoGoal')}
                        className="px-1.5 py-1 bg-white/5 hover:bg-white/10 text-gray-300 rounded-md text-[10px] font-bold"
                      >
                        -G
                      </button>
                      <button
                        onClick={() => handleScore('home', 'undoBehind')}
                        className="px-1.5 py-1 bg-white/5 hover:bg-white/10 text-gray-300 rounded-md text-[10px] font-bold"
                      >
                        -B
                      </button>
                    </div>
                  </div>

                  {/* Away Side */}
                  <div className="flex flex-col items-center pl-2">
                    <div className="text-[11px] font-black text-gray-400 tracking-wider uppercase mb-1">
                      OPPONENT
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-red-400">{totalPoints(score.away)}</span>
                      <span className="text-sm font-bold text-gray-300">({score.away.goals}.{score.away.behinds})</span>
                    </div>
                    <div className="flex gap-1 mt-2.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleScore('away', 'goal')}
                        className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded-md text-[10px] font-black"
                      >
                        +G
                      </button>
                      <button
                        onClick={() => handleScore('away', 'behind')}
                        className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-md text-[10px] font-black"
                      >
                        +B
                      </button>
                      <button
                        onClick={() => handleScore('away', 'undoGoal')}
                        className="px-1.5 py-1 bg-white/5 hover:bg-white/10 text-gray-300 rounded-md text-[10px] font-bold"
                      >
                        -G
                      </button>
                      <button
                        onClick={() => handleScore('away', 'undoBehind')}
                        className="px-1.5 py-1 bg-white/5 hover:bg-white/10 text-gray-300 rounded-md text-[10px] font-bold"
                      >
                        -B
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sound & Vibration Preferences */}
            <div className="mt-4 pt-4 border-t border-gray-150 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" onClick={(e) => e.stopPropagation()}>
              
              {/* Sound Settings Column */}
              <div className="bg-white p-3 rounded-xl border border-gray-100 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    {soundEnabled ? (
                      <Volume2 className="w-4 h-4 text-emerald-600 animate-pulse" />
                    ) : (
                      <VolumeX className="w-4 h-4 text-gray-400" />
                    )}
                    <span className="text-xs font-black text-gray-700 uppercase tracking-wider">Audio Chime Alerts</span>
                  </div>
                  
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-[11px] font-semibold text-gray-500">Enable Chimes</label>
                    <input
                      type="checkbox"
                      checked={soundEnabled}
                      onChange={(e) => setSoundEnabled(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                  </div>

                  {soundEnabled && (
                    <>
                      <div className="mb-3">
                        <label className="text-[11px] font-semibold text-gray-500 block mb-1">Chime Sound Style</label>
                        <select
                          value={soundTone}
                          onChange={(e) => setSoundTone(e.target.value)}
                          className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg p-1.5 font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="acoustic">🔔 Acoustic Chime (Rich Harmonics)</option>
                          <option value="marimba">🪵 Warm Marimba (Soft Wood Tap)</option>
                          <option value="digital">⚡ Digital Alert (Tech Blip)</option>
                          <option value="classic">🔊 Classic Beep (Standard Sine)</option>
                        </select>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[11px] font-semibold text-gray-500">Volume</label>
                          <span className="text-[10px] font-mono font-bold text-indigo-600">{Math.round(soundVolume * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={soundVolume}
                          onChange={(e) => setSoundVolume(parseFloat(e.target.value))}
                          className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Haptics Settings Column */}
              <div className="bg-white p-3 rounded-xl border border-gray-100 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Smartphone className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-black text-gray-700 uppercase tracking-wider">Haptic Vibration</span>
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <div className="flex flex-col">
                      <label className="text-[11px] font-semibold text-gray-500">Enable Vibration</label>
                      <span className="text-[9px] text-gray-400 font-medium font-mono">Mobile Haptics</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={hapticEnabled}
                      onChange={(e) => setHapticEnabled(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                        {hapticEnabled && (
                    <div className="mb-1">
                      <label className="text-[11px] font-semibold text-gray-500 block mb-1">Vibration Pattern</label>
                      <select
                        value={hapticPattern}
                        onChange={(e) => setHapticPattern(e.target.value)}
                        className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg p-1.5 font-semibold text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="pulse">📳 Standard Pulse (Alerts)</option>
                        <option value="double-tap">💓 Heartbeat Rhythm</option>
                        <option value="intense">⚡ High Intensity (Timer Ends)</option>
                      </select>
                      <div className="bg-amber-50 border border-amber-100 rounded-lg p-2.5 mt-2">
                        <p className="text-[10px] text-amber-800 leading-relaxed font-semibold">
                          ⚠️ iPhone Vibration Tip:
                        </p>
                        <p className="text-[9px] text-amber-700 leading-relaxed mt-0.5 font-medium">
                          Apple iOS restricts the <code className="font-mono">navigator.vibrate</code> API inside Safari/Chrome. Mechanical vibration is unavailable on iPhones, but high-quality sound alerts play beautifully!
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Instant Test Console Column */}
              <div className="bg-gradient-to-br from-indigo-50/50 to-blue-50/50 p-3 rounded-xl border border-indigo-100/60 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Bell className="w-4 h-4 text-indigo-600 animate-bounce" />
                    <span className="text-xs font-black text-gray-700 uppercase tracking-wider">Sideline Test Console</span>
                  </div>
                  <div className="space-y-1.5 mb-3">
                    <p className="text-[10px] text-gray-500 leading-relaxed font-medium">
                      Test alert volumes below. Any screen tap will unlock the Web Audio device for background timer alarms.
                    </p>
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-2.5">
                      <p className="text-[10px] text-blue-800 leading-relaxed font-semibold">
                        🔊 iPhone Sound Setup:
                      </p>
                      <p className="text-[9px] text-blue-700 leading-relaxed mt-0.5 font-medium">
                        Ensure the physical <strong className="font-semibold">Ring/Silent switch</strong> on the side of your iPhone is set to <span className="font-semibold text-blue-900">Ring</span> (no orange line showing). If your iPhone is on silent, iOS will completely block the sound chimes.
                      </p>
                    </div>
                  </div>
                </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      playSatisfactionChime('test');
                      playSatisfactionVibration('test');
                    }}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white rounded-xl text-[11px] font-black tracking-wider shadow-xs transition uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    ⚡ Test Quick Score Tap
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playSatisfactionChime('rotation-due');
                      playSatisfactionVibration('rotation-due');
                    }}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-xl text-[11px] font-black tracking-wider shadow-xs transition uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    🔁 Test Rotation Alert
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playSatisfactionChime('timer-end');
                      playSatisfactionVibration('timer-end');
                    }}
                    className="w-full py-2 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white rounded-xl text-[11px] font-black tracking-wider shadow-xs transition uppercase flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    🚨 Test Timer Alarm
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* Insights and alerts Section */}
      <div className={`card collapsible-card bg-white rounded-2xl border border-[var(--line)] shadow-sm ${alertCollapsed ? 'max-h-[56px] overflow-hidden' : ''}`}>
        <div
          onClick={() => setAlertCollapsed(!alertCollapsed)}
          className="p-4 flex items-center justify-between cursor-pointer border-b border-gray-100"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className={`w-5 h-5 ${dueRotations.length > 0 ? 'text-[var(--red)] animate-pulse' : 'text-[var(--blue)]'}`} />
            <h3 className="font-black text-sm text-[var(--navy)]">
              Coach's Action Panel Q{score.quarter}
            </h3>
          </div>
          {alertCollapsed ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronUp className="w-4 h-4 text-gray-400" />}
        </div>

        {!alertCollapsed && (
          <div className="p-4 space-y-4">
            {/* Due Rotations */}
            {dueRotations.length > 0 ? (
              <div className="bg-red-50 border-l-4 border-[var(--red)] p-3.5 rounded-xl space-y-3">
                <b className="text-xs font-black text-red-900 block flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span>Rotation Due Now - Apply Changes!</span>
                </b>
                <div className="space-y-2">
                  {dueRotations.map((r) => (
                    <div
                      key={r.id}
                      className="bg-white border border-red-100 rounded-xl p-3 flex flex-col md:flex-row items-center justify-between gap-3"
                    >
                      <div>
                        <span className="text-[10px] font-extrabold text-red-500 uppercase tracking-widest block mb-0.5">
                          {r.type === 'onfield' ? 'On-Field Position Swap' : 'Bench Interchange'}
                        </span>
                        <b className="text-sm font-extrabold text-gray-900">
                          {r.out} ➔ {r.inn}
                        </b>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setGuidedRotationId(r.id)}
                          className="px-3 py-1.5 text-xs font-bold bg-[var(--amber)] text-black rounded-lg hover:opacity-95"
                        >
                          Guide Swap
                        </button>
                        <button
                          onClick={() => handleApplyRotation(r.id)}
                          className="px-3 py-1.5 text-xs font-bold bg-[var(--green)] text-white rounded-lg hover:opacity-95"
                        >
                          Apply now
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-[#E6F6EE] border-l-4 border-[var(--green)] p-3 rounded-xl">
                <p className="text-xs font-bold text-[#0E7A48]">All scheduled Q{score.quarter} rotations have been applied successfully.</p>
              </div>
            )}

            {/* Smart Suggestion */}
            <div className="border-t border-gray-100 pt-3">
              <span className="text-[10px] font-black text-[var(--muted)] uppercase tracking-wider block mb-1">
                AI Rotation Suggestion
              </span>
              <p className="text-sm font-bold text-gray-800 leading-relaxed mb-3">
                {insights.suggestion}
              </p>
              {insights.outPlayer && insights.inPlayer && (
                <button
                  onClick={handleApplySuggestion}
                  className="px-3.5 py-1.5 bg-[#EEF2FF] hover:bg-blue-50 text-[var(--blue)] font-bold text-xs rounded-lg transition border border-blue-100"
                >
                  Apply Suggested Swap
                </button>
              )}
            </div>

            {/* Next Scheduled */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-100 pt-3">
              <div>
                <span className="text-[10px] font-black text-[var(--muted)] uppercase tracking-wider block mb-1">
                  Next Scheduled Changes
                </span>
                {nextRotation ? (
                  <div className="text-xs font-bold text-gray-700">
                    At {nextRotation.minute} min: {nextRotation.out} ➔ {nextRotation.inn}
                  </div>
                ) : (
                  <div className="text-xs text-gray-400 font-semibold">No more rotations in this quarter.</div>
                )}
              </div>
              <div>
                <span className="text-[10px] font-black text-[var(--muted)] uppercase tracking-wider block mb-1">
                  Plans Running
                </span>
                <div className="flex flex-wrap gap-1">
                  {plans.map((p) => {
                    const isRunning = activePlanIds.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        onClick={() => onTogglePlanRunning(p.id)}
                        className={`px-2 py-1 text-[10px] font-extrabold rounded-lg border transition ${
                          isRunning
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-gray-50 text-gray-400 border-gray-200 hover:text-gray-600'
                        }`}
                      >
                        {isRunning ? 'Run: ' : 'Pause: '}{p.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Oval Field and Rosters Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Oval Field Container with toggle */}
        <div className="xl:col-span-2 space-y-3">
          {/* Layout Mode Selector for Mobile Devices */}
          <div className="flex items-center justify-between bg-white p-2 rounded-2xl border border-gray-150 shadow-xs">
            <div className="flex items-center gap-2 pl-1">
              <Smartphone className="w-4 h-4 text-indigo-600 animate-pulse shrink-0" />
              <div>
                <span className="text-xs font-black text-[var(--navy)] block leading-tight">Position Layout</span>
                <span className="text-[9px] text-gray-500 font-bold block mt-0.5">Use Tactical List for easier mobile placement</span>
              </div>
            </div>
            <div className="flex bg-gray-100 p-0.5 rounded-xl">
              <button
                type="button"
                onClick={() => setFieldViewMode('field')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1 cursor-pointer ${
                  fieldViewMode === 'field'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <span>🏟️</span>
                <span>Visual Field</span>
              </button>
              <button
                type="button"
                onClick={() => setFieldViewMode('list')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1 cursor-pointer ${
                  fieldViewMode === 'list'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <span>📋</span>
                <span>Tactical List</span>
              </button>
            </div>
          </div>

          {fieldViewMode === 'list' ? (
            <div className="space-y-3">
              {Object.entries(POSITION_GROUPS).map(([groupName, slots]) => {
                const groupLabel =
                  groupName === 'FWD' ? '🔥 Forwards' :
                  groupName === 'MID' ? '⚡ Midfielders' :
                  groupName === 'DEF' ? '🛡️ Defenders' :
                  '🏔️ Followers / Ruck';
                
                const groupBg =
                  groupName === 'FWD' ? 'bg-red-50 text-red-800 border-red-100' :
                  groupName === 'MID' ? 'bg-blue-50 text-blue-800 border-blue-100' :
                  groupName === 'DEF' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' :
                  'bg-purple-50 text-purple-800 border-purple-100';

                return (
                  <div key={groupName} className="bg-white rounded-2xl border border-gray-150 p-4 space-y-3 shadow-sm">
                    <div className={`flex items-center justify-between px-3 py-2 rounded-xl border font-black text-xs uppercase tracking-wider ${groupBg}`}>
                      <span>{groupLabel}</span>
                      <span className="text-[10px] opacity-80">{slots.length} Slots</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {slots.map((slotName) => {
                        const posConfig = POSITIONS.find(([sn]) => sn === slotName);
                        if (!posConfig) return null;
                        const [, label] = posConfig;
                        const pid = lineup[slotName];
                        const p = pid ? players.find((x) => x.id === pid) : null;
                        const isSelected = pendingActionPlayerId === pid || pendingActionPlayerId === slotName;
                        
                        const isPendingAssign = pendingActionMode === 'move' && pendingActionPlayerId;
                        const pendingPlayer = isPendingAssign ? players.find(x => x.id === pendingActionPlayerId) : null;

                        return (
                          <div
                            key={slotName}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => handleDropOnSlot(e, slotName)}
                            className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                              isSelected 
                                ? 'border-amber-400 bg-amber-50/40 ring-2 ring-amber-300' 
                                : p 
                                  ? 'border-gray-150 bg-gray-50/50 hover:bg-gray-50' 
                                  : 'border-dashed border-gray-200 bg-white hover:bg-gray-50/20'
                            }`}
                          >
                            <div className="flex items-center gap-3 truncate">
                              <div className={`w-11 h-9 rounded-lg flex flex-col items-center justify-center font-black border text-xs shrink-0 ${
                                groupName === 'FWD' ? 'bg-red-50 text-red-600 border-red-100' :
                                groupName === 'MID' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                groupName === 'DEF' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                'bg-purple-50 text-purple-600 border-purple-100'
                              }`}>
                                <span className="text-xs tracking-tighter leading-none">{label}</span>
                              </div>
                              <div className="text-left truncate">
                                <h4 className="font-extrabold text-[11px] text-[var(--navy)] leading-tight truncate">
                                  {POSITION_DESCRIPTIONS[slotName] || label}
                                </h4>
                                <span className="text-[9px] text-gray-400 font-bold block mt-0.5">
                                  {p ? `Occupied: #${p.number}` : 'Vacant'}
                                </span>
                              </div>
                            </div>

                            <div className="shrink-0">
                              {p ? (
                                <div className="flex items-center gap-1.5">
                                  <div 
                                    onClick={() => handleTapEntity(p.id)}
                                    className="flex items-center gap-2 bg-white px-2.5 py-1 rounded-lg border border-gray-200 cursor-pointer shadow-xs active:scale-95 transition-all"
                                  >
                                    <div className="text-left shrink-0">
                                      <div className="font-black text-[11px] text-gray-800">
                                        {p.nick || p.name}
                                      </div>
                                      <div className="text-[8px] text-gray-400 font-bold">
                                        {fmt(p.active)}
                                      </div>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      onUpdatePlayers(
                                        players.map((x) => (x.id === p.id ? { ...x, status: 'available' } : x))
                                      );
                                      const nextLineup = { ...lineup };
                                      delete nextLineup[slotName];
                                      onUpdateLineup(nextLineup);
                                      playSatisfactionChime('rotation-due');
                                      playSatisfactionVibration('test');
                                    }}
                                    className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg border border-red-100 transition active:scale-95 cursor-pointer flex items-center justify-center"
                                    title="Bench Player"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPendingActionPlayerId(p.id);
                                      setPendingActionMode('swap');
                                      playSatisfactionChime('test');
                                    }}
                                    className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-[9px] font-black border border-blue-100 transition active:scale-95 cursor-pointer"
                                  >
                                    Swap
                                  </button>
                                </div>
                              ) : (
                                <div>
                                  {pendingPlayer ? (
                                    <button
                                      type="button"
                                      onClick={() => handleTapSlot(slotName)}
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black transition active:scale-95 cursor-pointer"
                                    >
                                      Assign #{pendingPlayer.number}
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setAssigningSlot(slotName)}
                                      className="px-2.5 py-1 border border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50/50 text-gray-500 hover:text-blue-600 rounded-lg text-[10px] font-bold transition cursor-pointer"
                                    >
                                      + Place
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Oval Field */
            <div className="overflow-x-auto pb-4">
              <div className="field relative select-none">
                <div className="centre-square"></div>

                {/* AFL Goal Posts & Markings - Top End */}
                <div className="goal-line-top" id="afl-goal-line-top"></div>
                <div className="goal-square-top" id="afl-goal-square-top"></div>
                <div className="goal-post behind top-left-behind" id="afl-goal-post-top-1"></div>
                <div className="goal-post main top-left-main" id="afl-goal-post-top-2"></div>
                <div className="goal-post main top-right-main" id="afl-goal-post-top-3"></div>
                <div className="goal-post behind top-right-behind" id="afl-goal-post-top-4"></div>

                {/* AFL Goal Posts & Markings - Bottom End */}
                <div className="goal-line-bottom" id="afl-goal-line-bottom"></div>
                <div className="goal-square-bottom" id="afl-goal-square-bottom"></div>
                <div className="goal-post behind bottom-left-behind" id="afl-goal-post-bottom-1"></div>
                <div className="goal-post main bottom-left-main" id="afl-goal-post-bottom-2"></div>
                <div className="goal-post main bottom-right-main" id="afl-goal-post-bottom-3"></div>
                <div className="goal-post behind bottom-right-behind" id="afl-goal-post-bottom-4"></div>

                {POSITIONS.map(([slotName, label, x, y]) => {
                  const pid = lineup[slotName];
                  const p = pid ? players.find((x) => x.id === pid) : null;
                  const isSelected = pendingActionPlayerId === pid || pendingActionPlayerId === slotName;

                  return (
                    <div
                      key={slotName}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleDropOnSlot(e, slotName)}
                      onClick={() => {
                        if (p) handleTapEntity(p.id);
                        else handleTapSlot(slotName);
                      }}
                      className={`slot flex items-center justify-center transition-all ${
                        ['R', 'ROV', 'RR', 'C', 'CHF', 'CHB', 'FF', 'FB'].includes(slotName) ? 'key' : ''
                      } ${isSelected ? 'selected' : ''}`}
                      style={{ left: `${x}%`, top: `${y}%` }}
                    >
                      {p ? (
                        <div className="relative overflow-hidden w-full h-full rounded-lg bg-white p-1 shadow-xs border border-gray-100 flex flex-col justify-between">
                          {/* Swipe-to-bench background indicator */}
                          {swipingPlayerId === p.id && Math.abs(swipeOffset) > 10 && (
                            <div className="absolute inset-0 bg-red-600 text-white flex items-center justify-center gap-1 animate-pulse z-10">
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span className="text-[8px] font-black uppercase tracking-wider">Bench Player</span>
                            </div>
                          )}

                          <div
                            draggable
                            onDragStart={(e) => handleDragStart(e, p.id)}
                            onTouchStart={(e) => handleTouchStart(e, p.id)}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                            style={{
                              transform: swipingPlayerId === p.id ? `translateX(${swipeOffset}px)` : 'none',
                              transition: swipingPlayerId === p.id ? 'none' : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                            }}
                            className="w-full h-full absolute inset-0 flex flex-col justify-between bg-white p-1 rounded-lg text-black font-extrabold select-none"
                          >
                            {/* Position Label Row */}
                            <div className="flex items-center justify-between border-b border-gray-150 pb-0.5 mb-0.5 w-full shrink-0">
                              <span className={`text-[7px] sm:text-[8px] font-black px-1 rounded-xs uppercase tracking-tighter ${
                                POSITION_GROUPS.FWD.includes(slotName) ? 'bg-red-50 text-red-600' :
                                POSITION_GROUPS.MID.includes(slotName) ? 'bg-blue-50 text-blue-600' :
                                POSITION_GROUPS.DEF.includes(slotName) ? 'bg-emerald-50 text-emerald-600' : 'bg-purple-50 text-purple-600'
                              }`}>
                                {label}
                              </span>
                              <span className="hidden sm:inline text-[7px] text-gray-400 font-extrabold truncate max-w-[85px] text-right" title={POSITION_DESCRIPTIONS[slotName]}>
                                {POSITION_DESCRIPTIONS[slotName]?.replace('Pocket Left', 'Pkt L').replace('Pocket Right', 'Pkt R').replace('Half Forward Left', 'HF L').replace('Half Forward Right', 'HF R').replace('Half Back Left', 'HB L').replace('Half Back Right', 'HB R').replace('Centre Half Forward', 'Ctr Half Fwd').replace('Centre Half Back', 'Ctr Half Bk')}
                              </span>
                            </div>

                            {/* Player info */}
                            <div className="flex items-center gap-1 w-full min-w-0">
                              <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-[8px] sm:text-[10px] text-white font-black shrink-0 ${
                                POSITION_GROUPS.FWD.includes(slotName) ? 'bg-[#E5484D]' :
                                POSITION_GROUPS.MID.includes(slotName) ? 'bg-[#4C6FFF]' :
                                POSITION_GROUPS.DEF.includes(slotName) ? 'bg-[#16a765]' : 'bg-[#8B5CF6]'
                              }`}>
                                {p.number}
                              </div>
                              <div className="truncate text-[8px] sm:text-[9px] leading-none flex-1 text-left w-full min-w-0">
                                {/* On desktop: show full name or nickname */}
                                <div className="hidden sm:block font-extrabold truncate text-gray-900" title={p.nick ? `${p.nick} (${p.name})` : p.name}>
                                  {p.nick || p.name}
                                </div>
                                {/* On mobile: show first name or short name */}
                                <div className="block sm:hidden font-extrabold truncate text-gray-900 text-[8px]" title={p.nick ? `${p.nick} (${p.name})` : p.name}>
                                  {p.nick || p.name.split(' ')[0]}
                                </div>
                                <div className="text-[6px] sm:text-[7px] text-gray-500 font-bold leading-none mt-0.5">{fmt(p.active)}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center w-full h-full text-center p-0.5 sm:p-1">
                          <span className="text-amber-300 font-black text-[9px] sm:text-[11px] leading-none mb-0.5 tracking-wider uppercase">{label}</span>
                          <span className="hidden sm:block text-[7px] text-white/70 font-extrabold truncate max-w-full leading-tight mb-1" title={POSITION_DESCRIPTIONS[slotName]}>
                            {POSITION_DESCRIPTIONS[slotName]?.replace('Pocket Left', 'Pkt L').replace('Pocket Right', 'Pkt R').replace('Half Forward Left', 'HF L').replace('Half Forward Right', 'HF R').replace('Half Back Left', 'HB L').replace('Half Back Right', 'HB R').replace('Centre Half Forward', 'Ctr Half Fwd').replace('Centre Half Back', 'Ctr Half Bk')}
                          </span>
                          <span className="text-[6px] sm:text-[7px] font-black uppercase text-white/50 border border-dashed border-white/20 bg-white/5 px-1 py-0.5 rounded-sm sm:rounded-md hover:bg-white/15 transition-all">
                            + Assign
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Roster and Benches */}
        <div className="space-y-4">
          {/* Bench Roster */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDropOnBench}
            className="bg-white rounded-2xl border border-[var(--line)] shadow-sm p-4"
          >
            <div className="border-b border-gray-100 pb-3 mb-3 flex items-center justify-between">
              <h3 className="font-black text-sm text-[var(--navy)]">Available Bench ({benchPlayers.length})</h3>
              <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full animate-pulse">Drag / Swipe ➔ to Place</span>
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
              {benchPlayers.map((p) => {
                const isSelected = pendingActionPlayerId === p.id;
                const isSwiping = swipingPlayerId === p.id;
                const currentOffset = isSwiping ? swipeOffset : 0;

                return (
                  <div key={p.id} className="relative overflow-hidden rounded-xl border border-gray-100 bg-gray-50 h-[52px] select-none">
                    {/* Background swipe tracks */}
                    {isSwiping && currentOffset > 10 && (
                      <div className="absolute inset-y-0 left-0 right-0 bg-emerald-500 text-white flex items-center pl-3 gap-1">
                        <Check className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-[9px] font-black uppercase tracking-wider">Place Field</span>
                      </div>
                    )}
                    {isSwiping && currentOffset < -10 && (
                      <div className="absolute inset-y-0 left-0 right-0 bg-red-500 text-white flex items-center justify-end pr-3 gap-1">
                        <span className="text-[9px] font-black uppercase tracking-wider">Injured</span>
                        <Ban className="w-3.5 h-3.5 shrink-0" />
                      </div>
                    )}

                    {/* Actual Card */}
                    <div
                      draggable
                      onDragStart={(e) => handleDragStart(e, p.id)}
                      onTouchStart={(e) => handleTouchStart(e, p.id)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      onClick={() => handleTapEntity(p.id)}
                      style={{
                        transform: `translateX(${currentOffset}px)`,
                        transition: isSwiping ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
                      }}
                      className={`absolute inset-0 flex items-center gap-2 p-2 bg-white rounded-xl cursor-pointer hover:bg-gray-100/80 transition-colors ${
                        isSelected ? 'ring-2 ring-[var(--amber)] z-10' : ''
                      }`}
                    >
                      <div className="w-6 h-6 rounded-md bg-[var(--blue)] text-white font-extrabold flex items-center justify-center text-[10px] shrink-0">
                        {p.number}
                      </div>
                      <div className="truncate flex-1">
                        <b className="text-xs text-[var(--ink)] block truncate">{p.nick || p.name}</b>
                        <span className="text-[10px] font-bold text-gray-500">{fmt(p.bench)} Bench</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {benchPlayers.length === 0 && (
                <div className="col-span-2 text-center py-6 text-xs text-gray-400 font-semibold">
                  No players currently on the bench.
                </div>
              )}
            </div>
          </div>

          {/* Injury / Absent Card */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDropOnInjured}
            className="bg-white rounded-2xl border border-[var(--line)] shadow-sm p-4"
          >
            <div className="border-b border-gray-100 pb-3 mb-3 flex items-center justify-between">
              <h3 className="font-black text-sm text-[var(--red)] flex items-center gap-1.5">
                <Ban className="w-4 h-4" />
                <span>Away / Injured ({unavailablePlayers.length})</span>
              </h3>
              <span className="text-[9px] bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-black">Drop area</span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {unavailablePlayers.map((p) => (
                <div
                  key={p.id}
                  onClick={() => {
                    if (window.confirm(`Mark ${p.name} as available?`)) {
                      onUpdatePlayers(
                        players.map((x) => (x.id === p.id ? { ...x, status: 'available' } : x))
                      );
                    }
                  }}
                  className="flex items-center justify-between p-2 bg-red-50/50 border border-red-100 rounded-xl cursor-pointer hover:bg-red-100/50 transition"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-red-500 text-white font-extrabold flex items-center justify-center text-[10px]">
                      {p.number}
                    </div>
                    <b className="text-xs text-red-900">{p.nick || p.name}</b>
                  </div>
                  <span className="text-[10px] font-black uppercase text-red-700 bg-red-100 px-2 py-0.5 rounded-md">
                    {p.status}
                  </span>
                </div>
              ))}
              {unavailablePlayers.length === 0 && (
                <p className="text-xs text-gray-400 font-semibold text-center py-4">
                  All players are currently active and available.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Player Action Sheet / Modal */}
      {actionMenuPlayerId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-[2000] flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-t-2xl md:rounded-2xl w-full max-w-sm border border-[var(--line)] shadow-2xl p-4 space-y-4">
            {/* Header info */}
            {(() => {
              const p = players.find((x) => x.id === actionMenuPlayerId);
              if (!p) return null;
              const isOnFld = Object.values(lineup).includes(p.id);
              const curPos = Object.keys(lineup).find((k) => lineup[k] === p.id) || 'Bench';

              return (
                <>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--navy)] to-[var(--blue)] text-white flex items-center justify-center font-black text-lg">
                      #{p.number}
                    </div>
                    <div>
                      <h4 className="text-base font-black text-gray-900 leading-tight">
                        {p.nick ? `${p.nick} (${p.name})` : p.name}
                      </h4>
                      <p className="text-xs text-gray-500 font-semibold mt-0.5">
                        Status: {curPos} • Active: {fmt(p.active)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => handleMenuAction('swap')}
                      className="w-full text-left py-2.5 px-3 bg-blue-50 text-[var(--blue)] font-bold text-xs rounded-xl hover:bg-blue-100 flex items-center gap-2"
                    >
                      🔁 Interchange / Swap Player
                    </button>
                    <button
                      onClick={() => handleMenuAction('move')}
                      className="w-full text-left py-2.5 px-3 bg-gray-50 hover:bg-gray-100 font-bold text-xs text-gray-700 rounded-xl flex items-center gap-2"
                    >
                      🎯 Move to Position on Field
                    </button>
                    {isOnFld && (
                      <button
                        onClick={() => handleMenuAction('bench')}
                        className="w-full text-left py-2.5 px-3 bg-amber-50 hover:bg-amber-100 font-bold text-xs text-amber-700 rounded-xl flex items-center gap-2"
                      >
                        📥 Move to Bench
                      </button>
                    )}
                    <button
                      onClick={() => handleMenuAction('injured')}
                      className="w-full text-left py-2.5 px-3 bg-red-50 hover:bg-red-100 font-bold text-xs text-red-700 rounded-xl flex items-center gap-2"
                    >
                      🩹 Mark Injured / Away
                    </button>
                    <button
                      onClick={() => handleMenuAction('details')}
                      className="w-full text-left py-2.5 px-3 bg-gray-100 hover:bg-gray-200 font-bold text-xs text-gray-700 rounded-xl flex items-center gap-2"
                    >
                      👤 View Player Card
                    </button>
                    <button
                      onClick={() => setActionMenuPlayerId(null)}
                      className="w-full py-2.5 border border-gray-200 text-gray-600 font-bold text-xs rounded-xl hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Floating Action Hint / Instructions */}
      {pendingActionPlayerId && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-[var(--navy)] text-white px-5 py-2.5 rounded-full flex items-center gap-3 shadow-lg z-50 animate-bounce">
          <AlertCircle className="w-4 h-4 text-[var(--cyan)]" />
          <span className="text-xs font-black">
            {pendingActionMode === 'swap'
              ? `Select another player to swap with #${players.find((x) => x.id === pendingActionPlayerId)?.number}`
              : `Tap an empty field position to place #${players.find((x) => x.id === pendingActionPlayerId)?.number}`}
          </span>
          <button
            onClick={() => {
              setPendingActionPlayerId(null);
              setPendingActionMode(null);
            }}
            className="px-2 py-0.5 bg-white/10 hover:bg-white/20 text-white rounded-md text-[10px] font-black uppercase"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Live Game Day Insights Summary */}
      <div className={`card collapsible-card bg-white rounded-2xl border border-[var(--line)] shadow-sm ${gameDayInsightsCollapsed ? 'max-h-[56px] overflow-hidden' : ''}`}>
        <div
          onClick={() => setGameDayInsightsCollapsed(!gameDayInsightsCollapsed)}
          className="p-4 flex items-center justify-between cursor-pointer border-b border-gray-100"
        >
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-[var(--blue)]" />
            <h3 className="font-black text-sm text-[var(--navy)]">Live Game Day Insights</h3>
          </div>
          {gameDayInsightsCollapsed ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronUp className="w-4 h-4 text-gray-400" />}
        </div>

        {!gameDayInsightsCollapsed && (
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-2 text-[10px] font-black text-gray-400 uppercase">Player</th>
                  <th className="py-2 text-[10px] font-black text-gray-400 uppercase">On Ground</th>
                  <th className="py-2 text-[10px] font-black text-gray-400 uppercase">Bench</th>
                  <th className="py-2 text-[10px] font-black text-gray-400 uppercase">% Played</th>
                  <th className="py-2 text-[10px] font-black text-gray-400 uppercase">Position</th>
                </tr>
              </thead>
              <tbody>
                {players
                  .filter((p) => p.status === 'available')
                  .sort((a, b) => b.active - a.active)
                  .map((p) => {
                    const total = p.active + p.bench;
                    const pct = total > 0 ? Math.round((p.active / total) * 100) : 0;
                    const pos = Object.keys(lineup).find((k) => lineup[k] === p.id) || 'Bench';
                    return (
                      <tr key={p.id} className="border-b border-gray-100 text-xs">
                        <td className="py-2.5 font-bold text-gray-900">{p.nick || p.name}</td>
                        <td className="py-2.5 font-semibold text-gray-600">{fmt(p.active)}</td>
                        <td className="py-2.5 font-semibold text-gray-600">{fmt(p.bench)}</td>
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 rounded-full font-black ${
                            pct > 80 ? 'bg-red-50 text-red-700' : pct > 50 ? 'bg-blue-50 text-[var(--blue)]' : 'bg-green-50 text-[#0E7A48]'
                          }`}>
                            {pct}%
                          </span>
                        </td>
                        <td className="py-2.5 font-extrabold text-[var(--blue)] uppercase">{pos}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mobile Swipe Position Picker Drawer Overlay */}
      {swipePickerPlayer && (
        <div 
          className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setSwipePickerPlayer(null)}
        >
          <div 
            className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-md">
                  #{swipePickerPlayer.number}
                </div>
                <div>
                  <h3 className="font-black text-sm text-[var(--navy)] leading-tight">
                    Place {swipePickerPlayer.nick || swipePickerPlayer.name}
                  </h3>
                  <p className="text-[11px] text-gray-500 font-bold mt-0.5">
                    Select a field position to assign
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSwipePickerPlayer(null)}
                className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-500 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List of positions, grouped by group */}
            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              {Object.entries(POSITION_GROUPS).map(([groupName, slots]) => {
                const groupColorClass = 
                  groupName === 'FWD' ? 'text-red-600 bg-red-50 border-red-100' :
                  groupName === 'MID' ? 'text-blue-600 bg-blue-50 border-blue-100' :
                  groupName === 'DEF' ? 'text-emerald-600 bg-emerald-50 border-emerald-100' :
                  'text-purple-600 bg-purple-50 border-purple-100';

                return (
                  <div key={groupName} className="space-y-2">
                    <div className={`text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded-md border inline-block ${groupColorClass}`}>
                      {groupName === 'FWD' ? '🔥 Forwards' :
                       groupName === 'MID' ? '⚡ Midfielders' :
                       groupName === 'DEF' ? '🛡️ Defenders' :
                       '🏔️ Followers / Ruck'}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {slots.map((slotName) => {
                        const posConfig = POSITIONS.find(([sn]) => sn === slotName);
                        if (!posConfig) return null;
                        const [, label] = posConfig;

                        const occupantId = lineup[slotName];
                        const occupant = occupantId ? players.find((x) => x.id === occupantId) : null;

                        return (
                          <button
                            key={slotName}
                            type="button"
                            onClick={() => {
                              handleMovePlayer(swipePickerPlayer.id, slotName);
                              setSwipePickerPlayer(null);
                              playSatisfactionChime('rotation-due');
                              playSatisfactionVibration('test');
                            }}
                            className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition cursor-pointer active:scale-95 ${
                              occupant 
                                ? 'bg-gray-50/70 border-gray-100 hover:bg-amber-50 hover:border-amber-200' 
                                : 'bg-white border-dashed border-emerald-200 hover:bg-emerald-50/50 hover:border-emerald-300'
                            }`}
                          >
                            <div className="truncate">
                              <span className="text-[11px] font-black text-gray-800 block leading-tight">
                                {label}
                              </span>
                              <span className="text-[9px] text-gray-400 font-bold block mt-0.5 truncate">
                                {occupant ? `Occupied: #${occupant.number} ${occupant.nick || occupant.name}` : 'Empty Slot'}
                              </span>
                            </div>

                            <div>
                              {occupant ? (
                                <span className="text-[8px] font-black bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded-full uppercase shrink-0">
                                  Swap
                                </span>
                              ) : (
                                <span className="text-[8px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded-full uppercase shrink-0">
                                  Place
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-2">
              <button
                type="button"
                onClick={() => setSwipePickerPlayer(null)}
                className="flex-1 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Drawer Overlay for Assigning a Bench Player to an Empty Position */}
      {assigningSlot && (
        <div 
          className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setAssigningSlot(null)}
        >
          <div 
            className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <div>
                <h3 className="font-black text-sm text-[var(--navy)] leading-tight">
                  Assign to {POSITIONS.find(([sn]) => sn === assigningSlot)?.[1] || assigningSlot}
                </h3>
                <p className="text-[11px] text-gray-500 font-bold mt-0.5">
                  {POSITION_DESCRIPTIONS[assigningSlot] || 'Select an available bench player'}
                </p>
              </div>
              <button 
                onClick={() => setAssigningSlot(null)}
                className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-500 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List of bench players */}
            <div className="p-4 overflow-y-auto space-y-2 flex-1">
              {benchPlayers.length === 0 ? (
                <div className="text-center py-8">
                  <Ban className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-gray-400">No players available on the bench.</p>
                  <p className="text-[10px] text-gray-400 mt-1">Add players to the roster or bench active players to free them up.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {benchPlayers.map((p) => {
                    const primaryZone = p.primaryZone || p.positions?.[0] || 'MID';
                    const zoneColorClass = 
                      primaryZone === 'FWD' ? 'bg-red-500' :
                      primaryZone === 'MID' ? 'bg-blue-500' :
                      primaryZone === 'DEF' ? 'bg-emerald-500' :
                      'bg-purple-500';

                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          handleMovePlayer(p.id, assigningSlot);
                          setAssigningSlot(null);
                          playSatisfactionChime('rotation-due');
                          playSatisfactionVibration('test');
                        }}
                        className="p-3 rounded-xl border border-gray-150 hover:border-blue-400 hover:bg-blue-50/20 text-left flex items-center gap-3 transition cursor-pointer bg-white shadow-xs"
                      >
                        <div className={`w-8 h-8 rounded-lg ${zoneColorClass} text-white font-black flex items-center justify-center text-xs shrink-0`}>
                          #{p.number}
                        </div>
                        <div className="flex-1 min-w-0">
                          <b className="text-xs text-[var(--navy)] block truncate">{p.name}</b>
                          <span className="text-[9px] text-gray-400 font-bold block mt-0.5">
                            Primary Zone: {primaryZone} • Played: {fmt(p.active)}
                          </span>
                        </div>
                        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                          Place
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50">
              <button
                type="button"
                onClick={() => setAssigningSlot(null)}
                className="w-full py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
