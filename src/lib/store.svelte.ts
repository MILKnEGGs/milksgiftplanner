// App state: the saved data, the hash route, saving, toasts and kid-safe reveal.

import { newData, normalize } from './data';
import { loadData, saveData } from './db';
import type { Data, GiftEvent, Person } from './types';

export const app = $state<{ d: Data; loaded: boolean }>({ d: newData(), loaded: false });

export async function load(): Promise<void> {
  const stored = await loadData();
  if (stored) app.d = normalize(stored);
  app.loaded = true;
}

let timer: ReturnType<typeof setTimeout> | undefined;

/** Saves soon; debounced so typing in a field doesn't write on every keystroke. */
export function save(): void {
  clearTimeout(timer);
  timer = setTimeout(() => saveData(app.d).catch((err) => alert('Could not save: ' + err)), 150);
}

/** Replaces everything (backup import, erase). */
export async function replaceData(d: Data): Promise<void> {
  clearTimeout(timer);
  app.d = d;
  await saveData(d);
}

// Write any pending change before the app is closed or sent to the background.
addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && timer) {
    clearTimeout(timer);
    timer = undefined;
    saveData(app.d).catch(() => {});
  }
});

export const eventById = (id: string | undefined): GiftEvent | undefined => app.d.events.find((e) => e.id === id);
export const personById = (id: string | undefined): Person | undefined => app.d.people.find((p) => p.id === id);

/** Kid-safe mode: gift names stay blurred until this is turned on. It turns off again on every new screen. */
export const secret = $state({ shown: false });
/** True when gift names should be blurred right now. */
export const hush = (): boolean => app.d.settings.kidSafe && !secret.shown;

// ---------------------------------------------------------------------------------------------
// Routing

export interface Route {
  page: 'events' | 'event' | 'recipient' | 'people' | 'person' | 'shop' | 'settings' | 'install';
  /** Event id for 'event' and 'recipient'; person id for 'person'. */
  arg?: string;
  /** Person id for 'recipient'. */
  arg2?: string;
}

const PAGES: Record<string, Route['page']> = { e: 'event', people: 'people', p: 'person', shop: 'shop', settings: 'settings', install: 'install' };

function parse(hash: string): Route {
  const [page, arg, arg2] = hash.replace(/^#\/?/, '').split('/');
  if (page === 'e' && arg2) return { page: 'recipient', arg, arg2 };
  return { page: PAGES[page] ?? 'events', arg };
}

export const router = $state({ route: parse(location.hash) });

addEventListener('hashchange', () => {
  router.route = parse(location.hash);
  secret.shown = false;
  scrollTo(0, 0);
});

export function go(path: string, replace = false): void {
  if (replace) {
    history.replaceState(null, '', '#/' + path);
    router.route = parse(location.hash);
    scrollTo(0, 0);
  } else location.hash = '#/' + path;
}

export function back(fallback = ''): void {
  if (history.length > 1) history.back();
  else go(fallback);
}

// ---------------------------------------------------------------------------------------------
// Toasts

export interface Toast {
  id: number;
  text: string;
  action?: { label: string; run: () => void };
}

export const toasts = $state<Toast[]>([]);
let toastId = 0;

export function toast(text: string, action?: Toast['action'], ms = 5000): void {
  const t = { id: ++toastId, text, action };
  toasts.push(t);
  setTimeout(() => dismissToast(t.id), ms);
}

export function dismissToast(id: number): void {
  const i = toasts.findIndex((t) => t.id === id);
  if (i >= 0) toasts.splice(i, 1);
}

export const isStandalone =
  matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
