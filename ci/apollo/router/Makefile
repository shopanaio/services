IMAGE ?= shopana/apollo-router
TAG ?= latest
PLATFORMS ?= linux/amd64,linux/arm64
ROUTER_RELEASE ?= latest

.PHONY: build

build:
	docker buildx build --platform $(PLATFORMS) --build-arg ROUTER_RELEASE=$(ROUTER_RELEASE) -t $(IMAGE):$(TAG) . --load
