import { describe, it, expect, vi } from 'vitest';
import { StateManager } from '../../src/core/state';

describe('StateManager', () => {
  it('should initialize with initial state', () => {
    const initialState = { count: 0 };
    const sm = new StateManager(initialState);
    expect(sm.getState()).toEqual(initialState);
  });

  it('should update state and notify listeners', () => {
    const sm = new StateManager({ count: 0 });
    const listener = vi.fn();
    sm.subscribe(listener);

    sm.setState({ count: 1 });
    expect(sm.getState().count).toBe(1);
    expect(listener).toHaveBeenCalledWith({ count: 1 });
  });

  it('should not notify if state has not changed', () => {
    const sm = new StateManager({ count: 0 });
    const listener = vi.fn();
    sm.subscribe(listener);

    sm.setState({ count: 0 });
    expect(listener).not.toHaveBeenCalled();
  });

  it('getState() returns a frozen object', () => {
    const sm = new StateManager({ count: 0 });
    const state = sm.getState();
    expect(Object.isFrozen(state)).toBe(true);
  });

  it('forceNotify() calls listeners even when state is unchanged', () => {
    const sm = new StateManager({ count: 0 });
    const listener = vi.fn();
    sm.subscribe(listener);
    sm.forceNotify();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('getState() returns a deeply frozen object — nested plain objects are frozen', () => {
    const sm = new StateManager<{ count: number; meta: { x: number } }>({
      count: 0,
      meta: { x: 1 }
    });
    const state = sm.getState();
    expect(Object.isFrozen(state)).toBe(true);
    expect(Object.isFrozen(state.meta)).toBe(true);
    // Attempt mutation should throw in strict mode (vitest runs in strict mode)
    expect(() => {
      (state.meta as { x: number }).x = 99;
    }).toThrow();
  });
});
