# =========================
# ===== Build stage ======
# =========================
FROM node:20-slim AS build

WORKDIR /app

# Install openssl (needed for Prisma engines)
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy only package files first for caching
COPY package.json package-lock.json ./
COPY frontend/package.json frontend/package-lock.json ./frontend/

# Install all deps (including dev)
RUN npm ci && cd frontend && npm ci

# Copy the rest of the project (filtered by .dockerignore)
COPY . .

# Build frontend and generate Prisma client
RUN npm run build:frontend && npx prisma generate


# =========================
# ===== Runtime stage ====
# =========================
FROM node:20-slim

WORKDIR /app

# Install openssl for Prisma runtime
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy package files and install ONLY production deps
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Copy the whole app (minus ignored stuff)
COPY . .

# Copy built frontend from build stage
COPY --from=build /app/frontend/dist ./frontend/dist

# Copy generated Prisma client
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma

# Expose your app port
EXPOSE 3000

# Start app
CMD ["sh", "-c", "npx prisma migrate deploy && node index.js"]
