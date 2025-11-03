const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// ✅ CORRECTION : Même chemin que server.js
const dbPath = process.env.NODE_ENV === 'production' 
  ? '/tmp/eds.db' 
  : './data/eds.db';

console.log('🌱 Début du seed sur:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Erreur connexion DB pour seed:', err.message);
    process.exit(1);
  }
  console.log('✅ Connecté à la DB pour seed');
});

// Images de fallback locales
const localImages = [
    '/images/products/fashion-1.jpg',
    '/images/products/fashion-2.jpg', 
    '/images/products/fashion-3.jpg',
    '/images/products/watch-1.jpg',
    '/images/products/shoes-1.jpg',
    '/images/products/jewelry-1.jpg'
];

const products = [];

const categories = ['homme', 'femme', 'enfant'];
const types = {
    homme: ['T-Shirt', 'Chemise', 'Jean', 'Veste', 'Short', 'Costume', 'Chaussures', 'Montre', 'Bijoux'],
    femme: ['Robe', 'Jupe', 'Top', 'Chemisier', 'Sac', 'Chaussures', 'Montre', 'Bijoux', 'Accessoires'],
    enfant: ['T-Shirt', 'Robe', 'Short', 'Chaussures', 'Jouets', 'Accessoires']
};

// ✅ CORRECTION : UN SEUL objet descriptions
const descriptions = [
    "Produit de haute qualité avec un design exceptionnel et des matériaux durables.",
    "Confort et style réunis dans ce magnifique produit parfait pour toutes les occasions.",
    "Matériaux premium pour une durabilité optimale et un confort exceptionnel.",
    "Tendance actuelle avec un excellent rapport qualité-prix, idéal au quotidien.",
    "Design élégant et moderne, parfait pour les événements spéciaux et le quotidien."
];

// Vider la table avant de remplir
db.run("DELETE FROM products", (err) => {
  if (err) {
    console.error('❌ Erreur vidage table:', err);
    db.close();
    return;
  }
  
  console.log("✅ Table products vidée");

  const stmt = db.prepare("INSERT INTO products (name, description, price, category, quantity, images) VALUES (?, ?, ?, ?, ?, ?)");
  let inserted = 0;
  const totalProducts = 50; // Réduit pour tester

  for (let i = 1; i <= totalProducts; i++) {
      const category = categories[Math.floor(Math.random() * categories.length)];
      const type = types[category][Math.floor(Math.random() * types[category].length)];
      
      // Images mélangées (externes + locales en fallback)
      const imageSet = [
          `https://picsum.photos/400/400?random=${i}1`,
          `https://picsum.photos/400/400?random=${i}2`, 
          localImages[Math.floor(Math.random() * localImages.length)]
      ];

      const product = {
          name: `${type} EDS ${i}`,
          description: descriptions[Math.floor(Math.random() * descriptions.length)],
          price: (Math.random() * 200 + 10).toFixed(2),
          category: category,
          quantity: Math.floor(Math.random() * 100),
          images: JSON.stringify(imageSet)
      };

      stmt.run([
          product.name,
          product.description, 
          product.price,
          product.category,
          product.quantity,
          product.images
      ], (err) => {
          if (err) {
              console.error("❌ Erreur insertion produit:", err);
          } else {
              inserted++;
              if (inserted % 10 === 0) {
                  console.log(`📦 ${inserted}/${totalProducts} produits insérés...`);
              }
          }
      });
  }

  stmt.finalize((err) => {
      if (err) {
          console.error("❌ Erreur finalisation:", err);
      } else {
          console.log(`🎉 ${inserted} produits générés avec succès !`);
          
          // Vérification finale
          db.get("SELECT COUNT(*) as total FROM products", (err, result) => {
              if (err) {
                  console.error('❌ Erreur vérification finale:', err);
              } else {
                  console.log(`✅ ${result.total} produits confirmés dans la base de données`);
              }
              db.close();
          });
      }
  });
});
