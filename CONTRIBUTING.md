# Contributing to ThekSelect

## Quick Start

```bash
git clone https://github.com/<your-fork>/thekselect.git
cd thekselect
npm install
npm test          # watch mode
npm run lint      # must pass with 0 warnings/errors
npm run build     # compile to dist/
```

## Before You Open a PR

Run the full gate:

```bash
npm run release:check   # tests + build + dry-run pack
```

All tests must pass, lint must be clean, and the pack must succeed.

## Branching

- Base your branch off `main`.
- One logical change per branch.
- Branch names: `fix/<slug>`, `feat/<slug>`, `chore/<slug>`.

## Commit Style

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add loadingText config field
fix: remove positionDropdown call from render()
chore: update vitest to 2.x
```

Breaking changes: add `!` after the type (`feat!: ...`) and a `BREAKING CHANGE:` footer.

## Code Rules

These are enforced by reviewers and the CI gate — read them before writing code.

**Safety**

- Use `textContent` for all user-supplied strings. Never `innerHTML` for user content.
- Every UI string (`noResultsText`, `loadingText`, `searchPlaceholder`) must be a `ThekSelectConfig` field with a sensible English default.
- Do not add permanent listeners to `window` or `document` outside `GlobalEventManager`.
- Do not use `as unknown as` to satisfy the type checker.

**State**

- All state lives in `StateManager`. Read via `getState()` (returns a frozen copy). Write via `setState(partial)`. Never mutate the object returned by `getState()`.

**Rendering**

- `DomRenderer.render()` must not call `positionDropdown()`. Position is set only in `open()`, resize handlers, and scroll handlers.

**Destroy contract**
Every new resource allocated in the constructor or `initialize()` must be released in `destroy()`. The four required steps are listed in `AGENTS.md`.

## Adding a Feature

1. Add or update the relevant type in `src/core/types.ts`.
2. Add a default in `src/core/config-utils.ts` if it is a config field.
3. Implement the logic in the appropriate module (pure logic → `*-logic.ts`; DOM → `dom-renderer.ts`; orchestration → `thekselect.ts`).
4. Write tests in `tests/features/` or `tests/accessibility/` as appropriate.

## Bug Fixes

Every bug fix **must** include a regression test in `tests/regressions/`. Name the file after the bug class (e.g. `option-leak.test.ts`). Never delete existing regression tests.

## Tests

| Directory              | What it covers                                          |
| ---------------------- | ------------------------------------------------------- |
| `tests/core/`          | Headless API, StateManager, config defaults             |
| `tests/features/`      | Remote loading, canCreate, drag-and-drop, UI features   |
| `tests/accessibility/` | ARIA attributes, keyboard navigation, label association |
| `tests/integration/`   | Full DOM init and interaction scenarios                 |
| `tests/regressions/`   | One test per previously-found bug                       |

Run a single test file:

```bash
npm test -- tests/core/headless.test.ts
```

## Lint

oxlint is the linter. Fix all warnings before committing — the gate treats warnings as errors.

```bash
npm run lint
```

## Pull Requests

- Keep the PR focused: one feature or bug fix per PR.
- Fill in the PR description with what changed and why.
- Link any related issues.
- A maintainer will review and merge.
