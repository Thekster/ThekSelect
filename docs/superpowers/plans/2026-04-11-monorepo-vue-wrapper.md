# Monorepo + Vue Wrapper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert ThekSelect into an npm workspaces monorepo, move the core to `packages/thekselect/`, and add a `thekselect-vue` wrapper with a component and composable.

**Architecture:** npm workspaces at repo root with two packages: `packages/thekselect` (existing core, unchanged API) and `packages/thekselect-vue` (Vue 3 wrapper). The Vue wrapper calls `ThekSelect.init()` on mount and `destroy()` on unmount, forwarding props and events. Tests run from root via a vitest include glob.

**Tech Stack:** TypeScript, Vite 8, Vitest 4, Vue 3, `@vitejs/plugin-vue`, `@vue/test-utils`, `vue-tsc`, npm workspaces.

---

## File Map

### Modified at root

- `package.json` — strip publish fields, add `"workspaces": ["packages/*"]`, keep shared devDeps
- `vite.config.ts` — strip build section, keep only `test` with jsdom + include glob
- `tsconfig.base.json` — **new** shared TS base config
- `showcase/index.html` — update CSS `href` paths from `../src/themes/` → `../packages/thekselect/src/themes/`
- `showcase/main.ts` — update import from `'../src/index.ts'` → `'../packages/thekselect/src/index.ts'`
- `.github/workflows/publish.yml` — add matrix publish for both packages
- `.github/workflows/ci.yml` — add `npm run build` for both packages

### Created: `packages/thekselect/`

- `package.json` — same publish config as current root `package.json`
- `vite.config.ts` — same as current root `vite.config.ts` minus `test` section
- `tsconfig.json` — extends `../../tsconfig.base.json`
- `src/` — **moved** from `src/` at root (no file edits)
- `tests/` — **moved** from `tests/` at root (no file edits)

### Created: `packages/thekselect-vue/`

- `package.json` — publishes `thekselect-vue`, peers: `thekselect` + `vue`
- `vite.config.ts` — library mode, ESM only, externals: vue + thekselect
- `tsconfig.json` — extends `../../tsconfig.base.json`, includes `.vue` files
- `src/composable.ts` — `useThekSelect(el, options)` composable
- `src/ThekSelect.vue` — Vue component wrapping core
- `src/index.ts` — re-exports both
- `tests/composable.test.ts` — composable unit tests
- `tests/ThekSelect.test.ts` — component unit tests

---

## Task 1: Create `tsconfig.base.json`

**Files:**

- Create: `tsconfig.base.json`

