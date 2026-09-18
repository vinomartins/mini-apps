// Cifra de César (v2) - Visualizador Interativo em p5.js
// Com Disco Cifrador Giratório e Tabela Analítica dos 48 Símbolos

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ .,?!:;-'\"()0123456789".split("");
const MODULUS = CHARS.length; // 48
const $ = (id) => document.getElementById(id);

let key = 3;
let decipher = false;
let message = "OLA, MUNDO! 1929";
let flashIndex = -1;
let flashUntil = 0;
let viewMode = "wheel"; // "wheel" | "table"

// Symbol table filtering
let currentTableFilter = "all";
let tableSearchQuery = "";

// Palette
const PALETTE = {
  ink: "#17251f",
  paper: "#f5f0e6",
  orange: "#ed6a3a",
  yellow: "#f4c84a",
  teal: "#5ca99b",
  line: "#c9c1b1",
  cardBg: "#fbf9f3"
};

function setup() {
  const holder = $("wheel-holder");
  const w = holder.clientWidth || 600;
  const h = holder.clientHeight || 620;
  const canvas = createCanvas(w, h);
  canvas.parent(holder);
  textFont("DM Mono");

  initControls();
  renderSymbolTable();

  // Flash the last character of the initial message
  if (message.length > 0) {
    flashIndex = CHARS.indexOf(message.at(-1));
    flashUntil = millis() + 1200;
  }

  updateUI();
}

function windowResized() {
  const h = $("wheel-holder");
  if (h && h.clientWidth > 0 && h.clientHeight > 0) {
    resizeCanvas(h.clientWidth, h.clientHeight);
  }
}

function initControls() {
  const keySlider = $("key");
  keySlider.max = MODULUS - 1;
  keySlider.value = key;

  keySlider.addEventListener("input", (e) => {
    key = +e.target.value;
    updateUI();
  });

  $("mode").addEventListener("change", (e) => {
    decipher = e.target.checked;
    updateUI();
  });

  const msgInput = $("message");
  msgInput.value = message;
  msgInput.addEventListener("input", (e) => {
    message = e.target.value.toUpperCase();
    e.target.value = message;
    const newest = message.at(-1);
    flashIndex = CHARS.indexOf(newest);
    flashUntil = millis() + 800;
    updateUI();
  });

  // View tabs
  $("tabWheel").addEventListener("click", () => switchView("wheel"));
  $("tabTable").addEventListener("click", () => switchView("table"));

  // Quick message presets
  document.querySelectorAll(".quick-texts button").forEach((btn) => {
    btn.addEventListener("click", () => {
      msgInput.value = btn.dataset.msg;
      message = btn.dataset.msg;
      flashIndex = CHARS.indexOf(message.at(-1));
      flashUntil = millis() + 800;
      updateUI();
    });
  });

  // Table filters
  document.querySelectorAll(".table-filters button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".table-filters button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentTableFilter = btn.dataset.filter;
      filterSymbolTable();
    });
  });

  // Table search
  const symSearch = $("symSearch");
  if (symSearch) {
    symSearch.addEventListener("input", (e) => {
      tableSearchQuery = e.target.value.trim().toLowerCase();
      filterSymbolTable();
    });
  }
}

function switchView(mode) {
  viewMode = mode;
  $("tabWheel").classList.toggle("active", mode === "wheel");
  $("tabTable").classList.toggle("active", mode === "table");

  const wheelHolder = $("wheel-holder");
  const tableHolder = $("symbolTableHolder");

  if (mode === "table") {
    wheelHolder.style.display = "none";
    tableHolder.style.display = "flex";
    updateTableCards();
  } else {
    wheelHolder.style.display = "block";
    tableHolder.style.display = "none";
    const w = wheelHolder.clientWidth || 600;
    const h = wheelHolder.clientHeight || 620;
    resizeCanvas(w, h);
  }
}

function transformCharIndex(i) {
  if (i < 0) return -1;
  const direction = decipher ? -1 : 1;
  return ((i + direction * key) % MODULUS + MODULUS) % MODULUS;
}

function transform(str) {
  return [...str]
    .map((c) => {
      const i = CHARS.indexOf(c);
      return i < 0 ? c : CHARS[transformCharIndex(i)];
    })
    .join("");
}

function formatGlyph(char) {
  return char === " " ? "␣" : char;
}

