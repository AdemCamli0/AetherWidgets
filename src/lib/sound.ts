/**
 * Lightweight Web Audio helpers for audible widget alerts.
 *
 * Native toast notifications can be unreliable in development (they are
 * attributed to Windows PowerShell and may be suppressed by Focus Assist or
 * per-app notification settings), so time-critical alerts (clock alarm,
 * Pomodoro completion, crypto price alerts) also play a synthesized sound
 * directly in the widget window.
 *
 * Sounds are driven by the global notification preferences (see
 * `notificationPrefs.ts`): which tone plays, how long it plays, and whether
 * it keeps repeating until the user interacts with the window.
 */

export type AlertSoundKind = "chime" | "alarm";

let audioCtx: AudioContext | null = null;

function getContext(): AudioContext | null {
  try {
    if (!audioCtx) {
      audioCtx = new AudioContext();
    }
    if (audioCtx.state === "suspended") {
      void audioCtx.resume();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

/**
 * Creates/resumes the AudioContext. Call from a user-gesture handler (e.g. a
 * button click) so the context is unlocked before a timed alert needs it.
 */
export function unlockAudio(): void {
  getContext();
}

function tone(
  ctx: AudioContext,
  frequency: number,
  startOffset: number,
  duration: number,
  volume: number,
  type: OscillatorType,
): void {
  const start = ctx.currentTime + startOffset;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

/** Short ascending three-note chime (~0.65s). */
function chimePattern(ctx: AudioContext): void {
  tone(ctx, 659.25, 0, 0.16, 0.18, "sine"); // E5
  tone(ctx, 830.61, 0.18, 0.16, 0.18, "sine"); // G#5
  tone(ctx, 987.77, 0.36, 0.28, 0.18, "sine"); // B5
}

/** Single urgent two-tone ring burst (~0.4s), repeated by the alert loop. */
function alarmPattern(ctx: AudioContext): void {
  tone(ctx, 1046.5, 0, 0.14, 0.22, "square"); // C6
  tone(ctx, 1318.51, 0.2, 0.14, 0.22, "square"); // E6
}

/** Spacing between repeated pattern bursts, per sound kind. */
const PATTERN_INTERVAL_MS: Record<AlertSoundKind, number> = {
  chime: 900,
  alarm: 500,
};

/** Safety cap so a "repeat until dismissed" alert cannot ring forever. */
const REPEAT_SAFETY_CAP_MS = 120_000;

interface ActiveAlert {
  intervalId: number;
  timeoutId: number | null;
  onInteract: (() => void) | null;
}

let activeAlert: ActiveAlert | null = null;

/** Stops any currently playing/repeating alert sound. */
export function stopAlertSound(): void {
  if (!activeAlert) return;
  window.clearInterval(activeAlert.intervalId);
  if (activeAlert.timeoutId !== null) {
    window.clearTimeout(activeAlert.timeoutId);
  }
  if (activeAlert.onInteract) {
    window.removeEventListener("pointerdown", activeAlert.onInteract, true);
    window.removeEventListener("keydown", activeAlert.onInteract, true);
  }
  activeAlert = null;
}

function playPattern(kind: AlertSoundKind): void {
  const ctx = getContext();
  if (!ctx) return;
  const pattern = kind === "chime" ? chimePattern : alarmPattern;
  try {
    pattern(ctx);
  } catch (error) {
    console.error("Failed to play alert sound:", error);
  }
}

/**
 * Plays the given alert sound, repeating it either until `durationSeconds`
 * elapses or — when `repeatUntilDismissed` is set — until the user interacts
 * with the window (pointer/keyboard), whichever applies.
 *
 * Any previously playing alert is stopped first so overlapping notifications
 * don't stack sounds.
 */
export function playAlert(
  kind: AlertSoundKind,
  durationSeconds: number,
  repeatUntilDismissed: boolean,
): void {
  if (!getContext()) return;
  stopAlertSound();

  playPattern(kind);

  const intervalId = window.setInterval(() => {
    playPattern(kind);
  }, PATTERN_INTERVAL_MS[kind]);

  let timeoutId: number | null = null;
  let onInteract: (() => void) | null = null;

  if (repeatUntilDismissed) {
    onInteract = () => {
      stopAlertSound();
    };
    window.addEventListener("pointerdown", onInteract, true);
    window.addEventListener("keydown", onInteract, true);
    // Safety net in case the user never interacts.
    timeoutId = window.setTimeout(() => {
      stopAlertSound();
    }, REPEAT_SAFETY_CAP_MS);
  } else {
    timeoutId = window.setTimeout(
      () => {
        stopAlertSound();
      },
      Math.max(1, durationSeconds) * 1000,
    );
  }

  activeAlert = { intervalId, timeoutId, onInteract };
}
