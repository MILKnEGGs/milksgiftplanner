// Pure data helpers: events, people, gifts, budgets and dates.

import { storeName } from './links';
import type { Data, Gift, GiftEvent, GiftStatus, Person, Recipient, Size } from './types';

export const uid = (n = 10): string => {
  const a = 'abcdefghijkmnopqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(n));
  return Array.from(bytes, (b) => a[b % a.length]).join('');
};

export function newData(): Data {
  return { version: 1, events: [], people: [], settings: { theme: 'auto', kidSafe: false, byFamily: false, familyOrder: [], storeOrder: [] } };
}

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);
const cents = (v: unknown) => (typeof v === 'number' && v >= 0 ? v : undefined);
const STATUSES: GiftStatus[] = ['idea', 'bought', 'wrapped', 'given'];

/** Fills in anything missing from older saves or hand-edited backups. */
export function normalize(raw: unknown): Data {
  const d = raw as Partial<Data>;
  const base = newData();
  const people = (Array.isArray(d?.people) ? d.people : []).map(normalizePerson);
  const known = new Set(people.map((p) => p.id));
  return {
    version: 1,
    settings: {
      ...base.settings,
      ...(d?.settings ?? {}),
      familyOrder: strings(d?.settings?.familyOrder),
      storeOrder: strings(d?.settings?.storeOrder),
    },
    people,
    events: (Array.isArray(d?.events) ? d.events : []).map((e) => normalizeEvent(e, known)),
  };
}

function normalizePerson(p: Partial<Person>): Person {
  return {
    id: p.id || uid(),
    name: p.name ?? '',
    family: p.family ?? '',
    birthday: p.birthday || undefined,
    sizes: (p.sizes ?? []).filter((z) => z && (z.label || z.value)),
    ideas: (p.ideas ?? []).map((i) => ({ id: i.id || uid(8), name: i.name ?? '', link: i.link || undefined, note: i.note ?? '', at: i.at ?? Date.now() })),
    createdAt: p.createdAt ?? Date.now(),
  };
}

function normalizeEvent(e: Partial<GiftEvent>, known: Set<string>): GiftEvent {
  const now = Date.now();
  return {
    id: e.id || uid(),
    title: e.title ?? 'Event',
    date: e.date || undefined,
    budget: cents(e.budget),
    archived: !!e.archived,
    createdAt: e.createdAt ?? now,
    people: (e.people ?? [])
      .filter((r) => r && known.has(r.personId))
      .map((r) => ({
        personId: r.personId,
        budget: cents(r.budget),
        gifts: (r.gifts ?? []).map((g) => ({
          id: g.id || uid(8),
          name: g.name ?? '',
          links: Array.isArray(g.links) ? g.links.filter(Boolean) : [],
          price: cents(g.price),
          paid: cents(g.paid),
          store: g.store ?? '',
          note: g.note ?? '',
          hid: g.hid ?? '',
          status: STATUSES.includes(g.status as GiftStatus) ? (g.status as GiftStatus) : 'idea',
          addedAt: g.addedAt ?? now,
        })),
      })),
  };
}

export function newEvent(title: string, date?: string, budget?: number): GiftEvent {
  return { id: uid(), title, date, budget, archived: false, createdAt: Date.now(), people: [] };
}

export function newPerson(name: string, family = ''): Person {
  return { id: uid(), name, family, sizes: [], ideas: [], createdAt: Date.now() };
}

export function newGift(fields: Partial<Gift> & { name: string }): Gift {
  return { id: uid(8), links: [], store: '', note: '', hid: '', status: 'idea', addedAt: Date.now(), ...fields };
}

/** An exact copy with new ids: same people, budgets, gifts and statuses. */
export function duplicateEvent(e: GiftEvent, title = `${e.title} (copy)`): GiftEvent {
  const copy: GiftEvent = structuredClone(e);
  return {
    ...copy,
    id: uid(),
    title,
    archived: false,
    createdAt: Date.now(),
    people: copy.people.map((r) => ({ ...r, gifts: r.gifts.map((g) => ({ ...g, id: uid(8) })) })),
  };
}

