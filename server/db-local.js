const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, 'database');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const adapter = new FileSync(path.join(dbDir, 'tombstones.json'));
const db = low(adapter);
db.defaults({ tombstones: [] }).write();

async function init() {} // no-op for local

async function getAll(filters) {
  const { dealType, year, minSize, maxSize, search } = filters;
  let results = db.get('tombstones').value();
  if (dealType && dealType !== 'All') results = results.filter(t => t.deal_type === dealType);
  if (year && year !== 'All') results = results.filter(t => t.deal_year === parseInt(year));
  if (minSize) results = results.filter(t => t.deal_size_millions >= parseFloat(minSize));
  if (maxSize) results = results.filter(t => t.deal_size_millions <= parseFloat(maxSize));
  if (search) {
    const q = search.toLowerCase();
    results = results.filter(t => t.company_name.toLowerCase().includes(q));
  }
  return results.sort((a, b) => b.deal_year - a.deal_year || new Date(b.created_at) - new Date(a.created_at));
}

async function getById(id) {
  return db.get('tombstones').find({ id }).value() || null;
}

async function create(data) {
  db.get('tombstones').push(data).write();
  return data;
}

async function update(id, data) {
  const existing = db.get('tombstones').find({ id }).value();
  if (!existing) return null;
  db.get('tombstones').find({ id }).assign(data).write();
  return db.get('tombstones').find({ id }).value();
}

async function remove(id) {
  const existing = db.get('tombstones').find({ id }).value();
  if (!existing) return null;
  db.get('tombstones').remove({ id }).write();
  return existing;
}

module.exports = { init, getAll, getById, create, update, remove };
