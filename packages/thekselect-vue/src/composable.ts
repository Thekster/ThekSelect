import { ref, shallowRef, onMounted, onUnmounted, type Ref } from 'vue';
import { ThekSelect, type ThekSelectConfig } from 'thekselect';

export function useThekSelect(
  el: Ref<HTMLElement | null>,
  options: ThekSelectConfig = {}
) {
  const instance = shallowRef<ThekSelect | null>(null);
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
