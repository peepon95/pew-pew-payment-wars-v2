// Global variables
let ship;
let bullets = [];
let enemies = [];
let particles = [];
let stars = [];
let score = 0;
let lives = 3;
let gameOver = false;
let spawnRate = 60;
let currentPlayer = "";
let gameStarted = false;
let leaderboard = [];
let gameStartTime = 0;
let gameDuration = 60000; // 1 minute default (will be updated from HTML dropdown)
let timeRemaining = 0;
let rapidFireActive = false;
let rapidFireEndTime = 0;
let lastShotTime = 0;
let frameCount = 0;
let originalGameOver = false;

// Competitor data - these are the "enemies" players will shoot
const competitors = [
  { name: "Stripe", color: "#6772E5", logo: "💳", points: 15 },
  { name: "Ezidebit", color: "#FF6B35", logo: "💸", points: 12 },
  { name: "Square", color: "#00C851", logo: "📱", points: 10 },
  { name: "PayPal", color: "#0070BA", logo: "��", points: 8 },
  { name: "Debit Success", color: "#FF6B6B", logo: "��", points: 6 }
];

function setup() {
  // Create canvas in the gameCanvas div
  let canvas = createCanvas(600, 700);
  canvas.parent('gameCanvas');
  
  frameRate(60);
  ship = new Ship();
  
  // Create scrolling stars for background
  for (let i = 0; i < 100; i++) {
    stars.push({
      x: random(width),
      y: random(height),
      size: random(1, 3),
      speed: random(1, 3)
    });
  }
  
  // Load existing leaderboard from localStorage
  loadLeaderboard();
  
  // Check for room code in URL
  checkForRoomCode();
  
  console.log("EzyPay vs Competitors game initialized!");
}

