# Multi-stage build para aplicación TypeScript
FROM node:18-alpine AS builder

# Instalar dependencias del sistema
RUN apk add --no-cache dumb-init

# Crear directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./
COPY tsconfig.json ./

# Instalar todas las dependencias (incluidas dev para build)
RUN npm ci

# Copiar código fuente
COPY src/ ./src/

# Build de TypeScript a JavaScript
RUN npm run build

# Imagen de producción
FROM node:18-alpine AS production

# Instalar dumb-init para manejo de señales
RUN apk add --no-cache dumb-init

# Crear directorio de aplicación
WORKDIR /app

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar solo dependencias de producción
RUN npm ci --only=production && npm cache clean --force

# Copiar el build compilado desde la etapa anterior
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Copiar archivos adicionales necesarios
COPY --chown=nodejs:nodejs firestore.indexes.json ./

# Cambiar a usuario no-root
USER nodejs

# Exponer puerto
EXPOSE 3000

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3000

# Health check específico para la aplicación
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "const http=require('http');http.get('http://localhost:3000/health',(r)=>{if(r.statusCode===200)process.exit(0);process.exit(1)}).on('error',()=>process.exit(1))"

# Comando de inicio con dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]