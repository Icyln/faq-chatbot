const chatbox = document.getElementById("chatbox");
const input = document.getElementById("userInput");
const button = document.getElementById("sendBtn");
const chatContainer = document.getElementById("chatContainer");
const chatToggle = document.getElementById("chatToggle");
const openChatLink = document.getElementById("openChatLink");
const closeChatBtn = document.getElementById("closeChatBtn");

// Generate or retrieve session ID for context tracking
let sessionId = localStorage.getItem('chatSessionId');
if (!sessionId) {
    sessionId = 'session_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('chatSessionId', sessionId);
}

// Enable/disable send button
input.addEventListener("input", () => {
    button.disabled = input.value.trim().length === 0;
});
button.disabled = true;

// Open and maximize chat
function openChat() {
    if (chatContainer.style.display === "flex") return;
    chatContainer.style.display = "flex";
    chatContainer.style.maxHeight = "90vh";
    chatContainer.style.height = "90vh";
    chatContainer.style.width = "400px";
    chatContainer.style.flexDirection = "column";
    
    // Add welcome message if it's the first time opening
    if (!chatContainer.dataset.welcomeShown) {
        addMessage("Hi! 👋 I'm your AI Style Assistant. I can help with product recommendations, order status, returns, and more. How can I assist you today?", "bot");
        chatContainer.dataset.welcomeShown = "true";
    }
}

// Close chat
function closeChat() {
    chatContainer.style.display = "none";
}

chatToggle.addEventListener("click", openChat);
openChatLink.addEventListener("click", (e) => {
    e.preventDefault();
    openChat();
});
closeChatBtn.addEventListener("click", closeChat);

// Handle sending message
async function sendMessage() {
    const userMsg = input.value.trim();
    if (!userMsg) return;
    
    addMessage(userMsg, "user");
    input.value = "";
    button.disabled = true;
    
    // Auto-respond to thank you messages
    const thankYouRegex = /\b(thank you|thanks|thx|thank u|ty)\b/i;
    if (thankYouRegex.test(userMsg)) {
        setTimeout(() => {
            addMessage("You're very welcome! 😊 Let me know if you need anything else.", "bot");
        }, 500);
        return;
    }
    
    // Show typing indicator
    showTypingIndicator();
    
    try {
        const res = await fetch("http://localhost:3000/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                question: userMsg,
                sessionId: sessionId 
            }),
        });
        
        const data = await res.json();
        hideTypingIndicator();
        
        // Add a small delay before showing the response for more natural feel
        setTimeout(() => {
            addMessage(data.answer, "bot");
            
            // Show product recommendations if the response includes them
            if (data.recommendations && data.recommendations.length > 0) {
                showProductRecommendations(data.recommendations);
            }
            
            // Show quick actions if available
            if (data.quickActions && data.quickActions.length > 0) {
                showQuickActions(data.quickActions);
            }
        }, 300);
    } catch (err) {
        hideTypingIndicator();
        addMessage("Oops, something went wrong. Please try again.", "bot");
    }
}

// Add message to chat with timestamp
function addMessage(text, sender) {
    const msgDiv = document.createElement("div");
    msgDiv.classList.add("message", sender === "user" ? "user-msg" : "bot-msg");
    
    const msgContent = document.createElement("div");
    msgContent.classList.add("message-content");
    msgContent.textContent = text;
    
    const timestamp = document.createElement("div");
    timestamp.classList.add("message-timestamp");
    timestamp.textContent = getCurrentTime();
    
    msgDiv.appendChild(msgContent);
    msgDiv.appendChild(timestamp);
    chatbox.appendChild(msgDiv);
    chatbox.scrollTop = chatbox.scrollHeight;
}

// Get current time in HH:MM format
function getCurrentTime() {
    const now = new Date();
    return now.getHours().toString().padStart(2, '0') + ':' + 
           now.getMinutes().toString().padStart(2, '0');
}

// Show typing indicator
function showTypingIndicator() {
    const typingDiv = document.createElement("div");
    typingDiv.id = "typing-indicator";
    typingDiv.classList.add("message", "bot-msg", "typing-indicator");
    
    const typingContent = document.createElement("div");
    typingContent.classList.add("message-content");
    
    const typingDots = document.createElement("div");
    typingDots.classList.add("typing-dots");
    
    for (let i = 0; i < 3; i++) {
        const dot = document.createElement("span");
        dot.classList.add("dot");
        typingDots.appendChild(dot);
    }
    
    typingContent.appendChild(typingDots);
    typingDiv.appendChild(typingContent);
    chatbox.appendChild(typingDiv);
    chatbox.scrollTop = chatbox.scrollHeight;
}

// Hide typing indicator
function hideTypingIndicator() {
    const typingIndicator = document.getElementById("typing-indicator");
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// Show product recommendations
function showProductRecommendations(products) {
    const container = document.createElement("div");
    container.classList.add("products-container");
    
    const title = document.createElement("div");
    title.classList.add("products-title");
    title.textContent = "Here are some products you might like:";
    container.appendChild(title);
    
    const productsGrid = document.createElement("div");
    productsGrid.classList.add("products-grid");
    
    products.forEach(product => {
        const productCard = document.createElement("div");
        productCard.classList.add("product-card");
        
        const productImage = document.createElement("img");
        productImage.src = product.image;
        productImage.alt = product.name;
        productCard.appendChild(productImage);
        
        const productName = document.createElement("div");
        productName.classList.add("product-name");
        productName.textContent = product.name;
        productCard.appendChild(productName);
        
        const productPrice = document.createElement("div");
        productPrice.classList.add("product-price");
        productPrice.textContent = `$${product.price}`;
        productCard.appendChild(productPrice);
        
        const viewBtn = document.createElement("button");
        viewBtn.classList.add("view-product-btn");
        viewBtn.textContent = "View Product";
        viewBtn.addEventListener("click", () => {
            window.open(product.url, '_blank');
        });
        productCard.appendChild(viewBtn);
        
        productsGrid.appendChild(productCard);
    });
    
    container.appendChild(productsGrid);
    chatbox.appendChild(container);
    chatbox.scrollTop = chatbox.scrollHeight;
}

// Show quick actions
function showQuickActions(actions) {
    const container = document.createElement("div");
    container.classList.add("quick-actions-container");
    
    const title = document.createElement("div");
    title.classList.add("quick-actions-title");
    title.textContent = "What would you like to do next?";
    container.appendChild(title);
    
    const actionsContainer = document.createElement("div");
    actionsContainer.classList.add("quick-actions-buttons");
    
    actions.forEach(action => {
        const btn = document.createElement("button");
        btn.classList.add("quick-action-btn");
        btn.textContent = action.text;
        btn.addEventListener("click", () => {
            input.value = action.text;
            sendMessage();
        });
        actionsContainer.appendChild(btn);
    });
    
    container.appendChild(actionsContainer);
    chatbox.appendChild(container);
    chatbox.scrollTop = chatbox.scrollHeight;
}

// Event listeners
button.onclick = sendMessage;
input.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
});