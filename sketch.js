let playerImg;
let coinImg;
let enemyImg;

// 1. Preload Gambar
function preload() {
  playerImg = loadImage("wowo.png");
  coinImg = loadImage("mbg.png");
  enemyImg = loadImage("enemy.png");
}

// Web Audio Synthesizer for Retro Sound Effects
class SoundSynth {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  playJump() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(
      600,
      this.ctx.currentTime + 0.15,
    );
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  playCoin() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(987.77, this.ctx.currentTime); // B5
    osc.frequency.setValueAtTime(1318.51, this.ctx.currentTime + 0.08); // E6
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  playStomp() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(250, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }

  playBlockHit() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.setValueAtTime(300, this.ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playGameOver() {
    if (!this.ctx) return;
    const notes = [400, 350, 300, 250, 200, 150];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.08);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(
        0.01,
        this.ctx.currentTime + (idx + 1) * 0.08,
      );
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(this.ctx.currentTime + idx * 0.08);
      osc.stop(this.ctx.currentTime + (idx + 1) * 0.08);
    });
  }

  playWin() {
    if (!this.ctx) return;
    const notes = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99]; // C E G C E G
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.09);
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime + idx * 0.09);
      gain.gain.exponentialRampToValueAtTime(
        0.01,
        this.ctx.currentTime + idx * 0.09 + 0.2,
      );
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(this.ctx.currentTime + idx * 0.09);
      osc.stop(this.ctx.currentTime + idx * 0.09 + 0.2);
    });
  }
}

const audio = new SoundSynth();

// Game Global States
const STATE_START = "START";
const STATE_PLAYING = "PLAYING";
const STATE_GAMEOVER = "GAMEOVER";
const STATE_WIN = "WIN";

let gameState = STATE_START;
let score = 0;
let coinsCollected = 0;
let lives = 3;
let cameraX = 0;
const LEVEL_WIDTH = 3600;
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 450;
const GROUND_Y = 370;

// Entities
let player;
let platforms = [];
let blocks = [];
let coins = [];
let enemies = [];
let particles = [];
let flagPole;
let clouds = [];
let hills = [];

// Touch controls input states
let touchLeft = false;
let touchRight = false;
let touchJump = false;

// Player Class (PNG Custom Image)
class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 36; // Lebar gambar (sesuaikan jika perlu)
    this.h = 48; // Tinggi gambar (sesuaikan jika perlu)
    this.vx = 0;
    this.vy = 0;
    this.speed = 4.5;
    this.jumpForce = -11.5;
    this.gravity = 0.55;
    this.isGrounded = false;
    this.facing = "right";
    this.walkFrame = 0;
    this.invulnerableTimer = 0;
  }

  update() {
    this.vx = 0;
    if (keyIsDown(65) || keyIsDown(LEFT_ARROW) || touchLeft) {
      this.vx = -this.speed;
      this.facing = "left";
    }
    if (keyIsDown(68) || keyIsDown(RIGHT_ARROW) || touchRight) {
      this.vx = this.speed;
      this.facing = "right";
    }

    this.vy += this.gravity;

    this.x += this.vx;
    this.handleHorizontalCollisions();

    this.y += this.vy;
    this.isGrounded = false;
    this.handleVerticalCollisions();

    if (this.x < 0) this.x = 0;
    if (this.x + this.w > LEVEL_WIDTH) this.x = LEVEL_WIDTH - this.w;

    if (this.y > CANVAS_HEIGHT + 100) {
      handlePlayerDeath("Jatuh ke jurang!");
    }

    if (Math.abs(this.vx) > 0.1 && this.isGrounded) {
      this.walkFrame += 0.2;
    } else {
      this.walkFrame = 0;
    }

    if (this.invulnerableTimer > 0) this.invulnerableTimer--;
  }

  jump() {
    if (this.isGrounded) {
      this.vy = this.jumpForce;
      this.isGrounded = false;
      audio.playJump();
    }
  }

  handleHorizontalCollisions() {
    const solids = [...platforms, ...blocks];
    for (let b of solids) {
      if (rectOverlap(this.x, this.y, this.w, this.h, b.x, b.y, b.w, b.h)) {
        if (this.vx > 0) {
          this.x = b.x - this.w;
        } else if (this.vx < 0) {
          this.x = b.x + b.w;
        }
      }
    }
  }

  handleVerticalCollisions() {
    const solids = [...platforms, ...blocks];
    for (let b of solids) {
      if (rectOverlap(this.x, this.y, this.w, this.h, b.x, b.y, b.w, b.h)) {
        if (this.vy > 0) {
          this.y = b.y - this.h;
          this.vy = 0;
          this.isGrounded = true;
        } else if (this.vy < 0) {
          this.y = b.y + b.h;
          this.vy = 0;
          if (b instanceof Block) {
            b.hit();
          }
        }
      }
    }
  }

  // 2. Render Gambar PNG
  draw() {
    push();
    translate(this.x + this.w / 2, this.y + this.h / 2);

    // Balikkan gambar secara horizontal saat menghadap kiri
    if (this.facing === "left") scale(-1, 1);

    // Efek kedip saat terkena damage / invulnerable
    if (this.invulnerableTimer % 6 > 3) {
      pop();
      return;
    }

    // Tampilkan gambar PNG
    imageMode(CENTER);
    image(playerImg, 0, 0, this.w, this.h);

    pop();
  }
}

