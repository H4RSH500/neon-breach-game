const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");

const scoreEl = document.querySelector("#score");
const waveEl = document.querySelector("#wave");
const healthBar = document.querySelector("#healthBar");
const chargeBar = document.querySelector("#chargeBar");
const overlay = document.querySelector("#overlay");
const startButton = document.querySelector("#startButton");
const joystick = document.querySelector("#joystick");
const joystickKnob = document.querySelector("#joystickKnob");
const pulseButton = document.querySelector("#pulseButton");

const W = canvas.width;
const H = canvas.height;
const keys = new Set();
const rand = (min, max) => min + Math.random() * (max - min);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const touchInput = {
  active: false,
  pointerId: null,
  x: 0,
  y: 0,
};

let state = "menu";
let score = 0;
let wave = 1;
let lastTime = 0;
let spawnTimer = 0;
let coreTimer = 0;
let shake = 0;
let pulseFlash = 0;

const player = {
  x: W * 0.24,
  y: H * 0.5,
  radius: 18,
  vx: 0,
  vy: 0,
  health: 100,
  charge: 100,
  invulnerable: 0,
};

let enemies = [];
let cores = [];
let particles = [];
let gridOffset = 0;

function resetGame() {
  state = "running";
  score = 0;
  wave = 1;
  spawnTimer = 0;
  coreTimer = 1.1;
  shake = 0;
  pulseFlash = 0;
  player.x = W * 0.24;
  player.y = H * 0.5;
  player.vx = 0;
  player.vy = 0;
  player.health = 100;
  player.charge = 100;
  player.invulnerable = 1.2;
  enemies = [];
  cores = [];
  particles = [];
  overlay.classList.add("hidden");
  updateHud();
}

function gameOver() {
  state = "over";
  overlay.classList.remove("hidden");
  overlay.querySelector(".eyebrow").textContent = "BREACH INTERRUPTED";
  overlay.querySelector("h1").textContent = "Run Ended";
  overlay.querySelector(".brief").textContent =
    `Final score ${String(Math.floor(score)).padStart(6, "0")}. Reboot the interceptor and punch through a denser firewall.`;
  startButton.textContent = "Restart";
}

function updateHud() {
  scoreEl.textContent = String(Math.floor(score)).padStart(6, "0");
  waveEl.textContent = String(wave).padStart(2, "0");
  healthBar.style.transform = `scaleX(${player.health / 100})`;
  chargeBar.style.transform = `scaleX(${player.charge / 100})`;
}

function spawnEnemy() {
  const typeRoll = Math.random();
  const speed = rand(120, 190) + wave * 12;
  const enemy = {
    x: W + 40,
    y: rand(70, H - 70),
    radius: typeRoll > 0.72 ? 26 : 18,
    speed,
    spin: rand(0, Math.PI * 2),
    type: typeRoll > 0.72 ? "hunter" : "sentry",
  };
  enemies.push(enemy);
}

function spawnCore() {
  cores.push({
    x: W + 34,
    y: rand(70, H - 70),
    radius: 13,
    speed: rand(105, 145),
    spin: rand(0, Math.PI * 2),
  });
}

function addParticles(x, y, color, count, power = 1) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x,
      y,
      vx: rand(-210, 210) * power,
      vy: rand(-210, 210) * power,
      life: rand(0.35, 0.9),
      maxLife: 0,
      color,
      size: rand(2, 6) * power,
    });
    particles[particles.length - 1].maxLife = particles[particles.length - 1].life;
  }
}

function pulse() {
  if (player.charge < 38 || state !== "running") return;
  player.charge -= 38;
  pulseFlash = 0.24;
  shake = Math.max(shake, 7);
  addParticles(player.x, player.y, "#19e6ff", 34, 1.25);

  enemies = enemies.filter((enemy) => {
    const distance = Math.hypot(enemy.x - player.x, enemy.y - player.y);
    if (distance < 210) {
      score += enemy.type === "hunter" ? 190 : 120;
      addParticles(enemy.x, enemy.y, "#ff4d7d", 24, 1.1);
      return false;
    }
    return true;
  });
}

