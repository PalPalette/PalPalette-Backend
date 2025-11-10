#!/bin/bash

# SSL Certificate Setup Script for PalPalette Backend
# This script helps set up SSL certificates for HTTPS deployment

set -e

echo "🔒 PalPalette SSL Certificate Setup"
echo "=================================="

# Create SSL directory
mkdir -p ssl/certs ssl/private

# Check if domain is provided
if [ -z "$1" ]; then
    echo "❌ Error: Please provide your domain name"
    echo "Usage: ./setup-ssl.sh your-domain.com"
    exit 1
fi

DOMAIN=$1
echo "📜 Setting up SSL for domain: $DOMAIN"

# Option 1: Let's Encrypt (Recommended for production)
echo ""
echo "Choose SSL certificate method:"
echo "1) Let's Encrypt (Free, recommended for production)"
echo "2) Self-signed certificate (For testing only)"
read -p "Enter choice [1-2]: " choice

case $choice in
    1)
        echo "🔄 Setting up Let's Encrypt certificate..."
        
        # Check if certbot is installed
        if ! command -v certbot &> /dev/null; then
            echo "📦 Installing certbot..."
            sudo apt update
            sudo apt install -y certbot
        fi
        
        # Generate certificate
        echo "🔐 Generating Let's Encrypt certificate for $DOMAIN"
        echo "⚠️  Make sure your domain points to this server's public IP!"
        read -p "Press Enter to continue..."
        
        sudo certbot certonly --standalone -d $DOMAIN --email admin@$DOMAIN --agree-tos --no-eff-email
        
        # Copy certificates to our SSL directory
        sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem ssl/certs/palpalette.crt
        sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem ssl/private/palpalette.key
        
        # Set proper permissions
        sudo chmod 644 ssl/certs/palpalette.crt
        sudo chmod 600 ssl/private/palpalette.key
        sudo chown $(whoami):$(whoami) ssl/certs/palpalette.crt ssl/private/palpalette.key
        
        echo "✅ Let's Encrypt certificate installed successfully!"
        ;;
        
    2)
        echo "🔄 Generating self-signed certificate..."
        
        # Generate self-signed certificate
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout ssl/private/palpalette.key \
            -out ssl/certs/palpalette.crt \
            -subj "/C=US/ST=State/L=City/O=PalPalette/CN=$DOMAIN"
            
        echo "✅ Self-signed certificate generated!"
        echo "⚠️  Note: Browsers will show security warnings for self-signed certificates"
        ;;
        
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

# Update nginx configuration with correct domain
sed -i "s/your-domain.com/$DOMAIN/g" nginx.conf/palpalette.conf

# Update environment configuration
if [ -f .env.production ]; then
    sed -i "s/your-domain.com/$DOMAIN/g" .env.production
    echo "✅ Updated .env.production with domain: $DOMAIN"
fi

echo ""
echo "🎉 SSL setup complete!"
echo "📁 Certificate files:"
echo "   - Certificate: ssl/certs/palpalette.crt"
echo "   - Private key: ssl/private/palpalette.key"
echo ""
echo "📝 Next steps:"
echo "1. Update your domain DNS to point to this server"
echo "2. Update .env.production with your actual configuration"
echo "3. Run: docker-compose -f docker-compose.production.yml up -d"
echo ""
echo "🌍 Your PalPalette backend will be available at:"
echo "   - HTTPS API: https://$DOMAIN/api"
echo "   - WebSocket: wss://$DOMAIN:3001/ws"