# 🏠 Badge de Direcciones - Implementación Diciembre 2024

## 📋 Objetivo
Mostrar el número de direcciones en cada tarjeta de territorio de forma elegante y no intrusiva, optimizando el espacio especialmente en dispositivos móviles.

## 🎨 Diseño Implementado

### Opción 2: Enfoque Minimalista y Moderno
Se eligió esta opción por las siguientes razones:
- **No aumenta la altura de las tarjetas** - Crucial para móviles
- **Información clara y accesible** - Badge visible en el encabezado
- **Diseño cohesivo** - Colores que armonizan con el estado del territorio

### Especificaciones del Badge

#### Ubicación
- En el encabezado de la tarjeta, entre el nombre del territorio y el badge de estado
- Alineación horizontal con espaciado de 8px (`gap-2`)

#### Estilo Visual - Colores Adaptativos
El badge ahora se adapta al color del estado de cada territorio para una mejor cohesión visual:

**🟢 Disponible** (Verde Esmeralda):
- Fondo: `bg-emerald-100/90` (translúcido)
- Icono: `text-emerald-600` 
- Texto: `text-emerald-700`

**🟡 En uso** (Ámbar):
- Fondo: `bg-amber-100/90` (translúcido)
- Icono: `text-amber-600`
- Texto: `text-amber-700`

**🔴 Completado** (Rosa):
- Fondo: `bg-rose-100/90` (translúcido)
- Icono: `text-rose-600`
- Texto: `text-rose-700`

#### Características Comunes
- **Tamaño de fuente**: Extra pequeño (`text-xs`)
- **Peso de fuente**: Medio (`font-medium`)
- **Padding**: 10px horizontal, 4px vertical (`px-2.5 py-1`)
- **Forma**: Redondeada completa (`rounded-full`)
- **Sombra**: Sutil (`shadow-sm`)

#### Icono
- **Tipo**: `home` 
- **Tamaño**: 14px
- **Espaciado**: 4px del número (`space-x-1`)

## 💻 Implementación Técnica

### 1. Componente TerritoryCard - Badge con Colores Adaptativos
```jsx
{/* Badge de direcciones */}
{territory.addressCount !== undefined && territory.addressCount > 0 && (
  <div className={`${config.addressBadgeBg} px-2.5 py-1 rounded-full flex items-center space-x-1 shadow-sm`}>
    <Icon 
      name="home" 
      size={14} 
      className={config.addressBadgeIcon}
    />
    <span className={`text-xs font-medium ${config.addressBadgeText}`}>
      {territory.addressCount}
    </span>
  </div>
)}
```

#### Configuración de Colores por Estado:
```javascript
const statusConfig = {
  'Disponible': {
    // ... otros colores
    addressBadgeBg: 'bg-emerald-100/90',
    addressBadgeIcon: 'text-emerald-600',
    addressBadgeText: 'text-emerald-700',
  },
  'En uso': {
    // ... otros colores  
    addressBadgeBg: 'bg-amber-100/90',
    addressBadgeIcon: 'text-amber-600',
    addressBadgeText: 'text-amber-700',
  },
  'Completado': {
    // ... otros colores
    addressBadgeBg: 'bg-rose-100/90',
    addressBadgeIcon: 'text-rose-600', 
    addressBadgeText: 'text-rose-700',
  }
};
```

### 2. AppContext - Cálculo del addressCount
Se añadió un `useEffect` que:
1. Cuenta las direcciones por territorio
2. Combina los territorios con su conteo
3. Proporciona `territoriesWithCount` a toda la aplicación

```javascript
useEffect(() => {
  if (territories.length > 0 && addresses.length >= 0) {
    const addressCountMap = addresses.reduce((acc, address) => {
      if (address.territoryId) {
        acc[address.territoryId] = (acc[address.territoryId] || 0) + 1;
      }
      return acc;
    }, {});

    const territoriesWithAddressCount = territories.map(territory => ({
      ...territory,
      addressCount: addressCountMap[territory.id] || 0
    }));

    setTerritoriesWithCount(territoriesWithAddressCount);
  }
}, [territories, addresses]);
```

## 🔄 Comportamiento

### Visibilidad
- **Se muestra**: Cuando `addressCount > 0`
- **Se oculta**: Cuando no hay direcciones o el campo no existe

### Responsive
- El badge mantiene su tamaño en todos los dispositivos
- El truncado del nombre del territorio asegura que siempre haya espacio
- Flexbox con `gap-2` mantiene el espaciado consistente

## ✅ Ventajas de la Implementación

1. **Eficiencia de espacio**: No añade altura adicional a las tarjetas
2. **Información contextual**: Visible de un vistazo sin abrumar
3. **Diseño consistente**: Se integra perfectamente con el diseño existente
4. **Performance**: El cálculo se hace una sola vez cuando cambian los datos
5. **Mantenibilidad**: Lógica centralizada en AppContext

## 🎯 Resultado Final

Las tarjetas ahora muestran de forma elegante y cohesiva:
- 🗺️ **Nombre del territorio**
- 🏠 **Número de direcciones** (badge con color adaptativo)
- 🟢🟡🔴 **Estado del territorio** (badge de estado)

**Cohesión visual**: El badge de direcciones ahora armoniza perfectamente con el color del estado:
- 🟢 Verde esmeralda para territorios **Disponibles**
- 🟡 Ámbar dorado para territorios **En uso**  
- 🔴 Rosa para territorios **Completados**

Todo en una sola línea horizontal, optimizando el espacio vertical especialmente importante en dispositivos móviles.

---

**Fecha de implementación**: Diciembre 2024  
**Diseño elegido**: Opción 2 - Enfoque Minimalista y Moderno  
**Actualización**: Colores adaptativos implementados - Diciembre 2024 