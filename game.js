// Game state
const ROWS = 17;
const COLS = 10;
const GAME_DURATION = 120; // 2 minutes in seconds

let gameBoard = [];
let score = 0;
let timeRemaining = GAME_DURATION;
let gameActive = false;
let timerInterval = null;

// Drag selection state
let isSelecting = false;
let selectionStart = { x: 0, y: 0 };
let selectionEnd = { x: 0, y: 0 };
let selectedApples = [];

// DOM elements
const gameBoardEl = document.getElementById('gameBoard');
const selectionBoxEl = document.getElementById('selectionBox');
const scoreEl = document.getElementById('score');
const timerDisplayEl = document.getElementById('timerDisplay');
const timerBarEl = document.getElementById('timerBar');
const gameOverOverlayEl = document.getElementById('gameOverOverlay');
const finalScoreEl = document.getElementById('finalScore');
const restartBtnEl = document.getElementById('restartBtn');

// Initialize game
function initGame() {
    gameBoard = [];
    score = 0;
    timeRemaining = GAME_DURATION;
    gameActive = true;
    
    // Clear and regenerate board
    gameBoardEl.innerHTML = '';
    
    // Generate initial apples
    for (let row = 0; row < ROWS; row++) {
        gameBoard[row] = [];
        for (let col = 0; col < COLS; col++) {
            const value = Math.floor(Math.random() * 9) + 1;
            gameBoard[row][col] = value;
            createAppleElement(row, col, value);
        }
    }
    
    // Update UI
    updateScore();
    updateTimer();
    gameOverOverlayEl.classList.remove('active');
    
    // Start timer
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(updateGameTimer, 1000);
}

// Create apple DOM element
function createAppleElement(row, col, value) {
    const apple = document.createElement('div');
    apple.className = 'apple';
    apple.dataset.row = row;
    apple.dataset.col = col;
    apple.dataset.value = value;
    apple.textContent = value;
    apple.style.gridRow = row + 1;
    apple.style.gridColumn = col + 1;
    gameBoardEl.appendChild(apple);
}

// Mouse event handlers for drag selection
gameBoardEl.addEventListener('mousedown', (e) => {
    if (!gameActive) return;
    
    const rect = gameBoardEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    isSelecting = true;
    selectionStart = { x, y };
    selectionEnd = { x, y };
    
    selectionBoxEl.style.left = `${x}px`;
    selectionBoxEl.style.top = `${y}px`;
    selectionBoxEl.style.width = '0px';
    selectionBoxEl.style.height = '0px';
    selectionBoxEl.classList.add('active');
    selectionBoxEl.classList.remove('valid', 'invalid');
});

gameBoardEl.addEventListener('mousemove', (e) => {
    if (!isSelecting || !gameActive) return;
    
    const rect = gameBoardEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    selectionEnd = { x, y };
    updateSelectionBox();
    checkSelection();
});

document.addEventListener('mouseup', (e) => {
    if (!isSelecting || !gameActive) return;
    
    isSelecting = false;
    
    // Check if selection is valid and process
    if (selectionBoxEl.classList.contains('valid') && selectedApples.length > 0) {
        removeSelectedApples();
    }
    
    // Hide selection box
    selectionBoxEl.classList.remove('active', 'valid', 'invalid');
    selectedApples = [];
});

// Update selection box position and size
function updateSelectionBox() {
    const left = Math.min(selectionStart.x, selectionEnd.x);
    const top = Math.min(selectionStart.y, selectionEnd.y);
    const width = Math.abs(selectionEnd.x - selectionStart.x);
    const height = Math.abs(selectionEnd.y - selectionStart.y);
    
    selectionBoxEl.style.left = `${left}px`;
    selectionBoxEl.style.top = `${top}px`;
    selectionBoxEl.style.width = `${width}px`;
    selectionBoxEl.style.height = `${height}px`;
}

