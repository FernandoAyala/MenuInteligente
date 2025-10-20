# 🚀 Guía de Deployment - Menu Inteligente

Esta guía documenta el proceso completo de deployment del sistema Menu Inteligente a Azure Container Apps.

## 📋 Prerrequisitos

### Herramientas Requeridas
- [Node.js 18+](https://nodejs.org/)
- [TypeScript](https://www.typescriptlang.org/) 
- [Azure CLI](https://aka.ms/InstallAzureCLI)
- [Azure Developer CLI](https://aka.ms/install-azd)
- [Docker](https://docker.com/) (opcional para testing local)

### Servicios de Azure Requeridos
- Azure Container Apps
- Azure Container Registry  
- Application Insights
- Log Analytics Workspace
- Azure Key Vault (para secretos)

### Servicios Externos
- **Firebase Project** con Firestore habilitado
- **OpenAI API Key** o **Google Gemini API Key**

## 🛠️ Setup Inicial

### 1. Configuración Local

```bash
# Clonar repositorio
git clone https://dev.azure.com/IAAplicada-Grupo8/MenuInteligente/_git/MenuInteligente
cd MenuInteligente

# Ejecutar setup automatizado
chmod +x scripts/setup.sh
./scripts/setup.sh
```

### 2. Variables de Entorno

Copiar y configurar variables de entorno:

```bash
cp .env.example .env
```

**Variables Críticas:**
```env
# Firebase
FIREBASE_PROJECT_ID=your-actual-project-id

# LLM Provider
LLM_DEFAULT_PROVIDER=openai  # o 'gemini'
OPENAI_API_KEY=sk-your-actual-openai-key
# O para Gemini:
GEMINI_API_KEY=your-actual-gemini-key

# Configuración de producción
NODE_ENV=production
ALLOWED_ORIGINS=https://your-domain.com
```

### 3. Configuración de Firebase

1. **Crear Service Account:**
   - Ir a [Firebase Console](https://console.firebase.google.com/)
   - Project Settings > Service Accounts
   - Generate new private key
   - Guardar como `config/serviceAccountKey.json`

2. **Configurar Firestore:**
   ```bash
   # Aplicar índices
   firebase deploy --only firestore:indexes
   
   # Cargar datos de prueba
   npm run seed
   ```

## 🐳 Testing Local

### Con Docker Compose

```bash
# Entorno completo con Redis y Firebase emulator
docker-compose up

# Solo para desarrollo con hot reload
docker-compose -f docker-compose.dev.yml up
```

### Sin Docker

```bash
# Desarrollo local
npm run dev

# Build y test
npm run build
npm test
npm run start
```

## ☁️ Deployment a Azure

### Opción A: Azure Developer CLI (Recomendado)

```bash
# Login a Azure
azd auth login

# Inicializar entorno
azd init

# Deploy completo (infraestructura + aplicación)
azd up

# Solo aplicación (si infraestructura ya existe)
azd deploy
```

### Opción B: Azure CLI Manual

```bash
# Crear Resource Group
az group create --name rg-menu-inteligente --location "East US 2"

# Crear Container Registry
az acr create --resource-group rg-menu-inteligente \
  --name menuinteligentereg --sku Basic

# Build y push imagen
az acr build --registry menuinteligentereg \
  --image menu-inteligente:latest .

# Crear Container Apps Environment
az containerapp env create \
  --name menu-inteligente-env \
  --resource-group rg-menu-inteligente \
  --location "East US 2"

# Deploy Container App
az containerapp create \
  --name menu-inteligente \
  --resource-group rg-menu-inteligente \
  --environment menu-inteligente-env \
  --image menuinteligentereg.azurecr.io/menu-inteligente:latest \
  --target-port 3000 \
  --ingress external \
  --env-vars FIREBASE_PROJECT_ID=your-project OPENAI_API_KEY=secretref:openai-key
```

## 🔐 Configuración de Secretos

### Azure Key Vault

```bash
# Crear Key Vault
az keyvault create --name menu-inteligente-kv \
  --resource-group rg-menu-inteligente

# Agregar secretos
az keyvault secret set --vault-name menu-inteligente-kv \
  --name "OpenAI-API-Key" --value "sk-your-key"

az keyvault secret set --vault-name menu-inteligente-kv \
  --name "Firebase-Private-Key" --file config/serviceAccountKey.json
```

### Container Apps Secrets

```bash
# Referenciar secretos desde Key Vault
az containerapp secret set \
  --name menu-inteligente \
  --resource-group rg-menu-inteligente \
  --secrets openai-key=keyvaultref:menu-inteligente-kv:OpenAI-API-Key

# Actualizar variables de entorno
az containerapp update \
  --name menu-inteligente \
  --resource-group rg-menu-inteligente \
  --set-env-vars OPENAI_API_KEY=secretref:openai-key
```

## 📊 Monitoring y Observabilidad

### Application Insights

```bash
# Crear Application Insights
az monitor app-insights component create \
  --app menu-inteligente-insights \
  --location "East US 2" \
  --resource-group rg-menu-inteligente

# Obtener connection string
az monitor app-insights component show \
  --app menu-inteligente-insights \
  --resource-group rg-menu-inteligente \
  --query connectionString
```

### Log Analytics

```bash
# Ver logs en tiempo real
azd logs --follow

# Consultas KQL específicas
az monitor log-analytics query \
  --workspace menu-inteligente-logs \
  --analytics-query "ContainerAppConsoleLogs_CL | where ContainerName_s == 'menu-inteligente' | order by TimeGenerated desc"
```

## 🔄 CI/CD Pipeline

### Azure DevOps Pipeline

Crear `.azure/azure-pipelines.yml`:

```yaml
trigger:
  branches:
    include:
      - main
      - develop

variables:
  azureServiceConnection: 'azure-service-connection'
  containerRegistry: 'menuinteligentereg.azurecr.io'
  imageRepository: 'menu-inteligente'
  dockerfilePath: '$(Build.SourcesDirectory)/Dockerfile'
  tag: '$(Build.BuildId)'

stages:
- stage: Build
  jobs:
  - job: Build
    pool:
      vmImage: 'ubuntu-latest'
    steps:
    - task: NodeTool@0
      inputs:
        versionSpec: '18.x'
    - script: |
        npm ci
        npm run build
        npm test
      displayName: 'Build and Test'
    - task: Docker@2
      inputs:
        containerRegistry: '$(containerRegistry)'
        repository: '$(imageRepository)'
        command: 'buildAndPush'
        Dockerfile: '$(dockerfilePath)'
        tags: '$(tag)'

- stage: Deploy
  dependsOn: Build
  jobs:
  - deployment: Deploy
    environment: 'production'
    strategy:
      runOnce:
        deploy:
          steps:
          - task: AzureContainerApps@1
            inputs:
              azureSubscription: '$(azureServiceConnection)'
              containerAppName: 'menu-inteligente'
              resourceGroup: 'rg-menu-inteligente'
              imageToDeploy: '$(containerRegistry)/$(imageRepository):$(tag)'
```

## 🚨 Troubleshooting

### Problemas Comunes

1. **Error de autenticación Firebase:**
   ```bash
   # Verificar service account
   cat config/serviceAccountKey.json | jq .project_id
   ```

2. **Error de build TypeScript:**
   ```bash
   # Limpiar y rebuildir
   npm run clean
   npm ci
   npm run build
   ```

3. **Container no inicia:**
   ```bash
   # Ver logs detallados
   azd logs --follow
   az containerapp logs show --name menu-inteligente --resource-group rg-menu-inteligente
   ```

### Health Checks

```bash
# Local
curl http://localhost:3000/health

# Azure
curl https://menu-inteligente.app/health
```

## 📈 Escalabilidad

### Auto-scaling

```bash
# Configurar auto-scaling
az containerapp update \
  --name menu-inteligente \
  --resource-group rg-menu-inteligente \
  --min-replicas 1 \
  --max-replicas 10 \
  --scale-rule-name http-requests \
  --scale-rule-type http \
  --scale-rule-http-concurrency 100
```

### Resource Limits

```yaml
# En azure.yaml o az containerapp create
resources:
  cpu: 1.0
  memory: 2Gi
```

## 🔄 Rollback

```bash
# Rollback a versión anterior
az containerapp revision list --name menu-inteligente --resource-group rg-menu-inteligente
az containerapp revision activate --revision menu-inteligente--abc123 --resource-group rg-menu-inteligente
```

---

## 📞 Soporte

- **Logs**: `azd logs` o Azure Portal
- **Monitoring**: Application Insights Dashboard  
- **Issues**: Azure DevOps Work Items
- **Documentation**: `/docs` folder

**¡Happy Deploying! 🚀**