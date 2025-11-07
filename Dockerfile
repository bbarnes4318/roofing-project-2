# Multi-stage build for React + Node.js
FROM node:20-alpine AS frontend-build

WORKDIR /app

# Copy frontend package files
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy frontend source
COPY src ./src
COPY public ./public
COPY tailwind.config.js ./
COPY postcss.config.js ./

# Inject build-time env vars for CRA
ARG REACT_APP_SUPABASE_URL
ARG REACT_APP_SUPABASE_ANON_KEY
ARG REACT_APP_API_URL
ARG REACT_APP_SOCKET_URL
ENV REACT_APP_SUPABASE_URL=$REACT_APP_SUPABASE_URL
ENV REACT_APP_SUPABASE_ANON_KEY=$REACT_APP_SUPABASE_ANON_KEY
ENV REACT_APP_API_URL=$REACT_APP_API_URL
ENV REACT_APP_SOCKET_URL=$REACT_APP_SOCKET_URL

# Build frontend
RUN npm run build

# Backend stage
FROM node:20-alpine AS backend

# Install OpenSSL for Prisma compatibility
RUN apk add --no-cache openssl

WORKDIR /app

# Copy backend package files and Prisma schema (needed for postinstall)
COPY server/package*.json ./
COPY server/prisma ./prisma
# Install server deps including dev so prisma generate can run
RUN npm install --legacy-peer-deps

# Copy backend source
COPY server ./

# Copy built frontend
COPY --from=frontend-build /app/build ./public

# Create uploads directories so they always exist in the container
RUN mkdir -p /app/uploads/company-assets /app/uploads/documents

# Generate Prisma client, then prune dev deps for smaller image
RUN npx prisma generate && npm prune --omit=dev

EXPOSE 8080
CMD ["npm", "start"]