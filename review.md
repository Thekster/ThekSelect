# Verdict

ThekSelect claims to be a production-ready, highly accessible, zero-dependency headless-ish select component. In reality, it is a deceptively acceptable prototype hiding profound architectural flaws. While its packaging, monorepo structure, and high test count provide a veneer of competence, the core implementation is structurally weak. It undermines TypeScript's generic safety, swallows runtime execution errors, violates WAI-ARIA combobox specs, and relies on volatile DOM indices for state updates and severe DOM mutation for virtualization.

# Executive Damage Report

Overall rating: 3/10
Production readiness: Barely
API design: 5/10
Architecture: 3/10
Type safety: 2/10
Accessibility: 4/10
Performance: 3/10
Test quality: 5/10
Documentation: 7/10
Maintenance risk: High

# What It Claims To Be vs What It Actually Is

**Claim:** "A browser select library with a reusable core and themes... accessible [and] WAI-ARIA compliant."
**Reality:** A library that places ARIA roles on the wrong elements, creating a disjointed screen reader experience that technically passes automated lints but fails functional ARIA combobox requirements.

**Claim:** "Type-safe generics."
**Reality:** Type safety is cosmetically circumvented at the foundational interface level (`[key: string]: unknown` on `ThekSelectOption`), rendering the generic parameter `T` mostly useless outside of the `data` field.

**Claim:** "Virtualized option rendering for large lists."
**Reality:** Pseudo-virtualization that constantly mutates the DOM tree via repetitive element creation/destruction and DOM injection on high-frequency scroll events without adequate stable node recycling.

# Top Findings

### 1. Generic Type Evasion via Index Signature
**Severity:** SEV-2
**Status:** VERIFIED
**Why this matters:** The entire point of using generics for an option type is to enforce compile-time safety on custom fields.
**Exact evidence:** `packages/thekselect/src/core/types.ts` defines `ThekSelectOption<T>` with `[key: string]: unknown`.
**Real-world consequence:** Developers will assume their custom options are strictly typed when passed through the library, but any property access or typo on the option outside of strictly defined fields will silently be allowed by the compiler, laundering `unknown` types into the application.
**What competent implementation would do instead:** Remove the index signature. Force users to place arbitrary data strictly inside the `data: T` property, or use mapped types (`& Record<string, any>`) only when explicitly requested.

### 2. Silent Error Suppression in Event Emitter
**Severity:** SEV-1
**Status:** VERIFIED
**Why this matters:** A UI library should never swallow application errors.
**Exact evidence:** `packages/thekselect/src/core/event-emitter.ts` wraps listener execution in a `try/catch` and only logs to `console.error`.
**Real-world consequence:** If a consumer's `change` event handler throws an exception (e.g., trying to update application state), ThekSelect catches the error, logs it, and continues execution. The application state silently desyncs, and global error tracking (like Sentry) may never catch it because the error didn't bubble up.
**What competent implementation would do instead:** Allow the error to throw. If isolation is strictly required, use `setTimeout(() => { throw err; }, 0)` to guarantee the error surfaces to the global context while still allowing subsequent library listeners to fire.

### 3. WAI-ARIA Combobox Violations
**Severity:** SEV-2
**Status:** VERIFIED
**Why this matters:** Accessibility is a primary marketed feature, but the implementation violates ARIA 1.2 combobox authoring practices.
**Exact evidence:** `packages/thekselect/src/core/renderer/dom-assembly.ts` sets `role="combobox"` directly on the `<input>` element when searchable.
**Real-world consequence:** A combobox role should be placed on an element that *contains* the input, or the input itself must `aria-owns` or `aria-controls` the listbox correctly according to modern specs. The current implementation places `role="combobox"` on the input while lacking a proper relationship to the popup wrapper, meaning screen readers may fail to announce the expansion state or listbox bounds correctly.
**What competent implementation would do instead:** Place `role="combobox"` on the wrapping container (`.thek-control`), ensure `aria-expanded` is there, and place `role="textbox"` on the actual input, using `aria-controls` linking to the listbox.

### 4. Severe DOM Thrashing During Virtualization
**Severity:** SEV-2
**Status:** VERIFIED
**Why this matters:** Virtualization exists to *prevent* performance issues, but this implementation does heavy DOM mutation inside scroll event callbacks.
**Exact evidence:** `packages/thekselect/src/core/renderer/options-renderer.ts` removes classes, creates spacer elements, and injects/removes actual `<li>` nodes dynamically during scroll inside `renderOptionsContent`.
**Real-world consequence:** Scrolling rapidly will cause intense layout thrashing and garbage collection spikes. The browser has to recalculate styles repeatedly because nodes are being violently evicted and recreated.
**What competent implementation would do instead:** Use a fixed pool of DOM nodes that are absolute-positioned. Update their `transform: translateY()` and `textContent` as the user scrolls, avoiding node destruction entirely.

