const admin = require('firebase-admin');
const { encrypt } = require('./cryptoUtils'); 

// --- Firebase setup ---
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// --- Data cleaning and parsing ---
function cleanDateString(str) {
  // Fix weird space characters and format date strings consistently
  let cleanStr = str.replace(/\u202f/g, ' ').replace(/\u00a0/g, ' ');
  cleanStr = cleanStr.replace(' at ', ', ');
  return cleanStr;
}

function parseHealthData(raw) {
  const parseEntries = (timestampsStr, valuesStr) => {
    const timestamps = timestampsStr.trim().split('\n').map(ts => {
      const clean = cleanDateString(ts.trim());
      const parsed = new Date(clean);
      return isNaN(parsed.getTime()) ? null : parsed.toISOString(); // Only keep valid timestamps
    });

    const values = valuesStr.trim().split('\n').map(v => parseFloat(v)); // Convert string to number

    return timestamps.map((t, i) => (t ? { timestamp: t, value: values[i] } : null)).filter(Boolean); // Match timestamps with values
  };

  // Process each metric from the Apple Shortcut data
  const heart = parseEntries(raw.heart['timestamps '], raw.heart.values);
  const steps = parseEntries(raw.steps['timestamps '], raw.steps.values);
  const walkingSpeed = parseEntries(raw.walkingSpeed['timestamps '], raw.walkingSpeed.values);
  const walkingAsymmetry = parseEntries(raw.walkingAsymmetry['timestamps '], raw.walkingAsymmetry.values);
  const walkingSteadiness = parseEntries(raw.walkingSteadiness['timestamps '], raw.walkingSteadiness.values);
  const walkingDoubleSupport = parseEntries(raw.walkingDoubleSupport['timestamps '], raw.walkingDoubleSupport.values);
  const walkingStepLength = parseEntries(raw.walkingStepLength['timestamps '], raw.walkingStepLength.values);
  const sleep = parseEntries(raw.sleep['timestamps '], raw.sleep.values);

  // Clean the overall date field
  const parsedDate = new Date(cleanDateString(raw.date.trim()));
  const date = isNaN(parsedDate.getTime()) ? null : parsedDate.toISOString();

  return { date, heart, steps, walkingSpeed, walkingAsymmetry, walkingSteadiness, walkingDoubleSupport, walkingStepLength, sleep };
}

// --- API handler ---
module.exports = async function handler(req, res) {
  // Only allow POST requests (the Shortcut uses POST)
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  console.log('Received raw health data:', req.body); // For debugging

  try {
    // Step 1: Clean and parse the data from Apple Shortcuts
    const cleanedData = parseHealthData(req.body);
    console.log('Cleaned health data:', cleanedData);

    // Step 2: Encrypt the parsed data
    const encryptedData = encrypt(cleanedData);

    // Step 3: Save encrypted data to Firestore
    await db.collection('healthData').add({ encrypted: encryptedData });

    // Step 4: Respond with success
    res.status(200).json({ success: true, message: 'Data encrypted and stored securely.' });
  } catch (err) {
    console.error('Error processing health data:', err);
    res.status(500).json({ success: false, error: 'Failed to process health data' });
  }
};