// ---------------------------------------------------------------------------------------------
// People

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export const personById = (d: Data, id: string): Person | undefined => d.people.find((p) => p.id === id);

export const findPerson = (d: Data, name: string): Person | undefined => d.people.find((p) => same(p.name, name));

/** Family tags in use, in the chosen order. */
export const families = (d: Data): string[] => {
  const seen = new Map<string, string>();
  for (const p of d.people) {
    const f = p.family.trim();
    if (f && !seen.has(f.toLowerCase())) seen.set(f.toLowerCase(), f);
  }
  return orderNames([...seen.values()], d.settings.familyOrder);
};

export const sizesText = (sizes: Size[]): string =>
  sizes
    .filter((z) => z.value.trim())
    .map((z) => (z.label.trim() ? `${z.label.trim()} ${z.value.trim()}` : z.value.trim()))
    .join(' · ');

/**
 * Puts names in the order the user chose; names not in it follow A–Z, and blank comes last.
 * Matching ignores case, so "the kims" and "The Kims" share a place.
 */
export function orderNames(names: string[], order: string[] = []): string[] {
  const rank = new Map(order.map((n, i) => [n.trim().toLowerCase(), i]));
  const r = (n: string) => (!n ? Infinity : (rank.get(n.toLowerCase()) ?? order.length));
  return [...names].sort((a, b) => r(a) - r(b) || (!a ? 1 : !b ? -1 : a.localeCompare(b)));
}

/** Groups by a key (a family tag, a store) in the chosen order, then A–Z; blank keys come last under "". */
export function groupBy<T>(items: T[], key: (t: T) => string, order: string[] = []): [string, T[]][] {
  const m = new Map<string, T[]>();
  for (const t of items) {
    const f = key(t).trim();
    m.set(f, [...(m.get(f) ?? []), t]);
  }
  return orderNames([...m.keys()], order).map((k) => [k, m.get(k)!]);
}

/**
 * A new order after reordering the names on screen. Names saved before that aren't on screen right
 * now keep their place after them, so reordering one event's families doesn't forget the others.
 */
export const newOrder = (shown: string[], old: string[]): string[] => {
  const seen = new Set(shown.map((n) => n.toLowerCase()));
  return [...shown, ...old.filter((n) => !seen.has(n.toLowerCase()))];
};

/** Moves an array element from one index to another. */
export const move = <T>(arr: T[], from: number, to: number): void => {
  const [x] = arr.splice(from, 1);
  arr.splice(to, 0, x);
};

// ---------------------------------------------------------------------------------------------
// Gifts and budgets

export const isBought = (g: Gift): boolean => g.status !== 'idea';

/** What a bought gift counts against the budget. */
export const cost = (g: Gift): number => (isBought(g) ? (g.paid ?? g.price ?? 0) : 0);

export interface Totals {
  /** Spent on bought gifts. */
  spent: number;
  /** What the ideas still being considered add up to. */
  ideas: number;
  bought: number;
  wrapped: number;
  given: number;
  ideaCount: number;
}

export function recipientTotals(r: Recipient): Totals {
  const t: Totals = { spent: 0, ideas: 0, bought: 0, wrapped: 0, given: 0, ideaCount: 0 };
  for (const g of r.gifts) {
    if (g.status === 'idea') {
      t.ideaCount++;
      t.ideas += g.price ?? 0;
    } else {
      t.spent += cost(g);
      t[g.status]++;
    }
  }
  return t;
}

/** Someone is covered once at least one gift for them is bought. */
export const covered = (r: Recipient): boolean => r.gifts.some(isBought);

export function eventTotals(e: GiftEvent) {
  const spent = e.people.reduce((s, r) => s + recipientTotals(r).spent, 0);
  const ideas = e.people.reduce((s, r) => s + recipientTotals(r).ideas, 0);
  const each = e.people.filter((r) => r.budget !== undefined);
  // The event's own budget wins; otherwise the people's budgets add up (if any are set).
  const budget = e.budget ?? (each.length ? each.reduce((s, r) => s + r.budget!, 0) : undefined);
  const done = e.people.filter(covered).length;
  return { spent, ideas, budget, done, total: e.people.length };
}