// Block Class
class Block {
  constructor(x, y, w = 32, h = 32, type = "question", content = "coin") {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.type = type;
    this.content = content;
    this.isHit = false;
    this.bounceY = 0;
  }

  hit() {
    if (this.isHit && this.type === "question") return;

    this.bounceY = -8;
    audio.playBlockHit();

    if (this.type === "question" && !this.isHit) {
      this.isHit = true;
      if (this.content === "coin") {
        coinsCollected++;
        score += 200;
        audio.playCoin();
        createParticles(this.x + this.w / 2, this.y - 10, "#facc15", 8);
      }
    } else if (this.type === "brick") {
      score += 50;
      createParticles(this.x + this.w / 2, this.y + this.h / 2, "#b45309", 10);
    }
  }

  update() {
    if (this.bounceY < 0) {
      this.bounceY += 1;
    }
  }

  draw() {
    this.update();
    push();
    translate(this.x, this.y + this.bounceY);

    if (this.type === "question") {
      if (!this.isHit) {
        fill(245, 158, 11);
        stroke(180, 83, 9);
        strokeWeight(2);
        rect(0, 0, this.w, this.h, 4);

        noStroke();
        fill(255);
        textFont("Press Start 2P");
        textSize(14);
        textAlign(CENTER, CENTER);
        text("?", this.w / 2, this.h / 2 + 1);

        fill(180, 83, 9);
        rect(3, 3, 3, 3);
        rect(this.w - 6, 3, 3, 3);
        rect(3, this.h - 6, 3, 3);
        rect(this.w - 6, this.h - 6, 3, 3);
      } else {
        fill(180, 83, 9);
        stroke(120, 53, 15);
        strokeWeight(2);
        rect(0, 0, this.w, this.h, 4);
        fill(120, 53, 15);
        rect(4, 4, this.w - 8, this.h - 8);
      }
    } else {
      fill(180, 83, 9);
      stroke(120, 53, 15);
      strokeWeight(2);
      rect(0, 0, this.w, this.h, 2);
      stroke(120, 53, 15);
      line(0, 10, this.w, 10);
      line(0, 22, this.w, 22);
      line(16, 0, 16, 10);
      line(8, 10, 8, 22);
      line(24, 10, 24, 22);
      line(16, 22, 16, this.h);
    }
    pop();
  }
}

// Animated Coin Class
class Coin {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 24; // Sesuaikan lebar koin
    this.h = 24; // Sesuaikan tinggi koin
    this.animAngle = Math.random() * Math.PI;
    this.collected = false;
  }

  update() {
    this.animAngle += 0.08;
  }

  draw() {
    if (this.collected) return;
    this.update();

    push();
    translate(this.x + this.w / 2, this.y + this.h / 2);

    // Efek pipih/berputar saat beranimasi
    const scaleX = Math.sin(this.animAngle);
    scale(scaleX, 1);

    // Render Gambar PNG Koin
    imageMode(CENTER);
    image(coinImg, 0, 0, this.w, this.h);

    pop();
  }
}

