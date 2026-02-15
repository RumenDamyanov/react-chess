# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies first (layer caching)
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Copy source and build
COPY index.html vite.config.ts tsconfig*.json ./
COPY public/ public/
COPY src/ src/

RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Custom nginx config for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
    CMD wget -qO- http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
