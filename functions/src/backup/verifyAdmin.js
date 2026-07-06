/**
 * Verifica que quien invoca un respaldo manual sea administrador.
 * Acepta userId (sesión admin activa) o accessCode + password.
 */
export async function verifyAdmin(db, { userId, accessCode, password }) {
  if (userId) {
    const doc = await db.collection('users').doc(userId).get();
    if (!doc.exists) return false;

    const data = doc.data();
    if (data.role !== 'admin') return false;
    if (password && data.password !== password) return false;
    return true;
  }

  if (accessCode && password) {
    const snapshot = await db
      .collection('users')
      .where('accessCode', '==', accessCode)
      .limit(1)
      .get();

    if (snapshot.empty) return false;

    const data = snapshot.docs[0].data();
    if (data.role !== 'admin') return false;
    return data.password === password;
  }

  return false;
}
