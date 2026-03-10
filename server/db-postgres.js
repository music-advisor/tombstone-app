const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tombstones (
      id TEXT PRIMARY KEY,
      company_name TEXT NOT NULL,
      deal_type TEXT NOT NULL,
      deal_size_millions REAL,
      deal_year INTEGER NOT NULL,
      logo_url TEXT,
      role TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

async function getAll(filters) {
  const { dealType, year, minSize, maxSize, search } = filters;
  let q = 'SELECT * FROM tombstones WHERE 1=1';
  const params = [];
  let i = 1;
  if (dealType && dealType !== 'All') { q += ` AND deal_type = $${i++}`; params.push(dealType); }
  if (year && year !== 'All') { q += ` AND deal_year = $${i++}`; params.push(parseInt(year)); }
  if (minSize) { q += ` AND deal_size_millions >= $${i++}`; params.push(parseFloat(minSize)); }
  if (maxSize) { q += ` AND deal_size_millions <= $${i++}`; params.push(parseFloat(maxSize)); }
  if (search) { q += ` AND LOWER(company_name) LIKE $${i++}`; params.push(`%${search.toLowerCase()}%`); }
  q += ' ORDER BY deal_year DESC, created_at DESC';
  const { rows } = await pool.query(q, params);
  return rows;
}

async function getById(id) {
  const { rows } = await pool.query('SELECT * FROM tombstones WHERE id = $1', [id]);
  return rows[0] || null;
}

async function create(data) {
  const { id, company_name, deal_type, deal_size_millions, deal_year, logo_url, role, created_at } = data;
  const { rows } = await pool.query(
    `INSERT INTO tombstones (id, company_name, deal_type, deal_size_millions, deal_year, logo_url, role, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [id, company_name, deal_type, deal_size_millions, deal_year, logo_url, role, created_at]
  );
  return rows[0];
}

async function update(id, data) {
  const { company_name, deal_type, deal_size_millions, deal_year, logo_url, role } = data;
  const { rows } = await pool.query(
    `UPDATE tombstones SET company_name=$1, deal_type=$2, deal_size_millions=$3,
     deal_year=$4, logo_url=$5, role=$6 WHERE id=$7 RETURNING *`,
    [company_name, deal_type, deal_size_millions, deal_year, logo_url, role, id]
  );
  return rows[0] || null;
}

async function remove(id) {
  const existing = await getById(id);
  if (!existing) return null;
  await pool.query('DELETE FROM tombstones WHERE id = $1', [id]);
  return existing;
}

module.exports = { init, getAll, getById, create, update, remove };
