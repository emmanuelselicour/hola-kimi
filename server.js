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
    console.log('✅ Connecté à la base de données SQLite:', dbPath);
  }
});

// Initialisation DB améliorée
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    category TEXT,
    images TEXT,
    quantity INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_address TEXT NOT NULL,
    products TEXT NOT NULL,
    total_amount REAL NOT NULL,
    order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'pending'
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS chatbot_conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_message TEXT NOT NULL,
    bot_response TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS visitors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE UNIQUE NOT NULL,
    count INTEGER DEFAULT 0
  )`);
});

// ✅ PAGE TEMPORAIRE - En attendant les fichiers EJS
app.get('/', (req, res) => {
  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>EDS Store - Votre Boutique Mode</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
            text-align: center;
        }
        .logo {
            font-size: 3rem;
            font-weight: bold;
            margin-bottom: 1rem;
        }
        .hero {
            margin: 3rem 0;
        }
        .hero h1 {
            font-size: 3.5rem;
            margin-bottom: 1rem;
        }
        .hero p {
            font-size: 1.3rem;
            opacity: 0.9;
            margin-bottom: 2rem;
        }
        .btn-group {
            display: flex;
            gap: 1rem;
            justify-content: center;
            flex-wrap: wrap;
            margin: 2rem 0;
        }
        .btn {
            background: rgba(255,255,255,0.2);
            color: white;
            padding: 1.2rem 2.5rem;
            border-radius: 50px;
            text-decoration: none;
            font-weight: bold;
            border: 2px solid rgba(255,255,255,0.3);
            transition: all 0.3s;
            backdrop-filter: blur(10px);
        }
        .btn:hover {
            background: rgba(255,255,255,0.3);
            transform: translateY(-3px);
        }
        .btn-primary {
            background: #e74c3c;
            border-color: #e74c3c;
        }
        .btn-primary:hover {
            background: #c0392b;
        }
        .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 2rem;
            margin: 4rem 0;
        }
        .feature {
            background: rgba(255,255,255,0.1);
            padding: 2rem;
            border-radius: 15px;
            backdrop-filter: blur(10px);
        }
        .feature-icon {
            font-size: 3rem;
            margin-bottom: 1rem;
        }
        .products-preview {
            margin: 4rem 0;
        }
        .products-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1.5rem;
            margin: 2rem 0;
        }
        .product-card {
            background: rgba(255,255,255,0.1);
            border-radius: 10px;
            padding: 1.5rem;
            backdrop-filter: blur(10px);
        }
        .admin-panel {
            background: rgba(0,0,0,0.3);
            padding: 2rem;
            border-radius: 15px;
            margin: 3rem 0;
        }
        @media (max-width: 768px) {
            .hero h1 { font-size: 2.5rem; }
            .btn { padding: 1rem 2rem; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">🛍️ EDS STORE</div>
        
        <div class="hero">
            <h1>Bienvenue chez EDS Store !</h1>
            <p>Votre boutique de confiance pour les vêtements, montres, chaussures et bijoux</p>
            
            <div class="btn-group">
                <a href="/seed" class="btn btn-primary">🌱 Charger les Produits</a>
                <a href="/admin" class="btn">⚙️ Administration</a>
                <a href="/api/products" class="btn">📦 Voir les Produits (API)</a>
            </div>
        </div>

        <div class="features">
            <div class="feature">
                <div class="feature-icon">🚚</div>
                <h3>Livraison Rapide</h3>
                <p>2-3 jours ouvrables partout dans le pays</p>
            </div>
            <div class="feature">
                <div class="feature-icon">💳</div>
                <h3>Paiement Sécurisé</h3>
                <p>PayPal, NatCash, MonCash</p>
            </div>
            <div class="feature">
                <div class="feature-icon">🛒</div>
                <h3>Easy Shopping</h3>
                <p>Expérience d'achat simplifiée</p>
            </div>
        </div>

        <div class="admin-panel">
            <h2>🚀 Panel d'Administration</h2>
            <p>Gérez votre boutique facilement</p>
            <div class="btn-group">
                <a href="/admin" class="btn">📊 Tableau de Bord</a>
                <a href="/seed" class="btn">🔄 Recharger Produits</a>
            </div>
        </div>

        <div style="margin-top: 4rem; padding-top: 2rem; border-top: 1px solid rgba(255,255,255,0.2);">
            <p>📍 Votre site est live à : <strong>https://easy-deal-store.onrender.com</strong></p>
            <p style="margin-top: 1rem; opacity: 0.8;">© 2024 EDS Store - Tous droits réservés</p>
        </div>
    </div>

    <script>
        // Chatbot simple
        console.log('🚀 EDS Store chargé avec succès!');
    </script>
</body>
</html>
  `;
  res.send(html);
});

