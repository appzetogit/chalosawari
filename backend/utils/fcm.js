const fs = require('fs');
// Loaded inside try below: firebase-admin needs Node >=22; a load failure must not crash the API
let getMessaging;

const MAX_TOKENS = 10;
const FIELD = { web: 'fcmTokens', mobile: 'fcmTokenMobile' };
const TTL_SECONDS = 3 * 24 * 60 * 60; // offline devices still get the push for 3 days
const DEAD_CODES = ['messaging/registration-token-not-registered', 'messaging/invalid-registration-token'];

let ready = false;
try {
  const { initializeApp, cert } = require('firebase-admin/app');
  ({ getMessaging } = require('firebase-admin/messaging'));
  // Relative paths resolve from backend/, so the same .env value works on Windows and the server
  const envPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const path = envPath && require('path').resolve(__dirname, '..', envPath);
  if (path && fs.existsSync(path)) {
    initializeApp({ credential: cert(JSON.parse(fs.readFileSync(path, 'utf8'))) });
    ready = true;
    console.log('✅ Firebase Admin initialized');
  } else {
    console.warn('⚠️ FIREBASE_SERVICE_ACCOUNT_PATH missing/invalid — push notifications disabled');
  }
} catch (err) {
  console.error('Firebase Admin init failed:', err.message);
}

// Store token for a User/Driver doc. Moves it to the end if already present, keeps last MAX_TOKENS.
const saveFcmToken = async (Model, id, token, platform = 'web') => {
  const field = FIELD[platform];
  if (!field || typeof token !== 'string' || !token.trim() || token.length > 4096) return false;
  token = token.trim();
  await Model.updateOne({ _id: id }, { $pull: { [field]: token } });
  await Model.updateOne({ _id: id }, { $push: { [field]: { $each: [token], $slice: -MAX_TOKENS } } });
  return true;
};

const removeFcmToken = (Model, id, token) =>
  Model.updateOne({ _id: id }, { $pull: { fcmTokens: token, fcmTokenMobile: token } });

// Multicast to tokens in chunks of 500 (FCM limit); prunes tokens FCM reports as dead from every model.
// Data-only on purpose: the Android apps display the notification themselves from data.title/body.
// A `notification` block would make Android show a 2nd copy (system + app) — don't add it back.
const sendToTokens = async (models, filter, tokens, { title, body, data = {} }) => {
  const result = { successCount: 0, failureCount: 0, tokenCount: tokens.length, errors: {} };
  if (!ready || !tokens.length) return result;
  const dead = [];
  const payload = Object.fromEntries(Object.entries({ ...data, title, body }).map(([k, v]) => [k, String(v)]));
  for (let i = 0; i < tokens.length; i += 500) {
    const chunk = tokens.slice(i, i + 500);
    const res = await getMessaging().sendEachForMulticast({
      tokens: chunk,
      data: payload,
      android: { priority: 'high', ttl: TTL_SECONDS * 1000 }
    });
    result.successCount += res.successCount;
    result.failureCount += res.failureCount;
    res.responses.forEach((r, j) => {
      if (!r.error) return;
      result.errors[r.error.code] = (result.errors[r.error.code] || 0) + 1;
      if (DEAD_CODES.includes(r.error.code)) dead.push(chunk[j]);
    });
  }
  if (dead.length) await Promise.all(models.map((M) => M.updateMany(filter, { $pull: { fcmTokenMobile: { $in: dead } } })));
  if (result.failureCount) console.warn('FCM failures:', result.errors);
  return result;
};

// Push goes to the Android apps only (fcmTokenMobile); web tokens are stored but not used.
const tokensOf = (docs) => [...new Set(docs.flatMap((d) => d.fcmTokenMobile || []))];

// Send to every mobile token of one User/Driver.
const sendPushToDoc = async (Model, id, payload) => {
  const doc = await Model.findById(id).select('+fcmTokenMobile').lean();
  return sendToTokens([Model], { _id: id }, tokensOf(doc ? [doc] : []), payload);
};

// Send to every doc with a mobile token across the given models (User and/or Driver).
// Tokens are deduped across models, so a phone saved on both a User and a Driver gets it once.
const sendPushToAudience = async (models, payload) => {
  const filter = { 'fcmTokenMobile.0': { $exists: true } };
  const docs = (await Promise.all(models.map((M) => M.find(filter).select('+fcmTokenMobile').lean()))).flat();
  return sendToTokens(models, filter, tokensOf(docs), payload);
};

module.exports = { saveFcmToken, removeFcmToken, sendPushToDoc, sendPushToAudience };
