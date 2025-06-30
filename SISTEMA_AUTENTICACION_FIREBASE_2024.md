# 🔐 Sistema de Autenticación Personalizado - Documentación Técnica

## ⚠️ IMPORTANTE: Esta aplicación NO usa Firebase Authentication

### Descripción General
La aplicación implementa su propio sistema de autenticación basado en códigos de acceso personalizados almacenados en Firestore, **sin utilizar Firebase Authentication**.

## 🔑 Cómo Funciona la Autenticación

### 1. Estructura de Usuarios
Los usuarios se almacenan en la colección `users` de Firestore con la siguiente estructura:

```javascript
{
  id: "auto-generated-id",
  name: "Nombre del Usuario",
  accessCode: "codigo-unico-minusculas",
  password: "contraseña-en-texto-plano", // ⚠️ No encriptada
  role: "admin" | "user",
  // ... otros campos
}
```

### 2. Proceso de Login
```javascript
// El usuario ingresa:
- Access Code (código único)
- Password

// El sistema:
1. Busca en Firestore: where('accessCode', '==', accessCode.toLowerCase())
2. Verifica la contraseña en texto plano
3. Guarda el usuario en localStorage
4. Mantiene la sesión en el estado de React
```

### 3. Persistencia de Sesión
- La sesión se guarda en `localStorage`
- No hay tokens JWT ni sesiones de Firebase Auth
- El logout simplemente limpia el localStorage

## 🔥 Implicaciones para Firebase Security Rules

### ❌ INCORRECTO - No funcionará:
```javascript
// Estas reglas NO funcionarán porque no hay request.auth
match /users/{userId} {
  allow read: if request.auth != null;
  allow write: if request.auth.uid == userId;
}
```

### ✅ CORRECTO - Reglas que funcionarán:
```javascript
// Opción 1: Permitir lectura pública de usuarios (para el login)
match /users/{document} {
  allow read: if true; // Necesario para que funcione el login
  allow write: if false; // Solo mediante Admin SDK o consola
}

// Opción 2: Reglas más permisivas para toda la app
match /{document=**} {
  allow read: if true;
  allow write: if false; // O con alguna lógica personalizada
}
```

## 📊 Flujo de Datos Completo

1. **Login**: 
   - Usuario → Access Code + Password → Query a Firestore
   - Firestore → Documento del usuario → localStorage + State

2. **Uso de la App**:
   - Todas las operaciones se hacen con el usuario del State
   - No hay verificación de autenticación en Firebase
   - Los permisos se manejan en el frontend (role: admin/user)

3. **Protección**:
   - Depende completamente de las Security Rules de Firestore
   - No hay validación de identidad del lado del servidor

## ⚠️ Consideraciones de Seguridad

### Vulnerabilidades Actuales:
1. **Contraseñas en texto plano** - Visibles en Firestore
2. **No hay autenticación real** - Solo verificación de credenciales
3. **Sin verificación del servidor** - Todo se valida en el cliente
4. **Access codes públicos** - Cualquiera con acceso a Firestore puede verlos

### Recomendaciones (si se desea mejorar):
1. Migrar a Firebase Authentication
2. Encriptar contraseñas (o eliminarlas si se usa Firebase Auth)
3. Implementar reglas de seguridad basadas en custom claims
4. Usar Cloud Functions para operaciones sensibles

## 🔧 Campos Clave para el Sistema

### Al Asignar Territorios:
```javascript
{
  assignedTo: "Nombre del Usuario", // Para compatibilidad
  assignedToId: "ID-del-usuario",   // Para búsquedas correctas
}
```

### Al Completar Territorios:
```javascript
{
  completedBy: "Nombre del Usuario",  // Para compatibilidad
  completedById: "ID-del-usuario",    // Para búsquedas correctas
}
```

## 📝 Notas para Desarrolladores

1. **Al debuggear problemas de acceso**, verificar primero las Security Rules
2. **El campo `password`** está en texto plano por diseño actual
3. **Los IDs de usuario** son generados automáticamente por Firestore
4. **No hay refresh tokens** - La sesión es permanente hasta logout

---

*Documento creado: Diciembre 2024*
*Sistema en uso: Autenticación personalizada sin Firebase Auth* 