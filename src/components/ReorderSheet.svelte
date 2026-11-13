<script lang="ts">
  // Drag families or stores into the order you want them shown. Saves as you go.
  import { move, newOrder } from '../lib/data';
  import { sortable } from '../lib/sortable';
  import { save } from '../lib/store.svelte';
  import Icon from './Icon.svelte';
  import Sheet from './Sheet.svelte';

  let {
    title,
    help,
    names,
    order = $bindable(),
    onclose,
  }: { title: string; help: string; names: string[]; order: string[]; onclose: () => void } = $props();

  // svelte-ignore state_referenced_locally
  let list = $state([...names]);

  function moved(from: number, to: number) {
    move(list, from, to);
    order = newOrder([...list], order);
    save();
  }

  function toTop(i: number) {
    moved(i, 0);
  }
</script>

<Sheet {onclose} label={title}>
  <div class="stack">
    <h2>{title}</h2>
    <p class="muted small" style="margin:0">{help} Drag <Icon name="grip" size={14} /> to move one, or tap ⤒ to put it at the top.</p>
    <div class="names" use:sortable={{ onmove: moved }}>
      {#each list as n, i (n)}
        <div class="name" data-sort>
          <span class="nm">{n}</span>
          {#if i > 0}
            <button class="btn small ghost" aria-label="Move {n} to the top" onclick={() => toTop(i)}>⤒</button>
          {/if}
          <span class="handle" data-handle aria-label="Drag to move {n}"><Icon name="grip" /></span>
        </div>
      {/each}
    </div>
    <button class="btn primary block" onclick={onclose}>Done</button>
  </div>
</Sheet>

<style>
  .names {
    display: grid;
    gap: 6px;
  }
  .name {
    display: flex;
    align-items: center;
    gap: 4px;
    min-height: 54px;
    padding-left: 14px;
    padding-right: 6px;
    border-radius: 14px;
    background: var(--surface-2);
  }
  .nm {
    flex: 1;
    min-width: 0;
    font-weight: 700;
  }
  .name .handle {
    margin: 0;
    height: 54px;
    touch-action: none;
    cursor: grab;
  }
</style>
