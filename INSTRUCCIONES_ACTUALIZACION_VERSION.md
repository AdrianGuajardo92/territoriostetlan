# 📋 Instrucciones para Actualizar la Versión

## ✨ Sistema de Versiones Dinámico

A partir de la versión 2.7.2, la aplicación lee la versión automáticamente desde el archivo `version.json`.

## 🚀 Cómo actualizar la versión:

### 1. **Editar el archivo `version.json`**

```json
{
  "version": "2.7.3",  // ← Cambiar solo este número
  "releaseDate": "2024-12-28",  // ← Actualizar la fecha
  "forceUpdate": false,
  "_comment": "Para actualizar la versión, solo modifica este archivo. La app lo leerá automáticamente.",
  "changes": {
    "all": [
      {
        "type": "new",
        "description": "Nueva funcionalidad agregada"
      }
    ]
  }
}
```

### 2. **Hacer commit y push a GitHub**

```bash
git add version.json
git commit -m "feat: Actualizar a versión X.X.X"
git push origin desarrollo-actual
```

### 3. **¡Listo! 🎉**

- La aplicación detectará automáticamente la nueva versión
- El Service Worker se actualizará dinámicamente
- Los usuarios verán la nueva versión después del deploy de Netlify

## 📝 Notas importantes:

- **NO** es necesario modificar `AppContext.jsx` ni `sw.js`
- **NO** es necesario cambiar `package.json` (solo si agregas dependencias)
- La versión se actualiza automáticamente en:
  - El menú móvil de la aplicación
  - El sistema de actualizaciones
  - Los nombres de caché del Service Worker

## 🔧 Estructura de versiones recomendada:

- **X**.y.z → Cambios mayores (breaking changes)
- x.**Y**.z → Nuevas funcionalidades
- x.y.**Z** → Correcciones de bugs

## ⚡ Beneficios del sistema dinámico:

1. **Más rápido**: Solo editas un archivo
2. **Menos errores**: No hay versiones hardcodeadas en múltiples lugares
3. **Automático**: Todo se actualiza solo
4. **Flexible**: Puedes cambiar la versión sin tocar el código

---

**Creado el 27/12/2024** - Sistema implementado en v2.7.2 