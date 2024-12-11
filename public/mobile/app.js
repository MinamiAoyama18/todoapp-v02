// Import Firebase modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js';
import { getFirestore, collection, addDoc, query, where, orderBy, onSnapshot, getDocs, deleteDoc, doc, updateDoc } from 'https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js';

// Import translations
import { translations } from './translations.js';

// Declare global variables
let allTodos = [];

// Status colors definition
const statusColors = {
    'not started': { bg: 'hsl(40, 100%, 95%)', text: '#333333' },  // Light orange
    'in progress': { bg: 'hsl(210, 100%, 95%)', text: '#333333' }, // Light blue
    'complete': { bg: 'hsl(120, 40%, 90%)', text: '#1B5E20' },     // Light green
    'aborted': { bg: 'hsl(350, 100%, 95%)', text: '#880E4F' }      // Light pink
};

// Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyBOZ7XL-tnVms2kvakMV7le6oIt2oFOgvY",
    authDomain: "todoapp-v02.firebaseapp.com",
    projectId: "todoapp-v02",
    storageBucket: "todoapp-v02.firebasestorage.app",
    messagingSenderId: "302722089562",
    appId: "1:302722089562:web:d25f697ed4b9cf32ddce63",
    measurementId: "G-YGNG059CJT"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();

// DOM Elements
const loginSection = document.getElementById('loginSection');
const todoSection = document.getElementById('todoSection');
const loginForm = document.getElementById('loginForm');
const todoForm = document.getElementById('todoForm');
const todoList = document.getElementById('todoList');
const userEmailSpan = document.getElementById('userEmail');
const logoutButton = document.getElementById('logoutButton');
const switchToSignup = document.getElementById('switchToSignup');
const signupSection = document.getElementById('signupSection');
const signupForm = document.getElementById('signupForm');
const switchToLogin = document.getElementById('switchToLogin');
const categoryFilter = document.getElementById('categoryFilter');
const progressFilter = document.getElementById('progressFilter');
const categorySelect = document.getElementById('category');

// Add language handling
let currentLang = 'en';

function updateLanguage(lang) {
    currentLang = lang;
    
    // Update text content
    document.querySelectorAll('[data-translate]').forEach(element => {
        const key = element.getAttribute('data-translate');
        element.textContent = translations[lang][key];
    });
    
    // Update placeholders
    document.querySelectorAll('[data-translate-placeholder]').forEach(element => {
        const key = element.getAttribute('data-translate-placeholder');
        element.placeholder = translations[lang][key];
        if (element.hasAttribute('data-placeholder')) {
            element.setAttribute('data-placeholder', translations[lang][key]);
        }
    });
    
    // Update select options
    document.querySelectorAll('select').forEach(select => {
        select.querySelectorAll('option[data-translate]').forEach(option => {
            const key = option.getAttribute('data-translate');
            option.textContent = translations[lang][key];
        });
    });
    
    // Update flag active states
    document.querySelectorAll('.flag-icon').forEach(flag => {
        flag.classList.toggle('active', flag.id.startsWith(lang));
    });

    // Update dynamic content
    if (categorySelect) {
        const defaultOption = categorySelect.querySelector('option[value=""]');
        if (defaultOption) defaultOption.textContent = translations[lang].selectCategory;
        const addNewOption = categorySelect.querySelector('option[value="add-new"]');
        if (addNewOption) addNewOption.textContent = translations[lang].addNewCategory;
    }

    // Update item counts in filters
    document.querySelectorAll('.filter-group select').forEach(select => {
        const count = select.selectedOptions.length;
        const label = select.previousElementSibling;
        const key = label.getAttribute('data-translate');
        label.textContent = `${translations[lang][key]} (${count} ${translations[lang].selectedItems})`;
    });

    // Update deadline label
    document.querySelectorAll('[data-translate-label]').forEach(element => {
        const key = element.getAttribute('data-translate-label');
        if (element.type === 'date') {
            element.addEventListener('change', function() {
                if (this.value) {
                    this.setAttribute('data-content', 
                        `${translations[currentLang][key]}: ${this.value}`);
                }
            });
        }
    });

    // Try to set calendar language if browser supports it
    document.querySelectorAll('input[type="date"]').forEach(input => {
        input.setAttribute('lang', lang);
    });
}

// Add language switch event listeners
document.getElementById('en-flag').addEventListener('click', () => updateLanguage('en'));
document.getElementById('zh-flag').addEventListener('click', () => updateLanguage('zh'));

// Initial language update
document.addEventListener('DOMContentLoaded', () => {
    updateLanguage(currentLang);
});

// Authentication logic
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    try {
        await signInWithEmailAndPassword(auth, email, password);
        console.log('Login successful');
    } catch (error) {
        console.error('Login error:', error);
        alert(error.message);
    }
});

