<script lang="ts">
  // Add people to an event: tick people you already have, or type in someone new.
  import { families, groupBy, newPerson, parsePrice } from '../lib/data';
  import { app, save, toast } from '../lib/store.svelte';
  import type { GiftEvent } from '../lib/types';
  import Sheet from './Sheet.svelte';

  let { event, onclose }: { event: GiftEvent; onclose: () => void } = $props();

  const inEvent = $derived(new Set(event.people.map((r) => r.personId)));
  const others = $derived(app.d.people.filter((p) => !inEvent.has(p.id)).sort((a, b) => a.name.localeCompare(b.name)));
  const groups = $derived(groupBy(others, (p) => p.family, app.d.settings.familyOrder));
  const fams = $derived(families(app.d));

  let picked = $state<string[]>([]);
  let newName = $state('');
  let newFamily = $state('');
  let budget = $state('');

  function addNew(e: SubmitEvent) {
    e.preventDefault();
    const n = newName.trim();
    if (!n) return;
    const existing = app.d.people.find((p) => p.name.trim().toLowerCase() === n.toLowerCase());
    if (existing) {
      if (!inEvent.has(existing.id) && !picked.includes(existing.id)) picked.push(existing.id);
    } else {
      const p = newPerson(n, newFamily.trim());
      app.d.people.push(p);
      picked.push(p.id);
    }
    newName = '';
  }

  function add() {
    const b = budget.trim() ? parsePrice(budget) : undefined;
    for (const id of picked) if (!inEvent.has(id)) event.people.push({ personId: id, budget: b, gifts: [] });
    save();
    toast(`Added ${picked.length} ${picked.length === 1 ? 'person' : 'people'}`);
    onclose();
  }

  // Ticking a family's name ticks everyone in it.
  function toggleFamily(ids: string[]) {
    const all = ids.every((id) => picked.includes(id));
    picked = all ? picked.filter((id) => !ids.includes(id)) : [...new Set([...picked, ...ids])];
  }
</script>

<Sheet {onclose} label="Add people" full>
  <div class="stack">
    <h2>Who are you buying for?</h2>

    <form class="card-in stack" style="gap:8px" onsubmit={addNew}>
      <strong>Someone new</strong>
      <div class="row nowrap">
        <input class="input" bind:value={newName} placeholder="Name" aria-label="Name" />
        <input class="input" bind:value={newFamily} list="fams" placeholder="Family (optional)" aria-label="Family" autocomplete="off" />
        <datalist id="fams">{#each fams as f (f)}<option value={f}></option>{/each}</datalist>
      </div>
      <button class="btn" disabled={!newName.trim()}>+ Add</button>
    </form>

    {#each groups as [fam, people] (fam)}
      {#if fam}
        <button class="famhead" onclick={() => toggleFamily(people.map((p) => p.id))}>
          <span class="sec">{fam}</span><span class="muted small">tap to pick all</span>
        </button>
      {:else if groups.length > 1}
        <h3 class="sec">No family</h3>
      {/if}
      <div class="stack" style="gap:6px">
        {#each people as p (p.id)}
          <label class="toggle">
            <input type="checkbox" bind:group={picked} value={p.id} />
            <span><strong>{p.name}</strong></span>
          </label>
        {/each}
      </div>
    {/each}

    {#if picked.length}
      <label class="field">
        <span>Budget for each <span class="muted">(optional, change it per person later)</span></span>
        <input class="input" inputmode="decimal" bind:value={budget} placeholder="$50" />
      </label>
    {/if}
    <button class="btn primary block" disabled={!picked.length} onclick={add}>
      Add {picked.length || ''} {picked.length === 1 ? 'person' : 'people'}
    </button>
  </div>
</Sheet>

<style>
  .nowrap {
    flex-wrap: nowrap;
  }
  .famhead {
    display: flex;
    align-items: baseline;
    gap: 10px;
    border: 0;
    background: none;
    padding: 0;
    font: inherit;
    cursor: pointer;
  }
</style>