// Enemy Class
class Enemy {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 32;
    this.h = 32;
    this.vx = -1.2;
    this.vy = 0;
    this.isSquished = false;
    this.squishTimer = 0;
    this.walkFrame = 0;
  }

  update() {
    if (this.isSquished) {
      this.squishTimer++;
      return;
    }

    this.x += this.vx;
    this.walkFrame += 0.15;

    let collided = false;
    const solids = [...platforms, ...blocks];
    for (let b of solids) {
      if (rectOverlap(this.x, this.y, this.w, this.h, b.x, b.y, b.w, b.h)) {
        collided = true;
        break;
      }
    }
    if (collided || this.x < 10 || this.x > LEVEL_WIDTH - 40) {
      this.vx *= -1;
    }
  }

  draw() {
    push();
    translate(this.x + this.w / 2, this.y + this.h / 2);

    if (this.isSquished) {
      // Efek gepeng saat musuh diinjak
      scale(1.2, 0.3);
      imageMode(CENTER);
      image(enemyImg, 0, 0, this.w, this.h);
      pop();
      return;
    }

    // Membalik arah gambar saat jalan ke kanan/kiri
    if (this.vx > 0) scale(-1, 1);

    // Tampilkan Gambar PNG Musuh
    imageMode(CENTER);
    image(enemyImg, 0, 0, this.w, this.h);

    pop();
  }
}

// Goal Flag Post Class
class FlagPole {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 20;
    this.h = 240;
  }

  draw() {
    push();
    fill(100, 116, 139);
    rect(this.x - 10, this.y + this.h - 20, 40, 20, 4);

    fill(226, 232, 240);
    rect(this.x, this.y, 8, this.h, 2);

    fill(250, 204, 21);
    ellipse(this.x + 4, this.y, 20, 20);

    fill(34, 197, 94);
    triangle(
      this.x + 8,
      this.y + 15,
      this.x + 60,
      this.y + 35,
      this.x + 8,
      this.y + 55,
    );
    pop();
  }
}

// Particle FX Class
class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 6;
    this.vy = (Math.random() - 0.8) * 6;
    this.color = color;
    this.size = Math.random() * 5 + 3;
    this.alpha = 255;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.3;
    this.alpha -= 8;
  }

  draw() {
    push();
    noStroke();
    fill(red(this.color), green(this.color), blue(this.color), this.alpha);
    rect(this.x, this.y, this.size, this.size);
    pop();
  }
}

function createParticles(x, y, colorStr, count = 6) {
  for (let i = 0; i < count; i++) {
    particles.push(new Particle(x, y, colorStr));
  }
}

function rectOverlap(x1, y1, w1, h1, x2, y2, w2, h2) {
  return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
}

