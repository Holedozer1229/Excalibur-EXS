#!/bin/bash
# File: scripts/deploy-exs.sh
# Purpose: Deploy full EXS ecosystem with all services
# Components: Miners, Treasury, Guardian, UI, Rosetta

set -e

echo "🗡️  Excalibur EXS Deployment Script"
echo "=================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create Dockerfiles if they don't exist
echo "📦 Creating Dockerfiles..."

# Tetra-PoW Dockerfile
if [ ! -f cmd/tetra_pow/Dockerfile ]; then
    cat > cmd/tetra_pow/Dockerfile <<'EOF'
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY . .
RUN go mod download || true
RUN CGO_ENABLED=0 GOOS=linux go build -o tetra-pow .

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/tetra-pow .
EXPOSE 8082
CMD ["./tetra-pow", "--port", "8082"]
EOF
fi

# Lancelot Guardian Dockerfile
if [ ! -f cmd/lancelot_guardian/Dockerfile ]; then
    cat > cmd/lancelot_guardian/Dockerfile <<'EOF'
FROM python:3.12-slim
WORKDIR /app
RUN pip install --no-cache-dir requests pyyaml flask
COPY guardian.py config.yaml ./
EXPOSE 8084
CMD ["python", "guardian.py"]
EOF
fi

# Treasury Dockerfile  
if [ ! -f cmd/treasury/Dockerfile ]; then
    cat > cmd/treasury/Dockerfile <<'EOF'
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o treasury .

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/treasury .
EXPOSE 8080
CMD ["./treasury"]
EOF
fi

# Rosetta Dockerfile
if [ ! -f cmd/rosetta/Dockerfile ]; then
    cat > cmd/rosetta/Dockerfile <<'EOF'
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o rosetta .

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/rosetta .
EXPOSE 8081
CMD ["./rosetta"]
EOF
fi

# Forge UI Dockerfile
if [ ! -f web/forge-ui/Dockerfile ]; then
    cat > web/forge-ui/Dockerfile <<'EOF'
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["npm", "start"]
EOF
fi

echo "✅ Dockerfiles created"
echo ""

# Build and start services
echo "🚀 Building and starting EXS services..."
docker-compose -f docker-compose.exs.yml up -d --build

echo ""
echo "✅ EXS Ecosystem Deployed!"
echo ""
echo "Services:"
echo "  🗡️  Tetra-PoW Miner:     http://localhost:8082"
echo "  🎲 Dice-Roll Miner:     http://localhost:8083"
echo "  🛡️  Lancelot Guardian:   http://localhost:8084"
echo "  🏛️  Treasury API:        http://localhost:8080"
echo "  🌹 Rosetta API:         http://localhost:8081"
echo "  ⚔️  Forge UI:            http://localhost:3000"
echo ""
echo "Check status: docker-compose -f docker-compose.exs.yml ps"
echo "View logs:    docker-compose -f docker-compose.exs.yml logs -f"
echo "Stop all:     docker-compose -f docker-compose.exs.yml down"
