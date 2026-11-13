<script lang="ts">
  // One person in one event: their budget and the gifts for them, from idea to given.
  import GiftListSheet from '../components/GiftListSheet.svelte';
  import GiftSheet from '../components/GiftSheet.svelte';
  import Icon from '../components/Icon.svelte';
  import IdeaJarSheet from '../components/IdeaJarSheet.svelte';
  import Sheet from '../components/Sheet.svelte';
  import TopBar from '../components/TopBar.svelte';
  import { money, parsePrice, priceInput, recipientTotals, sizesText, storeOf } from '../lib/data';
  import { app, eventById, go, hush, personById, save, secret, toast } from '../lib/store.svelte';
  import type { Gift, GiftStatus } from '../lib/types';

  let { eventId, personId }: { eventId: string; personId: string } = $props();

  const event = $derived(eventById(eventId));
  const person = $derived(personById(personId));
  const r = $derived(event?.people.find((x) => x.personId === personId));
  const s = $derived(r ? recipientTotals(r) : undefined);

  let open = $state<Gift | 'new'>();
  let sheet = $state<'menu' | 'jar' | 'giftlist'>();

  const ORDER: GiftStatus[] = ['idea', 'bought', 'wrapped', 'given'];
  const LABEL: Record<GiftStatus, string> = { idea: '💭 Idea', bought: '🛍️ Bought', wrapped: '🎀 Wrapped', given: '🎉 Given' };
  const NEXT: Record<GiftStatus, string> = { idea: 'Bought it', bought: 'Wrapped it', wrapped: 'Gave it', given: '' };
  // Furthest along last, so what's still to do is at the top.
  const gifts = $derived(r ? [...r.gifts].sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status) || a.addedAt - b.addedAt) : []);

  /** The chip moves a gift one step along, with Undo. */
  function advance(g: Gift) {
    const before = { status: g.status, paid: g.paid };
    const i = ORDER.indexOf(g.status);
    if (i >= ORDER.length - 1) return;
    g.status = ORDER[i + 1];
    if (before.status === 'idea' && g.paid === undefined) g.paid = g.price;
    save();
    toast(`${LABEL[g.status]}: ${hush() ? 'a gift' : g.name}`, { label: 'Undo', run: () => (Object.assign(g, before), save()) });
  }

  function setBudget() {
    sheet = undefined;
    const t = prompt(`Budget for ${person!.name} at ${event!.title}? Leave it blank for none.`, priceInput(r!.budget));
    if (t === null) return;
    r!.budget = t.trim() ? parsePrice(t) : undefined;
    save();
  }

  function removeFromEvent() {
    if (r!.gifts.length && !confirm(`Take ${person!.name} out of ${event!.title}? Their ${r!.gifts.length} gift${r!.gifts.length === 1 ? '' : 's'} here go too.`)) return;
    event!.people = event!.people.filter((x) => x.personId !== personId);
    save();
    go('e/' + eventId, true);
  }
</script>

