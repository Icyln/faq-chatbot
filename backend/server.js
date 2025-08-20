const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./db');
const natural = require('natural'); // Natural language processing
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// Serve index.html at root URL
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Conversation context storage
const conversationContexts = {};

// Product data
const products = [
    {
        id: 1,
        name: "Summer Denim Jacket",
        price: 79.99,
        image: "https://content.roman.co.uk/images/extralarge/be18edd1-ef02-4ddc-b8de-1ee99fd2c5b6.jpg",
        url: "/shop.html#product1",
        category: "jackets",
        tags: ["denim", "summer", "casual"]
    },
    {
        id: 2,
        name: "Floral Maxi Dress",
        price: 89.99,
        image: "https://www.azura-rose.com/cdn/shop/files/IMG_6845_2048x.jpg?v=1715624353",
        url: "/shop.html#product2",
        category: "dresses",
        tags: ["floral", "summer", "formal"]
    },
    {
        id: 3,
        name: "Casual Canvas Sneakers",
        price: 59.99,
        image: "https://www.themodestman.com/wp-content/uploads/2018/10/White-sneakers-smart-casual-1-683x1024.jpg",
        url: "/shop.html#product3",
        category: "footwear",
        tags: ["casual", "sneakers", "comfortable"]
    },
    {
        id: 4,
        name: "Designer Sunglasses",
        price: 129.99,
        image: "https://images.unsplash.com/photo-1595341888016-a392ef81b7de?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
        url: "/shop.html#product4",
        category: "accessories",
        tags: ["sunglasses", "designer", "summer"]
    },
    {
        id: 5,
        name: "Luxury Leather Handbag",
        price: 189.99,
        image: "https://images.unsplash.com/photo-1611312449408-fcece27cdbb7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
        url: "/shop.html#product5",
        category: "accessories",
        tags: ["leather", "handbag", "luxury"]
    }
];

// Initialize or get conversation context
function getContext(sessionId) {
    if (!conversationContexts[sessionId]) {
        conversationContexts[sessionId] = {
            history: [],
            lastIntent: null,
            lastProducts: [],
            entities: {},
            followUpCount: 0
        };
    }
    return conversationContexts[sessionId];
}

// Natural language processing functions
function preprocessText(text) {
    return text.toLowerCase()
        .replace(/[^\w\s]/gi, '') // Remove punctuation
        .replace(/\s+/g, ' ') // Remove extra spaces
        .trim();
}

function extractEntities(text) {
    const entities = {};
    
    // Extract product categories
    const categories = ["jackets", "dresses", "footwear", "accessories", "shoes", "bags"];
    categories.forEach(category => {
        if (text.includes(category)) {
            entities.category = category;
        }
    });
    
    // Extract sizes
    const sizes = ["xs", "s", "m", "l", "xl", "xxl"];
    sizes.forEach(size => {
        if (text.includes(size)) {
            entities.size = size;
        }
    });
    
    // Extract colors
    const colors = ["black", "white", "red", "blue", "green", "yellow", "brown", "pink", "purple"];
    colors.forEach(color => {
        if (text.includes(color)) {
            entities.color = color;
        }
    });
    
    return entities;
}

// Intent recognition
function recognizeIntent(text, context) {
    const preprocessed = preprocessText(text);
    const tokens = preprocessed.split(' ');
    
    // Check for follow-up questions
    if (context.lastIntent && context.followUpCount < 2) {
        if (tokens.some(token => ['what', 'how', 'when', 'where', 'why', 'which'].includes(token))) {
            return context.lastIntent + '_followup';
        }
    }
    
    // Greeting
    if (/(hi|hello|hey|howdy|good morning|good afternoon|good evening)/.test(preprocessed)) {
        return 'greeting';
    }
    
    // Product inquiry
    if (/(show|find|looking for|recommend|suggest|want|need)/.test(preprocessed) && 
        (/(product|item|clothes|outfit|dress|jacket|shoes|bag)/.test(preprocessed) || 
         context.lastIntent === 'product_inquiry')) {
        return 'product_inquiry';
    }
    
    // Trending products
    if (/(trending|popular|what's hot|what's new|latest|new arrival)/.test(preprocessed)) {
        return 'trending_products';
    }
    
    // Sales and discounts
    if (/(sale|discount|promotion|deal|offer|coupon|cheap|affordable)/.test(preprocessed)) {
        return 'sales_discounts';
    }
    
    // Return policy
    if (/(return|exchange|refund|policy)/.test(preprocessed)) {
        return 'return_policy';
    }
    
    // Shipping information
    if (/(shipping|delivery|how long|when will i get|track|tracking)/.test(preprocessed)) {
        return 'shipping_info';
    }
    
    // Order status
    if (/(order|status|where is my order|track my order)/.test(preprocessed)) {
        return 'order_status';
    }
    
    // Store information
    if (/(store|location|hours|when are you open|address)/.test(preprocessed)) {
        return 'store_info';
    }
    
    // Payment methods
    if (/(payment|pay|how can i pay|credit card|paypal|afterpay)/.test(preprocessed)) {
        return 'payment_methods';
    }
    
    // Sizing information
    if (/(size|sizing|what size am i|fit|measurements)/.test(preprocessed)) {
        return 'sizing_info';
    }
    
    // Click and collect
    if (/(click and collect|pickup|collect in store|reserve)/.test(preprocessed)) {
        return 'click_collect';
    }
    
    // Thank you
    if (/(thank you|thanks|thx|thank u|ty)/.test(preprocessed)) {
        return 'thank_you';
    }
    
    // Goodbye
    if (/(bye|goodbye|see you|later|have a nice day)/.test(preprocessed)) {
        return 'goodbye';
    }
    
    // Default
    return 'unknown';
}

