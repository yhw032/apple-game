// Game state
const GAME_DURATION = 120; // 2 minutes in seconds

// Responsive grid configuration
let ROWS = 10;
let COLS = 17;

function isMobile() {
  return window.innerWidth <= 768;
}

function updateGridSize() {
  if (isMobile()) {
    ROWS = 17;
    COLS = 10;
  } else {
    ROWS = 10;
    COLS = 17;
  }

  // Update CSS grid template
  gameBoardEl.style.gridTemplateColumns = `repeat(${COLS}, 1fr)`;
  gameBoardEl.style.gridTemplateRows = `repeat(${ROWS}, 1fr)`;
}

let gameBoard = [];
let score = 0;
let highScore = 0;
let timeRemaining = GAME_DURATION;
let gameActive = false;
let timerInterval = null;
let inputLocked = false;

// Drag selection state
let isSelecting = false;
let selectionStart = { x: 0, y: 0 };
let selectionEnd = { x: 0, y: 0 };
let selectedApples = [];
let cachedApplePositions = [];

// DOM elements
const gameBoardEl = document.getElementById('gameBoard');
const selectionBoxEl = document.getElementById('selectionBox');
const scoreEl = document.getElementById('score');
const timerDisplayEl = document.getElementById('timerDisplay');
const timerBarEl = document.getElementById('timerBar');
const gameOverOverlayEl = document.getElementById('gameOverOverlay');
const finalScoreEl = document.getElementById('finalScore');
const restartBtnEl = document.getElementById('restartBtn');
const selectionSumEl = document.getElementById('selectionSum');
const selectionSumWrapperEl = document.getElementById('selectionSumWrapper');
const startScreenOverlayEl = document.getElementById('startScreenOverlay');
const startBtnEl = document.getElementById('startBtn');
const bgmAudioEl = document.getElementById('bgmAudio');
const bgmToggleBtnEl = document.getElementById('bgmToggleBtn');
const volumeSliderEl = document.getElementById('volumeSlider');
const uiAudioEl = document.getElementById('uiAudio');
const tickingAudioEl = document.getElementById('tickingAudio');
const countAudioEl = document.getElementById('countAudio');
const highScoreEl = document.getElementById('highScore');
const finalHighScoreEl = document.getElementById('finalHighScore');
const highScoreLabelEl = document.getElementById('highScoreLabel');

// Mobile UI elements
const mobileTopBarEl = document.getElementById('mobileTopBar');
const mobileTimerEl = document.getElementById('mobileTimer');
const mobileScoreEl = document.getElementById('mobileScore');
const mobileSettingsBtnEl = document.getElementById('mobileSettingsBtn');
const settingsPopupOverlayEl = document.getElementById('settingsPopupOverlay');
const settingsCloseBtnEl = document.getElementById('settingsCloseBtn');
const settingsVolumeSliderEl = document.getElementById('settingsVolumeSlider');
const settingsBgmToggleBtnEl = document.getElementById('settingsBgmToggleBtn');

// LocalStorage functions
function loadHighScore() {
  const saved = localStorage.getItem('appleGameHighScore');
  return saved ? parseInt(saved) : 0;
}

function saveHighScore(score) {
  localStorage.setItem('appleGameHighScore', score.toString());
}

function loadVolume() {
  const saved = localStorage.getItem('appleGameVolume');
  return saved ? parseInt(saved) : 50;
}

function saveVolume(volume) {
  localStorage.setItem('appleGameVolume', volume.toString());
}

function loadBgmEnabled() {
  const saved = localStorage.getItem('appleGameBgmEnabled');
  return saved !== null ? saved === 'true' : true; // Default to enabled
}

function saveBgmEnabled(enabled) {
  localStorage.setItem('appleGameBgmEnabled', enabled.toString());
}

// Initialize saved data
highScore = loadHighScore();
const savedVolume = loadVolume();
const bgmEnabled = loadBgmEnabled();
volumeSliderEl.value = savedVolume;