function initLevel() {
  platforms = [];
  blocks = [];
  coins = [];
  enemies = [];
  particles = [];

  const groundSegments = [
    { start: 0, end: 700 },
    { start: 800, end: 1500 },
    { start: 1620, end: 2400 },
    { start: 2500, end: LEVEL_WIDTH },
  ];

  for (let seg of groundSegments) {
    platforms.push({
      x: seg.start,
      y: GROUND_Y,
      w: seg.end - seg.start,
      h: 80,
      type: "ground",
    });
  }

  platforms.push({ x: 350, y: 260, w: 120, h: 20, type: "wood" });
  platforms.push({ x: 1050, y: 250, w: 160, h: 20, type: "wood" });
  platforms.push({ x: 1800, y: 230, w: 140, h: 20, type: "wood" });
  platforms.push({ x: 2700, y: 260, w: 180, h: 20, type: "wood" });

  blocks.push(new Block(220, 250, 32, 32, "question", "coin"));
  blocks.push(new Block(252, 250, 32, 32, "brick"));
  blocks.push(new Block(284, 250, 32, 32, "question", "coin"));
  blocks.push(new Block(316, 250, 32, 32, "brick"));

  blocks.push(new Block(600, 240, 32, 32, "question", "coin"));
  blocks.push(new Block(632, 170, 32, 32, "question", "coin"));

  blocks.push(new Block(1200, 220, 32, 32, "brick"));
  blocks.push(new Block(1232, 220, 32, 32, "question", "coin"));
  blocks.push(new Block(1264, 220, 32, 32, "brick"));

  blocks.push(new Block(2000, 240, 32, 32, "question", "coin"));
  blocks.push(new Block(2032, 240, 32, 32, "question", "coin"));

  const coinPositions = [
    [150, 320],
    [180, 320],
    [370, 220],
    [410, 220],
    [880, 320],
    [920, 320],
    [1100, 200],
    [1130, 200],
    [1680, 320],
    [1720, 320],
    [1850, 180],
    [2200, 320],
    [2240, 320],
  ];
  for (let pos of coinPositions) {
    coins.push(new Coin(pos[0], pos[1]));
  }

  enemies.push(new Enemy(450, GROUND_Y - 28));
  enemies.push(new Enemy(950, GROUND_Y - 28));
  enemies.push(new Enemy(1300, GROUND_Y - 28));
  enemies.push(new Enemy(1750, GROUND_Y - 28));
  enemies.push(new Enemy(2150, GROUND_Y - 28));
  enemies.push(new Enemy(2800, GROUND_Y - 28));

  flagPole = new FlagPole(3300, GROUND_Y - 240);

  clouds = [];
  for (let i = 0; i < 20; i++) {
    clouds.push({
      x: Math.random() * LEVEL_WIDTH,
      y: Math.random() * 140 + 30,
      scale: Math.random() * 0.6 + 0.6,
    });
  }

  hills = [];
  for (let i = 0; i < 15; i++) {
    hills.push({
      x: i * 260 + Math.random() * 50,
      w: Math.random() * 120 + 100,
      h: Math.random() * 80 + 60,
    });
  }

  player = new Player(80, GROUND_Y - 50);
}

function resetGameFull() {
  score = 0;
  coinsCollected = 0;
  lives = 3;
  initLevel();
}

function handlePlayerDeath(reason) {
  lives--;
  audio.playGameOver();
  if (lives <= 0) {
    gameState = STATE_GAMEOVER;
  } else {
    player.x = Math.max(80, cameraX + 50);
    player.y = 100;
    player.vy = 0;
    player.invulnerableTimer = 90;
  }
}

// p5.js Setup
function setup() {
  const container = document.getElementById("canvas-container");
  const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
  canvas.parent("canvas-container");
  textFont("Press Start 2P");

  setupTouchEvents();
  resetGameFull();
  gameState = STATE_START;
}

// p5.js Draw Loop
function draw() {
  background(125, 211, 252);

  if (gameState === STATE_START) {
    drawStartScreen();
    return;
  }

  if (gameState === STATE_PLAYING) {
    updateGameLogic();
  }

  push();
  const targetCamX = player.x - CANVAS_WIDTH / 3;
  cameraX = lerp(cameraX, targetCamX, 0.1);
  cameraX = constrain(cameraX, 0, LEVEL_WIDTH - CANVAS_WIDTH);

  translate(-cameraX, 0);

  drawParallaxBackground();
  drawPlatforms();

  for (let b of blocks) b.draw();
  for (let c of coins) c.draw();
  for (let e of enemies) e.draw();

  flagPole.draw();
  player.draw();

  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    particles[i].draw();
    if (particles[i].alpha <= 0) particles.splice(i, 1);
  }

  pop();

  drawHUD();

  if (gameState === STATE_GAMEOVER) {
    drawGameOverScreen();
  } else if (gameState === STATE_WIN) {
    drawWinScreen();
  }
}

