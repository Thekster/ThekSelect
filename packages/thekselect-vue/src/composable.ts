import { ref, shallowRef, onMounted, onUnmounted, type Ref } from 'vue';
import { ThekSelect, type ThekSelectConfig } from 'thekselect';

export function useThekSelect(
  el: Ref<HTMLElement | null>,
  // options is intentionally read once at mount; it is not reactive.
  // To change configuration after mount, call instance.value directly.
  options: ThekSelectConfig = {}
) {
  // ThekSelectHandle is not exported from thekselect; ThekSelect is the instance type.
  const instance = shallowRef<ThekSelect | null>(null);
  const value = ref<string | string[] | undefined>(undefined);
  let off: (() => void) | null = null;

  onMounted(() => {
    if (!el.value) return;
    const ts = ThekSelect.init(el.value, options);
    instance.value = ts;
    value.value = ts.getValue() as string | string[] | undefined;
    off = ts.on('change', (v) => {
      value.value = v as string | string[] | undefined;
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
