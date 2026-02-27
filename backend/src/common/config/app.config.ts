export const appConfig = {
  // URL de base selon l'environnement
  baseUrl:
    process.env.APP_BASE_URL ??
    process.env.API_BASE_URL ??
    'http://localhost:3000',

  // Schéma deep link selon l'environnement
  appScheme: process.env.APP_SCHEME ?? 'picpec',

  // En dev → exp://IP:8081/--/
  // En prod → https://picpec.app/
  deepLinkBase:
    process.env.NODE_ENV === 'production'
      ? `https://${process.env.APP_DOMAIN ?? 'picpec.app'}`
      : `exp://${process.env.LOCAL_IP ?? '192.168.1.24'}:8081/--`,
};
