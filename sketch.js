// ==========================================
// 1. DEKLARASI VARIABEL GLOBAL & PRELOAD
// ==========================================
let playerImg;
let coinImg;
let enemyImg;
let bgImg;

// Preload memuat aset gambar sebelum game dimulai
function preload() {
  playerImg = loadImage("wowo.png");
  coinImg = loadImage("mbg.png");
  enemyImg = loadImage("enemy.png");
  bgImg = loadImage("bg.png");
}

// ==========================================
// 2. AUDIO SYNTHESIZER (WEB AUDIO API)
// ==========================================
// Generasi efek suara retro secara real-time tanpa file audio
class SoundSynth {
  constructor() {
    this.ctx = null;
  }

  // Inisialisasi AudioContext browser
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  // Suara Lompat (Square Wave)
  playJump() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  // Suara Koin (Sine Wave, 2 Nada)
  playCoin() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(987.77, this.ctx.currentTime); // Nada B5
    osc.frequency.setValueAtTime(1318.51, this.ctx.currentTime + 0.08); // Nada E6
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  // Suara Menginjak Musuh (Triangle Wave)
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

  // Suara Game Over (Sawtooth Wave, Melodi Turun)
  playGameOver() {
    if (!this.ctx) return;
    const notes = [400, 350, 300, 250, 200, 150];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.08);
      gain.gain.setValueAtTime(0.12, this.ctx.currentTime + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + (idx + 1) * 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(this.ctx.currentTime + idx * 0.08);
      osc.stop(this.ctx.currentTime + (idx + 1) * 0.08);
    });
  }

  // Suara Menang / Win (Triangle Wave, Melodi Naik)
  playWin() {
    if (!this.ctx) return;
    const notes = [261.63, 329.63, 392.0, 523.25, 659.25, 783.99]; // Tangga nada C-E-G-C-E-G
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.09);
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime + idx * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + idx * 0.09 + 0.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(this.ctx.currentTime + idx * 0.09);
      osc.stop(this.ctx.currentTime + idx * 0.09 + 0.2);
    });
  }
}

const audio = new SoundSynth();

// ==========================================
// 3. KONFIGURASI & KONDISI GAME GLOBAL
// ==========================================
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

// Variabel Objek & Entitas Game
let player;
let platforms = [];
let coins = [];
let enemies = [];
let particles = [];
let flagPole;
let clouds = [];
let hills = [];

// Status Kontrol Layar Sentuh
let touchLeft = false;
let touchRight = false;
let touchJump = false;

// ==========================================
// 4. KELAS KARAKTER PEMAIN (PLAYER)
// ==========================================
class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 60;
    this.h = 90;
    this.vx = 0;
    this.vy = 0;
    this.speed = 4.5;
    this.jumpForce = -11.5;
    this.gravity = 0.55;
    this.isGrounded = false;
    this.facing = "right";
    this.walkFrame = 0;
    this.invulnerableTimer = 0; // Durasi kebal sementara setelah terkena damage
  }

  update() {
    // Pengendalian Kecepatan Horizontal
    this.vx = 0;
    if (keyIsDown(65) || keyIsDown(LEFT_ARROW) || touchLeft) {
      this.vx = -this.speed;
      this.facing = "left";
    }
    if (keyIsDown(68) || keyIsDown(RIGHT_ARROW) || touchRight) {
      this.vx = this.speed;
      this.facing = "right";
    }

    // Penerapan Gravitasi
    this.vy += this.gravity;

    // Pergerakan Sumbu X dan Deteksi Tabrakan Samping
    this.x += this.vx;
    this.handleHorizontalCollisions();

    // Pergerakan Sumbu Y dan Deteksi Tabrakan Atas/Bawah
    this.y += this.vy;
    this.isGrounded = false;
    this.handleVerticalCollisions();

    // Batas Area Level
    if (this.x < 0) this.x = 0;
    if (this.x + this.w > LEVEL_WIDTH) this.x = LEVEL_WIDTH - this.w;

    // Deteksi Jatuh ke Jurang
    if (this.y > CANVAS_HEIGHT + 100) {
      handlePlayerDeath("Jatuh ke jurang!");
    }

    // Animasi Langkah
    if (Math.abs(this.vx) > 0.1 && this.isGrounded) {
      this.walkFrame += 0.2;
    } else {
      this.walkFrame = 0;
    }

    // Pengurangan Durasi Kebal
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
    for (let b of platforms) {
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
    for (let b of platforms) {
      if (rectOverlap(this.x, this.y, this.w, this.h, b.x, b.y, b.w, b.h)) {
        if (this.vy > 0) {
          this.y = b.y - this.h;
          this.vy = 0;
          this.isGrounded = true;
        } else if (this.vy < 0) {
          this.y = b.y + b.h;
          this.vy = 0;
        }
      }
    }
  }

  draw() {
    push();
    translate(this.x + this.w / 2, this.y + this.h / 2);

    // Membalik Gambar Sesuai Arah Hadap
    if (this.facing === "left") scale(-1, 1);

    // Efek Kedip Saat Kondisi Kebal/Invulnerable
    if (this.invulnerableTimer % 6 > 3) {
      pop();
      return;
    }

    imageMode(CENTER);
    image(playerImg, 0, 0, this.w, this.h);
    pop();
  }
}