function updateGameLogic() {
  audio.init();
  player.update();

  for (let c of coins) {
    if (
      !c.collected &&
      rectOverlap(player.x, player.y, player.w, player.h, c.x, c.y, c.w, c.h)
    ) {
      c.collected = true;
      coinsCollected++;
      score += 100;
      audio.playCoin();
      createParticles(c.x + c.w / 2, c.y + c.h / 2, "#facc15", 6);
    }
  }

  for (let i = enemies.length - 1; i >= 0; i--) {
    let e = enemies[i];
    e.update();

    if (e.isSquished && e.squishTimer > 30) {
      enemies.splice(i, 1);
      continue;
    }

    if (
      !e.isSquished &&
      rectOverlap(player.x, player.y, player.w, player.h, e.x, e.y, e.w, e.h)
    ) {
      if (player.vy > 0 && player.y + player.h - player.vy <= e.y + 12) {
        e.isSquished = true;
        player.vy = -8;
        score += 200;
        audio.playStomp();
        createParticles(e.x + e.w / 2, e.y, "#92400e", 8);
      } else if (player.invulnerableTimer <= 0) {
        handlePlayerDeath("Tersentuh musuh!");
      }
    }
  }

  if (
    rectOverlap(
      player.x,
      player.y,
      player.w,
      player.h,
      flagPole.x,
      flagPole.y,
      flagPole.w,
      flagPole.h,
    )
  ) {
    gameState = STATE_WIN;
    audio.playWin();
  }
}

function drawParallaxBackground() {
  fill(34, 197, 94);
  noStroke();
  for (let h of hills) {
    ellipse(h.x, GROUND_Y, h.w, h.h);
  }

  fill(255, 255, 255, 220);
  for (let cl of clouds) {
    push();
    translate(cl.x, cl.y);
    scale(cl.scale);
    ellipse(0, 0, 50, 30);
    ellipse(20, -10, 40, 30);
    ellipse(-20, -5, 35, 25);
    pop();
  }
}

function drawPlatforms() {
  for (let p of platforms) {
    if (p.type === "ground") {
      fill(34, 197, 94);
      rect(p.x, p.y, p.w, 16);
      fill(180, 83, 9);
      rect(p.x, p.y + 16, p.w, p.h - 16);

      fill(120, 53, 15);
      for (let rx = p.x + 10; rx < p.x + p.w - 10; rx += 40) {
        rect(rx, p.y + 26, 12, 12, 2);
        rect(rx + 20, p.y + 48, 12, 12, 2);
      }
    } else {
      fill(217, 119, 6);
      stroke(146, 64, 14);
      strokeWeight(2);
      rect(p.x, p.y, p.w, p.h, 4);
    }
  }
}

function drawHUD() {
  push();
  fill(15, 23, 42, 180);
  noStroke();
  rect(12, 12, CANVAS_WIDTH - 24, 42, 8);

  fill(255);
  textSize(11);
  textAlign(LEFT, CENTER);

  text(`WOWO`, 30, 24);
  fill(250, 204, 21);
  text(`${String(score).padStart(6, "0")}`, 30, 40);

  fill(250, 204, 21);
  ellipse(230, 32, 12, 16);
  fill(255);
  text(`x ${String(coinsCollected).padStart(2, "0")}`, 245, 33);

  fill(225, 29, 72);
  text(`LIVES:`, 420, 33);
  fill(255);
  text(`x ${lives}`, 490, 33);

  const progress = constrain(player.x / LEVEL_WIDTH, 0, 1);
  fill(51, 65, 85);
  rect(600, 26, 150, 12, 6);
  fill(34, 197, 94);
  rect(600, 26, 150 * progress, 12, 6);
  fill(255);
  textSize(9);
  text(`GOAL`, 712, 18);

  pop();
}

