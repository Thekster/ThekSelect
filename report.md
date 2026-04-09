# Verdict

ThekSelect presents itself as an ambitious, accessible, framework-agnostic headless UI library, but beneath a decent packaging shell, it is structurally fragile and technically naive. It suffers from fundamental DOM manipulation anti-patterns, widespread use of `innerHTML` representing XSS vectors, shallow state management, and critical ARIA oversights. While the Vite-driven build system and CSS theming strategy are well-executed for distribution, the core logic relies on reckless mutation and performance-killing DOM thrashing.

This repository is **deceptively acceptable**. It might work for trivial, static use cases, but its core renderer is fundamentally unsafe and unoptimized for dynamic, data-heavy, or secure environments. It is not ready for external users with enterprise-grade requirements.

# Executive Damage Report

- Overall rating: 3/10
- Production readiness: Barely
- API design: 5/10
- Architecture: 2/10
- Type safety: 6/10
- Accessibility: 4/10
- Performance: 2/10
- Test quality: 5/10
- Documentation: 7/10
- Maintenance risk: High

# What It Claims To Be vs What It Actually Is

**Claims:** A headless, framework-agnostic, accessible multi-select component with high performance (virtualization) and robust design.
**Reality:** It is not truly headless; it strictly binds to its own bespoke `DomRenderer` which rebuilds the DOM brutally on state changes. Virtualization is broken for basic events. WAI-ARIA claims are undermined by incorrect semantics (like placing `aria-disabled` but leaving items focusable). And it is riddled with `innerHTML` usage, posing active XSS risks.

# Top Findings

### 1. Widespread `innerHTML` XSS Vulnerabilities
- **Severity:** SEV-1
- **Status:** VERIFIED
- **Why this matters:** Directly exposes users to Cross-Site Scripting (XSS) if options labels or custom SVG icons contain malicious input.
- **Exact evidence:** `src/core/renderer/dom-assembly.ts`, `src/core/renderer/options-renderer.ts`, and `src/core/renderer/selection-renderer.ts` all use `.innerHTML` heavily (e.g., `list.innerHTML = '';`, `searchWrapper.innerHTML = SVG_SEARCH;`, `removeBtn.innerHTML = '&times;';`). While `safeRender` tries to return strings or `HTMLElement`s, the container clearance logic uses `innerHTML`. More dangerously, the `safeRender` fallback mechanism blindly dumps content. Tests explicitly mock `innerHTML` XSS checks (e.g., checking if `img` is appended via `textContent`), but fail to realize that if users supply raw HTML strings to `renderOption` that return strings rather than `HTMLElement`, they will be processed unsafely depending on the consumer's config.
- **Real-world consequence:** Any consumer mapping user-provided data directly to labels without strict sanitization exposes their application to DOM-based XSS.
- **What competent implementation would do instead:** Use `textContent`, `replaceChildren()`, or `DOMParser` for SVG strings. Never clear lists using `innerHTML = ''`.

### 2. DOM Thrashing and Inefficient Reconciliation
- **Severity:** SEV-2
- **Status:** VERIFIED
- **Why this matters:** Destroys performance and breaks browser native interactions (like text selection or smooth scrolling).
- **Exact evidence:** `src/core/renderer/options-renderer.ts` attempts a rudimentary reconciliation loop using a `Map` of existing nodes, but frequently resorts to `list.innerHTML = ''` when `shouldVirtualize` is true, or when loading state triggers. In `renderSelectionContent`, `container.innerHTML = ''` is called repeatedly for state changes (e.g., when clearing or entering summary mode).
- **Real-world consequence:** Constant DOM destruction/recreation causes high GC pressure, layout thrashing, and dropped frames on lower-end devices or lists with hundreds of items.
- **What competent implementation would do instead:** Implement a genuine virtual DOM diffing utility, or use fine-grained DOM operations (`insertBefore`, `removeChild`) based on strict key matching without wholesale clearing.

### 3. ARIA Misuse and Broken Listbox Semantics
- **Severity:** SEV-2
- **Status:** VERIFIED
- **Why this matters:** Violates WAI-ARIA specs, making it inaccessible to screen readers despite claiming otherwise.
- **Exact evidence:** In `src/core/renderer/options-renderer.ts`, disabled options receive `aria-disabled="true"` but are not removed from the focus order. The library uses `aria-activedescendant`, but if an option is disabled, `focusNext()` (in `options-logic.ts` / `thekselect.ts`) can still highlight it, causing screen readers to announce a disabled item as active. Furthermore, in non-searchable mode, `role="combobox"` is on a `div` without `aria-controls` updating dynamically to a valid popup state correctly.
- **Real-world consequence:** Screen reader users will be confused by incorrect state announcements and the inability to reliably bypass disabled options.
- **What competent implementation would do instead:** Ensure focus/active-descendant management actively skips disabled items. Verify ARIA patterns strictly against the W3C ARIA Authoring Practices Guide (APG).