// ==========================================
// 5. KELAS KOIN BERANIMASI (COIN)
// ==========================================
class Coin {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 40;
    this.h = 40;
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

    // Animasi Pipih Vertikal (Efek Putaran 3D)
    const scaleX = Math.sin(this.animAngle);
    scale(scaleX, 1);

    imageMode(CENTER);
    image(coinImg, 0, 0, this.w, this.h);
    pop();
  }
}

// ==========================================
// 6. KELAS MUSUH (ENEMY)
// ==========================================
class Enemy {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 48;
    this.h = 48;
    this.vx = -1.2;
    this.vy = 0;
    this.isSquished = false;
    this.squishTimer = 0;
    this.walkFrame = 0;
  }

  update() {
    // Jika Terinjak, Tahan Posisi Sebelum Hilang
    if (this.isSquished) {
      this.squishTimer++;
      return;
    }

    const oldX = this.x;
    this.x += this.vx;
    this.walkFrame += 0.15;

    // Berbalik Arah Jika Menabrak Platform
    for (const b of platforms) {
      if (rectOverlap(this.x, this.y, this.w, this.h - 4, b.x, b.y, b.w, b.h)) {
        this.x = oldX;
        this.vx *= -1;
        break;
      }
    }

    // Patroli Pintar: Berbalik Arah Jika Mendeteksi Jurang di Depan
    let checkPointX = this.vx > 0 ? this.x + this.w : this.x;
    let isGroundAhead = false;

    for (let b of platforms) {
      if (
        checkPointX >= b.x &&
        checkPointX <= b.x + b.w &&
        this.y + this.h >= b.y &&
        this.y + this.h <= b.y + b.h
      ) {
        isGroundAhead = true;
        break;
      }
    }

    if (!isGroundAhead) {
      this.x = oldX;
      this.vx *= -1;
    }

    // Batas Tepi Level
    if (this.x <= 10) {
      this.x = 10;
      this.vx = Math.abs(this.vx);
    } else if (this.x >= LEVEL_WIDTH - this.w) {
      this.x = LEVEL_WIDTH - this.w;
      this.vx = -Math.abs(this.vx);
    }
  }

  draw() {
    push();
    translate(this.x + this.w / 2, this.y + this.h / 2);

    // Gambar Musuh Gepeng Saat Terinjak
    if (this.isSquished) {
      scale(1.2, 0.3);
      imageMode(CENTER);
      image(enemyImg, 0, 0, this.w, this.h);
      pop();
      return;
    }

    if (this.vx > 0) scale(-1, 1);

    imageMode(CENTER);
    image(enemyImg, 0, 0, this.w, this.h);
    pop();
  }
}

