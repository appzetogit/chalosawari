const fs = require('fs');
const { initializeApp, cert } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');

const MAX_TOKENS = 10;
const FIELD = { web: 'fcmTokens', mobile: 'fcmTokenMobile' };

let ready = false;
try {
  const path = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
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

// Send to every token of a User/Driver; prunes tokens FCM reports as dead.
const sendPushToDoc = async (Model, id, { title, body, data = {} }) => {
  if (!ready) return null;
  const doc = await Model.findById(id).select('+fcmTokens +fcmTokenMobile').lean();
  const tokens = [...(doc?.fcmTokens || []), ...(doc?.fcmTokenMobile || [])];
  if (!tokens.length) return null;
  const res = await getMessaging().sendEachForMulticast({
    tokens,
    notification: { title, body },
    data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)]))
  });
  const dead = tokens.filter((_, i) => {
    const code = res.responses[i].error?.code;
    return code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token';
  });
  if (dead.length) await Model.updateOne({ _id: id }, { $pull: { fcmTokens: { $in: dead }, fcmTokenMobile: { $in: dead } } });
  return res;
};

module.exports = { saveFcmToken, removeFcmToken, sendPushToDoc };
