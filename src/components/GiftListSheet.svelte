<script lang="ts">
  // Paste a list someone shared from Milk's Gift List; its gifts become ideas for this person.
  import { money, newGift } from '../lib/data';
  import { readGiftList, type SharedList } from '../lib/giftlist';
  import { save, toast } from '../lib/store.svelte';
  import type { Person, Recipient } from '../lib/types';
  import Sheet from './Sheet.svelte';

  let { recipient, person, onclose }: { recipient: Recipient; person: Person; onclose: () => void } = $props();

  let text = $state('');
  let error = $state('');
  let list = $state<SharedList>();
  let picked = $state<number[]>([]);

  const have = $derived(new Set(recipient.gifts.map((g) => g.name.trim().toLowerCase())));

  async function read(t: string) {
    error = '';
    try {
      list = await readGiftList(t);
      // Tick what nobody else is getting and isn't here already.
      picked = list.gifts.flatMap((g, i) => ((g.many || !g.takenBy.length) && !have.has(g.name.trim().toLowerCase()) ? [i] : []));
    } catch (err) {
      error = (err as Error).message;
    }
  }

  async function fromClipboard() {
    try {
      text = await navigator.clipboard.readText();
      if (text.trim()) await read(text);
    } catch {
      error = 'Your phone didn’t allow reading the clipboard. Press and hold in the box below and tap Paste.';
    }
  }

  function add() {
    const gifts = list!.gifts.filter((_, i) => picked.includes(i));
    for (const g of gifts) recipient.gifts.push(newGift({ name: g.name, links: g.links, price: g.price, note: g.note }));
    let sizes = false;
    if (!person.sizes.some((z) => z.value.trim()) && list!.sizes.length) {
      person.sizes = list!.sizes;
      sizes = true;
    }
    save();
    onclose();
    toast(`Added ${gifts.length} idea${gifts.length === 1 ? '' : 's'}${sizes ? ' and their sizes' : ''} ✓`);
  }
</script>

<Sheet {onclose} label="Paste a Gift List" full>
  <div class="stack">
    <h2>🎁 Paste a Gift List</h2>
    {#if !list}
      <p class="muted small" style="margin:0">
        Got {person.name}'s wish list from <strong>Milk's Gift List</strong>? Copy the whole message it came in, then paste it here. Its gifts
        become ideas for {person.name}, with their links and prices.
      </p>
      {#if typeof navigator.clipboard?.readText === 'function'}
        <button class="btn primary block" onclick={fromClipboard}>📋 Paste what I copied</button>
      {/if}
      <textarea class="input" rows="4" bind:value={text} placeholder="…or paste the whole message here"></textarea>
      {#if error}<p class="err">{error}</p>{/if}
      <button class="btn block" disabled={!text.trim()} onclick={() => read(text)}>Use this</button>
    {:else}
      <p class="muted small" style="margin:0">
        <strong>{list.title}{list.forWho ? ` · ${list.forWho}` : ''}</strong>. Gifts someone else is getting are left unticked.
      </p>
      <div class="stack" style="gap:8px">
        {#each list.gifts as g, i (i)}
          <label class="toggle">
            <input type="checkbox" bind:group={picked} value={i} />
            <span>
              <strong>{g.star ? '⭐ ' : ''}{g.name}</strong>
              <span class="muted small">
                {[
                  g.price !== undefined && money(g.price),
                  !g.many && g.takenBy.length && `${g.takenBy.filter(Boolean).join(' & ') || 'Someone'} is getting it`,
                  have.has(g.name.trim().toLowerCase()) && 'already here',
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </span>
          </label>
        {/each}
      </div>
      <button class="btn primary block" disabled={!picked.length} onclick={add}>Add {picked.length} as ideas</button>
      <button class="btn ghost small" onclick={() => (list = undefined)}>Paste something else</button>
    {/if}
  </div>
</Sheet>
