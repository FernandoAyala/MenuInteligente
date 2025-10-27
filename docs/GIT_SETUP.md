# 🔐 Cómo Vincular con Azure DevOps Repos

## ✅ Git ya está configurado localmente

El repositorio Git local ya está inicializado y configurado con:
- ✅ Rama principal: `main`
- ✅ Repositorio remoto: https://dev.azure.com/IAAplicada-Grupo8/MenuInteligente/_git/MenuInteligente
- ✅ Primer commit creado con todos los archivos

## 🔑 Paso 1: Crear Personal Access Token (PAT)

Para poder subir código a Azure DevOps, necesitas un PAT:

1. Ve a Azure DevOps: https://dev.azure.com/IAAplicada-Grupo8
2. Haz clic en tu perfil (arriba a la derecha) > **Personal Access Tokens**
3. Haz clic en **+ New Token**
4. Configura el token:
   - **Name**: `MenuInteligente-Local-Dev`
   - **Organization**: IAAplicada-Grupo8
   - **Expiration**: Elige la duración (recomendado: 90 días)
   - **Scopes**: 
     - ✅ **Code** > **Full** (Read, write, & manage)
     - ✅ **Work Items** > **Read & write**
5. Haz clic en **Create**
6. **¡IMPORTANTE!** Copia el token generado (solo se muestra una vez)

## 🚀 Paso 2: Configurar Credenciales

### Opción A: Usar Git Credential Manager (Recomendado)

Cuando ejecutes `git push`, se abrirá una ventana de autenticación:
- **Username**: Tu email de Azure DevOps
- **Password**: Pega el PAT que copiaste

### Opción B: Guardar el PAT en Git

```bash
# Configurar Git para recordar credenciales
git config credential.helper store

# Luego hacer push (se pedirá usuario y contraseña)
git push -u origin main
# Username: tu-email@alumno.unlam.edu.ar
# Password: [pega tu PAT aquí]
```

### Opción C: Incluir PAT en la URL (Temporal)

```bash
git remote set-url origin https://[TU-PAT]@dev.azure.com/IAAplicada-Grupo8/MenuInteligente/_git/MenuInteligente
git push -u origin main
```

**⚠️ Nota de Seguridad**: No compartas tu PAT con nadie. Si lo pierdes, genera uno nuevo.

## 📤 Paso 3: Subir el Código

Una vez configuradas las credenciales, ejecuta:

```bash
cd /home/estudiante/Escritorio/TP_IAA
git push -u origin main
```

Deberías ver algo como:
```
Enumerando objetos: 25, listo.
Contando objetos: 100% (25/25), listo.
...
To https://dev.azure.com/IAAplicada-Grupo8/MenuInteligente/_git/MenuInteligente
 * [new branch]      main -> main
```

## 🔗 Paso 4: Verificar en Azure DevOps

1. Ve a: https://dev.azure.com/IAAplicada-Grupo8/MenuInteligente/_git/MenuInteligente
2. Deberías ver todos los archivos del proyecto
3. El commit debería estar vinculado a las User Stories #10 y #16

## 📝 Comandos Git Útiles

```bash
# Ver el estado de los archivos
git status

# Ver el historial de commits
git log --oneline

# Ver los repositorios remotos configurados
git remote -v

# Ver la rama actual
git branch

# Crear una nueva rama para una feature
git checkout -b feature/nombre-feature

# Subir una rama específica
git push origin feature/nombre-feature
```

## 🔄 Flujo de Trabajo Recomendado

### Para nuevos cambios:

```bash
# 1. Asegúrate de estar en la rama main actualizada
git checkout main
git pull origin main

# 2. Crea una rama para tu feature/tarea
git checkout -b feature/implementar-seed-data

# 3. Haz tus cambios y commits
git add .
git commit -m "feat: Implementar seed data para menú"

# 4. Sube tu rama
git push origin feature/implementar-seed-data

# 5. Crea un Pull Request en Azure DevOps
```

### Para vincular commits con Work Items:

Incluye el ID del work item en el mensaje de commit:

```bash
git commit -m "feat: Implementar endpoint de chat

Relacionado con #62 (User Story: API Conversacional)"
```

Azure DevOps vinculará automáticamente el commit con el work item.

## 🏷️ Convenciones de Commits (Conventional Commits)

Usa estos prefijos para mensajes de commit:

- `feat:` - Nueva funcionalidad
- `fix:` - Corrección de bugs
- `docs:` - Cambios en documentación
- `style:` - Formato, espacios, etc (no afecta código)
- `refactor:` - Refactorización de código
- `test:` - Agregar o modificar tests
- `chore:` - Mantenimiento, configuración, etc

**Ejemplos:**
```bash
git commit -m "feat: Agregar endpoint POST /api/chat"
git commit -m "fix: Corregir validación de alérgenos en filtro"
git commit -m "docs: Actualizar README con instrucciones de deployment"
git commit -m "refactor: Mejorar estructura del LLM service"
```

## 🛡️ Proteger la Rama Main

Recomendación: Configura branch policies en Azure DevOps:

1. Ve a: **Repos** > **Branches**
2. En la rama `main`, haz clic en **...** > **Branch policies**
3. Configura:
   - ✅ Require a minimum number of reviewers (al menos 1)
   - ✅ Check for linked work items
   - ✅ Check for comment resolution
   - ✅ Build validation (cuando tengas CI/CD)

Esto asegura que todo cambio a `main` pase por Pull Request y revisión.

## 🚨 Solución de Problemas

### Error: "Authentication failed"
- Verifica que tu PAT sea válido y no haya expirado
- Asegúrate de que el PAT tenga los permisos correctos (Code: Full)
- Intenta eliminar credenciales guardadas: `git credential reject https://dev.azure.com`

### Error: "Updates were rejected"
- Alguien más subió cambios antes que tú
- Solución: `git pull origin main` y luego `git push`

### Cambiar la URL del remoto
```bash
git remote set-url origin https://dev.azure.com/IAAplicada-Grupo8/MenuInteligente/_git/MenuInteligente
```

---

## ✅ Resumen del Estado Actual

- 📁 Repositorio local: Inicializado ✅
- 🌿 Rama principal: `main` ✅
- 📦 Primer commit: Creado con 25 archivos ✅
- 🔗 Remoto configurado: Azure DevOps ✅
- ⏳ Pendiente: Subir código (requiere PAT) ⏳

**Siguiente paso**: Crear tu PAT y ejecutar `git push -u origin main`
