const { createApp } = require('./app');
const { mongoDbName, port } = require('./config/env');
const { connectDatabase } = require('./db/connect');

async function startServer() {
  try {
    await connectDatabase();
    const app = createApp();
    app.listen(port, '0.0.0.0', () => {
      console.log(`Auth API escuchando en http://0.0.0.0:${port}`);
      console.log(`MongoDB conectado a la base ${mongoDbName}`);
    });
  } catch (error) {
    console.error('No se pudo iniciar el backend:', error.message);
    process.exit(1);
  }
}

module.exports = { startServer };
