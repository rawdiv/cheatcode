/**
 * CheatCode - Main JavaScript
 */

document.addEventListener('DOMContentLoaded', () => {
    initMobileMenu();
    initProblemCards();
    initButtons();
});

/**
 * Initialize mobile menu toggle functionality
 */
function initMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.querySelector('.mobile-menu');
    
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }
}

/**
 * Initialize problem card click handlers
 */
function initProblemCards() {
    const problemCards = document.querySelectorAll('.problem-card');
    
    problemCards.forEach(card => {
        card.addEventListener('click', () => {
            const problem = card.getAttribute('data-problem');
            
            // Navigate to the problem page with the problem ID as a parameter
            window.location.href = `problem.html?problem=${problem}`;
        });
    });
}

/**
 * Initialize CTA button handlers
 */
function initButtons() {
    const demoBtn = document.getElementById('demo-btn');
    const registerBtn = document.getElementById('register-btn');
    
    if (demoBtn) {
        demoBtn.addEventListener('click', () => {
            // Navigate to the Two Sum problem as a demo
            window.location.href = 'problem.html?problem=two-sum';
        });
    }
    
    if (registerBtn) {
        registerBtn.addEventListener('click', () => {
            // Navigate to registration page
            window.location.href = 'register.html';
        });
    }
}

/**
 * Navigate to a problem page
 * @param {string} problemId - The ID of the problem to navigate to
 */
function navigateToProblem(problemId) {
    window.location.href = `problem.html?problem=${problemId}`;
}

/**
 * Toggle dark/light mode (for future implementation)
 */
function toggleDarkMode() {
    document.body.classList.toggle('light-mode');
    // Save preference to localStorage
    const isDarkMode = !document.body.classList.contains('light-mode');
    localStorage.setItem('darkMode', isDarkMode);
}

/**
 * Load user preferences from localStorage
 */
function loadUserPreferences() {
    const darkMode = localStorage.getItem('darkMode') === 'true';
    if (!darkMode) {
        document.body.classList.add('light-mode');
    }
}

/**
 * Format date for display
 * @param {Date|string} date - Date to format
 * @returns {string} - Formatted date string
 */
function formatDate(date) {
    const d = new Date(date);
    const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    return d.toLocaleDateString('en-US', options);
}

/**
 * Format time for display
 * @param {number} seconds - Time in seconds
 * @returns {string} - Formatted time string
 */
function formatTime(seconds) {
    if (seconds < 60) {
        return `${seconds} sec`;
    } else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes} min ${remainingSeconds > 0 ? remainingSeconds + ' sec' : ''}`;
    } else {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours} hr ${minutes > 0 ? minutes + ' min' : ''}`;
    }
}

/**
 * Format difficulty label
 * @param {string} difficulty - Difficulty level (easy, medium, hard)
 * @returns {string} - HTML for difficulty badge
 */
function formatDifficulty(difficulty) {
    const color = 
        difficulty === 'easy' ? 'bg-green-900 text-green-300' :
        difficulty === 'medium' ? 'bg-yellow-900 text-yellow-300' :
        'bg-red-900 text-red-300';
        
    return `<span class="px-2 py-1 ${color} rounded-full text-xs">${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}</span>`;
}

/**
 * Check if user is authenticated
 * @returns {Promise<boolean>} - True if user is authenticated
 */
async function isAuthenticated() {
    // This function will be replaced by Supabase authentication
    try {
        const userData = localStorage.getItem('userData');
        return !!userData;
    } catch (error) {
        return false;
    }
} 