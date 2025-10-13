# 🔗 Vincular Commits con Azure DevOps Work Items

## 🎯 Objetivo

Vincular automáticamente tus commits de Git con las tareas (Work Items) en Azure DevOps para tener trazabilidad completa del desarrollo.

## 📝 Formato del Mensaje de Commit

Azure DevOps vincula automáticamente commits con work items cuando incluyes el ID en el mensaje:

### Sintaxis Básica

```bash
git commit -m "tipo: descripción corta

Descripción más detallada (opcional)

Relacionado con #<WORK_ITEM_ID>"
```

### Palabras Clave para Vincular

Azure DevOps reconoce estas palabras clave seguidas del `#ID`:

- `Fixes #123` - Marca el work item como resuelto
- `Fixed #123` - Marca el work item como resuelto
- `Closes #123` - Cierra el work item
- `Closed #123` - Cierra el work item
- `Resolves #123` - Resuelve el work item
- `Resolved #123` - Resuelve el work item
- `Related to #123` - Solo vincula (no cambia estado)
- `Relacionado con #123` - Solo vincula (español)
- `#123` - Vinculación simple

## 📋 Work Items del Proyecto

### User Stories Actuales

**Epic #9: Base de Datos y Estructura de Datos**

- **User Story #10**: Configuración inicial de base de datos Firestore
  - Task #11: Setup Firestore (BLOQUEANTE) - New
  - Task #12: Diseñar esquemas para menú y sesiones - ✅ Closed
  - Task #13: Scripts de conexión y configuración - ✅ Closed
  - Task #14: Seed data con 15-20 platos diversos - New
  - Task #15: Índices básicos para consultas eficientes - New

- **User Story #16**: Desarrollo del servidor backend con comunicación en tiempo real
  - Task #17: Express server con rutas básicas - ✅ Closed
  - Task #18: Socket.io configurado - ✅ Closed
  - Task #19: Integración OpenAI con prácticas - New
  - Task #20: Sistema de logging básico - ✅ Closed

### Otras Épicas Disponibles

- **Epic #21**: Integración LLM y Procesamiento de Lenguaje Natural
- **Epic #34**: Motor de Recomendaciones Inteligente
- **Epic #47**: Interfaz de Chat Conversacional
- **Epic #60**: API Conversacional y Orquestación
- **Epic #73**: Integración Completa y Deployment

## 💡 Ejemplos de Commits Vinculados

### Ejemplo 1: Completar una tarea

```bash
git commit -m "feat: Implementar seed data con 20 platos diversos

- Agregados platos de todas las categorías
- Incluidas restricciones dietarias (vegano, vegetariano, gluten-free)
- Agregados alérgenos comunes
- Script ejecutable para popular base de datos

Fixes #14"
```

Este commit:
- Se vincula con Task #14
- Marca la tarea como completada automáticamente

### Ejemplo 2: Trabajar en múltiples tareas

```bash
git commit -m "feat: Configurar Firebase Emulator y setup inicial

- Configurado Firebase Emulator para desarrollo local
- Actualizada documentación de setup
- Agregados scripts en package.json

Related to #11
Related to #10"
```

Este commit:
- Se vincula con Task #11 y User Story #10
- No cambia el estado de los work items

### Ejemplo 3: Corregir un bug

```bash
git commit -m "fix: Corregir validación de alérgenos en MenuItemRepository

El filtro de alérgenos no excluía correctamente items cuando
el array estaba vacío.

Fixes #35"
```

### Ejemplo 4: Refactorización

```bash
git commit -m "refactor: Mejorar estructura del servicio LLM

- Separar lógica de prompts en archivo dedicado
- Implementar caché de respuestas frecuentes
- Agregar rate limiting

Related to #19
Related to #21"
```

### Ejemplo 5: Documentación

```bash
git commit -m "docs: Actualizar README con instrucciones de deployment

Related to #73"
```

