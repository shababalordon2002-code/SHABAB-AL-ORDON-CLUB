/**
 * Recording Lock: while a live tagging session (Botonera) is configured and in progress,
 * the rest of the app blocks in-app navigation so the analyst can't accidentally leave the
 * screen and lose the running crono. Backed by localStorage + a same-tab custom event
 * (the native 'storage' event only fires on other tabs).
 */

const LOCK_KEY = 'sao_recording_lock_active';
const EVENT_NAME = 'sao-recording-lock-change';

export function isRecordingLocked(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(LOCK_KEY) === '1';
  } catch {
    return false;
  }
}

export function setRecordingLocked(active: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCK_KEY, active ? '1' : '0');
  } catch {
    // ignore storage failures (private mode, etc.)
  }
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: active }));
}

export function subscribeRecordingLock(callback: (active: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleCustom = (e: Event) => callback((e as CustomEvent<boolean>).detail);
  const handleStorage = (e: StorageEvent) => {
    if (e.key === LOCK_KEY) callback(e.newValue === '1');
  };

  window.addEventListener(EVENT_NAME, handleCustom);
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener(EVENT_NAME, handleCustom);
    window.removeEventListener('storage', handleStorage);
  };
}
