const fs = require('fs');
const path = require('path');

// Leer el archivo AdminModal.jsx
const adminModalPath = path.join(__dirname, 'src/components/modals/AdminModal.jsx');
let content = fs.readFileSync(adminModalPath, 'utf8');

// Eliminar el botón mal colocado (líneas 479-494)
const badButton = `          {/* Direcciones Archivadas */}
          <button
            onClick={() => setShowArchivedAddresses(true)}
            className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Archive className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="font-medium text-gray-900">Direcciones Archivadas</p>
                  <p className="text-sm text-gray-500">Ver historial de direcciones eliminadas</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </button>`;

// Eliminar el botón mal colocado
content = content.replace(badButton, '');

// Buscar el array de menuOptions y agregar la nueva opción
const backupOption = `{
      id: 'backup',
      title: 'Respaldo de Datos',
      description: 'Crear backups del sistema',
      icon: 'fas fa-download',
      color: 'green',
      action: () => setView('backup')
    },`;

const newArchiveOption = `{
      id: 'backup',
      title: 'Respaldo de Datos',
      description: 'Crear backups del sistema',
      icon: 'fas fa-download',
      color: 'green',
      action: () => setView('backup')
    },
    {
      id: 'archived',
      title: 'Direcciones Archivadas',
      description: 'Ver historial de direcciones eliminadas',
      icon: 'fas fa-archive',
      color: 'gray',
      action: () => setShowArchivedAddresses(true)
    },`;

// Reemplazar para agregar la nueva opción en el menú
content = content.replace(backupOption, newArchiveOption);

// Guardar el archivo corregido
fs.writeFileSync(adminModalPath, content);

console.log('✅ AdminModal.jsx corregido exitosamente');
console.log('  - Eliminado el botón mal colocado');
console.log('  - Agregada la opción en el menú principal');
console.log('\n🔄 Por favor, guarda el archivo si está abierto en tu editor y recarga el navegador');