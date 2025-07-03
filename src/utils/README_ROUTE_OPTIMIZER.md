# 🗺️ Módulo de Optimización de Rutas

## Descripción
El módulo de optimización de rutas implementa un algoritmo avanzado para calcular la ruta más eficiente para visitar todas las direcciones de un territorio.

## Características

### 1. **Algoritmo TSP (Traveling Salesman Problem)**
- Utiliza la heurística del **Vecino más Cercano** (Nearest Neighbor)
- Implementa **optimización 2-opt** para mejorar la ruta inicial
- Considera la ubicación actual del usuario como punto de partida

### 2. **Extracción de Coordenadas**
- Soporta múltiples formatos de URL de Google Maps
- Extrae coordenadas de:
  - URLs con parámetro `q`
  - URLs con formato `@lat,lng`
  - URLs de lugares (`/place/`)
  - URLs de direcciones (`/dir/`)
  - Coordenadas embebidas (`!3d`, `!4d`)

### 3. **Cálculo de Distancias**
- Usa la **fórmula de Haversine** para distancias precisas
- Considera la curvatura de la Tierra
- Resultados en kilómetros

### 4. **Estadísticas de Ruta**
- Distancia total del recorrido
- Tiempo estimado (basado en 30 km/h promedio)
- Número de direcciones con/sin coordenadas
- Segmentos válidos de la ruta

## Cómo Funciona

### 1. Activar Ruta Optimizada
1. En la vista de territorio, presiona el botón de **ruta optimizada** (ícono de actividad)
2. La app intentará obtener tu ubicación actual
3. Se calculará la ruta más eficiente

### 2. Algoritmo de Optimización

```javascript
// 1. Vecino más Cercano
- Comienza desde tu ubicación (o primera dirección)
- En cada paso, visita la dirección más cercana no visitada
- Continúa hasta visitar todas las direcciones

// 2. Optimización 2-opt
- Revisa la ruta inicial
- Prueba invertir segmentos para reducir cruces
- Repite hasta que no haya mejoras
```

### 3. Visualización
- Las direcciones se numeran según el orden optimizado
- El número aparece en **rojo** para rutas optimizadas
- Se muestra la distancia total y tiempo estimado

## Casos de Uso

### ✅ Ideal para:
- Territorios con muchas direcciones (>10)
- Rutas de predicación casa por casa
- Minimizar tiempo de desplazamiento
- Planificar salidas eficientes

### ⚠️ Consideraciones:
- Requiere que las direcciones tengan ubicación en Google Maps
- La precisión depende de la calidad de las coordenadas
- El tiempo estimado es aproximado

## Ejemplo de Uso

```javascript
// Desde TerritoryDetailView
const handleOptimizedRoute = async () => {
  // Obtener ubicación del usuario
  const userLocation = await getCurrentLocation();
  
  // Optimizar ruta
  const optimizedRoute = await optimizeRoute(addresses, userLocation);
  
  // Calcular estadísticas
  const stats = calculateRouteStats(optimizedRoute);
  // Resultado: { totalDistance: "12.5", estimatedTime: 25, ... }
};
```

## Mejoras Futuras

1. **Algoritmos Adicionales**
   - Implementar Simulated Annealing
   - Algoritmo genético para rutas muy grandes

2. **Consideraciones de Tráfico**
   - Integrar API de tráfico en tiempo real
   - Ajustar tiempos según hora del día

3. **Preferencias de Usuario**
   - Evitar ciertas zonas
   - Priorizar direcciones específicas
   - Horarios de disponibilidad

4. **Exportación**
   - Generar archivo GPX
   - Compartir ruta por WhatsApp
   - Integración con apps de navegación

## Rendimiento

- **< 50 direcciones**: Instantáneo
- **50-200 direcciones**: < 1 segundo
- **> 200 direcciones**: 1-3 segundos

El algoritmo está optimizado para manejar territorios típicos de 20-100 direcciones eficientemente. 