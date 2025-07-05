import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Configuración de Firebase - Usando variables de entorno con fallback
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAyD4lW7uKHw-rcnOqr4YrBLp3oskklO8A",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "gestor-territorios-ls.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "gestor-territorios-ls",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "gestor-territorios-ls.appspot.com",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "930008027118",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:930008027118:web:236a36e1ded5e1555c08ff"
};

// Log para diagnóstico (DESACTIVADO EN PRODUCCIÓN)
// console.log('🔧 Configuración Firebase cargada:');
// console.log('Project ID:', firebaseConfig.projectId);
// console.log('Auth Domain:', firebaseConfig.authDomain);
// console.log('Usando variables de entorno:', !!import.meta.env.VITE_FIREBASE_PROJECT_ID);

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar Auth
export const auth = getAuth(app);

// Inicializar Firestore
export const db = getFirestore(app);

export default app; 