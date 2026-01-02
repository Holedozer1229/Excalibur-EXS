# Excalibur-EXS Complete System Dockerfile
# Multi-stage build for optimal size and security

# Stage 1: Go Builder
FROM golang:1.21-alpine AS go-builder

WORKDIR /build

# Install build dependencies
RUN apk add --no-cache git make gcc musl-dev

# Copy Go modules
COPY go.mod go.sum ./
RUN go mod download

# Copy Go source
COPY cmd/ ./cmd/
COPY pkg/ ./pkg/

# Build Go binaries
RUN go build -ldflags="-s -w" -o /bin/rosetta ./cmd/rosetta/
RUN cd miners/tetra-pow-go && go build -ldflags="-s -w" -o /bin/tetra-pow-miner

# Stage 2: Python Base
FROM python:3.11-slim AS python-base

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy Python modules
COPY pkg/ ./pkg/
COPY miners/ ./miners/
COPY ledger/ ./ledger/

# Install optional Python dependencies
RUN pip install --no-cache-dir aiohttp || echo "aiohttp installation optional"

# Stage 3: Web Assets
FROM node:18-alpine AS web-builder

WORKDIR /web

# Copy web assets
COPY web/ ./

# Build web interfaces (if needed)
RUN cd knights-round-table && npm install --production || echo "No npm install needed"
RUN cd forge-ui && npm install --production || echo "No npm install needed"

# Stage 4: Final Runtime
FROM python:3.11-slim

LABEL maintainer="Travis D. Jones <holedozer@gmail.com>"
LABEL description="Excalibur-EXS Complete System"
LABEL version="2.0.0"

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    nginx \
    supervisor \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy from builders
COPY --from=go-builder /bin/rosetta /usr/local/bin/
COPY --from=go-builder /bin/tetra-pow-miner /usr/local/bin/
COPY --from=python-base /app/ /app/
COPY --from=python-base /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=web-builder /web/ /app/web/

# Copy additional files
COPY admin/ /app/admin/
COPY website/ /app/website/
COPY docker/nginx/nginx.conf /etc/nginx/nginx.conf
COPY scripts/ /app/scripts/
COPY *.md /app/
COPY LICENSE /app/

# Create necessary directories
RUN mkdir -p /app/data /app/logs /var/log/supervisor

# Copy supervisor configuration
COPY docker/supervisor/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Expose ports
EXPOSE 80 443 8080 5000

# Environment variables
ENV PYTHONPATH=/app/pkg
ENV EXCALIBUR_ENV=production
ENV DIFFICULTY=4
ENV PORT=8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Entry point
COPY docker/docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
