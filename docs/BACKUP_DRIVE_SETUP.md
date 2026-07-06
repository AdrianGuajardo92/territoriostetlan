# Respaldo manual a Google Drive (sin costo)

El respaldo automático con Cloud Functions **requiere plan Blaze de Firebase** (de pago). Por eso el flujo actual es **100% manual y gratuito**.

## Flujo recomendado

1. Inicia sesión como **admin**.
2. Ve a **Panel Admin → Respaldo de Datos**.
3. En **Direcciones y Territorios**, pulsa **Descargar Backup**.
4. Se guarda un archivo como `backup_direcciones_territorios_2026-07-06.json` en tu computadora.
5. Pulsa **Abrir carpeta de Google Drive** (o usa este enlace):
   [Carpeta de respaldos](https://drive.google.com/drive/folders/1uMpc1_nqXHyJLL2cler63hcxhFZJO8Fj)
6. Arrastra el archivo JSON a esa carpeta (o usa **Nuevo → Subir archivo** en Drive).

Repite cuando quieras un respaldo nuevo (por ejemplo, una vez por semana o después de cambios importantes).

## Qué incluye el archivo

- Todos los **territorios**
- Todas las **direcciones**
- Formato JSON compatible con la app (`type: "addresses_territories"`)

## Respaldos automáticos (opcional, de pago)

En la carpeta `functions/` hay código preparado para:

- Subida diaria a la 1:00 AM
- Subida manual desde la app

Ese código **no está activo** porque usa Firebase Cloud Functions (plan Blaze). Si en el futuro quieres activarlo, habría que:

1. Activar plan Blaze en Firebase
2. Configurar cuenta de servicio de Google Drive
3. Ejecutar `firebase deploy --only functions`

Ver comentarios en `functions/README.md`.

## Consejo

Usa un nombre con fecha en Drive (el archivo ya viene con fecha) y conserva al menos los últimos 4–8 respaldos por si necesitas recuperar datos antiguos.
