import { useState, useEffect, useCallback } from 'react';
import { useToast } from './useToast';

export const useAppUpdates = () => {
    const [currentVersion, setCurrentVersion] = useState(null);
    const [latestVersion, setLatestVersion] = useState(null);
    const [isChecking, setIsChecking] = useState(false);
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [forceUpdate, setForceUpdate] = useState(false);
    const { showToast } = useToast();

    // Función para obtener la versión actual desde el package.json
    const getCurrentVersion = useCallback(() => {
        return process.env.npm_package_version || '1.4.0'; // Actualizar versión por defecto
    }, []);

    // Función para verificar actualizaciones con cache busting
    const checkForUpdates = useCallback(async () => {
        try {
            setIsChecking(true);
            
            // Cache busting: agregar timestamp para evitar cache del navegador
            const timestamp = Date.now();
            const response = await fetch(`/version.json?t=${timestamp}`, {
                method: 'GET',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });

            if (!response.ok) {
                throw new Error('No se pudo verificar actualizaciones');
            }

            const versionData = await response.json();
            const localVersion = getCurrentVersion();

            setLatestVersion(versionData);
            setCurrentVersion(localVersion);

            // Comparar versiones
            if (versionData.version !== localVersion) {
                setUpdateAvailable(!versionData.silent); // Solo mostrar notificación si no es silenciosa
                setForceUpdate(versionData.forceUpdate || false);
                
                // Si es una actualización silenciosa, recargar automáticamente
                if (versionData.silent) {
                    // Verificar si ya se intentó recargar para evitar bucle infinito
                    const lastReloadAttempt = localStorage.getItem('lastSilentReload');
                    const currentTime = Date.now();
                    
                    // Solo recargar si no se ha intentado en los últimos 30 segundos
                    if (!lastReloadAttempt || (currentTime - parseInt(lastReloadAttempt)) > 30000) {
                        console.log('🔄 Actualización silenciosa detectada, recargando aplicación...');
                        localStorage.setItem('lastSilentReload', currentTime.toString());
                        setTimeout(() => {
                            window.location.reload();
                        }, 2000); // Pequeño delay para evitar interrumpir al usuario
                    } else {
                        console.log('🔄 Recarga silenciosa ya intentada recientemente, evitando bucle infinito');
                    }
                }
            } else {
                setUpdateAvailable(false);
                setForceUpdate(false);
            }

        } catch (error) {
            console.warn('Error verificando actualizaciones:', error);
            // No mostrar error al usuario para no ser intrusivo
        } finally {
            setIsChecking(false);
        }
    }, [getCurrentVersion, showToast]);

    // Función para forzar la actualización
    const forceAppUpdate = useCallback(() => {
        // Limpiar cache del navegador
        if ('caches' in window) {
            caches.keys().then(names => {
                names.forEach(name => {
                    caches.delete(name);
                });
            });
        }

        // Limpiar localStorage y sessionStorage
        localStorage.clear();
        sessionStorage.clear();

        // Recargar la página
        window.location.reload(true);
    }, []);

    // Función para actualizar suavemente
    const softUpdate = useCallback(() => {
        window.location.reload();
    }, []);

    return {
        currentVersion,
        latestVersion,
        isChecking,
        updateAvailable,
        forceUpdate,
        checkForUpdates,
        forceAppUpdate,
        softUpdate
    };
}; 