function drawStartScreen() {
  fill(15, 23, 42, 220);
  rect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  textAlign(CENTER, CENTER);
  fill(250, 204, 21);
  textSize(26);
  text("SUPER WOWO 2D", CANVAS_WIDTH / 2, 130);

  fill(255);
  textSize(12);
  text("PETUNJUK PERMAINAN:", CANVAS_WIDTH / 2, 200);
  fill(203, 213, 225);
  textSize(10);
  text(
    "- Gunakan A/D atau Panah Kiri/Kanan untuk Bergerak",
    CANVAS_WIDTH / 2,
    230,
  );
  text("- Tekan W / Panah Atas / Spasi untuk Melompat", CANVAS_WIDTH / 2, 250);
  text("- Injak Musuh untuk mengalahkan mereka (+200)", CANVAS_WIDTH / 2, 270);
  text("- Sundul Balok '?' untuk mengumpulkan Koin!", CANVAS_WIDTH / 2, 290);

  fill(239, 68, 68);
  textSize(12);
  text("KLIK / TEKAN SPASI UNTUK MEMULAI", CANVAS_WIDTH / 2, 350);
}

function drawGameOverScreen() {
  fill(15, 23, 42, 210);
  rect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  textAlign(CENTER, CENTER);
  fill(239, 68, 68);
  textSize(32);
  text("GAME OVER", CANVAS_WIDTH / 2, 160);

  fill(255);
  textSize(12);
  text(`SKOR AKHIR: ${score}`, CANVAS_WIDTH / 2, 230);

  fill(250, 204, 21);
  textSize(11);
  text("TEKAN 'R' ATAU SPASI UNTUK MAIN LAGI", CANVAS_WIDTH / 2, 310);
}

function drawWinScreen() {
  fill(15, 23, 42, 210);
  rect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  textAlign(CENTER, CENTER);
  fill(34, 197, 94);
  textSize(28);
  text("LEVEL SELESAI!", CANVAS_WIDTH / 2, 150);

  fill(255);
  textSize(12);
  text(`SKOR TOTAL: ${score}`, CANVAS_WIDTH / 2, 210);
  text(`TOTAL KOIN: ${coinsCollected}`, CANVAS_WIDTH / 2, 240);

  fill(250, 204, 21);
  textSize(11);
  text("TEKAN 'R' ATAU SPASI UNTUK MAIN LAGI", CANVAS_WIDTH / 2, 320);
}

// Input Handling
function keyPressed() {
  audio.init();

  if (gameState === STATE_START) {
    if (keyCode === 32 || keyCode === 13) {
      gameState = STATE_PLAYING;
    }
  } else if (gameState === STATE_PLAYING) {
    if (keyCode === 87 || keyCode === UP_ARROW || keyCode === 32) {
      player.jump();
    }
  } else if (gameState === STATE_GAMEOVER || gameState === STATE_WIN) {
    if (keyCode === 82 || keyCode === 32 || keyCode === 13) {
      resetGameFull();
      gameState = STATE_PLAYING;
    }
  }
}

function mousePressed() {
  audio.init();
  if (gameState === STATE_START) {
    gameState = STATE_PLAYING;
  } else if (gameState === STATE_GAMEOVER || gameState === STATE_WIN) {
    resetGameFull();
    gameState = STATE_PLAYING;
  }
}

function setupTouchEvents() {
  const btnLeft = document.getElementById("btn-left");
  const btnRight = document.getElementById("btn-right");
  const btnJump = document.getElementById("btn-jump");

  btnLeft.addEventListener("touchstart", (e) => {
    e.preventDefault();
    touchLeft = true;
  });
  btnLeft.addEventListener("touchend", (e) => {
    e.preventDefault();
    touchLeft = false;
  });
  btnLeft.addEventListener("mousedown", () => (touchLeft = true));
  btnLeft.addEventListener("mouseup", () => (touchLeft = false));

  btnRight.addEventListener("touchstart", (e) => {
    e.preventDefault();
    touchRight = true;
  });
  btnRight.addEventListener("touchend", (e) => {
    e.preventDefault();
    touchRight = false;
  });
  btnRight.addEventListener("mousedown", () => (touchRight = true));
  btnRight.addEventListener("mouseup", () => (touchRight = false));

  btnJump.addEventListener("touchstart", (e) => {
    e.preventDefault();
    if (gameState === STATE_PLAYING) player.jump();
    else mousePressed();
  });
  btnJump.addEventListener("click", () => {
    if (gameState === STATE_PLAYING) player.jump();
    else mousePressed();
  });
}
