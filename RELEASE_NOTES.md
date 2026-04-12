# Release Notes

## 1.6.0 / thekselect-vue 1.2.0 (2026-04-12)

### Added

- **Default export** — `import ThekSelect from 'thekselect-vue'` now works alongside the existing named import `import { ThekSelect } from 'thekselect-vue'`.
- **Numeric value support** — `thekselect` and `thekselect-vue` now accept `string | number` option values, emitted values, and programmatic `setValue(...)` input. This removes the common consumer-side cast/wrapper layer for numeric ids.
- **Vue exposed methods** — template refs on `<ThekSelect />` now expose `open()`, `close()`, `toggle()`, `getValue()`, and `setValue(...)`, so consuming apps can use the component directly instead of forwarding imperative methods through a wrapper.
- **Vue loading prop** — `thekselect-vue` now supports a `loading` prop that disables interaction, marks the root `aria-busy`, and renders a lightweight loading overlay with a customizable `loading-indicator` slot.

### Changed

- **`modelValue` accepts `null`** — the prop type is now `string | number | Array<string | number> | null`. Passing `null` clears the selection, consistent with the common Vue pattern of initializing refs to `null`.
- **Vue peer dependency floor** — `thekselect-vue` now declares `thekselect >= 1.6.0` so consumers get the numeric-value-compatible core required by the wrapper types and runtime behavior.

## 1.5.0 / thekselect-vue 1.1.0 (2026-04-11)

### Added

- **`setOptions(options)`** — replace the option list on a live instance without reinitialising. Selected values still present in the new list are preserved; options no longer in the list are removed from selection. This is the foundation for reactive options in framework wrappers.

### Changed (`thekselect-vue`)

- **Reactive `options` prop** — `<ThekSelect :options="list" />` now responds to changes in `list`. Previously options were read once at mount and subsequent changes were silently ignored. Requires `thekselect ≥ 1.5.0`.
- **`v-model` clear** — setting `v-model` to `undefined` now clears the selection. Previously it was a no-op, making programmatic deselect impossible via v-model.

### Fixed

- **Event listener isolation** — a listener registered with `.on()` that throws no longer prevents subsequent listeners for the same event from being called. The error is reported to `console.error` instead of propagating.
- **`scrollToSelected` positioning** — replaced `el.offsetTop` with `getBoundingClientRect()` arithmetic. The previous approach gave incorrect scroll offsets whenever the element's `offsetParent` was not the scroll container itself (e.g. when an absolutely-positioned ancestor was present).
- **Spurious `as unknown as` cast removed** from `DomRenderer.setHeight()`. The double-cast was masking a TypeScript complaint about a mutation that is valid and intentional.

### Documentation

- **`ThekSelectOption<T>` JSDoc** — added explicit documentation clarifying that `T` constrains only the `data` field, and that the `[key: string]: unknown` index signature is required for dynamic `valueField`/`displayField` access. The generic does not add type safety to arbitrary extra fields; use `data` for strongly-typed domain data in render functions.

## 1.4.0 (2026-04-11)

### Added

- **Scroll to selected on open** — when the dropdown opens, the list automatically scrolls to bring the currently selected option into view. Previously the list always started at the top, requiring users to scroll to find a pre-selected value (e.g. "Germany" in a countries list). Works in both standard and virtualized mode.

### Fixed

- **CSS wildcard export conditions** — the `./css/*` subpath pattern in `package.json` exports was a bare string value rather than a conditions object. Vite's `builtin:vite-resolve` plugin rejected it under `["module", "browser", "development", "import"]` conditions, causing a resolve error when importing theme CSS files from a consuming project. Export is now `{ "default": "./dist/css/*" }`.
- **`height: undefined` crash** — passing `height: undefined` explicitly in config caused a `TypeError: can't access property "trim"` because the spread `...config` overwrote the default value `40` with `undefined`, which then reached `normalizeHeight()`. A null-guard in `buildConfig()` restores the default when `height` is nullish, consistent with the existing `loadOptions` guard.

## 1.3.0 (2026-04-11)

### Added

- **`thekselect-vue` 1.0.0** — Vue 3 wrapper package. Provides a `<ThekSelect>` component with full `v-model` support, typed props for all config options, and all core events forwarded as Vue emits. Also exports a `useThekSelect(el, options)` composable for headless/programmatic use. Published separately as `thekselect-vue` on npm.
- **Monorepo** — Repository restructured as an npm workspaces monorepo. Core library moved to `packages/thekselect/`; Vue wrapper lives at `packages/thekselect-vue/`. Both packages publish independently. Existing `thekselect` API and package shape are unchanged.
- **Page Themes** — The showcase now supports all available page themes (Gray, Red, Blue, Green) in addition to Light and Dark. Components in the "Base" theme now automatically inherit colors from the active page theme for better visual integration.

### Fixed

