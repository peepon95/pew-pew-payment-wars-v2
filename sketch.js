// Global game variables
let ship;
let bullets = [];
let enemies = [];
let particles = [];
let stars = [];
let powerUps = [];
let score = 0;
let lives = 3;
let gameOver = false;
let spawnRate = 60;
let currentPlayer = "";
let gameStarted = false;
let leaderboard = [];
let gameStartTime = 0;
let gameDuration = 60000; // 1 minute in milliseconds (60,000 ms = 60 seconds)
let timeRemaining = 0;
let rapidFireActive = false;
let rapidFireEndTime = 0;
let lastShotTime = 0;

// Competitor data - these are the "enemies" players will shoot
const competitors = [
  { name: "Stripe", color: "#6772E5", logo: "💳", points: 15 },
  { name: "Ezidebit", color: "#FF6B35", logo: "💸", points: 12 },
  { name: "Square", color: "#00C851", logo: "📱", points: 10 },
  { name: "PayPal", color: "#0070BA", logo: "🌐", points: 8 },
  { name: "Debit Success", color: "#FF6B6B", logo: "🌍", points: 6 }
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
      // Check if time is up
      timeRemaining = gameDuration - (millis() - gameStartTime);
      
      // Debug timer info
      if (frameCount % 60 === 0) { // Log every second
        console.log("Timer Debug - Remaining:", Math.ceil(timeRemaining/1000), "s, Total:", Math.ceil(gameDuration/1000), "s, Elapsed:", Math.ceil((millis() - gameStartTime)/1000), "s");
      }
      
      if (timeRemaining <= 0) {
        gameOver = true;
        timeRemaining = 0;
        console.log("Game Over - Time's up! Total game time:", Math.ceil((millis() - gameStartTime)/1000), "seconds");
      } else {
        ship.update();
        ship.show();
        
        // Check rapid fire status
        if (rapidFireActive && millis() > rapidFireEndTime) {
          rapidFireActive = false;
        }
        
        // Handle shooting with spacebar
        if (keyIsDown(32)) {
          let shootCooldown = rapidFireActive ? 3 : 10; // Faster shooting with rapid fire
          let canShoot = rapidFireActive ? 
            (frameCount % shootCooldown === 0) : 
            (frameCount % shootCooldown === 0);
            
          if (canShoot && bullets.length < 80) {
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
        
        // Random rapid fire activation (every 10 seconds)
        if (frameCount % 600 === 0 && !rapidFireActive) { // Every 10 seconds (600 frames at 60fps)
          let shouldActivate = random() < 0.5; // 50% chance - increased probability
          if (shouldActivate) {
            rapidFireActive = true;
            rapidFireEndTime = millis() + 10000; // 10 seconds of rapid fire
            console.log("Random Rapid Fire activated for 10 seconds! Frame:", frameCount);
            
            // Visual feedback - create explosion particles around ship
            for (let j = 0; j < 20; j++) {
              particles.push(new Particle(ship.x + random(-20, 20), ship.y + random(-20, 20), color(255, 255, 0)));
            }
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
            if (lives <= 0) {
              gameOver = true;
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
            if (lives <= 0) {
              gameOver = true;
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
        console.log("Rapid Fire Status:", rapidFireActive, "Time left:", rapidFireActive ? Math.ceil((rapidFireEndTime - millis())/1000) : "Inactive");
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
  text("Pew Pew Payment Wars 💸", width / 2, height / 2 - 120);
  
  textSize(18);
  text("Enter your name and click 'Start Game' to begin!", width / 2, height / 2 - 80);
  text("Defend EzyPay from the competition!", width / 2, height / 2 - 50);
  text("Each game lasts exactly 1 minute!", width / 2, height / 2 - 20);
  
  textSize(16);
  text("Controls:", width / 2, height / 2 + 20);
  text("← → Arrow keys to move", width / 2, height / 2 + 45);
  text("Spacebar to shoot", width / 2, height / 2 + 65);
  
  // Show scoring system
  textSize(14);
  text("Scoring System:", width / 2, height / 2 + 95);
  let yPos = 120;
  competitors.forEach(comp => {
    text(`${comp.logo} ${comp.name}: ${comp.points} points`, width / 2, height / 2 + yPos);
    yPos += 20;
  });
  
  // Show rapid fire info
  text("⚡ Random Rapid Fire:", width / 2, height / 2 + yPos);
  text("Activates every 10 seconds for 10 seconds!", width / 2, height / 2 + yPos + 20);
  
  // Show save info
  text("💾 Score Save:", width / 2, height / 2 + yPos + 45);
  text("Automatic popup when game ends!", width / 2, height / 2 + yPos + 65);
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
  
  // Show scoring system on the right side
  textAlign(RIGHT);
  textSize(12);
  text("Scoring System:", width - 10, 25);
  let yPos = 45;
  competitors.forEach(comp => {
    text(`${comp.logo} ${comp.name}: ${comp.points}pts`, width - 10, yPos);
    yPos += 20;
  });
  
  // Show rapid fire info
  text("⚡ Random Rapid Fire!", width - 10, yPos + 10);
  text("Activates every 15s", width - 10, yPos + 25);
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
  
  currentPlayer = name;
  gameStarted = true;
  gameOver = false;
  resetGame();
  
  // Start the timer
  gameStartTime = millis();
  timeRemaining = gameDuration;
  
  // Hide the form
  document.querySelector('.player-form').style.display = 'none';
  
  // Reset frameCount to ensure consistent timing for all players
  frameCount = 0;
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
  console.log("endGame called for player:", currentPlayer, "with score:", score);
  
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
        `🎮 Game Over!\n\n` +
        `Player: ${currentPlayer}\n` +
        `Current Score: ${score}\n` +
        `Previous Best: ${existingPlayer.score}\n\n` +
        `🎉 NEW HIGH SCORE!\n\n` +
        `Would you like to update your score on the leaderboard?`
      );
    } else {
      saveScore = confirm(
        `🎮 Game Over!\n\n` +
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
      `🎮 Game Over!\n\n` +
      `Player: ${currentPlayer}\n` +
      `Final Score: ${score}\n\n` +
      `Would you like to save your score to the leaderboard?`
    );
  }
  
  if (saveScore) {
    if (existingPlayer) {
      // Override existing score
      updatePlayerScore(currentPlayer, score);
      updateLeaderboardDisplay();
      console.log("Score updated for existing player");
      
      setTimeout(() => {
        if (score > existingPlayer.score) {
          alert(`🏆 New High Score!\n\nYour score of ${score} has replaced your previous best of ${existingPlayer.score}!\n\nCheck the leaderboard to see your ranking!`);
        } else {
          alert(`📝 Score Updated!\n\nYour score of ${score} has replaced your previous score of ${existingPlayer.score}.\n\nCheck the leaderboard to see your ranking!`);
        }
      }, 500);
    } else {
      // Add new player
      addToLeaderboard(currentPlayer, score);
      updateLeaderboardDisplay();
      console.log("Score added for new player");
      
      setTimeout(() => {
        alert(`🏆 Score saved! You scored ${score} points!\n\nWelcome to the leaderboard! Check your ranking!`);
      }, 500);
    }
  } else {
    console.log("Player chose not to save score");
    
    setTimeout(() => {
      alert(`Thanks for playing! Your score of ${score} was not saved to the leaderboard.`);
    }, 500);
  }
}

// Leaderboard functions
function addToLeaderboard(playerName, playerScore) {
  console.log("Adding to leaderboard:", playerName, playerScore);
  leaderboard.push({ name: playerName, score: playerScore });
  leaderboard.sort((a, b) => b.score - a.score);
  
  // Keep only top 10 scores
  if (leaderboard.length > 10) {
    leaderboard = leaderboard.slice(0, 10);
  }
  
  // Save to localStorage
  localStorage.setItem('ezyPayLeaderboard', JSON.stringify(leaderboard));
  console.log("Current leaderboard:", leaderboard);
}

function updatePlayerScore(playerName, newScore) {
  console.log("Updating player score:", playerName, newScore);
  
  // Find and update the existing player's score
  let playerIndex = leaderboard.findIndex(entry => entry.name === playerName);
  if (playerIndex !== -1) {
    leaderboard[playerIndex].score = newScore;
    leaderboard.sort((a, b) => b.score - a.score);
    
    // Keep only top 10 scores
    if (leaderboard.length > 10) {
      leaderboard = leaderboard.slice(0, 10);
    }
    
    // Save to localStorage
    localStorage.setItem('ezyPayLeaderboard', JSON.stringify(leaderboard));
    console.log("Player score updated. Current leaderboard:", leaderboard);
  } else {
    console.log("Player not found, adding as new player");
    addToLeaderboard(playerName, newScore);
  }
}

function loadLeaderboard() {
  let saved = localStorage.getItem('ezyPayLeaderboard');
  if (saved) {
    leaderboard = JSON.parse(saved);
  }
  updateLeaderboardDisplay();
}

function updateLeaderboardDisplay() {
  let leaderboardDiv = document.getElementById('leaderboardList');
  
  if (leaderboard.length === 0) {
    leaderboardDiv.innerHTML = '<div class="leaderboard-item"><span>No scores yet</span><span>0</span></div>';
    return;
  }
  
  leaderboardDiv.innerHTML = '';
  leaderboard.forEach((entry, index) => {
    let item = document.createElement('div');
    item.className = 'leaderboard-item';
    if (index === 0) item.style.background = 'rgba(255, 215, 0, 0.2)';
    
    let medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
    item.innerHTML = `<span>${medal} ${entry.name}</span><span>${entry.score}</span>`;
    leaderboardDiv.appendChild(item);
  });
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
    // EzyPay themed ship
    let shipColor = keyIsDown(LEFT_ARROW) || keyIsDown(RIGHT_ARROW) 
      ? color(150, 220, 255) : color(100, 200, 255);
    fill(shipColor);
    noStroke();
    
    // Main ship body
    triangle(this.x - this.width / 2, this.y + this.height / 2, 
             this.x, this.y - this.height / 2, 
             this.x + this.width / 2, this.y + this.height / 2);
    
    // EzyPay logo on ship
    fill(255, 215, 0);
    textSize(12);
    textAlign(CENTER);
    text("EP", this.x, this.y);
    
    // Thruster
    fill(255, 150, 0);
    triangle(this.x - 5, this.y + this.height / 2, 
             this.x, this.y + this.height / 2 + 10, 
             this.x + 5, this.y + this.height / 2);
    
    // Rapid fire indicator
    if (rapidFireActive) {
      fill(255, 255, 0, 150);
      ellipse(this.x, this.y - this.height - 10, 20, 20);
      fill(255, 255, 0);
      textSize(10);
      text("⚡", this.x, this.y - this.height - 10);
    }
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
    if (this.isRapidFire) {
      // Rapid fire bullets are more intense
      fill(255, 100, 100);
      noStroke();
      rect(this.x - 3, this.y - 15, 6, 30);
      
      // Add intense glow effect
      fill(255, 255, 0, 150);
      rect(this.x - 4, this.y - 16, 8, 32);
    } else {
      // Normal bullets
      fill(255, 255, 0);
      noStroke();
      rect(this.x - 2, this.y - 10, 4, 20);
      
      // Add glow effect
      fill(255, 255, 0, 100);
      rect(this.x - 3, this.y - 11, 6, 22);
    }
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
    
    // Add competitor name
    fill(255);
    textSize(10);
    text(this.competitor.name, this.x, this.y + this.size/2 + 15);
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
    this.life = 255;
    this.size = random(2, 5);
    this.color = color || color(255, 100, 0);
  }
  
  show() {
    fill(red(this.color), green(this.color), blue(this.color), this.life);
    noStroke();
    ellipse(this.x, this.y, this.size);
  }
  
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life -= 5;
  }
}

function createParticles(x, y, color) {
  if (particles.length < 100) {
    for (let i = 0; i < 20; i++) {
      let angle = random(TWO_PI);
      let speed = random(1, 4);
      particles.push(new Particle(x, y, color));
    }
  }
}



// Override the default game over behavior to save score
let originalGameOver = false;

// Check for game over in the main loop
function checkGameOver() {
  if (gameOver && !originalGameOver) {
    originalGameOver = true;
    endGame();
  }
}

// Test function for debugging
function testLeaderboard() {
  console.log("Testing leaderboard...");
  console.log("Current leaderboard:", leaderboard);
  console.log("Current player:", currentPlayer);
  console.log("Current score:", score);
  
  // Test adding a score
  if (currentPlayer) {
    addToLeaderboard(currentPlayer, Math.floor(Math.random() * 1000) + 100);
  } else {
    addToLeaderboard("TestPlayer", Math.floor(Math.random() * 1000) + 100);
  }
}

// Reset leaderboard function
function resetLeaderboard() {
  if (confirm("Are you sure you want to reset the leaderboard? This will delete all scores!")) {
    leaderboard = [];
    localStorage.removeItem('ezyPayLeaderboard');
    updateLeaderboardDisplay();
    console.log("Leaderboard reset successfully");
  }
}

// Save current score function (manual save during game)
function saveCurrentScore() {
  if (currentPlayer && score > 0 && !gameOver) {
    let existingPlayer = leaderboard.find(entry => entry.name === currentPlayer);
    let confirmMessage = "";
    
    if (existingPlayer) {
      if (score > existingPlayer.score) {
        confirmMessage = `Save your current score of ${score} to the leaderboard?\n\nThis will replace your previous best of ${existingPlayer.score}.\n\n🎉 NEW HIGH SCORE!`;
      } else {
        confirmMessage = `Save your current score of ${score} to the leaderboard?\n\nThis will replace your current score of ${existingPlayer.score}.\n\nNote: This score is lower than your best.`;
      }
    } else {
      confirmMessage = `Save your current score of ${score} to the leaderboard?\n\nNote: You can also wait until the game ends for the automatic popup.`;
    }
    
    let confirmSave = confirm(confirmMessage);
    if (confirmSave) {
      if (existingPlayer) {
        updatePlayerScore(currentPlayer, score);
      } else {
        addToLeaderboard(currentPlayer, score);
      }
      updateLeaderboardDisplay();
      alert(`Score of ${score} saved for ${currentPlayer}!`);
    }
  } else if (!currentPlayer) {
    alert("Please start a game first!");
  } else if (score === 0) {
    alert("No score to save! Play the game first.");
  } else if (gameOver) {
    alert("Game is over! The score save popup should have appeared automatically.");
  }
}

// Test rapid fire function
function testRapidFire() {
  if (gameStarted && !gameOver) {
    rapidFireActive = true;
    rapidFireEndTime = millis() + 10000; // 10 seconds
    console.log("Manual Rapid Fire activated for testing!");
    alert("Rapid Fire activated for 10 seconds!");
  } else {
    alert("Please start a game first!");
  }
}
