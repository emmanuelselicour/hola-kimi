const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/eds.db');

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

const descriptions = {
    fr: [
        "Produit de haute qualité avec un design exceptionnel et des matériaux durables.",
        "Confort et style réunis dans ce magnifique produit parfait pour toutes les occasions.",
        "Matériaux premium pour une durabilité optimale et un confort exceptionnel.",
        "Tendance actuelle avec un excellent rapport qualité-prix, idéal au quotidien.",
        "Design élégant et moderne, parfait pour les événements spéciaux et le quotidien."
    ],
    en: [
        "High-quality product with exceptional design and durable materials.",
        "Comfort and style united in this beautiful product perfect for all occasions.",
        "Premium materials for optimal durability and exceptional comfort.", 
        "Current trend with excellent value for money, ideal for daily wear.",
        "Elegant and modern design, perfect for special events and everyday life."
    ],
    es: [
        "Producto de alta calidad con diseño excepcional y materiales duraderos.",
        "Confort y estilo unidos en este hermoso producto perfecto para todas las ocasiones.",
        "Materiales premium para una durabilidad óptima y confort excepcional.",
        "Tendencia actual con excelente relación calidad-precio, ideal para el día a día.",
        "Diseño elegante y moderno, perfecto para eventos especiales y la vida cotidiana."
    ]
};

// Vider la table avant de remplir
db.run("DELETE FROM products", () => {
    console.log("✅ Table products vidée");

    const stmt = db.prepare("INSERT INTO products (name, description, price, category, quantity, images) VALUES (?, ?, ?, ?, ?, ?)");

    for (let i = 1; i <= 200; i++) {
        const category = categories[Math.floor(Math.random() * categories.length)];
        const type = types[category][Math.floor(Math.random() * types[category].length)];
        const lang = 'fr'; // Base en français
        
        // Images mélangées (externes + locales en fallback)
        const imageSet = [
            `https://picsum.photos/400/400?random=${i}1`,
            `https://picsum.photos/400/400?random=${i}2`, 
            localImages[Math.floor(Math.random() * localImages.length)]
        ];

        const product = {
            name: `${type} EDS ${i}`,
            description: descriptions[lang][Math.floor(Math.random() * descriptions[lang].length)],
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
            if (err) console.error("Erreur insertion produit:", err);
        });
    }

    stmt.finalize((err) => {
        if (err) {
            console.error("Erreur finalisation:", err);
        } else {
            console.log(`✅ ${200} produits générés avec succès !`);
        }
        db.close();
    });
});
