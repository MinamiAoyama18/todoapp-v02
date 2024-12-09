// Import Firebase modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js';
import { getFirestore, collection, addDoc, query, where, orderBy, onSnapshot, getDocs, deleteDoc, doc, updateDoc } from 'https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js';

// Declare global variables
let allTodos = [];

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
    } else {
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

function displayTodos(todos) {
    todoList.innerHTML = '';
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    todoList.setAttribute('data-header', `Todo Items as of ${formattedDate}`);

    todos.forEach(todo => {
        const div = document.createElement('div');
        div.className = 'todo-item';
        const colorScheme = statusColors[todo.status];
        div.style.backgroundColor = colorScheme.bg;
        div.style.color = colorScheme.text;
        
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
                <span class="deadline-label">By ${todo.deadline}</span>
                <button class="delete-btn" data-id="${todo.docId}">Delete</button>
            </div>
        `;

        // Add event listeners
        setupTodoItemListeners(div, todo);
        todoList.appendChild(div);
    });
}

// Event listeners for filters
categoryFilter.addEventListener('change', filterAndDisplayTodos);
progressFilter.addEventListener('change', filterAndDisplayTodos);

// Rest of your existing code...
 
