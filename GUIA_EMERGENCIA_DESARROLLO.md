# 🚨 GUÍA DE EMERGENCIA - DISEÑO DESAPARECIDO

## ⚡ SOLUCIÓN RÁPIDA (en este orden):

### 1. **Verificar rama actual**
```bash
git branch --show-current
```
Si no estás en `desarrollo-actual`, cambia:
```bash
git checkout desarrollo-actual
```

### 2. **Limpiar caché y reiniciar**
```bash
npm run fresh
```
Esto limpia todo y reinicia el servidor.

### 3. **Si no funciona, forzar puerto específico**
```bash
# Matar todos los procesos Node.js
taskkill /F /IM node.exe
# Reiniciar en puerto 3000
npm run dev
```

### 4. **Limpiar navegador**
- Presiona `Ctrl + Shift + R` (refresh forzado)
- O usa modo incógnito: `Ctrl + Shift + N`

### 5. **Si sigue sin funcionar**
```bash
# Verificar que tus archivos estén ahí
dir src\components\territories
# Deberías ver archivos con fecha de HOY
```

### 6. **Último recurso - Restaurar desde GitHub**
```bash
git fetch origin
git reset --hard origin/desarrollo-actual
npm install
npm run fresh
```

## 🛡️ PREVENCIÓN:

1. **Guarda cada 30 minutos:**
   ```bash
   git add . && git commit -m "WIP: [descripción]" && git push
   ```

2. **Si haces muchos cambios seguidos, reinicia:**
   ```bash
   npm run fresh
   ```

3. **Usa siempre el mismo puerto:** `http://localhost:3000/`

4. **Antes de cerrar, guarda:**
   ```bash
   git add . && git commit -m "Trabajo del día [fecha]" && git push
   ```

## 📞 CONTACTO EMERGENCIA:
Si nada funciona, revisa que estés en la rama correcta y que tus archivos existan. 