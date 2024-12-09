// Import your Firebase configuration
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js';
import { getFirestore, collection, addDoc, query, where, orderBy, onSnapshot, getDocs, deleteDoc, doc, updateDoc } from 'https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js';

// Update the status colors with softer, distinct colors
const statusColors = {
    'not started': { bg: 'hsl(40, 100%, 95%)', text: '#333333' },  // Light orange
    'in progress': { bg: 'hsl(210, 100%, 95%)', text: '#333333' }, // Light blue
    'complete': { bg: 'hsl(120, 40%, 90%)', text: '#1B5E20' },     // Light green
    'aborted': { bg: 'hsl(350, 100%, 95%)', text: '#880E4F' }      // Light pink
};

// Copy your Firebase configuration from the desktop version

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

// Authentication logic
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        alert(error.message);
    }
});

// Todo handling logic
todoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const description = document.getElementById('description').value;
    const category = document.getElementById('category').value;
    const status = document.getElementById('status').value;
    const deadline = document.getElementById('deadline').value;

    const todoData = {
        userId: auth.currentUser.uid,
        description,
        category,
        status,
        deadline,
        timestamp: new Date()
    };
    
    console.log('Adding todo with data:', todoData);

    try {
        const docRef = await addDoc(collection(db, 'todos'), todoData);
        console.log('Todo added with ID:', docRef.id);
        todoForm.reset();
    } catch (error) {
        console.error('Error adding todo:', error);
        console.error('Error details:', error.code, error.message);
        alert(error.message);
    }
});

// Auth state observer
auth.onAuthStateChanged((user) => {
    if (user) {
        loginSection.style.display = 'none';
        signupSection.style.display = 'none';
        todoSection.style.display = 'block';
        userEmailSpan.textContent = user.email;
        loadTodos();
        loadCategories();
    } else {
        loginSection.style.display = 'block';
        signupSection.style.display = 'none';
        todoSection.style.display = 'none';
    }
});

// Load todos
function loadTodos() {
    console.log('Loading todos...');
    const todosQuery = query(
        collection(db, 'todos'),
        where('userId', '==', auth.currentUser.uid),
        orderBy('timestamp', 'desc')
    );

    onSnapshot(todosQuery, (snapshot) => {
        console.log('Received todos snapshot, size:', snapshot.size);
        todoList.innerHTML = '';
        
        // Format today's date correctly as YYYY-MM-DD
        const today = new Date();
        const formattedDate = today.toISOString().split('T')[0];
        
        todoList.setAttribute('data-header', `Todo Items as of ${formattedDate}`);

        snapshot.forEach((docSnapshot) => {
            const todo = docSnapshot.data();
            const div = document.createElement('div');
            div.className = 'todo-item';
            
            // Get color scheme based on status
            const colorScheme = statusColors[todo.status];
            div.style.backgroundColor = colorScheme.bg;
            div.style.color = colorScheme.text;
            
            // Calculate deadline text
            const deadlineText = getDeadlineText(todo.deadline);
            
            div.innerHTML = `
                <div class="todo-line-1">
                    <span class="description ${['complete', 'aborted'].includes(todo.status) ? 'completed' : ''}">${todo.description}</span>
                    <select class="status-select-item">
                        <option value="not started" ${todo.status === 'not started' ? 'selected' : ''}>Not Started</option>
                        <option value="in progress" ${todo.status === 'in progress' ? 'selected' : ''}>In Progress</option>
                        <option value="complete" ${todo.status === 'complete' ? 'selected' : ''}>Complete</option>
                        <option value="aborted" ${todo.status === 'aborted' ? 'selected' : ''}>Aborted</option>
                    </select>
                </div>
                <div class="todo-line-2">
                    <span class="category-label">${todo.category}</span>
                    <span class="deadline-label">${deadlineText}</span>
                    <button class="delete-btn" data-id="${docSnapshot.id}">Delete</button>
                </div>
            `;

            // Update the category label styling
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
                    const docRef = doc(db, 'todos', docSnapshot.id);
                    
                    await updateDoc(docRef, {
                        status: newStatus
                    });

                    // Update the description style
                    const description = div.querySelector('.description');
                    description.classList.toggle('completed', ['complete', 'aborted'].includes(newStatus));
                    
                    // Update the color scheme
                    const colorScheme = statusColors[newStatus];
                    div.style.backgroundColor = colorScheme.bg;
                    div.style.color = colorScheme.text;
                    
                    // Update delete button style
                    const deleteBtn = div.querySelector('.delete-btn');
                    deleteBtn.style.color = colorScheme.text;
                    deleteBtn.style.border = `1px solid ${colorScheme.text}`;
                } catch (error) {
                    console.error('Error updating status:', error);
                    alert('Error updating status. Please try again.');
                    statusSelect.value = todo.status;
                }
            });

            // Add delete functionality
            const deleteBtn = div.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', async () => {
                try {
                    if (confirm('Are you sure you want to delete this todo?')) {
                        const docRef = doc(db, 'todos', docSnapshot.id);
                        await deleteDoc(docRef);
                        console.log('Todo deleted successfully');
                    }
                } catch (error) {
                    console.error('Error deleting todo:', error);
                    alert('Error deleting todo. Please try again.');
                }
            });

            todoList.appendChild(div);
        });
    }, (error) => {
        console.error('Error in snapshot listener:', error);
    });
}