- [ ] **Step 1: Create the file**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ESNext", "DOM", "DOM.Iterable"],
    "moduleResolution": "Bundler",
    "strict": true,
    "sourceMap": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "noEmit": false,
    "declaration": true,
    "emitDeclarationOnly": true,
    "skipLibCheck": true
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add tsconfig.base.json
git commit -m "build: add shared tsconfig.base.json for monorepo"
```

---

## Task 2: Create `packages/thekselect/` and move core files

**Files:**

- Create dir: `packages/thekselect/`
- Move: `src/` → `packages/thekselect/src/`
- Move: `tests/` → `packages/thekselect/tests/`
- Create: `packages/thekselect/package.json`
- Create: `packages/thekselect/vite.config.ts`
- Create: `packages/thekselect/tsconfig.json`

- [ ] **Step 1: Create the directory and move source + tests**

```bash
mkdir -p packages/thekselect
cp -r src packages/thekselect/src
cp -r tests packages/thekselect/tests
```

- [ ] **Step 2: Create `packages/thekselect/package.json`**

Copy from current root `package.json` exactly, but remove the `"scripts"` section entries that belong at root (`"dev"`, `"build:showcase"`, `"coverage"`, `"lint"`, `"format"`, `"format:check"`) and keep only the package-specific ones:

```json
{
  "name": "thekselect",
  "version": "1.2.2",
  "description": "A browser select library with a reusable core and themes.",
  "keywords": ["accessible", "aria", "autocomplete", "multiselect", "select", "tagging"],
  "license": "MIT",
  "author": "Thekster",
  "files": ["dist"],
  "sideEffects": ["**/*.css"],
  "type": "module",
  "main": "./dist/thekselect.js",
  "module": "./dist/thekselect.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/thekselect.js"
    },
    "./min": {
      "types": "./dist/index.d.ts",
      "import": "./dist/thekselect.min.js"
    },
    "./css/*": "./dist/css/*"
  },
  "scripts": {
    "build": "vite build && cross-env THEK_MINIFY=1 vite build --emptyOutDir false && tsc && shx mkdir -p dist/css && (shx cp -r src/themes/*.css dist/css || shx echo \"No theme CSS files to copy\")",
    "release:check": "npm run build && npm pack --dry-run --cache .npm-cache"
  },
  "devDependencies": {},
  "repository": {
    "type": "git",
    "url": "git+https://github.com/Thekster/ThekSelect.git"
  },
  "bugs": {
    "url": "https://github.com/Thekster/ThekSelect/issues"
  },
  "homepage": "https://thekster.github.io/ThekSelect/",
  "publishConfig": {
    "access": "public"
  }
}
```

- [ ] **Step 3: Create `packages/thekselect/vite.config.ts`**

Same as the current root `vite.config.ts` but without the `test` section:

```ts
import { defineConfig } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  build: {
    minify: process.env.THEK_MINIFY === '1' ? 'terser' : false,
    cssMinify: process.env.THEK_MINIFY === '1' ? 'esbuild' : false,
    terserOptions:
      process.env.THEK_MINIFY === '1'
        ? {
            compress: { passes: 2 },
            format: { comments: false }
          }
        : undefined,
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'ThekSelect',
      fileName: (format) => {
        const isMin = process.env.THEK_MINIFY === '1';
        if (format === 'es') {
          return isMin ? 'thekselect.min.js' : 'thekselect.js';
        }
        return isMin ? 'thekselect.umd.min.js' : 'thekselect.umd.js';
      },
      formats: ['es', 'umd']
    },
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'css/[name][extname]';
          }
          return '[name][extname]';
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
});
```

- [ ] **Step 4: Create `packages/thekselect/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "declarationDir": "dist",
    "rootDir": "src",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "tests"]
}
```

- [ ] **Step 5: Commit**

```bash
git add packages/thekselect/
git commit -m "build: move core library to packages/thekselect"
```

---

## Task 3: Update root `package.json` to workspace orchestrator

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Replace root `package.json`**

```json
{
  "name": "thekselect-root",
  "private": true,
  "version": "0.0.0",
  "workspaces": ["packages/*"],
  "scripts": {
    "dev": "vite --open /showcase/index.html",
    "build": "npm run build --workspace=packages/thekselect && npm run build --workspace=packages/thekselect-vue",
    "build:showcase": "vite build --config vite.showcase.config.ts",
    "test": "vitest",
    "coverage": "vitest run --coverage",
    "lint": "oxlint .",
    "format": "oxfmt .",
    "format:check": "oxfmt --check ."
  },
  "devDependencies": {
    "@types/node": "^25.2.1",
    "cross-env": "^10.1.0",
    "jsdom": "^29.0.1",
    "oxfmt": "^0.44.0",
    "oxlint": "^1.57.0",
    "shx": "^0.4.0",
    "terser": "^5.46.0",
    "typescript": "^6.0.2",
    "vite": "^8.0.3",
    "vitest": "^4.0.18"
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add package.json
git commit -m "build: convert root to npm workspaces orchestrator"
```

---

## Task 4: Update root `vite.config.ts` for test-only use

**Files:**

- Modify: `vite.config.ts`

- [ ] **Step 1: Replace root `vite.config.ts`**

The root config now only serves as the vitest entry point. It includes tests from all packages:

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['packages/*/tests/**/*.test.ts']
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add vite.config.ts
git commit -m "build: simplify root vite.config.ts to vitest entry point"
```

---

## Task 5: Update showcase to use new core paths

**Files:**

- Modify: `showcase/index.html`
- Modify: `showcase/main.ts`

- [ ] **Step 1: Update `showcase/main.ts`**

Change the first line from:

```ts
import { ThekSelect, ThekSelectHandle } from '../src/index.ts';
```

to:

```ts
import { ThekSelect, ThekSelectHandle } from '../packages/thekselect/src/index.ts';
```

- [ ] **Step 2: Update `showcase/index.html` CSS hrefs**

Find every occurrence of `../src/themes/` and replace with `../packages/thekselect/src/themes/`. There are 9 theme stylesheet links:

```html
<link rel="stylesheet" href="../packages/thekselect/src/themes/base.css" />
<link rel="stylesheet" href="../packages/thekselect/src/themes/dark.css" />
<link rel="stylesheet" href="../packages/thekselect/src/themes/forest.css" />
<link rel="stylesheet" href="../packages/thekselect/src/themes/red.css" />
<link rel="stylesheet" href="../packages/thekselect/src/themes/blue.css" />
<link rel="stylesheet" href="../packages/thekselect/src/themes/gray.css" />
<link rel="stylesheet" href="../packages/thekselect/src/themes/bootstrap.css" />
<link rel="stylesheet" href="../packages/thekselect/src/themes/tailwind.css" />
<link rel="stylesheet" href="../packages/thekselect/src/themes/material.css" />
```

- [ ] **Step 3: Commit**

```bash
git add showcase/main.ts showcase/index.html
git commit -m "build: update showcase paths after core move to packages/thekselect"
```

---

## Task 6: Verify the monorepo works

**Files:** None

- [ ] **Step 1: Install dependencies and run tests**

```bash
npm install
npm test -- --run
```

Expected: all existing tests pass, no import errors.

- [ ] **Step 2: Verify the core builds**

```bash
npm run build --workspace=packages/thekselect
```

Expected: `packages/thekselect/dist/` is created with `thekselect.js`, `thekselect.umd.js`, minified variants, CSS files, and `.d.ts` files.

- [ ] **Step 3: Delete old `src/` and `tests/` from root**

```bash
rm -rf src tests
```

- [ ] **Step 4: Re-run tests to confirm root `src/` is not needed**

```bash
npm test -- --run
```

Expected: all tests still pass (they import relative to their own location in `packages/thekselect/tests/`).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "build: remove root src/ and tests/ after monorepo migration"
```

---

## Task 7: Update CI workflows

**Files:**

- Modify: `.github/workflows/ci.yml`
- Modify: `.github/workflows/publish.yml`

- [ ] **Step 1: Update `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm test -- --run
      - run: npm run build --workspace=packages/thekselect
```

- [ ] **Step 2: Update `.github/workflows/publish.yml`**

```yaml
name: Publish to npm

on:
  release:
    types:
      - published
  workflow_dispatch:
    inputs:
      package:
        description: 'Package to publish (thekselect or thekselect-vue)'
        required: true
        default: 'thekselect'

permissions:
  contents: read
  id-token: write

jobs:
  publish:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        package: [thekselect, thekselect-vue]

    steps:
      - name: Check out repository
        uses: actions/checkout@v5

      - name: Set up Node.js
        uses: actions/setup-node@v5
        with:
          node-version: 24
          registry-url: https://registry.npmjs.org
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Verify release package
        run: npm run release:check
        working-directory: packages/${{ matrix.package }}

      - name: Publish to npm
        run: npm publish
        working-directory: packages/${{ matrix.package }}
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml .github/workflows/publish.yml
git commit -m "ci: update workflows for monorepo package structure"
```

---

## Task 8: Scaffold `packages/thekselect-vue/`

**Files:**

- Create: `packages/thekselect-vue/package.json`
- Create: `packages/thekselect-vue/vite.config.ts`
- Create: `packages/thekselect-vue/tsconfig.json`
- Create: `packages/thekselect-vue/src/index.ts` (empty stub)
- Create: `packages/thekselect-vue/tests/` (empty dir placeholder)

- [ ] **Step 1: Create `packages/thekselect-vue/package.json`**

```json
{
  "name": "thekselect-vue",
  "version": "1.0.0",
  "description": "Vue 3 wrapper for ThekSelect",
  "keywords": [
    "accessible",
    "aria",
    "autocomplete",
    "multiselect",
    "select",
    "tagging",
    "vue",
    "vue3"
  ],
  "license": "MIT",
  "author": "Thekster",
  "files": ["dist"],
  "type": "module",
  "main": "./dist/thekselect-vue.js",
  "module": "./dist/thekselect-vue.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/thekselect-vue.js"
    }
  },
  "peerDependencies": {
    "thekselect": ">=1.0.0",
    "vue": ">=3.0.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.2.3",
    "@vue/test-utils": "^2.4.6",
    "vue": "^3.5.13",
    "vue-tsc": "^2.2.10"
  },
  "scripts": {
    "build": "vite build && vue-tsc --project tsconfig.json",
    "release:check": "npm run build && npm pack --dry-run"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/Thekster/ThekSelect.git"
  },
  "bugs": {
    "url": "https://github.com/Thekster/ThekSelect/issues"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

- [ ] **Step 2: Create `packages/thekselect-vue/vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'ThekSelectVue',
      fileName: () => 'thekselect-vue.js',
      formats: ['es']
    },
    rollupOptions: {
      external: ['vue', 'thekselect'],
      output: {
        globals: {
          vue: 'Vue',
          thekselect: 'ThekSelect'
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
});
```

- [ ] **Step 3: Create `packages/thekselect-vue/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "declarationDir": "dist",
    "rootDir": "src",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.vue"],
  "exclude": ["node_modules", "tests"]
}
```

- [ ] **Step 4: Create stub `packages/thekselect-vue/src/index.ts`**

```ts
// exports added in Tasks 9 and 11
```

- [ ] **Step 5: Install new devDependencies**

```bash
npm install
```

Expected: `@vitejs/plugin-vue`, `@vue/test-utils`, `vue`, `vue-tsc` appear in root `node_modules/` (hoisted by workspaces).

- [ ] **Step 6: Commit**

```bash
git add packages/thekselect-vue/
git commit -m "build: scaffold thekselect-vue package"
```

---

## Task 9: Write failing composable tests

**Files:**

- Create: `packages/thekselect-vue/tests/composable.test.ts`

- [ ] **Step 1: Create the test file**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { defineComponent, ref, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { useThekSelect } from '../src/composable';

const mockUnsubscribe = vi.fn();
const mockInstance = {
  getValue: vi.fn<() => undefined>(() => undefined),
  setValue: vi.fn(),
  destroy: vi.fn(),
  on: vi.fn((_event: string, _cb: (v: unknown) => void) => mockUnsubscribe)
};

vi.mock('thekselect', () => ({
  ThekSelect: {
    init: vi.fn(() => mockInstance)
  }
}));

describe('useThekSelect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes ThekSelect with the element and options on mount', async () => {
    const { ThekSelect } = await import('thekselect');
    const TestComponent = defineComponent({
      setup() {
        const el = ref<HTMLElement | null>(null);
        useThekSelect(el, { multiple: true });
        return { el };
      },
      template: '<div ref="el" />'
    });

    const wrapper = mount(TestComponent, { attachTo: document.body });
    await nextTick();

    expect(ThekSelect.init).toHaveBeenCalledOnce();
    expect(ThekSelect.init).toHaveBeenCalledWith(expect.any(HTMLElement), { multiple: true });
    wrapper.unmount();
  });

  it('calls destroy on unmount', async () => {
    const TestComponent = defineComponent({
      setup() {
        const el = ref<HTMLElement | null>(null);
        useThekSelect(el);
        return { el };
      },
      template: '<div ref="el" />'
    });

    const wrapper = mount(TestComponent, { attachTo: document.body });
    await nextTick();
    wrapper.unmount();

    expect(mockInstance.destroy).toHaveBeenCalledOnce();
  });

  it('returns value ref that syncs when the change event fires', async () => {
    let changeCallback: ((v: unknown) => void) | undefined;
    mockInstance.on.mockImplementation((event: string, cb: (v: unknown) => void) => {
      if (event === 'change') changeCallback = cb;
      return mockUnsubscribe;
    });

    const TestComponent = defineComponent({
      setup() {
        const el = ref<HTMLElement | null>(null);
        const { value } = useThekSelect(el);
        return { el, value };
      },
      template: '<div ref="el" />'
    });

    const wrapper = mount(TestComponent, { attachTo: document.body });
    await nextTick();

    changeCallback?.('option-a');
    await nextTick();

    expect((wrapper.vm as { value: unknown }).value).toBe('option-a');
    wrapper.unmount();
  });

  it('returns the raw instance ref', async () => {
    const TestComponent = defineComponent({
      setup() {
        const el = ref<HTMLElement | null>(null);
        const { instance } = useThekSelect(el);
        return { el, instance };
      },
      template: '<div ref="el" />'
    });

    const wrapper = mount(TestComponent, { attachTo: document.body });
    await nextTick();

    expect((wrapper.vm as { instance: unknown }).instance).toBe(mockInstance);
    wrapper.unmount();
  });
});
```

- [ ] **Step 2: Run and confirm the tests fail**

```bash
npm test -- --run packages/thekselect-vue/tests/composable.test.ts
```

Expected: FAIL — `Cannot find module '../src/composable'`

- [ ] **Step 3: Commit**

```bash
git add packages/thekselect-vue/tests/composable.test.ts
git commit -m "test(thekselect-vue): add failing composable tests"
```

---

## Task 10: Implement `useThekSelect` composable

**Files:**

- Create: `packages/thekselect-vue/src/composable.ts`
- Modify: `packages/thekselect-vue/src/index.ts`

- [ ] **Step 1: Create `packages/thekselect-vue/src/composable.ts`**

```ts
import { ref, onMounted, onUnmounted, type Ref } from 'vue';
import { ThekSelect, type ThekSelectConfig } from 'thekselect';

export function useThekSelect(el: Ref<HTMLElement | null>, options: ThekSelectConfig = {}) {
  const instance = ref<ThekSelect | null>(null);
  const value = ref<string | string[] | undefined>(undefined);

  onMounted(() => {
    if (!el.value) return;
    const ts = ThekSelect.init(el.value, options);
    instance.value = ts;
    value.value = ts.getValue() as string | string[] | undefined;
    ts.on('change', (v) => {
      value.value = v as string | string[] | undefined;
    });
  });

  onUnmounted(() => {
    instance.value?.destroy();
    instance.value = null;
  });

  return { instance, value };
}
```

- [ ] **Step 2: Export from `packages/thekselect-vue/src/index.ts`**

```ts
export { useThekSelect } from './composable';
```

- [ ] **Step 3: Run tests and confirm they pass**

```bash
npm test -- --run packages/thekselect-vue/tests/composable.test.ts
```

Expected: 4 tests pass.

- [ ] **Step 4: Commit**

```bash
git add packages/thekselect-vue/src/composable.ts packages/thekselect-vue/src/index.ts
git commit -m "feat(thekselect-vue): implement useThekSelect composable"
```

---

## Task 11: Write failing component tests

**Files:**

- Create: `packages/thekselect-vue/tests/ThekSelect.test.ts`

- [ ] **Step 1: Create the test file**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import ThekSelectComponent from '../src/ThekSelect.vue';

const mockUnsubscribe = vi.fn();
const mockInstance = {
  getValue: vi.fn<() => undefined>(() => undefined),
  setValue: vi.fn(),
  setHeight: vi.fn(),
  setMaxOptions: vi.fn(),
  setRenderOption: vi.fn(),
  destroy: vi.fn(),
  on: vi.fn((_event: string, _cb: (v: unknown) => void) => mockUnsubscribe)
};

vi.mock('thekselect', () => ({
  ThekSelect: {
    init: vi.fn(() => mockInstance)
  }
}));

describe('ThekSelect.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a div', () => {
    const wrapper = mount(ThekSelectComponent);
    expect(wrapper.find('div').exists()).toBe(true);
    wrapper.unmount();
  });

  it('calls ThekSelect.init with the element and props on mount', async () => {
    const { ThekSelect } = await import('thekselect');
    const wrapper = mount(ThekSelectComponent, {
      props: { options: [{ value: 'a', label: 'A' }], multiple: true },
      attachTo: document.body
    });
    await nextTick();

    expect(ThekSelect.init).toHaveBeenCalledOnce();
    expect(ThekSelect.init).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({ options: [{ value: 'a', label: 'A' }], multiple: true })
    );
    wrapper.unmount();
  });

  it('calls destroy on unmount', async () => {
    const wrapper = mount(ThekSelectComponent, { attachTo: document.body });
    await nextTick();
    wrapper.unmount();
    expect(mockInstance.destroy).toHaveBeenCalledOnce();
  });

  it('calls setValue silently when modelValue prop changes', async () => {
    const wrapper = mount(ThekSelectComponent, {
      props: { modelValue: 'a' },
      attachTo: document.body
    });
    await nextTick();
    await wrapper.setProps({ modelValue: 'b' });
    expect(mockInstance.setValue).toHaveBeenCalledWith('b', true);
    wrapper.unmount();
  });

  it('calls setHeight when height prop changes', async () => {
    const wrapper = mount(ThekSelectComponent, {
      props: { height: 40 },
      attachTo: document.body
    });
    await nextTick();
    await wrapper.setProps({ height: 60 });
    expect(mockInstance.setHeight).toHaveBeenCalledWith(60);
    wrapper.unmount();
  });

  it('calls setMaxOptions when maxOptions prop changes', async () => {
    const wrapper = mount(ThekSelectComponent, {
      props: { maxOptions: 10 },
      attachTo: document.body
    });
    await nextTick();
    await wrapper.setProps({ maxOptions: 5 });
    expect(mockInstance.setMaxOptions).toHaveBeenCalledWith(5);
    wrapper.unmount();
  });

  it('emits update:modelValue and change when core change event fires', async () => {
    let changeCallback: ((v: unknown) => void) | undefined;
    mockInstance.on.mockImplementation((event: string, cb: (v: unknown) => void) => {
      if (event === 'change') changeCallback = cb;
      return mockUnsubscribe;
    });

    const wrapper = mount(ThekSelectComponent, { attachTo: document.body });
    await nextTick();

    changeCallback?.('option-a');
    await nextTick();

    expect(wrapper.emitted('change')).toEqual([['option-a']]);
    expect(wrapper.emitted('update:modelValue')).toEqual([['option-a']]);
    wrapper.unmount();
  });

  it('emits open when core open event fires', async () => {
    let openCallback: (() => void) | undefined;
    mockInstance.on.mockImplementation((event: string, cb: () => void) => {
      if (event === 'open') openCallback = cb;
      return mockUnsubscribe;
    });

    const wrapper = mount(ThekSelectComponent, { attachTo: document.body });
    await nextTick();
    openCallback?.();
    await nextTick();
    expect(wrapper.emitted('open')).toBeTruthy();
    wrapper.unmount();
  });

  it('emits close when core close event fires', async () => {
    let closeCallback: (() => void) | undefined;
    mockInstance.on.mockImplementation((event: string, cb: () => void) => {
      if (event === 'close') closeCallback = cb;
      return mockUnsubscribe;
    });

    const wrapper = mount(ThekSelectComponent, { attachTo: document.body });
    await nextTick();
    closeCallback?.();
    await nextTick();
    expect(wrapper.emitted('close')).toBeTruthy();
    wrapper.unmount();
  });
});
```

- [ ] **Step 2: Run and confirm the tests fail**

```bash
npm test -- --run packages/thekselect-vue/tests/ThekSelect.test.ts
```

Expected: FAIL — `Cannot find module '../src/ThekSelect.vue'`

- [ ] **Step 3: Commit**

```bash
git add packages/thekselect-vue/tests/ThekSelect.test.ts
git commit -m "test(thekselect-vue): add failing ThekSelect.vue component tests"
```

---

## Task 12: Implement `ThekSelect.vue` component

**Files:**

- Create: `packages/thekselect-vue/src/ThekSelect.vue`
- Modify: `packages/thekselect-vue/src/index.ts`

- [ ] **Step 1: Create `packages/thekselect-vue/src/ThekSelect.vue`**

```vue
<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { ThekSelect, type ThekSelectConfig, type ThekSelectOption } from 'thekselect';

const props = defineProps<{
  modelValue?: string | string[];
  options?: ThekSelectOption[];
  multiple?: boolean;
  searchable?: boolean;
  disabled?: boolean;
  placeholder?: string;
  canCreate?: boolean;
  createText?: string;
  height?: number | string;
  debounce?: number;
  maxSelectedLabels?: number;
  displayField?: string;
  valueField?: string;
  maxOptions?: number | null;
  virtualize?: boolean;
  virtualItemHeight?: number;
  virtualOverscan?: number;
  virtualThreshold?: number;
  loadOptions?: ThekSelectConfig['loadOptions'];
  renderOption?: ThekSelectConfig['renderOption'];
  renderSelection?: ThekSelectConfig['renderSelection'];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string | string[] | undefined];
  change: [value: string | string[] | undefined];
  open: [];
  close: [];
  search: [query: string];
  tagAdded: [option: ThekSelectOption];
  tagRemoved: [option: ThekSelectOption];
  reordered: [options: ThekSelectOption[]];
}>();

const el = ref<HTMLDivElement | null>(null);
let instance: ThekSelect | null = null;

onMounted(() => {
  if (!el.value) return;

  instance = ThekSelect.init(el.value, {
    options: props.options,
    multiple: props.multiple,
    searchable: props.searchable,
    disabled: props.disabled,
    placeholder: props.placeholder,
    canCreate: props.canCreate,
    createText: props.createText,
    height: props.height,
    debounce: props.debounce,
    maxSelectedLabels: props.maxSelectedLabels,
    displayField: props.displayField,
    valueField: props.valueField,
    maxOptions: props.maxOptions,
    virtualize: props.virtualize,
    virtualItemHeight: props.virtualItemHeight,
    virtualOverscan: props.virtualOverscan,
    virtualThreshold: props.virtualThreshold,
    loadOptions: props.loadOptions,
    renderOption: props.renderOption,
    renderSelection: props.renderSelection
  });

  if (props.modelValue !== undefined) {
    instance.setValue(props.modelValue);
  }

  instance.on('change', (v) => {
    emit('update:modelValue', v as string | string[] | undefined);
    emit('change', v as string | string[] | undefined);
  });
  instance.on('open', () => emit('open'));
  instance.on('close', () => emit('close'));
  instance.on('search', (q) => emit('search', q as string));
  instance.on('tagAdded', (o) => emit('tagAdded', o as ThekSelectOption));
  instance.on('tagRemoved', (o) => emit('tagRemoved', o as ThekSelectOption));
  instance.on('reordered', (o) => emit('reordered', o as ThekSelectOption[]));
});

onUnmounted(() => {
  instance?.destroy();
  instance = null;
});

watch(
  () => props.modelValue,
  (v) => {
    if (instance && v !== undefined) instance.setValue(v, true);
  }
);

watch(
  () => props.height,
  (v) => {
    if (instance && v !== undefined) instance.setHeight(v);
  }
);

watch(
  () => props.maxOptions,
  (v) => {
    if (instance && v !== undefined) instance.setMaxOptions(v);
  }
);

watch(
  () => props.renderOption,
  (v) => {
    if (instance && v !== undefined) instance.setRenderOption(v);
  }
);
</script>

<template>
  <div ref="el" />
</template>
```

- [ ] **Step 2: Update `packages/thekselect-vue/src/index.ts`**

```ts
export { useThekSelect } from './composable';
export { default as ThekSelect } from './ThekSelect.vue';
```

- [ ] **Step 3: Run all tests and confirm they pass**

```bash
npm test -- --run
```

Expected: all core tests + all Vue wrapper tests pass.

- [ ] **Step 4: Commit**

```bash
git add packages/thekselect-vue/src/ThekSelect.vue packages/thekselect-vue/src/index.ts
git commit -m "feat(thekselect-vue): implement ThekSelect.vue component"
```

---

## Task 13: Verify the Vue package builds

**Files:** None

- [ ] **Step 1: Build the Vue package**

```bash
npm run build --workspace=packages/thekselect-vue
```

Expected: `packages/thekselect-vue/dist/thekselect-vue.js` and `packages/thekselect-vue/dist/index.d.ts` are created. No TypeScript errors.

If `vue-tsc` fails on missing `.vue` declaration types, add `"jsx": "preserve"` to `packages/thekselect-vue/tsconfig.json` compilerOptions and re-run.

- [ ] **Step 2: Verify pack output looks correct**

```bash
cd packages/thekselect-vue && npm pack --dry-run
```

Expected: output lists `dist/thekselect-vue.js` and `dist/index.d.ts`. No `src/` or `tests/` files included.

```bash
cd ../..
```

- [ ] **Step 3: Commit**

```bash
git add packages/thekselect-vue/
git commit -m "build(thekselect-vue): verify dist output and pack manifest"
```

---

## Self-Review Checklist

- [x] **Spec coverage — Monorepo structure:** Tasks 1–7 migrate the repo and update CI.
- [x] **Spec coverage — Component API:** Task 12 implements all props, all events, `v-model`, and runtime setters.
- [x] **Spec coverage — Composable API:** Task 10 implements `useThekSelect(el, options)` returning `{ instance, value }`.
- [x] **Spec coverage — Build config:** Task 8 scaffolds Vite library mode with ESM only, `vue` and `thekselect` as externals.
- [x] **Spec coverage — Publishing:** Task 7 CI update covers per-package matrix publish.
- [x] **Spec coverage — Init-time-only props documented:** The `.vue` component does not watch `multiple`, `searchable`, `disabled`, `canCreate`, `loadOptions` — consistent with spec.
- [x] **Type consistency:** `ThekSelectOption` and `ThekSelectConfig` imported from `thekselect` throughout, consistent across Tasks 9–12.
- [x] **No placeholders:** All steps have exact code.
