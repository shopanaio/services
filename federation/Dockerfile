# Hive Gateway for development (Node.js)
FROM node:20-alpine

WORKDIR /app

# Install Hive Gateway globally
RUN npm install -g @graphql-hive/gateway

# Copy supergraph schema
COPY supergraph.graphql .

EXPOSE 4000

CMD ["hive-gateway", "supergraph", "--supergraph", "supergraph.graphql", "--port", "4000"]
