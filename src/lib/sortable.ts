// Touch-friendly drag to reorder, as a Svelte action on the container.
//
// Every direct child is a slot. Children marked [data-sort] can be dragged by an element inside them
// marked [data-handle]; other children (group headers) stay fixed but shift out of the way like the rest.
// onmove gets indexes counted among the [data-sort] children only.

import { tick } from 'svelte';

export interface SortableOptions {
  onmove: (from: number, to: number) => void;
}

const EDGE = 80;

export function sortable(node: HTMLElement, opts: SortableOptions) {
  let options = opts;

  function start(e: PointerEvent) {
    const handle = (e.target as HTMLElement).closest<HTMLElement>('[data-handle]');
    if (!handle || !node.contains(handle) || e.button !== 0) return;
    const el = handle.closest<HTMLElement>('[data-sort]');
    if (!el || el.parentElement !== node) return;
    e.preventDefault();
    handle.setPointerCapture(e.pointerId);

    const kids = Array.from(node.children) as HTMLElement[];
    const d = kids.indexOf(el);
    const mids = kids.map((k) => {
      const r = k.getBoundingClientRect();
      return r.top + scrollY + r.height / 2;
    });
    const rect = el.getBoundingClientRect();
    const gap = parseFloat(getComputedStyle(node).rowGap) || 0;
    const h = rect.height + gap;
    const startY = e.clientY + scrollY;
    const startMid = mids[d];
    let lastY = e.clientY;
    const shifted = new Array<number>(kids.length).fill(0);
    let raf = 0;

    el.classList.add('dragging');
    node.classList.add('sorting');
    for (const k of kids) if (k !== el) k.style.transition = 'transform 0.15s';
    navigator.vibrate?.(8);

    function layout() {
      const dy = lastY + scrollY - startY;
      el!.style.transform = `translateY(${dy}px)`;
      const c = startMid + dy;
      kids.forEach((k, i) => {
        if (i === d) return;
        const s = i < d && c < mids[i] ? h : i > d && c > mids[i] ? -h : 0;
        if (s !== shifted[i]) {
          shifted[i] = s;
          k.style.transform = s ? `translateY(${s}px)` : '';
        }
      });
    }

    function scrollLoop() {
      const bottomEdge = innerHeight - EDGE;
      const v = lastY < EDGE ? -(EDGE - lastY) / 4 : lastY > bottomEdge ? (lastY - bottomEdge) / 4 : 0;
      if (v) {
        scrollBy(0, v);
        layout();
      }
      raf = requestAnimationFrame(scrollLoop);
    }
    raf = requestAnimationFrame(scrollLoop);

    function moveH(ev: PointerEvent) {
      lastY = ev.clientY;
      layout();
    }

    async function end() {
      cancelAnimationFrame(raf);
      handle!.removeEventListener('pointermove', moveH);
      handle!.removeEventListener('pointerup', end);
      handle!.removeEventListener('pointercancel', end);

      const sortIdx = (i: number) => kids.slice(0, i).filter((k) => k.hasAttribute('data-sort')).length;
      const from = sortIdx(d);
      // Sortable children that end up above the dragged one.
      const above = kids.filter((k, i) => i !== d && k.hasAttribute('data-sort') && ((i < d && !shifted[i]) || (i > d && shifted[i]))).length;

      if (above !== from) {
        options.onmove(from, above);
        await tick();
      }
      for (const k of kids) {
        k.style.transition = 'none';
        k.style.transform = '';
      }
      el!.classList.remove('dragging');
      node.classList.remove('sorting');
      requestAnimationFrame(() => kids.forEach((k) => (k.style.transition = '')));
    }

    handle.addEventListener('pointermove', moveH);
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  }

  node.addEventListener('pointerdown', start);
  return {
    update(o: SortableOptions) {
      options = o;
    },
    destroy() {
      node.removeEventListener('pointerdown', start);
    },
  };
}
