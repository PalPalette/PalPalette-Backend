# Multi-stage build for smaller production image
FROM node:lts-alpine AS builder

# Install timezone data for Alpine Linux
RUN apk add --no-cache tzdata

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install all dependencies (including dev dependencies for building)
RUN npm ci --legacy-peer-deps

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:lts-alpine AS production

# Install timezone data for Alpine Linux
RUN apk add --no-cache tzdata

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install only production dependencies
RUN npm ci --only=production --legacy-peer-deps

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S palpalette -u 1001

# Change ownership of the app directory
RUN chown -R palpalette:nodejs /app
USER palpalette

# Expose backend ports
EXPOSE 3000 3001

# Start the backend in production mode
CMD ["node", "dist/main.js"]