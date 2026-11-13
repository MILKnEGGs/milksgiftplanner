<script lang="ts">
  import EventSheet from '../components/EventSheet.svelte';
  import TopBar from '../components/TopBar.svelte';
  import { eventTotals, money, sortedEvents, whenText } from '../lib/data';
  import { app } from '../lib/store.svelte';
  import type { GiftEvent } from '../lib/types';

  let making = $state(false);
  let showArchived = $state(false);

  const live = $derived(sortedEvents(app.d.events.filter((e) => !e.archived)));
  const archived = $derived(sortedEvents(app.d.events.filter((e) => e.archived)));
</script>

<TopBar title="Gift Planner" />

{#snippet card(e: GiftEvent)}
  {@const t = eventTotals(e)}
  <a class="ev card" href={'#/e/' + e.id}>
    <span class="ev-title">{e.title}</span>
    <span class="meta">
      {[e.date && '📅 ' + whenText(e.date), t.total ? `${t.done} of ${t.total} ${t.total === 1 ? 'person' : 'people'} covered` : 'No one added yet']
        .filter(Boolean)
        .join(' · ')}
    </span>
    {#if t.budget !== undefined}
      <span class="meta" class:over-text={t.spent > t.budget}>
        💰 {money(t.spent)} of {money(t.budget)} · {t.spent > t.budget ? `${money(t.spent - t.budget)} over` : `${money(t.budget - t.spent)} left`}
      </span>
    {:else if t.spent}
      <span class="meta">💰 {money(t.spent)} spent</span>
    {/if}
    {#if t.total}
      <span class="progress"><span style="width:{(t.done / t.total) * 100}%"></span></span>
    {/if}
  </a>
{/snippet}

<main class="page stack">
  {#if !app.d.events.length}
    <div class="empty">
      <span class="big-emoji">🎁</span>
      <h2>Never forget anyone</h2>
      <p class="muted">
        Make an event like Christmas or a birthday, add everyone you're buying for, and keep track of ideas, what's bought, wrapped and given,
        and what's left in the budget.
      </p>
      <button class="btn primary" onclick={() => (making = true)}>Make an event</button>
    </div>
  {:else}
    {#each live as e (e.id)}{@render card(e)}{/each}
    {#if archived.length}
      <button class="btn ghost small" onclick={() => (showArchived = !showArchived)}>
        {showArchived ? 'Hide' : 'Show'} {archived.length} put-away event{archived.length === 1 ? '' : 's'}
      </button>
      {#if showArchived}
        {#each archived as e (e.id)}<div class="faded">{@render card(e)}</div>{/each}
      {/if}
    {/if}
  {/if}
</main>

{#if app.d.events.length}
  <button class="fab" onclick={() => (making = true)}>+ New event</button>
{/if}

{#if making}<EventSheet onclose={() => (making = false)} />{/if}

<style>
  .ev {
    display: grid;
    gap: 6px;
    text-decoration: none;
    color: inherit;
  }
  .ev:active {
    transform: scale(0.99);
  }
  .ev-title {
    font-size: 1.2rem;
    font-weight: 800;
  }
  .progress {
    display: block;
  }
  .progress span {
    display: block;
    height: 100%;
    background: var(--accent);
    transition: width 0.3s;
  }
  .faded {
    opacity: 0.7;
  }
</style>
