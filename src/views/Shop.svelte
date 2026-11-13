<script lang="ts">
  // Across every event that isn't put away: what to buy (by store), what to wrap, and what to give.
  import GiftSheet from '../components/GiftSheet.svelte';
  import Icon from '../components/Icon.svelte';
  import ReorderSheet from '../components/ReorderSheet.svelte';
  import TopBar from '../components/TopBar.svelte';
  import { allGifts, groupBy, money, storeOf, type Spot } from '../lib/data';
  import { app, hush, save, secret, toast } from '../lib/store.svelte';
  import type { GiftStatus } from '../lib/types';

  let tab = $state<'buy' | 'wrap' | 'give'>('buy');
  let open = $state<Spot>();

  const spots = $derived(allGifts(app.d));
  const WANT: Record<typeof tab, GiftStatus> = { buy: 'idea', wrap: 'bought', give: 'wrapped' };
  const NEXT: Record<typeof tab, GiftStatus> = { buy: 'bought', wrap: 'wrapped', give: 'given' };
  const counts = $derived({
    buy: spots.filter((s) => s.gift.status === 'idea').length,
    wrap: spots.filter((s) => s.gift.status === 'bought').length,
    give: spots.filter((s) => s.gift.status === 'wrapped').length,
  });
  const shown = $derived(spots.filter((s) => s.gift.status === WANT[tab]));
  // To buy: by store, like a shopping trip. To wrap or give: by person.
  const groups = $derived(
    tab === 'buy' ? groupBy(shown, (s) => storeOf(s.gift), app.d.settings.storeOrder) : groupBy(shown, (s) => s.person.name),
  );
  const stores = $derived(tab === 'buy' ? groups.map(([k]) => k).filter(Boolean) : []);
  let ordering = $state(false);
  const many = $derived(new Set(spots.map((s) => s.event.id)).size > 1);

  function done(s: Spot) {
    const g = s.gift;
    const before = { status: g.status, paid: g.paid };
    g.status = NEXT[tab];
    if (before.status === 'idea' && g.paid === undefined) g.paid = g.price;
    save();
    const word = { buy: '🛍️ Bought', wrap: '🎀 Wrapped', give: '🎉 Given' }[tab];
    toast(`${word}: ${hush() ? 'a gift' : g.name} for ${s.person.name}`, { label: 'Undo', run: () => (Object.assign(g, before), save()) });
  }

  const total = (list: Spot[]) => list.reduce((t, s) => t + (s.gift.price ?? 0), 0);
</script>

<TopBar title="Shopping" sub={tab === 'buy' && counts.buy ? `${counts.buy} ideas · about ${money(total(shown))}` : undefined}>
  {#if app.d.settings.kidSafe}
    <button class="icon-btn" aria-label={secret.shown ? 'Hide gift names' : 'Show gift names'} onclick={() => (secret.shown = !secret.shown)}>
      <Icon name={secret.shown ? 'eyeoff' : 'eye'} />
    </button>
  {/if}
</TopBar>

<main class="page stack">
  <div class="seg">
    <button class:on={tab === 'buy'} onclick={() => (tab = 'buy')}>To buy {counts.buy}</button>
    <button class:on={tab === 'wrap'} onclick={() => (tab = 'wrap')}>To wrap {counts.wrap}</button>
    <button class:on={tab === 'give'} onclick={() => (tab = 'give')}>To give {counts.give}</button>
  </div>

  {#if !shown.length}
    <div class="empty">
      <span class="big-emoji">{tab === 'buy' ? '🛒' : tab === 'wrap' ? '🎀' : '🎉'}</span>
      <p class="muted">
        {#if tab === 'buy'}
          Gift ideas you add for people show up here, grouped by store, so you can shop one store at a time.
        {:else if tab === 'wrap'}
          Nothing waiting to be wrapped. Gifts you've bought show up here, with where you hid them.
        {:else}
          Nothing wrapped and waiting. Wrapped gifts show up here until they're given.
        {/if}
      </p>
    </div>
  {:else}
    {#if tab === 'buy'}
      <div class="row nowrap">
        <p class="muted small" style="margin:0 4px;flex:1">These are your ideas. Tick one when you buy it. Not every idea needs buying!</p>
        {#if stores.length > 1}<button class="btn small" onclick={() => (ordering = true)}>↕ Stores</button>{/if}
      </div>
    {/if}
    {#each groups as [key, list] (key)}
      <section class="group">
        <div class="ghead">
          <span class="gname">{key || (tab === 'buy' ? 'No store yet' : 'Someone')}</span>
          <span class="gcount">{tab === 'buy' && total(list) ? 'about ' + money(total(list)) : list.length}</span>
        </div>
        <ul class="rows">
          {#each list as s (s.gift.id)}
            <li class="row-item">
              <button class="tap" onclick={() => done(s)} aria-label={`Mark ${s.gift.name} ${NEXT[tab]}`}>
                <span class="check"></span>
              </button>
              <button class="tap grow" onclick={() => (open = s)}>
                <span class="txt">
                  <span class="nm" class:secret={hush()}>{s.gift.name}</span>
                  <span class="meta">
                    {[
                      tab === 'buy' ? `for ${s.person.name}` : '',
                      many && s.event.title,
                      tab === 'buy' && s.gift.price !== undefined && money(s.gift.price),
                      tab !== 'buy' && s.gift.hid && `🤫 ${s.gift.hid}`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                  {#if s.gift.note}<span class="gnote">📝 {s.gift.note}</span>{/if}
                </span>
              </button>
            </li>
          {/each}
        </ul>
      </section>
    {/each}
  {/if}
</main>

{#if ordering}
  <ReorderSheet
    title="Reorder stores"
    help="Put them in the order you shop. Stores you add later go after these, A–Z."
    names={stores}
    bind:order={app.d.settings.storeOrder}
    onclose={() => (ordering = false)}
  />
{/if}

{#if open}
  <GiftSheet recipient={open.recipient} gift={open.gift} who={open.person.name} onclose={() => (open = undefined)} />
{/if}

<style>
  .row-item > .tap:first-child {
    flex: none;
    padding-right: 0;
  }
  .gname {
    font-weight: 800;
  }
  .nowrap {
    flex-wrap: nowrap;
    align-items: center;
  }
  .grow {
    flex: 1;
  }
</style>
