<script lang="ts">
  import { newEvent, parsePrice, priceInput, todayStr } from '../lib/data';
  import { app, go, save } from '../lib/store.svelte';
  import type { GiftEvent } from '../lib/types';
  import Sheet from './Sheet.svelte';

  /** No event: make a new one. */
  let { event, onclose }: { event?: GiftEvent; onclose: () => void } = $props();

  // svelte-ignore state_referenced_locally
  const e0 = event;
  let title = $state(e0?.title ?? '');
  let date = $state(e0?.date ?? '');
  let budget = $state(priceInput(e0?.budget));

  const today = todayStr();
  const year = +today.slice(0, 4);
  /** The next time a yearly date comes around (this year, or next if it's passed). */
  const next = (mmdd: string) => (`${year}-${mmdd}` >= today ? `${year}-${mmdd}` : `${year + 1}-${mmdd}`);
  const IDEAS = [
    { label: '🎄 Christmas', title: () => `Christmas ${next('12-25').slice(0, 4)}`, date: () => next('12-25') },
    { label: '🕎 Hanukkah', title: () => `Hanukkah ${next('12-14').slice(0, 4)}`, date: () => '' },
    { label: '💝 Valentine’s', title: () => `Valentine’s ${next('02-14').slice(0, 4)}`, date: () => next('02-14') },
    { label: '🌷 Mother’s Day', title: () => `Mother’s Day ${year + (today.slice(5) > '05-14' ? 1 : 0)}`, date: () => '' },
    { label: '👔 Father’s Day', title: () => `Father’s Day ${year + (today.slice(5) > '06-21' ? 1 : 0)}`, date: () => '' },
    { label: '🍎 Teachers', title: () => 'Teacher gifts', date: () => '' },
  ];

  function pick(i: (typeof IDEAS)[number]) {
    title = i.title();
    const d = i.date();
    if (d && !date) date = d;
  }

  function submit(e: SubmitEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    const b = budget.trim() ? parsePrice(budget) : undefined;
    if (event) {
      Object.assign(event, { title: t, date: date || undefined, budget: b });
      save();
      onclose();
    } else {
      const ev = newEvent(t, date || undefined, b);
      app.d.events.push(ev);
      save();
      onclose();
      go('e/' + ev.id);
    }
  }
</script>

<Sheet {onclose} label={event ? 'Edit event' : 'New event'}>
  <form class="stack" onsubmit={submit}>
    <h2>{event ? 'Edit event' : 'New event'}</h2>
    {#if !event}
      <div class="chips">
        {#each IDEAS as i (i.label)}
          <button type="button" class="chip" onclick={() => pick(i)}>{i.label}</button>
        {/each}
      </div>
    {/if}
    <label class="field">
      <span>Name</span>
      <input class="input" bind:value={title} placeholder="Christmas 2026" required />
    </label>
    <label class="field">
      <span>Date <span class="muted">(optional)</span></span>
      <input class="input" type="date" bind:value={date} />
    </label>
    <label class="field">
      <span>Total budget <span class="muted">(optional)</span></span>
      <input class="input" inputmode="decimal" bind:value={budget} placeholder="$500" />
      <span class="muted small" style="font-weight:400">Leave it blank to just add up each person's budget.</span>
    </label>
    <button class="btn primary block" disabled={!title.trim()}>{event ? 'Save' : 'Make the event'}</button>
  </form>
</Sheet>
