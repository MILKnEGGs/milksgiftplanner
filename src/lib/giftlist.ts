// Reading a list shared from Milk's Gift List, so its gifts can become ideas here.
// Gift List shares a list as a link (…/milksgiftlist/#/s/<code>) inside a text message. The code is
// "z" + base64url(deflate-raw JSON) or "j" + base64url(JSON), in Gift List's compact wire format.

import type { Size } from './types';

export interface SharedGift {
  name: string;
  links: string[];
  price?: number;
  note: string;
  star: boolean;
  /** "More than one is OK": never counts as taken. */
  many: boolean;
  /** Who has said they're getting it ("" when the sender hid names). */
  takenBy: string[];
}

export interface SharedList {
  title: string;
  forWho: string;
  gifts: SharedGift[];
  sizes: Size[];
}

/** Pulls the code out of a whole copied message, a list link, or just the code. */
export function giftListCode(text: string): string | undefined {
  return text.match(/(?:MGF:|#\/s\/)([zj][A-Za-z0-9_-]{8,})/)?.[1];
}

function unb64url(s: string): Uint8Array {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function inflate(bytes: Uint8Array): Promise<Uint8Array> {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(out).arrayBuffer());
}

type WireItem = [id: string, name: string, links: string[], price: number, note: string, flags: number, addedAt: number, addedBy?: string, addedById?: string];

/** Reads a shared Gift List. Throws a friendly message when it isn't one. */
export async function readGiftList(text: string): Promise<SharedList> {
  const code = giftListCode(text);
  if (!code) throw new Error("There's no Gift List link in that. Copy the whole message the list came in, then try again.");
  if (text.includes('MGF:' + code)) throw new Error("That's someone's picks for a list, not a list. Paste the message with the list's link.");
  let w: { v?: number; t?: string; n?: string; f?: string; g?: WireItem[]; c?: [string, string, string, number, number][]; z?: [string, string][] };
  try {
    let bytes = unb64url(code.slice(1));
    if (code[0] === 'z') bytes = await inflate(bytes);
    w = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new Error("That link doesn't look complete. Copy the whole message again.");
  }
  if (w?.v !== 1 || w.t !== 'l' || !Array.isArray(w.g)) throw new Error("That isn't a Gift List list.");
  // Picks: [itemId, by, byId, status (0 gone, 1 getting, 2 bought), at]
  const taken = new Map<string, string[]>();
  for (const [itemId, by, , st] of w.c ?? []) if (st) taken.set(itemId, [...(taken.get(itemId) ?? []), by || '']);
  return {
    title: w.n ?? '',
    forWho: w.f ?? '',
    sizes: (w.z ?? []).map(([label, value]) => ({ label: label ?? '', value: value ?? '' })),
    gifts: w.g.map(([id, name, links, price, note, flags]) => ({
      name: name ?? '',
      links: links ?? [],
      price: price >= 0 ? price : undefined,
      note: note ?? '',
      star: !!(flags & 1),
      many: !!(flags & 2),
      takenBy: taken.get(id) ?? [],
    })),
  };
}
