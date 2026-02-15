# react-chess — convenience shortcuts
# Usage: make <target>

.PHONY: help init start stop restart rebuild logs status clean dev test lint build

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

# ── Docker ────────────────────────────────────────────────

init: ## Build images and start all containers
	docker compose up --build -d

start: ## Start containers (no rebuild)
	docker compose up -d

stop: ## Stop and remove containers
	docker compose down

restart: ## Restart containers (no rebuild)
	docker compose restart

rebuild: ## Force rebuild images and recreate containers
	docker compose up --build --force-recreate -d

logs: ## Tail container logs (Ctrl-C to stop)
	docker compose logs -f

status: ## Show running containers
	docker compose ps

clean: ## Stop containers, remove images and volumes
	docker compose down --rmi local -v

# ── Local Development ─────────────────────────────────────

dev: ## Start Vite dev server (HMR)
	npm run dev

test: ## Run Jest test suite
	npm test

lint: ## ESLint + type-check
	npm run lint && npm run type-check

build: ## Production build
	npm run build
