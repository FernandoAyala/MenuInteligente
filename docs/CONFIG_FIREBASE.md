# Configuración de Firebase

En el directorio 'config' debe contener tu archivo `serviceAccountKey.json` de Firebase.

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