function draw() {
  try {
    background(0);
    
    // Draw and update stars
    for (let star of stars) {
      if (star) {
        fill(255);
        noStroke();
        ellipse(star.x, star.y, star.size);
        star.y += star.speed;
        if (star.y > height) {
          star.y = 0;
          star.x = random(width);
        }
      }
    }
    
    if (!gameStarted) {
      // Show start screen
      showStartScreen();
      return;
    }
    
    if (!gameOver) {
      // ULTRA-BULLETPROOF FRAME-BASED TIMER SYSTEM
      // Calculate time based on frames (60fps) instead of millis() for precision
      let framesElapsed = frameCount;
      let framesPerSecond = 60;
      let secondsElapsed = framesElapsed / framesPerSecond;
      let secondsRemaining = (gameDuration / 1000) - secondsElapsed;
      
      // Update timeRemaining for display
      timeRemaining = secondsRemaining * 1000;
      
      // Debug timer info every second
      if (frameCount % 60 === 0) { // Log every second
        console.log("⏱️ FRAME-BASED TIMER - Remaining:", Math.ceil(secondsRemaining), "s, Total:", Math.ceil(gameDuration/1000), "s, Elapsed:", Math.ceil(secondsElapsed), "s");
        console.log("⏱️ Frames elapsed:", framesElapsed, "Expected frames:", (gameDuration/1000) * framesPerSecond);
        console.log("⏱️ Game should end at:", Math.ceil((gameDuration/1000)), "seconds");
      }
      
      // End game when frames reach the target
      let targetFrames = (gameDuration / 1000) * framesPerSecond;
      
      if (framesElapsed >= targetFrames) {
        gameOver = true;
        timeRemaining = 0;
        console.log("⏱️ GAME OVER - Frame-based timer finished!");
        console.log("⏱️ Frames elapsed:", framesElapsed, "Target frames:", targetFrames);
        console.log("⏱️ Game ran for exactly:", Math.ceil(secondsElapsed), "seconds as intended");
        console.log("⏱️ Timer-based game over - this is correct!");
      } else {
        ship.update();
        ship.show();
        
        // Check rapid fire status
        if (rapidFireActive && millis() > rapidFireEndTime) {
          rapidFireActive = false;
        }
        
        // Handle shooting with spacebar
        if (keyIsDown(32)) {
          let shootCooldown = rapidFireActive ? 8 : 25; // Normal: every 25 frames, rapid: every 8 frames
          
          if (frameCount % shootCooldown === 0 && bullets.length < 30) {
            let newBullet = new Bullet(ship.x, ship.y - ship.height / 2);
            bullets.push(newBullet);
            lastShotTime = millis();
            console.log("Bullet fired! Rapid fire:", rapidFireActive, "Total bullets:", bullets.length);
          }
        }
        
        // Spawn competitors (more consistent)
        if (frameCount % spawnRate === 0 && enemies.length < 12) {
          let competitor = random(competitors);
          enemies.push(new Competitor(random(40, width - 40), 0, competitor));
        }
        
        // IMPROVED RAPID FIRE SYSTEM - More reliable activation
        let rapidFireCheckInterval = 300; // Check every 5 seconds (300 frames at 60fps)
        
        if (frameCount % rapidFireCheckInterval === 0 && !rapidFireActive) {
          // Higher chance of activation and more frequent checks
          let shouldActivate = random() < 0.8; // 80% chance - very frequent
          
          if (shouldActivate) {
            rapidFireActive = true;
            rapidFireEndTime = millis() + 10000; // 10 seconds of rapid fire
            console.log("🎯 RAPID FIRE ACTIVATED! Frame:", frameCount, "Duration: 10 seconds");
            console.log("🎯 Rapid fire will last until:", Math.ceil(rapidFireEndTime/1000), "seconds");
            
            // Enhanced visual feedback - create explosion particles around ship
            for (let j = 0; j < 20; j++) {
              particles.push(new Particle(ship.x + random(-30, 30), ship.y + random(-30, 30), color(255, 255, 0)));
            }
          } else {
            console.log("🎯 Rapid fire check at frame:", frameCount, "- Not activated this time");
          }
        }
      }
      
      // Update and show bullets
      for (let i = bullets.length - 1; i >= 0; i--) {
        if (bullets[i]) {
          bullets[i].update();
          bullets[i].show();
          if (bullets[i].y < 0) {
            bullets.splice(i, 1);
          }
        }
      }
      
      // Update and show competitors
      for (let i = enemies.length - 1; i >= 0; i--) {
        if (enemies[i]) {
          enemies[i].update();
          enemies[i].show();
          
          // Check if competitor is off screen
          if (enemies[i].y > height) {
            enemies.splice(i, 1);
            lives--;
            console.log("💔 Life lost! Enemy escaped. Lives remaining:", lives);
            if (lives <= 0) {
              gameOver = true;
              console.log("💔 GAME OVER - All lives lost!");
            }
            continue;
          }
          
          // Check bullet-competitor collisions
          for (let j = bullets.length - 1; j >= 0; j--) {
            if (bullets[j] && enemies[i] && 
                dist(bullets[j].x, bullets[j].y, enemies[i].x, enemies[i].y) < enemies[i].size / 2 + 5) {
              createParticles(enemies[i].x, enemies[i].y, enemies[i].competitor.color);
              
              // Add points BEFORE removing the enemy
              score += enemies[i].competitor.points;
              console.log("Hit! Score increased by", enemies[i].competitor.points, "Total score:", score);
              
              enemies.splice(i, 1);
              bullets.splice(j, 1);
              break;
            }
          }
          
          // Check competitor-ship collisions
          if (enemies[i] && dist(ship.x, ship.y, enemies[i].x, enemies[i].y) < ship.width / 2 + enemies[i].size / 2) {
            createParticles(enemies[i].x, enemies[i].y, enemies[i].competitor.color);
            enemies.splice(i, 1);
            lives--;
            console.log("💥 Collision! Life lost. Lives remaining:", lives);
            if (lives <= 0) {
              gameOver = true;
              console.log("💥 GAME OVER - Ship destroyed!");
            }
          }
        }
      }
      
      // Random rapid fire status check
      if (rapidFireActive && millis() > rapidFireEndTime) {
        rapidFireActive = false;
        console.log("Rapid Fire deactivated at frame:", frameCount);
      }
      
      // Debug rapid fire status
      if (frameCount % 120 === 0) { // Log every 2 seconds
        console.log("�� Rapid Fire Debug - Frame:", frameCount, "Active:", rapidFireActive, "Time left:", rapidFireActive ? Math.ceil((rapidFireEndTime - millis())/1000) : "Inactive", "Next check in:", Math.ceil((300 - (frameCount % 300))/60), "seconds");
      }
      
      // Update and show particles
      for (let i = particles.length - 1; i >= 0; i--) {
        if (particles[i]) {
          particles[i].update();
          particles[i].show();
          if (particles[i].life <= 0) {
            particles.splice(i, 1);
          }
        }
      }
      
      // Display game info
      showGameInfo();
      
      // Increase difficulty
      if (frameCount % 300 === 0 && spawnRate > 20) {
        spawnRate -= 3;
      }
      
      // Increment frame count for timing
      frameCount++;
    } else {
      // Game over screen
      showGameOverScreen();
      
      // Check if we need to save the score
      if (!originalGameOver) {
        originalGameOver = true;
        endGame();
      }
    }
  } catch (error) {
    console.error("Game error:", error);
    resetGame();
  }
}