- **Theme Selector Specificity** — Fixed a bug where CSS variables defined directly on `.thek-select` in `BASE_STYLES` blocked external themes from applying via inheritance. Variables are now defined on `:root` to allow proper overriding.
- **Top-right Selector Robustness** — Refactored the showcase theme selection logic with proper type safety and null checks, fixing a regression where the selectors were non-functional.
- **Base Theme Dark Mode** — The "Base" theme now correctly responds to the manual page theme toggle (via `data-theme="dark"`) even when the system preference is set to light mode.
- **Tab/blur closes dropdown** — the dropdown now closes when keyboard focus moves outside the widget (Tab key or programmatic focus change). Previously, Tab-navigating away left the dropdown open. A `mousedown.preventDefault` on the dropdown prevents premature blur when clicking options.
- **Virtual scroll rAF throttle** — the virtual-list scroll handler is now throttled via `requestAnimationFrame`, collapsing multiple rapid scroll events into a single DOM update per frame. Previously each scroll event triggered a synchronous full rebuild of the visible slice.
- **Render clone cost** — `render()` now reuses the state snapshot already computed by the state subscriber instead of calling `getState()` twice per render cycle. Eliminates one redundant deep-clone of the full state tree on every state change.

## 1.2.2 (2026-04-09)

### Changed

- **Browser-only positioning** — package metadata and docs now describe ThekSelect as a browser select library with a reusable core, instead of implying non-browser runtime support or CommonJS consumption.
- **Release gating** — `npm run release:check` now enforces lint before tests, build, and dry-run pack so publish verification matches CI expectations.

### Fixed

- **Default searchable keyboard entry** — the visible control remains keyboard reachable in searchable mode, instead of removing the widget from the tab order until the hidden dropdown input exists.
- **Disabled interaction leaks** — disabled instances now block keyboard and action-method entry points consistently, and expose disabled semantics on the control/input.
- **State snapshot mutability** — `StateManager.getState()` now returns recursively frozen snapshots, including nested arrays.
- **Stale DOM reuse** — reused option and tag nodes now refresh rendered content, remove-button labels, and click handlers when render output or option labels change.

## 1.2.1 (2026-04-08)

### Changed

- **DomRenderer Modularity** — Refactored the monolithic `dom-renderer.ts` into a functional orchestrator. Extracted rendering and positioning logic into focused, stateless utility modules under `src/core/renderer/` (`dom-assembly`, `selection-renderer`, `options-renderer`, `dropdown-positioner`) to improve maintainability and reduce file size.

## 1.2.0 (2026-04-05)

### Added

- **Error event** — `ThekSelect` now emits an `'error'` event when `loadOptions` fails with a non-abort error or when a render function throws.
- **safeRender error boundary** — User-provided `renderOption` and `renderSelection` functions are now wrapped in an error boundary. If they throw, the library emits an `'error'` event and falls back to rendering the plain label text.
- **Orphan dropdown protection** — A `MutationObserver` now watches for the removal of the component's wrapper from the DOM. If the wrapper is removed without calling `.destroy()`, the orphaned dropdown is automatically destroyed.
- **Config field validation** — `buildConfig()` now performs runtime validation of `valueField` and `displayField`. It throws an error if they are empty strings and warns if they are missing from the first option.

### Changed

- **DnD event delegation** — Per-tag Drag-and-Drop listeners replaced with a single set of delegated listeners on the selection container, reducing memory overhead and potential leaks.
- **Deep freeze state** — `StateManager.getState()` now performs a deep freeze on nested plain objects (like `selectedOptionsByValue`), ensuring the returned state snapshot is truly immutable.
- **Performance throttling** — `positionDropdown()` calls are now throttled via `requestAnimationFrame` during scroll and resize events to prevent layout thrashing.

### Fixed

- **Destroy race window** — `ThekSelectDom.destroy()` now calls `super.destroy()` (aborting in-flight requests and debounced searches) _before_ cleaning up the DOM, closing a race window where a resolving fetch could attempt to mutate a destroyed state.
- **Native select sync label** — `syncOriginalElement` now correctly uses the display label (instead of the raw value string) when injecting dynamically created options into the native `<select>`.

## 1.1.0 (2026-04-04)

### Added

