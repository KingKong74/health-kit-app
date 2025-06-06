// GET 's data from Firebase DB

const admin = require('firebase-admin');
const { decrypt } = require('./cryptoUtils');

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const snapshot = await db.collection('healthData')
      .orderBy('date', 'desc') // optional: remove if using only encrypted field
      .limit(10) // change limit later for more data
      .get();

    const data = snapshot.docs.map(doc => {
      const docData = doc.data();

      // Expecting: { encrypted: "iv:encrypted" }
      const decrypted = decrypt(docData.encrypted);

      return {
        id: doc.id,
        ...decrypted
      };
    });

    res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('Error fetching health data:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch health data' });
  }
};
