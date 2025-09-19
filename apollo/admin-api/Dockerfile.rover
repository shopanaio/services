FROM debian:bullseye-slim

RUN apt-get update && apt-get install -y curl ca-certificates && rm -rf /var/lib/apt/lists/*

# Install Rover
RUN curl -sSL https://rover.apollo.dev/nix/latest | sh && \
    mv /root/.rover/bin/rover /usr/local/bin/rover

WORKDIR /workspace
ENTRYPOINT ["rover"]
