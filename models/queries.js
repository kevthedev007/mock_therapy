const Pool = require('pg').Pool;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {rejectUnauthorized: false}
    // user: 'postgres',
    // host: 'localhost',
    // database: 'user_management',
    // password: 'sasuke007',
    // port: 5432
})

module.exports = pool;