/** Where to get a gift: the store typed in, or the store of its first link. */
export const storeOf = (g: Gift): string => g.store.trim() || (g.links[0] ? storeName(g.links[0]) : '');

/** Stores used before, for suggestions. */
export const knownStores = (d: Data): string[] =>
  [...new Set(d.events.flatMap((e) => e.people.flatMap((r) => r.gifts.map(storeOf))).filter(Boolean))].sort((a, b) => a.localeCompare(b));

export interface Spot {
  event: GiftEvent;
  recipient: Recipient;
  person: Person;
  gift: Gift;
}

/** Every gift in events that aren't put away, with where it belongs. */
export function allGifts(d: Data): Spot[] {
  const out: Spot[] = [];
  for (const event of sortedEvents(d.events.filter((e) => !e.archived)))
    for (const recipient of event.people) {
      const person = personById(d, recipient.personId);
      if (person) for (const gift of recipient.gifts) out.push({ event, recipient, person, gift });
    }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Ordering

/** Events by date (soonest upcoming first), then undated newest first; past dates sink. */
export function sortedEvents(events: GiftEvent[], today = todayStr()): GiftEvent[] {
  const rank = (e: GiftEvent) => (e.date ? (e.date >= today ? 0 : 2) : 1);
  return [...events].sort((a, b) => {
    const r = rank(a) - rank(b);
    if (r) return r;
    if (a.date && b.date) return rank(a) === 2 ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date);
    return b.createdAt - a.createdAt;
  });
}

// ---------------------------------------------------------------------------------------------
// Money and dates

/** "$24.99", "24", "25.5" → cents. Undefined for blank or nonsense. */
export function parsePrice(s: string): number | undefined {
  const m = s.replace(/[,\s$]/g, '').match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!m) return undefined;
  return Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0'));
}

export const money = (c: number): string =>
  (c < 0 ? '-' : '') + '$' + (Math.abs(c) % 100 ? (Math.abs(c) / 100).toFixed(2) : String(Math.abs(c) / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/** Cents back to what goes in a price box ("25", "24.99"). */
export const priceInput = (c?: number): string => (c === undefined ? '' : (c / 100).toFixed(c % 100 ? 2 : 0));

export function todayStr(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Whole days from today to a YYYY-MM-DD date (negative when past). */
export function daysUntil(date: string, today = todayStr()): number {
  const t = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
  return Math.round((t(date) - t(today)) / 86_400_000);
}

export function whenText(date: string, today = todayStr()): string {
  const n = daysUntil(date, today);
  const nice = new Date(date + 'T12:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  if (n === 0) return `${nice} · today! 🎉`;
  if (n === 1) return `${nice} · tomorrow`;
  if (n > 1) return `${nice} · in ${n} days`;
  return nice;
}

/** The next birthday on or after today, YYYY-MM-DD. */
export function nextBirthday(birthday: string, today = todayStr()): string {
  let y = +today.slice(0, 4);
  const at = (yy: number) => (birthday.slice(5) === '02-29' && new Date(yy, 1, 29).getMonth() !== 1 ? `${yy}-02-28` : `${yy}${birthday.slice(4)}`);
  if (at(y) < today) y++;
  return at(y);
}

/** How old they turn on a birthday date. */
export const turning = (birthday: string, on: string): number => +on.slice(0, 4) - +birthday.slice(0, 4);

// ---------------------------------------------------------------------------------------------
// Backup

export const backupJson = (d: Data): string => JSON.stringify({ app: 'milksgiftplanner', ...d }, null, 1);

export function parseBackup(text: string): Data {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("That file isn't a Gift Planner backup.");
  }
  if ((raw as { app?: string })?.app !== 'milksgiftplanner') throw new Error("That file isn't a Gift Planner backup.");
  return normalize(raw);
}