// Initialize game
function initGame() {
  gameBoard = [];
  score = 0;
  timeRemaining = GAME_DURATION;
  gameActive = true;

  // Stop ticking and count sound if playing
  tickingAudioEl.pause();
  tickingAudioEl.currentTime = 0;
  countAudioEl.pause();
  countAudioEl.currentTime = 0;

  // Update grid size for responsive layout
  updateGridSize();

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
  updateHighScore();
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
function handleSelectionStart(clientX, clientY) {
  if (!gameActive || inputLocked) return false;

  const rect = gameBoardEl.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;

  isSelecting = true;
  selectionStart = { x, y };
  selectionEnd = { x, y };

  const wrapperStyle = getComputedStyle(gameBoardEl.parentElement);
  const paddingLeft = parseFloat(wrapperStyle.paddingLeft);
  const paddingTop = parseFloat(wrapperStyle.paddingTop);

  selectionBoxEl.style.left = `${x + paddingLeft}px`;
  selectionBoxEl.style.top = `${y + paddingTop}px`;
  selectionBoxEl.style.width = '0px';
  selectionBoxEl.style.height = '0px';
  selectionBoxEl.classList.add('active');
  selectionBoxEl.classList.remove('valid', 'invalid');

  const apples = gameBoardEl.querySelectorAll('.apple:not(.removing)');
  const boardRect = gameBoardEl.getBoundingClientRect();

  cachedApplePositions = Array.from(apples).map(apple => {
    const rect = apple.getBoundingClientRect();
    return {
      element: apple,
      left: rect.left - boardRect.left,
      top: rect.top - boardRect.top,
      right: rect.right - boardRect.left,
      bottom: rect.bottom - boardRect.top
    };
  });

  return true;
}

function handleSelectionMove(clientX, clientY) {
  if (!isSelecting || !gameActive) return false;

  const rect = gameBoardEl.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;

  selectionEnd = { x, y };
  updateSelectionBox();
  checkSelection();

  return true;
}

function handleSelectionEnd() {
  if (!isSelecting || !gameActive) return false;

  isSelecting = false;

  selectionSumEl.classList.remove('active', 'valid');

  gameBoardEl.querySelectorAll('.apple.highlighted')
    .forEach(apple => apple.classList.remove('highlighted'));

  // Check if selection is valid and process
  const isValid = selectionBoxEl.classList.contains('valid') && selectedApples.length > 0;

  // Hide selection box immediately
  selectionBoxEl.classList.remove('active', 'valid', 'invalid');

  // Process removal after hiding selection box
  if (isValid) {
    removeSelectedApples();
  }

  selectedApples = [];

  return true;
}

// Mouse events
gameBoardEl.addEventListener('mousedown', (e) => {
  handleSelectionStart(e.clientX, e.clientY);
});

gameBoardEl.addEventListener('mousemove', (e) => {
  handleSelectionMove(e.clientX, e.clientY);
});

document.addEventListener('mouseup', (e) => {
  handleSelectionEnd();
});

// Touch events for mobile
gameBoardEl.addEventListener('touchstart', (e) => {
  const touch = e.touches[0];
  if (handleSelectionStart(touch.clientX, touch.clientY)) {
    e.preventDefault(); // Prevent scrolling
  }
}, { passive: false });

gameBoardEl.addEventListener('touchmove', (e) => {
  const touch = e.touches[0];
  if (handleSelectionMove(touch.clientX, touch.clientY)) {
    e.preventDefault(); // Prevent scrolling
  }
}, { passive: false });

document.addEventListener('touchend', (e) => {
  handleSelectionEnd();
}, { passive: false });

// Update selection box position and size
function updateSelectionBox() {
  const left = Math.min(selectionStart.x, selectionEnd.x);
  const top = Math.min(selectionStart.y, selectionEnd.y);
  const width = Math.abs(selectionEnd.x - selectionStart.x);
  const height = Math.abs(selectionEnd.y - selectionStart.y);

  const wrapperStyle = getComputedStyle(gameBoardEl.parentElement);
  const paddingLeft = parseFloat(wrapperStyle.paddingLeft);
  const paddingTop = parseFloat(wrapperStyle.paddingTop);

  selectionBoxEl.style.left = `${left + paddingLeft}px`;
  selectionBoxEl.style.top = `${top + paddingTop}px`;
  selectionBoxEl.style.width = `${width}px`;
  selectionBoxEl.style.height = `${height}px`;

  selectionSumWrapperEl.style.left = `${left + width}px`;
  selectionSumWrapperEl.style.top = `${top}px`;
}

// Check which apples are in selection and if sum equals 10
function checkSelection() {
  const selectionRect = {
    left: Math.min(selectionStart.x, selectionEnd.x),
    top: Math.min(selectionStart.y, selectionEnd.y),
    right: Math.max(selectionStart.x, selectionEnd.x),
    bottom: Math.max(selectionStart.y, selectionEnd.y)
  };

  gameBoardEl.querySelectorAll('.apple.highlighted')
    .forEach(apple => apple.classList.remove('highlighted'));

  selectedApples = [];

  cachedApplePositions.forEach(pos => {
    // Check if apple intersects with selection
    if (!(pos.right < selectionRect.left ||
      pos.left > selectionRect.right ||
      pos.bottom < selectionRect.top ||
      pos.top > selectionRect.bottom)) {
      selectedApples.push(pos.element);
      pos.element.classList.add('highlighted');
    }
  });

  // Calculate sum
  const sum = selectedApples.reduce((total, apple) => {
    return total + parseInt(apple.dataset.value);
  }, 0);

  selectionSumEl.textContent = sum;
  selectionSumEl.classList.add('active');

  // Update selection box appearance
  if (sum === 10 && selectedApples.length > 0) {
    selectionBoxEl.classList.remove('invalid');
    selectionBoxEl.classList.add('valid');
    selectedApples.forEach(apple => apple.classList.add('valid'));
    selectionSumEl.classList.add('valid');
  } else {
    selectionBoxEl.classList.remove('valid');
    selectionBoxEl.classList.add('invalid');
    selectedApples.forEach(apple => apple.classList.remove('valid'));
    selectionSumEl.classList.remove('valid');
  }
}

// Remove selected apples and update game state
function removeSelectedApples() {
  inputLocked = true;

  // Play UI sound effect
  uiAudioEl.currentTime = 0; // Reset to start for rapid successive plays
  uiAudioEl.play().catch(err => {
    console.log('UI sound play prevented:', err);
  });

  const applesCount = selectedApples.length;
  score += applesCount;
  updateScore();

  // Store which positions are being removed
  const removedPositions = new Set();
  selectedApples.forEach(apple => {
    const row = parseInt(apple.dataset.row);
    const col = parseInt(apple.dataset.col);
    removedPositions.add(`${row},${col}`);
  });

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

    inputLocked = false;
  }, 400);
}