function getSymbolInfo(i) {
  const char = CHARS[i];
  let type = "letter";
  let desc = `Letra ${char}`;
  let displayGlyph = char;

  if (i >= 0 && i <= 25) {
    type = "letter";
    desc = `Letra ${char}`;
  } else if (char === " ") {
    type = "punct";
    desc = "Espaço (em branco)";
    displayGlyph = "␣";
  } else if (char === ".") {
    type = "punct";
    desc = "Ponto final";
  } else if (char === ",") {
    type = "punct";
    desc = "Vírgula";
  } else if (char === "?") {
    type = "punct";
    desc = "Interrogação";
  } else if (char === "!") {
    type = "punct";
    desc = "Exclamação";
  } else if (char === ":") {
    type = "punct";
    desc = "Dois pontos";
  } else if (char === ";") {
    type = "punct";
    desc = "Ponto e vírgula";
  } else if (char === "-") {
    type = "punct";
    desc = "Hífen / Traço";
  } else if (char === "'") {
    type = "punct";
    desc = "Aspas simples";
  } else if (char === '"') {
    type = "punct";
    desc = "Aspas duplas";
  } else if (char === "(") {
    type = "punct";
    desc = "Abre parênteses";
  } else if (char === ")") {
    type = "punct";
    desc = "Fecha parênteses";
  } else if (i >= 38 && i <= 47) {
    type = "digit";
    desc = `Dígito numérico ${char}`;
  }
  return { index: i, char, type, desc, displayGlyph };
}

function updateUI() {
  const keyStr = String(key).padStart(2, "0");
  $("keyNumber").textContent = keyStr;
  $("chipKey").textContent = keyStr;

  const targetA = CHARS[transformCharIndex(0)];
  $("chipShift").textContent = `A ➔ ${formatGlyph(targetA)} (${String(transformCharIndex(0)).padStart(2, "0")})`;

  const opSign = decipher ? "-" : "+";
  const opTarget = decipher ? "P ≡ (C" : "C ≡ (P";
  $("formulaReadout").textContent = `${opTarget} ${opSign} ${keyStr}) mod 48`;

  $("modeName").textContent = decipher ? "Decifrar" : "Cifrar";
  $("modeHint").textContent = decipher ? "Sentido anti-horário (subtrair k)" : "Sentido horário (somar k)";
  $("resultLabel").textContent = decipher ? "Mensagem decifrada" : "Mensagem cifrada";

  const resultStr = message ? transform(message) : "—";
  $("result").textContent = resultStr;

  // Breakdown of active/last character
  const summaryEl = $("charMappingSummary");
  if (message.length > 0) {
    const lastChar = message.at(-1);
    const inIdx = CHARS.indexOf(lastChar);
    if (inIdx >= 0) {
      const outIdx = transformCharIndex(inIdx);
      const outChar = CHARS[outIdx];
      const inGlyph = formatGlyph(lastChar);
      const outGlyph = formatGlyph(outChar);
      summaryEl.innerHTML = `Último caractere: <strong>'${inGlyph}' (${String(inIdx).padStart(2, "0")})</strong> ➔ <strong>'${outGlyph}' (${String(outIdx).padStart(2, "0")})</strong>`;
    } else {
      summaryEl.innerHTML = `Caractere '${lastChar}' não está no alfabeto (não alterado)`;
    }
  } else {
    summaryEl.innerHTML = "Digite uma mensagem para visualizar o mapeamento.";
  }

  updateTableCards();
}

// ==========================================
// SYMBOL TABLE RENDERING & UPDATES
// ==========================================
function renderSymbolTable() {
  const grid = $("symbolGrid");
  if (!grid) return;
  grid.innerHTML = "";

  for (let i = 0; i < MODULUS; i++) {
    const info = getSymbolInfo(i);
    const card = document.createElement("div");
    card.className = "symbol-card";
    card.id = `sym-card-${i}`;
    card.dataset.index = i;
    card.dataset.char = info.char;
    card.dataset.type = info.type;

    card.innerHTML = `
      <span class="sym-code">Cód. ${String(i).padStart(2, "0")}</span>
      <span class="sym-glyph">${info.displayGlyph}</span>
      <span class="sym-desc" title="${info.desc}">${info.desc}</span>
      <div class="sym-mapping" id="sym-map-${i}">➔ ?</div>
      <div class="sym-badges">
        <span class="sym-badge badge-in">Texto Claro</span>
        <span class="sym-badge badge-out">Cifrado</span>
      </div>
    `;

    card.addEventListener("click", () => {
      const msgArea = $("message");
      msgArea.value += info.char;
      message = msgArea.value;
      flashIndex = i;
      flashUntil = millis() + 800;
      updateUI();
    });

    grid.appendChild(card);
  }
}

function updateTableCards() {
  const inIdx = flashIndex >= 0 ? flashIndex : -1;
  const outIdx = inIdx >= 0 ? transformCharIndex(inIdx) : -1;

  for (let i = 0; i < MODULUS; i++) {
    const card = $(`sym-card-${i}`);
    const mapEl = $(`sym-map-${i}`);
    if (!card || !mapEl) continue;

    const targetIdx = transformCharIndex(i);
    const targetChar = CHARS[targetIdx];
    mapEl.textContent = `➔ ${formatGlyph(targetChar)} (${String(targetIdx).padStart(2, "0")})`;

    const isInput = i === inIdx;
    const isOutput = i === outIdx;

    card.classList.toggle("is-input", isInput && !isOutput);
    card.classList.toggle("is-output", isOutput && !isInput);
  }
}

