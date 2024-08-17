let cartCount = 0;
let cartTotal = 0;
let productQuantities = {
    '火星高麗菜': 0,
    '火星青江菜': 0,
    '火星木瓜': 0,
    '火星番茄': 0
};
let cartItems = {};

function changeQuantity(product, change) {
    productQuantities[product] += change;
    if (productQuantities[product] < 0) {
        productQuantities[product] = 0;
    }
    document.getElementById(`${product}-quantity`).innerText = productQuantities[product];
}

function addToCart(product, price) {
    let quantity = productQuantities[product];
    if (quantity > 0) {
        cartCount += quantity;
        cartTotal += price * quantity;
        document.getElementById('cart-count').innerText = cartCount;
        
        if (cartItems[product]) {
            cartItems[product].quantity += quantity;
        } else {
            cartItems[product] = {
                price: price,
                quantity: quantity
            };
        }
        
        updateCartSidebar();
        showNotification(`已將 ${quantity} 個 ${product} 加入購物車！`);
        productQuantities[product] = 0;
        document.getElementById(`${product}-quantity`).innerText = 0;
    } else {
        showNotification('請先選擇商品數量！');
    }
}

function updateCartSidebar() {
    let cartItemsElement = document.getElementById('cart-items');
    cartItemsElement.innerHTML = '';
    
    for (let product in cartItems) {
        let item = cartItems[product];
        let itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        itemElement.innerHTML = `
            <img src="${product}.jpg" alt="${product}">
            <div class="cart-item-info">
                <div class="cart-item-name">${product}</div>
                <div class="cart-item-price">Star ${item.price} x ${item.quantity}</div>
            </div>
            <div class="quantity-control">
                <button onclick="changeCartQuantity('${product}', -1)">-</button>
                <span class="quantity-display">${item.quantity}</span>
                <button onclick="changeCartQuantity('${product}', 1)">+</button>
            </div>
        `;
        cartItemsElement.appendChild(itemElement);
    }
    
    document.getElementById('cart-total').innerText = `Star ${cartTotal}`;
}

function changeCartQuantity(product, change) {
    cartItems[product].quantity += change;
    cartCount += change;
    cartTotal += change * cartItems[product].price;
    
    if (cartItems[product].quantity <= 0) {
        delete cartItems[product];
    }
    
    updateCartSidebar();
    document.getElementById('cart-count').innerText = cartCount;
}

function toggleCart() {
    document.getElementById('cart-sidebar').classList.toggle('open');
}

function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.style.display = 'block';
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

// 修改後的客戶評價功能
let currentReviewIndex = 0;
const reviews = document.querySelectorAll('.review');
const reviewsCarousel = document.querySelector('.reviews-carousel');

function updateReviews() {
    reviewsCarousel.style.transform = `translateX(-${currentReviewIndex * 100}%)`;
    
    reviews.forEach((review, index) => {
        if (index === currentReviewIndex) {
            review.classList.add('active');
        } else {
            review.classList.remove('active');
        }
    });
}

function changeReview(direction) {
    currentReviewIndex += direction;
    if (currentReviewIndex < 0) {
        currentReviewIndex = reviews.length - 1;
    } else if (currentReviewIndex >= reviews.length) {
        currentReviewIndex = 0;
    }
    updateReviews();
}

// 初始化評價顯示
updateReviews();

// 自動輪播
setInterval(() => {
    changeReview(1);
}, 5000);