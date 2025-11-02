// scripts/seed.js
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const categories = ['vêtements','montres','chaussures','sandales','bijoux'];
const genders = ['homme','femme','enfant'];
const imagesFor = (i)=>[
 `https://source.unsplash.com/collection/190727/800x600?sig=${i}`,
 `https://source.unsplash.com/collection/190727/800x600?sig=${i+200}`,
 `https://source.unsplash.com/collection/190727/800x600?sig=${i+400}`
];

const products = Array.from({length:200}).map((_,i)=>({
  id: uuidv4(),
  name: `Produit ${i+1} - Titre attractif`,
  slug: `produit-${i+1}`,
  price: (Math.round((5 + Math.random()*195)*100))/100,
  currency: 'USD',
  stock: Math.floor(Math.random()*50)+1,
  images: imagesFor(i),
  description: `Description courte du produit ${i+1}.`,
  category: categories[i % categories.length],
  gender: genders[i % genders.length],
  tags: ['nouveauté','populaire'].slice(0, 1 + (i%2)),
  share_token: uuidv4().slice(0,8)
}));

fs.writeFileSync('data/products.json', JSON.stringify(products, null, 2));
console.log('200 produits générés dans data/products.json');
