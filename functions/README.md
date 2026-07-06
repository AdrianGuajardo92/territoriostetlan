# Cloud Functions (no desplegadas)

Código de respaldo automático a Google Drive. **No está en uso** porque requiere el plan Blaze de Firebase.

No ejecutes `firebase deploy --only functions` a menos que quieras activar el respaldo de pago.

Funciones incluidas (inactivas):

- `dailyDriveBackup` — programada 1:00 AM Ciudad de México
- `uploadBackupToDrive` — subida manual desde la app

Flujo actual en producción: descarga manual desde Admin + subida manual a Drive.