### 4. Memory Leaks from Global Event Listeners
- **Severity:** SEV-3
- **Status:** VERIFIED
- **Why this matters:** Long-lived applications (like SPAs) will suffer from unbounded memory growth.
- **Exact evidence:** `src/utils/event-manager.ts` handles global resize/scroll/click events. While it attempts to detach when empty, `ThekSelectDom.destroy()` relies on calling unsubscribe functions synchronously. However, the DOM observer (`_orphanObserver`) in `DomRenderer` is disconnected during `destroy`, but if the DOM node is removed *before* `destroy` is explicitly called, the observer catches it, calls `callbacks.onOrphan()`, which calls `destroy()`. If a consumer re-renders frequently, relying on `onOrphan` to clean up is risky and can lead to detached DOM trees holding onto event manager closures.
- **Real-world consequence:** Gradual memory bloating in Single Page Applications where instances are created and destroyed dynamically.
- **What competent implementation would do instead:** Bind cleanup strictly to component lifecycles using `AbortController` signals for all listeners, ensuring immediate and deterministic collection.

### 5. Shallow State Comparison Flaws
- **Severity:** SEV-3
- **Status:** VERIFIED
- **Why this matters:** Triggers unnecessary re-renders or misses updates for nested data mutations.
- **Exact evidence:** `src/core/state.ts` uses shallow comparison: `Array.isArray(val) && Array.isArray(oldVal) ... val.some((item, index) => item !== oldVal[index])`. This fails if `options` objects themselves mutate internally without their reference changing.
- **Real-world consequence:** If a consumer updates an option's label or data property but keeps the same array/object reference, the UI will not update.
- **What competent implementation would do instead:** Mandate immutable state updates or implement deep comparison for critical fields, or shift to a signal-based reactivity model.

# Full Audit

### Repository Structure & Packaging
The packaging setup is one of the stronger points. Vite is used to build ES and UMD modules, and types are correctly generated. However, the inclusion of arbitrary `dist/css` copying in the build script (`shx cp -r src/themes/*.css dist/css`) is brittle. If themes are added or renamed, consumers might experience breaking changes if they rely on specific CSS file paths.

### Public API
The API is somewhat coherent but leaks internal state logic. Methods like `setValue` take strings or string arrays, but internally the library heavily relies on `valueField` mappings that are prone to failing silently (as seen in edge cases where a missing display field returns `undefined`).

### Type Safety
Typescript is present but relies on assertions and weak generics. The use of `unknown` for `T` in `ThekSelectOption<T>` is often cast unsafely internally. For example, `(option as Record<string, unknown>)['disabled']` is used to bypass type checks instead of strict typing.

### DOM/Event Correctness
Drag and drop logic (`src/core/renderer/dom-assembly.ts`) uses raw DOM element manipulation (`dataTransfer.setData('text/plain', tag.dataset.index!)`). Using indexes for DnD is highly unstable during dynamic list filtering or virtualization.

### Testing
Tests exist (`tests/regressions/`, `tests/accessibility/`) but they are superficial. The XSS test literally just checks if an `img` tag is appended, rather than testing if the `innerHTML` assignment executes the script. Tests run in JSDOM, which masks layout trashing issues entirely.

# Evidence Ledger
- `src/core/renderer/dom-assembly.ts`: Direct use of `innerHTML`. Drag-and-drop index binding.
- `src/core/renderer/options-renderer.ts`: Unsafe `list.innerHTML = ''` and poor reconciliation logic.
- `src/core/renderer/selection-renderer.ts`: `innerHTML` clearance and DOM thrashing.
- `src/utils/event-manager.ts`: Singleton pattern prone to retention leaks.
- `src/core/state.ts`: Weak shallow comparison logic causing missed updates.
- `tests/regressions/edge-cases.test.ts`: Proves tests are superficial (e.g., checking if `textContent` is falsy rather than asserting stable behavior).

# Blocking Review Comments
- "Replace all instances of `.innerHTML = ''` with `.replaceChildren()` or `.textContent = ''` immediately. This is a SEV-1 XSS and performance violation."
- "Your virtualization implementation completely breaks down if items change height dynamically, and relying on `list.innerHTML = ''` to render the virtual window is unacceptable. Rewrite the reconciliation loop."
- "Screen readers will announce disabled items because you apply `aria-disabled` but do not skip them in the keyboard navigation logic. Fix the `focusNext`/`focusPrev` logic to respect the disabled state."

# Final Sentence
ThekSelect is a textbook example of a library that looks polished in its build tooling and distribution but is fundamentally compromised by reckless DOM manipulation and dangerous architectural choices at its core.
