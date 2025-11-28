# Script para copiar código del backend a Cloud Functions
Write-Host "Copiando codigo del backend a functions..." -ForegroundColor Cyan

# Crear directorios necesarios
$dirs = @(
    "functions/src/config",
    "functions/src/controllers",
    "functions/src/interfaces",
    "functions/src/middleware",
    "functions/src/models",
    "functions/src/prompts",
    "functions/src/providers",
    "functions/src/repositories",
    "functions/src/routes",
    "functions/src/services",
    "functions/src/types",
    "functions/src/utils"
)

foreach ($dir in $dirs) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}

# Copiar archivos y carpetas
Write-Host "Copiando archivos..." -ForegroundColor Yellow

Copy-Item -Path "src/config/*" -Destination "functions/src/config/" -Recurse -Force
Copy-Item -Path "src/controllers/*" -Destination "functions/src/controllers/" -Recurse -Force
Copy-Item -Path "src/interfaces/*" -Destination "functions/src/interfaces/" -Recurse -Force
Copy-Item -Path "src/middleware/*" -Destination "functions/src/middleware/" -Recurse -Force
Copy-Item -Path "src/models/*" -Destination "functions/src/models/" -Recurse -Force
Copy-Item -Path "src/prompts/*" -Destination "functions/src/prompts/" -Recurse -Force
Copy-Item -Path "src/providers/*" -Destination "functions/src/providers/" -Recurse -Force
Copy-Item -Path "src/repositories/*" -Destination "functions/src/repositories/" -Recurse -Force
Copy-Item -Path "src/routes/*" -Destination "functions/src/routes/" -Recurse -Force
Copy-Item -Path "src/services/*" -Destination "functions/src/services/" -Recurse -Force
Copy-Item -Path "src/types/*" -Destination "functions/src/types/" -Recurse -Force
Copy-Item -Path "src/utils/*" -Destination "functions/src/utils/" -Recurse -Force

# Copiar archivo de configuración de Firebase
if (Test-Path "config/serviceAccountKey.json") {
    if (-not (Test-Path "functions/config")) {
        New-Item -ItemType Directory -Path "functions/config" -Force | Out-Null
    }
    Copy-Item -Path "config/serviceAccountKey.json" -Destination "functions/config/" -Force
}

# Copiar .env si existe (para variables de entorno)
if (Test-Path ".env") {
    Copy-Item -Path ".env" -Destination "functions/" -Force
}

Write-Host "Codigo copiado exitosamente" -ForegroundColor Green
Write-Host ""
Write-Host 'Siguiente paso: cd functions; npm install' -ForegroundColor Cyan
