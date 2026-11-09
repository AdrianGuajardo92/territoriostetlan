# Cloud Functions

`autoReleaseCompletedTerritories` revisa los territorios cada hora. Si el estado
es `Completado` o `Terminado` y han transcurrido al menos 7 × 24 horas desde
`completedDate` (o `terminadoDate` heredada), cambia el estado a `Disponible`,
borra la asignación y desmarca las direcciones en una sola transacción. Conserva
la fecha y el historial de finalización para el informe S-13. Los territorios
sin fecha de finalización válida quedan intactos para revisión manual. Si hay
demasiadas direcciones para una transacción, registra el error y no aplica una
liberación parcial.

La función vive en el codebase `functions-auto-release/` y está desplegada en
`gestor-territorios-ls` con Firebase Blaze. Para actualizarla, despliega
únicamente ese codebase:

```bash
firebase deploy --only functions:auto-release
```

La revisión horaria libera cada territorio en la primera ejecución posterior
al cumplimiento de los siete días (puede tardar hasta una hora adicional).
La tarea se ejecuta en el servidor, incluso si nadie tiene abierta la PWA.

El codebase `functions/` conserva `dailyDriveBackup` y `uploadBackupToDrive`,
funciones de respaldo a Google Drive que no forman parte de la liberación de
territorios. No ejecutes `firebase deploy --only functions`: analizaría y
desplegaría también ese codebase, que requiere Secret Manager y configuración
de respaldo propia.