// Switch between login and signup
switchToSignup.addEventListener('click', () => {
    loginSection.style.display = 'none';
    signupSection.style.display = 'block';
});

// Add switch back to login handler
switchToLogin.addEventListener('click', () => {
    signupSection.style.display = 'none';
    loginSection.style.display = 'block';
});

// Add signup form handler
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;

    try {
        await createUserWithEmailAndPassword(auth, email, password);
        // Auth state observer will handle the redirect to todo section
    } catch (error) {
        alert(error.message);
    }
});

// Logout
logoutButton.addEventListener('click', () => {
    signOut(auth);
});

// Add mobile-specific functionality
document.addEventListener('DOMContentLoaded', function() {
    // Add touch event handlers where needed
    document.querySelectorAll('.todo-item').forEach(item => {
        item.addEventListener('touchstart', handleTouchStart);
        item.addEventListener('touchend', handleTouchEnd);
    });
});

// Add mobile-specific touch handlers
let touchStartY = 0;
let touchEndY = 0;

function handleTouchStart(event) {
    touchStartY = event.touches[0].clientY;
}

function handleTouchEnd(event) {
    touchEndY = event.changedTouches[0].clientY;
    handleSwipe();
}

function handleSwipe() {
    const swipeDistance = touchStartY - touchEndY;
    if (Math.abs(swipeDistance) > 50) {
        // Add swipe-to-delete functionality
    }
}

// Add this after initializing Firebase
const categorySelect = document.getElementById('category');

// Add this function to load categories
async function loadCategories() {
    console.log('Loading categories...');
    
    try {
        // Get all todos to extract categories
        const todosRef = collection(db, 'todos');
        const q = query(todosRef, where('userId', '==', auth.currentUser.uid));
        const querySnapshot = await getDocs(q);
        
        // Create a Set of unique categories
        const categories = new Set();
        
        querySnapshot.forEach((doc) => {
            const category = doc.data().category;
            if (category) categories.add(category);
        });

        // Update the select element with just the default option first
        categorySelect.innerHTML = `
            <option value="">Select Category</option>
        `;
        
        // Add existing categories
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categorySelect.appendChild(option);
        });

        // Add the "Add New Category" option at the end
        const newOption = document.createElement('option');
        newOption.value = "add-new";
        newOption.textContent = "+ Add New Category";
        categorySelect.appendChild(newOption);

    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Update the category handling
categorySelect.addEventListener('change', async function(e) {
    if (e.target.value === 'add-new') {
        const modal = document.getElementById('categoryModal');
        const input = document.getElementById('newCategoryInput');
        const confirmBtn = document.getElementById('confirmCategory');
        const cancelBtn = document.getElementById('cancelCategory');
        
        modal.style.display = 'flex';
        input.value = '';
        input.focus();

        const handleCategory = async (confirmed) => {
            modal.style.display = 'none';
            if (confirmed && input.value.trim()) {
                const newCategory = input.value.trim();
                try {
                    await addDoc(collection(db, 'categories'), {
                        userId: auth.currentUser.uid,
                        name: newCategory,
                        timestamp: new Date()
                    });

                    const option = document.createElement('option');
                    option.value = newCategory;
                    option.textContent = newCategory;
                    
                    const addNewOption = categorySelect.querySelector('option[value="add-new"]');
                    categorySelect.insertBefore(option, addNewOption);
                    categorySelect.value = newCategory;
                } catch (error) {
                    console.error('Error adding category:', error);
                    alert('Error adding category: ' + error.message);
                    categorySelect.value = '';
                }
            } else {
                categorySelect.value = '';
            }
        };

        confirmBtn.onclick = () => handleCategory(true);
        cancelBtn.onclick = () => handleCategory(false);
    }
});

