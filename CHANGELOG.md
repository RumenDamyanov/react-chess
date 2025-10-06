# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Game archival subsystem (in progress)
- Replay mode UI (planned)
- Comprehensive test suite (planned)

### Changed

### Fixed

### Removed

## [1.0.0] - 2025-10-06

### Added (Initial Release)

- **Core chess engine**: Legal move generation & game state via `@rumenx/chess`
- **Move history**: Time-travel navigation (jump to any ply)
- **AI opponent**: Multiple difficulty tiers (random → depth 5 minimax w/ alpha-beta)
  - Harmless, Easy, Medium, Hard, Expert, Godlike difficulties
  - Capture ordering and position evaluation
- **Hint system**: On-demand best move preview
- **Promotions**: Under-promotion support with piece selection
- **Board controls**: Orientation flip & side selection
- **Time controls**: Multiple presets (3+2, 5+0, 10+5, unlimited) with increments & flag detection
- **Player names**: Persistent naming for both players
- **UI preferences**: Persistent settings (orientation, difficulty, coordinates, debug mode)
- **Debug tools**: Developer panel with piece color & mapping diagnostics
- **Export**: Copy FEN / PGN export functionality
- **Responsive design**: CSS `clamp()` based board sizing
- **SCSS system**: Modular design tokens and theming
- **Documentation**: Comprehensive governance docs (Code of Conduct, Contributing, Security, Funding, License)
- **CI/CD**: GitHub Actions workflow for lint, type-check, tests, build
- **Dependency management**: Dependabot configuration

### Technical Details

- **Framework**: React 19 + TypeScript 5 + Vite 7
- **Chess Engine**: `@rumenx/chess` v1.0.0
- **Styling**: SCSS modules with design tokens
- **Testing**: Jest + React Testing Library (framework ready)
- **Code Quality**: ESLint + Prettier + TypeScript strict mode

---

*Future releases will move items from Unreleased to new version sections.*