// Update score display
function updateScore() {
  scoreEl.textContent = score;
  if (mobileScoreEl) mobileScoreEl.textContent = score;

  // Check and update high score
  if (score > highScore) {
    highScore = score;
    saveHighScore(highScore);
    updateHighScore();
  }
}

// Update high score display
function updateHighScore() {
  highScoreEl.textContent = highScore;
  finalHighScoreEl.textContent = highScore;
}

// Update timer display
function updateTimer() {
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  timerDisplayEl.textContent = timeString;
  if (mobileTimerEl) mobileTimerEl.textContent = timeString;

  const percentage = (timeRemaining / GAME_DURATION) * 100;
  timerBarEl.style.width = `${percentage}%`;
}

// Game timer tick
function updateGameTimer() {
  if (!gameActive) return;

  timeRemaining--;
  updateTimer();

  // Play ticking sound when 30 seconds remain
  if (timeRemaining === 30) {
    tickingAudioEl.play().catch(err => {
      console.log('Ticking sound play prevented:', err);
    });
  }

  // Play countdown sound during last 5 seconds
  if (timeRemaining <= 5 && timeRemaining > 0) {
    countAudioEl.currentTime = 0; // Reset to start for each count
    countAudioEl.play().catch(err => {
      console.log('Count sound play prevented:', err);
    });
  }

  if (timeRemaining <= 0) {
    endGame();
  }
}

// End game
function endGame() {
  gameActive = false;
  clearInterval(timerInterval);

  // Stop ticking and count sound if playing
  tickingAudioEl.pause();
  tickingAudioEl.currentTime = 0;
  countAudioEl.pause();
  countAudioEl.currentTime = 0;

  // Check if new high score
  if (score >= highScore) {
    highScoreLabelEl.style.display = 'block';
  } else {
    highScoreLabelEl.style.display = 'none';
  }

  finalScoreEl.textContent = score;
  gameOverOverlayEl.classList.add('active');
}

