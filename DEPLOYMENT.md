# 📦 Guía de Despliegue - Builds Separados

Este proyecto está configurado para generar **builds independientes** para diferentes dispositivos:

- **📱 Cliente (Tablets de Mesas)**: Interfaz del menú inteligente para comensales
- **🍳 Cocina (Pantalla de Brigada)**: Sistema de comandas para la cocina

---

## 🚀 Desarrollo

### Ejecutar aplicación de CLIENTE (Tablets)
```bash
npm run cliente:dev
```
- Abre automáticamente en: `http://localhost:5173/cliente.html`
- Hot reload habilitado
- Interfaz de chat con menú inteligente

### Ejecutar aplicación de COCINA (Comandas)
```bash
npm run cocina:dev
```
- Abre automáticamente en: `http://localhost:5175/cocina.html`
- Hot reload habilitado
- Tablero de comandas para cocina

### Ejecutar ambas simultáneamente
```bash
# Terminal 1
npm run cliente:dev

# Terminal 2
npm run cocina:dev
```

---

## 🏗️ Build para Producción

### Build CLIENTE (Para tablets de mesas)
```bash
npm run cliente:build
```
**Genera:**
```
dist-cliente/
├── cliente.html          ← Punto de entrada
├── assets/
│   ├── cliente-[hash].js
│   ├── vendor-[hash].js
│   └── index-[hash].css
└── vite.svg
```

### Build COCINA (Para pantalla de cocina)
```bash
npm run cocina:build
```
**Genera:**
```
dist-cocina/
├── cocina.html           ← Punto de entrada
├── assets/
│   ├── cocina-[hash].js
│   ├── vendor-[hash].js
│   └── index-[hash].css
└── vite.svg
```

### Build AMBOS
```bash
npm run deploy:all
```
Genera ambos builds en paralelo.

---

## 📤 Despliegue

### Opción 1: Despliegue Separado (Recomendado)

#### Para Tablets de Mesas
```bash
# 1. Generar build
npm run cliente:build

# 2. Copiar archivos a servidor/CDN
# Subir todo el contenido de dist-cliente/ a:
# - Firebase Hosting
# - Netlify
# - Vercel
# - AWS S3 + CloudFront
# - Servidor web (Nginx/Apache)
```

**URL de acceso:** `https://tablets.restaurante.com` → sirve `cliente.html`

#### Para Pantalla de Cocina
```bash
# 1. Generar build
npm run cocina:build

# 2. Copiar archivos a servidor/CDN
# Subir todo el contenido de dist-cocina/ a:
# - Servidor local en la cocina
# - Mismo CDN pero en ruta diferente
```

**URL de acceso:** `https://cocina.restaurante.com` → sirve `cocina.html`

---

### Opción 2: Despliegue en Mismo Servidor

Si prefieres desplegar ambos builds en el mismo servidor:

```bash
# 1. Generar ambos builds
npm run deploy:all

# 2. Configurar rutas en el servidor web
```

**Configuración Nginx:**
```nginx
server {
    listen 80;
    server_name restaurante.com;

    # Tablets de mesas
    location /cliente {
        alias /var/www/dist-cliente;
        try_files $uri $uri/ /cliente.html;
    }

    # Pantalla de cocina
    location /cocina {
        alias /var/www/dist-cocina;
        try_files $uri $uri/ /cocina.html;
    }
}
```

**URLs de acceso:**
- Tablets: `https://restaurante.com/cliente`
- Cocina: `https://restaurante.com/cocina`

---

## 🔧 Variables de Entorno

Ambos builds comparten las mismas variables de entorno:

```env
# .env
VITE_API_URL=https://api.restaurante.com
VITE_WEBSOCKET_URL=wss://api.restaurante.com
```

Para diferentes configuraciones por entorno:

```bash
# .env.cliente
VITE_API_URL=https://api-clientes.restaurante.com

# .env.cocina  
VITE_API_URL=https://api-cocina.restaurante.com
```

---

## 📱 Configuración de Tablets

### Modo Kiosk (Pantalla completa bloqueada)

**Android:**
1. Instalar navegador en modo kiosk (Chrome, Firefox Kiosk)
2. Configurar URL: `https://tablets.restaurante.com/cliente`
3. Habilitar auto-refresh cada 24h
4. Deshabilitar botones físicos

**iPad:**
1. Usar "Acceso Guiado" (Settings → Accessibility)
2. Abrir Safari con URL del cliente
3. Activar Acceso Guiado (triple click botón lateral)

---

## 🖥️ Configuración de Pantalla de Cocina

### Display dedicado
```bash
# Raspberry Pi / PC pequeño
1. Instalar navegador Chromium en modo kiosk
2. Configurar auto-start:
   chromium-browser --kiosk --disable-pinch https://cocina.restaurante.com
3. Configurar auto-refresh cada 1h
```

---

## 🔄 Actualización de Código

### Despliegue Continuo (Recomendado)

```bash
# GitHub Actions / GitLab CI
name: Deploy Cliente
on:
  push:
    branches: [main]
jobs:
  deploy-cliente:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run cliente:build
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          channelId: live
          projectId: restaurante-prod
```

---

## 🧪 Testing

```bash
# Probar build de cliente localmente
npm run cliente:build
npx serve dist-cliente -p 8080

# Probar build de cocina localmente  
npm run cocina:build
npx serve dist-cocina -p 8081
```

---

## 📊 Monitoreo

### Métricas Recomendadas

**Tablets (Cliente):**
- Tiempo de carga inicial
- Errores de API
- Sesiones activas
- Conversiones (pedidos completados)

**Cocina:**
- Latencia de actualización de comandas
- Órdenes procesadas
- Tiempo promedio de preparación

### Herramientas
- **Sentry**: Tracking de errores
- **Google Analytics**: Métricas de uso
- **Firebase Performance**: Rendimiento en tiempo real

---

## 🆘 Troubleshooting

### Build falla
```bash
# Limpiar caché y reinstalar
rm -rf node_modules dist-* .vite
npm install
npm run deploy:all
```

### Archivos no se encuentran en producción
- Verificar que `cliente.html` o `cocina.html` estén en el root del build
- Verificar rutas absolutas en configuración del servidor
- Revisar CORS si API y frontend están en dominios diferentes

### Hot reload no funciona
```bash
# Verificar puertos disponibles
lsof -i :5173  # Cliente
lsof -i :5175  # Cocina

# Reiniciar servidor de desarrollo
npm run cliente:dev
```

---

## 📝 Notas Importantes

✅ **Builds optimizados**: Code splitting automático, lazy loading  
✅ **Compartición de código**: Dependencias comunes se comparten entre builds  
✅ **Independencia**: Cada build puede desplegarse por separado  
✅ **SEO friendly**: SSR no requerido para tablets/cocina (apps internas)  

⚠️ **Advertencias:**
- No mezclar archivos de `dist-cliente` con `dist-cocina`
- Siempre hacer build antes de desplegar
- Verificar compatibilidad de navegadores en tablets antiguas

---

## 🔗 Referencias

- [Vite Multi-Page Apps](https://vitejs.dev/guide/build.html#multi-page-app)
- [Firebase Hosting](https://firebase.google.com/docs/hosting)
- [Nginx Configuration](https://nginx.org/en/docs/)

---

**Última actualización:** 28 de noviembre de 2025
