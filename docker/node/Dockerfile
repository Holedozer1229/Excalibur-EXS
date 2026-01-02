# Multi-stage Dockerfile for Excalibur-EXS Console Node

# Stage 1: Build Go application
FROM golang:1.21-alpine AS go-builder

WORKDIR /build

# Install build dependencies
RUN apk add --no-cache git make gcc musl-dev

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY cmd/ ./cmd/
COPY pkg/ ./pkg/

# Build binary
WORKDIR /build/cmd/exs-node
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-s -w" -o exs-node

# Stage 2: Final image
FROM ubuntu:22.04

LABEL maintainer="Travis D Jones <holedozer@gmail.com>"
LABEL description="Excalibur-EXS Console Node"
LABEL version="1.0.0"

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    python3 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create user
RUN useradd -m -u 1000 -s /bin/bash excalibur && \
    mkdir -p /home/excalibur/.excalibur-exs && \
    chown -R excalibur:excalibur /home/excalibur

# Copy binaries
COPY --from=go-builder /build/cmd/exs-node/exs-node /usr/local/bin/
COPY cmd/exs-wallet/wallet_cli.py /usr/local/bin/exs-wallet

# Make executables
RUN chmod +x /usr/local/bin/exs-node /usr/local/bin/exs-wallet

# Switch to non-root user
USER excalibur
WORKDIR /home/excalibur

# Create data directory
RUN mkdir -p /home/excalibur/.excalibur-exs/{data,wallets,logs}

# Expose ports
EXPOSE 8332 8333 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD exs-node node status || exit 1

# Default command
ENTRYPOINT ["/usr/local/bin/exs-node"]
CMD ["node", "start", "--mode", "full"]
