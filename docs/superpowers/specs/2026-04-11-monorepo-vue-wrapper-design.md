# ThekSelect Monorepo + Vue Wrapper Design

**Date:** 2026-04-11
**Status:** Approved

## Overview

Convert the ThekSelect repository into an npm workspaces monorepo. Move the core library to `packages/thekselect/` and add a Vue wrapper at `packages/thekselect-vue/`. Vue is the first framework wrapper; React, Svelte, and Angular follow the same pattern later.

---

## Monorepo Structure

```
ThekSelect/                        ← repo root (workspace orchestrator, not published)
  package.json                     ← "workspaces": ["packages/*"], shared devDeps
  tsconfig.base.json               ← shared TS config extended by each package
  packages/
    thekselect/                    ← moved from root, publishes as "thekselect"
      src/
      dist/
      package.json
      vite.config.ts
      tsconfig.json
    thekselect-vue/                ← new, publishes as "thekselect-vue"
      src/
      dist/
      package.json
      vite.config.ts
      tsconfig.json
  showcase/                        ← stays at root, dev-only
  tests/                           ← core tests move into packages/thekselect/tests/
```

The root `package.json` loses `"main"`, `"exports"`, and `"files"` — it becomes the workspace orchestrator only. Each package owns its own publish config and semver.

---

## `thekselect-vue` API

### Component — `<ThekSelect />`

```vue
<ThekSelect
  v-model="selected"
  :options="opts"
  :multiple="true"
  :searchable="true"
  placeholder="Pick one..."
  @change="onChange"
  @open="onOpen"
  @tag-added="onTagAdded"
/>
```

- `v-model` maps to `getValue()` / `setValue()` internally
- All `ThekSelectConfig` options become typed props via `defineProps`
- All ThekSelect events (`change`, `open`, `close`, `search`, `tagAdded`, `tagRemoved`, `reordered`) become Vue emits
- Renders a `<div ref="el">`, calls `ThekSelect.init(el, props)` on `onMounted`, `destroy()` on `onUnmounted`
- Props with runtime setters (`setValue`, `setHeight`, `setMaxOptions`, `setRenderOption`) update the instance via `watch`
- Props without setters (`multiple`, `searchable`, `disabled`, `canCreate`, `loadOptions`, etc.) are treated as init-time only; changing them after mount requires `destroy()` + `init()` (documented, not auto-handled by the wrapper)

### Composable — `useThekSelect(el, options)`

```ts
const { instance, value } = useThekSelect(el, { multiple: true, options: [...] })
```

- `el` is a `Ref<HTMLElement | null>`
- Returns `instance` (raw `ThekSelect` for advanced method calls) and `value` (reactive ref kept in sync via `change` events)
- Manages `onMounted` / `onUnmounted` lifecycle internally

---

## Build Config

### `thekselect-vue`

- Vite in library mode with `@vitejs/plugin-vue`
- ESM output only (`thekselect-vue.js`) — no UMD; Vue users always have a bundler
- TypeScript declarations emitted via `vue-tsc` (handles `.vue` files)
- `thekselect` as `peerDependency` (not bundled)
- `vue >=3.0.0` as `peerDependency`

### `thekselect`

Unchanged outputs and publish config. Moving files from root to `packages/thekselect/` is the only change.

---

## Publishing

- Each package publishes independently via `npm publish` inside its directory
- GitHub Actions workflow gains a matrix step: publish `packages/thekselect` and `packages/thekselect-vue` separately on trigger
- Versions are independent — `thekselect-vue` starts at `1.0.0`

---

## Shared DevDependencies

`vitest`, `typescript`, `vite`, `oxlint`, `oxfmt` live at root and are hoisted to all packages. Each package declares only its unique devDeps (e.g. `@vitejs/plugin-vue`, `vue-tsc` in the Vue package).

---

## Out of Scope

- React, Svelte, Angular wrappers (follow same pattern, separate effort)
- Turborepo / pnpm (npm workspaces is sufficient for this scale)
- UMD output for the Vue wrapper