{#if !event || !person || !r || !s}
  <TopBar title="Not found" showBack />
  <main class="page empty"><p class="muted">This person isn't in this event anymore.</p></main>
{:else}
  <TopBar title={person.name} sub={event.title} showBack>
    {#if app.d.settings.kidSafe}
      <button class="icon-btn" aria-label={secret.shown ? 'Hide gift names' : 'Show gift names'} onclick={() => (secret.shown = !secret.shown)}>
        <Icon name={secret.shown ? 'eyeoff' : 'eye'} />
      </button>
    {/if}
    <button class="icon-btn" aria-label="More" onclick={() => (sheet = 'menu')}><Icon name="more" /></button>
  </TopBar>

  <main class="page stack">
    <section class="card stack" style="gap:10px">
      {#if r.budget !== undefined}
        <button class="plainbtn money-bar" class:over={s.spent > r.budget} onclick={setBudget}>
          <div class="nums">
            <span>{money(s.spent)} of {money(r.budget)}</span>
            <span class:over-text={s.spent > r.budget}>{s.spent > r.budget ? `${money(s.spent - r.budget)} over` : `${money(r.budget - s.spent)} left`}</span>
          </div>
          <div class="bar"><span style="width:{Math.min(100, (s.spent / Math.max(r.budget, 1)) * 100)}%"></span></div>
        </button>
      {:else}
        <div class="row">
          <span class="muted">💰 {money(s.spent)} spent</span>
          <span class="spacer"></span>
          <button class="btn small" onclick={setBudget}>Set a budget</button>
        </div>
      {/if}
      {#if s.ideaCount && s.ideas}
        <span class="muted small">💭 {s.ideaCount} idea{s.ideaCount === 1 ? '' : 's'}, about {money(s.ideas)}</span>
      {/if}
      {#if sizesText(person.sizes)}
        <a class="muted small sizes" href={'#/p/' + person.id}>📏 {sizesText(person.sizes)}</a>
      {:else}
        <a class="muted small sizes" href={'#/p/' + person.id}>📏 Add {person.name}'s sizes</a>
      {/if}
    </section>

    {#if person.ideas.length}
      <button class="banner tapbanner" onclick={() => (sheet = 'jar')}>
        💡 {person.ideas.length} idea{person.ideas.length === 1 ? '' : 's'} in {person.name}'s idea jar. Tap to add {person.ideas.length === 1 ? 'it' : 'them'} here.
      </button>
    {/if}

    {#if !gifts.length}
      <div class="empty">
        <span class="big-emoji">💭</span>
        <h2>No gift ideas yet</h2>
        <p class="muted">Add things you're thinking about for {person.name}. Mark them bought when you get one.</p>
        <div class="stack" style="max-width:320px;margin:0 auto">
          <button class="btn primary" onclick={() => (open = 'new')}>+ Add a gift</button>
          <button class="btn" onclick={() => (sheet = 'giftlist')}>🎁 Paste a Gift List</button>
        </div>
      </div>
    {:else}
      <ul class="rows">
        {#each gifts as g (g.id)}
          <li class="row-item" class:done={g.status === 'given'}>
            <button class="tap" onclick={() => (open = g)}>
              <span class="txt">
                <span class="nm" class:secret={hush()}>{g.name}</span>
                <span class="meta">
                  {[
                    g.status === 'idea' ? g.price !== undefined && money(g.price) : money(g.paid ?? g.price ?? 0),
                    storeOf(g),
                    g.status !== 'idea' && g.hid && `🤫 ${g.hid}`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
                {#if g.note}<span class="gnote">📝 {g.note}</span>{/if}
              </span>
            </button>
            <button
              class="status {g.status}"
              title={NEXT[g.status] ? `Tap: ${NEXT[g.status]}` : undefined}
              aria-label={`${LABEL[g.status]}${NEXT[g.status] ? `. Tap to mark: ${NEXT[g.status]}` : ''}`}
              onclick={() => advance(g)}>{LABEL[g.status]}</button
            >
          </li>
        {/each}
      </ul>
      <p class="muted small hint">Tap the tag on a gift to move it along: bought, wrapped, given.</p>
    {/if}
  </main>

  {#if gifts.length}
    <button class="fab" onclick={() => (open = 'new')}>+ Add gift</button>
  {/if}

  {#if open}
    <GiftSheet recipient={r} gift={open === 'new' ? undefined : open} who={person.name} onclose={() => (open = undefined)} />
  {/if}
  {#if sheet === 'menu'}
    <Sheet onclose={() => (sheet = undefined)} label="Options">
      <div class="menu">
        <button onclick={setBudget}><span class="ico">💰</span>{r.budget !== undefined ? 'Change budget' : 'Set a budget'}</button>
        <button onclick={() => (sheet = 'giftlist')}><span class="ico">🎁</span>Paste a Gift List</button>
        <button onclick={() => go('p/' + person.id)}><span class="ico">📏</span>{person.name}'s sizes & idea jar</button>
        <button class="danger" onclick={removeFromEvent}><span class="ico">➖</span>Take {person.name} out of this event</button>
      </div>
    </Sheet>
  {:else if sheet === 'jar'}
    <IdeaJarSheet recipient={r} {person} onclose={() => (sheet = undefined)} />
  {:else if sheet === 'giftlist'}
    <GiftListSheet recipient={r} {person} onclose={() => (sheet = undefined)} />
  {/if}
{/if}

<style>
  .plainbtn {
    border: 0;
    background: none;
    padding: 0;
    font: inherit;
    color: inherit;
    text-align: left;
    cursor: pointer;
    width: 100%;
  }
  .sizes {
    text-decoration: none;
  }
  .tapbanner {
    width: 100%;
    text-align: left;
    font: inherit;
    cursor: pointer;
    border: 0;
  }
  .hint {
    text-align: center;
  }
</style>
