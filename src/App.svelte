<script lang="ts">
  import { registerSW } from 'virtual:pwa-register';
  import Icon from './components/Icon.svelte';
  import { requestPersistence } from './lib/db';
  import { app, dismissToast, isStandalone, router, toast, toasts } from './lib/store.svelte';
  import { setThemeMode } from './lib/theme';
  import Install from './views/Install.svelte';
  import EventPage from './views/EventPage.svelte';
  import Events from './views/Events.svelte';
  import People from './views/People.svelte';
  import PersonPage from './views/PersonPage.svelte';
  import RecipientPage from './views/RecipientPage.svelte';
  import Settings from './views/Settings.svelte';
  import Shop from './views/Shop.svelte';

  let updateReady = $state(false);
  let offlineReady = $state(false);
  const updateSW = registerSW({
    onNeedRefresh: () => (updateReady = true),
    onOfflineReady() {
      offlineReady = true;
      if (isStandalone) toast('✓ Ready to use offline', undefined, 4000);
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      if (registration.active) offlineReady = true;
      // Check for a new version hourly while the app stays open. Failures (no signal) are harmless.
      setInterval(() => registration.update().catch(() => {}), 60 * 60 * 1000);
    },
  });
  requestPersistence();

  $effect(() => setThemeMode(app.d.settings.theme));

  const r = $derived(router.route);
  const TABS = [
    { page: 'events', href: '#/', ico: 'gift', label: 'Events' },
    { page: 'people', href: '#/people', ico: 'people', label: 'People' },
    { page: 'shop', href: '#/shop', ico: 'bag', label: 'Shopping' },
    { page: 'settings', href: '#/settings', ico: 'settings', label: 'Settings' },
  ] as const;
  const showTabs = $derived(TABS.some((t) => t.page === r.page));
</script>

{#if r.page === 'event'}
  {#key r.arg}<EventPage id={r.arg ?? ''} />{/key}
{:else if r.page === 'recipient'}
  {#key r.arg + '/' + r.arg2}<RecipientPage eventId={r.arg ?? ''} personId={r.arg2 ?? ''} />{/key}
{:else if r.page === 'people'}
  <People />
{:else if r.page === 'person'}
  {#key r.arg}<PersonPage id={r.arg ?? ''} />{/key}
{:else if r.page === 'shop'}
  <Shop />
{:else if r.page === 'settings'}
  <Settings {offlineReady} />
{:else if r.page === 'install'}
  <Install />
{:else}
  <Events />
{/if}

{#if updateReady}
  <div class="update" role="status">
    <span>✨ A new version is ready.</span>
    <button class="btn small primary" onclick={() => updateSW(true)}>Update</button>
    <button class="btn small ghost" onclick={() => (updateReady = false)}>Later</button>
  </div>
{/if}

{#if showTabs}
  <nav class="tabbar">
    {#each TABS as t (t.page)}
      <a href={t.href} class:active={r.page === t.page} aria-current={r.page === t.page ? 'page' : undefined}>
        <span class="ico"><Icon name={t.ico} size={25} /></span>{t.label}
      </a>
    {/each}
  </nav>
{/if}

<div class="toasts" aria-live="polite">
  {#each toasts as t (t.id)}
    <div class="toast">
      <span>{t.text}</span>
      {#if t.action}
        <button onclick={() => (t.action!.run(), dismissToast(t.id))}>{t.action.label}</button>
      {/if}
    </div>
  {/each}
</div>

<style>
  .update {
    position: fixed;
    left: 12px;
    right: 12px;
    top: calc(66px + env(safe-area-inset-top));
    z-index: 40;
    max-width: 616px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    padding: 10px 14px;
    border-radius: 16px;
    background: var(--surface);
    box-shadow: 0 8px 24px rgb(0 0 0 / 15%);
    font-weight: 800;
  }
  .update span {
    flex: 1;
  }
  .ico {
    position: relative;
    display: inline-grid;
  }
</style>
