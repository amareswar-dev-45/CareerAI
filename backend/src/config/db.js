const mongoose = require('mongoose');
const env = require('./env');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    });
    console.log(`[MongoDB Connected]: ${conn.connection.host} / DB: ${conn.connection.name}`);
  } catch (error) {
    console.error(`[MongoDB Connection Error]: ${error.message}`);
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB Warning]: Database connection disconnected.');
});

mongoose.connection.on('reconnected', () => {
  console.log('[MongoDB Info]: Database connection re-established.');
});

module.exports = connectDB;