### 5. Volatile State Dependency in Drag and Drop
**Severity:** SEV-3
**Status:** VERIFIED
**Why this matters:** Drag and drop reordering relies on DOM queries instead of internal state representation.
**Exact evidence:** `packages/thekselect/src/core/renderer/dom-assembly.ts` derives indices using `Array.from(selectionContainer.querySelectorAll('.thek-tag[data-value]')).map(item => item.dataset.value)`.
**Real-world consequence:** If the DOM is partially re-rendered or out of sync during a rapid drag operation, the `indexOf` lookup yields the wrong bounds, leading to state corruption and incorrect tag ordering.
**What competent implementation would do instead:** The DOM drag events should pass the dragged `id` or value up to the orchestrator, and the core logic should derive `fromIndex` and `toIndex` strictly from the `StateManager`'s frozen `selectedValues` array.

# Full Audit

## Repository Structure & Packaging
The migration to an npm workspace monorepo is well executed. However, `package.json` exports are technically fragile. While they correctly use conditional exports (`import`, `require`), the TypeScript definitions `types: "./dist/index.d.ts"` are grouped without specifying subpaths safely. Furthermore, distributed CSS themes lack proper declaration maps.

## Public API & Internal Architecture
The architecture heavily promotes pure functions and a frozen state tree via `StateManager`, which is excellent. However, the DOM Renderer (`DomRenderer`) violates its role as a pure functional orchestrator by maintaining its own isolated state (`lastState`, `lastFilteredOptions`) to optimize scroll handlers. This splits the source of truth between the `StateManager` and the `DomRenderer`.

## Code Quality & Type Safety
The code quality is clean but deceptive. As noted in Top Findings, the `ThekSelectOption<T>` interface intentionally undermines TypeScript's strictness. By adding `[key: string]: unknown`, the library ensures it won't throw compilation errors when mapping custom `displayField`s, but entirely destroys the ability to use `T` to guarantee option object shapes.

## DOM/Event Correctness
The `GlobalEventManager` pattern is an intelligent way to prevent event listener accumulation. However, ThekSelect relies on `requestAnimationFrame` to throttle scroll and resize events. If a user resizes or scrolls on a high-refresh-rate monitor, this still fires up to 144 times a second, triggering `positionDropdown()`, causing synchronous layout recalculations (`getBoundingClientRect`).

## Accessibility
Accessibility is claimed but flawed. Beyond the combobox misplacement, the library relies on visually hidden elements (`display: none` via `hidden=true`) that toggle visibility. The `aria-activedescendant` is updated manually, but the focus management during search-debounce cycles can cause the active descendant to desync from the actual visual focus if the network response is delayed.

## Tests
The test suite is extensive (205 tests) and runs via Vitest/JSDOM. However, JSDOM does not render layout. Thus, any tests verifying "dropdown positioning" or "virtualization scrolling" are effectively testing mocked math, not actual browser layout thrashing. The edge-cases test explicitly captures the throwing event listener error but merely expects it not to crash the suite, normalizing the flawed error-swallowing behavior.

## CI/Release Hygiene
The release checks (`npm run release:check`) are standard but lack actual runtime gating on PRs. There is no e2e browser testing (Playwright/Cypress) to verify the component actually works in a real DOM environment, heavily relying on JSDOM.

# Evidence Ledger
*   `packages/thekselect/src/core/types.ts`: Verifies `[key: string]: unknown` evasion.
*   `packages/thekselect/src/core/event-emitter.ts`: Verifies `try-catch` swallowing of listener errors.
*   `packages/thekselect/src/core/renderer/dom-assembly.ts`: Verifies `role="combobox"` placement and volatile drag-and-drop DOM queries.
*   `packages/thekselect/src/core/renderer/options-renderer.ts`: Verifies DOM node eviction during scroll virtualization.
*   `packages/thekselect/tests/regressions/edge-cases.test.ts`: Verifies tests knowingly expect and ignore swallowed exceptions.

# Blocking Review Comments

1.  **File:** `packages/thekselect/src/core/types.ts`
    **Comment:** "Remove the `[key: string]: unknown` index signature from `ThekSelectOption`. If consumers need arbitrary fields, they must explicitly define their generic type `T` to allow it, or use the `data` payload. Do not launder unknown types through our API."

2.  **File:** `packages/thekselect/src/core/event-emitter.ts`
    **Comment:** "Do not swallow consumer errors. Remove the `try/catch` wrapper in the `emit` loop. If you must guarantee all listeners fire regardless of previous listener failures, wrap the listener execution in `setTimeout(..., 0)` so the error bubbles up to the global context and triggers monitoring tools."

3.  **File:** `packages/thekselect/src/core/renderer/dom-assembly.ts`
    **Comment:** "Your drag-and-drop logic relies on querying the DOM to determine state array indices. This is a severe race condition. Calculate indices based on the active `selectedValues` array in the core state, not the rendered DOM output."

# Final Sentence
ThekSelect is a masterclass in performative engineering: it looks immaculate on the surface, but crumbles under scrutiny because it sacrifices strict type safety, fundamental error handling, and basic DOM layout principles in favor of quick workarounds.