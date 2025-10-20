#!/bin/bash

# =============================================================================
# Script de Setup Inicial - Menu Inteligente TypeScript
# =============================================================================
# Configura el entorno de desarrollo para el proyecto TypeScript

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Banner
echo "🍽️  Menu Inteligente - Setup TypeScript"
echo "======================================="
echo ""

# Verificar Node.js
log_info "Verificando Node.js..."
if ! command -v node &> /dev/null; then
    log_error "Node.js no está instalado. Instalar versión 18+ desde https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version | sed 's/v//')
REQUIRED_VERSION="18.0.0"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    log_error "Node.js versión $NODE_VERSION encontrada. Se requiere versión 18.0.0 o superior"
    exit 1
fi

log_success "Node.js versión $NODE_VERSION ✓"

# Verificar TypeScript
log_info "Verificando TypeScript..."
if ! command -v tsc &> /dev/null; then
    log_info "TypeScript no está instalado globalmente. Instalando..."
    npm install -g typescript
fi

TS_VERSION=$(tsc --version | cut -d' ' -f2)
log_success "TypeScript versión $TS_VERSION ✓"

# Instalar dependencias
log_info "Instalando dependencias..."
npm ci
log_success "Dependencias instaladas ✓"

# Configurar variables de entorno
log_info "Configurando variables de entorno..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    log_warning "Archivo .env creado desde .env.example"
    log_warning "🔑 IMPORTANTE: Configurar las variables requeridas en .env:"
    log_warning "    - FIREBASE_PROJECT_ID"
    log_warning "    - OPENAI_API_KEY o GEMINI_API_KEY"
    log_warning "    - LLM_DEFAULT_PROVIDER"
else
    log_success "Archivo .env ya existe ✓"
fi

# Crear directorios necesarios
log_info "Creando estructura de directorios..."
mkdir -p logs
mkdir -p dist
mkdir -p config
mkdir -p monitoring/prometheus
mkdir -p monitoring/grafana/dashboards
mkdir -p monitoring/grafana/datasources
log_success "Directorios creados ✓"

# Build inicial del proyecto TypeScript
log_info "Compilando TypeScript..."
npm run build
if [ $? -eq 0 ]; then
    log_success "Build de TypeScript completado ✓"
else
    log_warning "Build falló - revisar errores de TypeScript"
fi

# Verificar configuración de Firebase
log_info "Verificando configuración de Firebase..."
if [ ! -f "config/serviceAccountKey.json" ]; then
    log_warning "📋 Archivo serviceAccountKey.json no encontrado"
    log_warning "   1. Ir a Firebase Console > Project Settings > Service Accounts"
    log_warning "   2. Click 'Generate new private key'"
    log_warning "   3. Guardar como config/serviceAccountKey.json"
fi

# Test de Firestore indexes
if [ -f "firestore.indexes.json" ]; then
    log_success "Configuración de índices Firestore encontrada ✓"
else
    log_warning "firestore.indexes.json no encontrado"
fi

# Verificar Docker (opcional)
log_info "Verificando Docker (opcional)..."
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | sed 's/,//')
    log_success "Docker versión $DOCKER_VERSION ✓"
    
    # Test build Docker
    log_info "Probando build de Docker..."
    docker build -t menu-inteligente-test . &> /dev/null
    if [ $? -eq 0 ]; then
        log_success "Build de Docker: PASS ✓"
        docker rmi menu-inteligente-test &> /dev/null
    else
        log_warning "Build de Docker: FAIL - revisar Dockerfile"
    fi
else
    log_warning "Docker no encontrado. Opcional para desarrollo, requerido para deployment"
fi

# Verificar Azure CLI y AZD
log_info "Verificando herramientas de Azure..."
if command -v az &> /dev/null; then
    log_success "Azure CLI encontrado ✓"
else
    log_warning "Azure CLI no encontrado. Requerido para deployment"
fi

if command -v azd &> /dev/null; then
    log_success "Azure Developer CLI encontrado ✓"
else
    log_warning "Azure Developer CLI no encontrado. Requerido para deployment automatizado"
fi

# Test básico de la aplicación
log_info "Ejecutando tests..."
npm test &> /dev/null
if [ $? -eq 0 ]; then
    log_success "Tests: PASS ✓"
else
    log_warning "Tests: FAIL - revisar configuración"
fi

# Seed de base de datos (opcional)
log_info "¿Quieres cargar datos de prueba en Firestore? (y/N):"
read -r SEED_RESPONSE
if [[ $SEED_RESPONSE =~ ^[Yy]$ ]]; then
    npm run seed
    log_success "Datos de prueba cargados ✓"
fi

echo ""
echo "🎉 Setup completado!"
echo ""
echo "📋 Comandos de desarrollo:"
echo "   npm run dev          # Servidor desarrollo con hot reload"
echo "   npm run build        # Compilar TypeScript"
echo "   npm test             # Ejecutar tests"
echo "   npm run seed         # Cargar datos de prueba"
echo ""
echo "🐳 Comandos Docker:"
echo "   docker-compose up    # Entorno completo con Redis y Firebase"
echo "   npm run docker:dev   # Desarrollo con hot reload"
echo ""
echo "☁️ Comandos Azure:"
echo "   npm run deploy       # Deploy a Azure Container Apps"
echo "   azd up               # Deploy completo con AZD"
echo ""

log_success "¡Listo para desarrollar! 🚀"