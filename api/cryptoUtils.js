const crypto = require('crypto'); // Node.js built-in module for encryption

// --- Encryption setup ---
const algorithm = 'aes-256-cbc';
const key = crypto.createHash('sha256').update(String(process.env.ENCRYPTION_KEY)).digest();

// Function to encrypt data
function encrypt(data) {
  const iv = crypto.randomBytes(16); // Generate new IV each time
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted; // Combine IV and encrypted data
}

// Function to decrypt data
function decrypt(encryptedText) {
  const [ivHex, encrypted] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return JSON.parse(decrypted); // Convert back to object
}

module.exports = { encrypt, decrypt };
