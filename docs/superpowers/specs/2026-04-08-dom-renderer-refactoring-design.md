# Design Specification: DomRenderer Refactoring

**Date:** 2026-04-08
**Topic:** Refactoring `src/core/dom-renderer.ts` for maintainability and size reduction.
**Architecture:** Functional Orchestrator (Flat Structure)

## 1. Overview
The current `DomRenderer` class in `src/core/dom-renderer.ts` is approximately 660 lines long and handles multiple responsibilities. This design refactors the renderer into a set of focused, stateless functional utilities while keeping `DomRenderer` as the central orchestrator.

## 2. Proposed Structure
All new files will be located in `src/core/renderer/`.

### 2.1 `src/core/renderer/constants.ts`
- **Purpose:** Centralize SVG icons and shared interfaces.
- **Exports:**
    - `SVG_CHEVRON`, `SVG_SEARCH`, `SVG_SPINNER`, `SVG_CHECK`
    - `RendererCallbacks<T>` interface

### 2.2 `src/core/renderer/dom-assembly.ts`
- **Purpose:** Logic for initial DOM skeleton creation and setup.
- **Functions:**
    - `createRendererSkeleton(id, config)`: Returns a container object with all core DOM elements (wrapper, control, etc.).
    - `setupDragAndDrop(container, callbacks)`: Attaches reordering listeners to the selection container.
    - `setupOrphanObserver(wrapper, onOrphan)`: Initializes the `MutationObserver` for automatic cleanup.

### 2.3 `src/core/renderer/selection-renderer.ts`
- **Purpose:** Render selected items (tags or summary).
- **Functions:**
    - `renderSelectionContent(container, state, config, callbacks)`: Orchestrates tag reconciliation or summary display.
    - `createTagNode(option, val, index, config, callbacks)`: Builds individual tag elements.
    - `reconcileTags(container, state, config, callbacks)`: Key-based tag reuse logic.

### 2.4 `src/core/renderer/options-renderer.ts`
- **Purpose:** Render the dropdown list and handle virtualization.
- **Functions:**
    - `renderOptionsContent(list, state, config, callbacks, options)`: Manages virtualization and item rendering.
    - `createOptionItem(option, index, state, config, callbacks)`: Builds individual `<li>` elements.
    - `updateOptionAttrs(li, option, index, state, config)`: Efficient attribute updates.
    - `createSpacer(height)`: Virtualization scroll gap helper.

### 2.5 `src/core/renderer/dropdown-positioner.ts`
- **Purpose:** Calculate dropdown placement and height.
- **Functions:**
    - `positionDropdown(dropdown, control, list, config)`: Layout and viewport math including "flip up" logic.
    - `normalizeHeight(value)`: String/number height conversion.

## 3. Orchestrator: `DomRenderer`
The `DomRenderer` class will be reduced to a lean orchestrator:
- **State:** Holds references to DOM elements and life-cycle controllers (AbortController, MutationObserver).
- **Initialization:** Uses `dom-assembly.ts` to build the DOM.
- **Rendering:** Dispatches to `selection-renderer.ts` and `options-renderer.ts`.
- **Life-cycle:** Manages `destroy()` and event routing.

## 4. Success Criteria
- No regression in existing functionality.
- Improved code readability (individual files < 200 lines).
- Enhanced testability for isolated rendering logic.
