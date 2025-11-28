# Deployment en Render.com

## 📦 Pasos para desplegar el backend

### 1. Preparar el repositorio

Asegúrate de que tu código esté en GitHub (Render se conecta a GitHub).

```bash
git add .
git commit -m "Configuración para Render.com"
git push origin main
```

### 2. Crear cuenta en Render

1. Ve a https://render.com/
2. Regístrate con tu cuenta de GitHub
3. Autoriza Render a acceder a tus repositorios

### 3. Crear nuevo Web Service

1. Click en "New +" → "Web Service"
2. Conecta tu repositorio: `IAA-Grupo8/MenuInteligente`
3. Configuración:
   - **Name**: `menu-inteligente-api`
   - **Region**: Oregon (US West)
   - **Branch**: `main`
   - **Root Directory**: (dejar vacío)
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start:prod`
   - **Plan**: Free

### 4. Configurar Variables de Entorno

En la sección "Environment Variables", agrega:

```env
NODE_ENV=production
PORT=10000
FIREBASE_PROJECT_ID=iaa-menu-inteligente
OPENAI_API_KEY=tu_api_key_de_openai
GOOGLE_API_KEY=tu_api_key_de_google
LLM_DEFAULT_PROVIDER=openai
LLM_FALLBACK_PROVIDER=gemini
ALLOWED_ORIGINS=https://iaa-menu-inteligente.web.app,https://cocina-iaa.web.app
```

**Importante**: Necesitas obtener:
- `OPENAI_API_KEY` desde https://platform.openai.com/api-keys
- `GOOGLE_API_KEY` (Gemini) desde https://aistudio.google.com/app/apikey

### 5. Configurar Firebase Service Account

Render necesita acceso a Firestore. Tienes dos opciones:

#### Opción A: Variable de entorno (recomendado)
1. Ve a Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Copia el contenido del archivo JSON
4. En Render, agrega variable `GOOGLE_APPLICATION_CREDENTIALS_JSON` con el contenido completo

#### Opción B: Archivo en el repositorio (menos seguro)
1. Sube `config/serviceAccountKey.json` al repo (en .gitignore por defecto)
2. Agrega variable `GOOGLE_APPLICATION_CREDENTIALS=./config/serviceAccountKey.json`

### 6. Deploy

1. Click en "Create Web Service"
2. Render automáticamente:
   - Clona el repositorio
   - Ejecuta `npm install && npm run build`
   - Inicia el servidor con `npm run start:prod`
3. Espera ~5 minutos para el primer deploy

### 7. Obtener URL del backend

Una vez desplegado, Render te dará una URL:
```
https://menu-inteligente-api.onrender.com
```

### 8. Actualizar frontends

Ahora necesitas redesplegar los frontends para que usen el backend de Render:

```bash
# El archivo .env.production ya tiene la URL correcta
npm run deploy:frontend
```

## 🔄 Actualizaciones futuras

Cada vez que hagas push a GitHub, Render automáticamente:
1. Detecta el cambio
2. Ejecuta el build
3. Redeploy el backend

Para actualizar manualmente:
```bash
git add .
git commit -m "Actualización"
git push origin main
```

## 🐛 Troubleshooting

### Error: "Build failed"
- Verifica que `npm run build` funcione localmente
- Revisa los logs en Render Dashboard

### Error: "Health check failed"
- Asegúrate de que `/health` endpoint responda
- El servidor debe escuchar en `0.0.0.0:${PORT}`

### Socket.io no conecta
- Verifica que `ALLOWED_ORIGINS` incluya tus URLs de Firebase
- Asegura que el frontend use `VITE_SOCKET_URL` correcto

## 📊 Plan Free - Limitaciones

- **750 horas/mes** de uptime (suficiente para 1 servicio 24/7)
- El servicio se "duerme" después de 15 min de inactividad
- Primera request después de dormir tarda ~30 segundos (cold start)

**Para evitar cold starts**:
- Upgrade a plan Starter ($7/mes)
- O usa servicio de "ping" como UptimeRobot (gratis)

## 🔗 URLs Finales

- **Backend API**: https://menu-inteligente-api.onrender.com
- **Cliente (Tablets)**: https://iaa-menu-inteligente.web.app
- **Cocina**: https://cocina-iaa.web.app