// Start game
startBtnEl.addEventListener('click', () => {
  startScreenOverlayEl.classList.remove('active');
  initGame();
  // Play BGM only if it was enabled
  if (loadBgmEnabled()) {
    bgmAudioEl.play().catch(err => {
      console.log('BGM autoplay prevented:', err);
    });
  }
});

// Restart game
restartBtnEl.addEventListener('click', () => {
  initGame();
  // Keep BGM playing if it was already playing (don't restart it)
  if (bgmAudioEl.paused) {
    bgmAudioEl.play().catch(err => {
      console.log('BGM play prevented:', err);
    });
  }
});

// BGM Toggle
bgmToggleBtnEl.addEventListener('click', () => {
  if (bgmAudioEl.paused) {
    bgmAudioEl.play();
    bgmToggleBtnEl.querySelector('.bgm-icon').innerHTML = '<img src="public/image/music-on.svg" alt="">';
    saveBgmEnabled(true);
  } else {
    bgmAudioEl.pause();
    bgmToggleBtnEl.querySelector('.bgm-icon').innerHTML = '<img src="public/image/music-off.svg" alt="">';
    saveBgmEnabled(false);
  }
});

// Volume Control
bgmAudioEl.volume = savedVolume / 100;
uiAudioEl.volume = 0.5; // Set UI sound at 50% volume (independent from BGM)
tickingAudioEl.volume = 0.5; // Set ticking sound at 50% volume (independent from BGM)
countAudioEl.volume = 0.2; // Set countdown sound at 20% volume (independent from BGM)
updateHighScore(); // Initialize high score display

// Sync volume sliders
volumeSliderEl.addEventListener('input', (e) => {
  const volume = e.target.value;
  bgmAudioEl.volume = volume / 100;
  saveVolume(volume);
  if (settingsVolumeSliderEl) settingsVolumeSliderEl.value = volume;
});

if (settingsVolumeSliderEl) {
  settingsVolumeSliderEl.value = savedVolume;
  settingsVolumeSliderEl.addEventListener('input', (e) => {
    const volume = e.target.value;
    bgmAudioEl.volume = volume / 100;
    saveVolume(volume);
    volumeSliderEl.value = volume;
  });
}

// Settings popup controls
if (mobileSettingsBtnEl) {
  mobileSettingsBtnEl.addEventListener('click', () => {
    settingsPopupOverlayEl.classList.add('active');
  });
}

if (settingsCloseBtnEl) {
  settingsCloseBtnEl.addEventListener('click', () => {
    settingsPopupOverlayEl.classList.remove('active');
  });
}

if (settingsPopupOverlayEl) {
  settingsPopupOverlayEl.addEventListener('click', (e) => {
    if (e.target === settingsPopupOverlayEl) {
      settingsPopupOverlayEl.classList.remove('active');
    }
  });
}

// Settings BGM toggle (sync with main toggle)
if (settingsBgmToggleBtnEl) {
  settingsBgmToggleBtnEl.addEventListener('click', () => {
    if (bgmAudioEl.paused) {
      bgmAudioEl.play();
      bgmToggleBtnEl.querySelector('.bgm-icon').innerHTML = '<img src="public/image/music-on.svg" alt="">';
      settingsBgmToggleBtnEl.querySelector('.bgm-icon').innerHTML = '<img src="public/image/music-on.svg" alt="">';
      saveBgmEnabled(true);
    } else {
      bgmAudioEl.pause();
      bgmToggleBtnEl.querySelector('.bgm-icon').innerHTML = '<img src="public/image/music-off.svg" alt="">';
      settingsBgmToggleBtnEl.querySelector('.bgm-icon').innerHTML = '<img src="public/image/music-off.svg" alt="">';
      saveBgmEnabled(false);
    }
  });
}

// Handle window resize for responsive layout
let previousIsMobile = isMobile();
window.addEventListener('resize', () => {
  const currentIsMobile = isMobile();
  // Only reinitialize if mobile state changed
  if (previousIsMobile !== currentIsMobile) {
    previousIsMobile = currentIsMobile;
    if (gameActive) {
      // Restart the game with new layout
      initGame();
    } else {
      // Just update the grid if game is not active
      updateGridSize();
    }
  }
});
