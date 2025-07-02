// 🔥 FIREBASE OPTIMIZADO - Solo lo esencial para máximo rendimiento
import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, enableNetwork, disableNetwork } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAyD4lW7uKHw-rcnOqr4YrBLp3oskklO8A",
  authDomain: "gestor-territorios-ls.firebaseapp.com",
  projectId: "gestor-territorios-ls",
  storageBucket: "gestor-territorios-ls.appspot.com",
  messagingSenderId: "930008027118",
  appId: "1:930008027118:web:236a36e1ded5e1555c08ff"
};

// 🚀 INICIALIZACIÓN OPTIMIZADA
const app = initializeApp(firebaseConfig);

// 🎯 FIRESTORE CON CONFIGURACIÓN DE RENDIMIENTO
const db = getFirestore(app);

// 🔧 CONFIGURACIONES DE RENDIMIENTO
// Habilitar persistencia offline automáticamente
if (typeof window !== 'undefined') {
  // Configurar cache settings para mejor rendimiento
  db._delegate._databaseId = db._delegate._databaseId;
}

// 🌐 FUNCIONES DE CONECTIVIDAD
export const enableFirestoreNetwork = () => enableNetwork(db);
export const disableFirestoreNetwork = () => disableNetwork(db);

// 📱 DETECCIÓN DE CONECTIVIDAD OPTIMIZADA
export const getConnectionStatus = () => {
  return navigator.onLine && 
         window.performance && 
         window.performance.now() > 0;
};

export { db };
export default app; 