import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Hook para seguimiento de ubicación en tiempo real
 * Optimizado para ahorro de batería con throttling configurable
 *
 * Estados de GPS:
 * - 'inactive': Tracking detenido
 * - 'acquiring': Obteniendo ubicación inicial
 * - 'active': GPS funcionando correctamente
 * - 'error': Error de permisos o disponibilidad
 */
const useLocationTracking = (options = {}) => {
  const {
    enableHighAccuracy = true,
    maximumAge = 10000,        // Cache de 10 segundos
    timeout = 15000,           // Timeout de 15 segundos
    minUpdateInterval = 3000   // Mínimo 3 segundos entre actualizaciones
  } = options;

  // Estados
  const [location, setLocation] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [gpsStatus, setGpsStatus] = useState('inactive'); // inactive | acquiring | active | error
  const [error, setError] = useState(null);

  // Referencias para control interno
  const watchIdRef = useRef(null);
  const lastUpdateTimeRef = useRef(0);
  const isTrackingRef = useRef(false);

  /**
   * Inicia el seguimiento de ubicación
   */
  const startTracking = useCallback(() => {
    // Evitar iniciar múltiples veces
    if (isTrackingRef.current || watchIdRef.current !== null) {
      return;
    }

    // Verificar disponibilidad de geolocation
    if (!navigator.geolocation) {
      setError({ code: 0, message: 'Geolocalización no disponible' });
      setGpsStatus('error');
      return;
    }

    setIsTracking(true);
    isTrackingRef.current = true;
    setGpsStatus('acquiring');
    setError(null);

    // Opciones para watchPosition
    const watchOptions = {
      enableHighAccuracy,
      maximumAge,
      timeout
    };

    // Handler de éxito
    const handleSuccess = (position) => {
      const now = Date.now();

      // Throttle: ignorar actualizaciones muy frecuentes
      if (now - lastUpdateTimeRef.current < minUpdateInterval) {
        return;
      }

      lastUpdateTimeRef.current = now;

      const newLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      setLocation(newLocation);
      setAccuracy(Math.round(position.coords.accuracy));
      setLastUpdate(new Date());
      setGpsStatus('active');
      setError(null);
    };

    // Handler de error
    const handleError = (err) => {
      setError({
        code: err.code,
        message: getErrorMessage(err.code)
      });

      // Solo cambiar a error si no tenemos una ubicación previa
      if (!location) {
        setGpsStatus('error');
      }
    };

    // Iniciar watchPosition
    watchIdRef.current = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      watchOptions
    );
  }, [enableHighAccuracy, maximumAge, timeout, minUpdateInterval, location]);

  /**
   * Detiene el seguimiento de ubicación
   */
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setIsTracking(false);
    isTrackingRef.current = false;
    setGpsStatus('inactive');
    // Mantener la última ubicación conocida para referencia
  }, []);

  /**
   * Fuerza una actualización inmediata de ubicación
   * Intenta con alta precisión primero, si falla usa baja precisión como respaldo
   */
  const forceUpdate = useCallback(() => {
    if (!navigator.geolocation) {
      setError({ code: 0, message: 'Geolocalización no disponible' });
      return Promise.reject(new Error('Geolocalización no disponible'));
    }

    setGpsStatus('acquiring');

    const handleSuccess = (position, resolve) => {
      const newLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };

      setLocation(newLocation);
      setAccuracy(Math.round(position.coords.accuracy));
      setLastUpdate(new Date());
      setGpsStatus('active');
      setError(null);
      lastUpdateTimeRef.current = Date.now();

      resolve(newLocation);
    };

    return new Promise((resolve, reject) => {
      // Primer intento: alta precisión
      navigator.geolocation.getCurrentPosition(
        (position) => handleSuccess(position, resolve),
        () => {
          // Segundo intento: baja precisión como respaldo
          navigator.geolocation.getCurrentPosition(
            (position) => handleSuccess(position, resolve),
            (fallbackErr) => {
              setError({
                code: fallbackErr.code,
                message: getErrorMessage(fallbackErr.code)
              });
              if (!location) {
                setGpsStatus('error');
              }
              reject(fallbackErr);
            },
            {
              enableHighAccuracy: false,  // Baja precisión
              maximumAge: 30000,          // Acepta ubicación de hasta 30 seg
              timeout: 10000
            }
          );
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 8000  // 8 seg para alta precisión
        }
      );
    });
  }, [location]);

  /**
   * Obtiene mensaje de error legible
   */
  const getErrorMessage = (code) => {
    switch (code) {
      case 1:
        return 'Permisos de ubicación denegados';
      case 2:
        return 'No se pudo obtener la ubicación';
      case 3:
        return 'Tiempo de espera agotado';
      default:
        return 'Error desconocido de geolocalización';
    }
  };

  // Cleanup al desmontar el componente
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  return {
    // Estado de ubicación
    location,
    accuracy,
    lastUpdate,

    // Estado del tracking
    isTracking,
    gpsStatus,
    error,

    // Funciones de control
    startTracking,
    stopTracking,
    forceUpdate
  };
};

export { useLocationTracking };
export default useLocationTracking;
