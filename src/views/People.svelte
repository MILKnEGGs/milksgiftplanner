<script lang="ts">
  // Everyone I buy for, grouped by family: sizes, birthdays and an idea jar for each.
  import ReorderSheet from '../components/ReorderSheet.svelte';
  import TopBar from '../components/TopBar.svelte';
  import { families, groupBy, newPerson, nextBirthday, sizesText, turning, whenText } from '../lib/data';
  import { app, go, save } from '../lib/store.svelte';

  const people = $derived([...app.d.people].sort((a, b) => a.name.localeCompare(b.name)));
  const groups = $derived(groupBy(people, (p) => p.family, app.d.settings.familyOrder));
  const fams = $derived(families(app.d));
  const tagged = $derived(fams.length > 0);
  let ordering = $state(false);

  function add() {
    const n = prompt('Who do you buy gifts for? (e.g. Emma)')?.trim();
    if (!n) return;
    const p = newPerson(n);
    app.d.people.push(p);
    save();
    go('p/' + p.id);
  }
</script>

<TopBar title="People">
  {#if fams.length > 1}
    <button class="icon-btn" aria-label="Reorder families" onclick={() => (ordering = true)}>↕</button>
  {/if}
</TopBar>

<main class="page stack">
  {#if !people.length}
    <div class="empty">
      <span class="big-emoji">🧑‍🤝‍🧑</span>
      <h2>Everyone you buy for</h2>
      <p class="muted">
        Add people once and use them in every event. Save their sizes, tag them with a family so you can group them, and drop gift ideas in
        their idea jar whenever you hear them want something.
      </p>
      <button class="btn primary" onclick={add}>+ Add a person</button>
    </div>
  {/if}

  {#each groups as [fam, list] (fam)}
    {#if tagged}<h3 class="sec">{fam || 'No family'}</h3>{/if}
    {#each list as p (p.id)}
      {@const bday = p.birthday ? nextBirthday(p.birthday) : undefined}
      <a class="card person" href={'#/p/' + p.id}>
        <span class="pname">{p.name}</span>
        {#if bday}<span class="meta">🎂 {whenText(bday)}{turning(p.birthday!, bday) > 0 ? ` · turns ${turning(p.birthday!, bday)}` : ''}</span>{/if}
        {#if sizesText(p.sizes)}<span class="meta">📏 {sizesText(p.sizes)}</span>{/if}
        {#if p.ideas.length}<span class="meta">💡 {p.ideas.length} idea{p.ideas.length === 1 ? '' : 's'} in the jar</span>{/if}
      </a>
    {/each}
  {/each}
</main>

{#if ordering}
  <ReorderSheet
    title="Reorder families"
    help="Put your own family first. Families show in this order here and on your events."
    names={fams}
    bind:order={app.d.settings.familyOrder}
    onclose={() => (ordering = false)}
  />
{/if}

{#if people.length}
  <button class="fab" onclick={add}>+ Add person</button>
{/if}

<style>
  .person {
    display: grid;
    gap: 4px;
    text-decoration: none;
    color: inherit;
  }
  .pname {
    font-size: 1.15rem;
    font-weight: 800;
  }
</style>
