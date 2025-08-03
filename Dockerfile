# Multi-stage build for React + Node.js
FROM node:18-alpine AS frontend-build

WORKDIR /app

# Copy frontend package files
COPY package*.json ./
RUN npm install

# Copy frontend source
COPY src ./src
COPY public ./public
COPY tailwind.config.js ./
COPY postcss.config.js ./

# Build frontend
RUN npm run build

# Backend stage
FROM node:18-alpine AS backend

WORKDIR /app

# Copy backend package files
COPY server/package*.json ./
# Install all dependencies including xlsx, csv-parse, multer
RUN npm install --production=false

# Copy backend source
COPY server ./
COPY prisma ./prisma

# Copy built frontend
COPY --from=frontend-build /app/build ./public

# Generate Prisma client
RUN npx prisma generate

EXPOSE 8080

CMD ["npm", "start"]