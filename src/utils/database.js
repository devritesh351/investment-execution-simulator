// Simulated PostgreSQL Database using localStorage
// In a real app, this would connect to a PostgreSQL server via Express API

const DB_KEY = 'assetflow_db';

const initializeDatabase = () => {
  const existingDb = localStorage.getItem(DB_KEY);
  if (!existingDb) {
    const initialDb = {
      users: [
        {
          id: 'u1',
          email: 'user@demo.com',
          password: 'Demo@123',
          name: 'John Doe',
          role: 'user',
          phone: '+1234567890',
          createdAt: new Date().toISOString(),
          isVerified: true,
          loginAttempts: 0,
          lockedUntil: null
        },
        {
          id: 'r1',
          email: 'registrar@demo.com',
          password: 'Admin@123',
          name: 'Admin Registrar',
          role: 'registrar',
          phone: '+0987654321',
          createdAt: new Date().toISOString(),
          isVerified: true,
          loginAttempts: 0,
          lockedUntil: null
        }
      ],
      transactions: [],
      sessions: []
    };
    localStorage.setItem(DB_KEY, JSON.stringify(initialDb));
    return initialDb;
  }
  return JSON.parse(existingDb);
};

const saveDatabase = (db) => {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
};

export const db = {
  getAll: (table) => {
    const database = initializeDatabase();
    return database[table] || [];
  },
  
  findOne: (table, query) => {
    const database = initializeDatabase();
    const records = database[table] || [];
    return records.find(record => {
      return Object.keys(query).every(key => record[key] === query[key]);
    });
  },
  
  insert: (table, record) => {
    const database = initializeDatabase();
    if (!database[table]) database[table] = [];
    const newRecord = { ...record, id: 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9) };
    database[table].push(newRecord);
    saveDatabase(database);
    return newRecord;
  },
  
  update: (table, query, updates) => {
    const database = initializeDatabase();
    const records = database[table] || [];
    const index = records.findIndex(record => {
      return Object.keys(query).every(key => record[key] === query[key]);
    });
    if (index !== -1) {
      records[index] = { ...records[index], ...updates };
      saveDatabase(database);
      return records[index];
    }
    return null;
  },
  
  delete: (table, query) => {
    const database = initializeDatabase();
    const records = database[table] || [];
    const filtered = records.filter(record => {
      return !Object.keys(query).every(key => record[key] === query[key]);
    });
    database[table] = filtered;
    saveDatabase(database);
  },

  findMany: (table, query) => {
    const database = initializeDatabase();
    const records = database[table] || [];
    return records.filter(record => {
      return Object.keys(query).every(key => record[key] === query[key]);
    });
  }
};

// Initialize on load
initializeDatabase();
