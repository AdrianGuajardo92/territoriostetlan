import { useState, useEffect } from 'react';

/**
 * Hook para calcular proximidad en tiempo real
 */
export const useProximity = (address) => {
  const [proximity, setProximity] = useState(null);
  const [isNearby, setIsNearby] = useState(false);
  
  // Función para calcular distancia usando fórmula de Haversine
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Formatear distancia para mostrar
  const formatDistance = (distanceKm) => {
    if (distanceKm < 0.1) return { text: 'Estás aquí! 🎯', walkTime: '0 min' };
    if (distanceKm < 1) {
      const meters = Math.round(distanceKm * 1000);
      const walkTime = Math.ceil(meters / 80); // 80 metros por minuto caminando
      return { 
        text: `${meters} m`, 
        walkTime: `${walkTime} min` 
      };
    }
    const walkTime = Math.ceil((distanceKm * 1000) / 80);
    return { 
      text: `${distanceKm.toFixed(1)} km`, 
      walkTime: `${walkTime} min` 
    };
  };

  useEffect(() => {
    // Solo calcular si la dirección tiene coordenadas
    if (!address.latitude || !address.longitude) {
      setProximity(null);
      setIsNearby(false);
      return;
    }

    let watchId;

    const startWatching = () => {
      if (!navigator.geolocation) return;

      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const userLat = position.coords.latitude;
          const userLng = position.coords.longitude;
          
          const distance = calculateDistance(
            userLat, userLng,
            address.latitude, address.longitude
          );
          
          const formatted = formatDistance(distance);
          
          setProximity({
            distance: distance,
            formatted: formatted,
            userLocation: { lat: userLat, lng: userLng }
          });
          
          // Considerar "cerca" si está a menos de 200 metros
          setIsNearby(distance < 0.2);
        },
        (error) => {
          console.log('Geolocation error:', error);
          setProximity(null);
          setIsNearby(false);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 30000, // Cache por 30 segundos
          timeout: 10000
        }
      );
    };

    startWatching();

    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [address.latitude, address.longitude, address.id]);

  return { proximity, isNearby };
};

export default useProximity; 