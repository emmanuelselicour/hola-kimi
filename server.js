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

// Routes principales avec gestion d'erreurs
app.get('/', (req, res, next) => {
  const today = new Date().toISOString().split('T')[0];
  
  db.get("SELECT * FROM visitors WHERE date = ?", [today], (err, row) => {
    if (err) return next(err);
    
    if (row) {
      db.run("UPDATE visitors SET count = count + 1 WHERE date = ?", [today]);
    } else {
      db.run("INSERT INTO visitors (date, count) VALUES (?, 1)", [today]);
    }
  });

  const page = parseInt(req.query.page) || 1;
  const limit = 20;
  const offset = (page - 1) * limit;

  db.all("SELECT * FROM products ORDER BY RANDOM() LIMIT ? OFFSET ?", [limit, offset], (err, products) => {
    if (err) return next(err);
    
    db.get("SELECT COUNT(*) as total FROM products", (err, countResult) => {
      if (err) return next(err);
      
      const totalPages = Math.ceil(countResult.total / limit);
      
      res.render('index', {
        products: products || [],
        currentPage: page,
        totalPages: totalPages,
        language: res.locals.language
      });
    });
  });
});

app.get('/product/:id', (req, res, next) => {
  const productId = parseInt(req.params.id);
  
  if (isNaN(productId)) {
    return res.status(400).render('404', { language: res.locals.language });
  }

  db.get("SELECT * FROM products WHERE id = ?", [productId], (err, product) => {
    if (err) return next(err);
    if (!product) return res.status(404).render('404', { language: res.locals.language });
    
    db.all("SELECT * FROM products WHERE category = ? AND id != ? ORDER BY RANDOM() LIMIT 4", 
      [product.category, productId], (err, similarProducts) => {
        if (err) return next(err);
        
        res.render('product', {
          product: product,
          similarProducts: similarProducts || [],
          language: res.locals.language
        });
    });
  });
});

app.get('/cart', (req, res) => {
  res.render('cart', { language: res.locals.language });
});

app.get('/checkout', (req, res) => {
  res.render('checkout', { language: res.locals.language });
});

app.get('/order-success', (req, res) => {
  res.render('order-success', { 
    orderId: req.query.orderId,
    language: res.locals.language 
  });
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

// Admin Routes
app.get('/admin', (req, res, next) => {
  db.all("SELECT * FROM orders ORDER BY order_date DESC LIMIT 50", (err, orders) => {
    if (err) return next(err);
    
    db.all("SELECT * FROM chatbot_conversations ORDER BY timestamp DESC LIMIT 50", (err, conversations) => {
      if (err) return next(err);
      
      db.all("SELECT * FROM visitors ORDER BY date DESC LIMIT 30", (err, visitors) => {
        if (err) return next(err);
        
        res.render('admin', {
          orders: orders || [],
          conversations: conversations || [],
          visitors: visitors || []
        });
      });
    });
  });
});

// Auto-seed si pas de produits
app.get('/seed', (req, res) => {
  const { spawn } = require('child_process');
  const seedProcess = spawn('node', ['seed.js']);
  
  seedProcess.stdout.on('data', (data) => {
    console.log(`Seed: ${data}`);
  });
  
  seedProcess.stderr.on('data', (data) => {
    console.error(`Seed Error: ${data}`);
  });
  
  seedProcess.on('close', (code) => {
    res.send(`Seed process exited with code ${code}. <a href="/">Retour à l'accueil</a>`);
  });
});

// Gestion d'erreurs centralisée
app.use((req, res) => {
  res.status(404).render('404', { language: res.locals.language });
});

app.use((err, req, res, next) => {
  console.error('Erreur serveur:', err);
  res.status(500).render('500', { 
    error: process.env.NODE_ENV === 'development' ? err.message : 'Une erreur est survenue',
    language: res.locals.language
  });
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
    },
    en: {
      greetings: "👋 Hello! I'm your EDS assistant. How can I help you today? Would you like to place an order or do you have questions about our products?",
      delivery: "🚚 We offer express delivery within 2-3 business days! EDS is committed to delivering quickly throughout the country. Free shipping from $50!",
      payment: "💳 EDS accepts PayPal, NatCash and MonCash for your convenience. All our payments are secure and encrypted!",
      order: "🛍️ Excellent choice! To order, simply add products to your cart and follow the checkout process. Need help with a specific product?",
      products: "🌟 EDS offers a wide range of quality clothing, watches, shoes and jewelry. Use the filters to find exactly what you need!",
      company: "🏪 EDS is your trusted store for fashion and accessories. We are committed to offering you the best products at the most competitive prices!",
      default: "🤔 I'm here to tell you about the wonderful EDS products! Do you have questions about our collections, delivery or payment? Or maybe you'd like to discover our new arrivals?"
    },
    es: {
      greetings: "👋 ¡Hola! Soy tu asistente EDS. ¿Cómo puedo ayudarte hoy? ¿Quieres realizar un pedido o tienes preguntas sobre nuestros productos?",
      delivery: "🚚 ¡Ofrecemos entrega exprés en 2-3 días laborables! EDS se compromete a entregar rápidamente en todo el país. ¡Envío gratis desde $50!",
      payment: "💳 EDS acepta PayPal, NatCash y MonCash para tu comodidad. ¡Todos nuestros pagos son seguros y encriptados!",
      order: "🛍️ ¡Excelente elección! Para pedir, simplemente añade productos a tu carrito y sigue el proceso de checkout. ¿Necesitas ayuda con un producto específico?",
      products: "🌟 EDS ofrece una amplia gama de ropa, relojes, zapatos y joyas de calidad. ¡Usa los filtros para encontrar exactamente lo que necesitas!",
      company: "🏪 EDS es tu tienda de confianza para moda y accesorios. ¡Nos comprometemos a ofrecerte los mejores productos a los precios más competitivos!",
      default: "🤔 ¡Estoy aquí para hablarte de los maravillosos productos EDS! ¿Tienes preguntas sobre nuestras colecciones, entrega o pago? ¿O quizás te gustaría descubrir nuestras novedades?"
    }
  };

  const lang = res.locals.language;
  const langResponses = responses[lang] || responses.fr;

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

// Auto-initialisation des produits au démarrage
db.get("SELECT COUNT(*) as count FROM products", (err, result) => {
  if (err) {
    console.error('❌ Erreur vérification produits:', err);
    return;
  }
  
  if (result.count === 0) {
    console.log('🔄 Aucun produit trouvé. Lancement du seed automatique...');
    const { exec } = require('child_process');
    exec('node seed.js', (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Erreur seed automatique:', error);
        return;
      }
      console.log('✅ Seed automatique terminé:', stdout);
    });
  } else {
    console.log(`✅ ${result.count} produits chargés dans la base de données`);
  }
});

app.listen(PORT, () => {
  console.log(`🚀 EDS Server v2.0 running on port ${PORT}`);
  console.log(`📱 Site: http://localhost:${PORT}`);
  console.log(`⚙️ Admin: http://localhost:${PORT}/admin`);
  console.log(`🌱 Seed: http://localhost:${PORT}/seed`);
  console.log(`✅ Base de données: ${dbPath}`);
});
