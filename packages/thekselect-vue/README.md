# thekselect-vue

Vue 3 wrapper for [ThekSelect](https://github.com/Thekster/ThekSelect) — a lightweight, framework-agnostic select with search, multi-select, drag-and-drop tag reordering, and virtualization.

**[Live showcase →](https://thekster.github.io/ThekSelect/)**

## Installation

```bash
npm install thekselect thekselect-vue
```

Import a theme from the core package:

```js
import 'thekselect/css/base.css';
```

Named theme files such as `thekselect/css/dark.css` include the full component stylesheet, but they only activate their token overrides when the page root has the matching `data-thek-theme` attribute:

```html
<html data-thek-theme="dark"></html>
```

## Component

```vue
<script setup>
import { ref } from 'vue';
import ThekSelect from 'thekselect-vue'; // default export, or: import { ThekSelect } from 'thekselect-vue'
import 'thekselect/css/base.css';

const value = ref(null);
const options = [
  { value: 'react', label: 'React' },
  { value: 'vue', label: 'Vue' },
  { value: 'svelte', label: 'Svelte' }
];
</script>

<template>
  <ThekSelect v-model="value" :options="options" placeholder="Pick a framework..." />
</template>
```

### Multi-select

```vue
<ThekSelect v-model="values" :options="options" :multiple="true" />
```

### Remote async options

```vue
<ThekSelect v-model="value" :load-options="async (q) => fetchUsers(q)" :searchable="true" />
```

### Large datasets (virtualization)

```vue
<ThekSelect
  v-model="value"
  :options="hugeList"
  :virtualize="true"
  :virtual-threshold="80"
  :virtual-item-height="40"
/>
```

## Props

All [`ThekSelectConfig`](https://github.com/Thekster/ThekSelect#configuration) options are available as props, plus `modelValue` for `v-model`.

| Prop                | Type                                                  | Default              | Description                                                                 |
| ------------------- | ----------------------------------------------------- | -------------------- | --------------------------------------------------------------------------- |
| `modelValue`        | `string \| number \| Array<string \| number> \| null` | —                    | Selected value(s) for `v-model`; `null` or `undefined` clears the selection |
| `options`           | `ThekSelectOption[]`                                  | `[]`                 | Option list                                                                 |
| `multiple`          | `boolean`                                             | `false`              | Enable multi-select                                                         |
| `searchable`        | `boolean`                                             | `true`               | Enable search input                                                         |
| `disabled`          | `boolean`                                             | `false`              | Disable interaction                                                         |
| `loading`           | `boolean`                                             | `false`              | Disables interaction and shows a lightweight overlay/slot                   |
| `placeholder`       | `string`                                              | `'Select...'`        | Placeholder text                                                            |
| `canCreate`         | `boolean`                                             | `false`              | Allow creating new options                                                  |
| `createText`        | `string`                                              | `"Create '{%t}'..."` | Create row label template                                                   |
| `height`            | `number \| string`                                    | `40`                 | Control height (`number` = px)                                              |
| `debounce`          | `number`                                              | `300`                | Debounce delay for `loadOptions`; `0` still defers to the next timer tick   |
| `maxSelectedLabels` | `number`                                              | `3`                  | Max visible tags before summary                                             |
| `displayField`      | `string`                                              | `'label'`            | Field used for display text                                                 |
| `valueField`        | `string`                                              | `'value'`            | Field used as value key                                                     |
| `maxOptions`        | `number \| null`                                      | `null`               | Limit rendered dropdown items                                               |
| `virtualize`        | `boolean`                                             | `false`              | Enable virtualized rendering                                                |
| `virtualItemHeight` | `number`                                              | `40`                 | Row height for virtualization                                               |
| `virtualOverscan`   | `number`                                              | `4`                  | Extra rows above/below viewport                                             |
| `virtualThreshold`  | `number`                                              | `80`                 | Min options before virtualization                                           |
| `loadOptions`       | `(query) => Promise<ThekSelectOption[]>`              | —                    | Async option loader                                                         |
| `renderOption`      | `(option) => string \| HTMLElement`                   | —                    | Custom dropdown renderer                                                    |
| `renderSelection`   | `(option) => string \| HTMLElement`                   | —                    | Custom selected-item renderer                                               |

> **Init-time props:** `multiple`, `searchable`, `disabled`, `canCreate`, `loadOptions`, and other structural props are read once at mount. Changing them after mount has no effect. To reconfigure, destroy and reinitialize the component (e.g. with a `:key` change). Props with runtime setters (`modelValue`, `height`, `maxOptions`, `renderOption`) update the instance reactively.

> **TypeScript limitation:** Vue SFC props cannot carry the core library's generic `T` through `displayField`, `valueField`, or the exposed `instance` type. If you use a custom option shape, the core package keeps the stronger typing (`ThekSelect.init<MyOption>(...)`), but the Vue wrapper currently treats those prop names as plain strings and may require local casts around wrapper refs or callbacks.

## Events

| Event               | Payload                                                    | Description                                     |
| ------------------- | ---------------------------------------------------------- | ----------------------------------------------- |
| `update:modelValue` | `string \| number \| Array<string \| number> \| undefined` | Emitted on selection change (used by `v-model`) |
| `change`            | `string \| number \| Array<string \| number> \| undefined` | Selection changed                               |
| `open`              | —                                                          | Dropdown opened                                 |
| `close`             | —                                                          | Dropdown closed                                 |
| `search`            | `string`                                                   | Search input changed                            |
| `tagAdded`          | `ThekSelectOption`                                         | Tag added in multi-select                       |
| `tagRemoved`        | `ThekSelectOption`                                         | Tag removed in multi-select                     |
| `reordered`         | `Array<string \| number>`                                  | Selected values reordered by drag-and-drop      |

## Exposed Methods

Template refs expose the underlying imperative API:

```vue
<script setup lang="ts">
import { useTemplateRef } from 'vue';
import ThekSelect from 'thekselect-vue';

const selectRef = useTemplateRef<InstanceType<typeof ThekSelect>>('select');

function openSelect() {
  selectRef.value?.open();
}
</script>

<template>
  <ThekSelect ref="select" />
</template>
```

Available methods: `open()`, `close()`, `toggle()`, `getValue()`, `setValue(value, silent?)`, `setDisabled(disabled)`.

## Loading Slot

You can replace the default loading overlay without wrapping the component:

```vue
<ThekSelect :loading="loading">
  <template #loading-indicator>
    <i class="fa-solid fa-circle-notch fa-spin" />
  </template>
</ThekSelect>
```

## Composable

For headless or programmatic control, use `useThekSelect` directly:

```vue
<script setup>
import { ref } from 'vue';
import { useThekSelect } from 'thekselect-vue';
import 'thekselect/css/base.css';

const el = ref(null);
const { instance, value } = useThekSelect(el, {
  options: [
    { value: 'a', label: 'Option A' },
    { value: 'b', label: 'Option B' }
  ],
  multiple: true
});

function selectAll() {
  instance.value?.setValue(['a', 'b']);
}
</script>

<template>
  <div ref="el" />
  <button @click="selectAll">Select all</button>
</template>
```

### `useThekSelect(el, options)`

| Parameter | Type                       | Description             |
| --------- | -------------------------- | ----------------------- |
| `el`      | `Ref<HTMLElement \| null>` | Element ref to mount on |
| `options` | `ThekSelectConfig`         | Init-time configuration |

**Returns:**

| Property   | Type                                   | Description                                                |
| ---------- | -------------------------------------- | ---------------------------------------------------------- |
| `value`    | `Ref<string \| string[] \| undefined>` | Reactive selected value, kept in sync with `change` events |
| `instance` | `ShallowRef<ThekSelect \| null>`       | Raw ThekSelect instance for calling methods directly       |

## CSS Themes

```js
import 'thekselect/css/base.css'; // system theme (light + auto dark)
import 'thekselect/css/dark.css';
import 'thekselect/css/forest.css';
import 'thekselect/css/red.css';
import 'thekselect/css/blue.css';
import 'thekselect/css/gray.css';
import 'thekselect/css/bootstrap.css';
import 'thekselect/css/tailwind.css';
import 'thekselect/css/material.css';
```

`base.css` is the system theme. Named themes require the matching `data-thek-theme` attribute on `<html>` to activate their token overrides.

Customize with CSS variables:

```css
:root {
  --thek-primary: #1d4ed8;
  --thek-border-radius: 12px;
}
```

## License

MIT
