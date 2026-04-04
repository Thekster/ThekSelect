# Release Notes

## Unreleased

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
