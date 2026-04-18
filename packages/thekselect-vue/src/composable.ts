import { ref, shallowRef, onMounted, onUnmounted, type Ref } from 'vue';
import {
  ThekSelect,
  ThekSelectDom,
  type ThekSelectHandle,
  type ThekSelectConfig,
  type ThekSelectValue
} from 'thekselect';

export function useThekSelect(
  el: Ref<HTMLElement | null>,
  // options is intentionally read once at mount; it is not reactive.
  // To change configuration after mount, call instance.value directly.
  options: ThekSelectConfig = {}
) {
  const instance = shallowRef<ThekSelectHandle | null>(null);
  const value = ref<ThekSelectValue>(undefined);
  let off: (() => void) | null = null;

  onMounted(() => {
    if (!el.value) return;
    const ts = ThekSelectDom.init(el.value, options);
    instance.value = ts;
    value.value = ts.getValue() as ThekSelectValue;
    off = ts.on('change', (v: ThekSelectValue) => {
      value.value = v as ThekSelectValue;
    });
  });

  onUnmounted(() => {
    off?.();
    off = null;
    instance.value?.destroy();
    instance.value = null;
  });

  return { instance, value };
}
