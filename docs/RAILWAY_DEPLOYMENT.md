# Deployment en Railway.app

## 🚀 Pasos para desplegar

### 1. Crear cuenta en Railway
1. Ve a https://railway.app/
2. Sign up con GitHub o Email
3. Verifica tu email

### 2. Crear nuevo proyecto
1. Click en **"New Project"**
2. Selecciona **"Deploy from GitHub repo"** o **"Empty Project"**

### 3. Conectar repositorio Azure DevOps

#### Opción A: Usando Git URL
1. En Railway, selecciona **"Deploy from Git"**
2. Pega la URL: `https://dev.azure.com/IAAplicada-Grupo8/MenuInteligente/_git/MenuInteligente`
3. Branch: `deploy`

#### Opción B: Railway CLI (Recomendado)
```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login
railway login

# Inicializar proyecto
railway init

# Link con el servicio
railway link

# Deploy
railway up
```

### 4. Configurar Variables de Entorno

En el dashboard de Railway, agrega estas variables:

```env
NODE_ENV=production
PORT=3000
FIREBASE_PROJECT_ID=iaa-menu-inteligente
OPENAI_API_KEY=tu_openai_api_key
ALLOWED_ORIGINS=https://iaa-menu-inteligente.web.app,https://cocina-iaa.web.app
```

**APIs necesarias**:
- OpenAI: https://platform.openai.com/api-keys
- Google Gemini (opcional): https://aistudio.google.com/app/apikey

### 5. Deploy Automático

Railway detectará automáticamente:
- ✅ `package.json` → instala dependencias
- ✅ `railway.json` → usa configuración custom
- ✅ `npm run build` → compila TypeScript
- ✅ `npm run start:prod` → inicia servidor

### 6. Obtener URL del backend

Railway te dará una URL tipo:
```
https://menuinteligente-production.up.railway.app
```

### 7. Actualizar frontend

Actualiza `.env.production`:
```env
VITE_API_URL=https://tu-proyecto.up.railway.app
VITE_SOCKET_URL=https://tu-proyecto.up.railway.app
```

Luego redeploya frontend:
```bash
npm run deploy:frontend
```

## 🎯 Ventajas de Railway

- ✅ $5 USD crédito gratis/mes
- ✅ No se "duerme" (no cold starts)
- ✅ Socket.io funciona perfectamente
- ✅ Deploy automático en cada push
- ✅ Logs en tiempo real
- ✅ Fácil rollback

## 💰 Costos Estimados

Para un restaurante pequeño/mediano:
- CPU: ~$2/mes
- RAM: ~$1/mes  
- Network: ~$0.50/mes
- **Total: ~$3.50/mes** (dentro del crédito gratis)

## 🔧 Comandos útiles

```bash
# Ver logs
railway logs

# Ver variables
railway variables

# Abrir dashboard
railway open

# Deploy manual
railway up

# Conectar a la base de datos (si usas Railway DB)
railway connect
```

## 🐛 Troubleshooting

### Build falla
```bash
# Verifica que funcione localmente
npm run build
npm run start:prod
```

### Socket.io no conecta
- Verifica `ALLOWED_ORIGINS` incluya tus URLs de Firebase
- Railway soporta WebSockets por defecto (no requiere config extra)

### Firestore no conecta
- Agrega variable `GOOGLE_APPLICATION_CREDENTIALS_JSON` con el contenido del serviceAccountKey.json
- O sube el archivo y usa path relativo

## 🔗 URLs Finales

- **Backend API**: https://tu-proyecto.up.railway.app
- **Cliente (Tablets)**: https://iaa-menu-inteligente.web.app  
- **Cocina**: https://cocina-iaa.web.app
