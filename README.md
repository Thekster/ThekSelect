# ThekSelect

A lightweight, framework-agnostic, and accessible select library with native drag-and-drop tag reordering and object-based theming.

## Features

- Headless core with renderer/state separation
- Search with debounce support
- Single and multi-select modes
- User-created tags (`canCreate`)
- Remote async options (`loadOptions`)
- Rich theming via object config
- Native HTML5 drag-and-drop for selected tags
- Keyboard-friendly and ARIA-aware behavior
- Size variants: `sm`, `md`, `lg`

## Installation

```bash
npm install thekselect
```

## Quick Start

```js
import { ThekSelect } from 'thekselect';

const select = ThekSelect.init('#my-select', {
  placeholder: 'Select an option...'
});
```

### Large Datasets (Virtualization)

```js
ThekSelect.init('#big-list', {
  options: hugeOptions,
  searchable: true,
  virtualize: true,
  virtualThreshold: 80,
  virtualItemHeight: 40,
  virtualOverscan: 4
});
```

### Global Defaults (App-wide)

```js
import { ThekSelect } from 'thekselect';

ThekSelect.setDefaults({
  size: 'md',
  theme: { primary: '#0f172a' },
  virtualize: true
});

// Uses global defaults
ThekSelect.init('#first');

// Instance options still override globals
ThekSelect.init('#second', { size: 'lg' });

// Optional cleanup (tests, app teardown, etc.)
ThekSelect.resetDefaults();
```

## Development (Repo)

```bash
npm install
npm test
```

### Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start Vite dev server for local development/showcase. |
| `npm run build` | Build library outputs into `dist/` and emit types. |
| `npm run preview` | Preview built output with Vite. Optional for library development. |
| `npm test` | Run test suite in watch mode. |
| `npm run coverage` | Run tests with coverage report. |

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

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `options` | `ThekSelectOption[]` | `[]` | Initial options list. |
| `multiple` | `boolean` | `false` | Enable multi-select mode. |
| `searchable` | `boolean` | `true` | Enable search input and filtering. |
| `disabled` | `boolean` | `false` | Disable interaction. |
| `placeholder` | `string` | `'Select...'` | Placeholder text. |
| `canCreate` | `boolean` | `false` | Allow creating new options from input. |
| `createText` | `string` | `"Create '{%t}'..."` | Create row label template (`{%t}` = typed text). |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Control size. |
| `debounce` | `number` | `300` | Debounce delay for `loadOptions`. |
| `maxSelectedLabels` | `number` | `3` | Max visible tags before summary text. |
| `displayField` | `string` | `'label'` | Field used for rendering text. |
| `valueField` | `string` | `'value'` | Field used as internal value key. |
| `maxOptions` | `number \| null` | `null` | Limit rendered dropdown items. |
| `virtualize` | `boolean` | `false` | Enable virtualized option rendering for large lists. |
| `virtualItemHeight` | `number` | `40` | Row height (px) used by virtualization calculations. |
| `virtualOverscan` | `number` | `4` | Extra rows rendered above and below viewport. |
| `virtualThreshold` | `number` | `80` | Minimum option count before virtualization activates. |
| `theme` | `ThekSelectTheme` | `{}` | Theme override object. |
| `loadOptions` | `(query) => Promise<ThekSelectOption[]>` | `undefined` | Async loader for remote search. |
| `renderOption` | `(option) => string \| HTMLElement` | `(o) => o[displayField]` | Custom dropdown renderer. |
| `renderSelection` | `(option) => string \| HTMLElement` | `(o) => o[displayField]` | Custom selected-item renderer. |

## Option Shape

```ts
interface ThekSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  selected?: boolean;
  data?: any;
  [key: string]: any;
}
```

When using custom fields (`valueField`, `displayField`), keep `value` and `label` available if you share the same option objects across default and custom-field instances.

## API Methods

- `getValue()`: Return selected value (`string`), values (`string[]`), or `undefined` when single-select has no selection.
- `getSelectedOptions()`: Return selected option object(s), or `undefined` when single-select has no selection.
- `setValue(value, silent = false)`: Set current selection programmatically.
- `setTheme(theme)`: Update theme at runtime.
- `setSize(size)`: Update size (`sm`, `md`, `lg`) at runtime.
- `setMaxOptions(limit)`: Update dropdown item limit.
- `setRenderOption(callback)`: Update option rendering function.
- `ThekSelect.setDefaults(defaults)`: Set global defaults for future instances.
- `ThekSelect.resetDefaults()`: Clear global defaults.
- `on(event, callback)`: Subscribe to component events. Returns an unsubscribe function.
- `destroy()`: Tear down and restore original element.

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