function filterSymbolTable() {
  const cards = document.querySelectorAll(".symbol-card");
  cards.forEach((card) => {
    const idx = parseInt(card.dataset.index, 10);
    const type = card.dataset.type;
    const char = card.dataset.char;
    const info = getSymbolInfo(idx);

    let matchesFilter = true;
    if (currentTableFilter === "letter") matchesFilter = type === "letter";
    else if (currentTableFilter === "punct") matchesFilter = type === "punct";
    else if (currentTableFilter === "digit") matchesFilter = type === "digit";

    let matchesSearch = true;
    if (tableSearchQuery) {
      const q = tableSearchQuery;
      matchesSearch =
        String(idx) === q ||
        String(idx).padStart(2, "0") === q ||
        char.toLowerCase().includes(q) ||
        info.desc.toLowerCase().includes(q) ||
        info.displayGlyph.toLowerCase().includes(q);
    }

    card.style.display = matchesFilter && matchesSearch ? "flex" : "none";
  });
}

// ==========================================
// P5 DRAW (CAESAR WHEEL)
// ==========================================
function draw() {
  if (viewMode === "table") {
    // Wheel canvas is hidden in table mode
    return;
  }

  background(PALETTE.cardBg);
  const cx = width / 2;
  const cy = height / 2 + 6;
  const radius = min(width, height) * 0.41;
  const outer = radius * 1.18;
  const inner = radius * 0.61;
  const n = MODULUS;
  const step = TWO_PI / n;
  const shift = -(decipher ? -key : key) * step;

  translate(cx, cy);

  // Concentric circle outlines
  noFill();
  stroke(PALETTE.ink);
  strokeWeight(1.25);
  circle(0, 0, outer * 2);
  circle(0, 0, radius * 2);
  circle(0, 0, inner * 2);

  // Highlighting active flashed slices
  if (flashIndex >= 0 && millis() < flashUntil) {
    ringSlice(flashIndex * step - HALF_PI, step, inner, radius, PALETTE.yellow);
    const encoded = (flashIndex + (decipher ? -key : key) + n) % n;
    ringSlice(encoded * step - HALF_PI + shift, step, radius, outer, PALETTE.orange);
  }

  // Fixed inner alphabet (Plaintext)
  for (let i = 0; i < n; i++) {
    const a = i * step - HALF_PI;
    drawTick(a, inner, radius, (inner + radius) / 2, PALETTE.ink);
    const blinking = i === flashIndex && millis() < flashUntil;
    const glyph = formatGlyph(CHARS[i]);
    drawLabel(glyph, String(i).padStart(2, "0"), a, (inner + radius) / 2, blinking ? PALETTE.yellow : PALETTE.ink, blinking);
  }

  // Rotating outer alphabet (Ciphertext)
  for (let i = 0; i < n; i++) {
    const a = i * step - HALF_PI + shift;
    drawTick(a, radius, outer, (radius + outer) / 2, PALETTE.orange);
    const source = (i - (decipher ? -key : key) + n * 2) % n;
    const blinking = source === flashIndex && millis() < flashUntil;
    const glyph = formatGlyph(CHARS[i]);
    drawLabel(glyph, String(i).padStart(2, "0"), a, (radius + outer) / 2, PALETTE.orange, blinking);
  }

  // Fixed top alignment needle
  stroke(PALETTE.ink);
  strokeWeight(2);
  line(0, -outer - 14, 0, -outer + 8);
  noStroke();
  fill(PALETTE.ink);
  triangle(-6, -outer - 8, 6, -outer - 8, 0, -outer + 1);

  // Center labels
  fill(PALETTE.ink);
  textAlign(CENTER, CENTER);
  textSize(11);
  text("ALFABETO", 0, -11);
  text("FIXO", 0, 5);
  fill(PALETTE.orange);
  textSize(8.5);
  text("Anel rotativo", 0, 21);
}

function drawTick(a, from, to, labelR, colour) {
  const gap = 16;
  stroke(colour);
  strokeWeight(1);
  line(cos(a) * from, sin(a) * from, cos(a) * (labelR - gap), sin(a) * (labelR - gap));
  line(cos(a) * (labelR + gap), sin(a) * (labelR + gap), cos(a) * to, sin(a) * to);
}

function ringSlice(a, step, from, to, colour) {
  noStroke();
  fill(colour);
  beginShape();
  vertex(cos(a - step / 2) * from, sin(a - step / 2) * from);
  vertex(cos(a - step / 2) * to, sin(a - step / 2) * to);
  vertex(cos(a + step / 2) * to, sin(a + step / 2) * to);
  vertex(cos(a + step / 2) * from, sin(a + step / 2) * from);
  endShape(CLOSE);
}

function drawLabel(letter, code, a, r, colour, blinking) {
  push();
  translate(cos(a) * r, sin(a) * r);
  rotate(a + HALF_PI);
  noStroke();

  if (blinking) {
    fill(colour);
    circle(0, 0, 26);
    fill(PALETTE.ink);
  } else {
    fill(colour);
  }

  textAlign(CENTER, CENTER);
  textSize(12);
  text(letter, 0, -4);
  textSize(6.5);
  text(code, 0, 7);
  pop();
}
