<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import {
  ThekSelect,
  type ThekSelectConfig,
  type ThekSelectOption,
} from 'thekselect';

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
const unsubscribers: Array<() => void> = [];

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
    renderSelection: props.renderSelection,
  });

  if (props.modelValue !== undefined) {
    instance.setValue(props.modelValue);
  }

  unsubscribers.push(
    instance.on('change', (v) => {
      emit('update:modelValue', v as string | string[] | undefined);
      emit('change', v as string | string[] | undefined);
    }),
    instance.on('open', () => emit('open')),
    instance.on('close', () => emit('close')),
    instance.on('search', (q) => emit('search', q as string)),
    instance.on('tagAdded', (o) => emit('tagAdded', o as ThekSelectOption)),
    instance.on('tagRemoved', (o) => emit('tagRemoved', o as ThekSelectOption)),
    instance.on('reordered', (o) => emit('reordered', o as ThekSelectOption[]))
  );
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