function update(dt) {
  if (state !== "running") return;

  gridOffset += dt * (70 + wave * 6);
  spawnTimer -= dt;
  coreTimer -= dt;
  pulseFlash = Math.max(0, pulseFlash - dt);
  shake = Math.max(0, shake - dt * 22);
  player.invulnerable = Math.max(0, player.invulnerable - dt);
  player.charge = clamp(player.charge + dt * 9, 0, 100);

  const keyboardX = (keys.has("ArrowRight") || keys.has("KeyD") ? 1 : 0) - (keys.has("ArrowLeft") || keys.has("KeyA") ? 1 : 0);
  const keyboardY = (keys.has("ArrowDown") || keys.has("KeyS") ? 1 : 0) - (keys.has("ArrowUp") || keys.has("KeyW") ? 1 : 0);
  const ax = clamp(keyboardX + touchInput.x, -1, 1);
  const ay = clamp(keyboardY + touchInput.y, -1, 1);
  player.vx += ax * 1650 * dt;
  player.vy += ay * 1650 * dt;
  player.vx *= Math.pow(0.001, dt);
  player.vy *= Math.pow(0.001, dt);
  player.x = clamp(player.x + player.vx * dt, 38, W - 38);
  player.y = clamp(player.y + player.vy * dt, 38, H - 38);

  if (spawnTimer <= 0) {
    spawnEnemy();
    spawnTimer = clamp(1.05 - wave * 0.055, 0.34, 1.05);
  }

  if (coreTimer <= 0) {
    spawnCore();
    coreTimer = rand(1.4, 2.5);
  }

  wave = Math.floor(score / 1300) + 1;
  score += dt * (34 + wave * 5);

  enemies.forEach((enemy) => {
    enemy.x -= enemy.speed * dt;
    enemy.spin += dt * 4;
    if (enemy.type === "hunter") {
      enemy.y += Math.sin(enemy.spin * 1.4) * 76 * dt;
      enemy.y += Math.sign(player.y - enemy.y) * 34 * dt;
    }

    if (Math.hypot(enemy.x - player.x, enemy.y - player.y) < enemy.radius + player.radius && player.invulnerable <= 0) {
      player.health -= enemy.type === "hunter" ? 24 : 16;
      player.invulnerable = 0.8;
      shake = 10;
      addParticles(player.x, player.y, "#ffcf5a", 28, 1);
      if (player.health <= 0) gameOver();
    }
  });

  cores.forEach((core) => {
    core.x -= core.speed * dt;
    core.spin += dt * 5;
    if (Math.hypot(core.x - player.x, core.y - player.y) < core.radius + player.radius) {
      core.collected = true;
      score += 280;
      player.charge = clamp(player.charge + 28, 0, 100);
      player.health = clamp(player.health + 4, 0, 100);
      addParticles(core.x, core.y, "#6cff9d", 22, 0.9);
    }
  });

  enemies = enemies.filter((enemy) => enemy.x > -70);
  cores = cores.filter((core) => core.x > -50 && !core.collected);

  particles.forEach((particle) => {
    particle.life -= dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= Math.pow(0.05, dt);
    particle.vy *= Math.pow(0.05, dt);
  });
  particles = particles.filter((particle) => particle.life > 0);

  updateHud();
}

function drawGrid() {
  ctx.save();
  ctx.strokeStyle = "rgba(25, 230, 255, 0.12)";
  ctx.lineWidth = 1;
  const gap = 48;
  const offset = gridOffset % gap;
  for (let x = -gap + offset; x < W + gap; x += gap) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x - 190, H);
    ctx.stroke();
  }
  for (let y = offset; y < H; y += gap) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.rotate(Math.atan2(player.vy, Math.max(180, player.vx + 260)) * 0.22);
  ctx.shadowBlur = 24;
  ctx.shadowColor = player.invulnerable > 0 ? "#ffcf5a" : "#19e6ff";
  ctx.fillStyle = "#e9fbff";
  ctx.beginPath();
  ctx.moveTo(26, 0);
  ctx.lineTo(-18, -16);
  ctx.lineTo(-8, 0);
  ctx.lineTo(-18, 16);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#19e6ff";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = "#6cff9d";
  ctx.fillRect(-22, -5, 9, 10);
  ctx.restore();
}

