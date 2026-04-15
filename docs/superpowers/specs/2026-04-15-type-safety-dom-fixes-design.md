# Design: Type Safety Redesign + DOM Fixes

**Date:** 2026-04-15
**Scope:** `packages/thekselect/src`

---

## Overview

Three concrete fixes identified from a code review:

1. **Type safety** — `T` is redefined from "data payload type" to "full option shape", making `valueField`/`displayField` genuinely type-safe via `keyof T & string`. Eliminates `as Record<string, unknown>` casts from the public-facing surface.
2. **`innerHTML = ''` → `replaceChildren()`** — 5 locations across two renderer files. No behaviour change; aligns with strict security policies and modern DOM APIs.
3. **Spacer reinsertion guard** — Two unconditional DOM moves on every virtual scroll tick are guarded to only fire when the spacer is not already in position.

---

## Section 1: Type Layer

### Changes to `packages/thekselect/src/core/types.ts`

**`ThekSelectOption`** loses its generic parameter. It becomes a plain default interface:

```ts
export interface ThekSelectOption {
  value: ThekSelectPrimitive;
  label: string;
  disabled?: boolean;
  selected?: boolean;
}
```

The `data?: T` field is removed. Domain data lives directly on the caller's option shape.

**`ThekSelectConfig<T>`** — `T` is now the full option shape:

```ts
export interface ThekSelectConfig<T extends object = ThekSelectOption> {
  options?: T[];
  valueField?: keyof T & string;    // runtime default: 'value'
  displayField?: keyof T & string;  // runtime default: 'label'
  renderOption?: (option: T) => string | HTMLElement;
  renderSelection?: (option: T) => string | HTMLElement;
  loadOptions?: (query: string, signal: AbortSignal) => Promise<T[]>;
  // ... all other config fields unchanged
}
```

**`ThekSelectState<T>`** follows the same constraint:

```ts
export interface ThekSelectState<T extends object = ThekSelectOption> { ... }
```

**`getOptionField`** becomes type-safe — no cast:

```ts
export function getOptionField<T extends object, K extends keyof T>(
  option: T,
  field: K
): T[K] {
  return option[field];
}
```

The one remaining internal cast is the `'disabled'` field access, where `T` is not guaranteed to carry that key. This stays as a narrow cast with an `@internal` comment.

### Migration impact

Users who typed `ThekSelect<MyPayload>` relying on `option.data: MyPayload` in render callbacks must change to `ThekSelect<MyOption>` where `MyOption` is their full option object. The `data` field is removed.

Users who relied on the default `ThekSelectOption` shape (`{ value, label }`) with no generic are unaffected.

---

## Section 2: Internal / Renderer Changes

### `getOptionField` call sites

All renderer functions generic over `ThekSelectOption<T>` update their type constraints to `T extends object`. All `as Record<string, unknown>` casts are removed.

### `innerHTML = ''` → `replaceChildren()`

Five locations replaced:

| File | Lines |
|---|---|
| `selection-renderer.ts` | 121, 134, 143, 171 |
| `options-renderer.ts` | 154 |

No behaviour change. `replaceChildren()` is equivalent to `innerHTML = ''` for clearing — it removes all child nodes.

### Spacer reinsertion guard

`options-renderer.ts` currently moves spacer nodes unconditionally on every virtual scroll render:

```ts
// Before — always fires
list.insertBefore(topSpacer, list.firstChild);
list.appendChild(bottomSpacer);
```

Guarded to only fire when the spacer is not already in position:

```ts
// After — skips DOM mutation when already correct
if (list.firstChild !== topSpacer) list.insertBefore(topSpacer, list.firstChild);
if (list.lastChild !== bottomSpacer) list.appendChild(bottomSpacer);
```

---

## Section 3: Tests

### Type-level tests

New file: `packages/thekselect/tests/types.test-d.ts` using Vitest's `expectTypeOf`:

- `valueField: 'id'` accepted when `T = { id: number; name: string }`
- `valueField: 'nonexistent'` is a TypeScript compile error
- `renderOption` callback parameter is `T`, not `ThekSelectOption<T>`
- Default (no generic) works without specifying `valueField`/`displayField`

### `replaceChildren()` regression

Verify that switching from `innerHTML = ''` doesn't change observable behaviour:
- Selection container is empty after deselecting all items
- Summary mode (`maxSelectedLabels`) toggles correctly
- Single-select cleared correctly on value reset

These are covered by existing tests; a passing test suite after the change is the validation.

### Spacer guard

A scroll test calls `renderOptionsContent` twice with the same scroll position and asserts:
- The `topSpacer` element reference is the same object on both calls
- Its `parentElement` is unchanged (not re-inserted)

---

## Out of Scope

- `aria-activedescendant` — already correctly implemented in `dom-renderer.ts:155-162`; no change needed
- `valueField`/`displayField` defaults — runtime defaults (`'value'` / `'label'`) remain in `config-utils.ts`; no change
- `EventEmitter` error suppression — separate concern, not part of this fix
