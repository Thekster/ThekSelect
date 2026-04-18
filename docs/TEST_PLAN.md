# ThekSelect Test Plan

## Goal

Raise confidence in ThekSelect as a controlled, product-grade select stack without overstating it as a fully battle-tested general-purpose replacement for older ecosystem libraries.

The plan below focuses on the risk areas that matter most for browser forms, accessibility, async behavior, and framework cleanup.

## Current Coverage

Core coverage already exists for:

- State manager, defaults, types, headless methods, and event typing
- Keyboard behavior and ARIA state updates
- Remote loading, abort handling, and error propagation
- Tag creation, drag-and-drop reorder, render hooks, and virtualization
- DOM integration, label association, dropdown flip logic, and regression fixes
- Vue wrapper mounting, `v-model` sync, prop mapping, and composable lifecycle

Relevant suites today:

- `packages/thekselect/tests/accessibility/keyboard.test.ts`
- `packages/thekselect/tests/accessibility/aria-state.test.ts`
- `packages/thekselect/tests/features/remote.test.ts`
- `packages/thekselect/tests/features/virtualization.test.ts`
- `packages/thekselect/tests/features/dnd.test.ts`
- `packages/thekselect/tests/integration/thekselect.integration.test.ts`
- `packages/thekselect/tests/regressions/*.test.ts`
- `packages/thekselect-vue/tests/ThekSelect.test.ts`
- `packages/thekselect-vue/tests/composable.test.ts`

## Remaining Gaps

The highest-value gaps are:

- Keyboard completeness: `Tab`, `Home`, `End`, and more exact focus/selection edge cases
- Screen reader contract: clearer assertions around combobox, listbox, active descendant, live region, and required/described-by behavior
- Async race coverage: out-of-order remote responses, repeated open/close during fetch, and selection persistence across remote result replacement
- IME and Turkish text search behavior
- Overflow and container behavior: modal, nested scroll container, and viewport edge positioning
- Large dataset confidence beyond unit-level virtualization checks
- Form compatibility: native submit payloads, reset behavior, and multiple instances in the same form
- Vue cleanup resilience under prop churn, remounts, and parent-controlled destruction
- Build compatibility checks for packaging flows that matter to consumers

## Phase Plan

### Phase 1: Interaction correctness

Add tests for:

- `Tab` behavior when dropdown is open vs closed
- `Home` and `End` navigation in searchable and non-searchable modes
- Enter/escape behavior after create-row focus and after disabled-option skips
- Multiple-instance keyboard isolation on one page

Suggested locations:

- `packages/thekselect/tests/accessibility/keyboard.test.ts`
- `packages/thekselect/tests/regressions/`

### Phase 2: Accessibility contract

Add tests for:

- Stable `role="combobox"` / `role="listbox"` / `role="option"` relationships
- `aria-expanded`, `aria-controls`, `aria-activedescendant`, and `aria-selected` transitions
- `aria-required` and `aria-describedby` propagation from the original element
- Live-region announcements for select, remove, and create flows

Suggested locations:

- `packages/thekselect/tests/accessibility/aria-state.test.ts`
- `packages/thekselect/tests/accessibility/label-association.test.ts`

### Phase 3: Async and remote robustness

Add tests for:

- Slower earlier request resolving after a newer request without overwriting newer state
- Destroy during in-flight request in Vue wrapper usage
- Selected values surviving remote result replacement
- Clear-query recovery to base options after prior remote failures

Suggested locations:

- `packages/thekselect/tests/features/remote.test.ts`
- `packages/thekselect/tests/regressions/`
- `packages/thekselect-vue/tests/ThekSelect.test.ts`

### Phase 4: Search and locale behavior

Add tests for:

- Turkish casing cases such as `I`, `İ`, `i`, `ı`
- IME composition flow so filtering does not misfire during composition
- Search behavior with custom `displayField`

Suggested locations:

- `packages/thekselect/tests/features/`
- `packages/thekselect/tests/regressions/`

### Phase 5: Container and layout edge cases

Add tests for:

- Dropdown positioning inside nested scroll containers
- Modal-like containers with overflow clipping
- Reposition behavior after resize plus scroll while open
- Virtualized list scroll stability while filtering

Suggested locations:

- `packages/thekselect/tests/accessibility/dropdown-flip.test.ts`
- `packages/thekselect/tests/features/virtualization.test.ts`
- `packages/thekselect/tests/integration/`

### Phase 6: Forms and framework lifecycle

Add tests for:

- Native form submit values for single and multiple modes
- Form reset restoring original selection state
- Vue remount with `:key` and parent-driven unmount while remote loading
- Multiple wrapper instances cleaning up listeners independently

Suggested locations:

- `packages/thekselect/tests/integration/thekselect.integration.test.ts`
- `packages/thekselect-vue/tests/ThekSelect.test.ts`
- `packages/thekselect-vue/tests/composable.test.ts`

## Exit Criteria

Before positioning ThekSelect more aggressively as a general-purpose library, the minimum target should be:

- All Phase 1 through Phase 4 tests implemented
- At least one integration test for form submit/reset behavior
- At least one Vue unmount-during-fetch regression test
- The standard validation gate passing:
  - `npm run format:check`
  - `npm run lint`
  - `npm test -- --run`
  - `npm run build`

## Working Rule

When a bug is found, add a focused regression in `packages/thekselect/tests/regressions/` unless the failure is already better expressed by expanding an existing feature or accessibility suite.
