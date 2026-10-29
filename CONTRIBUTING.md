# Contributing to React Chess

Thank you for your interest in contributing to React Chess! This guide will help you understand our development process and how to submit effective contributions.

## 🚀 Getting Started

### Prerequisites

- Node.js 22.23.4+, 24.22.1+, or 26.12.1+. Node.js 18 and 20 are end of life and have no Node2Shell fix.
- npm (bundled with Node.js)
- Git

### Setup

1. **Fork and Clone**

   ```bash
   git clone https://github.com/YOUR_USERNAME/react-chess.git
   cd react-chess
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Start Development Server**

   ```bash
   npm run dev
   ```

4. **Verify Setup**

   ```bash
   npm run type-check
   npm run lint
   ```

## 📝 Development Workflow

### Branch Strategy

- `master` - Main branch, always stable
- `feat/<feature-name>` - Feature branches
- `fix/<bug-description>` - Bug fix branches
- `docs/<documentation-update>` - Documentation updates

### Making Changes

1. Create a feature branch from `master`:

   ```bash
   git checkout -b feat/your-feature-name
   ```

2. Make your changes following our code style guidelines
3. Test your changes thoroughly
4. Commit using conventional commits (see below)
5. Push to your fork and create a pull request

## 🔖 Commit Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/) for clarity and automated changelog generation.

### Format

```text
<type>(optional-scope): <short imperative summary>

<optional longer body explaining WHY>

<optional footer: BREAKING CHANGE, issue refs>
```

### Common Types

- `feat:` - New features
- `fix:` - Bug fixes
- `refactor:` - Code restructuring without behavior change
- `perf:` - Performance improvements
- `docs:` - Documentation only
- `test:` - Test additions or corrections
- `chore:` - Maintenance tasks
- `style:` - Code formatting (non-semantic)

### Examples

```bash
feat(archive): add automatic game archival on completion
fix(clock): correct increment application after timeout edge case
refactor(ai): simplify move ordering comparator
docs(readme): add architecture diagram
test(pgn): add PGN export snapshot tests
```

## 🏗️ Project Structure

```text
react-chess/
├── src/
│   ├── App.tsx                 # Root composition & UI state
│   ├── hooks/
│   │   └── useChessGame.ts     # Core game + clocks + navigation
│   ├── services/
│   │   └── ChessAI.ts          # AI difficulty & search logic
│   ├── components/             # React components
│   │   ├── ChessBoard/         # Board + Square rendering
│   │   ├── MoveHistory/        # Move list & navigation
│   │   └── ...
│   ├── utils/                  # PGN/FEN, formatting, persistence
│   └── styles/                 # SCSS tokens & theming
├── tests/                      # Jest tests (planned)
├── .github/
│   └── workflows/              # CI/CD pipelines
└── public/                     # Static assets
```

## 🧪 Testing Guidelines

### Test Structure

- Write unit tests for all new functionality using **Jest** and **React Testing Library**
- Use descriptive test names that explain the behavior being tested
- Group related tests with `describe` blocks
- Test both success and error cases
- Mock external dependencies and timers

### Current Coverage (**v1.0.0**)

We have **61 passing tests** with strong coverage on core services:

| Module | Coverage | Focus |
|--------|----------|-------|
| ChessAI | 88-93% | Difficulty levels, move selection, minimax algorithm |
| ChessEngine | 77% | Engine wrapper, move validation, game state |
| chessNotation | 51-57% | SAN formatting, move chunking |

### Testing Best Practices

- **Keep tests deterministic** - Use `jest.useFakeTimers()` for time-dependent code
- **Test pure functions first** - Services and utilities before components
- **Mock appropriately** - Mock `@rumenx/chess` internals only when needed
- **Meaningful assertions** - Test behavior, not implementation details
- **Avoid brittle tests** - Don't snapshot entire React components

### Test Commands

```bash
npm test                  # Run all tests
npm run test:watch        # Watch mode for development
npm run test:coverage     # Generate HTML coverage report
npm run test:ci           # CI mode (no watch, with coverage)
```

### Adding New Tests

1. Create test file next to source: `MyModule.test.ts` or in `tests/` directory
2. Import functions/components to test
3. Write descriptive test cases using `it()` or `test()`
4. Run `npm test` to verify
5. Check coverage: `npm run test:coverage`

### Coverage Thresholds

Module-specific thresholds enforced in CI:

- **ChessAI**: 70-90% (branches, functions, lines, statements)
- **ChessEngine**: 65-77% (core game logic)
- **chessNotation**: 30-55% (formatting utilities)

React components are not yet tested (acceptable for v1.0.0 showcase).

## 🐛 Issue & Bug Reports

When opening an issue, please include:

### For Bugs

- **Expected behavior** vs **actual behavior**
- **Reproduction steps** (minimal, reproducible)
- **FEN/PGN** if position-specific
- **Environment**: Browser (version) + OS
- **Screenshots/video** (if UI-related)

### For Feature Requests

- **Problem description**: What use case is this addressing?
- **Proposed solution**: High-level approach (not just UI)
- **Alternatives considered**: Other approaches you've thought about
- **Additional context**: Performance, accessibility, or UX concerns

## 🎨 Code Style & Linting

### TypeScript Guidelines

- Use strict TypeScript configuration
- Declare return types for exported functions
- Prefer explicit types over inference for public APIs
- Use meaningful interface/type names

### React Best Practices

- Functional components with hooks only (no class components)
- Keep components focused and single-responsibility
- Use proper React key props in lists
- Prefer composition over inheritance

### Styling Guidelines

- Use existing SCSS tokens and variables
- Propose new design tokens via separate small PR first
- Follow BEM-like naming conventions
- Keep styles modular and scoped

### Code Quality

- Avoid unnecessary abstractions—prefer clarity
- Minimize new dependencies (bundle size consideration)
- Document complex logic with comments
- Keep functions small and testable

### Linting Commands

```bash
npm run lint              # Check code style
npm run lint:fix          # Auto-fix issues
npm run type-check        # TypeScript validation
npm run format            # Prettier formatting
npm run format:check      # Check formatting
```

## 🚀 Pull Request Process

### Before Submitting

- [ ] Tests pass locally (`npm test`)
- [ ] Code follows style guidelines
- [ ] TypeScript compilation succeeds
- [ ] Lint checks pass
- [ ] Documentation updated (if needed)
- [ ] Changelog updated (if user-facing change)

### PR Requirements

- **Clear Title**: Use conventional commit format
- **Description**: Explain what and why (not just how)
- **Linked Issues**: Reference related issues with `#123`
- **Test Coverage**: Include tests for new functionality
- **Screenshots**: For UI changes (before/after)

