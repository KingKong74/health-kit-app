// POST 's data to API and to DB 

const admin = require('firebase-admin');

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();


function cleanDateString(str) {
  // Replace narrow no-break spaces and other weird spaces with normal space
  let cleanStr = str.replace(/\u202f/g, ' ').replace(/\u00a0/g, ' ');

  // Remove " at " and replace with comma for better parsing
  cleanStr = cleanStr.replace(' at ', ', ');

  return cleanStr;
}

function parseHealthData(raw) {
  const parseEntries = (timestampsStr, valuesStr) => {
    const timestamps = timestampsStr.trim().split('\n').map(ts => {
      const clean = cleanDateString(ts.trim());
      const parsed = new Date(clean);
      return isNaN(parsed.getTime()) ? null : parsed.toISOString();
    });

    const values = valuesStr.trim().split('\n').map(v => parseFloat(v));

    return timestamps.map((t, i) => (t ? { timestamp: t, value: values[i] } : null)).filter(Boolean);
  };

  const heart = parseEntries(raw.heart['timestamps '], raw.heart.values);
  const steps = parseEntries(raw.steps['timestamps '], raw.steps.values);
  const walkingSpeed = parseEntries(raw.walkingSpeed['timestamps '], raw.walkingSpeed.values);
  const walkingAsymmetry = parseEntries(raw.walkingAsymmetry['timestamps '], raw.walkingAsymmetry.values);
  const walkingSteadiness = parseEntries(raw.walkingSteadiness['timestamps '], raw.walkingSteadiness.values);
  const walkingDoubleSupport = parseEntries(raw.walkingDoubleSupport['timestamps '], raw.walkingDoubleSupport.values);
  const walkingStepLength = parseEntries(raw.walkingStepLength['timestamps '], raw.walkingStepLength.values);

  const parsedDate = new Date(cleanDateString(raw.date.trim()));
  const date = isNaN(parsedDate.getTime()) ? null : parsedDate.toISOString();

  return { date, heart, steps, walkingSpeed, walkingAsymmetry };
  return { date, heart, steps, walkingSpeed, walkingAsymmetry, walkingSteadiness, walkingDoubleSupport, walkingStepLength };
}


module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  console.log('Received raw health data:', req.body);

  try {
    const cleanedData = parseHealthData(req.body);
    console.log('Cleaned health data:', cleanedData);

    // Save to Firestore
    await db.collection('healthData').add(cleanedData);

    res.status(200).json({ success: true, data: cleanedData });
  } catch (err) {
    console.error('Error processing health data:', err);
    res.status(500).json({ success: false, error: 'Failed to process health data' });
  }
  
};


