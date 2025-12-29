# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Idioma

**IMPORTANTE:** Siempre comunicarse en español con el usuario en este proyecto.

## Project Overview

Territory Management System (Gestor de Territorios) - A PWA for Jehovah's Witnesses congregation territory management. Built with React + Vite, Firebase (Firestore), and deployed to Netlify.

## Development Commands

```bash
# Start development server (port 3500)
npm run dev

# Force clean dev start (kills stuck node processes on Windows)
npm run dev:clean

# Build for production
npm run build

# Preview production build
npm run preview

# Lint check
npm run lint

# Format with Prettier
npm run format

# Full clean rebuild
npm run clean
```

## Architecture

### Core Stack
- **React 18** with Vite 4
- **Firebase Firestore** for real-time data
- **Tailwind CSS** for styling
- **Dexie (IndexedDB)** for offline support
- **Leaflet/React-Leaflet** for maps
- **Workbox** for service worker/PWA

### Key Directories
```
src/
├── components/
│   ├── admin/        # Admin panel components
│   ├── auth/         # Login/authentication
│   ├── common/       # Shared UI (Icon, Modal, Toast, etc.)
│   ├── modals/       # All modal dialogs (lazy-loaded)
│   ├── territories/  # Territory cards, filters, headers
│   ├── addresses/    # Address card components
│   └── campaigns/    # Special campaign views
├── context/
│   └── AppContext.jsx  # Global state (users, territories, addresses, proposals)
├── hooks/              # Custom hooks (useToast, useLazyComponent, useModalHistory)
├── pages/              # Main views (TerritoriesView, TerritoryDetailView, MyProposalsView)
├── config/
│   └── firebase.js     # Firebase initialization
└── utils/              # Helpers, offline DB, error logging
```

### Data Flow
1. **AppContext.jsx** is the central state manager - handles Firebase listeners, auth, and all CRUD operations
2. **Custom auth system** (not Firebase Auth) - uses Firestore `users` collection with `accessCode` + password
3. **Real-time subscriptions** via `onSnapshot` for territories, addresses, proposals
4. **Proposals system** - non-admin users propose changes, admins approve/reject

### Firebase Collections
- `territories` - Territory records with status, assignedTo (supports arrays for teams)
- `addresses` - Addresses with soft delete support (`isArchived` field)
- `users` - User accounts with `accessCode`, `role`, `password`
- `proposals` - Pending change proposals
- `territoryHistory` - Historical assignment records
- `campaigns` - Special campaign data

### Lazy Loading
Modals use custom lazy loading via `src/components/modals/LazyModals.jsx` and `useLazyComponent` hook. Major views are also lazy-loaded in App.jsx.

### Offline Support
- **offlineDB.js** uses Dexie to create IndexedDB tables mirroring Firestore
- Sync queue stores pending operations when offline

## Environment Variables

Create `.env` file with:
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

Firebase config has fallback values in `src/config/firebase.js`.

## Deployment

Deployed to Netlify. Configuration in `netlify.toml`:
- Build command: `npm run build`
- Publish directory: `dist`
- SPA redirects configured

## Version Management

App version is managed in `public/version.json`. The app reads this at runtime to display version and detect updates.

## UI Patterns

- **Icon component** (`src/components/common/Icon.jsx`) wraps lucide-react icons
- **Modal component** with history integration (`useModalHistory`)
- **Toast notifications** via `ToastProvider` and `useToast` hook
- **Mobile-first** design with Tailwind responsive classes
- Back button handling for mobile navigation (popstate events in App.jsx)

## Key Conventions

- Territory `assignedTo` can be a string OR array (team assignments)
- Addresses use soft delete (`isArchived: true`) - filter with `where('isArchived', '!=', true)`
- User roles: `'admin'` or `'user'`
- Status values: `'Disponible'`, `'En uso'`, `'Completado'`/`'Terminado'`

## Sistema de Propuestas

Flujo para cambios de usuarios no-admin:
1. Usuario propone cambio → se guarda en colección `proposals` con `status: 'pending'`
2. Admin ve propuestas en panel de administración
3. Admin aprueba/rechaza → se actualiza `status` y se aplica el cambio si aprobado
4. Usuario ve resultado en "Mis Propuestas" con notificación

## Patrones de Código Importantes

### Actualizaciones Optimistas
Las operaciones CRUD actualizan el estado local inmediatamente, luego sincronizan con Firebase:
```javascript
// 1. Actualizar estado local primero
setAddresses(prev => [...prev, optimisticAddress]);
// 2. Guardar en Firebase
await addDoc(collection(db, 'addresses'), newData);
// 3. Revertir si hay error
```

### Geocodificación Automática
Al agregar direcciones sin coordenadas, se geocodifica automáticamente usando Nominatim (OpenStreetMap):
- Endpoint: `nominatim.openstreetmap.org`
- Se añade ", Guadalajara, Jalisco, México" al buscar

### Soft Delete vs Permanent Delete
- **Soft delete**: Marca `deleted: true`, `deletedAt`, `deletedBy` (recuperable)
- **Permanent delete**: Solo para direcciones ya archivadas (`permanentDelete: true`)

## Scripts de Utilidad (Raíz del proyecto)

Archivos `.cjs` para mantenimiento/migraciones:
- `applySoftDelete.cjs` - Aplica sistema de borrado suave
- `fixAdminModal.cjs` - Correcciones al modal de admin
- `addArchivedOption.cjs` - Añade opción de archivado
- `debugAdminModal.cjs` - Debug del modal de admin

Ejecutar con: `node nombreScript.cjs`

## Service Worker

**Estado actual: TEMPORALMENTE DESACTIVADO** (ver comentarios en `App.jsx`)

Cuando está activo:
- Registro en `/sw.js`
- Caché de assets con Workbox
- Notificación de nuevas versiones disponibles

## Documentación del Proyecto

Archivos `.md` importantes en la raíz:
- `CHANGELOG.md` - Historial de cambios por versión
- `GUIA_MIGRACION.md` - Guía para migraciones
- `GUIA_EMERGENCIA_DESARROLLO.md` - Soluciones a problemas comunes
- `IMPLEMENTACION_BORRADO_SUAVE.md` - Documentación del soft delete

## Manejo del Botón Atrás (Móvil)

Prioridad de cierre en `App.jsx` → `handlePopState`:
1. Vista de revisitas/estudios abierta → cerrar
2. Vista de propuestas abierta → cerrar
3. Territorio seleccionado → volver a lista
4. Modal activo → cerrar
5. Menú abierto → cerrar
6. Modal de editar dirección → cerrar
7. Historial disponible → navegación normal
8. Sin historial → confirmar salida de app

## Troubleshooting Común

- **Puerto 3500 ocupado**: Usar `npm run dev:clean` (mata procesos node)
- **Cache corrupto**: `npm run clean` y reiniciar
- **Firebase no conecta**: Verificar `.env` y credenciales
- **Modales no cargan**: Verificar lazy loading en `LazyModals.jsx`
