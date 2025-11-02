// Gestion du thème
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('eds_theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const themeBtn = document.querySelector('.theme-toggle');
    if (themeBtn) {
        themeBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
}

// Charger le thème sauvegardé
document.addEventListener('DOMContentLoaded', function() {
    const savedTheme = localStorage.getItem('eds_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
    initChatbot();
    cart.updateCartCount();
});

// Gestion du panier - Version sécurisée
class Cart {
    constructor() {
        this.items = this.loadCart();
    }

    loadCart() {
        try {
            return JSON.parse(localStorage.getItem('eds_cart')) || [];
        } catch (e) {
            console.error('Erreur chargement panier:', e);
            return [];
        }
    }

    saveCart() {
        try {
            localStorage.setItem('eds_cart', JSON.stringify(this.items));
            this.updateCartCount();
        } catch (e) {
            console.error('Erreur sauvegarde panier:', e);
        }
    }

    addProduct(product, quantity = 1) {
        const existingItem = this.items.find(item => item.id === product.id);
        
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            this.items.push({
                id: product.id,
                name: product.name,
                price: parseFloat(product.price),
                image: Array.isArray(product.images) ? product.images[0] : JSON.parse(product.images)[0],
                quantity: quantity
            });
        }
        
        this.saveCart();
        this.showNotification('Produit ajouté au panier !');
    }

    removeProduct(productId) {
        this.items = this.items.filter(item => item.id !== productId);
        this.saveCart();
    }

    updateQuantity(productId, quantity) {
        const item = this.items.find(item => item.id === productId);
        if (item) {
            item.quantity = Math.max(0, parseInt(quantity));
            if (item.quantity <= 0) {
                this.removeProduct(productId);
            } else {
                this.saveCart();
            }
        }
    }

    clearCart() {
        this.items = [];
        this.saveCart();
    }

    getTotal() {
        return this.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    }

    updateCartCount() {
        const count = this.items.reduce((total, item) => total + item.quantity, 0);
        const cartCount = document.getElementById('cartCount');
        if (cartCount) {
            cartCount.textContent = count;
            cartCount.style.display = count > 0 ? 'inline' : 'none';
        }
    }

    showNotification(message) {
        // Supprimer les notifications existantes
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notif => notif.remove());

        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #27ae60;
            color: white;
            padding: 1rem 2rem;
            border-radius: 5px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease-out;
        `;
        
        // Ajouter l'animation CSS
        if (!document.querySelector('#notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideIn 0.3s ease-out reverse';
                setTimeout(() => notification.remove(), 300);
            }
        }, 3000);
    }
}

// Initialiser le panier
const cart = new Cart();

// Fonction sécurisée pour ajouter des produits
function addProductToCart(id, name, price, image) {
    const product = {
        id: parseInt(id),
        name: name,
        price: parseFloat(price),
        images: JSON.stringify([image])
    };
    cart.addProduct(product);
}

// Recherche avec debounce amélioré
let searchTimeout;
function handleSearch(input) {
    clearTimeout(searchTimeout);
    
    const searchTerm = input.value.trim();
    if (searchTerm.length < 2) {
        hideSuggestions();
        return;
    }

    searchTimeout = setTimeout(() => {
        fetch(`/api/products?search=${encodeURIComponent(searchTerm)}`)
            .then(response => {
                if (!response.ok) throw new Error('Erreur recherche');
                return response.json();
            })
            .then(data => {
                showSuggestions(data.products, input);
            })
            .catch(error => {
                console.error('Erreur recherche:', error);
                hideSuggestions();
            });
    }, 300);
}

function showSuggestions(products, input) {
    const suggestions = document.getElementById('searchSuggestions');
    if (!suggestions) return;

    suggestions.innerHTML = '';
    
    if (products.length === 0) {
        const noResults = document.createElement('div');
        noResults.textContent = 'Aucun produit trouvé';
        noResults.style.padding = '1rem';
        noResults.style.color = '#666';
        suggestions.appendChild(noResults);
    } else {
        products.slice(0, 5).forEach(product => {
            const div = document.createElement('div');
            div.className = 'suggestion-item';
            div.innerHTML = `
                <img src="${JSON.parse(product.images)[0]}" alt="${product.name}" 
                     onerror="this.src='/images/placeholder.jpg'"
                     style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;">
                <div style="flex: 1;">
                    <div style="font-weight: bold;">${product.name}</div>
                    <div style="color: #e74c3c; font-size: 0.9rem;">$${product.price}</div>
                </div>
            `;
            div.style.cssText = 'padding: 0.8rem; cursor: pointer; display: flex; align-items: center; gap: 0.8rem; border-bottom: 1px solid #f0f0f0;';
            div.onclick = () => {
                window.location.href = `/product/${product.id}`;
            };
            suggestions.appendChild(div);
        });
    }

    suggestions.classList.add('active');
}

function hideSuggestions() {
    const suggestions = document.getElementById('searchSuggestions');
    if (suggestions) {
        suggestions.classList.remove('active');
    }
}

// Chatbot corrigé
let chatbotOpen = false;

function toggleChatbot() {
    const chatbotWindow = document.getElementById('chatbotWindow');
    chatbotOpen = !chatbotOpen;
    
    if (chatbotWindow) {
        chatbotWindow.classList.toggle('active', chatbotOpen);
        if (chatbotOpen) {
            chatbotWindow.querySelector('.chat-messages').scrollTop = chatbotWindow.querySelector('.chat-messages').scrollHeight;
        }
    }
}

function initChatbot() {
    if (!localStorage.getItem('eds_chatbot_initialized')) {
        addBotMessage("👋 <strong>Assistant EDS:</strong> Bonjour ! Je suis votre assistant EDS. Comment puis-je vous aider aujourd'hui ?");
        localStorage.setItem('eds_chatbot_initialized', 'true');
    }
}

function addBotMessage(message) {
    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = 'bot-message';
    messageDiv.innerHTML = message;
    messageDiv.style.cssText = 'background: #f1f1f1; color: #333; padding: 0.8rem 1rem; border-radius: 15px; margin: 0.5rem 0; align-self: flex-start; max-width: 85%; word-wrap: break-word;';
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function addUserMessage(message) {
    const messagesContainer = document.getElementById('chatMessages');
    if (!messagesContainer) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = 'user-message';
    messageDiv.textContent = message;
    messageDiv.style.cssText = 'background: #3498db; color: white; padding: 0.8rem 1rem; border-radius: 15px; margin: 0.5rem 0; align-self: flex-end; max-width: 85%; word-wrap: break-word;';
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

async function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message) return;

    addUserMessage(message);
    input.value = '';

    try {
        const response = await fetch('/api/chatbot', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: message })
        });

        if (!response.ok) throw new Error('Erreur chatbot');
        
        const data = await response.json();
        addBotMessage(data.response);
    } catch (error) {
        console.error('Erreur chatbot:', error);
        addBotMessage("⚠️ Désolé, je rencontre des difficultés techniques. Veuillez réessayer.");
    }
}

// Validation de formulaire
function validatePhone(phone) {
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{8,}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
}

function validateForm(formData) {
    const errors = [];

    if (!formData.get('firstName')?.trim()) {
        errors.push('Le prénom est requis');
    }
    if (!formData.get('lastName')?.trim()) {
        errors.push('Le nom est requis');
    }
    if (!formData.get('phone')?.trim() || !validatePhone(formData.get('phone'))) {
        errors.push('Un numéro de téléphone valide est requis');
    }
    if (!formData.get('address')?.trim() || formData.get('address').trim().length < 10) {
        errors.push('Une adresse complète est requise (au moins 10 caractères)');
    }
    if (!formData.get('payment')) {
        errors.push('Veuillez sélectionner un mode de paiement');
    }

    return errors;
}

// Filtres et navigation
function filterProducts(category) {
    window.location.href = `/?category=${category}`;
}

function changeLanguage(lang) {
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('lang', lang);
    window.location.href = currentUrl.toString();
}

// Gestion des images fallback
document.addEventListener('DOMContentLoaded', function() {
    // Fallback pour les images cassées
    document.addEventListener('error', function(e) {
        if (e.target.tagName === 'IMG') {
            e.target.src = '/images/placeholder.jpg';
            e.target.onerror = null; // Éviter les boucles
        }
    }, true);
});
