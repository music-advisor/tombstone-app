// Use PostgreSQL in production (DATABASE_URL set by Railway), lowdb locally
module.exports = process.env.DATABASE_URL
  ? require('./db-postgres')
  : require('./db-local');