// ==========================================
// 7. KELAS TIANG BENDERA FINISH (FLAGPOLE)
// ==========================================
class FlagPole {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 20;
    this.h = 240;
  }

  draw() {
    push();
    // Pondasi Tiang
    fill(100, 116, 139);
    rect(this.x - 10, this.y + this.h - 20, 40, 20, 4);

    // Batang Tiang
    fill(226, 232, 240);
    rect(this.x, this.y, 8, this.h, 2);

    // Bola Atas Tiang
    fill(250, 204, 21);
    ellipse(this.x + 4, this.y, 20, 20);

    // Bendera Hijau
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

// ==========================================
// 8. EFEK PARTIKEL (PARTICLE SYSTEM)
// ==========================================
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
    this.vy += 0.3; // Gravitasi partikel
    this.alpha -= 8; // Memudar bertahap
  }

  draw() {
    push();
    noStroke();
    fill(red(this.color), green(this.color), blue(this.color), this.alpha);
    rect(this.x, this.y, this.size, this.size);
    pop();
  }
}

// Fungsi Helper Pemicu Efek Partikel
function createParticles(x, y, colorStr, count = 6) {
  for (let i = 0; i < count; i++) {
    particles.push(new Particle(x, y, colorStr));
  }
}

// Fungsi Deteksi Overlap Bounding-Box (AABB Collision)
function rectOverlap(x1, y1, w1, h1, x2, y2, w2, h2) {
  return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
}

// ==========================================
// 9. INISIALISASI LEVEL & MANAJEMEN NYAWA
// ==========================================
function initLevel() {
  platforms = [];
  coins = [];
  enemies = [];
  particles = [];

  // Platform Tanah dengan Jurang
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

  // Penempatan Koin
  const coinPositions = [
    [150, 320], [180, 320], [370, 320], [410, 320],
    [880, 320], [920, 320], [1100, 320], [1130, 320],
    [1680, 320], [1720, 320], [1850, 320], [2200, 320], [2240, 320],
  ];
  for (let pos of coinPositions) {
    coins.push(new Coin(pos[0], pos[1]));
  }

  // Penempatan Musuh
  enemies.push(new Enemy(450, GROUND_Y - 48));
  enemies.push(new Enemy(950, GROUND_Y - 48));
  enemies.push(new Enemy(1300, GROUND_Y - 48));
  enemies.push(new Enemy(1750, GROUND_Y - 48));
  enemies.push(new Enemy(2150, GROUND_Y - 48));
  enemies.push(new Enemy(2800, GROUND_Y - 48));

  // Tiang Finish
  flagPole = new FlagPole(3300, GROUND_Y - 240);

  // Latar Awan Acak
  clouds = [];
  for (let i = 0; i < 20; i++) {
    clouds.push({
      x: Math.random() * LEVEL_WIDTH,
      y: Math.random() * 140 + 30,
      scale: Math.random() * 0.6 + 0.6,
    });
  }

  // Latar Bukit Acak
  hills = [];
  for (let i = 0; i < 15; i++) {
    hills.push({
      x: i * 260 + Math.random() * 50,
      w: Math.random() * 120 + 100,
      h: Math.random() * 80 + 60,
    });
  }

  // Inisialisasi Karakter Pemain
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
    // Respawn Karakter di Dekat Posisi Kamera Aktif
    player.x = Math.max(80, cameraX + 50);
    player.y = 100;
    player.vy = 0;
    player.invulnerableTimer = 90;
  }
}

// ==========================================
// 10. SETUP DAN DRAW LOOP (P5.JS)
// ==========================================
function setup() {
  const container = document.getElementById("canvas-container");
  const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
  canvas.parent("canvas-container");
  textFont("Press Start 2P");

  setupTouchEvents();
  resetGameFull();
  gameState = STATE_START;
}

