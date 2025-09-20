.SILENT:

apollo\:storefront:
	docker-compose -f docker-compose.apollo-storefront.yml up --build

apollo\:admin:
	docker-compose -f docker-compose.apollo-admin.yml up --build

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
