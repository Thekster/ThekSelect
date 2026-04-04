import { describe, it, expect, vi } from 'vitest';
import { ThekSelect } from '../../src/core/thekselect';

describe('ThekSelect headless core', () => {
  it('can be instantiated without a DOM element', () => {
    const core = new ThekSelect({ options: [{ value: '1', label: 'One' }] });
    expect(core.getState().selectedValues).toEqual([]);
    core.destroy();
  });

  it('subscribe is notified on state change', () => {
    const core = new ThekSelect({ options: [{ value: '1', label: 'One' }] });
    const listener = vi.fn();
    core.subscribe(listener);
    core.open();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0].isOpen).toBe(true);
    core.destroy();
  });

  it('subscribe returns an unsubscribe function', () => {
    const core = new ThekSelect({ options: [{ value: '1', label: 'One' }] });
    const listener = vi.fn();
    const unsub = core.subscribe(listener);
    unsub();
    core.open();
    expect(listener).not.toHaveBeenCalled();
    core.destroy();
  });

  it('getState() returns a frozen object', () => {
    const core = new ThekSelect({ options: [] });
    expect(Object.isFrozen(core.getState())).toBe(true);
    core.destroy();
  });

  it('getFilteredOptions() filters by inputValue', () => {
    const core = new ThekSelect({
      options: [
        { value: '1', label: 'Apple' },
        { value: '2', label: 'Banana' }
      ]
    });
    // Directly set inputValue in state to test filtering without debounce
    (core as unknown as { stateManager: { setState: (s: object) => void } }).stateManager.setState({
      inputValue: 'app'
    });
    const filtered = core.getFilteredOptions();
    expect(filtered.length).toBe(1);
    expect(filtered[0].label).toBe('Apple');
    core.destroy();
  });

  it('open() and close() update isOpen in state', () => {
    const core = new ThekSelect({ options: [] });
    expect(core.getState().isOpen).toBe(false);
    core.open();
    expect(core.getState().isOpen).toBe(true);
    core.close();
    expect(core.getState().isOpen).toBe(false);
    core.destroy();
  });

  it('select() updates selectedValues', () => {
    const core = new ThekSelect({
      options: [{ value: '1', label: 'One' }]
    });
    core.select({ value: '1', label: 'One' });
    expect(core.getValue()).toBe('1');
    core.destroy();
  });

  it('select() in multiple mode accumulates values', () => {
    const core = new ThekSelect({
      multiple: true,
      options: [
        { value: '1', label: 'One' },
        { value: '2', label: 'Two' }
      ]
    });
    core.select({ value: '1', label: 'One' });
    core.select({ value: '2', label: 'Two' });
    expect(core.getValue()).toEqual(['1', '2']);
    core.destroy();
  });

  it('setValue() and getValue() work', () => {
    const core = new ThekSelect({
      options: [
        { value: '1', label: 'One' },
        { value: '2', label: 'Two' }
      ]
    });
    core.setValue('2');
    expect(core.getValue()).toBe('2');
    core.destroy();
  });

  it('on() emits change events', () => {
    const core = new ThekSelect({
      options: [{ value: '1', label: 'One' }]
    });
    const onChange = vi.fn();
    core.on('change', onChange);
    core.select({ value: '1', label: 'One' });
    expect(onChange).toHaveBeenCalledWith('1');
    core.destroy();
  });

  it('focusNext() and focusPrev() update focusedIndex', () => {
    const core = new ThekSelect({
      options: [
        { value: '1', label: 'One' },
        { value: '2', label: 'Two' }
      ]
    });
    core.open();
    expect(core.getState().focusedIndex).toBe(0);
    core.focusNext();
    expect(core.getState().focusedIndex).toBe(1);
    core.focusPrev();
    expect(core.getState().focusedIndex).toBe(0);
    core.destroy();
  });

  it('removeLastSelection() removes the last tag', () => {
    const core = new ThekSelect({
      multiple: true,
      options: [
        { value: '1', label: 'One', selected: true },
        { value: '2', label: 'Two', selected: true }
      ]
    });
    core.removeLastSelection();
    expect(core.getValue()).toEqual(['1']);
    core.destroy();
  });

  it('reorder() changes the order of selected values', () => {
    const core = new ThekSelect({
      multiple: true,
      options: [
        { value: '1', label: 'One', selected: true },
        { value: '2', label: 'Two', selected: true },
        { value: '3', label: 'Three', selected: true }
      ]
    });
    core.reorder(0, 2);
    expect(core.getValue()).toEqual(['2', '3', '1']);
    core.destroy();
  });

  it('ThekSelect.init() still returns a working instance', () => {
    document.body.innerHTML = '<div id="c"></div>';
    const el = document.getElementById('c') as HTMLElement;
    const ts = ThekSelect.init(el, { options: [{ value: '1', label: 'One' }] });
    expect(ts.getValue()).toBeUndefined();
    ts.setValue('1');
    expect(ts.getValue()).toBe('1');
    ts.destroy();
    document.body.innerHTML = '';
  });

  it('toggle() opens when closed and closes when open', () => {
    const core = new ThekSelect({ options: [] });
    expect(core.getState().isOpen).toBe(false);
    core.toggle();
    expect(core.getState().isOpen).toBe(true);
    core.toggle();
    expect(core.getState().isOpen).toBe(false);
    core.destroy();
  });

  it('create() adds a new option and selects it', () => {
    const core = new ThekSelect({ canCreate: true, options: [] });
    core.create('NewItem');
    expect(core.getValue()).toBe('NewItem');
    expect(core.getState().options.some((o) => o.label === 'NewItem')).toBe(true);
    core.destroy();
  });

  it('search() updates inputValue in state', () => {
    const core = new ThekSelect({
      options: [{ value: '1', label: 'Apple' }]
    });
    core.search('app');
    expect(core.getState().inputValue).toBe('app');
    core.destroy();
  });

  it('selectFocused() selects the currently focused option', () => {
    const core = new ThekSelect({
      options: [
        { value: '1', label: 'One' },
        { value: '2', label: 'Two' }
      ]
    });
    core.open(); // sets focusedIndex to 0
    core.focusNext(); // moves to index 1
    core.selectFocused();
    expect(core.getValue()).toBe('2');
    core.destroy();
  });

  it('getSelectedOptions() returns the selected option object', () => {
    const core = new ThekSelect({
      options: [{ value: '1', label: 'One' }]
    });
    core.select({ value: '1', label: 'One' });
    const selected = core.getSelectedOptions();
    expect(selected).toMatchObject({ value: '1', label: 'One' });
    core.destroy();
  });

  it('setMaxOptions() limits the number of filtered options', () => {
    const core = new ThekSelect({
      options: [
        { value: '1', label: 'One' },
        { value: '2', label: 'Two' },
        { value: '3', label: 'Three' }
      ]
    });
    expect(core.getFilteredOptions().length).toBe(3);
    core.setMaxOptions(1);
    expect(core.getFilteredOptions().length).toBe(1);
    core.destroy();
  });
});
