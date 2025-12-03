#!/bin/bash

# Docker Compose Version Check and Compatibility Script

echo "🐳 Checking Docker Compose Installation"
echo "======================================="

# Check Docker installation
if command -v docker &> /dev/null; then
    echo "✅ Docker installed: $(docker --version)"
else
    echo "❌ Docker not found - please install Docker first"
    exit 1
fi

# Check Docker Compose V2 (preferred)
if docker compose version &> /dev/null; then
    echo "✅ Docker Compose V2 found: $(docker compose version)"
    COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    echo "⚠️  Docker Compose V1 found: $(docker-compose --version)"
    echo "📝 Note: V1 is deprecated, consider upgrading to V2"
    COMPOSE_CMD="docker-compose"
else
    echo "❌ Docker Compose not found"
    echo "📥 Install with: sudo apt install docker-compose-plugin"
    exit 1
fi

echo ""
echo "🔧 Using command: $COMPOSE_CMD"
echo ""

# Test with production compose file
if [ -f "docker-compose.production.yml" ]; then
    echo "🧪 Testing configuration..."
    if $COMPOSE_CMD -f docker-compose.production.yml config &> /dev/null; then
        echo "✅ Docker Compose configuration is valid"
    else
        echo "❌ Docker Compose configuration has errors:"
        $COMPOSE_CMD -f docker-compose.production.yml config
        exit 1
    fi
else
    echo "⚠️  docker-compose.production.yml not found"
fi

echo ""
echo "🎉 Ready for deployment!"
echo "Run: ./deploy.sh your-domain.com"