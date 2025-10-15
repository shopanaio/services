IMAGE ?= shopana/apollo-rover
TAG ?= latest
PLATFORMS ?= linux/amd64,linux/arm64

.PHONY: build

build:
	docker buildx build --platform $(PLATFORMS) -t $(IMAGE):$(TAG) . --load
