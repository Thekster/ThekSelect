import { describe, it, expect, vi } from 'vitest';
import { StateManager } from '../src/core/state';

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
});
