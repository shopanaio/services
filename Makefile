.SILENT:

.PHONY: apollo\:start apollo\:stop apollo\:build build\:packages dev\:checkout dev\:apps dev\:inventory dev\:pricing dev\:shipping dev\:orders dev\:orchestrator dev\:platform dev\:platform-project dev\:platform-media
.PHONY: docker\:build docker\:build-checkout docker\:build-orders docker\:build-payments docker\:build-delivery docker\:build-inventory docker\:build-pricing docker\:build-apps docker\:build-orchestrator
.PHONY: dev\:nats dev\:nats\:stop dev\:db dev\:db\:stop dev\:s3 dev\:s3\:stop dev\:help

# ============================================
# Apollo Federation Gateway
# ============================================

apollo\:start:
	@echo "Starting Apollo Federation Gateway..."
	@ansible-playbook ansible/playbooks/apollo/local.yml

apollo\:stop:
	@echo "Stopping Apollo Federation Gateway..."
	@cd ansible/playbooks/apollo/runtime && docker compose down

apollo\:build:
	@echo "Building Apollo Router schemas..."
	@cd apollo && tsx scripts/build-schemas.js

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
# Infrastructure Services (Individual)
# ============================================

# Start NATS message broker
dev\:nats:
	@echo "Starting NATS service..."
	@docker network create shopana-network 2>/dev/null || true
	@docker-compose -f docker-compose.dev-infrastructure.yml up -d nats
	@echo "NATS is running on:"
	@echo "  Client: localhost:4222"
	@echo "  HTTP:   localhost:8222"

dev\:nats\:stop:
	@echo "Stopping NATS service..."
	@docker-compose -f docker-compose.dev-infrastructure.yml stop nats
	@docker-compose -f docker-compose.dev-infrastructure.yml rm -f nats

# Start PostgreSQL database
dev\:db:
	@echo "Starting PostgreSQL service..."
	@docker network create shopana-network 2>/dev/null || true
	@docker-compose -f docker-compose.dev-infrastructure.yml --profile local-db up -d postgres
	@echo "PostgreSQL is running on localhost:5432"
	@echo "  User: postgres"
	@echo "  Password: postgres"
	@echo "  Database: portal"

dev\:db\:stop:
	@echo "Stopping PostgreSQL service..."
	@docker-compose -f docker-compose.dev-infrastructure.yml --profile local-db stop postgres
	@docker-compose -f docker-compose.dev-infrastructure.yml --profile local-db rm -f postgres

# Start MinIO (S3-compatible storage)
dev\:s3:
	@echo "Starting MinIO (S3) service..."
	@docker network create shopana-network 2>/dev/null || true
	@docker-compose -f docker-compose.dev-infrastructure.yml --profile local-storage up -d minio
	@echo "MinIO is running on:"
	@echo "  API:     localhost:9000"
	@echo "  Console: localhost:9001"
	@echo "  User: minioadmin"
	@echo "  Password: minioadmin"

dev\:s3\:stop:
	@echo "Stopping MinIO service..."
	@docker-compose -f docker-compose.dev-infrastructure.yml --profile local-storage stop minio
	@docker-compose -f docker-compose.dev-infrastructure.yml --profile local-storage rm -f minio

# ============================================
# Help
# ============================================

dev\:help:
	@echo "Development Commands"
	@echo "======================================"
	@echo ""
	@echo "Apollo Federation Gateway:"
	@echo "  make apollo:start        - Start Apollo Federation Gateway (Admin + Storefront)"
	@echo "  make apollo:stop         - Stop Apollo Federation Gateway"
	@echo "  make apollo:build        - Build/export all subgraph schemas"
	@echo ""
	@echo "Infrastructure Services:"
	@echo "  make dev:nats            - Start NATS message broker"
	@echo "  make dev:nats:stop       - Stop NATS"
	@echo "  make dev:db              - Start PostgreSQL database"
	@echo "  make dev:db:stop         - Stop PostgreSQL"
	@echo "  make dev:s3              - Start MinIO (S3-compatible storage)"
	@echo "  make dev:s3:stop         - Stop MinIO"
	@echo ""
	@echo "Application Services:"
	@echo "  make dev:checkout        - Run checkout service"
	@echo "  make dev:orders          - Run orders service"
	@echo "  make dev:apps            - Run apps service"
	@echo "  make dev:inventory       - Run inventory service"
	@echo "  make dev:pricing         - Run pricing service"
	@echo "  make dev:shipping        - Run delivery service"
	@echo "  make dev:orchestrator    - Run orchestrator service"
	@echo ""
	@echo "Platform Services (Go):"
	@echo "  make dev:platform        - Run Platform monolith"
	@echo "  make dev:platform-project - Run Project service"
	@echo "  make dev:platform-media  - Run Media service"
	@echo ""
	@echo "Build Commands:"
	@echo "  make build:packages      - Build all packages"
	@echo ""
	@echo "Examples:"
	@echo "  # Start infrastructure"
	@echo "  make dev:nats"
	@echo "  make dev:db"
	@echo "  make dev:s3"
	@echo ""
	@echo "  # Start Apollo Federation"
	@echo "  make apollo:start"
	@echo ""
	@echo "  # Start a service"
	@echo "  make dev:orchestrator"
