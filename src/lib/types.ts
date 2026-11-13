// Everything the app saves. Money is stored in cents so totals add up exactly.

export type ThemeMode = 'auto' | 'light' | 'dark';

export interface Size {
  label: string;
  value: string;
}

/** Something someone mentioned wanting, saved for later. */
export interface Idea {
  id: string;
  name: string;
  link?: string;
  note: string;
  at: number;
}

/** Someone I buy for. The same person can be in many events. */
export interface Person {
  id: string;
  name: string;
  /** Optional family tag ("The Kims", "Dad's side") for grouping. */
  family: string;
  /** YYYY-MM-DD */
  birthday?: string;
  sizes: Size[];
  ideas: Idea[];
  createdAt: number;
}

/** idea: still deciding. bought → wrapped → given (or sent). */
export type GiftStatus = 'idea' | 'bought' | 'wrapped' | 'given';

export interface Gift {
  id: string;
  name: string;
  links: string[];
  /** What it costs (about), in cents. */
  price?: number;
  /** What I actually paid, once bought. Counts against the budget instead of the price. */
  paid?: number;
  /** Where to get it. Blank: worked out from the first link. */
  store: string;
  /** Rare extras ("splitting it with Dad"), shown small. */
  note: string;
  /** Where it's hidden once bought. */
  hid: string;
  status: GiftStatus;
  addedAt: number;
}

/** A person in an event: their budget and the gifts for them. */
export interface Recipient {
  personId: string;
  /** Cents. Optional. */
  budget?: number;
  gifts: Gift[];
}

export interface GiftEvent {
  id: string;
  /** e.g. "Christmas 2026" */
  title: string;
  /** Optional YYYY-MM-DD. */
  date?: string;
  /** Overall budget for the event, in cents. Optional; otherwise the people's budgets add up. */
  budget?: number;
  archived: boolean;
  createdAt: number;
  people: Recipient[];
}

export interface Settings {
  theme: ThemeMode;
  /** Blur gift names until tapped, for when kids are looking over your shoulder. */
  kidSafe: boolean;
  /** Event pages group people by family tag. */
  byFamily: boolean;
  /** The order families are shown in when grouped (others follow A–Z). */
  familyOrder: string[];
  /** The order stores are shown in on the shopping list (others follow A–Z). */
  storeOrder: string[];
}

export interface Data {
  version: 1;
  events: GiftEvent[];
  people: Person[];
  settings: Settings;
}