// Routes API et fonctionnelles
app.get('/product/:id', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Produit - EDS Store</title></head>
    <body style="font-family: Arial; text-align: center; padding: 2rem;">
      <h1>📦 Page Produit</h1>
      <p>Produit ID: ${req.params.id}</p>
      <a href="/">← Retour à l'accueil</a>
    </body>
    </html>
  `);
});

app.get('/cart', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Panier - EDS Store</title></head>
    <body style="font-family: Arial; text-align: center; padding: 2rem;">
      <h1>🛒 Votre Panier</h1>
      <p>Fonctionnalité panier à venir...</p>
      <a href="/">← Retour à l'accueil</a>
    </body>
    </html>
  `);
});

app.get('/checkout', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Checkout - EDS Store</title></head>
    <body style="font-family: Arial; text-align: center; padding: 2rem;">
      <h1>💰 Checkout</h1>
      <p>Fonctionnalité checkout à venir...</p>
      <a href="/">← Retour à l'accueil</a>
    </body>
    </html>
  `);
});

app.get('/order-success', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Commande Confirmée - EDS Store</title></head>
    <body style="font-family: Arial; text-align: center; padding: 2rem;">
      <h1>🎉 Commande Confirmée !</h1>
      <p>Merci pour votre commande !</p>
      <a href="/">← Retour à l'accueil</a>
    </body>
    </html>
  `);
});

// API Routes avec validation
app.get('/api/products', (req, res, next) => {
  const category = req.query.category;
  const search = req.query.search;
  const page = parseInt(req.query.page) || 1;
  const limit = 12;
  const offset = (page - 1) * limit;
  
  let query = "SELECT * FROM products";
  let countQuery = "SELECT COUNT(*) as total FROM products";
  let params = [];
  
  if (category && ['homme', 'femme', 'enfant'].includes(category)) {
    query += " WHERE category = ?";
    countQuery += " WHERE category = ?";
    params.push(category);
  } else if (search && search.length >= 2) {
    query += " WHERE name LIKE ? OR description LIKE ?";
    countQuery += " WHERE name LIKE ? OR description LIKE ?";
    params.push(`%${search}%`, `%${search}%`);
  }
  
  query += " ORDER BY RANDOM() LIMIT ? OFFSET ?";
  
  db.all(query, [...params, limit, offset], (err, products) => {
    if (err) return next(err);
    
    db.get(countQuery, params, (err, countResult) => {
      if (err) return next(err);
      
      res.json({
        products: products || [],
        total: countResult.total,
        totalPages: Math.ceil(countResult.total / limit),
        currentPage: page
      });
    });
  });
});

app.post('/api/orders', (req, res, next) => {
  const { customer_name, customer_phone, customer_address, products, total_amount } = req.body;
  
  // Validation basique
  if (!customer_name || !customer_phone || !customer_address || !products || !total_amount) {
    return res.status(400).json({ success: false, error: 'Données manquantes' });
  }
  
  if (products.length === 0) {
    return res.status(400).json({ success: false, error: 'Panier vide' });
  }

  db.run(
    "INSERT INTO orders (customer_name, customer_phone, customer_address, products, total_amount) VALUES (?, ?, ?, ?, ?)",
    [customer_name.trim(), customer_phone.trim(), customer_address.trim(), JSON.stringify(products), parseFloat(total_amount)],
    function(err) {
      if (err) return next(err);
      res.json({ success: true, orderId: this.lastID });
    }
  );
});

// Chatbot API amélioré
app.post('/api/chatbot', (req, res, next) => {
  const { message } = req.body;
  
  if (!message || message.trim().length === 0) {
    return res.status(400).json({ error: 'Message vide' });
  }

  const response = generateBotResponse(message.trim());
  
  db.run(
    "INSERT INTO chatbot_conversations (user_message, bot_response) VALUES (?, ?)",
    [message, response],
    function(err) {
      if (err) return next(err);
      res.json({ response });
    }
  );
});