// Check which apples are in selection and if sum equals 10
function checkSelection() {
    const selectionRect = {
        left: Math.min(selectionStart.x, selectionEnd.x),
        top: Math.min(selectionStart.y, selectionEnd.y),
        right: Math.max(selectionStart.x, selectionEnd.x),
        bottom: Math.max(selectionStart.y, selectionEnd.y)
    };
    
    selectedApples = [];
    const apples = gameBoardEl.querySelectorAll('.apple');
    
    apples.forEach(apple => {
        const rect = apple.getBoundingClientRect();
        const boardRect = gameBoardEl.getBoundingClientRect();
        
        const appleRect = {
            left: rect.left - boardRect.left,
            top: rect.top - boardRect.top,
            right: rect.right - boardRect.left,
            bottom: rect.bottom - boardRect.top
        };
        
        // Check if apple intersects with selection
        if (!(appleRect.right < selectionRect.left ||
              appleRect.left > selectionRect.right ||
              appleRect.bottom < selectionRect.top ||
              appleRect.top > selectionRect.bottom)) {
            selectedApples.push(apple);
        }
    });
    
    // Calculate sum
    const sum = selectedApples.reduce((total, apple) => {
        return total + parseInt(apple.dataset.value);
    }, 0);
    
    // Update selection box appearance
    if (sum === 10 && selectedApples.length > 0) {
        selectionBoxEl.classList.remove('invalid');
        selectionBoxEl.classList.add('valid');
    } else {
        selectionBoxEl.classList.remove('valid');
        selectionBoxEl.classList.add('invalid');
    }
}

// Remove selected apples and update game state
function removeSelectedApples() {
    const applesCount = selectedApples.length;
    score += applesCount;
    updateScore();
    
    // Animate removal
    selectedApples.forEach(apple => {
        apple.classList.add('removing');
    });
    
    // After animation, remove from DOM and board
    setTimeout(() => {
        selectedApples.forEach(apple => {
            const row = parseInt(apple.dataset.row);
            const col = parseInt(apple.dataset.col);
            gameBoard[row][col] = null;
            apple.remove();
        });
        
        // Apply gravity and refill
        applyGravity();
    }, 400);
}

// Apply gravity to make apples fall down
function applyGravity() {
    // For each column, move apples down
    for (let col = 0; col < COLS; col++) {
        // Collect non-null values from bottom to top
        const columnValues = [];
        for (let row = ROWS - 1; row >= 0; row--) {
            if (gameBoard[row][col] !== null) {
                columnValues.push(gameBoard[row][col]);
            }
        }
        
        // Fill from bottom with existing values
        let valueIndex = 0;
        for (let row = ROWS - 1; row >= 0; row--) {
            if (valueIndex < columnValues.length) {
                gameBoard[row][col] = columnValues[valueIndex];
                valueIndex++;
            } else {
                // Generate new apples for empty spaces at top
                gameBoard[row][col] = Math.floor(Math.random() * 9) + 1;
            }
        }
    }
    
    // Rebuild entire board with animations
    rebuildBoard();
}

// Rebuild the board display
function rebuildBoard() {
    gameBoardEl.innerHTML = '';
    
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            if (gameBoard[row][col] !== null) {
                createAppleElement(row, col, gameBoard[row][col]);
                
                // Add falling animation to newly created apples
                const apple = gameBoardEl.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                if (apple) {
                    apple.classList.add('falling');
                    setTimeout(() => {
                        apple.classList.remove('falling');
                    }, 300);
                }
            }
        }
    }
}

// Update score display
function updateScore() {
    scoreEl.textContent = score;
}

// Update timer display
function updateTimer() {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    timerDisplayEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    const percentage = (timeRemaining / GAME_DURATION) * 100;
    timerBarEl.style.width = `${percentage}%`;
}

// Game timer tick
function updateGameTimer() {
    if (!gameActive) return;
    
    timeRemaining--;
    updateTimer();
    
    if (timeRemaining <= 0) {
        endGame();
    }
}

// End game
function endGame() {
    gameActive = false;
    clearInterval(timerInterval);
    
    finalScoreEl.textContent = score;
    gameOverOverlayEl.classList.add('active');
}

// Restart game
restartBtnEl.addEventListener('click', () => {
    initGame();
});

// Start game on load
initGame();