// Auth state observer
auth.onAuthStateChanged((user) => {
    console.log('Auth state changed:', user ? 'logged in' : 'logged out');
    if (user) {
        loginSection.style.display = 'none';
        signupSection.style.display = 'none';
        todoSection.style.display = 'block';
        userEmailSpan.textContent = user.email;
        loadTodos();
        loadCategories();
    } else {
        // Clear any existing data
        todoList.innerHTML = '';
        allTodos = [];
        // Reset forms
        loginForm.reset();
        todoForm.reset();
        // Show login section
        loginSection.style.display = 'block';
        signupSection.style.display = 'none';
        todoSection.style.display = 'none';
    }
});

// Load and display todos
function loadTodos() {
    console.log('Loading todos...');
    const todosQuery = query(
        collection(db, 'todos'),
        where('userId', '==', auth.currentUser.uid),
        orderBy('timestamp', 'desc')
    );

    onSnapshot(todosQuery, (snapshot) => {
        allTodos = snapshot.docs.map(doc => ({
            ...doc.data(),
            docId: doc.id
        }));
        updateCategoryFilter();
        filterAndDisplayTodos();
    });
}

// Filter functions
function updateCategoryFilter() {
    const categories = new Set();
    allTodos.forEach(todo => categories.add(todo.category));
    
    categoryFilter.innerHTML = Array.from(categories)
        .map(category => `<option value="${category}" selected>${category}</option>`)
        .join('');
}

function filterAndDisplayTodos() {
    const selectedCategories = Array.from(categoryFilter.selectedOptions).map(opt => opt.value);
    const selectedProgress = Array.from(progressFilter.selectedOptions).map(opt => opt.value);
    
    const filteredTodos = allTodos.filter(todo => 
        selectedCategories.includes(todo.category) &&
        selectedProgress.includes(todo.status)
    );
    
    displayTodos(filteredTodos);
}

// Add this helper function for deadline calculation
function getDeadlineText(deadlineDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    
    const deadline = new Date(deadlineDate);
    deadline.setHours(0, 0, 0, 0);
    
    const diffTime = deadline - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        return `${translations[currentLang].by} ${deadlineDate} (${translations[currentLang].lastDay})`;
    } else if (diffDays > 0) {
        return `${translations[currentLang].by} ${deadlineDate} (${diffDays} ${translations[currentLang].daysLeft})`;
    } else {
        return `${translations[currentLang].by} ${deadlineDate} (${Math.abs(diffDays)} ${translations[currentLang].daysOverdue})`;
    }
}

// Update the displayTodos function
function displayTodos(todos) {
    todoList.innerHTML = '';
    
    // Format today's date in local time
    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).split('/').reverse().join('-'); // Convert to YYYY-MM-DD

    todoList.setAttribute('data-header', `${translations[currentLang].todoItemsAsOf} ${formattedDate}`);

    todos.forEach(todo => {
        const div = document.createElement('div');
        div.className = 'todo-item';
        const colorScheme = statusColors[todo.status];
        div.style.backgroundColor = colorScheme.bg;
        div.style.color = colorScheme.text;
        
        const deadlineText = getDeadlineText(todo.deadline);
        
        div.innerHTML = `
            <div class="todo-line-1">
                <span class="description ${['complete', 'aborted'].includes(todo.status) ? 'completed' : ''}">${todo.description}</span>
                <select class="status-select-item">
                    <option value="not started" ${todo.status === 'not started' ? 'selected' : ''} data-translate="notStarted">Not Started</option>
                    <option value="in progress" ${todo.status === 'in progress' ? 'selected' : ''} data-translate="inProgress">In Progress</option>
                    <option value="complete" ${todo.status === 'complete' ? 'selected' : ''} data-translate="complete">Complete</option>
                    <option value="aborted" ${todo.status === 'aborted' ? 'selected' : ''} data-translate="aborted">Aborted</option>
                </select>
            </div>
            <div class="todo-line-2">
                <span class="category-label">${todo.category}</span>
                <span class="deadline-label">${deadlineText}</span>
                <button class="delete-btn" data-id="${todo.docId}" data-translate="delete">Delete</button>
            </div>
        `;

        // Add darker background for category
        const categoryLabel = div.querySelector('.category-label');
        categoryLabel.style.backgroundColor = darkenHSLColor(colorScheme.bg, 5);
        categoryLabel.style.padding = '3px 12px';
        categoryLabel.style.borderRadius = '4px';
        categoryLabel.style.display = 'inline-block';
        categoryLabel.style.textAlign = 'center';

        // Add status change handler
        const statusSelect = div.querySelector('.status-select-item');
        statusSelect.addEventListener('change', async () => {
            try {
                const newStatus = statusSelect.value;
                const docRef = doc(db, 'todos', todo.docId);
                await updateDoc(docRef, { status: newStatus });
            } catch (error) {
                console.error('Error updating status:', error);
                statusSelect.value = todo.status;
            }
        });

        // Add delete handler
        const deleteBtn = div.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', async () => {
            try {
                if (confirm('Are you sure you want to delete this todo?')) {
                    const docRef = doc(db, 'todos', todo.docId);
                    await deleteDoc(docRef);
                }
            } catch (error) {
                console.error('Error deleting todo:', error);
            }
        });

        todoList.appendChild(div);
    });

    // Update translations for the newly added elements
    updateLanguage(currentLang);
}