// Generate response based on intent
async function generateResponse(intent, text, context) {
    const entities = extractEntities(text);
    context.entities = {...context.entities, ...entities};
    context.lastIntent = intent;
    
    let response = {
        answer: "",
        recommendations: [],
        quickActions: []
    };
    
    switch (intent) {
        case 'greeting':
            response.answer = "Hello! 👋 I'm your AI Style Assistant. I can help you find products, check order status, answer questions about returns and shipping, and more. How can I assist you today?";
            response.quickActions = [
                { text: "Show me trending products" },
                { text: "What's your return policy?" },
                { text: "Do you have any sales?" }
            ];
            break;
            
        case 'product_inquiry':
            response = handleProductInquiry(context, entities);
            break;
            
        case 'trending_products':
            response.answer = "Our summer collection is really trending right now! Here are some of our most popular items:";
            response.recommendations = products.slice(0, 3);
            response.quickActions = [
                { text: "Show me more summer items" },
                { text: "Do you have any sales on these?" }
            ];
            break;
            
        case 'sales_discounts':
            response.answer = "Yes, we have several items on sale right now! Our summer collection is up to 30% off. Here are some of our best deals:";
            response.recommendations = [products[0], products[2], products[4]];
            response.quickActions = [
                { text: "How long does the sale last?" },
                { text: "Do you have student discounts?" }
            ];
            break;
            
        case 'return_policy':
            response.answer = "We offer a 30-day return policy for all unused items in their original packaging. Simply initiate a return through your account or contact our customer service team for assistance. Refunds are processed within 5-7 business days after we receive the returned item.";
            response.quickActions = [
                { text: "How do I initiate a return?" },
                { text: "Do you pay for return shipping?" }
            ];
            break;
            
        case 'shipping_info':
            response.answer = "We offer fast, free shipping on all orders over $50. Standard delivery takes 3-5 business days, while express delivery takes 1-2 business days. You can track your order in real-time through your account or the tracking link we email you.";
            response.quickActions = [
                { text: "Do you ship internationally?" },
                { text: "What's your express shipping cost?" }
            ];
            break;
            
        case 'order_status':
            response.answer = "To check your order status, you can log into your account and view your order history. You'll also receive email updates as your order is processed and shipped. If you need immediate assistance, please provide your order number and I can help you track it.";
            response.quickActions = [
                { text: "I forgot my order number" },
                { text: "How long until my order ships?" }
            ];
            break;
            
        case 'store_info':
            response.answer = "Our online store is open 24/7! Our physical store locations are open Monday-Friday from 9am to 6pm EST, and Saturday from 10am to 4pm EST. We're closed on Sundays. Our main store is located at 123 Fashion Avenue, New York, NY 10001.";
            response.quickActions = [
                { text: "Do you have other store locations?" },
                { text: "Is parking available?" }
            ];
            break;
            
        case 'payment_methods':
            response.answer = "We accept all major credit cards (Visa, Mastercard, American Express), PayPal, Apple Pay, Google Pay, and Afterpay for installment payments. All transactions are securely processed with bank-level encryption.";
            response.quickActions = [
                { text: "How does Afterpay work?" },
                { text: "Is my payment information secure?" }
            ];
            break;
            
        case 'sizing_info':
            response.answer = "We provide detailed sizing charts on each product page. If you're between sizes, we generally recommend sizing up for a more comfortable fit. If you have specific questions about a particular item, feel free to ask! We also offer free size exchanges if your first choice doesn't fit perfectly.";
            response.quickActions = [
                { text: "Do you have plus sizes?" },
                { text: "How do I measure myself?" }
            ];
            break;
            
        case 'click_collect':
            response.answer = "Yes, we offer Click & Collect at all our store locations! Simply select 'Click & Collect' at checkout, and we'll have your order ready for pickup within 2 hours during store hours. You'll receive an email notification when your order is ready.";
            response.quickActions = [
                { text: "How long do you hold my order?" },
                { text: "Can someone else pick up my order?" }
            ];
            break;
            
        case 'thank_you':
            response.answer = "You're very welcome! 😊 Is there anything else I can help you with today?";
            response.quickActions = [
                { text: "Show me new arrivals" },
                { text: "I'm done, thanks" }
            ];
            break;
            
        case 'goodbye':
            response.answer = "Thank you for chatting with us today! Have a wonderful day and feel free to come back anytime if you need assistance. 👋";
            break;
            
        case 'unknown':
        default:
            // Try to find a relevant FAQ
            try {
                const [rows] = await db.query(
                    'SELECT answer FROM faqs WHERE LOWER(question) LIKE LOWER(?)',
                    [`%${text}%`]
                );
                
                if (rows.length > 0) {
                    response.answer = rows[0].answer;
                } else {
                    response.answer = "I'm sorry, I don't have a specific answer to that question right now. Our customer service team would be happy to help you with this. You can reach them at support@jumpstart.com or call +1 800 555 1234. Is there anything else I can assist you with today?";
                    response.quickActions = [
                        { text: "What are your store hours?" },
                        { text: "Tell me about your return policy" }
                    ];
                }
            } catch (error) {
                console.error('Database query error:', error);
                response.answer = "I'm sorry, I'm having trouble accessing our FAQ database right now. Our customer service team would be happy to help you at support@jumpstart.com or +1 800 555 1234.";
            }
            break;
    }
    
    // Update context
    context.history.push({
        role: "user",
        content: text,
        timestamp: new Date()
    });
    
    context.history.push({
        role: "assistant",
        content: response.answer,
        timestamp: new Date()
    });
    
    if (intent !== context.lastIntent) {
        context.followUpCount = 0;
    } else {
        context.followUpCount++;
    }
    
    return response;
}

