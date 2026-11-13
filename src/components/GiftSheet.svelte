<script lang="ts">
  // Add or edit a gift for someone: what, where, how much, and how far along it is.
  import { knownStores, newGift, parsePrice, priceInput } from '../lib/data';
  import { cleanLink, guessName, storeName } from '../lib/links';
  import { app, save, toast } from '../lib/store.svelte';
  import type { Gift, GiftStatus, Recipient } from '../lib/types';
  import Icon from './Icon.svelte';
  import Sheet from './Sheet.svelte';

  /** No gift: adding a new one. */
  let { recipient, gift, who, onclose }: { recipient: Recipient; gift?: Gift; who: string; onclose: () => void } = $props();

  // svelte-ignore state_referenced_locally
  const g0 = gift;
  let name = $state(g0?.name ?? '');
  let links = $state<string[]>(g0?.links.length ? [...g0.links] : ['']);
  let price = $state(priceInput(g0?.price));
  let paid = $state(priceInput(g0?.paid));
  let store = $state(g0?.store ?? '');
  let note = $state(g0?.note ?? '');
  let hid = $state(g0?.hid ?? '');
  let status = $state<GiftStatus>(g0?.status ?? 'idea');
  let showNote = $state(!!g0?.note);

  const STATUSES: { id: GiftStatus; emoji: string; label: string }[] = [
    { id: 'idea', emoji: '💭', label: 'Idea' },
    { id: 'bought', emoji: '🛍️', label: 'Bought' },
    { id: 'wrapped', emoji: '🎀', label: 'Wrapped' },
    { id: 'given', emoji: '🎉', label: 'Given' },
  ];

  const stores = $derived(knownStores(app.d));
  const linkStore = $derived(links.find((l) => l.trim()) ? storeName(links.find((l) => l.trim())!) : '');

  function linkChanged(i: number) {
    const l = links[i].trim();
    if (l && !name.trim()) name = guessName(l);
  }

  function setStatus(s: GiftStatus) {
    // Bought: what was paid starts as the price; change it if it was on sale.
    if (s !== 'idea' && status === 'idea' && !paid.trim()) paid = price;
    status = s;
  }

  function submit(e: SubmitEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    const fields = {
      name: n,
      links: links.map((l) => l.trim()).filter(Boolean).map(cleanLink),
      price: parsePrice(price),
      paid: status === 'idea' ? undefined : parsePrice(paid),
      store: store.trim(),
      note: note.trim(),
      hid: status === 'idea' ? '' : hid.trim(),
      status,
    };
    if (gift) Object.assign(gift, fields);
    else {
      recipient.gifts.push(newGift(fields));
      toast(`Added “${n}” for ${who}`);
    }
    save();
    onclose();
  }

  function remove() {
    if (!gift || !confirm(`Remove “${gift.name}”?`)) return;
    recipient.gifts = recipient.gifts.filter((x) => x.id !== gift.id);
    save();
    onclose();
    toast('Removed');
  }
</script>

<Sheet {onclose} label={gift ? gift.name : `Add a gift for ${who}`} full>
  <form class="stack" onsubmit={submit}>
    <h2>{gift ? 'Edit gift' : `A gift for ${who}`}</h2>

    {#if gift?.links.length}
      <div class="stack" style="gap:8px">
        {#each gift.links as l (l)}
          <a class="btn block store" href={l} target="_blank" rel="noopener noreferrer">🛒 Open at {storeName(l)} ↗</a>
        {/each}
      </div>
    {/if}

    <div class="seg status-seg">
      {#each STATUSES as s (s.id)}
        <button type="button" class:on={status === s.id} onclick={() => setStatus(s.id)}><span class="em">{s.emoji}</span>{s.label}</button>
      {/each}
    </div>

    <label class="field">
      <span>What is it?</span>
      <!-- svelte-ignore a11y_autofocus -->
      <input class="input" bind:value={name} placeholder="Cozy slippers" autofocus={!gift} required />
    </label>

    <div class="row nowrap">
      <label class="field" style="flex:1">
        <span>Price <span class="muted">(about)</span></span>
        <input class="input" inputmode="decimal" bind:value={price} placeholder="$25" />
      </label>
      {#if status !== 'idea'}
        <label class="field" style="flex:1">
          <span>Paid</span>
          <input class="input" inputmode="decimal" bind:value={paid} placeholder={price ? '$' + price : '$20'} />
        </label>
      {/if}
    </div>

    <label class="field">
      <span>Store</span>
      <input class="input" bind:value={store} list="stores" placeholder={linkStore || 'Target, Costco, the craft fair…'} autocomplete="off" />
      <datalist id="stores">{#each stores as s (s)}<option value={s}></option>{/each}</datalist>
    </label>

    <div class="field">
      <span>Link <span class="muted">(optional)</span></span>
      {#each links as _, i (i)}
        <div class="row nowrap">
          <input class="input" type="url" inputmode="url" bind:value={links[i]} onchange={() => linkChanged(i)} placeholder="Paste a link" />
          {#if links.length > 1}
            <button type="button" class="btn small ghost" aria-label="Remove link" onclick={() => links.splice(i, 1)}><Icon name="x" size={18} /></button>
          {/if}
        </div>
      {/each}
      {#if links.at(-1)?.trim()}
        <button type="button" class="btn small ghost left" onclick={() => links.push('')}>+ Another link</button>
      {/if}
    </div>

    {#if status !== 'idea'}
      <label class="field">
        <span>🤫 Where I hid it <span class="muted">(optional)</span></span>
        <input class="input" bind:value={hid} placeholder="Top shelf of the hall closet" />
      </label>
    {/if}

    {#if showNote}
      <label class="field">
        <span>Note</span>
        <input class="input" bind:value={note} placeholder="Splitting it with Dad" />
      </label>
    {:else}
      <button type="button" class="btn small ghost left" onclick={() => (showNote = true)}>+ Add a note</button>
    {/if}

    <button class="btn primary block" disabled={!name.trim()}>{gift ? 'Save' : 'Add'}</button>
    {#if gift}
      <button type="button" class="btn ghost danger small" onclick={remove}>Remove this gift</button>
    {/if}
  </form>
</Sheet>

<style>
  .nowrap {
    flex-wrap: nowrap;
  }
  .left {
    justify-self: start;
  }
  .store {
    justify-content: flex-start;
  }
  .status-seg {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
  }
  .status-seg button {
    display: grid;
    justify-items: center;
    gap: 2px;
    padding: 8px 2px;
    font-size: 0.85rem;
  }
  .em {
    font-size: 1.2rem;
  }
</style>