function drawEnemy(enemy) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.rotate(enemy.spin);
  ctx.shadowBlur = 20;
  ctx.shadowColor = enemy.type === "hunter" ? "#ff4d7d" : "#ffcf5a";
  ctx.strokeStyle = enemy.type === "hunter" ? "#ff4d7d" : "#ffcf5a";
  ctx.fillStyle = "rgba(255, 77, 125, 0.16)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI * 2 * i) / 6;
    const radius = i % 2 === 0 ? enemy.radius : enemy.radius * 0.56;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawCore(core) {
  ctx.save();
  ctx.translate(core.x, core.y);
  ctx.rotate(core.spin);
  ctx.shadowBlur = 24;
  ctx.shadowColor = "#6cff9d";
  ctx.strokeStyle = "#6cff9d";
  ctx.fillStyle = "rgba(108, 255, 157, 0.22)";
  ctx.lineWidth = 3;
  ctx.strokeRect(-core.radius, -core.radius, core.radius * 2, core.radius * 2);
  ctx.fillRect(-core.radius * 0.58, -core.radius * 0.58, core.radius * 1.16, core.radius * 1.16);
  ctx.restore();
}

function drawParticles() {
  particles.forEach((particle) => {
    const alpha = particle.life / particle.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = particle.color;
    ctx.shadowBlur = 12;
    ctx.shadowColor = particle.color;
    ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
    ctx.restore();
  });
}

function draw() {
  ctx.save();
  const jitterX = shake ? rand(-shake, shake) : 0;
  const jitterY = shake ? rand(-shake, shake) : 0;
  ctx.translate(jitterX, jitterY);

  ctx.clearRect(-20, -20, W + 40, H + 40);
  const background = ctx.createLinearGradient(0, 0, W, H);
  background.addColorStop(0, "#05070a");
  background.addColorStop(0.52, "#09101a");
  background.addColorStop(1, "#07080d");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, W, H);

  drawGrid();
  cores.forEach(drawCore);
  enemies.forEach(drawEnemy);
  drawParticles();
  drawPlayer();

  if (pulseFlash > 0) {
    ctx.save();
    ctx.globalAlpha = pulseFlash * 2.2;
    ctx.strokeStyle = "#19e6ff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 210 * (1 - pulseFlash / 0.24), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

function loop(time) {
  const dt = Math.min(0.033, (time - lastTime) / 1000 || 0);
  lastTime = time;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

window.addEventListener("keydown", (event) => {
  keys.add(event.code);
  if (event.code === "Space") {
    event.preventDefault();
    pulse();
  }
  if (event.code === "KeyP") {
    if (state === "running") {
      state = "paused";
      overlay.classList.remove("hidden");
      overlay.querySelector(".eyebrow").textContent = "SYSTEM PAUSED";
      overlay.querySelector("h1").textContent = "Hold Position";
      overlay.querySelector(".brief").textContent = "Resume when the route through the grid is clear.";
      startButton.textContent = "Resume";
    } else if (state === "paused") {
      state = "running";
      overlay.classList.add("hidden");
    }
  }
});

window.addEventListener("keyup", (event) => keys.delete(event.code));

function updateJoystick(pointerEvent) {
  const rect = joystick.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const maxDistance = rect.width * 0.34;
  const dx = pointerEvent.clientX - centerX;
  const dy = pointerEvent.clientY - centerY;
  const distance = Math.hypot(dx, dy);
  const limitedDistance = Math.min(distance, maxDistance);
  const angle = Math.atan2(dy, dx);
  const knobX = Math.cos(angle) * limitedDistance;
  const knobY = Math.sin(angle) * limitedDistance;

  touchInput.x = distance ? clamp(dx / maxDistance, -1, 1) : 0;
  touchInput.y = distance ? clamp(dy / maxDistance, -1, 1) : 0;
  joystickKnob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;
}

function resetJoystick() {
  touchInput.active = false;
  touchInput.pointerId = null;
  touchInput.x = 0;
  touchInput.y = 0;
  joystickKnob.style.transform = "translate(-50%, -50%)";
}

joystick.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  touchInput.active = true;
  touchInput.pointerId = event.pointerId;
  joystick.setPointerCapture(event.pointerId);
  updateJoystick(event);
});

joystick.addEventListener("pointermove", (event) => {
  if (!touchInput.active || event.pointerId !== touchInput.pointerId) return;
  event.preventDefault();
  updateJoystick(event);
});

joystick.addEventListener("pointerup", resetJoystick);
joystick.addEventListener("pointercancel", resetJoystick);

pulseButton.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  pulse();
});

window.addEventListener("contextmenu", (event) => event.preventDefault());
startButton.addEventListener("click", () => {
  if (state === "paused") {
    state = "running";
    overlay.classList.add("hidden");
  } else {
    resetGame();
  }
});

draw();
requestAnimationFrame(loop);
