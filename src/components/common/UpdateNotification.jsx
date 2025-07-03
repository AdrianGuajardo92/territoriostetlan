import React from 'react';
import { useAppUpdates } from '../../hooks/useAppUpdates';
import Icon from './Icon';

export const UpdateNotification = () => {
    const { 
        updateAvailable, 
        forceUpdate, 
        latestVersion, 
        currentVersion,
        softUpdate, 
        forceAppUpdate 
    } = useAppUpdates();

    if (!updateAvailable) return null;

    return (
        <div className="fixed top-4 right-4 z-50 max-w-sm">
            <div className={`
                bg-white rounded-lg shadow-xl border-2 p-4 
                ${forceUpdate ? 'border-red-500' : 'border-blue-500'}
                animate-slideInRight
            `}>
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                        <Icon 
                            name={forceUpdate ? "alertTriangle" : "refreshCw"} 
                            size={20} 
                            className={forceUpdate ? "text-red-500" : "text-blue-500"}
                        />
                        <h3 className={`font-semibold text-sm ${
                            forceUpdate ? 'text-red-700' : 'text-blue-700'
                        }`}>
                            {forceUpdate ? 'Actualización Crítica' : 'Nueva Versión'}
                        </h3>
                    </div>
                    <div className="text-xs text-gray-500">
                        v{currentVersion} → v{latestVersion?.version}
                    </div>
                </div>

                {/* Content */}
                <div className="mb-3">
                    <p className="text-sm text-gray-700 mb-2">
                        {forceUpdate 
                            ? 'Esta actualización es obligatoria por seguridad.'
                            : 'Hay una nueva versión disponible con mejoras.'
                        }
                    </p>
                    
                    {latestVersion?.description && (
                        <p className="text-xs text-gray-600 italic">
                            {latestVersion.description}
                        </p>
                    )}
                </div>

                {/* Actions */}
                <div className="flex space-x-2">
                    {forceUpdate ? (
                        <button
                            onClick={forceAppUpdate}
                            className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-medium py-2 px-3 rounded-md transition-colors"
                        >
                            Actualizar Ahora
                        </button>
                    ) : (
                        <>
                                                    <button
                            onClick={softUpdate}
                            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium py-2 px-2 rounded-md transition-colors"
                        >
                            Actualizar aplicación
                        </button>
                            <button
                                onClick={() => window.location.reload()}
                                className="px-3 py-2 text-gray-600 hover:text-gray-800 text-sm transition-colors"
                            >
                                Más tarde
                            </button>
                        </>
                    )}
                </div>

                {/* Progress indicator for critical updates */}
                {forceUpdate && (
                    <div className="mt-3">
                        <div className="w-full bg-gray-200 rounded-full h-1">
                            <div className="bg-red-500 h-1 rounded-full animate-pulse"></div>
                        </div>
                        <p className="text-xs text-red-600 mt-1">
                            La actualización se aplicará automáticamente en 30 segundos
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}; 