// Add the helper function for darkening colors
function darkenHSLColor(hslColor, amount) {
    const match = hslColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (!match) return hslColor;
    
    const h = parseInt(match[1]);
    const s = parseInt(match[2]);
    const l = Math.max(0, parseInt(match[3]) - amount); // Reduce lightness by amount
    
    return `hsl(${h}, ${s}%, ${l}%)`;
}

// Event listeners for filters
categoryFilter.addEventListener('change', filterAndDisplayTodos);
progressFilter.addEventListener('change', filterAndDisplayTodos);

// Rest of your existing code...

function setupTodoItemListeners(div, todo) {
    // Status change handler
    const statusSelect = div.querySelector('.status-select-item');
    statusSelect.addEventListener('change', async () => {
        try {
            const newStatus = statusSelect.value;
            const docRef = doc(db, 'todos', todo.docId);
            await updateDoc(docRef, { status: newStatus });
        } catch (error) {
            console.error('Error updating status:', error);
            statusSelect.value = todo.status;
        }
    });

    // Delete handler
    const deleteBtn = div.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', async () => {
        try {
            if (confirm('Are you sure you want to delete this todo?')) {
                const docRef = doc(db, 'todos', todo.docId);
                await deleteDoc(docRef);
            }
        } catch (error) {
            console.error('Error deleting todo:', error);
        }
    });
}

// Todo form submission
todoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const description = document.getElementById('description').value;
    const category = document.getElementById('category').value;
    const status = document.getElementById('status').value;
    const deadline = document.getElementById('deadline').value;

    try {
        await addDoc(collection(db, 'todos'), {
            userId: auth.currentUser.uid,
            description,
            category,
            status,
            deadline,
            timestamp: new Date()
        });
        todoForm.reset();
    } catch (error) {
        console.error('Error adding todo:', error);
        alert(error.message);
    }
});

// Logout handler
logoutButton.addEventListener('click', async () => {
    try {
        // Clear any existing data first
        todoList.innerHTML = '';
        allTodos = [];
        // Sign out
        await signOut(auth);
        console.log('Logged out successfully');
        // Force UI update
        loginSection.style.display = 'block';
        signupSection.style.display = 'none';
        todoSection.style.display = 'none';
        // Reload the page to ensure clean state
        window.location.reload();
    } catch (error) {
        console.error('Logout error:', error);
        alert('Error logging out: ' + error.message);
    }
});

// Update the switch between login and signup handlers
switchToSignup.addEventListener('click', () => {
    console.log('Switching to signup');
    loginSection.style.display = 'none';
    signupSection.style.display = 'block';
});

switchToLogin.addEventListener('click', () => {
    console.log('Switching to login');
    loginSection.style.display = 'block';
    signupSection.style.display = 'none';
});

// Add signup form handler
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;

    try {
        await createUserWithEmailAndPassword(auth, email, password);
        console.log('Signup successful');
        // Auth state observer will handle the redirect to todo section
    } catch (error) {
        console.error('Signup error:', error);
        alert(error.message);
    }
});

// Update the loadCategories function
async function loadCategories() {
    console.log('Loading categories...');
    
    try {
        // First, set the default options
        categorySelect.innerHTML = `
            <option value="">Select Category</option>
            <option value="add-new">+ Add New Category</option>
        `;

        // Then get existing categories
        const todosRef = collection(db, 'todos');
        const q = query(todosRef, where('userId', '==', auth.currentUser.uid));
        const querySnapshot = await getDocs(q);
        
        // Create a Set of unique categories
        const categories = new Set();
        
        querySnapshot.forEach((doc) => {
            const category = doc.data().category;
            if (category) categories.add(category);
        });

        // Add existing categories before the "Add New Category" option
        const addNewOption = categorySelect.querySelector('option[value="add-new"]');
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categorySelect.insertBefore(option, addNewOption);
        });

    } catch (error) {
        console.error('Error loading categories:', error);
        // Ensure default options are available even if there's an error
        categorySelect.innerHTML = `
            <option value="">Select Category</option>
            <option value="add-new">+ Add New Category</option>
        `;
    }
}

// Add category change handler
categorySelect.addEventListener('change', async function(e) {
    if (e.target.value === 'add-new') {
        const newCategory = prompt('Enter new category name:');
        if (newCategory) {
            try {
                // Add the new category to the select element
                const option = document.createElement('option');
                option.value = newCategory;
                option.textContent = newCategory;
                
                // Insert before the "Add New Category" option
                const addNewOption = categorySelect.querySelector('option[value="add-new"]');
                categorySelect.insertBefore(option, addNewOption);
                
                // Select the new category
                categorySelect.value = newCategory;
            } catch (error) {
                console.error('Error adding category:', error);
                alert('Error adding category: ' + error.message);
                categorySelect.value = '';
            }
        } else {
            categorySelect.value = '';
        }
    }
});
 
