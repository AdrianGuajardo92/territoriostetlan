import fs from 'node:fs';
import path from 'node:path';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || 'AIzaSyAyD4lW7uKHw-rcnOqr4YrBLp3oskklO8A',
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || 'gestor-territorios-ls.firebaseapp.com',
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'gestor-territorios-ls',
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || 'gestor-territorios-ls.appspot.com',
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '930008027118',
  appId: process.env.VITE_FIREBASE_APP_ID || '1:930008027118:web:236a36e1ded5e1555c08ff'
};

const IMPORT_BATCH = 'territorio-enlaces-2026-07-05';
const SOURCE_FILE = path.resolve('tmp/territorio-enlaces-extract/territorios-direcciones.json');
const TERRITORY_LIMIT = 20;

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const normalizeText = (value = '') => String(value || '').replace(/\s+/g, ' ').trim();

const parseNotes = (rawNotes = '') => {
  const lines = String(rawNotes || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  let name = '';
  const notes = [];

  for (const line of lines) {
    const nameMatch = line.match(/^Nombre[\s.:]+(.+)$/i);
    if (nameMatch && !name) {
      name = normalizeText(nameMatch[1]);
      continue;
    }

    const noteMatch = line.match(/^(Nota|Notas|Datos)[\s.:]*(.*)$/i);
    if (noteMatch) {
      const value = normalizeText(noteMatch[2]);
      if (value) notes.push(value);
      continue;
    }

    notes.push(line);
  }

  return {
    name,
    notes: notes.join('\n')
  };
};

const loadSourceRows = () => {
  const data = JSON.parse(fs.readFileSync(SOURCE_FILE, 'utf8'));
  return data.rows
    .filter((row) => Number(row.territorio) >= 1 && Number(row.territorio) <= TERRITORY_LIMIT)
    .sort((a, b) => Number(a.territorio) - Number(b.territorio) || Number(a.orden) - Number(b.orden));
};

const buildAddressDoc = (row) => {
  const territoryNumber = Number(row.territorio);
  const order = Number(row.orden);
  const territoryId = `t${String(territoryNumber).padStart(2, '0')}`;
  const { name, notes } = parseNotes(row.notas);
  const addressText = normalizeText(row.direccion) || normalizeText(row.titulo);
  const originalTitle = normalizeText(row.titulo);
  const addressResolvedFromCoordinates = /^\d+°/.test(originalTitle) && Boolean(normalizeText(row.direccion));
  const latitude = Number.isFinite(Number(row.lat)) ? Number(row.lat) : null;
  const longitude = Number.isFinite(Number(row.lng)) ? Number(row.lng) : null;
  const mapUrl = latitude != null && longitude != null
    ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
    : row.short_url;

  return {
    id: `${IMPORT_BATCH}-t${String(territoryNumber).padStart(2, '0')}-${String(order).padStart(3, '0')}`,
    data: {
      address: addressText,
      name,
      notes,
      gender: 'Desconocido',
      phone: '',
      territoryId,
      isVisited: false,
      isRevisita: false,
      revisitaBy: '',
      isEstudio: false,
      estudioBy: '',
      isPhoneOnly: false,
      deleted: false,
      isArchived: false,
      latitude,
      longitude,
      coords: latitude != null && longitude != null ? [latitude, longitude] : null,
      mapUrl,
      source: 'Territorio enlaces.pdf',
      importBatch: IMPORT_BATCH,
      importTerritoryNumber: territoryNumber,
      importOrder: order,
      importTitle: row.titulo || '',
      sourceShortUrl: row.short_url || '',
      sourceListId: row.list_id || '',
      addressResolvedFromCoordinates,
      ...(addressResolvedFromCoordinates ? {
        originalCoordinateAddress: originalTitle,
        addressResolutionSource: 'nominatim-reverse-geocode'
      } : {}),
      createdBy: 'codex-import',
      updatedBy: 'codex-import',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastUpdated: serverTimestamp()
    }
  };
};

const getTerritoryMap = async () => {
  const snapshot = await getDocs(collection(db, 'territories'));
  return new Map(snapshot.docs.map((territoryDoc) => [territoryDoc.id, territoryDoc.data()]));
};

const verifyTerritoriesExist = (docs, territoryMap) => {
  const missing = [...new Set(docs.map((item) => item.data.territoryId))]
    .filter((territoryId) => !territoryMap.has(territoryId));

  if (missing.length > 0) {
    throw new Error(`Faltan territorios en Firestore: ${missing.join(', ')}`);
  }
};

const summarize = (docs) => {
  const counts = new Map();
  const fallbackAddressRows = [];

  for (const item of docs) {
    const territory = item.data.importTerritoryNumber;
    counts.set(territory, (counts.get(territory) || 0) + 1);
    if (!item.data.importTitle || item.data.address !== item.data.importTitle) continue;
    fallbackAddressRows.push({
      territory,
      order: item.data.importOrder,
      address: item.data.address
    });
  }

  return {
    total: docs.length,
    counts: [...counts.entries()].sort((a, b) => a[0] - b[0]),
    fallbackAddressRows
  };
};

const runPreview = async (docs) => {
  const territoryMap = await getTerritoryMap();
  verifyTerritoriesExist(docs, territoryMap);
  const summary = summarize(docs);

  console.log(JSON.stringify({
    mode: 'preview',
    importBatch: IMPORT_BATCH,
    total: summary.total,
    counts: Object.fromEntries(summary.counts.map(([territory, count]) => [`Territorio ${territory}`, count])),
    fallbackAddressRows: summary.fallbackAddressRows
  }, null, 2));
};

const runImport = async (docs) => {
  const territoryMap = await getTerritoryMap();
  verifyTerritoriesExist(docs, territoryMap);

  const batch = writeBatch(db);
  for (const item of docs) {
    batch.set(doc(db, 'addresses', item.id), item.data, { merge: false });
  }
  await batch.commit();

  const importedSnapshot = await getDocs(
    query(collection(db, 'addresses'), where('importBatch', '==', IMPORT_BATCH))
  );
  const importedDocs = importedSnapshot.docs.map((addressDoc) => ({
    id: addressDoc.id,
    ...addressDoc.data()
  }));

  const activeByTerritory = new Map();
  for (const imported of importedDocs) {
    if (imported.deleted || imported.isArchived) continue;
    activeByTerritory.set(
      imported.territoryId,
      (activeByTerritory.get(imported.territoryId) || 0) + 1
    );
  }

  console.log(JSON.stringify({
    mode: 'import',
    importBatch: IMPORT_BATCH,
    written: docs.length,
    readBack: importedDocs.length,
    activeByTerritory: Object.fromEntries([...activeByTerritory.entries()].sort()),
    docIds: importedDocs.map((item) => item.id).sort()
  }, null, 2));
};

const main = async () => {
  const mode = process.argv.includes('--commit') ? 'commit' : 'preview';
  const rows = loadSourceRows();
  const docs = rows.map(buildAddressDoc);

  if (mode === 'preview') {
    await runPreview(docs);
  } else {
    await runImport(docs);
  }

  setTimeout(() => process.exit(0), 250);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
