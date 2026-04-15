# ThekSelect — Agent Context

## What This Repo Is

ThekSelect is a zero-dependency TypeScript select component library, published as an **npm workspaces monorepo**:

| Package          | Path                       | Description                                                           |
| ---------------- | -------------------------- | --------------------------------------------------------------------- |
| `thekselect`     | `packages/thekselect/`     | Core library — headless + DOM renderer, no dependencies               |
| `thekselect-vue` | `packages/thekselect-vue/` | Vue 3 wrapper — `<ThekSelect>` component + `useThekSelect` composable |

The core has a **headless layer** (`ThekSelect`) that works without any DOM, and an optional **DOM layer**
(`ThekSelectDom`) that wires the core to a rendered widget. CSS themes are distributed as importable CSS files.

Target environment: browser. Runtime dependencies: none (core), `vue` + `thekselect` (vue wrapper).

## Commands

Run from the **repo root** unless noted.

| Command                | Purpose                                                |
| ---------------------- | ------------------------------------------------------ |
| `npm test -- --run`    | Run the full test suite once (no watch) — all packages |
| `npm test`             | Run tests in watch mode                                |
| `npm run lint`         | Run oxlint — must pass with 0 warnings and 0 errors    |
| `npm run format`       | Auto-fix formatting with oxfmt                         |
| `npm run format:check` | Check formatting without modifying files               |
| `npm run build`        | Build both packages (`dist/` in each package dir)      |
| `npm run dev`          | Start Vite dev server with the showcase page           |

Validation order for non-trivial changes:

1. `npm run format:check`
2. `npm run lint`
3. `npm test -- --run`
4. `npm run build`

If `format:check` fails, run `npm run format` before re-running the gate. Do not ship changes with
format drift or lint warnings.

Run from **`packages/thekselect/`**:

| Command                 | Purpose                         |
| ----------------------- | ------------------------------- |
| `npm run release:check` | Full gate: build + dry-run pack |

Run from **`packages/thekselect-vue/`**:

| Command                 | Purpose                         |
| ----------------------- | ------------------------------- |
| `npm run release:check` | Full gate: build + dry-run pack |

## Release Notes

- This repo publishes via **GitHub Actions + npm trusted publishing**. Do not assume local `npm publish`
  is the primary release path.
- The release workflow is `.github/workflows/publish.yml`.
- Publish order matters:
  1. `packages/thekselect`
  2. `packages/thekselect-vue`
- `thekselect-vue` depends on the newly published core version being available first because its
  peer dependency floor tracks the current core release.
- Before tagging or creating a GitHub Release, run:
  1. `npm run format:check`
  2. `npm run lint`
  3. `npm test -- --run`
  4. `npm run build`
  5. `npm run release:check` in `packages/thekselect`
  6. `npm run release:check` in `packages/thekselect-vue`
- After all checks pass, push the branch, then create the release with:
  ```bash
  gh release create v<version> --title "<version>" --notes "<release notes body>"
  ```
  The release notes body should be the content of the matching `## <version>` section from `RELEASE_NOTES.md`.
  Creating the release triggers the publish workflow automatically — do not run `npm publish` locally.

## Validation Rules

- For non-trivial code changes, the minimum gate is:
  1. `npm run format:check`
  2. `npm run lint`
  3. `npm test -- --run`
  4. `npm run build`
- For release-related changes, also run:
  1. `npm run release:check` in `packages/thekselect`
  2. `npm run release:check` in `packages/thekselect-vue`
- If dependency or tooling versions change, rerun the full validation gate even if earlier checks
  already passed.
- If docs or workflow changes affect release behavior, commit and push those changes before creating
  the release tag.

## Versioning Rules

- Package versions are independent, but releases can still be coupled.
- If `thekselect-vue` starts depending on a newly added core capability, bump:
  1. `packages/thekselect/package.json`
  2. `packages/thekselect-vue/package.json`
  3. the Vue peer dependency floor for `thekselect`
