import { describe, it, expect, vi, beforeEach } from 'vitest';
import { defineComponent, ref, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { useThekSelect } from '../src/composable';

const mockUnsubscribe = vi.fn();
const mockInstance = {
  getValue: vi.fn<() => undefined>(() => undefined),
  setValue: vi.fn(),
  destroy: vi.fn(),
  on: vi.fn((_event: string, _cb: (v: unknown) => void) => mockUnsubscribe),
};

vi.mock('thekselect', () => ({
  ThekSelect: {
    init: vi.fn(() => mockInstance),
  },
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
      template: '<div ref="el" />',
    });

    const wrapper = mount(TestComponent, { attachTo: document.body });
    await nextTick();

    expect(ThekSelect.init).toHaveBeenCalledOnce();
    expect(ThekSelect.init).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      { multiple: true }
    );
    wrapper.unmount();
  });

  it('calls destroy on unmount', async () => {
    const TestComponent = defineComponent({
      setup() {
        const el = ref<HTMLElement | null>(null);
        useThekSelect(el);
        return { el };
      },
      template: '<div ref="el" />',
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
      template: '<div ref="el" />',
    });

    const wrapper = mount(TestComponent, { attachTo: document.body });
    await nextTick();

    changeCallback?.('option-a');
    await nextTick();

    expect((wrapper.vm as { value: unknown }).value).toBe('option-a');
    wrapper.unmount();
  });

  it('does not initialize when the element ref is null', async () => {
    const { ThekSelect } = await import('thekselect');
    const TestComponent = defineComponent({
      setup() {
        const el = ref<HTMLElement | null>(null);
        // el is never bound to a DOM element — intentionally null at mount
        useThekSelect(el);
        return {};
      },
      template: '<div />',
    });

    const wrapper = mount(TestComponent, { attachTo: document.body });
    await nextTick();

    expect(ThekSelect.init).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('returns the raw instance ref', async () => {
    const TestComponent = defineComponent({
      setup() {
        const el = ref<HTMLElement | null>(null);
        const { instance } = useThekSelect(el);
        return { el, instance };
      },
      template: '<div ref="el" />',
    });

    const wrapper = mount(TestComponent, { attachTo: document.body });
    await nextTick();

    expect((wrapper.vm as { instance: unknown }).instance).toBe(mockInstance);
    wrapper.unmount();
  });
});
