/**
 * CampusLoop - Data Layer & Storage Services
 * Hybrid architecture:
 * 1. Works with local server (Node.js) to share live data across Normal & Incognito windows!
 * 2. Works offline with browser LocalStorage when opened via file://.
 */

const APP_CATEGORIES = [
  { id: "all", name: "All Categories", icon: "grid" },
  { id: "books", name: "Textbooks & Notes", icon: "book-open" },
  { id: "electronics", name: "Laptops & Gadgets", icon: "laptop" },
  { id: "furniture", name: "Dorm Furniture", icon: "armchair" },
  { id: "stationery", name: "Stationery & Tools", icon: "pencil-ruler" },
  { id: "lab-equipment", name: "Lab Coats & Kits", icon: "flask-conical" },
  { id: "others", name: "Other Essentials", icon: "tag" }
];

const STORAGE_KEYS = {
  CURRENT_USER: 'campusloop_user_v2',
  USERS: 'campusloop_users_v2',
  PRODUCTS: 'campusloop_products_v2',
  REQUESTS: 'campusloop_requests_v2'
};

const StorageService = {
  isServerMode: typeof window !== 'undefined' && window.location && window.location.protocol.startsWith('http'),

  // Initial Sync with shared server (if running on http://localhost:3000)
  async syncFromServer() {
    if (!this.isServerMode) return;
    try {
      const res = await fetch('/api/db');
      if (res.ok) {
        const db = await res.json();
        if (Array.isArray(db.products)) {
          localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(db.products));
        }
        if (Array.isArray(db.users)) {
          localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(db.users));
        }
        if (Array.isArray(db.requests)) {
          localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(db.requests));
        }
      }
    } catch (err) {
      console.log('Running in local storage fallback mode.');
    }
  },

  // --- USERS & AUTH ---
  getCurrentUser() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Error reading current user:', e);
      return null;
    }
  },

  setCurrentUser(user) {
    try {
      if (!user) {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      } else {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      }
    } catch (e) {
      console.error('Error saving current user:', e);
    }
  },

  getAllUsers() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USERS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error reading users:', e);
      return [];
    }
  },

  registerUser(userData) {
    try {
      const users = this.getAllUsers();
      const existingIndex = users.findIndex(u => u.email.toLowerCase() === userData.email.toLowerCase());
      
      const user = {
        id: userData.id || `user_${Date.now()}`,
        name: userData.name,
        email: userData.email,
        phone: userData.phone || '',
        college: userData.college || 'Campus University',
        course: userData.course || 'Undergraduate',
        year: userData.year || '1st Year',
        location: userData.location || 'Campus / Hostel',
        bio: userData.bio || 'CampusLoop student member.',
        avatar: userData.avatar || StorageService.generateAvatar(userData.name),
        joinedDate: userData.joinedDate || new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        verifiedStudent: true
      };

      if (existingIndex >= 0) {
        users[existingIndex] = { ...users[existingIndex], ...user };
      } else {
        users.push(user);
      }

      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
      this.setCurrentUser(user);

      // Async sync to server
      if (this.isServerMode) {
        fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(user)
        }).catch(err => console.error('Server sync error:', err));
      }

      return user;
    } catch (e) {
      console.error('Error registering user:', e);
      return userData;
    }
  },

  updateCurrentUser(updatedFields) {
    try {
      const currentUser = this.getCurrentUser();
      if (!currentUser) return null;

      const updatedUser = { ...currentUser, ...updatedFields };
      this.setCurrentUser(updatedUser);

      // Also update in users list
      const users = this.getAllUsers();
      const idx = users.findIndex(u => u.id === updatedUser.id || u.email.toLowerCase() === updatedUser.email.toLowerCase());
      if (idx >= 0) {
        users[idx] = updatedUser;
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
      }

      if (this.isServerMode) {
        fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedUser)
        }).catch(err => console.error('Server sync error:', err));
      }

      return updatedUser;
    } catch (e) {
      console.error('Error updating user:', e);
      return null;
    }
  },

  logout() {
    this.setCurrentUser(null);
  },

  // --- PRODUCTS ---
  getProducts() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error reading products:', e);
      return [];
    }
  },

  addProduct(productData) {
    try {
      const products = this.getProducts();
      const newProduct = {
        id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        title: productData.title,
        category: productData.category || 'others',
        type: productData.type || 'sell',
        price: productData.type === 'exchange' || productData.type === 'free' ? 0 : Number(productData.price) || 0,
        exchangeFor: productData.exchangeFor || '',
        condition: productData.condition || 'Good',
        description: productData.description || '',
        location: productData.location || 'Campus Meetup Spot',
        contactPhone: productData.contactPhone || '',
        image: productData.image || '',
        seller: {
          id: productData.seller.id,
          name: productData.seller.name,
          course: productData.seller.course,
          college: productData.seller.college,
          avatar: productData.seller.avatar,
          phone: productData.seller.phone || productData.contactPhone || ''
        },
        status: 'Active',
        createdAt: new Date().toISOString(),
        views: 0
      };

      products.unshift(newProduct);
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));

      // Sync to shared server
      if (this.isServerMode) {
        fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newProduct)
        }).catch(err => console.error('Server sync error:', err));
      }

      return newProduct;
    } catch (e) {
      console.error('Error adding product:', e);
      throw e;
    }
  },

  updateProduct(id, updatedFields) {
    try {
      const products = this.getProducts();
      const idx = products.findIndex(p => p.id === id);
      if (idx >= 0) {
        products[idx] = { ...products[idx], ...updatedFields };
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));

        if (this.isServerMode) {
          fetch(`/api/products/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedFields)
          }).catch(err => console.error('Server sync error:', err));
        }

        return products[idx];
      }
      return null;
    } catch (e) {
      console.error('Error updating product:', e);
      return null;
    }
  },

  deleteProduct(id) {
    try {
      let products = this.getProducts();
      products = products.filter(p => p.id !== id);
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));

      if (this.isServerMode) {
        fetch(`/api/products/${id}`, {
          method: 'DELETE'
        }).catch(err => console.error('Server sync error:', err));
      }

      return true;
    } catch (e) {
      console.error('Error deleting product:', e);
      return false;
    }
  },

  // --- REQUESTS & OFFERS ---
  getRequests() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.REQUESTS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Error reading requests:', e);
      return [];
    }
  },

  addRequest(requestData) {
    try {
      const requests = this.getRequests();
      const newReq = {
        id: `req_${Date.now()}`,
        productId: requestData.productId,
        productTitle: requestData.productTitle,
        productPrice: requestData.productPrice,
        productType: requestData.productType,
        productImage: requestData.productImage,
        sellerId: requestData.sellerId,
        sellerName: requestData.sellerName,
        buyerId: requestData.buyerId,
        buyerName: requestData.buyerName,
        buyerAvatar: requestData.buyerAvatar,
        buyerPhone: requestData.buyerPhone,
        offerPrice: requestData.offerPrice || 0,
        exchangeOffer: requestData.exchangeOffer || '',
        message: requestData.message || 'Hi, I am interested in this item!',
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      requests.unshift(newReq);
      localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(requests));

      if (this.isServerMode) {
        fetch('/api/requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newReq)
        }).catch(err => console.error('Server sync error:', err));
      }

      return newReq;
    } catch (e) {
      console.error('Error adding request:', e);
      throw e;
    }
  },

  updateRequestStatus(id, status) {
    try {
      const requests = this.getRequests();
      const req = requests.find(r => r.id === id);
      if (req) {
        req.status = status;
        localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(requests));

        if (this.isServerMode) {
          fetch(`/api/requests/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
          }).catch(err => console.error('Server sync error:', err));
        }

        return req;
      }
      return null;
    } catch (e) {
      console.error('Error updating request:', e);
      return null;
    }
  },

  generateAvatar(name = 'Student') {
    const safeName = encodeURIComponent(name.trim() || 'Student');
    return `https://ui-avatars.com/api/?name=${safeName}&background=2563eb&color=fff&bold=true&rounded=true&size=128`;
  }
};

function compressImageFile(file, maxWidth = 800, maxHeight = 800, quality = 0.75) {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error('No file selected'));
    }

    if (!file.type.startsWith('image/')) {
      return reject(new Error('Selected file must be an image'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image content'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.src = readerEvent.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// Global window / globalThis bindings
if (typeof window !== 'undefined') {
  window.StorageService = StorageService;
  window.APP_CATEGORIES = APP_CATEGORIES;
  window.compressImageFile = compressImageFile;
}
if (typeof globalThis !== 'undefined') {
  globalThis.StorageService = StorageService;
  globalThis.APP_CATEGORIES = APP_CATEGORIES;
  globalThis.compressImageFile = compressImageFile;
}
