<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import {
  ThekSelect,
  ThekSelectDom,
  type ThekSelectHandle,
  type ThekSelectConfig,
  type ThekSelectOption,
  type ThekSelectPrimitive,
  type ThekSelectValue
} from 'thekselect';

const props = defineProps<{
  modelValue?: ThekSelectPrimitive | ThekSelectPrimitive[] | null;
  options?: ThekSelectOption[];
  multiple?: boolean;
  searchable?: boolean;
  hideSearch?: boolean;
  disabled?: boolean;
  loading?: boolean;
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
  'update:modelValue': [value: ThekSelectValue];
  change: [value: ThekSelectValue];
  open: [];
  close: [];
  search: [query: string];
  tagAdded: [option: ThekSelectOption];
  tagRemoved: [option: ThekSelectOption];
  reordered: [values: ThekSelectPrimitive[]];
}>();

const root = ref<HTMLDivElement | null>(null);
const el = ref<HTMLDivElement | null>(null);
let instance: ThekSelectHandle | null = null;
const unsubscribers: Array<() => void> = [];

function setLoadingState(): void {
  if (!root.value) return;
  const isBusy = !!props.loading;
  root.value.classList.toggle('thekselect-vue--loading', isBusy);
  if (isBusy) {
    root.value.setAttribute('aria-busy', 'true');
  } else {
    root.value.removeAttribute('aria-busy');
  }
}

function open(): void {
  instance?.open();
}

function close(): void {
  instance?.close();
}

function toggle(): void {
  instance?.toggle();
}

function getValue(): ThekSelectValue {
  return instance?.getValue();
}

function setValue(value: ThekSelectPrimitive | ThekSelectPrimitive[], silent = false): void {
  instance?.setValue(value, silent);
}

defineExpose({
  open,
  close,
  toggle,
  getValue,
  setValue,
  instance: () => instance
});

onMounted(() => {
  if (!el.value) return;

  instance = ThekSelectDom.init(el.value, {
    options: props.options,
    multiple: props.multiple,
    searchable: props.searchable,
    hideSearch: props.hideSearch,
    disabled: props.disabled || props.loading,
    placeholder: props.placeholder,
    canCreate: props.canCreate,
    createText: props.createText,
    height: props.height,
    debounce: props.debounce,
    maxSelectedLabels: props.maxSelectedLabels,
    displayField: props.displayField as (keyof ThekSelectOption & string) | undefined,
    valueField: props.valueField as (keyof ThekSelectOption & string) | undefined,
    maxOptions: props.maxOptions,
    virtualize: props.virtualize,
    virtualItemHeight: props.virtualItemHeight,
    virtualOverscan: props.virtualOverscan,
    virtualThreshold: props.virtualThreshold,
    loadOptions: props.loadOptions,
    renderOption: props.renderOption,
    renderSelection: props.renderSelection
  });

  if (props.modelValue != null) {
    instance.setValue(props.modelValue);
  }

  unsubscribers.push(
    instance.on('change', (v: ThekSelectValue) => {
      emit('update:modelValue', v as ThekSelectValue);
      emit('change', v as ThekSelectValue);
    }),
    instance.on('open', () => emit('open')),
    instance.on('close', () => emit('close')),
    instance.on('search', (q: string) => emit('search', q as string)),
    instance.on('tagAdded', (o: ThekSelectOption) => emit('tagAdded', o as ThekSelectOption)),
    instance.on('tagRemoved', (o: ThekSelectOption) => emit('tagRemoved', o as ThekSelectOption)),
    instance.on('reordered', (o: ThekSelectPrimitive[]) =>
      emit('reordered', o as ThekSelectPrimitive[])
    )
  );

  setLoadingState();
});

onUnmounted(() => {
  for (const off of unsubscribers) off();
  unsubscribers.length = 0;
  instance?.destroy();
  instance = null;
});

watch(
  () => props.modelValue,
  (v) => {
    if (!instance) return;
    // v === undefined means the consumer cleared the binding — treat as deselect.
    instance.setValue(v ?? [], true);
  }
);

watch(
  () => props.options,
  (v) => {
    if (instance && v !== undefined) instance.setOptions(v);
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

watch(
  () => props.disabled,
  () => {
    instance?.setDisabled(!!(props.disabled || props.loading));
  }
);

watch(
  () => props.loading,
  () => {
    setLoadingState();
    instance?.setDisabled(!!(props.disabled || props.loading));
  },
  { immediate: true }
);
</script>

<template>
  <div ref="root" class="thekselect-vue">
    <div ref="el" />
    <div v-if="loading" class="thekselect-vue__overlay" aria-hidden="true">
      <slot name="loading-indicator">
        <span class="thekselect-vue__loading-text">Loading...</span>
      </slot>
    </div>
  </div>
</template>

<style scoped>
.thekselect-vue {
  position: relative;
}

.thekselect-vue__overlay {
  position: absolute;
  inset-inline-end: 0.75rem;
  inset-block-start: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  display: flex;
  align-items: center;
}

.thekselect-vue__loading-text {
  font-size: 0.75rem;
  color: var(--thek-placeholder, #6b7280);
}
</style>