// Admin Routes - Version simple
app.get('/admin', (req, res, next) => {
  db.all("SELECT * FROM orders ORDER BY order_date DESC LIMIT 10", (err, orders) => {
    if (err) return next(err);
    
    db.all("SELECT * FROM chatbot_conversations ORDER BY timestamp DESC LIMIT 10", (err, conversations) => {
      if (err) return next(err);
      
      db.all("SELECT * FROM visitors ORDER BY date DESC LIMIT 7", (err, visitors) => {
        if (err) return next(err);
        
        const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Admin EDS</title>
    <style>
        body { font-family: Arial; margin: 0; padding: 2rem; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .card { background: white; padding: 1.5rem; margin: 1rem 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; }
        .stat { text-align: center; padding: 1rem; }
        .btn { background: #3498db; color: white; padding: 0.5rem 1rem; text-decoration: none; border-radius: 4px; margin: 0.2rem; }
    </style>
</head>
<body>
    <div class="container">
        <h1>⚙️ Administration EDS Store</h1>
        
        <div class="stats">
            <div class="card stat">
                <h3>Commandes</h3>
                <div style="font-size: 2rem;">${orders.length}</div>
            </div>
            <div class="card stat">
                <h3>Conversations</h3>
                <div style="font-size: 2rem;">${conversations.length}</div>
            </div>
        </div>

        <div class="card">
            <h2>Dernières Commandes</h2>
            ${orders.map(order => `
                <div style="border-bottom: 1px solid #eee; padding: 0.5rem 0;">
                    <strong>${order.customer_name}</strong> - $${order.total_amount}
                    <br><small>${new Date(order.order_date).toLocaleDateString()}</small>
                </div>
            `).join('') || '<p>Aucune commande</p>'}
        </div>

        <div class="card">
            <h2>Actions</h2>
            <a href="/seed" class="btn">🌱 Recharger Produits</a>
            <a href="/" class="btn">🏠 Accueil</a>
        </div>
    </div>
</body>
</html>
        `;
        res.send(html);
      });
    });
  });
});

// Auto-seed si pas de produits
app.get('/seed', (req, res) => {
  const { exec } = require('child_process');
  
  console.log('🌱 Lancement manuel du seed...');
  exec('node seed.js', (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Erreur seed:', error);
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>Seed Error</title></head>
        <body style="font-family: Arial; text-align: center; padding: 2rem;">
          <h1>❌ Erreur lors du seed</h1>
          <pre>${error.message}</pre>
          <a href="/">← Retour à l'accueil</a>
        </body>
        </html>
      `);
    }
    
    console.log('✅ Seed terminé:', stdout);
    res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>Seed Réussi</title></head>
      <body style="font-family: Arial; text-align: center; padding: 2rem;">
        <h1>✅ Seed Réussi !</h1>
        <p>Les produits ont été chargés dans la base de données.</p>
        <pre style="background: #f5f5f5; padding: 1rem; text-align: left; max-width: 600px; margin: 1rem auto;">${stdout}</pre>
        <div>
          <a href="/" class="btn" style="background: #3498db; color: white; padding: 1rem 2rem; text-decoration: none; border-radius: 5px; margin: 0.5rem;">🏠 Accueil</a>
          <a href="/api/products" class="btn" style="background: #27ae60; color: white; padding: 1rem 2rem; text-decoration: none; border-radius: 5px; margin: 0.5rem;">📦 Voir Produits</a>
        </div>
      </body>
      </html>
    `);
  });
});

// Gestion d'erreurs centralisée
app.use((req, res) => {
  res.status(404).send(`
    <!DOCTYPE html>
    <html>
    <head><title>Page Non Trouvée</title></head>
    <body style="font-family: Arial; text-align: center; padding: 4rem;">
      <h1>😕 Page Non Trouvée</h1>
      <p>La page que vous recherchez n'existe pas.</p>
      <a href="/" style="background: #3498db; color: white; padding: 1rem 2rem; text-decoration: none; border-radius: 5px;">🏠 Retour à l'accueil</a>
    </body>
    </html>
  `);
});

app.use((err, req, res, next) => {
  console.error('Erreur serveur:', err);
  res.status(500).send(`
    <!DOCTYPE html>
    <html>
    <head><title>Erreur Serveur</title></head>
    <body style="font-family: Arial; text-align: center; padding: 4rem;">
      <h1>⚠️ Erreur Serveur</h1>
      <p>Une erreur technique est survenue.</p>
      <a href="/" style="background: #3498db; color: white; padding: 1rem 2rem; text-decoration: none; border-radius: 5px;">🏠 Retour à l'accueil</a>
    </body>
    </html>
  `);
});

function generateBotResponse(message) {
  const lowerMessage = message.toLowerCase();
  
  const responses = {
    fr: {
      greetings: "👋 Bonjour ! Je suis votre assistant EDS. Comment puis-je vous aider aujourd'hui ? Souhaitez-vous passer une commande ou avez-vous des questions sur nos produits ?",
      delivery: "🚚 Nous offrons une livraison express sous 2-3 jours ouvrables ! EDS s'engage à vous livrer rapidement partout dans le pays. Livraison gratuite à partir de 50$ !",
      payment: "💳 EDS accepte PayPal, NatCash et MonCash pour votre commodité. Tous nos paiements sont sécurisés et cryptés !",
      order: "🛍️ Excellent choix ! Pour commander, ajoutez simplement les produits à votre panier et suivez le processus de checkout. Besoin d'aide avec un produit spécifique ?",
      products: "🌟 EDS propose une large gamme de vêtements, montres, chaussures et bijoux de qualité. Utilisez les filtres pour trouver exactement ce qu'il vous faut !",
      company: "🏪 EDS est votre boutique de confiance pour la mode et les accessoires. Nous nous engageons à vous offrir les meilleurs produits aux prix les plus compétitifs !",
      default: "🤔 Je suis ici pour vous parler des merveilleux produits EDS ! Avez-vous des questions sur nos collections, la livraison ou le paiement ? Ou peut-être souhaitez-vous découvrir nos nouvelles arrivées ?"
    }
  };

  const langResponses = responses.fr;

  if (lowerMessage.includes('bonjour') || lowerMessage.includes('salut') || lowerMessage.includes('hello') || lowerMessage.includes('hola')) {
    return langResponses.greetings;
  }
  if (lowerMessage.includes('livraison') || lowerMessage.includes('delivery') || lowerMessage.includes('entrega') || lowerMessage.includes('délai')) {
    return langResponses.delivery;
  }
  if (lowerMessage.includes('paiement') || lowerMessage.includes('payment') || lowerMessage.includes('pago') || lowerMessage.includes('payer')) {
    return langResponses.payment;
  }
  if (lowerMessage.includes('commande') || lowerMessage.includes('order') || lowerMessage.includes('pedido') || lowerMessage.includes('acheter')) {
    return langResponses.order;
  }
  if (lowerMessage.includes('produit') || lowerMessage.includes('product') || lowerMessage.includes('producto') || lowerMessage.includes('article')) {
    return langResponses.products;
  }
  if (lowerMessage.includes('eds') || lowerMessage.includes('entreprise') || lowerMessage.includes('company') || lowerMessage.includes('empresa')) {
    return langResponses.company;
  }

  return langResponses.default;
}

// Vérification simple des produits au démarrage
db.get("SELECT COUNT(*) as count FROM products", (err, result) => {
  if (err) {
    console.error('❌ Erreur vérification produits:', err);
  } else {
    console.log(`📊 ${result.count} produits dans la base de données`);
    
    // Auto-seed si pas de produits
    if (result.count === 0) {
      console.log('🔄 Aucun produit trouvé. Utilisez /seed pour charger les produits.');
    }
  }
});

app.listen(PORT, () => {
  console.log(`🚀 EDS Server v2.0 running on port ${PORT}`);
  console.log(`📱 Site: http://localhost:${PORT}`);
  console.log(`⚙️ Admin: http://localhost:${PORT}/admin`);
  console.log(`🌱 Seed: http://localhost:${PORT}/seed`);
  console.log(`✅ Base de données: ${dbPath}`);
  console.log(`🎉 Votre site est PRÊT !`);
});
