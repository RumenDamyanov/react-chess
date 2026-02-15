# ♟️ React Chess

[![CI](https://github.com/RumenDamyanov/react-chess/actions/workflows/ci.yml/badge.svg)](https://github.com/RumenDamyanov/react-chess/actions/workflows/ci.yml)
[![CodeQL](https://github.com/RumenDamyanov/react-chess/actions/workflows/github-code-scanning/codeql/badge.svg)](https://github.com/RumenDamyanov/react-chess/actions/workflows/github-code-scanning/codeql)
[![Dependabot](https://github.com/RumenDamyanov/react-chess/actions/workflows/dependabot/dependabot-updates/badge.svg)](https://github.com/RumenDamyanov/react-chess/actions/workflows/dependabot/dependabot-updates)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)

Modern chess application built with **React + TypeScript + Vite**, powered by the custom engine [@rumenx/chess](https://www.npmjs.com/package/@rumenx/chess).

Supports **multiple backend engines** — play offline in the browser or connect to [rust-chess](https://github.com/RumenDamyanov/rust-chess), [go-chess](https://github.com/RumenDamyanov/go-chess), or [npm-chess](https://github.com/RumenDamyanov/npm-chess) REST APIs.

---

## ✨ Features

- Legal move generation & game state via `@rumenx/chess`
- **Multi-backend support** — switch between Local (in-browser), Rust, Go, and JS engines
- Backend picker with live connection status & health checking
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

## 🔀 Switching Backends

React Chess supports **four chess engines** — you can switch between them at any time without losing your current game position.

| Backend | Engine | Runs In | Default URL |
|---------|--------|---------|-------------|
| **Local** | `@rumenx/chess` | Browser (no server) | — |
| **Rust** | `rumenx-chess` | REST API | `http://localhost:8082` |
| **Go** | `go-chess` | REST API | `http://localhost:8080` |
| **JS** | `npm-chess` | REST API | `http://localhost:8081` |

### Method 1: Settings Panel (UI)

1. Open the app at [http://localhost:5173](http://localhost:5173)
2. In the left sidebar, find the **Backend Engine** section
3. Select an engine from the **Engine** dropdown (Local, Rust, Go, or JS)
4. For remote backends, a **URL** field appears — edit it if your server runs on a different host/port
5. A connection indicator shows the status:
   - ⏳ **Checking…** — health check in progress
   - ✅ **Connected** — backend is reachable
   - ❌ **Disconnected** — server unreachable; click **🔄 Retry**
6. Start playing — the game resets with the new engine

Your selection is persisted in `localStorage`, so it survives page reloads.

### Method 2: Environment Variables

Set the default backend before starting the dev server:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Options: local | rust | go | js
VITE_CHESS_BACKEND=rust

# Override default URLs (optional)
VITE_CHESS_RUST_URL=http://localhost:8082
VITE_CHESS_GO_URL=http://localhost:8080
VITE_CHESS_JS_URL=http://localhost:8081
```

Then run `npm run dev` — the app opens with the chosen backend pre-selected.

### Method 3: Docker Compose (all backends)

Start the frontend and all three remote backends together:

```bash
docker compose up
```

| Service | URL |
|---------|-----|
| Frontend | [http://localhost:3001](http://localhost:3001) |
| Rust API | [http://localhost:8082](http://localhost:8082) |
| Go API | [http://localhost:8080](http://localhost:8080) |
| JS API | [http://localhost:8081](http://localhost:8081) |

Once running, switch freely between all four engines in the Settings panel.

### Backend Capabilities

Not every backend supports every feature:

| Capability | Local | Rust | Go | JS |
|------------|:-----:|:----:|:--:|:--:|
| AI opponent | ✅ | ✅ | ✅ | ✅ |
| Hint | ✅ | ✅ | ✅ | ✅ |
| Undo | ✅ | ✅ | ❌ | ✅ |
| FEN load | ✅ | ✅ | ✅ | ✅ |
| PGN export | ✅ | ✅ | ✅ | ✅ |
| Analysis | ❌ | ✅ | ✅ | ✅ |
| LLM Chat | ❌ | ✅ | ✅ | ❌ |
| WebSocket | ❌ | ✅ | ✅ | ❌ |

The UI automatically warns when a feature is unavailable (e.g. "⚠️ This backend does not support undo").

## 🧩 Project Structure

```text
src/
  App.tsx                    # Composition + settings + backend picker
  hooks/
    useChessGame.ts          # Core game + clocks + history logic
    useChessBackendGame.ts   # Backend-aware game hook (delegates to provider)
  providers/
    types.ts                 # BackendId, presets, normalised game types
    LocalProvider.ts         # In-browser provider via @rumenx/chess
    RemoteProvider.ts        # HTTP provider for Rust/Go/JS APIs
    adapters.ts              # Response normalisers per backend
    BackendContext.tsx        # React context (selection, health, persistence)
    index.ts                 # Barrel export
  services/
    ChessAI.ts               # AI difficulty + minimax search
    ChessEngine.ts           # Engine wrapper for local play
  components/
    ChessBoard/              # Board + Square rendering
    MoveHistory/             # Move list & navigation
  utils/                     # PGN, persistence, notation helpers
  styles/                    # SCSS tokens & theming
tests/
  providers/                 # Provider & adapter tests
  services/                  # ChessAI & ChessEngine tests
  utils/                     # Notation utility tests
```

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

- **151 passing tests** covering providers, services, and utilities
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

- WebSocket real-time game sync (rust-chess, go-chess)
- AI chat panel (LLM integration via rust-chess, go-chess)
- Opening explorer / book weighting
- Engine benchmarking panel
- Dark theme toggle
- Save slots (3 game slots)
- PGN import
- Cloud sync (optional)

## 🛠 Tech Stack

- React 19 + TypeScript 5 + Vite 7
- Custom chess engine: `@rumenx/chess`
- Multi-backend provider layer (Local / Rust / Go / JS)
- SCSS modules (design tokens & utilities)
- Docker + Docker Compose (optional)

## 🔗 Related Projects

Explore other libraries and tools from the same developer:

### NPM Packages

- **[@rumenx/chess](https://github.com/RumenDamyanov/npm-chess)** - TypeScript chess engine with legal move generation ([npm](https://www.npmjs.com/package/@rumenx/chess))
- **[rust-chess](https://github.com/RumenDamyanov/rust-chess)** - Rust chess engine + REST API ([crates.io](https://crates.io/crates/rumenx-chess))
- **[go-chess](https://github.com/RumenDamyanov/go-chess)** - Go chess engine + REST API
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
