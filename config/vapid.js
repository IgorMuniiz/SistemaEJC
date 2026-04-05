const webpush = require('web-push');

let vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY,
};

if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
  const keys = webpush.generateVAPIDKeys();
  console.log('VAPID keys were not provided. Generated new keys; please add them to your .env');
  console.log(JSON.stringify(keys, null, 2));
  vapidKeys = keys;
}

webpush.setVapidDetails('mailto:you@example.com', vapidKeys.publicKey, vapidKeys.privateKey);

module.exports = { vapidKeys, webpush };
