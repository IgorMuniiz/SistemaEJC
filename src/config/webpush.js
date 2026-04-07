const configureWebPush = ({ webpush, runtimeConfig, isProduction = false, logger = console, contact = 'mailto:you@example.com' }) => {
  let vapidKeys = {
    publicKey: runtimeConfig.vapidPublicKey,
    privateKey: runtimeConfig.vapidPrivateKey,
  };

  if (!runtimeConfig.hasVapidKeys) {
    const keys = webpush.generateVAPIDKeys();
    logger.warn(
      isProduction
        ? '[BOOT] VAPID ausente em producao. Gerando chaves temporarias para preservar o startup.'
        : 'VAPID keys were not provided. Generated ephemeral keys for development only.'
    );
    vapidKeys = keys;
  }

  webpush.setVapidDetails(contact, vapidKeys.publicKey, vapidKeys.privateKey);
  return vapidKeys;
};

module.exports = {
  configureWebPush,
};