function showStartScreen() {
  fill(255);
  textSize(32);
  textAlign(CENTER);
  text("🚀 Pew Pew Payment Wars 💸", width / 2, height / 2 - 120);
  
  textSize(18);
  text("Defend EzyPay from the competition!", width / 2, height / 2 - 80);
  
  textSize(16);
  text("🎮 HOW TO PLAY:", width / 2, height / 2 - 40);
  text("• Use ARROW KEYS to move left/right", width / 2, height / 2 - 20);
  text("• Press SPACEBAR to shoot", width / 2, height / 2);
  text("• Avoid competitors and collect points", width / 2, height / 2 + 20);
  text("• ⚡ Rapid Fire activates randomly!", width / 2, height / 2 + 40);
  
  textSize(14);
  text("Press any key to start...", width / 2, height / 2 + 80);
}

function showGameInfo() {
  fill(255);
  textSize(16);
  textAlign(LEFT);
  text(`Player: ${currentPlayer}`, 10, 25);
  text(`Score: ${score}`, 10, 45);
  text(`Lives: ${lives}`, 10, 65);
  
  // Show timer
  let secondsLeft = Math.ceil(timeRemaining / 1000);
  text(`Time: ${secondsLeft}s`, 10, 85);
  
  // Show current level
  let level = Math.floor((60 - spawnRate) / 3) + 1;
  text(`Level: ${level}`, 10, 105);
  
  // Show rapid fire status
  if (rapidFireActive) {
    let rapidFireSecondsLeft = Math.ceil((rapidFireEndTime - millis()) / 1000);
    fill(255, 255, 0);
    textSize(18);
    text(`⚡ RAPID FIRE: ${rapidFireSecondsLeft}s`, 10, 130);
    fill(255);
    textSize(16);
  }
  
  // Show scoring system on the right side ONLY for first 5 seconds
  let gameElapsedTime = millis() - gameStartTime;
  if (gameElapsedTime < 5000) { // First 5 seconds only
    textAlign(RIGHT);
    textSize(12);
    text("Scoring System:", width - 10, 25);
    let yPos = 45;
    competitors.forEach(comp => {
      text(`${comp.logo} ${comp.name}: ${comp.points}pts`, width - 10, yPos);
      yPos += 20;
    });
  }
  
  // Rapid fire info removed for cleaner display
}

function showGameOverScreen() {
  fill(255);
  textSize(32);
  textAlign(CENTER);
  text("Game Over!", width / 2, height / 2 - 70);
  text(`Final Score: ${score}`, width / 2, height / 2 - 30);
  text(`Player: ${currentPlayer}`, width / 2, height / 2);
  
  textSize(16);
  text("💾 Save score popup will appear shortly...", width / 2, height / 2 + 30);
  
  textSize(18);
  text("Press R to Restart", width / 2, height / 2 + 60);
  text("Press N for New Player", width / 2, height / 2 + 85);
}

function keyPressed() {
  if (keyCode === 32 && gameStarted && !gameOver) {
    bullets.push(new Bullet(ship.x, ship.y - ship.height / 2));
  } else if (key === 'r' || key === 'R') {
    if (gameOver) {
      resetGame();
    }
  } else if (key === 'n' || key === 'N') {
    if (gameOver) {
      newPlayer();
    }
  }
}

