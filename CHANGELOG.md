# Changelog

Notable changes to the published `react-murmuration` package. The tuning studio
lives in the same repository but is not published; changes to it appear here
only where they affect the package.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
versions follow [semantic versioning](https://semver.org/). While the major
version is `0`, the public API may change between minor versions.

## [Unreleased]

## [0.0.2] — 2026-08-31

### Fixed

- Export `Vec3`. It is the element type of the public `path` prop, so a
  TypeScript consumer was asked for a value they had no way to name:
  `import type { Vec3 } from 'react-murmuration'` failed against `0.0.1`. Every
  check inside the repository passed, because there `Vec3` resolves from source
  — the failure only existed across the package boundary.
- Export `./package.json` from the `exports` map, which some tooling reads.

### Added

- `npm run check:package` typechecks a consumer against the packed tarball's own
  type declarations, and runs on `prepublishOnly`. This is the check that would
  have caught the above before it shipped.

## [0.0.1] — 2026-08-31

Initial release. **Deprecated** on the registry in favour of `0.0.2`: this
version does not export `Vec3`, so the `path` prop cannot be typed. The
runtime is identical — the defect is types only.

### Added

- `<Murmuration />` — tens of thousands of particles advected along a dictated
  3D path, drawn on a 2D canvas. Not a murmuration: the trajectory is dictated
  and the particles follow it, with no neighbour lookups anywhere.
- 21 optional props across flow, path, velocity, lifetime and render, exported
  as `MURMURATION_DEFAULTS`.
- `path` — the trajectory as `[x, y, z]` points in normalised box space, sized
  by `boxWidth` / `boxHeight` / `boxDepth`. Particles are carried along a
  Catmull-Rom spline resampled by arc length, spread through the tube around it,
  and projected orthographically with depth driving draw order, fade and width.
- `createField` — the framework-free simulation core, for use without React.
- `samplePath` — the same spline the field follows, for drawing the path.
- Single file, no runtime dependencies, React 18 or 19 as a peer dependency.
  ESM and CJS builds with type declarations.

[Unreleased]: https://github.com/ArianZargaran/react-murmuration/compare/v0.0.2...HEAD
[0.0.2]: https://github.com/ArianZargaran/react-murmuration/compare/v0.0.1...v0.0.2
[0.0.1]: https://github.com/ArianZargaran/react-murmuration/releases/tag/v0.0.1
