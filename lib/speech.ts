import { useSyncExternalStore } from "react";

/** Playback speed. 1 = normal, lower = slower. Change here to adjust everywhere. */
export const SPEECH_RATE = 0.9;

/** Mainland Mandarin only, to match Hanyu Pinyin. Taiwan / HK voices are deliberately excluded. */
const MANDARIN_LANGS = ["zh-cn", "cmn-cn"];

/**
 * Voices that sound most natural, tried first (matched against the voice name). Otherwise the first
 * voice in the list wins, which on macOS can be a robotic one, so extend this if you prefer another.
 */
const PREFERRED_VOICES = /premium|enhanced|tingting|ting-ting|huihui|xiaoxiao/i;

/** If nothing has started or ended by then, the engine silently dropped the utterance. */
const SILENT_FAILURE_MS = 1500;

export type SpeechStatus = "unsupported" | "ready" | "no-voice";
export type SpeakResult = "started" | "stopped" | "unavailable";

interface State {
  status: SpeechStatus;
  playingKey: string | null;
}

let state: State = { status: "unsupported", playingKey: null };
let voice: SpeechSynthesisVoice | null = null;
let initialised = false;
let token = 0; // bumped on every play/stop so stale utterance events are ignored
let activeUtterance: SpeechSynthesisUtterance | null = null; // held so it isn't garbage-collected mid-speech
const listeners = new Set<() => void>();

const isSupported = () =>
  typeof window !== "undefined" &&
  "speechSynthesis" in window &&
  typeof SpeechSynthesisUtterance !== "undefined";

function setState(patch: Partial<State>) {
  const next = { ...state, ...patch };
  if (next.status === state.status && next.playingKey === state.playingKey) return;
  state = next;
  listeners.forEach((l) => l());
}

function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const mandarin = voices.filter((v) => MANDARIN_LANGS.includes(v.lang.replace("_", "-").toLowerCase()));
  return (
    mandarin.find((v) => PREFERRED_VOICES.test(v.name)) ??
    mandarin.find((v) => v.default) ??
    mandarin.find((v) => v.localService) ??
    mandarin[0] ??
    null
  );
}

/** Re-read the installed voices. Chrome loads them late, so an empty list is treated as "not loaded yet". */
function refreshVoice() {
  const voices = window.speechSynthesis.getVoices();
  voice = pickVoice(voices);
  setState({ status: voices.length === 0 || voice ? "ready" : "no-voice" });
}

function ensureInit() {
  if (initialised || !isSupported()) return;
  initialised = true;
  const voices = window.speechSynthesis.getVoices();
  voice = pickVoice(voices);
  // Assigned directly (not setState): this runs during render via getSnapshot, so it must not notify.
  state = { ...state, status: voices.length === 0 || voice ? "ready" : "no-voice" };
  window.speechSynthesis.addEventListener("voiceschanged", refreshVoice);
}

/** Stop playback. With a key, only stops if that key is the one playing. */
export function stop(key?: string) {
  if (key !== undefined && state.playingKey !== key) return;
  token++;
  activeUtterance = null;
  if (isSupported()) window.speechSynthesis.cancel();
  setState({ playingKey: null });
}

/**
 * Speak `text` as Mandarin. Only one thing plays at a time: starting another word replaces the
 * current one, and tapping the word that is already playing stops it.
 */
export function speak(key: string, text: string, onError?: (reason: string) => void): SpeakResult {
  const clean = text.trim();
  if (!isSupported() || !clean) return "unavailable";
  if (state.playingKey === key) {
    stop();
    return "stopped";
  }

  ensureInit();
  refreshVoice(); // pick up voices that loaded since last time
  if (!voice) return "unavailable";

  const synth = window.speechSynthesis;
  const mine = ++token;
  synth.cancel();

  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.voice = voice;
  utterance.lang = "zh-CN";
  utterance.rate = SPEECH_RATE;

  let settled = false;
  const finish = () => {
    if (settled) return;
    settled = true;
    if (activeUtterance === utterance) activeUtterance = null;
    if (mine === token) setState({ playingKey: null });
  };

  utterance.onend = finish;
  utterance.onerror = (e) => {
    // "interrupted"/"canceled" just mean another word replaced this one
    if (e.error !== "interrupted" && e.error !== "canceled" && mine === token) onError?.(e.error);
    finish();
  };

  activeUtterance = utterance;
  setState({ playingKey: key });
  synth.speak(utterance);

  setTimeout(() => {
    if (!settled && mine === token && !synth.speaking && !synth.pending) {
      finish();
      onError?.("no-audio");
    }
  }, SILENT_FAILURE_MS);

  return "started";
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Availability of Mandarin speech, and whether the word with this key is currently playing. */
export function useSpeech(key: string) {
  const status = useSyncExternalStore(
    subscribe,
    () => {
      ensureInit();
      return state.status;
    },
    () => "unsupported" as SpeechStatus,
  );
  const playing = useSyncExternalStore(
    subscribe,
    () => state.playingKey === key,
    () => false,
  );
  return { status, playing };
}
