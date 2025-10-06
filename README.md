# ♟️ React Chess

[![CI](https://github.com/RumenDamyanov/react-chess/actions/workflows/ci.yml/badge.svg)](https://github.com/RumenDamyanov/react-chess/actions/workflows/ci.yml)
[![CodeQL](https://github.com/RumenDamyanov/react-chess/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/RumenDamyanov/react-chess/actions/workflows/github-code-scanning/codeql)
[![Dependabot](https://github.com/RumenDamyanov/react-chess/actions/workflows/dependabot/dependabot-updates/badge.svg)](https://github.com/RumenDamyanov/react-chess/actions/workflows/dependabot/dependabot-updates)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

Modern, fully client-side chess application built with **React + TypeScript + Vite**, powered by the custom engine [@rumenx/chess](https://www.npmjs.com/package/@rumenx/chess).

---

## ✨ Features

- Legal move generation & game state via \`@rumenx/chess\`
- Move history with time-travel (jump to any ply)
- AI opponent with multiple difficulty tiers (random → depth 5 minimax w/ alpha-beta & capture ordering)
- Hint system (on-demand best move preview)
- Under-promotion support (choose promotion piece)
- Board orientation flip & side selection
- Time controls (e.g. 3+2, 5+0, 10+5, unlimited) with increments & flag detection
- Player naming (persistent) and configurable vs AI / local 2-player mode
- Persistent UI preferences (orientation, difficulty, coordinates, debug flags)
- Debug overlays (piece color & mapping diagnostics) via collapsible Developer panel
- Copy FEN / PGN export
- Responsive board sizing with CSS \`clamp()\`
- Modular SCSS design system

## 🧠 AI Difficulty Mapping

| Label    | Strategy                         | Nominal Depth |
|----------|----------------------------------|---------------|
| Harmless | random legal move                | 0             |
| Easy     | minimax                          | 1             |
| Medium   | minimax + ordering               | 2             |
| Hard     | minimax + ordering               | 3             |
| Expert   | alpha-beta + capture ordering    | 4             |
| Godlike  | optimized alpha-beta (throttled) | 5             |

The engine dynamically reduces depth in pathological or large branching scenarios to keep UI responsive.

## ⏱ Time Controls

Time format is \`M+I\` (minutes base + seconds increment). Unlimited mode disables the clocks. When a side reaches 0 the opponent wins on time; result string (\`1-0\` / \`0-1\`) reflects the flag event.

## 🚀 Quick Start

\`\`\`bash
git clone https://github.com/RumenDamyanov/react-chess.git
cd react-chess
npm install
npm run dev
\`\`\`

Then open: [http://localhost:5173](http://localhost:5173)

## 🧩 Project Structure

\`\`\`text
src/
  App.tsx                 # Composition + settings + clocks
  hooks/
    useChessGame.ts       # Core game + clocks + history logic
    ... (future: useGameArchive.ts)
  services/ChessAI.ts     # AI difficulty + search
  components/ChessBoard/  # Board + Square rendering
  components/MoveHistory  # Move list & navigation
  utils/                  # PGN, persistence helpers
  styles/                 # SCSS tokens & theming
tests/                    # Jest tests (planned)
\`\`\`

## 🔧 Development Scripts

| Script               | Purpose                             |
|----------------------|-------------------------------------|
| \`npm run dev\`        | Start Vite dev server (HMR)         |
| \`npm run build\`      | Production build                    |
| \`npm run preview\`    | Preview production build            |
| \`npm run format\`     | Format code with Prettier           |
| \`npm run format:check\` | Check code formatting             |
| \`npm run lint\`       | ESLint checks                       |
| \`npm run type-check\` | Run TypeScript in isolated mode     |
| \`npm test\`           | Run Jest test suite                 |
| \`npm run test:watch\` | Run tests in watch mode             |
| \`npm run test:coverage\` | Generate coverage report         |

## 🧪 Testing

Comprehensive test coverage for core functionality:

- **61 passing tests** covering services and utilities
- **85%+ coverage** on ChessAI service (difficulty levels, move selection, minimax)
- **77%+ coverage** on ChessEngine wrapper (initialization, moves, game state)
- **50%+ coverage** on chess notation utilities (SAN formatting, move chunking)

Run tests locally:

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Generate coverage report
```

### Test Coverage Summary

| Module | Statements | Branches | Functions | Lines |
|--------|-----------|----------|-----------|-------|
| ChessAI | 93% | 73% | 90% | 93% |
| ChessEngine | 77% | 77% | 68% | 77% |
| chessNotation | 51% | 51% | 33% | 57% |

## 🤝 Contributing

PRs welcome! Before submitting:

1. Run `npm run format:check` - ensure code is properly formatted
2. Run `npm run lint` - pass all linting checks
3. Run `npm run type-check` - no TypeScript errors
4. Run `npm test` - all tests must pass with coverage
5. Keep UI changes accessible (labels, aria-live where needed)

See the full [Contributing Guide](./CONTRIBUTING.md) for detailed guidelines.

## 📦 Future Enhancements

- Opening explorer / book weighting
- Engine benchmarking panel
- Dark theme toggle
- Cloud sync (optional)

## 🛠 Tech Stack

- React + TypeScript + Vite
- Custom chess engine: \`@rumenx/chess\`
- SCSS modules (design tokens & utilities)

## 🔗 Related Projects

Explore other libraries and tools from the same developer:

### NPM Packages

- **[@rumenx/chess](https://github.com/RumenDamyanov/npm-chess)** - TypeScript chess engine with legal move generation ([npm](https://www.npmjs.com/package/@rumenx/chess))
- **[@rumenx/chatbot](https://github.com/RumenDamyanov/npm-chatbot)** - AI chatbot integration library ([npm](https://www.npmjs.com/package/@rumenx/chatbot))
- **[@rumenx/seo](https://github.com/RumenDamyanov/npm-seo)** - SEO analysis and optimization toolkit ([npm](https://www.npmjs.com/package/@rumenx/seo))
- **[@rumenx/sitemap](https://github.com/RumenDamyanov/npm-sitemap)** - Dynamic sitemap generator ([npm](https://www.npmjs.com/package/@rumenx/sitemap))
- **[@rumenx/feed](https://github.com/RumenDamyanov/npm-feed)** - RSS/Atom feed generator ([npm](https://www.npmjs.com/package/@rumenx/feed))

### PHP Libraries

- **[php-chatbot](https://github.com/RumenDamyanov/php-chatbot)** - PHP chatbot framework ([Packagist](https://packagist.org/packages/rumenx/chatbot))
- **[php-geolocation](https://github.com/RumenDamyanov/php-geolocation)** - Geolocation services library ([Packagist](https://packagist.org/packages/rumenx/geolocation))
- **[php-seo](https://github.com/RumenDamyanov/php-seo)** - PHP SEO toolkit ([Packagist](https://packagist.org/packages/rumenx/seo))
- **[php-sitemap](https://github.com/RumenDamyanov/php-sitemap)** - Sitemap generation ([Packagist](https://packagist.org/packages/rumenx/sitemap))
- **[php-feed](https://github.com/RumenDamyanov/php-feed)** - Feed generation ([Packagist](https://packagist.org/packages/rumenx/feed))

### Go Modules

- **[go.rumenx.com/chess](https://github.com/RumenDamyanov/go-chess)** - Go chess engine ([go.rumenx.com/chess](https://go.rumenx.com/chess))
- **[go.rumenx.com/chatbot](https://github.com/RumenDamyanov/go-chatbot)** - Go chatbot framework ([go.rumenx.com/chatbot](https://go.rumenx.com/chatbot))

## 📚 Documentation & Governance

- **[Code of Conduct](./CODE_OF_CONDUCT.md)** - Community guidelines and expectations
- **[Contributing Guide](./CONTRIBUTING.md)** - How to contribute to the project
- **[Security Policy](./SECURITY.md)** - Responsible disclosure and security practices
- **[License](./LICENSE.md)** - Open source license details

## 📄 License

MIT © [Rumen Damyanov](https://github.com/RumenDamyanov)

## 📞 Support & Community

- **Documentation**: This README and linked governance docs
- **Issues**: [GitHub Issues](https://github.com/RumenDamyanov/react-chess/issues)
- **Email**: [contact@rumenx.com](mailto:contact@rumenx.com)

---

*Have an idea or spot a bug? Open an issue or propose a PR!*
