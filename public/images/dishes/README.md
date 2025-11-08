# Imágenes de Platos

Esta carpeta contiene las imágenes de los platos del menú.

## Formato recomendado:
- **Formato:** JPG o PNG
- **Tamaño:** 800x600px (4:3) o similar
- **Peso:** < 500KB por imagen
- **Nombres:** usar kebab-case (pasta-carbonara.jpg, ensalada-cesar.jpg, etc.)

## Uso:
Las imágenes se referencian en Firestore con URLs relativas:
- `/images/dishes/pasta-carbonara.jpg`
- `/images/dishes/ensalada-cesar.jpg`

## Actualizar URL en Firestore:
```powershell
cd e:\Web\IAA-Grupo8\MenuInteligente
$env:MENU_ITEM_NAME='Pasta Carbonara'
$env:IMAGE_URL='/images/dishes/pasta-carbonara.jpg'
pnpm run server:set-image
```
