# ThekSelect Context

## Workflows & Conventions

- **Pre-Release Checks**: Always run `npm run lint`, `npm run format:check`, and a full `npm run build` across all workspaces BEFORE committing a version bump or creating a release.
- **Verification**: Do not rely solely on `npm pack --dry-run`. Verify the output of type-checking (`tsc`/`vue-tsc`) meticulously.
