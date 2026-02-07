# Hostile Review: ThekSelect

## P0: Critical Security & Correctness Issues

1.  **XSS via `innerHTML` Injection**
    *   **Problem:** `renderSelectionContent` and `renderOptionsContent` blindly inject the return value of `renderSelection`/`renderOption` using `innerHTML` if it's a string.
    *   **Consequence:** If a malicious label (e.g., `<img src=x onerror=alert(1)>`) is passed or returned by these functions, arbitrary JS execution occurs.
    *   **Fix:**
        *   Change `ThekSelectConfig` render types to `(option: ThekSelectOption) => HTMLElement | string`.
        *   In implementation, if result is string, use `node.textContent = result`, NEVER `innerHTML`.
        *   If HTML is absolutely required, enforce passing an `HTMLElement` created via `document.createElement`.

2.  **Async Race Condition (Stale-While-Revalidate)**
    *   **Problem:** `handleSearch` triggers `loadOptions`. If an earlier request (A) resolves *after* a later request (B), the UI will show results for A while the input shows B.
    *   **Consequence:** User sees wrong options for their query.
    *   **Fix:** Introduce `AbortController`. Store the `requestId`. In `loadOptions`, check if `requestId` is still current or use `signal.aborted`.

## P1: Data Integrity & Type Safety

3.  **Data Loss on Remote Search**
    *   **Problem:** `state.selectedValues` only stores strings. `state.options` is replaced on every remote search.
    *   **Consequence:** If a user selects an item, then searches for something else, the selected item's metadata (original label, extra props) is lost. The component falls back to `{ value: val, label: val }`, causing UI regression (labels turn into IDs).
    *   **Fix:** Add `selectedOptions: ThekSelectOption[]` to `ThekSelectState`. Persist the full objects.

4.  **Unsafe Type Casts & `any`**
    *   **Problem:** `NOOP_LOAD_OPTIONS as any` and `ThekSelectOption` allowing `[key: string]: any` hides bugs.
    *   **Consequence:** Runtime errors if `loadOptions` returns malformed data or if accessed properties don't exist.
    *   **Fix:** Remove `as any`. Define strict interfaces.

## P2: Runtime Edge Cases & Performance

5.  **Memory Leak in Debounce & Destroy**
    *   **Problem:** `debounce` does not return a cancellation method. If `ThekSelect` is destroyed while a timer is pending, the callback still runs.
    *   **Consequence:** Console errors (trying to update state on destroyed instance) or memory leaks.
    *   **Fix:** Update `debounce` to return `{ (...args): void, cancel: () => void }`. Call `cancel()` in `destroy()`.

6.  **Drag-and-Drop Fragility**
    *   **Problem:** `setupTagDnd` relies on `dataset.index`. If the list renders while dragging (e.g. async update), indexes might shift or become invalid.
    *   **Consequence:** Reordering the wrong items or crashing.
    *   **Fix:** Use stable IDs (values) for drag data transfer, not array indices.

7.  **Performance: Excessive DOM Thrashing**
    *   **Problem:** `renderOptionsContent` clears `innerHTML = ''` and rebuilds the entire list on every keystroke/state change.
    *   **Consequence:** Poor performance on larger lists (even < 1000 items) on low-end devices. Input lag.
    *   **Fix:** Use a virtual list or at least DOM diffing/recycling? (User said "smaller sets", so we might stick to full render but optimize it to not use innerHTML). *Note: Given constraint "smaller sets", we will stick to full re-render but verify efficiency.*

## Edge-case Checklist

*   **Empty inputs:** Handled (defaults provided).
*   **Huge inputs:** Not handled (no virtualization).
*   **Invalid dates/locale:** N/A.
*   **NaN/Infinity:** Unknown behavior in rendering.
*   **Duplicate IDs:** `generateId()` uses `Math.random()`, small collision risk.
*   **Out-of-order calls:** **NOT HANDLED** (Race condition).
*   **Re-entrancy:** `toggleDropdown` calls `open` which emits event. If handler calls `toggle`, infinite loop?
*   **Async races:** **NOT HANDLED**.
*   **XSS:** **NOT HANDLED**.