function draw() {
  image(bgImg, 0, 0, width, height);

  if (gameState === STATE_START) {
    drawStartScreen();
    return;
  }

  if (gameState === STATE_PLAYING) {
    updateGameLogic();
  }

  push();
  // Kamera Halus Berjalan Mengikuti Pemain (Lerp Smooth Camera)
  const targetCamX = player.x - CANVAS_WIDTH / 3;
  cameraX = lerp(cameraX, targetCamX, 0.1);
  cameraX = constrain(cameraX, 0, LEVEL_WIDTH - CANVAS_WIDTH);

  translate(-cameraX, 0);

  // Render Objek dalam Dunia Game
  drawParallaxBackground();
  drawPlatforms();

  for (let c of coins) c.draw();
  for (let e of enemies) e.draw();

  flagPole.draw();
  player.draw();

  // Render & Update Partikel
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    particles[i].draw();
    if (particles[i].alpha <= 0) particles.splice(i, 1);
  }

  pop();

  // Render Antarmuka Atas (HUD)
  drawHUD();

  // Layar Hamparan State Game
  if (gameState === STATE_GAMEOVER) {
    drawGameOverScreen();
  } else if (gameState === STATE_WIN) {
    drawWinScreen();
  }
}

// ==========================================
// 11. LOGIKA INTERAKSI GAME (UPDATE LOGIC)
// ==========================================
function updateGameLogic() {
  audio.init();
  player.update();

  // Interaksi Pemain dengan Koin
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

  // Interaksi Pemain dengan Musuh
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
      // Deteksi Menginjak Musuh dari Atas
      if (player.vy > 0 && player.y + player.h - player.vy <= e.y + 12) {
        e.isSquished = true;
        player.vy = -8; // Pantulan ke atas
        score += 200;
        audio.playStomp();
        createParticles(e.x + e.w / 2, e.y, "#92400e", 8);
      } else if (player.invulnerableTimer <= 0) {
        handlePlayerDeath("Tersentuh musuh!");
      }
    }
  }

  // Interaksi dengan Tiang Finish
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

// ==========================================
// 12. RENDER LINGKUNGAN DAN HUD
// ==========================================
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

      // Tekstur Bata Tanah
      fill(120, 53, 15);
      for (let rx = p.x + 10; rx < p.x + p.w - 10; rx += 40) {
        rect(rx, p.y + 26, 12, 12, 2);
        rect(rx + 20, p.y + 48, 12, 12, 2);
      }
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

  // Informasi Skor
  text(`WOWO`, 30, 24);
  fill(250, 204, 21);
  text(`${String(score).padStart(6, "0")}`, 30, 40);

  // Informasi Koin
  imageMode(CENTER);
  image(coinImg, 230, 32, 16, 16);
  fill(255);
  text(`x ${String(coinsCollected).padStart(2, "0")}`, 245, 33);

  // Informasi Nyawa
  fill(225);
  text(`LIVES:`, 420, 33);
  fill(255);
  text(`x ${lives}`, 490, 33);

  // Progress Bar Posisi Level
  const progress = constrain(player.x / LEVEL_WIDTH, 0, 1);
  fill(51, 65, 85);
  rect(600, 26, 150, 12, 6);
  fill(34, 197, 94);
  rect(600, 26, 150 * progress, 12, 6);
  fill(255);
  textSize(9);
  pop();
}

// ==========================================
// 13. TAMPILAN LAYAR (SCREENS)
// ==========================================
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
  text("Gunakan A/D atau Panah Kiri/Kanan untuk Bergerak", CANVAS_WIDTH / 2, 230);
  text("Tekan W / Panah Atas / Spasi untuk Melompat", CANVAS_WIDTH / 2, 250);
  text("Injak Musuh untuk mengalahkan mereka (+200)", CANVAS_WIDTH / 2, 270);
  text("Kumpulkan Koin dan capai Bendera Finish!", CANVAS_WIDTH / 2, 290);

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

// ==========================================
// 14. PENANGANAN INPUT (KEYBOARD & TOUCH)
// ==========================================
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

// Event Listener untuk Tombol Layar Sentuh / Mobile
function setupTouchEvents() {
  const btnLeft = document.getElementById("btn-left");
  const btnRight = document.getElementById("btn-right");
  const btnJump = document.getElementById("btn-jump");

  if (!btnLeft || !btnRight || !btnJump) return;

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