function startGame() {
  let playerNameInput = document.getElementById('playerName');
  let name = playerNameInput.value.trim();
  
  if (name === "") {
    alert("Please enter your name!");
    return;
  }
  
  // Get the selected game duration from the dropdown
  let durationSelect = document.getElementById('gameDuration');
  if (durationSelect) {
    gameDuration = parseInt(durationSelect.value);
    console.log("Game duration set to:", gameDuration/1000, "seconds");
  }
  
  currentPlayer = name;
  gameStarted = true;
  gameOver = false;
  
  // FRAME-BASED TIMER SYSTEM - Reset frameCount for precise timing
  frameCount = 0;
  timeRemaining = gameDuration;
  
  // Reset game state
  resetGameState();
  
  // Hide the form
  document.querySelector('.player-form').style.display = 'none';
  
  console.log("⏱️ FRAME-BASED TIMER - Game started with duration:", gameDuration/1000, "seconds");
  console.log("⏱️ Target frames:", (gameDuration/1000) * 60, "frames at 60fps");
  console.log("⏱️ Total duration will be exactly:", Math.ceil(gameDuration/1000), "seconds");
}

function newPlayer() {
  gameStarted = false;
  gameOver = false;
  originalGameOver = false;
  document.querySelector('.player-form').style.display = 'block';
  document.getElementById('playerName').value = '';
  resetGame();
  
  // Reset frameCount for new player
  frameCount = 0;
}

function resetGameState() {
  bullets.length = 0;
  enemies.length = 0;
  particles.length = 0;
  
  score = 0;
  lives = 3;
  gameOver = false;
  spawnRate = 60;
  originalGameOver = false;
  rapidFireActive = false;
  rapidFireEndTime = 0;
  lastShotTime = 0;
  
  if (ship) {
    ship.x = width / 2;
    ship.y = height - 50;
  }
  
  console.log("Game state reset successfully");
}

function resetGame() {
  bullets.length = 0;
  enemies.length = 0;
  particles.length = 0;
  
  score = 0;
  lives = 3;
  gameOver = false;
  spawnRate = 60;
  originalGameOver = false;
  timeRemaining = gameDuration;
  rapidFireActive = false;
  rapidFireEndTime = 0;
  lastShotTime = 0;
  
  if (ship) {
    ship.x = width / 2;
    ship.y = height - 50;
  }
  
  console.log("Game reset successfully");
}

function endGame() {
  console.log("�� endGame called for player:", currentPlayer, "with score:", score);
  
  // Double-check why the game ended
  let elapsedTime = millis() - gameStartTime;
  console.log("🎮 Game ended after:", Math.ceil(elapsedTime/1000), "seconds");
  console.log("🎮 Expected duration was:", Math.ceil(gameDuration/1000), "seconds");
  console.log("�� Lives remaining:", lives);
  
  // Show save score popup if player has a score
  if (currentPlayer && score > 0) {
    setTimeout(() => {
      showSaveScorePopup();
    }, 1000); // Wait 1 second before showing popup
  }
}

function showSaveScorePopup() {
  // Check if player already exists on leaderboard
  let existingPlayer = leaderboard.find(entry => entry.name === currentPlayer);
  let saveScore = false;
  
  if (existingPlayer) {
    // Player exists - show comparison and override option
    if (score > existingPlayer.score) {
      saveScore = confirm(
        `�� Game Over!\n\n` +
        `Player: ${currentPlayer}\n` +
        `Current Score: ${score}\n` +
        `Previous Best: ${existingPlayer.score}\n\n` +
        `🎉 NEW HIGH SCORE!\n\n` +
        `Would you like to update your score on the leaderboard?`
      );
    } else {
      saveScore = confirm(
        `�� Game Over!\n\n` +
        `Player: ${currentPlayer}\n` +
        `Current Score: ${score}\n` +
        `Your Best Score: ${existingPlayer.score}\n\n` +
        `This score is lower than your best.\n` +
        `Would you still like to override your score on the leaderboard?`
      );
    }
  } else {
    // New player - regular save option
    saveScore = confirm(
      `�� Game Over!\n\n` +
      `Player: ${currentPlayer}\n` +
      `Final Score: ${score}\n\n` +
      `Would you like to save your score to the leaderboard?`
    );
  }
  
  if (saveScore) {
    saveScoreToLeaderboard();
    console.log("Score saved successfully for player:", currentPlayer);
  } else {
    console.log("Score not saved for player:", currentPlayer);
  }
}

