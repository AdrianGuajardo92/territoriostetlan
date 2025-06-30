/**
 * Módulo de optimización de rutas para territorios
 * Implementa algoritmo TSP (Traveling Salesman Problem) con heurísticas
 */

// Calcular distancia entre dos coordenadas usando la fórmula de Haversine
export const calculateDistance = (coord1, coord2) => {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
  const dLon = (coord2.lng - coord1.lng) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Extraer coordenadas de URL de Google Maps
export const extractCoordinatesFromMapUrl = (mapUrl) => {
  if (!mapUrl) return null;
  
  const patterns = [
    /[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /[@!](-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/,
    /ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
    /@(-?\d+\.\d+),(-?\d+\.\d+)/,
    /place\/.*@(-?\d+\.\d+),(-?\d+\.\d+)/,
    /dir\/[^/]+\/(-?\d+\.\d+),(-?\d+\.\d+)/
  ];
  
  for (const pattern of patterns) {
    const match = mapUrl.match(pattern);
    if (match) {
      return { 
        lat: parseFloat(match[1]), 
        lng: parseFloat(match[2]) 
      };
    }
  }
  return null;
};

// Obtener coordenadas de una dirección
const getCoordinates = (address) => {
  if (address.latitude && address.longitude) {
    return { lat: address.latitude, lng: address.longitude };
  }
  return extractCoordinatesFromMapUrl(address.mapUrl);
};

// Algoritmo del vecino más cercano (Nearest Neighbor) - VERSIÓN MEJORADA
const nearestNeighborTSP = (addresses, startCoord) => {
  const n = addresses.length;
  if (n === 0) return [];
  
  console.log(`🚀 Iniciando optimización de ruta para ${n} direcciones`);
  
  const visited = new Array(n).fill(false);
  const route = [];
  let currentIdx = 0;
  
  // Si hay coordenada inicial, encontrar el punto más cercano
  if (startCoord) {
    let minDist = Infinity;
    let closestAddresses = []; // Para debugging
    
    console.log('📍 Ubicación de partida:', `${startCoord.lat.toFixed(6)}, ${startCoord.lng.toFixed(6)}`);
    console.log('🔍 Analizando distancias a todas las direcciones:');
    
    for (let i = 0; i < n; i++) {
      const coord = getCoordinates(addresses[i]);
      if (coord) {
        const dist = calculateDistance(startCoord, coord);
        
        // Log detallado para debugging
        console.log(`   ${i + 1}. "${addresses[i].address}" → ${dist.toFixed(3)} km`);
        
        closestAddresses.push({ index: i, address: addresses[i].address, distance: dist });
        
        if (dist < minDist) {
          minDist = dist;
          currentIdx = i;
        }
      } else {
        console.log(`   ${i + 1}. "${addresses[i].address}" → SIN COORDENADAS`);
      }
    }
    
    // Mostrar las 3 direcciones más cercanas para verificación
    closestAddresses.sort((a, b) => a.distance - b.distance);
    console.log('🎯 Top 3 direcciones más cercanas:');
    closestAddresses.slice(0, 3).forEach((item, idx) => {
      const emoji = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';
      console.log(`   ${emoji} "${item.address}" → ${item.distance.toFixed(3)} km`);
    });
    
    console.log(`✅ PRIMERA PARADA SELECCIONADA: "${addresses[currentIdx].address}" (${minDist.toFixed(3)} km)`);
  } else {
    console.log('⚠️ Sin ubicación de partida - usando primera dirección disponible');
  }
  
  // Construir la ruta usando el algoritmo del vecino más cercano
  route.push(currentIdx);
  visited[currentIdx] = true;
  
  console.log('🔄 Construyendo ruta optimizada:');
  console.log(`   1. ${addresses[currentIdx].address} (INICIO)`);
  
  for (let i = 1; i < n; i++) {
    const currentCoord = getCoordinates(addresses[currentIdx]);
    if (!currentCoord) {
      console.log(`   ⚠️ Dirección ${currentIdx + 1} no tiene coordenadas, saltando optimización`);
      break;
    }
    
    let nearestIdx = -1;
    let minDist = Infinity;
    
    // Buscar la dirección más cercana no visitada
    for (let j = 0; j < n; j++) {
      if (!visited[j]) {
        const coord = getCoordinates(addresses[j]);
        if (coord) {
          const dist = calculateDistance(currentCoord, coord);
          if (dist < minDist) {
            minDist = dist;
            nearestIdx = j;
          }
        }
      }
    }
    
    if (nearestIdx === -1) {
      console.log(`   ⚠️ No se encontraron más direcciones con coordenadas`);
      break;
    }
    
    route.push(nearestIdx);
    visited[nearestIdx] = true;
    currentIdx = nearestIdx;
    
    console.log(`   ${i + 1}. ${addresses[nearestIdx].address} (+${minDist.toFixed(3)} km)`);
  }
  
  // Agregar direcciones sin coordenadas al final
  const addressesWithoutCoords = [];
  for (let i = 0; i < n; i++) {
    if (!visited[i]) {
      route.push(i);
      addressesWithoutCoords.push(addresses[i].address);
    }
  }
  
  if (addressesWithoutCoords.length > 0) {
    console.log('📌 Direcciones sin coordenadas añadidas al final:');
    addressesWithoutCoords.forEach((addr, idx) => {
      console.log(`   ${route.length - addressesWithoutCoords.length + idx + 1}. ${addr}`);
    });
  }
  
  console.log('✅ Ruta optimizada completada');
  console.log('📊 Orden final:', route.map((idx, order) => `${order + 1}. ${addresses[idx].address}`));
  
  return route;
};

// Optimización 2-opt para mejorar la ruta (manteniendo fijo el primer punto)
const twoOpt = (route, addresses, keepFirstFixed = true) => {
  const n = route.length;
  if (n < 4) return route; // No se puede optimizar rutas muy cortas
  
  let improved = true;
  let bestRoute = [...route];
  
  const calculateTotalDistance = (routeIndices) => {
    let total = 0;
    for (let i = 0; i < routeIndices.length - 1; i++) {
      const coord1 = getCoordinates(addresses[routeIndices[i]]);
      const coord2 = getCoordinates(addresses[routeIndices[i + 1]]);
      if (coord1 && coord2) {
        total += calculateDistance(coord1, coord2);
      }
    }
    return total;
  };
  
  while (improved) {
    improved = false;
    const currentDistance = calculateTotalDistance(bestRoute);
    
    // Si mantenemos el primer punto fijo, empezar desde índice 1
    const startIdx = keepFirstFixed ? 1 : 0;
    
    for (let i = startIdx; i < n - 2; i++) {
      for (let j = i + 1; j < n - 1; j++) {
        // Crear nueva ruta con segmento invertido
        const newRoute = [...bestRoute];
        
        // Invertir el segmento entre i y j
        let left = i;
        let right = j;
        while (left < right) {
          [newRoute[left], newRoute[right]] = [newRoute[right], newRoute[left]];
          left++;
          right--;
        }
        
        const newDistance = calculateTotalDistance(newRoute);
        
        if (newDistance < currentDistance) {
          bestRoute = newRoute;
          improved = true;
          break;
        }
      }
      if (improved) break;
    }
  }
  
  return bestRoute;
};

// Función principal para optimizar ruta
export const optimizeRoute = async (addresses, userLocation = null) => {
  try {
    // Filtrar solo direcciones con coordenadas válidas
    const addressesWithCoords = addresses.map((addr, index) => ({
      ...addr,
      originalIndex: index,
      coords: getCoordinates(addr)
    }));
    
    const validAddresses = addressesWithCoords.filter(addr => addr.coords !== null);
    const invalidAddresses = addressesWithCoords.filter(addr => addr.coords === null);
    
    if (validAddresses.length < 2) {
      // Si hay muy pocas direcciones con coordenadas, devolver orden original
      return addresses;
    }
    
    // Aplicar algoritmo del vecino más cercano
    const routeIndices = nearestNeighborTSP(validAddresses, userLocation);
    
    // Optimizar con 2-opt si hay suficientes direcciones
    // Si hay userLocation, mantener fijo el primer punto (el más cercano al usuario)
    const optimizedIndices = validAddresses.length > 3 
      ? twoOpt(routeIndices, validAddresses, !!userLocation)
      : routeIndices;
    
    // Reconstruir la lista completa de direcciones
    const optimizedRoute = optimizedIndices.map(idx => validAddresses[idx]);
    
    // Agregar direcciones sin coordenadas al final
    const finalRoute = [...optimizedRoute, ...invalidAddresses];
    
    // Devolver las direcciones originales en el orden optimizado
    return finalRoute.map(addr => addresses[addr.originalIndex]);
    
  } catch (error) {
    console.error('Error optimizando ruta:', error);
    return addresses; // En caso de error, devolver orden original
  }
};

// Función para obtener la ubicación actual del usuario
export const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocalización no soportada'));
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
};

// Calcular estadísticas de la ruta
export const calculateRouteStats = (addresses) => {
  let totalDistance = 0;
  let validSegments = 0;
  
  for (let i = 0; i < addresses.length - 1; i++) {
    const coord1 = getCoordinates(addresses[i]);
    const coord2 = getCoordinates(addresses[i + 1]);
    
    if (coord1 && coord2) {
      totalDistance += calculateDistance(coord1, coord2);
      validSegments++;
    }
  }
  
  return {
    totalDistance: totalDistance.toFixed(2),
    totalAddresses: addresses.length,
    addressesWithCoords: addresses.filter(addr => getCoordinates(addr) !== null).length,
    estimatedTime: Math.ceil((totalDistance / 30) * 60), // Asumiendo 30 km/h promedio
    validSegments
  };
};

// Generar URL de Google Maps con ruta completa - VERSIÓN MEJORADA
export const generateGoogleMapsRouteUrl = (addresses, userLocation = null) => {
  try {
    console.log('🗺️ Generando URL de Google Maps...');
    
    if (!addresses || addresses.length === 0) {
      console.error('❌ No hay direcciones para generar la ruta');
      return null;
    }

    // Filtrar direcciones con coordenadas válidas
    const validAddresses = addresses.filter(address => {
      const coords = getCoordinates(address);
      return coords !== null;
    });

    if (validAddresses.length === 0) {
      console.error('❌ No hay direcciones con coordenadas válidas');
      return null;
    }

    console.log(`📍 Procesando ${validAddresses.length} direcciones válidas de ${addresses.length} totales`);

    const baseUrl = 'https://www.google.com/maps/dir';
    const params = new URLSearchParams();
    
    // Configurar API para uso driving y optimización
    params.append('api', '1');
    params.append('travelmode', 'driving');
    
    // MEJORA: Si tenemos más de 8 direcciones, dividir la ruta
    let addressesToUse = validAddresses;
    let showWarning = false;
    
    if (validAddresses.length > 8) {
      // Google Maps tiene un límite de ~8-10 waypoints en URLs directas
      addressesToUse = validAddresses.slice(0, 8);
      showWarning = true;
      console.log(`⚠️ Limitando a las primeras 8 direcciones (Google Maps URL limit)`);
    }

    // PASO 1: Configurar origen (punto de partida)
    let origin = '';
    if (userLocation) {
      origin = `${userLocation.lat},${userLocation.lng}`;
      params.append('origin', origin);
      console.log(`🚀 Origen configurado: Tu ubicación (${userLocation.lat.toFixed(6)}, ${userLocation.lng.toFixed(6)})`);
    } else {
      // Si no hay ubicación del usuario, usar la primera dirección como origen
      const firstCoords = getCoordinates(addressesToUse[0]);
      if (firstCoords) {
        origin = `${firstCoords.lat},${firstCoords.lng}`;
        params.append('origin', origin);
        addressesToUse = addressesToUse.slice(1); // Remover la primera dirección de los waypoints
        console.log(`🚀 Origen configurado: Primera dirección "${addressesToUse[0]?.address || 'Dirección'}"`);
      }
    }

    // PASO 2: Configurar destino (última dirección)
    let destination = '';
    if (addressesToUse.length > 0) {
      const lastAddress = addressesToUse[addressesToUse.length - 1];
      const lastCoords = getCoordinates(lastAddress);
      if (lastCoords) {
        destination = `${lastCoords.lat},${lastCoords.lng}`;
        params.append('destination', destination);
        addressesToUse = addressesToUse.slice(0, -1); // Remover la última dirección de los waypoints
        console.log(`🏁 Destino configurado: "${lastAddress.address}"`);
      }
    }

    // PASO 3: Configurar waypoints (direcciones intermedias)
    const waypoints = [];
    addressesToUse.forEach((address, index) => {
      const coords = getCoordinates(address);
      if (coords) {
        waypoints.push(`${coords.lat},${coords.lng}`);
        console.log(`   ${index + 1}. Waypoint: "${address.address}" (${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)})`);
      }
    });

    if (waypoints.length > 0) {
      // MEJORA: Usar optimización automática de Google Maps para waypoints
      const waypointString = waypoints.join('|');
      params.append('waypoints', `optimize:true|${waypointString}`);
      console.log(`🛣️ Configurados ${waypoints.length} waypoints con optimización automática`);
    }

    // PASO 4: Configuraciones adicionales para mejor experiencia
    params.append('avoid', 'tolls'); // Evitar peajes por defecto
    
    // PASO 5: Generar URL final
    const finalUrl = `${baseUrl}?${params.toString()}`;
    
    console.log('✅ URL de Google Maps generada exitosamente');
    console.log(`📊 Resumen de la ruta:`);
    console.log(`   - Origen: ${userLocation ? 'Tu ubicación' : 'Primera dirección'}`);
    console.log(`   - Waypoints: ${waypoints.length} paradas intermedias`);
    console.log(`   - Destino: Última dirección`);
    console.log(`   - Optimización: ${waypoints.length > 0 ? 'Habilitada en Google Maps' : 'No aplicable'}`);
    
    if (showWarning) {
      console.log(`⚠️ NOTA: Solo se incluyeron las primeras 8 direcciones debido a limitaciones de URL`);
    }

    // Para debugging: SIEMPRE mostrar la URL completa para diagnosticar el problema
    console.log(`🔗 URL generada: ${finalUrl}`);
    console.log(`🔍 URL comienza con https://? ${finalUrl.startsWith('https://')}`);
    console.log(`📏 Longitud de URL: ${finalUrl.length} caracteres`);

    // Verificación adicional de seguridad
    if (!finalUrl.startsWith('https://')) {
      console.error('❌ ERROR CRÍTICO: La URL no tiene el protocolo correcto');
      return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
    }

    return finalUrl;

  } catch (error) {
    console.error('❌ Error generando URL de Google Maps:', error);
    return null;
  }
};

// Función para generar URL de navegación individual a una dirección
export const generateIndividualDirectionUrl = (address, mode = 'driving') => {
  const coords = getCoordinates(address);
  if (!coords) {
    return null;
  }
  
  return `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}&travelmode=${mode}`;
}; 