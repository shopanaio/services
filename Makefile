.SILENT:

.PHONY: apollo\:storefront apollo\:admin build\:packages dev\:checkout dev\:apps dev\:inventory dev\:pricing dev\:shipping dev\:platform dev\:orders
.PHONY: docker\:build docker\:build-checkout docker\:build-orders docker\:build-payments docker\:build-delivery docker\:build-inventory docker\:build-pricing docker\:build-platform docker\:build-apps

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

dev\:platform:
	yarn workspace @shopana/platform-service run dev

dev\:orders:
	yarn workspace @shopana/orders-service run dev

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

docker\:build-platform:
	@$(MAKE) docker:build SERVICE=platform

docker\:build-apps:
	@$(MAKE) docker:build SERVICE=apps
