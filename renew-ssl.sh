#!/bin/bash

# PalPalette SSL Certificate Auto-Renewal Script
# This script automatically renews Let's Encrypt certificates and restarts services

set -e

DOMAIN=${1:-"your-domain.com"}
LOG_FILE="/var/log/palpalette-ssl-renewal.log"

echo "$(date): Starting SSL certificate renewal check for $DOMAIN" >> $LOG_FILE

# Check if certificate needs renewal (renew if expires in 30 days or less)
if certbot renew --dry-run --quiet; then
    echo "$(date): Certificate check passed" >> $LOG_FILE
    
    # Actually renew the certificate
    certbot renew --quiet
    
    # Check if renewal happened (certbot renew only renews if needed)
    if [ $? -eq 0 ]; then
        echo "$(date): Certificate renewed successfully" >> $LOG_FILE
        
        # Copy renewed certificates to our SSL directory
        if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
            cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem ssl/certs/palpalette.crt
            cp /etc/letsencrypt/live/$DOMAIN/privkey.pem ssl/private/palpalette.key
            
            # Set proper permissions
            chmod 644 ssl/certs/palpalette.crt
            chmod 600 ssl/private/palpalette.key
            chown $(whoami):$(whoami) ssl/certs/palpalette.crt ssl/private/palpalette.key
            
            echo "$(date): Certificates copied to ssl/ directory" >> $LOG_FILE
            
            # Restart the services to use new certificates
            docker-compose -f docker-compose.production.yml restart nginx
            
            echo "$(date): Nginx restarted with new certificates" >> $LOG_FILE
            echo "$(date): SSL renewal complete!" >> $LOG_FILE
        else
            echo "$(date): ERROR - Certificate files not found in Let's Encrypt directory" >> $LOG_FILE
        fi
    else
        echo "$(date): No renewal needed - certificate still valid" >> $LOG_FILE
    fi
else
    echo "$(date): ERROR - Certificate renewal check failed" >> $LOG_FILE
    exit 1
fi