- Update these together for a release:
  1. package versions
  2. `RELEASE_NOTES.md`
  3. relevant README/package docs
  4. lockfile changes caused by version or dependency updates
- Treat widened compatibility such as `string` to `string | number` as a minor release unless it
  breaks existing behavior or contracts.

## File Map

### packages/thekselect/src/core/

| File                 | Responsibility                                                                                                        |
| -------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `types.ts`           | All public TypeScript interfaces and types (`ThekSelectConfig`, `ThekSelectOption`, `ThekSelectState`, event maps)    |
| `state.ts`           | `StateManager<T>` — owns all mutable state; notifies subscribers on change; returns frozen snapshots                  |
| `event-emitter.ts`   | Typed event emitter for the public `on()` API                                                                         |
| `config-utils.ts`    | `buildConfig()` merges defaults + global defaults + instance config; `buildInitialState()` seeds first state          |
| `options-logic.ts`   | Pure functions: filter options, detect remote mode, merge remote results                                              |
| `selection-logic.ts` | Pure functions: apply selection, remove, reorder, create option from label                                            |
| `dom-renderer.ts`    | `DomRenderer` — orchestrator for DOM updates; delegates to `src/core/renderer/` modules                               |
| `thekselect.ts`      | `ThekSelect` (exported headless class) and `ThekSelectDom` (unexported DOM subclass); `ThekSelect.init()` entry point |

### packages/thekselect/src/core/renderer/ (Modular Renderer)

| File                     | Responsibility                                                     |
| ------------------------ | ------------------------------------------------------------------ |
| `constants.ts`           | SVG icons and `RendererCallbacks` interface                        |
| `dom-assembly.ts`        | Initial DOM skeleton creation and setup; Event listener attachment |
| `selection-renderer.ts`  | Rendering logic for tags, summary, and single-select content       |
| `options-renderer.ts`    | Dropdown list rendering, virtualization logic, and item creation   |
| `dropdown-positioner.ts` | Layout math, viewport constraints, and "flip up" logic             |

### packages/thekselect/src/utils/

| File               | Responsibility                                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `debounce.ts`      | Generic debounce with `.cancel()` — used for `loadOptions`                                                          |
| `dom.ts`           | `generateId()` — unique instance ID used for ARIA attribute wiring                                                  |
| `event-manager.ts` | `GlobalEventManager` singleton — shared `resize`/`scroll`/`click` listeners with lazy attach and ref-counted detach |
| `styles.ts`        | `injectStyles()` — injects base CSS into `<head>` once per document (DOM-presence check, not module flag)           |

### packages/thekselect-vue/src/

