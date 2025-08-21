const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Dev-only lightweight user store used when DB is unavailable
// Stores users in JSON at server/data/dev-users.json

const DATA_DIR = path.resolve(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'dev-users.json');

function ensureDataFile() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify({ users: [] }, null, 2));
    }
  } catch (_) {}
}

function readStore() {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw || '{"users":[]}');
  } catch (_) {
    return { users: [] };
  }
}

function writeStore(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (_) {}
}

async function findUserByEmail(email) {
  const store = readStore();
  return store.users.find(u => u.email.toLowerCase() === String(email).toLowerCase()) || null;
}

async function createUser({ firstName, lastName, email, password, role = 'WORKER', phone, position }) {
  const store = readStore();
  const existing = store.users.find(u => u.email.toLowerCase() === String(email).toLowerCase());
  if (existing) {
    const err = new Error('User already exists');
    err.code = 'USER_EXISTS';
    throw err;
  }
  const id = `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const passwordHash = await bcrypt.hash(password, 12);
  const user = {
    id,
    firstName,
    lastName,
    email,
    password: passwordHash,
    role,
    phone: phone || null,
    position: position || null,
    isVerified: true,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  store.users.push(user);
  writeStore(store);
  return user;
}

async function verifyPassword(user, plainPassword) {
  return bcrypt.compare(plainPassword, user.password);
}

module.exports = {
  findUserByEmail,
  createUser,
  verifyPassword,
};