// Update the darkenHSLColor function
function darkenHSLColor(hslColor, amount) {
    const match = hslColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
    if (!match) return hslColor;
    
    const h = parseInt(match[1]);
    const s = parseInt(match[2]);
    const l = Math.max(0, parseInt(match[3]) - amount); // Reduce lightness by amount
    
    return `hsl(${h}, ${s}%, ${l}%)`;
}

// Add this helper function for date calculations
function getDeadlineText(deadlineDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    
    const deadline = new Date(deadlineDate);
    deadline.setHours(0, 0, 0, 0);
    
    const diffTime = deadline - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        return `By ${deadlineDate} (Last Day)`;
    } else if (diffDays > 0) {
        return `By ${deadlineDate} (${diffDays} days)`;
    } else {
        return `By ${deadlineDate} (${Math.abs(diffDays)} days overdue)`;
    }
}

// Modify the displayTodos function
function displayTodos() {
    const todoList = document.getElementById('todoList');
    if (!todoList) return;

    // Format today's date as YYYY-MM-DD
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    
    // Set the header with correct date format
    todoList.setAttribute('data-header', `Todo Items as of ${formattedDate}`);
    
    todoList.innerHTML = '';
    
    allTodos.forEach(todo => {
        const div = document.createElement('div');
        div.className = 'todo-item';
        
        const deadlineText = getDeadlineText(todo.deadline);
        
        div.innerHTML = `
            <div class="todo-line-1">
                <div class="description ${todo.status === 'complete' ? 'completed' : ''}">
                    ${todo.description}
                </div>
                <select class="status-select-item" data-docid="${todo.docId}">
                    <option value="not started" ${todo.status === 'not started' ? 'selected' : ''}>Not Started</option>
                    <option value="in progress" ${todo.status === 'in progress' ? 'selected' : ''}>In Progress</option>
                    <option value="complete" ${todo.status === 'complete' ? 'selected' : ''}>Complete</option>
                    <option value="aborted" ${todo.status === 'aborted' ? 'selected' : ''}>Aborted</option>
                </select>
            </div>
            <div class="todo-line-2">
                <span class="category-label">
                    <span class="category-value">${todo.category}</span>
                </span>
                <span class="deadline-label">
                    <span class="deadline-value">${deadlineText}</span>
                </span>
                <button class="delete-btn" onclick="deleteTodo('${todo.docId}')">Delete</button>
            </div>
        `;
        
        todoList.appendChild(div);
        
        // Add event listener for status change
        const statusSelect = div.querySelector('.status-select-item');
        statusSelect.addEventListener('change', (e) => updateTodoStatus(todo.docId, e.target.value));
    });
}

// Add these variables at the top with other declarations
let activeFilters = {
    categories: new Set(),
    progress: new Set(['not started', 'in progress', 'complete', 'aborted'])
};

// Add this function to update category filters
function updateCategoryFilters() {
    const categoryFilter = document.getElementById('categoryFilter');
    const categories = new Set();
    
    // Collect all unique categories from todos
    allTodos.forEach(todo => categories.add(todo.category));
    
    // Update the filter checkboxes
    categoryFilter.innerHTML = Array.from(categories).map(category => `
        <label>
            <input type="checkbox" value="${category}" checked>
            ${category}
        </label>
    `).join('');
    
    // Initialize activeFilters.categories with all categories
    activeFilters.categories = new Set(categories);
    
    // Add event listeners to checkboxes
    categoryFilter.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                activeFilters.categories.add(checkbox.value);
            } else {
                activeFilters.categories.delete(checkbox.value);
            }
            filterAndDisplayTodos();
        });
    });
}

// Add event listeners for progress filters
document.getElementById('progressFilter').querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
            activeFilters.progress.add(checkbox.value);
        } else {
            activeFilters.progress.delete(checkbox.value);
        }
        filterAndDisplayTodos();
    });
});

// Add this function to filter todos
function filterAndDisplayTodos() {
    const filteredTodos = allTodos.filter(todo => 
        activeFilters.categories.has(todo.category) &&
        activeFilters.progress.has(todo.status)
    );
    
    displayTodos(filteredTodos);
}

// Modify the loadTodos function to use filtering
function loadTodos() {
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
        
        updateCategoryFilters();
        filterAndDisplayTodos();
    });
}

// Update the displayTodos function to accept filtered todos
function displayTodos(todos = allTodos) {
    // ... rest of your existing displayTodos code ...
    // Just use 'todos' instead of 'allTodos' when displaying
}
 
