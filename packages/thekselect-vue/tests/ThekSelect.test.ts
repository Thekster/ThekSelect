import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import ThekSelectComponent from '../src/ThekSelect.vue';

const mockUnsubscribe = vi.fn();
const mockInstance = {
  getValue: vi.fn<() => undefined>(() => undefined),
  setValue: vi.fn(),
  open: vi.fn(),
  close: vi.fn(),
  toggle: vi.fn(),
  setHeight: vi.fn(),
  setMaxOptions: vi.fn(),
  setRenderOption: vi.fn(),
  destroy: vi.fn(),
  on: vi.fn((_event: string, _cb: (v: unknown) => void) => mockUnsubscribe)
};

vi.mock('thekselect', () => ({
  ThekSelectDom: {
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

  it('calls ThekSelectDom.init with the element and props on mount', async () => {
    const { ThekSelectDom } = await import('thekselect');
    const wrapper = mount(ThekSelectComponent, {
      props: { options: [{ value: 'a', label: 'A' }], multiple: true },
      attachTo: document.body
    });
    await nextTick();

    expect(ThekSelectDom.init).toHaveBeenCalledOnce();
    expect(ThekSelectDom.init).toHaveBeenCalledWith(
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

  it('accepts number modelValue updates', async () => {
    const wrapper = mount(ThekSelectComponent, {
      props: { modelValue: 1 },
      attachTo: document.body
    });
    await nextTick();
    await wrapper.setProps({ modelValue: 2 });
    expect(mockInstance.setValue).toHaveBeenCalledWith(2, true);
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

  it('disables the core instance and renders loading UI when loading is true', async () => {
    const { ThekSelectDom } = await import('thekselect');
    const wrapper = mount(ThekSelectComponent, {
      props: { loading: true, disabled: false },
      attachTo: document.body
    });
    await nextTick();

    expect(ThekSelectDom.init).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({ disabled: true })
    );
    expect(wrapper.find('.thekselect-vue--loading').exists()).toBe(true);
    expect(wrapper.find('.thekselect-vue__overlay').exists()).toBe(true);
    wrapper.unmount();
  });

  it('exposes imperative methods', async () => {
    const wrapper = mount(ThekSelectComponent, { attachTo: document.body });
    await nextTick();

    (wrapper.vm as unknown as { open: () => void; close: () => void; toggle: () => void }).open();
    (wrapper.vm as unknown as { close: () => void }).close();
    (wrapper.vm as unknown as { toggle: () => void }).toggle();

    expect(mockInstance.open).toHaveBeenCalledOnce();
    expect(mockInstance.close).toHaveBeenCalledOnce();
    expect(mockInstance.toggle).toHaveBeenCalledOnce();
    wrapper.unmount();
  });
});
