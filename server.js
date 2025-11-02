const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware de langue
app.use((req, res, next) => {
  res.locals.language = req.query.lang || 'fr';
  next();
});

// ✅ CORRECTION : Chemin DB pour Render
const dbPath = process.env.NODE_ENV === 'production' 
  ? '/tmp/eds.db' 
  : './data/eds.db';

// ✅ S'assurer que le dossier existe
if (process.env.NODE_ENV !== 'production') {
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Erreur connexion DB:', err.message);
  } else {
    console.log('✅ Connecté à la base de données SQLite');
  }
});

// Le reste du code reste identique...
// [Garder tout le code existant de server.js]
