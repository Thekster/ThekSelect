# Release Notes

## 2.1.0 / thekselect-vue 2.1.0 (2026-04-18)

### Performance

- **Removed Global MutationObserver** — The catastrophic document-wide observer that scanned every removed DOM node has been removed. Component lifecycle management now relies exclusively on the explicit `.destroy()` method. This eliminates significant layout thrashing and CPU spikes in complex SPA environments during route changes or list rendering.

### Accessibility

- **Correct ARIA Combobox Hierarchy** — Fixed fundamental WAI-ARIA violations where the primary control wrapper was roleless. The `.thek-control` element is now always assigned `role="combobox"` and manages `aria-expanded` and `aria-activedescendant` directly.
- **Searchable Mode ARIA 1.2+ Pattern** — In searchable mode, the inner `<input>` now correctly uses `role="textbox"` with `aria-autocomplete="list"` instead of competing for the `combobox` role, ensuring screen readers announce the component and its popup state correctly.

### Fixed

- **Native OS Scrolling Restored** — Removed custom wheel event hijacking and `preventDefault()` calls on the options list. The browser now handles standard scroll physics, restoring smooth scrolling, trackpad momentum, and OS-level friction settings.
- **Synchronous Event Errors** — Removed the `setTimeout` and `try/catch` wrapper in the event emitter. Errors in event listeners now throw synchronously, allowing them to be correctly intercepted by framework error boundaries (e.g., Vue's `onErrorCaptured`).

### Changed

- **Explicit Destruction Contract** — As the library no longer automatically detects DOM removal via a global observer, consumers MUST now call `.destroy()` when removing an instance from the DOM to ensure complete cleanup of global listeners and the injected dropdown. (Framework wrappers like `thekselect-vue` handle this automatically).

## 2.0.1 / thekselect-vue 2.0.1 (2026-04-17)

### Fixed

- **Silent native sync contract** — `setValue(value, true)` no longer dispatches a native `change` event on wrapped `<select>` elements. This fixes event ping-pong risks in reactive form bindings and brings the DOM sync path in line with the documented `silent` contract.
- **Wrapped native `<select>` rebuild on `setOptions()`** — calling `setOptions()` on an instance created from a native `<select>` now rebuilds the backing `<option>` list so form submission and DOM state stay aligned with the rendered widget.
- **Shared orphan observer** — detached-wrapper cleanup now uses a shared document observer instead of one document-wide `MutationObserver` per instance, preserving ancestor-subtree cleanup while removing the previous per-instance observer cost.
- **Abort-signal listener parity** — the renderer's `scroll` and `wheel` listeners now follow the same `AbortController` cleanup path as the rest of the component's direct DOM listeners.
- **Escaped `label[for]` lookup** — accessible-name discovery now escapes native element IDs before querying `label[for="..."]`, so IDs containing CSS-significant characters continue to resolve their labels correctly.

### Changed

- **Real packaged component CSS** — the distributed CSS entrypoints now include a shared `thekselect.css` stylesheet containing the component styles. `base.css` remains the system theme, and named theme files now bundle the base styles plus their token overrides.

### Documentation

- **Theme usage clarified** — README and Vue README now document that named themes activate via `data-thek-theme`, and that importing a CSS entrypoint is the recommended CSP-friendly path.
- **Vue typing limitation documented** — the Vue README now calls out that the wrapper cannot fully preserve the core package's generic option typing through SFC props and exposed refs.
- **API docs updated** — `setDisabled()` now appears in the main README API docs, and the `debounce: 0` next-tick behavior is explicitly documented.

### CI

- **Validation gate aligned with repo policy** — CI now runs `format:check`, the full monorepo build, and `release:check` for both packages so the workflow matches the documented release gate.

### thekselect-vue 2.0.1

- **Workspace type-check path** — the Vue package now resolves the local workspace core types through the built declaration entry during `vue-tsc`, keeping the monorepo release check green without changing the published runtime surface.

## 2.0.0 / thekselect-vue 2.0.0 (2026-04-15)

### Breaking

- **Generic `T` now represents the full option shape** — `T` in `ThekSelectConfig<T>`, `ThekSelectState<T>`, and all related types previously typed the `data` payload field on `ThekSelectOption`. It now represents the option object itself. `valueField` and `displayField` are now `keyof T & string`, giving compile-time safety against invalid field names.

  **Migration:** if you typed `ThekSelect<MyData>` to get `option.data: MyData` in render callbacks, change to `ThekSelect<MyOption>` where `MyOption` is your full option shape, and access fields directly on `option` instead of via `option.data`.

  Consumers that used the default untyped API (`ThekSelect` with no generic) are unaffected — the default `ThekSelectOption` shape (`{ value, label, disabled?, selected? }`) is unchanged.

- **`ThekSelectOption` is no longer generic** — `ThekSelectOption<T>` is removed. Use `ThekSelectOption` (plain) for the default shape, or your own custom type as the generic parameter on `ThekSelectConfig<T>`.

- **`data` field removed from `ThekSelectOption`** — the `data?: T` field no longer exists on the default option interface. Domain data should be included directly on the option object via a custom `T`.

### Added

- **`setDisabled(disabled: boolean)` API** — programmatically enable or disable a live instance without re-initialising. Updates `tabindex`, `aria-disabled`, the wrapper's `thek-disabled` CSS class, and closes the dropdown when disabling. The searchable input is also toggled when present.
- **Screen reader live region** — a `role="status"` / `aria-live="polite"` element is now injected alongside the wrapper. Selecting or deselecting an option announces `"X selected"` / `"X removed"` to assistive technologies so the current state is always communicated without relying on visual cues alone.
- **Focusable multi-select tags** — each tag now carries `tabindex="0"`, `role="group"`, and `aria-roledescription="tag"`. This lets keyboard users navigate into the tag list and reach remove buttons without a mouse.
- **Tag reorder via keyboard** — `Alt+ArrowLeft` / `Alt+ArrowRight` while a tag is focused moves it one position in the selection order and re-announces the new position via the live region.
- **Tag remove focus recovery** — after removing a tag via its button, focus automatically moves to the adjacent tag (or back to the combobox when the last tag is removed), preventing focus from jumping to `<body>`.
- **`aria-label` with reorder hint on tags** — each tag's accessible name includes its position within the selection and an `"Alt+Left/Right to reorder"` instruction so screen reader users discover the keyboard shortcut automatically.
- **Listbox label propagation** — `setListboxLabel()` now connects the listbox's `aria-labelledby` (or `aria-label`) to the same label as the combobox, satisfying the ARIA listbox naming requirement.
- **`aria-required` support** — a new `required` config option (default `false`) sets `aria-required="true"` on the combobox element.
- **`describedBy` config option** — links the combobox to an existing `aria-describedby` element so hint / validation text is surfaced to screen readers.
- **Tag overflow reveal on focus** — when keyboard focus enters the control's tag list the overflow mask is removed and the container scrolls horizontally, ensuring focused remove buttons are never clipped.

### Fixed

- **Virtual scroll spacer reinserts** — virtual list spacer nodes were unconditionally reinserted into the DOM on every scroll tick even when already in position. They are now guarded with a position check, eliminating unnecessary DOM mutations during scroll.
- **`innerHTML = ''` replaced with `replaceChildren()`** — five internal DOM clears in the selection and options renderers now use `replaceChildren()` instead of `innerHTML = ''`, aligning with strict security policies.
- **Double-render in `createOptionItem`** — the option label was populated twice on creation (once inline, once by `updateOptionContent`). The inline render has been removed; `updateOptionContent` is now the sole path.
- **Falsy-value selection removal** — `removeLastSelection` previously treated `0` and `''` as absent values because it used a loose `if (!removedValue)` guard. Changed to `=== undefined` so numeric `0` and empty-string values are handled correctly.
- **`role="option"` and `aria-selected` on create / no-results items** — the "Create …" list item now carries `role="option"` and `aria-selected="false"`. The loading and no-results items carry `aria-hidden="true"` so they are not announced as interactive choices.

### thekselect-vue 2.0.0

- **Peer dependency floor raised to `thekselect >= 2.0.0`** to match the updated core.
- **Reactive `disabled` prop** — changing `:disabled` or `:loading` on a live component instance now calls `setDisabled()` on the underlying core without re-mounting. Previously the prop change was silently ignored after initial render.
- **`@vue/tsconfig` moved to `devDependencies`** — it was incorrectly listed under `dependencies`, which caused downstream consumers to install a build-only tool.

## 1.8.0 / thekselect-vue 1.3.1 (2026-04-12)

### Breaking

- **`ThekSelectOption` index signature removed** — `[key: string]: unknown` no longer appears on the public interface. TypeScript consumers who indexed options with dynamic string keys (`option['myProp']`) will receive a compilation error. **Migration:** place typed domain data in the `data: T` generic field, or add an explicit `(option as Record<string, unknown>)['myProp']` cast at the use site. Runtime behaviour is unchanged.

### Fixed

- **Value type mismatch** — `setValue('1')` now correctly matches options whose `value` field is the number `1`, and vice versa. All internal comparisons now coerce both sides to string before comparing, eliminating silent mismatches between numeric and string representations of the same value.
- **`setOptions` + remote mode** — calling `setOptions(list)` now persists correctly when a remote search query is later cleared. Previously clearing the query restored the constructor-time option list instead of the list last passed to `setOptions`.
- **`loadOptions` non-array return** — if `loadOptions` resolves with a non-array value the library now emits an `'error'` event and leaves the current state intact, rather than crashing the renderer with a `TypeError`.
- **`create('')` blank option** — calling `ts.create('')` programmatically no longer inserts a blank option; the method returns early when `label.trim()` is empty.
- **Events fire after `destroy()`** — `on()` listeners are now cleared during `destroy()`. Previously, programmatic API calls made after destroy still emitted events to retained listeners.
- **Listener error surfacing** — uncaught errors in `on()` callbacks are now re-thrown asynchronously via `setTimeout(..., 0)`, reaching global error handlers (Sentry, `window.onerror`, etc.) while still allowing subsequent listeners for the same event to run. Previously they were swallowed after a `console.error`.

### Changed

- **`maxSelectedLabels` clamped** — values below `1` are clamped to `1` in `buildConfig`. Setting `maxSelectedLabels: 0` previously caused any selection to collapse immediately into a summary count.

### Performance

- `StateManager.getState()` now caches the frozen deep-clone between state mutations. Multiple `getState()` calls within a single render cycle (render dispatch, `getFilteredOptions`, keyboard handlers) now pay the clone cost once instead of on every call.

### thekselect-vue 1.3.1

- Peer dependency floor raised to `thekselect >= 1.8.0` to match the updated core. No other changes.

## 1.7.0 / thekselect-vue 1.3.0 (2026-04-12)

### Changed

- **Virtualized DOM reuse** — the virtual list now reuses rendered option nodes while scrolling instead of clearing and recreating the visible window on each update. This cuts scroll-time DOM churn and makes virtualization behave more like a proper pooled renderer.
- **Stable drag-and-drop identifiers** — tag reordering now resolves drag payloads by stable selected values instead of transient DOM indices, making reorder behavior resilient to stale `dataset.index` values.
- **CommonJS package support** — both `thekselect` and `thekselect-vue` now ship explicit CommonJS builds alongside ESM output. Package exports now include `require` conditions and `main` points at the CJS entry, so CommonJS consumers have a supported import path again.
- **Vue peer dependency floor** — `thekselect-vue` now declares `thekselect >= 1.7.0` to match the new core packaging and renderer behavior.

### Fixed

- **Ancestor subtree orphan cleanup** — removing an ancestor subtree without calling `.destroy()` now still tears down the detached dropdown and listeners. The fallback orphan observer no longer only handles direct wrapper removal.
- **SVG renderer hygiene** — internal icons are now created as SVG DOM nodes rather than being injected with `innerHTML`, removing a fragile renderer pattern while preserving the same visual output.
- **Loading semantics** — the active combobox element and listbox now expose `aria-busy` during remote loading, giving assistive technologies a clearer signal when results are in-flight.

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
