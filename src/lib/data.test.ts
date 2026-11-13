import { describe, expect, it } from 'vitest';
import {
  covered,
  duplicateEvent,
  eventTotals,
  groupBy,
  newOrder,
  orderNames,
  money,
  newEvent,
  newGift,
  newPerson,
  normalize,
  parsePrice,
  recipientTotals,
  sizesText,
  sortedEvents,
  storeOf,
} from './data';
import { readGiftList } from './giftlist';

function sample() {
  const emma = newPerson('Emma', 'Us');
  const joe = newPerson('Uncle Joe', "Dad's side");
  const e = newEvent('Christmas 2026', '2026-12-25');
  e.people.push(
    {
      personId: emma.id,
      budget: 10000,
      gifts: [
        newGift({ name: 'Scooter', price: 4999, status: 'bought', paid: 3999 }),
        newGift({ name: 'Art set', price: 2500, status: 'wrapped' }),
        newGift({ name: 'Kite', price: 1500 }),
      ],
    },
    { personId: joe.id, budget: 3000, gifts: [newGift({ name: 'Coffee', price: 2000, links: ['https://www.target.com/p/-/A-1'] })] },
  );
  return { emma, joe, e };
}

describe('budgets', () => {
  it('counts what was paid for bought gifts, and ideas separately', () => {
    const { e } = sample();
    const t = recipientTotals(e.people[0]);
    expect(t).toMatchObject({ spent: 3999 + 2500, ideas: 1500, bought: 1, wrapped: 1, ideaCount: 1 });
    expect(covered(e.people[0])).toBe(true);
    expect(covered(e.people[1])).toBe(false);
    expect(eventTotals(e)).toMatchObject({ spent: 6499, ideas: 3500, budget: 13000, done: 1, total: 2 });
    e.budget = 20000;
    expect(eventTotals(e).budget).toBe(20000);
  });

  it('works out stores and groups', () => {
    const { e } = sample();
    expect(storeOf(e.people[1].gifts[0])).toBe('Target');
    expect(storeOf(newGift({ name: 'x', store: ' Costco ', links: ['https://www.target.com/p/-/A-1'] }))).toBe('Costco');
    expect(groupBy(['b', '', 'a', 'b'], (s) => s).map(([k, v]) => [k, v.length])).toEqual([
      ['a', 1],
      ['b', 2],
      ['', 1],
    ]);
  });
});

describe('ordering', () => {
  it('puts chosen families and stores first, the rest A–Z, blank last', () => {
    expect(orderNames(['Zoo', '', 'Us', 'Kims'], ['us'])).toEqual(['Us', 'Kims', 'Zoo', '']);
    expect(groupBy(['Target', 'Costco', '', 'Target'], (x) => x, ['Target']).map(([k, v]) => [k, v.length])).toEqual([
      ['Target', 2],
      ['Costco', 1],
      ['', 1],
    ]);
  });

  it('remembers names that are not on screen when reordering', () => {
    expect(newOrder(['B', 'A'], ['A', 'C', 'b'])).toEqual(['B', 'A', 'C']);
  });
});

describe('events', () => {
  it('duplicates exactly, with new ids', () => {
    const { e } = sample();
    const c = duplicateEvent(e);
    expect(c.title).toBe('Christmas 2026 (copy)');
    expect(c.id).not.toBe(e.id);
    expect(c.people.map((r) => r.gifts.map((g) => [g.name, g.status]))).toEqual(e.people.map((r) => r.gifts.map((g) => [g.name, g.status])));
    expect(c.people[0].gifts[0].id).not.toBe(e.people[0].gifts[0].id);
    c.people[0].gifts[0].name = 'Changed';
    expect(e.people[0].gifts[0].name).toBe('Scooter');
  });

  it('sorts soonest first and drops people that no longer exist on load', () => {
    const a = newEvent('Past', '2026-01-01');
    const b = newEvent('Xmas', '2026-12-25');
    const c = newEvent('Bday', '2026-11-20');
    expect(sortedEvents([a, b, c], '2026-11-13').map((x) => x.title)).toEqual(['Bday', 'Xmas', 'Past']);
    const { emma, e } = sample();
    const d = normalize({ events: [e], people: [emma] });
    expect(d.events[0].people).toHaveLength(1);
    expect(d.settings.kidSafe).toBe(false);
  });
});

describe('money', () => {
  it('parses and shows prices', () => {
    expect(parsePrice('$24.99')).toBe(2499);
    expect(parsePrice('1,200.5')).toBe(120050);
    expect(parsePrice('abc')).toBeUndefined();
    expect(money(2500)).toBe('$25');
    expect(money(-1050)).toBe('-$10.50');
    expect(sizesText([{ label: 'Shirt', value: 'S' }, { label: 'Hat', value: ' ' }])).toBe('Shirt S');
  });
});

describe('Gift List import', () => {
  async function code(wire: unknown) {
    const bytes = new TextEncoder().encode(JSON.stringify(wire));
    const out = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
    const z = new Uint8Array(await new Response(out).arrayBuffer());
    let s = '';
    for (const b of z) s += String.fromCharCode(b);
    return 'z' + btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  it("reads a shared list's gifts, picks and sizes", async () => {
    const c = await code({
      v: 1,
      t: 'l',
      i: 'L1',
      n: 'Christmas 2026',
      f: 'Emma',
      d: '',
      u: 1,
      o: 'Mom',
      oi: 'm',
      g: [
        ['a', 'Treehouse', ['https://www.amazon.com/dp/B0TEST1234'], 7999, '', 1, 1],
        ['b', 'Books', [], -1, 'Any', 2, 2],
      ],
      c: [
        ['a', 'Grandma', 'g', 1, 5],
        ['b', 'Joe', 'j', 0, 6],
      ],
      z: [['Shirt', '6']],
    });
    const l = await readGiftList(`🎁 Christmas 2026\n…\nhttps://milkneggs.github.io/milksgiftlist/#/s/${c}\n`);
    expect(l).toMatchObject({ title: 'Christmas 2026', forWho: 'Emma', sizes: [{ label: 'Shirt', value: '6' }] });
    expect(l.gifts[0]).toMatchObject({ name: 'Treehouse', price: 7999, star: true, takenBy: ['Grandma'] });
    expect(l.gifts[1]).toMatchObject({ name: 'Books', price: undefined, many: true, takenBy: [] });
    await expect(readGiftList('hello')).rejects.toThrow(/no Gift List link/);
    await expect(readGiftList(`picks\nMGF:${c}`)).rejects.toThrow(/picks/);
  });
});