function saveScoreToLeaderboard() {
  // Find existing player entry
  let existingIndex = leaderboard.findIndex(entry => entry.name === currentPlayer);
  
  if (existingIndex !== -1) {
    // Update existing player's score
    leaderboard[existingIndex].score = score;
    console.log("Updated score for existing player:", currentPlayer);
  } else {
    // Add new player
    leaderboard.push({
      name: currentPlayer,
      score: score,
      date: new Date().toLocaleDateString()
    });
    console.log("Added new player to leaderboard:", currentPlayer);
  }
  
  // Sort leaderboard by score (highest first)
  leaderboard.sort((a, b) => b.score - a.score);
  
  // Keep only top 10 scores
  leaderboard = leaderboard.slice(0, 10);
  
  // Save to localStorage
  localStorage.setItem('ezyPayLeaderboard', JSON.stringify(leaderboard));
  
  // Update display
  updateLeaderboardDisplay();
  
  console.log("Leaderboard updated and saved to localStorage");
}

function loadLeaderboard() {
  let saved = localStorage.getItem('ezyPayLeaderboard');
  if (saved) {
    leaderboard = JSON.parse(saved);
    console.log("Leaderboard loaded from localStorage:", leaderboard.length, "entries");
  } else {
    console.log("No saved leaderboard found, starting fresh");
  }
  updateLeaderboardDisplay();
}

function updateLeaderboardDisplay() {
  let leaderboardDiv = document.getElementById('leaderboardList');
  if (!leaderboardDiv) return;
  
  if (leaderboard.length === 0) {
    leaderboardDiv.innerHTML = '<div class="leaderboard-item"><span>No scores yet</span><span>0</span></div>';
    return;
  }
  
  let html = '';
  leaderboard.forEach((entry, index) => {
    let medal = '';
    if (index === 0) medal = '🥇 ';
    else if (index === 1) medal = '🥈 ';
    else if (index === 2) medal = '🥉 ';
    
    html += `<div class="leaderboard-item">
      <span>${medal}${entry.name}</span>
      <span>${entry.score}</span>
    </div>`;
  });
  
  leaderboardDiv.innerHTML = html;
}

function resetLeaderboard() {
  let password = prompt("Enter admin password to reset leaderboard:");
  if (password === "1813") {
    if (confirm("Are you sure you want to reset the leaderboard? This will delete all scores!")) {
      leaderboard = [];
      localStorage.removeItem('ezyPayLeaderboard');
      updateLeaderboardDisplay();
      console.log("Leaderboard reset successfully by admin");
      alert("Leaderboard reset successfully!");
    }
  } else if (password !== null) {
    alert("Incorrect password! Only admins can reset the leaderboard.");
  }
}

function generateRoomCode() {
  let roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  let roomLink = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
  
  // Copy room link to clipboard
  navigator.clipboard.writeText(roomLink).then(() => {
    alert(`�� Private Group Link Generated!\n\nRoom Code: ${roomCode}\n\nFull Link: ${roomLink}\n\n✅ Copied to clipboard!\n\nShare this link with your team to play together!`);
  }).catch(() => {
    alert(`�� Private Group Link Generated!\n\nRoom Code: ${roomCode}\n\nFull Link: ${roomLink}\n\n📋 Please copy manually and share with your team!`);
  });
  
  // Store room code in input field
  let roomCodeInput = document.getElementById('roomCode');
  if (roomCodeInput) {
    roomCodeInput.value = roomCode;
    console.log("Room code stored in input field:", roomCode);
  }
  
  console.log("Private group room created:", roomCode, "Link:", roomLink);
}

function joinRoom() {
  let roomCodeInput = document.getElementById('roomCode');
  let roomCode = roomCodeInput.value.trim().toUpperCase();
  
  if (roomCode === "") {
    alert("Please enter a room code to join!");
    return;
  }
  
  // Create the room link
  let roomLink = `${window.location.origin}${window.location.pathname}?room=${roomCode}`;
  
  // Copy room link to clipboard
  navigator.clipboard.writeText(roomLink).then(() => {
    alert(`🎯 Joining Private Group!\n\nRoom Code: ${roomCode}\n\nFull Link: ${roomLink}\n\n✅ Copied to clipboard!\n\nShare this link with your team to play together!`);
  }).catch(() => {
    alert(`🎯 Joining Private Group!\n\nRoom Code: ${roomCode}\n\nFull Link: ${roomLink}\n\n📋 Please copy manually and share with your team!`);
  });
  
  console.log("Joining private group room:", roomCode, "Link:", roomLink);
}

