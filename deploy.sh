#!/bin/bash

# PalPalette Backend Deployment Script
# For deploying to university Linux server with HTTPS

set -e

echo "🚀 PalPalette Backend Deployment"
echo "================================"

# Check if domain is provided
if [ -z "$1" ]; then
    echo "❌ Error: Please provide your domain name"
    echo "Usage: ./deploy.sh your-domain.com"
    exit 1
fi

DOMAIN=$1

echo "📋 Pre-deployment checklist:"
echo "✅ Domain $DOMAIN points to this server"
echo "✅ Ports 80, 443, and 3001 are open"
echo "✅ Docker and Docker Compose are installed"
echo "✅ You have sudo access"
echo ""
read -p "Continue with deployment? [y/N]: " confirm

if [[ $confirm != [yY] ]]; then
    echo "❌ Deployment cancelled"
    exit 1
fi

# Step 1: Setup SSL certificates
echo "🔒 Setting up SSL certificates..."
chmod +x setup-ssl.sh
./setup-ssl.sh $DOMAIN

# Step 2: Validate environment configuration
echo "🔧 Checking environment configuration..."
if [ ! -f .env.production ]; then
    echo "❌ Error: .env.production file not found"
    echo "Please copy and configure .env.production from .env.production.example"
    exit 1
fi

# Check for required environment variables
required_vars=("DB_PASSWORD" "JWT_SECRET")
for var in "${required_vars[@]}"; do
    if ! grep -q "^${var}=" .env.production || grep -q "^${var}=your-" .env.production; then
        echo "❌ Error: Please set $var in .env.production"
        exit 1
    fi
done

# Step 3: Setup SSL Auto-Renewal
echo "⏰ Setting up SSL certificate auto-renewal..."
chmod +x renew-ssl.sh

# Create cron job for auto-renewal (runs daily at 2 AM)
CRON_JOB="0 2 * * * cd $(pwd) && ./renew-ssl.sh $DOMAIN"
(crontab -l 2>/dev/null | grep -v "renew-ssl.sh"; echo "$CRON_JOB") | crontab -

echo "✅ SSL auto-renewal configured (daily at 2 AM)"

# Step 4: Build and start services
echo "🐳 Building and starting Docker services..."
docker compose -f docker-compose.production.yml down || true
docker compose -f docker-compose.production.yml build --no-cache
docker compose -f docker-compose.production.yml up -d

# Step 4: Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 30

# Step 5: Run database migrations
echo "📊 Running database migrations..."
docker compose -f docker-compose.production.yml exec backend npm run migration:run

# Step 6: Health check
echo "🏥 Performing health check..."
if curl -f -k https://$DOMAIN/api/health > /dev/null 2>&1; then
    echo "✅ HTTPS API is responding"
else
    echo "⚠️  HTTPS API health check failed - this may be normal if the API doesn't have a health endpoint"
fi

# Check if WebSocket port is open
if nc -z $DOMAIN 3001; then
    echo "✅ WebSocket port 3001 is accessible"
else
    echo "❌ WebSocket port 3001 is not accessible"
fi

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "🌍 Your PalPalette backend is now available at:"
echo "   📱 Mobile API: https://$DOMAIN/api"
echo "   📋 API Docs:   https://$DOMAIN/api-docs"
echo "   🔌 WebSocket:  wss://$DOMAIN:3001/ws"
echo ""
echo "📝 Next steps:"
echo "1. Update your mobile app to use: https://$DOMAIN/api"
echo "2. Update ESP32 devices to use:"
echo "   - HTTPS API: https://$DOMAIN/api"
echo "   - WSS: wss://$DOMAIN:3001/ws"
echo "3. Test device registration and WebSocket connections"
echo ""
echo "📊 Useful commands:"
echo "   - View logs: docker compose -f docker-compose.production.yml logs -f"
echo "   - Restart:   docker compose -f docker-compose.production.yml restart"
echo "   - Stop:      docker compose -f docker-compose.production.yml down"
echo ""
echo "🔒 SSL Certificate Management:"
echo "   - Auto-renewal: Configured to run daily at 2 AM"
echo "   - Manual renewal: ./renew-ssl.sh $DOMAIN"
echo "   - Check renewal logs: tail -f /var/log/palpalette-ssl-renewal.log"
echo "   - Certificate expires every 90 days (Let's Encrypt)"