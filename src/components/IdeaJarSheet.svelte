<script lang="ts">
  // Pull saved ideas from someone's idea jar into their gifts for an event.
  import { newGift } from '../lib/data';
  import { storeName } from '../lib/links';
  import { save, toast } from '../lib/store.svelte';
  import type { Person, Recipient } from '../lib/types';
  import Sheet from './Sheet.svelte';

  let { recipient, person, onclose }: { recipient: Recipient; person: Person; onclose: () => void } = $props();

  // svelte-ignore state_referenced_locally
  let picked = $state<string[]>(person.ideas.map((i) => i.id));

  function add() {
    const ideas = person.ideas.filter((i) => picked.includes(i.id));
    for (const i of ideas) recipient.gifts.push(newGift({ name: i.name, links: i.link ? [i.link] : [], note: i.note }));
    person.ideas = person.ideas.filter((i) => !picked.includes(i.id));
    save();
    onclose();
    toast(`Added ${ideas.length} idea${ideas.length === 1 ? '' : 's'} from ${person.name}'s jar ✓`);
  }
</script>

<Sheet {onclose} label="Idea jar">
  <div class="stack">
    <h2>💡 {person.name}'s idea jar</h2>
    <p class="muted small" style="margin:0">Things you saved for later. The ones you add move out of the jar and become gift ideas here.</p>
    <div class="stack" style="gap:8px">
      {#each person.ideas as i (i.id)}
        <label class="toggle">
          <input type="checkbox" bind:group={picked} value={i.id} />
          <span>
            <strong>{i.name}</strong>
            {#if i.note || i.link}<span class="muted small">{[i.note, i.link && storeName(i.link)].filter(Boolean).join(' · ')}</span>{/if}
          </span>
        </label>
      {/each}
    </div>
    <button class="btn primary block" disabled={!picked.length} onclick={add}>Add {picked.length} as ideas</button>
  </div>
</Sheet>