| File             | Responsibility                                                                                                                                                              |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ThekSelect.vue` | Vue 3 SFC — wraps `ThekSelect.init()`, maps props → config, forwards all events as Vue emits, watches reactive props (`modelValue`, `height`, `maxOptions`, `renderOption`) |
| `composable.ts`  | `useThekSelect(el, options)` — headless composable; returns `{ instance, value }` refs                                                                                      |
| `index.ts`       | Public entry: re-exports `ThekSelect` (default) and `useThekSelect`                                                                                                         |

Init-time props (`multiple`, `searchable`, `disabled`, `canCreate`, `loadOptions`, etc.) are read once at
mount. To reconfigure after mount, destroy and remount with a `:key` change.

## Architecture Rules

**State:** All state lives in `StateManager`. Read via `stateManager.getState()` (returns a frozen
copy). Write via `stateManager.setState(partial)`. Never mutate the object returned by `getState()`.

**Config:** `config` is `protected readonly` on `ThekSelect`. Its reference must not be replaced.
Only `setMaxOptions()`, `setHeight()`, and `setRenderOption()` may mutate specific config properties
post-init, and only because they also trigger a re-render or `forceNotify()`.

**Rendering:** `DomRenderer.render()` is called by the state subscriber on every state change.
It acts as a functional orchestrator, delegating specific rendering tasks (selection, options)
to stateless modules in `packages/thekselect/src/core/renderer/`. `positionDropdown()` must NOT be
called from inside `render()`; it is called from `open()`, `resize` handlers, and `scroll` handlers only.

The state subscriber passes its snapshot directly to `render(state)`. Do not call
`stateManager.getState()` inside `render()` — the snapshot is already provided and calling it
again forces an unnecessary deep-clone of the full state tree. Programmatic `render()` calls
that have no state to pass (e.g. from `setRenderOption`) may call `this.render()` with no
argument; it falls back to `getState()` in that case only.

**Scroll handlers:** Any listener on `optionsList.scroll` (or any other high-frequency DOM event)
must be throttled via `requestAnimationFrame`. Use the same `rafPending` guard pattern used for
`resize`/`scroll` positioning in `setupListeners()`. Never attach a synchronous scroll listener
that triggers a DOM rebuild.

**Modularity:** Prefer small, focused files over monolithic ones. If a file grows beyond 300 lines,
evaluate if its logic can be extracted into a stateless utility or a sub-renderer module.
Follow the "Functional Orchestrator" pattern: a central class manages DOM references and
lifecycle, while pure functions or focused utilities handle the heavy lifting.

**Global events:** All shared `window`/`document` listeners go through `GlobalEventManager`.
It attaches lazily on first subscriber and detaches when all subscriber sets are empty.
Every `ThekSelectDom` instance unsubscribes its three handlers (`resize`, `scroll`, `click`) in
`destroy()`.

**Vue wrapper:** The Vue wrapper is a thin adapter — it must not contain business logic. All
selection state, filtering, and event emission is handled by the core. The wrapper's only job is
lifecycle bridging (mount → init, unmount → destroy) and prop/event mapping.

## Safety Rules

- Use `textContent` for all user-supplied strings. Never use `innerHTML` for user content.
- Every string shown in the UI (`noResultsText`, `loadingText`, `searchPlaceholder`) must be a
  `ThekSelectConfig` field with a sensible English default. Do not hardcode UI strings in `DomRenderer`.
- Every bug fix must be accompanied by a regression test in `packages/thekselect/tests/regressions/`.
- The dropdown has a `mousedown.preventDefault` listener (added in `createDom()`). This is
  load-bearing: it prevents the combobox input from losing focus when the user clicks an option,
  which would fire a blur event and close the dropdown before the option's click handler fires.
  Do not remove it.
- Do not add permanent listeners to `window` or `document` outside `GlobalEventManager`.
- Do not use `as unknown as` to satisfy the type checker — if you need it, the abstraction is wrong.

## Destroy Contract

`ThekSelectDom.destroy()` must do all four of the following or none:

1. Remove wrapper and dropdown from the DOM (`DomRenderer.destroy()`)
2. Unsubscribe from `GlobalEventManager` (resize, scroll, click)
3. Cancel the pending debounced search (`debouncedSearch.cancel()`)
4. Restore the original element's `display` style and remove injected `<option>` elements

If you add a new resource in the constructor or `initialize()`, add its cleanup to `destroy()`.

The Vue wrapper's `onUnmounted` hook calls all event unsubscribers first, then `instance.destroy()`.
Follow the same order if adding new cleanup paths to the Vue wrapper.

## Test Layout

### packages/thekselect/tests/

| Directory        | What it covers                                                  |
| ---------------- | --------------------------------------------------------------- |
| `core/`          | Headless API, `StateManager` unit, config defaults, event types |
| `features/`      | Remote loading, `canCreate`, drag-and-drop reorder, UI features |
| `accessibility/` | ARIA attributes, keyboard navigation, label association         |
| `integration/`   | Full DOM init and interaction scenarios                         |
| `regressions/`   | One test per previously-found bug — never delete these          |

### packages/thekselect-vue/tests/

| File                 | What it covers                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------ |
| `composable.test.ts` | `useThekSelect` mount/unmount lifecycle, value sync, instance ref                          |
| `ThekSelect.test.ts` | Component prop mapping, `v-model` two-way binding, event forwarding, reactive prop updates |