- **Headless core** — `ThekSelect` can now be instantiated without a DOM element (`new ThekSelect(config)`), enabling use in SSR, Node.js, and framework-agnostic state management. DOM rendering is provided by the `ThekSelectDom` subclass, created via the existing `ThekSelect.init()` factory.
- **Public subscribe API** — `core.subscribe(listener)` registers a callback that receives a frozen state snapshot on every change; returns an unsubscribe function.
- **i18n config fields** — `searchPlaceholder`, `noResultsText`, and `loadingText` are now `ThekSelectConfig` fields with English defaults. Previously these strings were hardcoded in `DomRenderer`.
- **AGENTS.md** — machine-readable agent context covering commands, file map, architecture rules, safety rules, and destroy contract.
- **CONTRIBUTING.md** — contributor guide covering branching, commit style, code rules, and the bug-fix regression-test requirement.
- **docs/ARCHITECTURE.md** — architecture reference covering the layer diagram, every module's responsibility, state flow, global event management, and build output.
- New test coverage (26 tests added):
  - `tests/accessibility/aria-state.test.ts` — `aria-activedescendant` behaviour (searchable and non-searchable), `aria-disabled` on disabled options, tag-remove `<button>` element/type/aria-label, all three i18n string overrides.
  - `tests/regressions/infrastructure.test.ts` — `GlobalEventManager` lazy-attach/ref-counted-detach lifecycle, `injectStyles` re-injection after DOM removal, double-`destroy()` safety, programmatic `open()` positioning and focus.

### Changed

- `ThekSelect.config` narrowed from `public readonly` to `protected readonly` — consumers should use the public action methods rather than reading config directly.
- `GlobalEventManager` now attaches `window`/`document` listeners lazily on the first subscriber and detaches them when all subscriber sets are empty (previously attached permanently in the constructor).

### Fixed

- **Permanent global listener leak** — `resize` and `scroll` listeners were added to `window`/`document` at import time and never removed. They are now ref-counted and removed when the last instance is destroyed.
- **SSR crash** — importing the library in a non-browser environment no longer throws because `GlobalEventManager` no longer touches `window` at module load.
- **`injectStyles` module-flag bug** — the module-level `injected` boolean meant styles were not re-injected if the `<style>` element was removed from the document between renders. Replaced with a DOM presence check (`getElementById`).
- **Layout thrash per keystroke** — `positionDropdown()` was being called inside `render()` on every state change. It is now called only in `open()`, resize handlers, and scroll handlers.
- **Programmatic `open()` missing position and focus** — calling `core.open()` directly did not position the dropdown or focus the search input. `ThekSelectDom` now overrides `open()` to do both.
- **Virtual scroll wheel scaling** — `WheelEvent` with `deltaMode=1` (DOM_DELTA_LINE) now correctly scales delta by `virtualItemHeight`; `deltaMode=2` (DOM_DELTA_PAGE) scales by the list's client height.
- **Tag-remove accessibility** — remove buttons were `<span>` elements with no keyboard role. Changed to `<button type="button">` with `aria-label="Remove {label}"`.
- **`aria-activedescendant` in non-searchable mode** — the attribute was only set on the search `<input>`, which is hidden in non-searchable mode. It is now set on the control `<div>` (the combobox element) in that mode.
- **Missing `aria-disabled` on options** — disabled options were not marked with `aria-disabled="true"`.
- **`destroy()` double-call throw** — calling `destroy()` twice on a `ThekSelectDom` instance threw because it tried to remove already-removed DOM nodes. `destroy()` is now idempotent.

## 1.0.0 (2026-03-28)

### Added

- New regression test suite for reviewer-identified failures:
  - global listener cleanup on `destroy`
  - remote loading state reset on empty query
  - empty-string native select value preservation
  - `setValue` normalization behavior
  - drag-and-drop reorder bounds safety
  - safe `createText` rendering
  - negative `maxOptions` handling
  - `on()` unsubscribe contract
- Browser script-tag usage docs:
  - added no-bundler UMD example in `README.md`
  - added matching snippet in `showcase/index.html` Quick Docs
- npm release workflow via GitHub Actions:
  - added `.github/workflows/publish.yml`
  - supports release-triggered and manual publishes
  - publishes with npm provenance using `NPM_TOKEN`
- Local publish safety checks:
  - added `npm run release:check`
  - added `prepublishOnly` to enforce test, build, and pack validation

### Changed

- `on(event, callback)` now returns an unsubscribe function.
- `getValue()` and `getSelectedOptions()` now explicitly support `undefined` in single-select mode when nothing is selected.
- `setValue()` now normalizes inputs:
  - single-select keeps the first value only
  - multi-select de-duplicates values

### Fixed

- Removed leaked global `resize` and `scroll` listeners during `destroy()`.
- Prevented stale remote loading spinner when input is cleared while a request is in flight.
- Fixed initialization bug where selected empty-string (`""`) values were dropped.
- Guarded reorder logic against invalid indices to avoid corrupting `selectedValues`.
- Hardened create-row rendering to avoid HTML injection via `createText`.
- Clamped negative `maxOptions` to `0` for deterministic filtering.
- Fixed TypeScript build regressions in generic selection/config paths so `npm run build` completes successfully before publish.
- Ensured packaged CSS theme exports are present in `dist/css` during release builds.

### Build

- Build config now enables explicit minification for JS and CSS:
  - `build.minify = 'esbuild'`
  - `build.cssMinify = 'esbuild'`
