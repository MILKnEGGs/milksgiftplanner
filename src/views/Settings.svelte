<script lang="ts">
  import TopBar from '../components/TopBar.svelte';
  import { backupJson, newData, parseBackup } from '../lib/data';
  import { fileStamp, shareFile } from '../lib/files';
  import { app, isStandalone, replaceData, save, toast } from '../lib/store.svelte';
  import type { ThemeMode } from '../lib/types';

  let { offlineReady }: { offlineReady: boolean } = $props();

  let fileInput: HTMLInputElement;

  function setTheme(t: ThemeMode) {
    app.d.settings.theme = t;
    save();
  }

  async function exportBackup() {
    const file = new File([backupJson($state.snapshot(app.d))], `giftplanner-backup-${fileStamp()}.json`, { type: 'application/json' });
    await shareFile(file, "Milk's Gift Planner backup");
  }

  async function importBackup(e: Event & { currentTarget: HTMLInputElement }) {
    const file = e.currentTarget.files?.[0];
    e.currentTarget.value = '';
    if (!file) return;
    try {
      const d = parseBackup(await file.text());
      const msg = `Replace everything on this device with this backup?\n\n${d.events.length} events, ${d.people.length} people.\n\nWhat's here now will be replaced.`;
      if (!confirm(msg)) return;
      await replaceData(d);
      toast('Backup restored ✓');
    } catch (err) {
      alert((err as Error).message);
    }
  }

  async function eraseAll() {
    const typed = prompt("Erase ALL events and people on this device? This can't be undone.\n\nType ERASE to confirm.");
    if (typed?.trim().toUpperCase() !== 'ERASE') return;
    const fresh = newData();
    fresh.settings = { ...$state.snapshot(app.d.settings) };
    await replaceData(fresh);
    toast('Everything erased. Fresh start! 🌱');
  }
</script>

<TopBar title="Settings" />

<main class="page stack" style="gap:16px">
  <section class="card stack">
    <h3>🙈 Kid-safe mode</h3>
    <label class="toggle">
      <input type="checkbox" bind:checked={app.d.settings.kidSafe} onchange={save} />
      <span>
        <strong>Blur gift names</strong>
        <span class="muted small">For when little eyes are looking over your shoulder. Tap the 👁 button at the top of a screen to show them.</span>
      </span>
    </label>
  </section>

  <section class="card stack">
    <h3>🎨 Look</h3>
    <div class="seg">
      <button class:on={app.d.settings.theme === 'auto'} onclick={() => setTheme('auto')}>Match device</button>
      <button class:on={app.d.settings.theme === 'light'} onclick={() => setTheme('light')}>☀️ Light</button>
      <button class:on={app.d.settings.theme === 'dark'} onclick={() => setTheme('dark')}>🌙 Dark</button>
    </div>
  </section>

  <section class="card stack">
    <h3>💾 Backup & move to another device</h3>
    <p class="muted small" style="margin:0">
      Everything is saved only on this device. Export a backup to keep a copy, move to a new phone, or hand your plan to someone else, then
      <em>Import</em> it there. Importing <strong>replaces</strong> what's on that device.
    </p>
    <div class="row">
      <button class="btn primary" onclick={exportBackup}>⬆️ Export backup</button>
      <button class="btn" onclick={() => fileInput.click()}>⬇️ Import backup</button>
      <input bind:this={fileInput} type="file" accept=".json,application/json" hidden onchange={importBackup} />
    </div>
  </section>

  <section class="card stack">
    <h3>📲 Install on your phone</h3>
    <p class="muted small" style="margin:0">
      {#if isStandalone}
        ✓ You're using the installed app{offlineReady ? ' and it works offline' : ''}.
      {:else}
        Add the app to your Home Screen so it opens like an app and works with no signal.
      {/if}
    </p>
    <a class="btn" href="#/install">How to install</a>
  </section>

  <section class="card stack">
    <h3>🎁 Milk's Gift List</h3>
    <p class="muted small" style="margin:0">
      The sister app for wish lists: make a list of what your kids want and share it with family so nobody doubles up. Got a list from
      someone? Paste it into a person here with <strong>Paste a Gift List</strong> to turn it into gift ideas.
    </p>
    <a class="btn" href="https://milkneggs.github.io/milksgiftlist/" target="_blank" rel="noopener">Open Milk's Gift List ↗</a>
  </section>

  <section class="card stack">
    <h3>Danger zone</h3>
    <button class="btn danger" onclick={eraseAll}>Erase everything on this device</button>
  </section>

  <p class="muted small" style="text-align:center">
    Milk's Gift Planner v{__APP_VERSION__} · made with 💚 · <a href="https://milkneggs.github.io/pitch/milksgiftplanner.html" target="_blank" rel="noopener">See what it does</a>
  </p>
</main>
