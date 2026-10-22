const mongoose = require('mongoose');

let connectionPromise;

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI est absent du fichier back/.env');
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // Reuse an active connection attempt, but retry after a failed/disconnected one.
  if (mongoose.connection.readyState !== 2 || !connectionPromise) {
    connectionPromise = mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
    }).catch((error) => {
      connectionPromise = undefined;
      throw error;
    });
  }

  return connectionPromise;
}

module.exports = connectDB;
