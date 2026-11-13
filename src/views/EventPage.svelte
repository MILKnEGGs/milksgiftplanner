<script lang="ts">
  // One event: everyone you're buying for, how far along each is, and the budget.
  import AddPeopleSheet from '../components/AddPeopleSheet.svelte';
  import EventSheet from '../components/EventSheet.svelte';
  import Icon from '../components/Icon.svelte';
  import ReorderSheet from '../components/ReorderSheet.svelte';
  import Sheet from '../components/Sheet.svelte';
  import TopBar from '../components/TopBar.svelte';
  import { covered, duplicateEvent, eventTotals, groupBy, money, recipientTotals, whenText } from '../lib/data';
  import { app, eventById, go, personById, save, toast } from '../lib/store.svelte';
  import type { Recipient } from '../lib/types';

  let { id }: { id: string } = $props();

  const event = $derived(eventById(id));
  const t = $derived(event ? eventTotals(event) : undefined);
  let sheet = $state<'menu' | 'edit' | 'add' | 'order'>();
  let filter = $state<'all' | 'todo'>('all');

  const rows = $derived(
    (event?.people ?? [])
      .map((r) => ({ r, p: personById(r.personId)! }))
      .filter((x) => x.p && (filter === 'all' || !covered(x.r)))
      .sort((a, b) => a.p.name.localeCompare(b.p.name)),
  );
  const groups = $derived(
    app.d.settings.byFamily ? groupBy(rows, (x) => x.p.family, app.d.settings.familyOrder) : [['', rows] as [string, typeof rows]],
  );
  /** Families in this event, in order, for reordering. */
  const eventFamilies = $derived(
    groupBy(
      (event?.people ?? []).map((r) => personById(r.personId)?.family ?? ''),
      (f) => f,
      app.d.settings.familyOrder,
    )
      .map(([f]) => f)
      .filter(Boolean),
  );
  const hasFamilies = $derived(rows.some((x) => x.p.family.trim()));

  function line(r: Recipient): string {
    const s = recipientTotals(r);
    const parts: string[] = [];
    if (s.given) parts.push(`🎉 ${s.given} given`);
    if (s.wrapped) parts.push(`🎀 ${s.wrapped} wrapped`);
    if (s.bought) parts.push(`🛍️ ${s.bought} bought`);
    if (s.ideaCount) parts.push(`💭 ${s.ideaCount} idea${s.ideaCount === 1 ? '' : 's'}`);
    return parts.join(' · ') || 'No ideas yet';
  }

  function setByFamily(on: boolean) {
    app.d.settings.byFamily = on;
    save();
  }

  function duplicate() {
    const c = duplicateEvent($state.snapshot(event!));
    app.d.events.push(c);
    save();
    sheet = undefined;
    go('e/' + c.id);
    toast('Duplicated ✓ Rename it with ✏️ in the ⋯ menu.');
  }

  function archive() {
    event!.archived = !event!.archived;
    save();
    sheet = undefined;
    toast(event!.archived ? 'Put away. Find it at the bottom of your events.' : 'Event is back');
    if (event!.archived) go('');
  }

  function remove() {
    if (!confirm(`Delete “${event!.title}” and every gift in it? This can't be undone. (The people stay in your People tab.)`)) return;
    app.d.events = app.d.events.filter((e) => e.id !== id);
    save();
    go('');
    toast('Event deleted');
  }
</script>

