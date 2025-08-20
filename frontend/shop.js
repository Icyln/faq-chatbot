document.addEventListener('DOMContentLoaded', function() {
    // Cart functionality
    const addToCartButtons = document.querySelectorAll('.add-to-cart');
    const cartCount = document.querySelector('.cart-count');
    let count = 0;

    addToCartButtons.forEach(button => {
        button.addEventListener('click', function() {
            count++;
            cartCount.textContent = count;
            
            // Visual feedback
            const originalText = this.textContent;
            this.textContent = 'Added!';
            this.style.backgroundColor = '#28a745';
            
            setTimeout(() => {
                this.textContent = originalText;
                this.style.backgroundColor = '';
            }, 2000);
        });
    });

    // Filter toggle for mobile
    const filterToggle = document.querySelector('.filter-toggle');
    const filterOptions = document.querySelector('.filter-options');
    
    if (filterToggle) {
        filterToggle.addEventListener('click', function() {
            filterOptions.classList.toggle('active');
        });
    }

    // Price range slider
    const priceSlider = document.querySelector('.slider');
    const priceDisplay = document.querySelector('.price-display');
    
    if (priceSlider && priceDisplay) {
        priceSlider.addEventListener('input', function() {
            const value = this.value;
            priceDisplay.textContent = `$0 - $${value}`;
        });
    }
});