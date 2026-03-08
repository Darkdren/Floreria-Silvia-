const config = require('./config');
const { initializeDatabase } = require('./db');
const { createApp } = require('./app');

async function startServer() {
  const db = await initializeDatabase(config.databasePath);
  const app = createApp({ db, config });

  const server = app.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`Server running on http://localhost:${config.port}`);
  });

  async function shutdown(signal) {
    // eslint-disable-next-line no-console
    console.log(`Received ${signal}. Closing server...`);
    server.close(async () => {
      await db.close();
      process.exit(0);
    });
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

startServer().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Unable to start server:', error);
  process.exit(1);
});
