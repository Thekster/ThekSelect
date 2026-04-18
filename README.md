# ThekSelect

A dependency-free select library for browser apps, with an official Vue 3 wrapper, themeable CSS, and built-in tag reordering.

**[Live showcase →](https://thekster.github.io/ThekSelect/)**

## Packages

| Package                                                  | Description                                                           |
| -------------------------------------------------------- | --------------------------------------------------------------------- |
| [`thekselect`](https://www.npmjs.com/package/thekselect) | Core library — vanilla JS, no dependencies                            |
| [`thekselect-vue`](packages/thekselect-vue/README.md)    | Vue 3 wrapper — `<ThekSelect>` component + `useThekSelect` composable |

## Positioning

ThekSelect is not trying to be the broadest or oldest select library in the ecosystem.

It is optimized for teams that want:

- A dependency-free core they can reason about and ship in browser apps
- A first-party Vue 3 wrapper instead of a third-party adapter
- Theme control through plain CSS entrypoints and tokens
- Built-in tag reordering for multi-select workflows
- An explicit lifecycle with predictable setup and teardown

If your priority is a more battle-tested general-purpose library with a larger community footprint, another library may be the safer default. If your priority is a smaller, more controlled select stack for your own apps, ThekSelect is designed for that use case.

## Features

- Dependency-free core package
- Official Vue 3 wrapper in the same monorepo
- Reusable core with renderer/state separation
- Search with debounce support
- Single and multi-select modes
- User-created tags (`canCreate`)
- Remote async options (`loadOptions`)
- Native HTML5 drag-and-drop for selected tags
- CSS theme entrypoints plus token-based customization
- Virtualized option rendering for large datasets
- Keyboard and ARIA support for browser usage
- Height control via `height` option (`number` or CSS string)

## Choose ThekSelect When

- You want a dependency-free core plus a supported Vue 3 wrapper
- You need built-in tag reordering without a plugin layer
- You want theme control through CSS files and custom properties
- You prefer a smaller API surface that you can evolve with your own product needs
- You are standardizing select behavior across internal or product-family apps

## Installation

```bash
npm install thekselect
```

## Release

Before publishing:

1. Ensure the package name and version in `package.json` are correct.
2. Push the commit you want to publish.
3. Ensure npm trusted publishing is configured for this GitHub repository and workflow.

Verify the package locally:

```bash
npm run release:check
```

Publish through GitHub Actions:

1. Bump the package versions you want to publish.
2. Push the version commit to GitHub.
3. Trigger one of these:
   - Create and publish a GitHub Release.
   - Open `Actions` -> `Publish to npm` -> `Run workflow`.

The publish workflow uses **npm trusted publishing** and publishes the monorepo packages in this order:

1. `packages/thekselect`
2. `packages/thekselect-vue`

This order is required because `thekselect-vue` expects the matching core release to already exist on npm.

Local `npm publish` should be treated as a fallback path, not the default release flow.

## CSS Themes

Import one of the distributed theme files:

```js
import 'thekselect/css/base.css';
// or
import 'thekselect/css/dark.css';
// or
import 'thekselect/css/forest.css';
// or
import 'thekselect/css/red.css';
// or
import 'thekselect/css/blue.css';
// or
import 'thekselect/css/gray.css';
// or
import 'thekselect/css/bootstrap.css';
// or
import 'thekselect/css/tailwind.css';
// or
import 'thekselect/css/material.css';
```

`base.css` ships the full component stylesheet plus the system theme tokens: light defaults with automatic dark-mode tokens via `prefers-color-scheme`.

All named theme files also include the full component stylesheet, but they only activate their token overrides when you set a matching theme attribute on the page root:

```html
<html data-thek-theme="dark"></html>
```

Example:

```js
import 'thekselect/css/dark.css';
```

The runtime `injectStyles()` path remains as a fallback for script-only usage, but importing a CSS entrypoint is the CSP-friendly path and is recommended for bundlers.

Customize tokens with plain CSS:

```css
:root {
  --thek-primary: #1d4ed8;
  --thek-border-radius: 12px;
  --thek-height-md: 44px;
}
```

## Quick Start

```html
<select id="my-select">
  <option value="">Choose one...</option>
  <option value="react">React</option>
  <option value="vue">Vue</option>
</select>
```

```js
import { ThekSelectDom } from 'thekselect';

const select = ThekSelectDom.init('#my-select', {
  placeholder: 'Select an option...'
});
```

### Browser `<script>` Tag (No Bundler)

```html
<link rel="stylesheet" href="./dist/css/base.css" />
<script src="./dist/thekselect.umd.min.js"></script>

<select id="my-select">
  <option value="react">React</option>
  <option value="vue">Vue</option>
</select>

<script>
  const { ThekSelectDom } = window.ThekSelect;
  ThekSelectDom.init('#my-select');
</script>
```

The UMD output is intended for direct browser `<script>` usage from a static server. For named themes, link the matching CSS file and set `data-thek-theme="theme-name"` on `<html>`.

### Initialize From Existing `<select>`

If options already exist in your native `<select>`, initialize directly from it:

```html
<select id="country-select" multiple>
  <option value="us" selected>United States</option>
  <option value="de">Germany</option>
  <option value="jp" disabled>Japan (disabled)</option>
</select>
```

```js
import { ThekSelectDom } from 'thekselect';

ThekSelectDom.init('#country-select');
```

`ThekSelect` reads existing `<option>` values, labels, `selected`, `disabled`, and `multiple` automatically.

### Large Datasets (Virtualization)

```html
<div id="big-list"></div>
```

```js
import { ThekSelectDom } from 'thekselect';

ThekSelectDom.init('#big-list', {
  options: hugeOptions,
  searchable: true,
  virtualize: true,
  virtualThreshold: 80,
  virtualItemHeight: 40,
  virtualOverscan: 4
});
```

### Global Defaults (App-wide)

```html
<div id="first"></div>
<div id="second"></div>
```

```js
import { ThekSelect } from 'thekselect';

ThekSelect.setDefaults({
  height: 40,
  virtualize: true
});

// Uses global defaults
ThekSelectDom.init('#first');

// Instance options still override globals
ThekSelectDom.init('#second', { height: 52 });

// Optional cleanup (tests, app teardown, etc.)
ThekSelect.resetDefaults();
```

## Development (Repo)

```bash
npm install
npm test
```

For non-trivial changes, validate in this order:

```bash
npm run format:check
npm run lint
npm test -- --run
npm run build
```

The current test expansion plan is tracked in [docs/TEST_PLAN.md](docs/TEST_PLAN.md).

### Scripts

| Script             | Purpose                                                           |
| ------------------ | ----------------------------------------------------------------- |
| `npm run dev`      | Start Vite dev server for local development/showcase.             |
| `npm run build`    | Build library outputs into `dist/` and emit types.                |
| `npm run preview`  | Preview built output with Vite. Optional for library development. |
| `npm test`         | Run test suite in watch mode.                                     |
| `npm run coverage` | Run tests with coverage report.                                   |

Notes:

- `preview` is optional for day-to-day library work.
- For this repo, tests are the primary correctness check when bundle preview is unavailable.

## Showcase

The demo page is `showcase/index.html` and is intended to run through Vite during development.

```bash
npm run dev
```

Then open the local URL printed by Vite.

## Configuration

| Option              | Type                                     | Default                  | Description                                                                |
| ------------------- | ---------------------------------------- | ------------------------ | -------------------------------------------------------------------------- |
| `options`           | `ThekSelectOption[]`                     | `[]`                     | Initial options list.                                                      |
| `multiple`          | `boolean`                                | `false`                  | Enable multi-select mode.                                                  |
| `searchable`        | `boolean`                                | `true`                   | Enable search input and filtering.                                         |
| `disabled`          | `boolean`                                | `false`                  | Disable interaction.                                                       |
| `placeholder`       | `string`                                 | `'Select...'`            | Placeholder text.                                                          |
| `canCreate`         | `boolean`                                | `false`                  | Allow creating new options from input.                                     |
| `createText`        | `string`                                 | `"Create '{%t}'..."`     | Create row label template (`{%t}` = typed text).                           |
| `height`            | `number \| string`                       | `40`                     | Control control/dropdown input height (`number` = px).                     |
| `debounce`          | `number`                                 | `300`                    | Debounce delay for `loadOptions`; `0` still defers to the next timer tick. |
| `maxSelectedLabels` | `number`                                 | `3`                      | Max visible tags before summary text.                                      |
| `displayField`      | `string`                                 | `'label'`                | Field used for rendering text.                                             |
| `valueField`        | `string`                                 | `'value'`                | Field used as internal value key.                                          |
| `maxOptions`        | `number \| null`                         | `null`                   | Limit rendered dropdown items.                                             |
| `virtualize`        | `boolean`                                | `false`                  | Enable virtualized option rendering for large lists.                       |
| `virtualItemHeight` | `number`                                 | `40`                     | Row height (px) used by virtualization calculations.                       |
| `virtualOverscan`   | `number`                                 | `4`                      | Extra rows rendered above and below viewport.                              |
| `virtualThreshold`  | `number`                                 | `80`                     | Minimum option count before virtualization activates.                      |
| `loadOptions`       | `(query) => Promise<ThekSelectOption[]>` | `undefined`              | Async loader for remote search.                                            |
| `renderOption`      | `(option) => string \| HTMLElement`      | `(o) => o[displayField]` | Custom dropdown renderer.                                                  |
| `renderSelection`   | `(option) => string \| HTMLElement`      | `(o) => o[displayField]` | Custom selected-item renderer.                                             |

## Option Shape

```ts
interface ThekSelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
  selected?: boolean;
  data?: any;
  [key: string]: any;
}
```

| Field           | Type               | Description                                                        |
| --------------- | ------------------ | ------------------------------------------------------------------ |
| `value`         | `string \| number` | Stable internal value used for selection state and emitted values. |
| `label`         | `string`           | Default display text shown in dropdown and selected state.         |
| `disabled`      | `boolean`          | Prevents selecting the option when `true`.                         |
| `selected`      | `boolean`          | Marks initial selection when options are provided at init time.    |
| `data`          | `any`              | Optional extra metadata for custom rendering and app logic.        |
| `[key: string]` | `any`              | Allows custom fields for `displayField`/`valueField` mapping.      |

When using custom fields (`valueField`, `displayField`), keep `value` and `label` available if you share the same option objects across default and custom-field instances.

## API Methods

- `getValue()`: Return selected value (`string | number`), values (`Array<string | number>`), or `undefined` when single-select has no selection.
- `getSelectedOptions()`: Return selected option object(s), or `undefined` when single-select has no selection.
- `setValue(value, silent = false)`: Set current selection programmatically.
- `setDisabled(disabled)`: Toggle disabled state at runtime.
- `setHeight(height)`: Update height at runtime (`number` = px or CSS string like `'2.75rem'`).
- `setMaxOptions(limit)`: Update dropdown item limit.
- `setRenderOption(callback)`: Update option rendering function.
- `ThekSelect.setDefaults(defaults)`: Set global defaults for future instances.
- `ThekSelect.resetDefaults()`: Clear global defaults.
- `on(event, callback)`: Subscribe to component events. Returns an unsubscribe function.
- `destroy()`: Tear down and restore original element.

## API Reference

| Method                      | Parameters                                                               | Returns                                                    | Description                                                                                   |
| --------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `getValue()`                | none                                                                     | `string \| number \| Array<string \| number> \| undefined` | Gets current selected value(s) from component state.                                          |
| `getSelectedOptions()`      | none                                                                     | `ThekSelectOption \| ThekSelectOption[] \| undefined`      | Gets current selected option object(s).                                                       |
| `setValue(value, silent?)`  | `value: string \| number \| Array<string \| number>`, `silent?: boolean` | `void`                                                     | Sets selected value(s). In single mode keeps first value; in multi mode de-duplicates values. |
| `setDisabled(disabled)`     | `disabled: boolean`                                                      | `void`                                                     | Enables or disables interaction for the instance at runtime.                                  |
| `setHeight(height)`         | `height: number \| string`                                               | `void`                                                     | Sets control height for the instance. Numeric input is treated as px.                         |
| `setMaxOptions(limit)`      | `limit: number \| null`                                                  | `void`                                                     | Limits filtered options rendered in dropdown (`null` disables limit).                         |
| `setRenderOption(callback)` | `callback: (option) => string \| HTMLElement`                            | `void`                                                     | Overrides dropdown option rendering for this instance.                                        |
| `on(event, callback)`       | `event: ThekSelectEvent`, `callback: (payload) => void`                  | `() => void`                                               | Subscribes to an event and returns an unsubscribe function.                                   |
| `destroy()`                 | none                                                                     | `void`                                                     | Removes generated DOM/listeners and restores original element visibility.                     |

| Static Method                          | Parameters                                                    | Returns      | Description                                      |
| -------------------------------------- | ------------------------------------------------------------- | ------------ | ------------------------------------------------ |
| `ThekSelectDom.init(element, config?)` | `element: string \| HTMLElement`, `config?: ThekSelectConfig` | `ThekSelect` | Creates and initializes a new instance.          |
| `ThekSelect.setDefaults(defaults)`     | `defaults: Partial<ThekSelectConfig>`                         | `void`       | Sets process-wide defaults for future instances. |
| `ThekSelect.resetDefaults()`           | none                                                          | `void`       | Clears global defaults.                          |

## Events

- `change`: Selection changed (value or values).
- `open`: Dropdown opened.
- `close`: Dropdown closed.
- `search`: Search input changed.
- `tagAdded`: Tag added in multi mode.
- `tagRemoved`: Tag removed in multi mode.
- `reordered`: Selected tags reordered by drag-and-drop.

## Troubleshooting

### `Error: spawn EPERM` on `npm run dev`, `npm run build`, or `npm run preview` (Windows)

This is typically an environment policy/permissions issue around spawning build tooling (e.g. esbuild), not a ThekSelect API issue.

Recommended checks:

1. Reinstall dependencies:

```bash
rmdir /s /q node_modules
npm install
```

2. Verify esbuild binary can execute:

```bash
node_modules\\@esbuild\\win32-x64\\esbuild.exe --version
```

3. If blocked, review antivirus/EDR/AppLocker/Windows Security rules for child-process execution from your workspace.

4. Use `npm test` to continue validating behavior while fixing build environment constraints.

## License

MIT
