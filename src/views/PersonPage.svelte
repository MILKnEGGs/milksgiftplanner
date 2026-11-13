<script lang="ts">
  // One person: family tag, birthday, sizes, idea jar, and the events they're in.
  import Icon from '../components/Icon.svelte';
  import Sheet from '../components/Sheet.svelte';
  import TopBar from '../components/TopBar.svelte';
  import { families, newGift, nextBirthday, recipientTotals, sortedEvents, turning, uid, whenText } from '../lib/data';
  import { cleanLink, guessName, storeName } from '../lib/links';
  import { app, go, personById, save, toast } from '../lib/store.svelte';
  import type { Idea } from '../lib/types';

  let { id }: { id: string } = $props();

  const person = $derived(personById(id));
  const events = $derived(person ? sortedEvents(app.d.events.filter((e) => e.people.some((r) => r.personId === person.id))) : []);
  const open = $derived(events.filter((e) => !e.archived));
  const bday = $derived(person?.birthday ? nextBirthday(person.birthday) : undefined);
  const fams = $derived(families(app.d));
  const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

  const SIZE_CHIPS = ['Shirt', 'Pants', 'Shoes', 'Dress', 'Coat', 'Pajamas', 'Socks', 'Hat', 'Ring'];
  let moving = $state<Idea>();

  function rename() {
    const n = prompt('Name', person!.name)?.trim();
    if (!n || n === person!.name) return;
    person!.name = n;
    save();
  }

  function remove() {
    const n = events.length;
    if (!confirm(`Remove ${person!.name}? Their sizes and ideas go too${n ? `, and they're taken out of ${n} event${n === 1 ? '' : 's'} with their gifts` : ''}.`)) return;
    for (const e of app.d.events) e.people = e.people.filter((r) => r.personId !== id);
    app.d.people = app.d.people.filter((p) => p.id !== id);
    save();
    go('people');
  }

  function addSize(label = '') {
    person!.sizes.push({ label, value: '' });
    save();
    setTimeout(() => document.querySelectorAll<HTMLInputElement>('.size-value').item(person!.sizes.length - 1)?.focus());
  }

  // ---------- Idea jar ----------
  let ideaName = $state('');
  let ideaLink = $state('');
  let ideaNote = $state('');
  let more = $state(false);

  function addIdea(e: SubmitEvent) {
    e.preventDefault();
    let n = ideaName.trim();
    const link = ideaLink.trim() ? cleanLink(ideaLink.trim()) : undefined;
    if (!n && ideaLink.trim()) n = guessName(ideaLink.trim()) || storeName(ideaLink.trim()) + ' link';
    if (!n) return;
    person!.ideas.push({ id: uid(8), name: n, link, note: ideaNote.trim(), at: Date.now() });
    ideaName = '';
    ideaLink = '';
    ideaNote = '';
    save();
    toast(`💡 Saved for ${person!.name}`);
  }

  function moveTo(eventId: string) {
    const ev = app.d.events.find((x) => x.id === eventId)!;
    const r = ev.people.find((x) => x.personId === id)!;
    const i = moving!;
    r.gifts.push(newGift({ name: i.name, links: i.link ? [i.link] : [], note: i.note }));
    person!.ideas = person!.ideas.filter((x) => x.id !== i.id);
    save();
    moving = undefined;
    toast(`Added to ${ev.title} ✓`);
  }
</script>

{#if !person}
  <TopBar title="Not found" showBack />
  <main class="page empty"><p class="muted">This person isn't here anymore.</p></main>
{:else}
  <TopBar title={person.name} sub={bday ? `🎂 ${whenText(bday)}${turning(person.birthday!, bday) > 0 ? ` · turns ${turning(person.birthday!, bday)}` : ''}` : person.family || undefined} showBack>
    <button class="icon-btn" aria-label="Rename" onclick={rename}><Icon name="pencil" /></button>
  </TopBar>

  <main class="page stack">
    <section class="card stack">
      <label class="field">
        <span>🏡 Family <span class="muted">(optional)</span></span>
        <input class="input" bind:value={person.family} oninput={save} list="fams" placeholder="The Kims, Dad's side…" autocomplete="off" />
        <datalist id="fams">{#each fams.filter((f) => !same(f, person.family)) as f (f)}<option value={f}></option>{/each}</datalist>
      </label>
      <label class="field">
        <span>🎂 Birthday <span class="muted">(optional)</span></span>
        <input class="input" type="date" bind:value={person.birthday} onchange={save} />
      </label>
    </section>

    <section class="card stack">
      <h3>📏 Sizes</h3>
      <p class="muted small" style="margin:0">Shown whenever you're shopping for {person.name}.</p>
      {#each person.sizes as z, i (i)}
        <div class="row nowrap">
          <input class="input lbl" bind:value={z.label} oninput={save} placeholder="Shirt" aria-label="What" />
          <input class="input size-value" bind:value={z.value} oninput={save} placeholder="Youth M (10-12)" aria-label="Size" />
          <button class="btn small ghost" aria-label="Remove size" onclick={() => (person.sizes.splice(i, 1), save())}><Icon name="x" size={18} /></button>
        </div>
      {/each}
      <div class="chips">
        {#each SIZE_CHIPS.filter((c) => !person.sizes.some((z) => same(z.label, c))) as c (c)}
          <button class="chip" onclick={() => addSize(c)}>+ {c}</button>
        {/each}
        <button class="chip" onclick={() => addSize()}>+ Other</button>
      </div>
    </section>

    <section class="card stack">
      <h3>💡 Idea jar</h3>
      <p class="muted small" style="margin:0">Heard {person.name} say they want something? Drop it in here, then move it into an event when you're ready.</p>
      <form class="stack" style="gap:8px" onsubmit={addIdea}>
        <div class="row nowrap">
          <input class="input" bind:value={ideaName} placeholder="Dinosaur kite" aria-label="Idea" />
          <button class="btn primary" disabled={!ideaName.trim() && !ideaLink.trim()}>Save</button>
        </div>
        {#if more}
          <input class="input" type="url" inputmode="url" bind:value={ideaLink} placeholder="Link (optional)" aria-label="Link" />
          <input class="input" bind:value={ideaNote} placeholder="Notes (optional)" aria-label="Notes" />
        {:else}
          <button type="button" class="btn ghost small left" onclick={() => (more = true)}>+ Link or notes</button>
        {/if}
      </form>
      {#if person.ideas.length}
        <ul class="rows">
          {#each person.ideas as i (i.id)}
            <li class="row-item">
              <span class="tap static">
                <span class="txt">
                  <span class="nm">{i.name}</span>
                  {#if i.note || i.link}<span class="meta">{[i.note, i.link && storeName(i.link)].filter(Boolean).join(' · ')}</span>{/if}
                </span>
              </span>
              <button class="btn small" onclick={() => (moving = i)}>→ Event</button>
              <button class="btn small ghost" aria-label="Remove idea" onclick={() => ((person.ideas = person.ideas.filter((x) => x.id !== i.id)), save())}>
                <Icon name="x" size={18} />
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </section>

    <section class="card stack">
      <h3>🎁 Events</h3>
      {#each events as e (e.id)}
        {@const s = recipientTotals(e.people.find((r) => r.personId === person.id)!)}
        <a class="lrow" class:faded={e.archived} href={'#/e/' + e.id + '/' + person.id}>
          <strong>{e.title}</strong>
          <span class="muted small">{s.bought + s.wrapped + s.given ? `${s.bought + s.wrapped + s.given} bought` : s.ideaCount ? `${s.ideaCount} ideas` : 'nothing yet'}</span>
        </a>
      {:else}
        <p class="muted small" style="margin:0">Not in any events yet. Open an event and tap <strong>Add people</strong>.</p>
      {/each}
    </section>

    <button class="btn ghost danger small" onclick={remove}>Remove {person.name}</button>
  </main>

  {#if moving}
    <Sheet onclose={() => (moving = undefined)} label="Add to an event">
      <div class="stack">
        <h2>Add “{moving.name}” to…</h2>
        {#if open.length}
          <div class="menu">
            {#each open as e (e.id)}
              <button onclick={() => moveTo(e.id)}><span class="ico">🎁</span>{e.title}</button>
            {/each}
          </div>
        {:else}
          <p class="muted">{person.name} isn't in any events yet. Open an event and tap <strong>Add people</strong> first.</p>
        {/if}
      </div>
    </Sheet>
  {/if}
{/if}

<style>
  h3 {
    margin: 0;
  }
  .nowrap {
    flex-wrap: nowrap;
  }
  .lbl {
    flex: 0 0 38%;
    min-width: 0;
  }
  .left {
    justify-self: start;
  }
  .static {
    cursor: default;
  }
  .lrow {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
    text-decoration: none;
    color: inherit;
    padding: 6px 2px;
  }
  .faded {
    opacity: 0.6;
  }
  .row-item .btn {
    flex: none;
    align-self: center;
  }
</style>
