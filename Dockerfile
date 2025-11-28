# Multi-stage build para backend Node/TypeScript
FROM node:18-alpine AS builder

# Dependencia para manejo de señales
RUN apk add --no-cache dumb-init

WORKDIR /app

# Instalar dependencias (incluyendo dev) usando lockfile
COPY package*.json ./
COPY tsconfig*.json ./
RUN npm ci

# Copiar código fuente y compilar
COPY src ./src
RUN npm run build

# Imagen de producción
FROM node:18-alpine AS production

RUN apk add --no-cache dumb-init

WORKDIR /app

# Crear usuario no-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Instalar solo dependencias de runtime
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copiar build compilado y archivos necesarios
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --chown=nodejs:nodejs firestore.indexes.json ./firestore.indexes.json

USER nodejs

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Healthcheck simple contra /health
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "const http=require('http');http.get('http://localhost:3000/health',(r)=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