## 🚀 Flujo Completo con Vinculación

### 1. Trabajar en una Tarea Específica

```bash
# Crear rama desde la tarea
git checkout -b task/14-seed-data

# Hacer cambios...

# Commit vinculado
git commit -m "feat: Implementar seed data completo

Agregados 20 platos con restricciones dietarias

Fixes #14"

# Subir rama
git push origin task/14-seed-data
```

### 2. Crear Pull Request

En Azure DevOps, el PR automáticamente mostrará:
- Los work items vinculados (#14)
- El estado de las tareas se actualizará cuando se haga merge

### 3. Merge a Main

Cuando el PR se apruebe y se haga merge:
- Task #14 se marcará como completada automáticamente (por el "Fixes #14")
- El commit aparecerá en el historial de la tarea

## 📊 Ventajas de la Vinculación

1. **Trazabilidad**: Ver qué código resolvió qué tarea
2. **Historial**: Timeline completo de desarrollo en cada work item
3. **Automatización**: Actualización automática de estados
4. **Reporting**: Métricas de velocidad y progreso
5. **Code Review**: Los revisores ven el contexto completo

## 🔍 Ver Vinculaciones en Azure DevOps

### En un Work Item:
1. Abre el work item (ej: Task #14)
2. Ve a la pestaña **Development**
3. Verás:
   - Commits vinculados
   - Branches asociadas
   - Pull Requests relacionados

### En un Commit:
1. Ve a **Repos** > **Commits**
2. Haz clic en un commit
3. En el lado derecho verás **Related Work Items**

## 🎯 Mejores Prácticas

### ✅ Hacer

- Vincular cada commit con al menos un work item
- Usar mensajes descriptivos
- Usar "Fixes #ID" cuando completas la tarea
- Vincular PRs con work items

### ❌ Evitar

- Commits sin vinculación
- Mensajes vagos como "cambios" o "fix"
- Vincular con work items no relacionados
- Cerrar work items que no están completos

## 🔧 Configuración Recomendada

### Habilitar Validación de Links en Branch Policies

1. Ve a **Repos** > **Branches**
2. En la rama `main`, haz clic en **...** > **Branch policies**
3. Activa **Check for linked work items**
   - **Required**: Obliga a vincular work items en PRs
   - **Optional**: Permite PRs sin vincular pero muestra advertencia

Esto asegura que todo cambio a `main` tenga trazabilidad.

## 📝 Template de Mensaje de Commit

Guarda esto en `.gitmessage`:

```bash
# Tipo: descripción corta (máx 50 caracteres)
# Tipos: feat, fix, docs, style, refactor, test, chore

# Cuerpo: Explicación detallada del cambio (opcional)
# - Qué cambió
# - Por qué cambió
# - Cómo se probó

# Vinculación con work items:
# Fixes #<ID> - Completa la tarea
# Related to #<ID> - Solo vincula

# Ejemplo:
# feat: Implementar endpoint POST /api/chat
#
# - Endpoint recibe mensajes del usuario
# - Integración con LLM service
# - Validación con Zod
# - Tests unitarios incluidos
#
# Fixes #62
```

Configúralo:
```bash
git config commit.template .gitmessage
```

## 🎓 Recursos Adicionales

- [Azure DevOps Git Integration](https://learn.microsoft.com/en-us/azure/devops/boards/github/link-to-from-github)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Git Best Practices](https://git-scm.com/book/en/v2/Git-Basics-Recording-Changes-to-the-Repository)

---

## ✅ Checklist para Cada Commit

- [ ] Mensaje descriptivo y claro
- [ ] Incluye tipo de commit (feat, fix, etc)
- [ ] Vinculado con work item (#ID)
- [ ] Usa "Fixes" si completa la tarea
- [ ] Código funcional y probado
- [ ] Sin archivos sensibles (.env, credentials)

**¡Ahora estás listo para vincular tu desarrollo con Azure DevOps!** 🚀