{#if !event || !t}
  <TopBar title="Not found" showBack />
  <main class="page empty">
    <p class="muted">This event isn't here anymore.</p>
    <a class="btn" href="#/">Go to my events</a>
  </main>
{:else}
  <TopBar title={event.title} sub={event.date ? whenText(event.date) : undefined} showBack>
    <button class="icon-btn" aria-label="More" onclick={() => (sheet = 'menu')}><Icon name="more" /></button>
  </TopBar>

  <main class="page stack">
    {#if t.total}
      <section class="card stack" style="gap:10px">
        <div class="row">
          <strong>{t.done} of {t.total} {t.total === 1 ? 'person' : 'people'} covered</strong>
          <span class="spacer"></span>
          {#if t.done === t.total}<span>🎉</span>{/if}
        </div>
        {#if t.budget !== undefined}
          <div class="money-bar" class:over={t.spent > t.budget}>
            <div class="nums">
              <span>{money(t.spent)} of {money(t.budget)}</span>
              <span class:over-text={t.spent > t.budget}>{t.spent > t.budget ? `${money(t.spent - t.budget)} over` : `${money(t.budget - t.spent)} left`}</span>
            </div>
            <div class="bar"><span style="width:{Math.min(100, (t.spent / Math.max(t.budget, 1)) * 100)}%"></span></div>
          </div>
        {:else}
          <span class="muted small">💰 {money(t.spent)} spent so far</span>
        {/if}
        {#if t.ideas}
          <span class="muted small">💭 Ideas still open add up to about {money(t.ideas)}{t.budget !== undefined && t.spent + t.ideas > t.budget ? ` (that would be ${money(t.spent + t.ideas - t.budget)} over)` : ''}</span>
        {/if}
      </section>

      <div class="row">
        <div class="seg" style="flex:1">
          <button class:on={filter === 'all'} onclick={() => (filter = 'all')}>Everyone {t.total}</button>
          <button class:on={filter === 'todo'} onclick={() => (filter = 'todo')}>Still to buy for {t.total - t.done}</button>
        </div>
      </div>
      {#if hasFamilies || app.d.settings.byFamily}
        <div class="row nowrap">
          <label class="toggle slim" style="flex:1">
            <input type="checkbox" checked={app.d.settings.byFamily} onchange={(e) => setByFamily(e.currentTarget.checked)} />
            <span><strong>Group by family</strong></span>
          </label>
          {#if app.d.settings.byFamily && eventFamilies.length > 1}
            <button class="btn small" onclick={() => (sheet = 'order')}>↕ Reorder</button>
          {/if}
        </div>
      {/if}
    {/if}

    {#if !event.people.length}
      <div class="empty">
        <span class="big-emoji">🧑‍🤝‍🧑</span>
        <h2>Who are you buying for?</h2>
        <p class="muted">Add everyone you need a gift for, so nobody gets forgotten.</p>
        <button class="btn primary" onclick={() => (sheet = 'add')}>+ Add people</button>
      </div>
    {:else if !rows.length}
      <p class="muted hint">Everyone has a gift! 🎉</p>
    {:else}
      {#each groups as [fam, list] (fam)}
        {#if app.d.settings.byFamily}
          {@const famDone = list.filter((x) => covered(x.r)).length}
          <h3 class="sec">{fam || 'No family'} <span class="cnt">{famDone}/{list.length}</span></h3>
        {/if}
        <ul class="rows">
          {#each list as { r, p } (p.id)}
            {@const s = recipientTotals(r)}
            <li class="row-item" class:done={covered(r) && !s.ideaCount && s.given === r.gifts.length}>
              <a class="tap" href={'#/e/' + event.id + '/' + p.id}>
                <span class="check" class:on={covered(r)}>{#if covered(r)}<Icon name="check" size={16} stroke={3} />{/if}</span>
                <span class="txt">
                  <span class="nm">{p.name}{#if p.family && !app.d.settings.byFamily} <span class="fam">· {p.family}</span>{/if}</span>
                  <span class="meta">{line(r)}</span>
                  {#if r.budget !== undefined}
                    <span class="meta" class:over-text={s.spent > r.budget}>
                      💰 {money(s.spent)} of {money(r.budget)}{s.spent > r.budget ? ` · ${money(s.spent - r.budget)} over` : ''}
                    </span>
                  {:else if s.spent}
                    <span class="meta">💰 {money(s.spent)}</span>
                  {/if}
                </span>
              </a>
            </li>
          {/each}
        </ul>
      {/each}
    {/if}
  </main>

  {#if event.people.length}
    <button class="fab" onclick={() => (sheet = 'add')}>+ Add people</button>
  {/if}

  {#if sheet === 'menu'}
    <Sheet onclose={() => (sheet = undefined)} label="Event options">
      <div class="menu">
        <button onclick={() => (sheet = 'edit')}><span class="ico">✏️</span>Edit name, date & budget</button>
        <button onclick={() => (sheet = 'add')}><span class="ico">🧑‍🤝‍🧑</span>Add people</button>
        <button onclick={() => go('shop')}><span class="ico">🛒</span>Shopping list</button>
        <button onclick={duplicate}><span class="ico">📄</span>Duplicate</button>
        <button onclick={archive}><span class="ico">📦</span>{event.archived ? 'Bring the event back' : 'Put away (all done)'}</button>
        <button class="danger" onclick={remove}><span class="ico">🗑️</span>Delete event</button>
      </div>
    </Sheet>
  {:else if sheet === 'edit'}
    <EventSheet {event} onclose={() => (sheet = undefined)} />
  {:else if sheet === 'add'}
    <AddPeopleSheet {event} onclose={() => (sheet = undefined)} />
  {:else if sheet === 'order'}
    <ReorderSheet
      title="Reorder families"
      help="Families show in this order everywhere you group by family."
      names={eventFamilies}
      bind:order={app.d.settings.familyOrder}
      onclose={() => (sheet = undefined)}
    />
  {/if}
{/if}

<style>
  .check {
    border-color: var(--border);
  }
  .check.on {
    background: var(--accent);
    border-color: var(--accent);
  }
  .tap {
    text-decoration: none;
    color: inherit;
  }
  .nowrap {
    flex-wrap: nowrap;
  }
  .slim {
    padding: 8px 12px;
  }
  .cnt {
    font-weight: 700;
    margin-left: 6px;
  }
</style>
