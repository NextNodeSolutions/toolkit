# Changing toolkit

These are the rules for changing this repository, for people and agents alike. A scope may add its own `AGENTS.md`.

## What the project guarantees

A change that weakens one is wrong, even when it compiles.

1. **Keep toolkit limited to published npm packages.** Application deployment code belongs to infrastructure, so package changes cannot fork the deployment program.
2. **Keep each package independently versioned.** Its manifest owns the version, so a release never depends on an uncommitted version bump or a second version registry.
3. **Publish only through infrastructure after the scope owner's authorization.** Registry writes are shared state, and an unproven workflow identity must not be treated as permission to publish.
4. **Preserve public exports and shipped assets during a move.** Packaging changes can break consumers even when the source tests pass.
5. **Keep the imported test suites byte-identical during this migration.** A passing result must demonstrate preserved behavior rather than changed expectations.

## Architecture rules

- **Keep package implementation inside its owning workspace package.** Share code through declared package dependencies rather than relative imports across package boundaries, so independent builds and npm consumers resolve the same contracts.
- **Keep tooling settings in standards.** Root and package configs extend its presets instead of maintaining copied rules.
- **Keep checks and deployment workflows in infrastructure.** Per-package manifests declare the scripts. A caller workflow or local release runner would create another release path.
- **Keep publish settings only in package-local `nextnode.toml`, never `publishConfig`.** Infrastructure refuses a packed manifest containing `publishConfig` before npm login, because tarballs must not choose registry, proxy or TLS settings.
- **Keep SDK calls behind each library's existing provider boundary.** Transport failures must cross into the library's public failure contract rather than leak SDK-specific behavior into callers.

## Code rules

Use the existing oxlint, oxfmt, TypeScript and bundler presets. Read the relevant package's manifest to find its exports and build inputs before changing either.

Treat lint and test-runner upgrades as compatibility changes. Keep dependency versions in the workspace catalog when packages share them. Keep every tool the workspace installs inside standards' peer ranges, since standards' presets run against it. The catalog's oxlint and oxlint-tsgolint pins preserve the imported suites' diagnostic identifiers. Newer releases failed unchanged diagnostic assertions. The catalog's Vitest pin preserves the existing runner major. Upgrade these separately rather than editing expectations to accommodate the migration.

## Checks

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm lint
pnpm type-check
pnpm -r run test:unit
pnpm format:check
```

Build before running an individual package's checks when it imports a built workspace dependency. The root lint and type-check commands perform that build themselves. Run every existing package suite. Check infrastructure's script catalogue before renaming a package check script, since unrecognized names do not run in pull-request Checks.

Pack each changed publishing package with `pnpm --dir packages/NAME pack --pack-destination OUTPUT_DIRECTORY`. Compare its file list with the current npm tarball and inspect every changed public entry or asset. Keep tarballs and comparison output outside the checkout.

## Commits

Use Conventional Commits with one intention per commit. Commit the manifest and lockfile together when dependency resolution changes. A release commit includes the package version and its user-facing changelog. Run the applicable checks against the commit rather than relying on a later fix.

## Documentation

Document intent, failure outcomes and conventions. Read versions, dependency lists and script definitions from the manifests instead of copying them into prose. Link setup instructions from the README.

**The docs describe the intended behavior.** That covers `docs/`, the README and the `AGENTS.md` files. When a change makes them wrong, do not just rewrite them to match. First check that the change is expected: the task asks for it, or the user confirms it.

- If it is expected, update the docs in the same commit as the change.
- If it is not, the docs win. Bring the code back in line with them, or stop and ask.

## Working against real systems

Registry publishing, changing npm trust, changing organization rulesets and retiring core require the person's explicit go-ahead. Use local builds, tests and tarballs for verification. Do not create an Infisical project or identity for package development. Remove temporary local verification files after use.

## Extending

Add a package under `packages/` with its own public exports, files list and manifest version. Declare workspace dependencies explicitly. Add the package's publishing declaration beside its manifest and extend the standards presets for the tools it needs. Declare real check scripts recognized by infrastructure, reusing existing suites rather than inventing placeholders. Verify its packed contents before requesting npm setup and its first pipeline release.
