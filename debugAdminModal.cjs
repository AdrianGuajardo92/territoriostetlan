const fs = require('fs');
const path = require('path');

// Leer el archivo AdminModal.jsx
const adminModalPath = path.join(__dirname, 'src/components/modals/AdminModal.jsx');
let content = fs.readFileSync(adminModalPath, 'utf8');

console.log('🔍 Analizando AdminModal.jsx...\n');

// Buscar el array menuOptions
const menuOptionsMatch = content.match(/const menuOptions = \[([\s\S]*?)\];/);

if (menuOptionsMatch) {
  console.log('✅ Encontrado array menuOptions');

  // Contar cuántas opciones hay
  const options = menuOptionsMatch[1].match(/id:\s*['"](\w+)['"]/g);
  if (options) {
    console.log(`📋 Opciones encontradas (${options.length}):`);
    options.forEach(opt => {
      const id = opt.match(/id:\s*['"](.*?)['"]/)[1];
      console.log(`   - ${id}`);
    });
  }

  // Verificar si existe "archived"
  if (menuOptionsMatch[1].includes("id: 'archived'") || menuOptionsMatch[1].includes('id: "archived"')) {
    console.log('✅ La opción "archived" YA EXISTE en menuOptions');
  } else {
    console.log('❌ La opción "archived" NO existe en menuOptions');
    console.log('➕ Agregando la opción ahora...\n');

    // Buscar específicamente después de backup
    const backupIndex = content.indexOf("id: 'backup'");
    if (backupIndex === -1) {
      console.log('❌ No se encontró la opción backup');
      return;
    }

    // Encontrar el cierre del objeto backup
    let braceCount = 0;
    let startSearch = content.lastIndexOf('{', backupIndex);
    let endIndex = startSearch;

    for (let i = startSearch; i < content.length; i++) {
      if (content[i] === '{') braceCount++;
      if (content[i] === '}') {
        braceCount--;
        if (braceCount === 0) {
          endIndex = i;
          // Incluir la coma si existe
          if (content[i + 1] === ',') {
            endIndex = i + 1;
          }
          break;
        }
      }
    }

    const backupOption = content.substring(startSearch, endIndex + 1);
    console.log('📦 Opción backup encontrada');

    // Crear la nueva opción
    const archivedOption = `,
    {
      id: 'archived',
      title: 'Direcciones Archivadas',
      description: 'Ver historial de direcciones eliminadas',
      icon: 'fas fa-archive',
      color: 'gray',
      action: () => {
        console.log('🗂️ Click en Direcciones Archivadas');
        console.log('Estado actual showArchivedAddresses:', showArchivedAddresses);
        setShowArchivedAddresses(true);
        console.log('Estado nuevo showArchivedAddresses: true');
      }
    }`;

    // Insertar después de backup
    content = content.slice(0, endIndex + 1) + archivedOption + content.slice(endIndex + 1);
    console.log('✅ Opción agregada al array menuOptions');
  }
} else {
  console.log('❌ No se encontró el array menuOptions');
}

// Agregar logs al inicio del componente
const componentPattern = /const AdminModal = \(\{ onClose \}\) => {/;
if (content.match(componentPattern)) {
  // Buscar justo después de la apertura del componente
  const componentStart = content.indexOf('const AdminModal = ({ onClose }) => {');
  const afterBrace = componentStart + 'const AdminModal = ({ onClose }) => {'.length;

  // Buscar si ya hay logs
  const nextLines = content.substring(afterBrace, afterBrace + 200);
  if (!nextLines.includes('console.log')) {
    const debugCode = `
  console.log('🎯 AdminModal renderizado');
  console.log('📋 Estados iniciales:', {
    showArchivedAddresses: typeof showArchivedAddresses !== 'undefined' ? showArchivedAddresses : 'no definido'
  });`;

    content = content.slice(0, afterBrace) + debugCode + content.slice(afterBrace);
    console.log('✅ Agregados logs de depuración al componente');
  }
}

// Agregar log cuando se renderiza el menú
const menuRenderPattern = /menuOptions\.map\(/;
if (content.match(menuRenderPattern)) {
  const mapIndex = content.search(menuRenderPattern);
  const beforeMap = content.lastIndexOf('{', mapIndex);

  const logCode = `console.log('🎨 Renderizando menú con', menuOptions.length, 'opciones');
              `;

  if (!content.substring(beforeMap, mapIndex).includes('Renderizando menú')) {
    content = content.slice(0, mapIndex) + logCode + content.slice(mapIndex);
    console.log('✅ Agregado log de renderizado de menú');
  }
}

// Guardar el archivo
fs.writeFileSync(adminModalPath, content);

console.log('\n✨ AdminModal.jsx actualizado');
console.log('🔄 Recarga la página y abre el Centro de Administración');
console.log('📋 En la consola deberías ver:');
console.log('   - 🎯 AdminModal renderizado');
console.log('   - 📋 Estados iniciales');
console.log('   - 🎨 Renderizando menú con X opciones');
console.log('   - 🗂️ Click en Direcciones Archivadas (cuando hagas clic)');