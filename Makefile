.SILENT:

.PHONY: apollo\:storefront apollo\:admin build\:packages dev\:checkout dev\:apps dev\:inventory dev\:pricing dev\:shipping dev\:orders dev\:orchestrator
.PHONY: docker\:build docker\:build-checkout docker\:build-orders docker\:build-payments docker\:build-delivery docker\:build-inventory docker\:build-pricing docker\:build-apps docker\:build-orchestrator
.PHONY: network network-create db-up db-down nats-up nats-down platform-up platform-down services-up services-down infra-up infra-down up down logs status

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
	yarn workspace @shopana/checkout-service run dev

dev\:apps:
	yarn workspace @shopana/apps-service run dev

dev\:inventory:
	yarn workspace @shopana/inventory-service run dev

dev\:pricing:
	yarn workspace @shopana/pricing-service run dev

dev\:shipping:
	yarn workspace @shopana/delivery-service run dev

dev\:orders:
	yarn workspace @shopana/orders-service run dev

dev\:orchestrator:
	yarn workspace @shopana/orchestrator-service run dev

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

# Network management
network: network-create

network-create:
	@echo "Creating Docker network..."
	@docker network inspect shopana-network >/dev/null 2>&1 || docker network create shopana-network
	@echo "Network 'shopana-network' is ready"

# Database management
db-up:
	@echo "Starting PostgreSQL..."
	@docker-compose -f platform/docker-compose.db.yml up -d
	@echo "Waiting for PostgreSQL to be ready..."
	@sleep 3
	@docker exec postgres pg_isready -U postgres || (echo "PostgreSQL is not ready yet, waiting..." && sleep 3)
	@echo "PostgreSQL is ready"

db-down:
	@echo "Stopping PostgreSQL..."
	@docker-compose -f platform/docker-compose.db.yml down

db-logs:
	@docker-compose -f platform/docker-compose.db.yml logs -f

# NATS management
nats-up:
	@echo "Starting NATS..."
	@docker-compose -f docker-compose.nats.yml up -d
	@echo "Waiting for NATS to be ready..."
	@sleep 3
	@docker exec shopana-nats wget --spider -q http://localhost:8222/healthz && echo "NATS is ready" || echo "NATS healthcheck failed, but container is running"

nats-down:
	@echo "Stopping NATS..."
	@docker-compose -f docker-compose.nats.yml down

nats-logs:
	@docker-compose -f docker-compose.nats.yml logs -f

# Platform management
platform-up:
	@echo "Starting Platform..."
	@docker-compose -f platform/docker-compose.platform.yml up -d
	@echo "Platform is starting..."

platform-down:
	@echo "Stopping Platform..."
	@docker-compose -f platform/docker-compose.platform.yml down

platform-logs:
	@docker-compose -f platform/docker-compose.platform.yml logs -f

platform-build:
	@echo "Building Platform..."
	@docker-compose -f platform/docker-compose.platform.yml build

# Services management
services-up:
	@echo "Starting Services..."
	@docker-compose -f docker-compose.services.yml up -d
	@echo "Services are starting..."

services-down:
	@echo "Stopping Services..."
	@docker-compose -f docker-compose.services.yml down

services-logs:
	@docker-compose -f docker-compose.services.yml logs -f

services-build:
	@echo "Building Services..."
	@docker-compose -f docker-compose.services.yml build

# Infrastructure (DB + NATS)
infra-up: network db-up nats-up
	@echo "Infrastructure is ready"

infra-down: nats-down db-down
	@echo "Infrastructure stopped"

# Full stack management
up: infra-up platform-up services-up
	@echo "Full stack is running"
	@echo ""
	@echo "Services:"
	@echo "  - PostgreSQL: localhost:5432"
	@echo "  - NATS: localhost:4222 (HTTP: localhost:8222)"
	@echo "  - Platform: localhost:8000 (gRPC: localhost:50051)"
	@echo "  - Checkout Service: localhost:3001"
	@echo "  - Orders Service: localhost:3002"
	@echo "  - Payments Service: localhost:3003"
	@echo "  - Delivery Service: localhost:3004"
	@echo "  - Inventory Service: localhost:3005"
	@echo "  - Pricing Service: localhost:3006"
	@echo "  - Apps Service: localhost:3008"

down: services-down platform-down infra-down
	@echo "Full stack stopped"

# Status and logs
status:
	@echo "=== Docker Containers Status ==="
	@docker ps --filter "name=postgres" --filter "name=shopana-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

logs:
	@echo "=== Recent logs from all containers ==="
	@docker logs postgres --tail 20 2>&1 | head -20 || true
	@docker logs shopana-nats --tail 20 2>&1 | head -20 || true
	@docker logs shopana-platform --tail 20 2>&1 | head -20 || true
	@docker logs shopana-checkout-service --tail 20 2>&1 | head -20 || true
	@docker logs shopana-orders-service --tail 20 2>&1 | head -20 || true

# Restart commands
restart: down up

restart-platform: platform-down platform-up

restart-services: services-down services-up

restart-infra: infra-down infra-up
