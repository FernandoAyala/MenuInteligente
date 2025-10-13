# Configuración de Firebase

Este directorio debe contener tu archivo `serviceAccountKey.json` de Firebase.

## Cómo obtener el Service Account Key:

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto
3. Ve a **Project Settings** (⚙️) > **Service Accounts**
4. Haz clic en **Generate New Private Key**
5. Descarga el archivo JSON
6. Renómbralo como `serviceAccountKey.json`
7. Colócalo en esta carpeta (`config/`)

⚠️ **IMPORTANTE**: Este archivo contiene credenciales sensibles. Nunca lo subas a un repositorio público.
El archivo ya está incluido en `.gitignore` para evitar commits accidentales.

## Estructura esperada del archivo:

```json
{
  "type": "service_account",
  "project_id": "tu-proyecto-id",
  "private_key_id": "...",
  "private_key": "...",
  "client_email": "...",
  "client_id": "...",
  "auth_uri": "...",
  "token_uri": "...",
  "auth_provider_x509_cert_url": "...",
  "client_x509_cert_url": "..."
}
```
