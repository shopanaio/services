.SILENT:

.PHONY: apollo\:storefront apollo\:admin build\:packages dev dev\:checkout dev\:apps dev\:inventory dev\:pricing dev\:shipping dev\:orders dev\:orchestrator dev\:platform dev\:platform-project dev\:platform-media
.PHONY: docker\:build docker\:build-checkout docker\:build-orders docker\:build-payments docker\:build-delivery docker\:build-inventory docker\:build-pricing docker\:build-apps docker\:build-orchestrator
.PHONY: dev\:up dev\:down dev\:status dev\:logs dev\:minimal dev\:fullstack dev\:production-like

apollo\:storefront:
	docker-compose -f apollo/docker-compose.storefront.yml up --build

apollo\:admin:
	docker-compose -f apollo/docker-compose.admin.yml up --build

build\:packages:
	@echo "Building all packages dynamically..."
	@for package_dir in packages/*/; do \
		if [ -f "$$package_dir/package.json" ]; then \
			package_name=$$(basename "$$package_dir"); \
			echo "Building package: $$package_name"; \
			if yarn workspace info "$$package_name" >/dev/null 2>&1; then \
				yarn workspace "$$package_name" run build; \
			else \
				echo "Warning: workspace '$$package_name' not found, trying with @shopana/ prefix"; \
				yarn workspace "@shopana/$$package_name" run build; \
			fi; \
		fi; \
	done

dev\:checkout:
	CONFIG_FILE=config.dev.yml yarn workspace @shopana/checkout-service run dev

dev\:apps:
	CONFIG_FILE=config.dev.yml yarn workspace @shopana/apps-service run dev

dev\:inventory:
	CONFIG_FILE=config.dev.yml yarn workspace @shopana/inventory-service run dev

dev\:pricing:
	CONFIG_FILE=config.dev.yml yarn workspace @shopana/pricing-service run dev

dev\:shipping:
	CONFIG_FILE=config.dev.yml yarn workspace @shopana/delivery-service run dev

dev\:orders:
	CONFIG_FILE=config.dev.yml yarn workspace @shopana/orders-service run dev

dev\:orchestrator:
	@scripts/kill-port.sh 3030 2>/dev/null || true
	CONFIG_FILE=config.dev.yml yarn workspace @shopana/orchestrator-service run dev

# Start ALL services together (Orchestrator + Platform)
dev:
	@echo "Starting all services together..."
	@./scripts/dev-start-all.sh

# Start ALL NEW services (Orchestrator + New Platform microservices)
dev\:new:
	@echo "Starting all NEW services (no Casdoor needed)..."
	@./scripts/dev-start-new-services.sh

# Auto-start ALL services in one terminal (Orchestrator in tmux + Platform)
dev\:auto:
	@./scripts/dev-start-all-auto.sh

# Platform (Go) commands - use .env.dev for local development
dev\:platform:
	@echo "Starting Platform monolith with .env.dev..."
	@cd platform && cp .env.dev .env && make start

dev\:platform-project:
	@echo "Starting Project Service with .env.dev..."
	@cd platform && cp .env.dev .env && make project:start

dev\:platform-media:
	@echo "Starting Media Service with .env.dev..."
	@cd platform && cp .env.dev .env && make media:start

# Docker build commands
SERVICE ?= checkout
TAG ?= latest

docker\:build:
	@echo "Building $(SERVICE) service with tag $(TAG)..."
	@docker build \
		--build-arg SERVICE_NAME=$(SERVICE) \
		--build-arg NODE_VERSION=20 \
		-t shopana/$(SERVICE)-service:$(TAG) \
		-f services/Dockerfile \
		.

docker\:build-checkout:
	@$(MAKE) docker:build SERVICE=checkout

docker\:build-orders:
	@$(MAKE) docker:build SERVICE=orders

docker\:build-payments:
	@$(MAKE) docker:build SERVICE=payments

docker\:build-delivery:
	@$(MAKE) docker:build SERVICE=delivery

docker\:build-inventory:
	@$(MAKE) docker:build SERVICE=inventory

docker\:build-pricing:
	@$(MAKE) docker:build SERVICE=pricing

docker\:build-apps:
	@$(MAKE) docker:build SERVICE=apps

docker\:build-orchestrator:
	@$(MAKE) docker:build SERVICE=orchestrator

# ============================================
# Local Development Environment Management
# ============================================

# Default development mode
PRESET ?= dev

dev\:up:
	@echo "Starting development environment (preset: $(PRESET))..."
	@if [ ! -f ansible/playbooks/local-dev/vars/$(PRESET).yml ] && [ "$(PRESET)" != "dev" ]; then \
		echo "Error: Preset '$(PRESET)' not found. Available presets:"; \
		echo "  - dev (default/custom)"; \
		echo "  - preset-minimal"; \
		echo "  - preset-fullstack"; \
		echo "  - preset-production-like"; \
		exit 1; \
	fi
	@if [ "$(PRESET)" = "dev" ]; then \
		ansible-playbook ansible/playbooks/local-dev/dev-up.yml; \
	else \
		ansible-playbook ansible/playbooks/local-dev/dev-up.yml -e @ansible/playbooks/local-dev/vars/$(PRESET).yml; \
	fi

dev\:down:
	@echo "Stopping development environment..."
	@ansible-playbook ansible/playbooks/local-dev/dev-down.yml

dev\:status:
	@echo "Development Environment Status"
	@echo "======================================"
	@echo ""
	@echo "Infrastructure Services:"
	@docker-compose -f docker-compose.dev-infrastructure.yml ps
	@echo ""
	@echo "Application Services:"
	@docker-compose -f docker-compose.dev-services.yml ps
	@echo ""
	@echo "Environment info: cat .env.dev"

dev\:logs:
	@echo "Following logs for all Docker services..."
	@echo "Press Ctrl+C to stop"
	@docker-compose -f docker-compose.dev-infrastructure.yml logs -f & \
	docker-compose -f docker-compose.dev-services.yml logs -f

dev\:minimal:
	@echo "Starting minimal development environment..."
	@$(MAKE) dev:up PRESET=preset-minimal

dev\:fullstack:
	@echo "Starting full-stack development environment..."
	@$(MAKE) dev:up PRESET=preset-fullstack

dev\:production-like:
	@echo "Starting production-like development environment..."
	@$(MAKE) dev:up PRESET=preset-production-like

dev\:help:
	@echo "Development Environment Commands"
	@echo "======================================"
	@echo ""
	@echo "🚀 Quick Start:"
	@echo "  make dev                 - Start ALL services (Orchestrator + Platform)"
	@echo ""
	@echo "Environment Management:"
	@echo "  make dev:up              - Start development environment (default config)"
	@echo "  make dev:up PRESET=...   - Start with specific preset"
	@echo "  make dev:down            - Stop development environment"
	@echo "  make dev:status          - Show status of all services"
	@echo "  make dev:logs            - Follow logs from all services"
	@echo ""
	@echo "Quick Presets:"
	@echo "  make dev:minimal         - Minimal (orchestrator mode, cloud DB)"
	@echo "  make dev:fullstack       - Full local stack (all infrastructure local)"
	@echo "  make dev:production-like - Production-like (all in Docker)"
	@echo ""
	@echo "Individual Service Commands:"
	@echo "  make dev:checkout        - Run checkout service locally"
	@echo "  make dev:orders          - Run orders service locally"
	@echo "  make dev:apps            - Run apps service locally"
	@echo "  make dev:inventory       - Run inventory service locally"
	@echo "  make dev:pricing         - Run pricing service locally"
	@echo "  make dev:shipping        - Run delivery service locally"
	@echo "  make dev:orchestrator    - Run orchestrator locally"
	@echo ""
	@echo "Configuration:"
	@echo "  Edit: ansible/playbooks/local-dev/vars/dev.yml"
	@echo "  Presets: ansible/playbooks/local-dev/vars/preset-*.yml"
	@echo ""
	@echo "Examples:"
	@echo "  # Start with custom config"
	@echo "  make dev:up"
	@echo ""
	@echo "  # Start minimal environment"
	@echo "  make dev:minimal"
	@echo ""
	@echo "  # Stop everything"
	@echo "  make dev:down"
