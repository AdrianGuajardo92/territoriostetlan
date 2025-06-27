import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

// Configuración de Firebase - Usando el proyecto del código original
const firebaseConfig = {
    apiKey: "AIzaSyAyD4lW7uKHw-rcnOqr4YrBLp3oskklO8A",
    authDomain: "gestor-territorios-ls.firebaseapp.com",
    projectId: "gestor-territorios-ls",
    storageBucket: "gestor-territorios-ls.appspot.com",
    messagingSenderId: "930008027118",
    appId: "1:930008027118:web:236a36e1ded5e1555c08ff"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar Auth
export const auth = getAuth(app);

// Inicializar Firestore
export const db = getFirestore(app);

// Habilitar persistencia offline
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
        console.warn('Persistencia offline no disponible: múltiples tabs abiertas');
    } else if (err.code === 'unimplemented') {
        console.warn('Persistencia offline no soportada en este navegador');
    }
});

export default app; 