const fs = require('fs');
const path = require('path');

// Leer el archivo AdminModal.jsx
const adminModalPath = path.join(__dirname, 'src/components/modals/AdminModal.jsx');
let content = fs.readFileSync(adminModalPath, 'utf8');

console.log('🔍 Buscando la opción de backup para agregar después...');

// La opción de backup actual
const backupOption = `    {
      id: 'backup',
      title: 'Respaldo de Datos',
      description: 'Crear backups del sistema',
      icon: 'fas fa-download',
      color: 'green',
      action: () => setView('backup')
    },`;

// La nueva configuración con la opción de Direcciones Archivadas agregada
const newOptions = `    {
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
      action: () => {
        console.log('🗂️ Abriendo Direcciones Archivadas...');
        console.log('Estado showArchivedAddresses será:', true);
        setShowArchivedAddresses(true);
      }
    },`;

// Verificar si ya existe la opción de Direcciones Archivadas
if (content.includes('Direcciones Archivadas')) {
  console.log('⚠️ La opción de Direcciones Archivadas ya existe en algún lugar');
  console.log('🔍 Verificando si está en el lugar correcto...');

  // Buscar si está en el array menuOptions
  const menuOptionsStart = content.indexOf('const menuOptions = [');
  const menuOptionsEnd = content.indexOf('];', menuOptionsStart);
  const menuOptionsContent = content.substring(menuOptionsStart, menuOptionsEnd);

  if (menuOptionsContent.includes('Direcciones Archivadas')) {
    console.log('✅ La opción ya está en menuOptions');
  } else {
    console.log('⚠️ La opción existe pero no en menuOptions');
  }
} else {
  console.log('➕ Agregando opción de Direcciones Archivadas...');

  // Reemplazar
  if (content.includes(backupOption)) {
    content = content.replace(backupOption, newOptions);
    console.log('✅ Opción agregada exitosamente');
  } else {
    console.log('❌ No se encontró el patrón exacto de backup option');
    console.log('   Intentando con formato alternativo...');

    // Buscar un patrón más flexible
    const backupPattern = /{\s*id:\s*['"]backup['"]/;
    const match = content.match(backupPattern);

    if (match) {
      console.log('✅ Encontrado patrón de backup');
      // Encontrar el cierre del objeto backup
      const startIndex = match.index;
      let braceCount = 0;
      let endIndex = startIndex;

      for (let i = startIndex; i < content.length; i++) {
        if (content[i] === '{') braceCount++;
        if (content[i] === '}') {
          braceCount--;
          if (braceCount === 0) {
            endIndex = i + 1;
            // Buscar si hay una coma después
            if (content[i + 1] === ',') {
              endIndex = i + 2;
            }
            break;
          }
        }
      }

      const backupBlock = content.substring(startIndex, endIndex);
      console.log('📦 Bloque backup encontrado');

      // Crear el nuevo bloque con ambas opciones
      const newBlock = backupBlock + `
    {
      id: 'archived',
      title: 'Direcciones Archivadas',
      description: 'Ver historial de direcciones eliminadas',
      icon: 'fas fa-archive',
      color: 'gray',
      action: () => {
        console.log('🗂️ Abriendo Direcciones Archivadas...');
        console.log('Estado showArchivedAddresses será:', true);
        setShowArchivedAddresses(true);
      }
    },`;

      content = content.replace(backupBlock, newBlock);
      console.log('✅ Opción agregada con formato alternativo');
    } else {
      console.log('❌ No se pudo encontrar el patrón de backup');
    }
  }
}

// Agregar logs de depuración al inicio del componente
const componentStart = 'const AdminModal = ({ onClose }) => {';
if (content.includes(componentStart)) {
  const debugCode = `const AdminModal = ({ onClose }) => {
  console.log('🎯 AdminModal montado');`;

  content = content.replace(componentStart, debugCode);
  console.log('✅ Agregados logs de depuración');
}

// Guardar el archivo
fs.writeFileSync(adminModalPath, content);

console.log('\n✅ Archivo AdminModal.jsx actualizado');
console.log('📋 Cambios aplicados:');
console.log('  - Opción "Direcciones Archivadas" agregada al menú');
console.log('  - Logs de depuración agregados');
console.log('\n🔄 Por favor recarga el navegador para ver los cambios');