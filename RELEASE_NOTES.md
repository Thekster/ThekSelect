# Release Notes

## Unreleased (2026-02-07)

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

### Build
- Build config now enables explicit minification for JS and CSS:
  - `build.minify = 'esbuild'`
  - `build.cssMinify = 'esbuild'`