// Handle product inquiry
function handleProductInquiry(context, entities) {
    const response = {
        answer: "",
        recommendations: [],
        quickActions: []
    };
    
    // Filter products based on entities
    let filteredProducts = [...products];
    
    if (entities.category) {
        filteredProducts = filteredProducts.filter(p => 
            p.category === entities.category || p.tags.includes(entities.category)
        );
    }
    
    if (entities.color) {
        filteredProducts = filteredProducts.filter(p => 
            p.name.toLowerCase().includes(entities.color) || p.tags.includes(entities.color)
        );
    }
    
    // If no products match the filters, show trending products
    if (filteredProducts.length === 0) {
        response.answer = "I couldn't find products matching your specific criteria, but here are some of our popular items that you might like:";
        filteredProducts = products.slice(0, 3);
    } else {
        response.answer = "I found some products that match what you're looking for:";
    }
    
    response.recommendations = filteredProducts.slice(0, 3);
    context.lastProducts = filteredProducts.slice(0, 3);
    
    response.quickActions = [
        { text: "Show me more like this" },
        { text: "Do you have these in other colors?" }
    ];
    
    return response;
}

// Enhanced chatbot API endpoint
app.post('/api/chat', async (req, res) => {
    const { question, sessionId } = req.body;
    
    if (!question || !sessionId) {
        return res.status(400).json({ error: "Missing question or sessionId" });
    }
    
    try {
        // Get or create conversation context
        const context = getContext(sessionId);
        
        // Recognize intent
        const intent = recognizeIntent(question, context);
        
        // Generate response
        const response = await generateResponse(intent, question, context);
        
        res.json(response);
    } catch (error) {
        console.error('Chatbot error:', error);
        res.status(500).json({ 
            answer: "I'm sorry, I'm experiencing technical difficulties right now. Please try again later or contact our customer service team at support@jumpstart.com.",
            recommendations: [],
            quickActions: []
        });
    }
});

// Endpoint to get product recommendations
app.get('/api/recommendations', (req, res) => {
    const category = req.query.category || '';
    const sessionId = req.query.sessionId || '';
    
    let filteredProducts = products;
    
    if (category) {
        filteredProducts = products.filter(product => 
            product.category === category || product.tags.includes(category)
        );
    }
    
    // Get context if sessionId is provided
    if (sessionId && conversationContexts[sessionId]) {
        const context = conversationContexts[sessionId];
        
        // If user has viewed products before, recommend similar ones
        if (context.lastProducts && context.lastProducts.length > 0) {
            const lastCategories = context.lastProducts.map(p => p.category);
            const lastTags = context.lastProducts.flatMap(p => p.tags);
            
            filteredProducts = filteredProducts.filter(p => 
                lastCategories.includes(p.category) || 
                p.tags.some(tag => lastTags.includes(tag))
            );
        }
    }
    
    // Return up to 3 random products
    const shuffled = [...filteredProducts].sort(() => 0.5 - Math.random());
    res.json(shuffled.slice(0, 3));
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});