// Check for room code in URL when page loads
function checkForRoomCode() {
  const urlParams = new URLSearchParams(window.location.search);
  const roomCode = urlParams.get('room');
  
  if (roomCode) {
    // Auto-fill room code input
    let roomCodeInput = document.getElementById('roomCode');
    if (roomCodeInput) {
      roomCodeInput.value = roomCode;
    }
    
    // Show welcome message
    setTimeout(() => {
      alert(`�� Welcome to Private Group!\n\nRoom Code: ${roomCode}\n\nYou've joined a private game session!\n\nEnter your name and start playing with your team!`);
    }, 1000);
    
    console.log("Joined private group room:", roomCode);
  }
}

function createParticles(x, y, color) {
  for (let i = 0; i < 8; i++) {
    particles.push(new Particle(x, y, color));
  }
}

// Game classes
class Ship {
  constructor() {
    this.x = width / 2;
    this.y = height - 50;
    this.width = 30;
    this.height = 40;
    this.speed = 5;
  }
  
  show() {
    // COOL EzyPay themed ship with advanced graphics
    push();
    
    // Ship glow effect
    let glowIntensity = rapidFireActive ? 100 : 50;
    fill(100, 200, 255, glowIntensity);
    noStroke();
    ellipse(this.x, this.y, this.width + 20, this.height + 20);
    
    // Main ship body - Sleek futuristic design
    let shipColor = keyIsDown(LEFT_ARROW) || keyIsDown(RIGHT_ARROW) 
      ? color(150, 220, 255) : color(100, 200, 255);
    fill(shipColor);
    stroke(255, 255, 255, 200);
    strokeWeight(2);
    
    // Advanced ship shape - more aerodynamic
    beginShape();
    vertex(this.x - this.width / 2, this.y + this.height / 2); // Bottom left
    vertex(this.x - this.width / 3, this.y + this.height / 4); // Left wing
    vertex(this.x - this.width / 4, this.y - this.height / 3); // Left top
    vertex(this.x, this.y - this.height / 2); // Top point
    vertex(this.x + this.width / 4, this.y - this.height / 3); // Right top
    vertex(this.x + this.width / 3, this.y + this.height / 4); // Right wing
    vertex(this.x + this.width / 2, this.y + this.height / 2); // Bottom right
    endShape(CLOSE);
    
    // Cockpit with glass effect
    fill(150, 220, 255, 200);
    stroke(255, 255, 255, 150);
    ellipse(this.x, this.y - this.height / 6, this.width / 3, this.height / 4);
    
    // EzyPay logo on ship - more prominent
    fill(255, 215, 0);
    stroke(255, 165, 0);
    strokeWeight(1);
    textSize(14);
    textAlign(CENTER);
    text("EP", this.x, this.y + this.height / 6);
    
    // Enhanced thrusters with particle effects
    fill(255, 150, 0);
    stroke(255, 100, 0);
    strokeWeight(1);
    
    // Left thruster
    triangle(this.x - 8, this.y + this.height / 2, 
             this.x - 3, this.y + this.height / 2 + 15, 
             this.x + 2, this.y + this.height / 2);
    
    // Right thruster
    triangle(this.x - 2, this.y + this.height / 2, 
             this.x + 3, this.y + this.height / 2 + 15, 
             this.x + 8, this.y + this.height / 2);
    
    // Thruster flames
    fill(255, 100, 0, 200);
    triangle(this.x - 6, this.y + this.height / 2 + 15, 
             this.x - 3, this.y + this.height / 2 + 25, 
             this.x, this.y + this.height / 2 + 15);
    
    fill(255, 100, 0, 200);
    triangle(this.x, this.y + this.height / 2 + 15, 
             this.x + 3, this.y + this.height / 2 + 25, 
             this.x + 6, this.y + this.height / 2 + 15);
    
    // Rapid fire indicator - more dramatic
    if (rapidFireActive) {
      // Pulsing energy field
      let pulseSize = 25 + sin(frameCount * 0.3) * 5;
      fill(255, 255, 0, 150);
      noStroke();
      ellipse(this.x, this.y - this.height - 15, pulseSize, pulseSize);
      
      // Energy bolts
      fill(255, 255, 0);
      stroke(255, 200, 0);
      strokeWeight(2);
      textSize(12);
      text("⚡", this.x, this.y - this.height - 15);
      
      // Additional energy particles
      for (let i = 0; i < 3; i++) {
        let angle = frameCount * 0.2 + i * 2;
        let radius = 15 + i * 5;
        let px = this.x + cos(angle) * radius;
        let py = this.y - this.height - 15 + sin(angle) * radius;
        fill(255, 255, 0, 150);
        ellipse(px, py, 3, 3);
      }
    }
    
    // Movement trail effect
    if (keyIsDown(LEFT_ARROW) || keyIsDown(RIGHT_ARROW)) {
      fill(100, 200, 255, 100);
      noStroke();
      ellipse(this.x, this.y + this.height / 2 + 10, this.width / 2, 8);
    }
    
    pop();
  }
  