### Review Process

1. Automated checks run (CI pipeline)
2. Maintainer reviews code
3. Address feedback if any
4. Approval from maintainer
5. Squash and merge to `master`

## 🏷️ Release Process

### Version Management

We follow [Semantic Versioning](https://semver.org/) starting at `1.0.0`:

| Version | Type  | When to Use |
|---------|-------|-------------|
| MAJOR   | X.0.0 | Incompatible UI/state changes or data format resets |
| MINOR   | 0.X.0 | Backward-compatible features & enhancements |
| PATCH   | 0.0.X | Backward-compatible fixes & improvements |

### Release Steps

1. Ensure `master` branch is green (all CI checks passing)
2. Update `CHANGELOG.md` (move Unreleased items to new version section)
3. Bump version in `package.json`
4. Commit: `git commit -m "chore: release vX.Y.Z"`
5. Tag: `git tag -a vX.Y.Z -m "Release vX.Y.Z"`
6. Push: `git push && git push --tags`
7. Draft GitHub Release with changelog highlights

## 🎉 Recognition & Support

### Contributor Recognition

- All contributors are credited in release notes
- Significant contributors featured in `CHANGELOG.md`
- Major feature contributors may be invited as co-maintainers
- Listed in GitHub's contributor graph

### Ways to Support

- ⭐ Star the repository
- 🐛 Report bugs with clear reproduction steps
- 💡 Suggest features with detailed use cases
- 🧪 Contribute tests to improve coverage
- 📖 Improve documentation
- 💬 Help answer questions in discussions
- 💰 Sponsor development (once configured)

## 🔒 Security

**Never** disclose security vulnerabilities publicly. Follow the [Security Policy](./SECURITY.md) for responsible disclosure procedures.

## 💬 Getting Help

- **Documentation**: Check [README](./README.md) first
- **Issues**: [Search existing issues](https://github.com/RumenDamyanov/react-chess/issues)
- **Discussions**: [GitHub Discussions](https://github.com/RumenDamyanov/react-chess/discussions)
- **Questions**: Open a new discussion or issue

---

Thank you for contributing to React Chess! ♟️
