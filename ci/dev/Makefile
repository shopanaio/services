.PHONY: help start stop restart logs clean setup gitea-start gitea-stop gitea-restart gitea-logs gitea-status gitea-clean

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

setup: ## Setup environment file from example
	@if [ ! -f .env ]; then \
		cp env.example .env; \
		echo "Created .env file. Please edit it with your credentials."; \
	else \
		echo ".env file already exists"; \
	fi

start: ## Start Woodpecker CI
	docker-compose -f docker-compose.woodpecker.yml up -d

stop: ## Stop Woodpecker CI
	docker-compose -f docker-compose.woodpecker.yml down

restart: stop start ## Restart Woodpecker CI

logs: ## Show logs
	docker-compose -f docker-compose.woodpecker.yml logs -f

clean: stop ## Stop and remove data
	rm -rf ./data/woodpecker
	@echo "Woodpecker data cleaned"

status: ## Show container status
	docker-compose -f docker-compose.woodpecker.yml ps

gitea-start: ## Start Gitea (SQLite)
	docker-compose -f docker-compose.gitea.yml up -d

gitea-stop: ## Stop Gitea
	docker-compose -f docker-compose.gitea.yml down

gitea-restart: gitea-stop gitea-start ## Restart Gitea

gitea-logs: ## Show Gitea logs
	docker-compose -f docker-compose.gitea.yml logs -f

gitea-status: ## Show Gitea container status
	docker-compose -f docker-compose.gitea.yml ps

gitea-clean: gitea-stop ## Remove Gitea data
	rm -rf ./data/gitea
	@echo "Gitea data cleaned"