  update() {
    if (keyIsDown(LEFT_ARROW) || keyIsDown(65)) {
      this.x -= this.speed;
    }
    if (keyIsDown(RIGHT_ARROW) || keyIsDown(68)) {
      this.x += this.speed;
    }
    this.x = constrain(this.x, this.width / 2, width - this.width / 2);
  }
}

class Bullet {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.speed = rapidFireActive ? 12 : 8; // Faster bullets during rapid fire
    this.isRapidFire = rapidFireActive;
  }
  
  show() {
    push();
    
    if (this.isRapidFire) {
      // COOL rapid fire bullets with energy effects
      // Outer glow
      fill(255, 100, 100, 100);
      noStroke();
      ellipse(this.x, this.y - 15, 12, 40);
      
      // Main bullet body
      fill(255, 100, 100);
      stroke(255, 50, 50);
      strokeWeight(1);
      rect(this.x - 3, this.y - 15, 6, 30);
      
      // Energy core
      fill(255, 255, 0);
      noStroke();
      rect(this.x - 1, this.y - 13, 2, 26);
      
      // Particle trail
      for (let i = 0; i < 5; i++) {
        let alpha = map(i, 0, 4, 150, 50);
        fill(255, 255, 0, alpha);
        ellipse(this.x + random(-2, 2), this.y + 15 + i * 3, 2, 2);
      }
    } else {
      // COOL normal bullets with plasma effect
      // Outer glow
      fill(255, 255, 0, 80);
      noStroke();
      ellipse(this.x, this.y - 10, 8, 24);
      
      // Main bullet body
      fill(255, 255, 0);
      stroke(255, 200, 0);
      strokeWeight(1);
      rect(this.x - 2, this.y - 10, 4, 20);
      
      // Plasma core
      fill(255, 255, 255);
      noStroke();
      rect(this.x - 1, this.y - 8, 2, 16);
      
      // Energy trail
      fill(255, 255, 0, 60);
      ellipse(this.x, this.y + 10, 3, 6);
    }
    
    pop();
  }
  
  update() {
    this.y -= this.speed;
  }
}

class Competitor {
  constructor(x, y, competitorData) {
    this.x = x;
    this.y = y;
    this.size = 30;
    this.speed = random(1, 3);
    this.competitor = competitorData;
  }
  
  show() {
    // Draw competitor logo
    fill(this.competitor.color);
    noStroke();
    ellipse(this.x, this.y, this.size);
    
    // Add competitor logo
    fill(255);
    textSize(16);
    textAlign(CENTER);
    text(this.competitor.logo, this.x, this.y + 5);
  }
  
  update() {
    this.y += this.speed;
  }
}

class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.vx = random(-3, 3);
    this.vy = random(-3, 3);
    this.life = 60;
    this.color = color;
  }
  
  show() {
    push();
    fill(this.color);
    noStroke();
    let alpha = map(this.life, 0, 60, 0, 255);
    fill(red(this.color), green(this.color), blue(this.color), alpha);
    ellipse(this.x, this.y, 4);
    pop();
  }
  
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life--;
  }
}
