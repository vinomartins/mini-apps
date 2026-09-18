// Cifra de Hill - Visualizador Interativo em p5.js
// Álgebra Linear e Criptografia no reticulado discreto Z_48 x Z_48
// Suporte aos 48 símbolos da Cifra de César: Letras A-Z, Espaço, Pontuação e Dígitos 0-9

const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ .,?!:;-'\"()0123456789".split("");
const MODULUS = CHARS.length; // 48
const $ = (id) => document.getElementById(id);

// App state
let keyMatrix = [
  [7, 4],
  [5, 3]
];
let decipher = false;
let rawMessage = "OLA, MUNDO! 1929";
let cleanMessage = "";
let digraphs = [];
let activeBlockIndex = 0;
let viewMode = "geo"; // "geo" | "calc" | "table" | "both"

// Table filter state
let currentTableFilter = "all"; // "all" | "letter" | "punct" | "digit"
let tableSearchQuery = "";

// Animation state
let isPlaying = false;
let lastStepTime = 0;
const STEP_INTERVAL_MS = 1400;

// Colors matching the editorial retro palette
const PALETTE = {
  ink: "#17251f",
  paper: "#f5f0e6",
  cardBg: "#fbf9f3",
  orange: "#ed6a3a",
  yellow: "#f4c84a",
  teal: "#5ca99b",
  tealDark: "#3a7a6e",
  line: "#c9c1b1",
  gridLine: "#e5ded0",
  gridAxis: "#8c8273",
  red: "#d94334"
};

// Math utilities for modular arithmetic
function mod(n, m = MODULUS) {
  return ((n % m) + m) % m;
}

function egcd(a, b) {
  if (b === 0) return { gcd: a, x: 1, y: 0 };
  const { gcd, x: x1, y: y1 } = egcd(b, a % b);
  return { gcd, x: y1, y: x1 - Math.floor(a / b) * y1 };
}

function modInverse(n, m = MODULUS) {
  n = mod(n, m);
  const res = egcd(n, m);
  if (res.gcd !== 1) return null;
  return mod(res.x, m);
}

function computeDeterminant(m) {
  return m[0][0] * m[1][1] - m[0][1] * m[1][0];
}

function getMatrixInverse(m, mMod = MODULUS) {
  const det = computeDeterminant(m);
  const detM = mod(det, mMod);
  const invDet = modInverse(detM, mMod);
  if (invDet === null) return null;

  // adj(K) = [ d, -b; -c, a ]
  return [
    [mod(invDet * m[1][1], mMod), mod(invDet * (-m[0][1]), mMod)],
    [mod(invDet * (-m[1][0]), mMod), mod(invDet * m[0][0], mMod)]
  ];
}

// Metadata for every symbol
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

function normalizeInputText(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .split("")
    .filter((c) => CHARS.includes(c))
    .join("");
}

// p5 global lifecycle functions
function setup() {
  const holder = $("canvas-holder");
  const w = holder.clientWidth || 640;
  const h = holder.clientHeight || 620;
  const canvas = createCanvas(w, h);
  canvas.parent(holder);
  textFont("DM Mono");

  initEventHandlers();
  syncMatrixFromInputs();
  processMessage();
  renderSymbolTable();
  updateUI();
}

function windowResized() {
  const holder = $("canvas-holder");
  if (holder && holder.clientWidth > 0 && holder.clientHeight > 0) {
    resizeCanvas(holder.clientWidth, holder.clientHeight);
  }
}

function initEventHandlers() {
  // Matrix input changes
  ["k00", "k01", "k10", "k11"].forEach((id) => {
    $(id).addEventListener("input", () => {
      syncMatrixFromInputs();
      updateUI();
    });
  });

  // Mode switch (Cifrar / Decifrar)
  $("mode").addEventListener("change", (e) => {
    decipher = e.target.checked;
    updateUI();
  });

  // Message input
  $("message").addEventListener("input", (e) => {
    rawMessage = e.target.value;
    processMessage();
    updateUI();
  });

  // View mode tabs
  $("tabGeo").addEventListener("click", () => switchView("geo"));
  $("tabCalc").addEventListener("click", () => switchView("calc"));
  $("tabTable").addEventListener("click", () => switchView("table"));
  $("tabBoth").addEventListener("click", () => switchView("both"));

  // Presets in Z_48
  $("preset1").addEventListener("click", () => setMatrixValues([7, 4, 5, 3]));
  $("preset2").addEventListener("click", () => setMatrixValues([5, 8, 3, 7]));
  $("preset3").addEventListener("click", () => setMatrixValues([5, 2, 7, 5]));
  $("preset4").addEventListener("click", () => setMatrixValues([5, 6, 2, 5]));

  // Random key generator
  $("btnRandomKey").addEventListener("click", generateRandomValidKey);

  // Invert key
  $("btnInvertKey").addEventListener("click", applyInverseKey);

  // Stepper controls
  $("btnPrevBlock").addEventListener("click", () => {
    pauseAnimation();
    if (digraphs.length > 0) {
      activeBlockIndex = (activeBlockIndex - 1 + digraphs.length) % digraphs.length;
      updateUI();
    }
  });

  $("btnNextBlock").addEventListener("click", () => {
    pauseAnimation();
    if (digraphs.length > 0) {
      activeBlockIndex = (activeBlockIndex + 1) % digraphs.length;
      updateUI();
    }
  });

  $("btnPlayAnim").addEventListener("click", togglePlayAnimation);

  // Quick message presets
  document.querySelectorAll(".quick-texts button").forEach((btn) => {
    btn.addEventListener("click", () => {
      $("message").value = btn.dataset.msg;
      rawMessage = btn.dataset.msg;
      processMessage();
      updateUI();
    });
  });

  // Symbol table filters
  document.querySelectorAll(".table-filters button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".table-filters button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentTableFilter = btn.dataset.filter;
      filterSymbolTable();
    });
  });

  // Symbol table search
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
  $("tabGeo").classList.toggle("active", mode === "geo");
  $("tabCalc").classList.toggle("active", mode === "calc");
  $("tabTable").classList.toggle("active", mode === "table");
  $("tabBoth").classList.toggle("active", mode === "both");

  const canvasHolder = $("canvas-holder");
  const tableHolder = $("symbolTableHolder");

  if (mode === "table") {
    canvasHolder.style.display = "none";
    tableHolder.style.display = "flex";
    updateSymbolTableHighlights();
  } else {
    canvasHolder.style.display = "block";
    tableHolder.style.display = "none";
    const w = canvasHolder.clientWidth || 640;
    const h = canvasHolder.clientHeight || 620;
    resizeCanvas(w, h);
  }
}

function setMatrixValues(vals) {
  $("k00").value = vals[0];
  $("k01").value = vals[1];
  $("k10").value = vals[2];
  $("k11").value = vals[3];
  syncMatrixFromInputs();
  updateUI();
}

function syncMatrixFromInputs() {
  const getVal = (id, def) => {
    const v = parseInt($(id).value, 10);
    return isNaN(v) ? def : mod(v, MODULUS);
  };
  keyMatrix = [
    [getVal("k00", 7), getVal("k01", 4)],
    [getVal("k10", 5), getVal("k11", 3)]
  ];
}

function generateRandomValidKey() {
  let attempts = 0;
  while (attempts < 2000) {
    attempts++;
    const a = Math.floor(Math.random() * MODULUS);
    const b = Math.floor(Math.random() * MODULUS);
    const c = Math.floor(Math.random() * MODULUS);
    const d = Math.floor(Math.random() * MODULUS);
    const det = mod(a * d - b * c, MODULUS);
    if (modInverse(det, MODULUS) !== null) {
      setMatrixValues([a, b, c, d]);
      return;
    }
  }
}

function applyInverseKey() {
  const inv = getMatrixInverse(keyMatrix);
  if (inv) {
    setMatrixValues([inv[0][0], inv[0][1], inv[1][0], inv[1][1]]);
  }
}

function togglePlayAnimation() {
  isPlaying = !isPlaying;
  $("btnPlayAnim").textContent = isPlaying ? "⏸ Pausar" : "▶ Animar";
  if (isPlaying) {
    lastStepTime = millis();
  }
}

function pauseAnimation() {
  if (isPlaying) {
    isPlaying = false;
    $("btnPlayAnim").textContent = "▶ Animar";
  }
}

function processMessage() {
  cleanMessage = normalizeInputText(rawMessage);
  let padded = cleanMessage;
  const hasPadding = cleanMessage.length % 2 !== 0;
  if (hasPadding) {
    padded += "X";
  }
  $("paddingNotice").style.display = hasPadding ? "inline" : "none";
  $("charCount").textContent = `${cleanMessage.length} símbolos`;

  digraphs = [];
  for (let i = 0; i < padded.length; i += 2) {
    digraphs.push({
      p1: padded[i],
      p2: padded[i + 1],
      v1: CHARS.indexOf(padded[i]),
      v2: CHARS.indexOf(padded[i + 1]),
      isPadded: hasPadding && i === padded.length - 2
    });
  }

  if (activeBlockIndex >= digraphs.length) {
    activeBlockIndex = Math.max(0, digraphs.length - 1);
  }
}

function getActiveTransformMatrix() {
  if (!decipher) {
    return keyMatrix;
  }
  return getMatrixInverse(keyMatrix);
}

function transformDigraph(v1, v2, mat) {
  if (!mat) return null;
  const raw1 = mat[0][0] * v1 + mat[0][1] * v2;
  const raw2 = mat[1][0] * v1 + mat[1][1] * v2;
  const c1 = mod(raw1, MODULUS);
  const c2 = mod(raw2, MODULUS);
  return {
    raw1,
    raw2,
    c1,
    c2,
    char1: CHARS[c1],
    char2: CHARS[c2]
  };
}

function updateUI() {
  const det = computeDeterminant(keyMatrix);
  const detMod = mod(det, MODULUS);
  const invDet = modInverse(detMod, MODULUS);
  const isValid = invDet !== null;
  const invMat = getMatrixInverse(keyMatrix);

  // Determinant readout
  $("detPreview").textContent = `det(K) ≡ ${detMod}`;

  // Status banner
  const statusEl = $("matrixStatus");
  if (isValid) {
    statusEl.className = "matrix-status valid";
    statusEl.innerHTML = `
      <strong>✓ Matriz válida e invertível mod 48</strong>
      <span>det(K) = ${det} ≡ ${detMod}, mdc(${detMod}, 48) = 1.<br/>Inverso modular: ${detMod}⁻¹ ≡ ${invDet} (mod 48).</span>
    `;
    $("btnInvertKey").disabled = false;
    $("matrixMathDetails").style.display = "block";
    $("matrixMathDetails").innerHTML = `
      <span>Inversa K⁻¹ = [ ${invMat[0][0]}, ${invMat[0][1]} ; ${invMat[1][0]}, ${invMat[1][1]} ]</span>
    `;
  } else {
    statusEl.className = "matrix-status invalid";
    let reason = "Determinante não é coprimo com 48.";
    if (detMod === 0) reason = "det(K) ≡ 0 (matriz singular, sem inversa).";
    else if (detMod % 2 === 0) reason = `det(K) ≡ ${detMod} é par (compartilha o fator 2 com 48).`;
    else if (detMod % 3 === 0) reason = `det(K) ≡ ${detMod} é múltiplo de 3 (compartilha o fator 3 com 48).`;

    statusEl.innerHTML = `
      <strong>✕ Matriz não invertível mod 48</strong>
      <span>det(K) = ${det} ≡ ${detMod}. ${reason}<br/>Não é possível descriptografar de forma única.</span>
    `;
    $("btnInvertKey").disabled = true;
    $("matrixMathDetails").style.display = "none";
  }

  // Mode label and hint
  $("modeName").textContent = decipher ? "Decifrar" : "Cifrar";
  $("modeHint").textContent = decipher ? "P = K⁻¹ · C (mod 48)" : "C = K · P (mod 48)";
  $("resultLabel").textContent = decipher ? "Mensagem Decifrada" : "Mensagem Cifrada";

  // Transform all blocks
  const activeMat = getActiveTransformMatrix();
  let resultText = "";
  if (activeMat && digraphs.length > 0) {
    resultText = digraphs
      .map((d) => {
        const res = transformDigraph(d.v1, d.v2, activeMat);
        return res ? res.char1 + res.char2 : "??";
      })
      .join("");
  } else if (!isValid && decipher) {
    resultText = "[ERRO: Matriz não possui inversa para decifrar]";
  } else {
    resultText = "—";
  }
  $("result").textContent = resultText || "—";

  // Render Digraph Chips
  renderDigraphChips(activeMat);

  // Update summary of active block
  updateBlockSummary(activeMat);

  // Update table highlights
  updateSymbolTableHighlights();
}

function renderDigraphChips(activeMat) {
  const chipsContainer = $("blockChips");
  chipsContainer.innerHTML = "";

  if (digraphs.length === 0) {
    chipsContainer.innerHTML = `<span style="font-size:0.75rem; color:#888;">Nenhuma mensagem digitada</span>`;
    return;
  }

  digraphs.forEach((d, idx) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = `chip ${idx === activeBlockIndex ? "active" : ""}`;
    const res = activeMat ? transformDigraph(d.v1, d.v2, activeMat) : null;
    const outStr = res ? `${formatGlyph(res.char1)}${formatGlyph(res.char2)}` : "??";
    const inStr = `${formatGlyph(d.p1)}${formatGlyph(d.p2)}`;

    chip.innerHTML = `
      <span>${inStr} ➔ ${outStr}</span>
      <span class="chip-sub">#${idx + 1} (${d.v1}, ${d.v2})</span>
    `;

    chip.addEventListener("click", () => {
      pauseAnimation();
      activeBlockIndex = idx;
      updateUI();
    });

    chipsContainer.appendChild(chip);
  });
}

function formatGlyph(char) {
  return char === " " ? "␣" : char;
}

function updateBlockSummary(activeMat) {
  const summaryEl = $("blockSummary");
  const badgeEl = $("activeBlockBadge");

  if (digraphs.length === 0 || !digraphs[activeBlockIndex]) {
    summaryEl.innerHTML = "Nenhum bloco ativo.";
    badgeEl.textContent = "—";
    return;
  }

  const d = digraphs[activeBlockIndex];
  badgeEl.textContent = `#${activeBlockIndex + 1}: ${formatGlyph(d.p1)}${formatGlyph(d.p2)}`;

  if (!activeMat) {
    summaryEl.innerHTML = `Bloco #${activeBlockIndex + 1}: [${formatGlyph(d.p1)}, ${formatGlyph(d.p2)}] = (${d.v1}, ${d.v2}) ➔ Matriz inválida`;
    return;
  }

  const res = transformDigraph(d.v1, d.v2, activeMat);
  summaryEl.innerHTML = `
    Bloco #${activeBlockIndex + 1}: <strong>[${formatGlyph(d.p1)}, ${formatGlyph(d.p2)}]</strong> (${d.v1}, ${d.v2})
    ➔ <strong>[${formatGlyph(res.char1)}, ${formatGlyph(res.char2)}]</strong> (${res.c1}, ${res.c2})
    ${d.isPadded ? "<small style='color:var(--orange)'>(com preenchimento 'X')</small>" : ""}
  `;
}

// ==========================================
// SYMBOL TABLE (48 CODES) DOM RENDERING
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
      <div class="sym-badges">
        <span class="sym-badge badge-in">Entrada</span>
        <span class="sym-badge badge-out">Saída</span>
      </div>
    `;

    // Click to insert into textarea
    card.addEventListener("click", () => {
      const msgArea = $("message");
      msgArea.value += info.char;
      rawMessage = msgArea.value;
      processMessage();
      updateUI();
    });

    grid.appendChild(card);
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

function updateSymbolTableHighlights() {
  const activeMat = getActiveTransformMatrix();
  const d = digraphs[activeBlockIndex];
  const res = d && activeMat ? transformDigraph(d.v1, d.v2, activeMat) : null;

  const in1 = d ? d.v1 : -1;
  const in2 = d ? d.v2 : -1;
  const out1 = res ? res.c1 : -1;
  const out2 = res ? res.c2 : -1;

  for (let i = 0; i < MODULUS; i++) {
    const card = $(`sym-card-${i}`);
    if (!card) continue;

    const isInput = i === in1 || i === in2;
    const isOutput = i === out1 || i === out2;

    card.classList.toggle("is-input", isInput && !isOutput);
    card.classList.toggle("is-output", isOutput && !isInput);
    card.classList.toggle("is-both", isInput && isOutput);
  }
}

// ==========================================
// P5 DRAW LOOP
// ==========================================
function draw() {
  if (viewMode === "table") {
    // Canvas is hidden when table is visible
    return;
  }

  background(PALETTE.cardBg);

  // Handle autoplay stepping
  if (isPlaying && digraphs.length > 0) {
    if (millis() - lastStepTime > STEP_INTERVAL_MS) {
      activeBlockIndex = (activeBlockIndex + 1) % digraphs.length;
      lastStepTime = millis();
      updateUI();
    }
  }

  const activeMat = getActiveTransformMatrix();
  const activeDigraph = digraphs[activeBlockIndex] || {
    p1: "A",
    p2: "B",
    v1: 0,
    v2: 1
  };
  const activeRes = activeMat
    ? transformDigraph(activeDigraph.v1, activeDigraph.v2, activeMat)
    : { raw1: 0, raw2: 0, c1: 0, c2: 0, char1: "?", char2: "?" };

  if (viewMode === "geo") {
    drawGeometricView(0, 0, width, height, activeDigraph, activeRes, activeMat, false);
  } else if (viewMode === "calc") {
    drawCalculusView(0, 0, width, height, activeDigraph, activeRes, activeMat, false);
  } else if (viewMode === "both") {
    const halfH = Math.floor(height * 0.52);
    drawGeometricView(0, 0, width, halfH, activeDigraph, activeRes, activeMat, true);
    stroke(PALETTE.ink);
    strokeWeight(1);
    line(0, halfH, width, halfH);
    drawCalculusView(0, halfH, width, height - halfH, activeDigraph, activeRes, activeMat, true);
  }
}

// ==========================================
// VIEW 1: GEOMETRIC VECTOR SPACE (Z_48 x Z_48)
// ==========================================
function drawGeometricView(x, y, w, h, digraph, res, mat, isCompact = false) {
  push();
  translate(x, y);

  // Title and header
  fill(PALETTE.ink);
  noStroke();
  textAlign(LEFT, TOP);
  textSize(isCompact ? 11 : 13);
  textStyle(BOLD);
  text("PLANO VETORIAL DISCRETO ℤ₄₈ × ℤ₄₈", 18, 14);
  textStyle(NORMAL);
  textSize(isCompact ? 9 : 10.5);
  fill("#5e6863");
  text("Vetor Entrada p (Amarelo) ➔ Transformação Modular K·p mod 48 (Laranja)", 18, isCompact ? 28 : 32);

  // Compute grid bounds
  const padLeft = isCompact ? 48 : 60;
  const padBottom = isCompact ? 38 : 52;
  const padTop = isCompact ? 44 : 54;
  const hasSideLegend = !isCompact && w >= 650;
  const padRight = hasSideLegend ? 210 : 26;

  const availW = w - padLeft - padRight;
  const availH = h - padTop - padBottom;
  const gridDim = Math.max(100, Math.min(availW, availH));

  const originX = padLeft;
  const originY = padTop + gridDim;

  // Coordinate mapping functions
  const mapGridX = (val) => originX + (val / 47) * gridDim;
  const mapGridY = (val) => originY - (val / 47) * gridDim;

  // Draw grid background
  fill("#fffefb");
  stroke(PALETTE.ink);
  strokeWeight(1.2);
  rect(originX, padTop, gridDim, gridDim);

  // Draw grid lines
  const majorTicks = [0, 6, 12, 18, 24, 26, 30, 36, 38, 42, 47];
  for (let i = 0; i <= 47; i++) {
    const isMajor = majorTicks.includes(i);
    const gx = mapGridX(i);
    const gy = mapGridY(i);

    stroke(isMajor ? PALETTE.gridAxis : PALETTE.gridLine);
    strokeWeight(isMajor ? 0.7 : 0.35);
    line(gx, padTop, gx, originY);
    line(originX, gy, originX + gridDim, gy);

    if (isMajor) {
      // Axis labels
      noStroke();
      fill(PALETTE.ink);
      textSize(isCompact ? 7.5 : 8.8);
      textAlign(CENTER, TOP);
      const glyph = formatGlyph(CHARS[i]);
      text(`${i} (${glyph})`, gx, originY + 4);

      textAlign(RIGHT, CENTER);
      text(`${i} (${glyph})`, originX - 4, gy);
    }
  }

  // Axis Titles
  fill(PALETTE.ink);
  noStroke();
  textSize(isCompact ? 9 : 10);
  textAlign(CENTER, TOP);
  text("p₁ (1º símbolo)", originX + gridDim / 2, originY + (isCompact ? 20 : 28));

  push();
  translate(originX - (isCompact ? 32 : 44), padTop + gridDim / 2);
  rotate(-HALF_PI);
  textAlign(CENTER, BOTTOM);
  text("p₂ (2º símbolo)", 0, 0);
  pop();

  // Draw Transformed Basis Vectors Parallelogram if valid matrix
  if (mat) {
    const e1Trans = [mat[0][0], mat[1][0]]; // K * (1, 0) mod 48
    const e2Trans = [mat[0][1], mat[1][1]]; // K * (0, 1) mod 48
    const sumTrans = [mod(e1Trans[0] + e2Trans[0], MODULUS), mod(e1Trans[1] + e2Trans[1], MODULUS)];

    fill(92, 169, 155, 36);
    stroke(PALETTE.tealDark);
    strokeWeight(1);
    beginShape();
    vertex(mapGridX(0), mapGridY(0));
    vertex(mapGridX(e1Trans[0]), mapGridY(e1Trans[1]));
    vertex(mapGridX(sumTrans[0]), mapGridY(sumTrans[1]));
    vertex(mapGridX(e2Trans[0]), mapGridY(e2Trans[1]));
    endShape(CLOSE);
  }

  // Draw Input Vector p = (v1, v2)
  const pX = mapGridX(digraph.v1);
  const pY = mapGridY(digraph.v2);
  drawVectorArrow(originX, originY, pX, pY, PALETTE.yellow, PALETTE.ink, 3.2);

  // Draw Output Vector c = (c1, c2)
  if (res && mat) {
    const cX = mapGridX(res.c1);
    const cY = mapGridY(res.c2);

    // Connector dashed line between input and output point
    stroke(PALETTE.line);
    strokeWeight(1);
    drawingContext.setLineDash([4, 4]);
    line(pX, pY, cX, cY);
    drawingContext.setLineDash([]);

    // Output arrow
    drawVectorArrow(originX, originY, cX, cY, PALETTE.orange, PALETTE.ink, 3.2);

    // Output Point badge
    fill(PALETTE.orange);
    stroke(PALETTE.ink);
    strokeWeight(1.4);
    circle(cX, cY, isCompact ? 9 : 12);
    noStroke();
    fill(PALETTE.ink);
    textSize(isCompact ? 8.5 : 10);
    textStyle(BOLD);
    textAlign(LEFT, BOTTOM);
    text(`C = [${formatGlyph(res.char1)}, ${formatGlyph(res.char2)}] (${res.c1}, ${res.c2})`, cX + 6, cY - 3);
    textStyle(NORMAL);
  }

  // Input Point badge
  fill(PALETTE.yellow);
  stroke(PALETTE.ink);
  strokeWeight(1.4);
  circle(pX, pY, isCompact ? 9 : 12);
  noStroke();
  fill(PALETTE.ink);
  textSize(isCompact ? 8.5 : 10);
  textStyle(BOLD);
  textAlign(LEFT, BOTTOM);
  text(`P = [${formatGlyph(digraph.p1)}, ${formatGlyph(digraph.p2)}] (${digraph.v1}, ${digraph.v2})`, pX + 6, pY - 3);
  textStyle(NORMAL);

  // Side Legend
  if (hasSideLegend) {
    const legendX = originX + gridDim + 20;
    const legendW = w - legendX - 16;
    drawGeoLegend(legendX, padTop, legendW, gridDim, digraph, res, mat);
  }

  // Mouse inspection on grid
  handleGridMouseInspection(originX, padTop, gridDim, mapGridX, mapGridY, mat);

  pop();
}

function drawGeoLegend(lx, ly, lw, lh, digraph, res, mat) {
  fill("#fffefb");
  stroke(PALETTE.ink);
  strokeWeight(1);
  rect(lx, ly, lw, lh);

  fill(PALETTE.ink);
  noStroke();
  textAlign(LEFT, TOP);
  textSize(11);
  textStyle(BOLD);
  text("LEGENDA VETORIAL", lx + 12, ly + 12);
  textStyle(NORMAL);

  let curY = ly + 34;

  // Input Vector entry
  fill(PALETTE.yellow);
  stroke(PALETTE.ink);
  strokeWeight(1);
  rect(lx + 12, curY, 13, 13);
  noStroke();
  fill(PALETTE.ink);
  textSize(9.5);
  text(`Vetor Claro: p = (${digraph.v1}, ${digraph.v2})`, lx + 32, curY);
  fill("#68716c");
  textSize(8.5);
  text(`Dígrafo: "${formatGlyph(digraph.p1)}${formatGlyph(digraph.p2)}"`, lx + 32, curY + 13);

  curY += 34;

  // Output Vector entry
  if (res && mat) {
    fill(PALETTE.orange);
    stroke(PALETTE.ink);
    strokeWeight(1);
    rect(lx + 12, curY, 13, 13);
    noStroke();
    fill(PALETTE.ink);
    textSize(9.5);
    text(`Vetor Cifrado: c = (${res.c1}, ${res.c2})`, lx + 32, curY);
    fill("#68716c");
    textSize(8.5);
    text(`Dígrafo: "${formatGlyph(res.char1)}${formatGlyph(res.char2)}"`, lx + 32, curY + 13);
  }

  curY += 36;

  // Parallelogram entry
  fill(92, 169, 155, 60);
  stroke(PALETTE.tealDark);
  strokeWeight(1);
  rect(lx + 12, curY, 13, 13);
  noStroke();
  fill(PALETTE.ink);
  textSize(9.5);
  text("Paralelogramo Base", lx + 32, curY);
  fill("#68716c");
  textSize(8.5);
  text("K·e₁ e K·e₂ mod 48", lx + 32, curY + 13);

  curY += 36;

  // Modular Wrap note
  stroke(PALETTE.line);
  line(lx + 12, curY, lx + lw - 12, curY);
  curY += 10;

  noStroke();
  fill(PALETTE.ink);
  textSize(9.5);
  textStyle(BOLD);
  text("Mapeamento Modular:", lx + 12, curY);
  textStyle(NORMAL);
  curY += 14;

  if (res && mat) {
    fill("#444e48");
    textSize(8.5);
    text(`Sem mod: (${res.raw1}, ${res.raw2})`, lx + 12, curY);
    curY += 13;
    text(`${res.raw1} = ${Math.floor(res.raw1 / MODULUS)}×48 + ${res.c1}`, lx + 12, curY);
    curY += 13;
    text(`${res.raw2} = ${Math.floor(res.raw2 / MODULUS)}×48 + ${res.c2}`, lx + 12, curY);
  }
}

function handleGridMouseInspection(originX, padTop, gridDim, mapGridX, mapGridY, mat) {
  if (
    mouseX >= originX &&
    mouseX <= originX + gridDim &&
    mouseY >= padTop &&
    mouseY <= padTop + gridDim
  ) {
    const rawX = ((mouseX - originX) / gridDim) * 47;
    const rawY = ((padTop + gridDim - mouseY) / gridDim) * 47;
    const ix = Math.min(47, Math.max(0, Math.round(rawX)));
    const iy = Math.min(47, Math.max(0, Math.round(rawY)));

    const snapX = mapGridX(ix);
    const snapY = mapGridY(iy);

    // Crosshair
    stroke(PALETTE.orange);
    strokeWeight(1);
    drawingContext.setLineDash([3, 3]);
    line(originX, snapY, originX + gridDim, snapY);
    line(snapX, padTop, snapX, padTop + gridDim);
    drawingContext.setLineDash([]);

    // Inspection tooltip
    const res = mat ? transformDigraph(ix, iy, mat) : null;
    const g1 = formatGlyph(CHARS[ix]);
    const g2 = formatGlyph(CHARS[iy]);
    const tipText = res
      ? `(${ix}, ${iy}) [${g1}${g2}] ➔ (${res.c1}, ${res.c2}) [${formatGlyph(res.char1)}${formatGlyph(res.char2)}]`
      : `(${ix}, ${iy}) [${g1}${g2}]`;

    fill(PALETTE.ink);
    stroke("#fff");
    strokeWeight(1);
    const boxW = tipText.length * 7 + 16;
    const boxX = Math.min(mouseX + 12, width - boxW - 8);
    rect(boxX, mouseY - 24, boxW, 22);

    noStroke();
    fill("#fff");
    textSize(9.5);
    textAlign(LEFT, CENTER);
    text(tipText, boxX + 8, mouseY - 13);
  }
}

function drawVectorArrow(x1, y1, x2, y2, fillColor, strokeColor, weight = 2) {
  stroke(strokeColor);
  strokeWeight(weight);
  line(x1, y1, x2, y2);

  // Arrowhead
  const angle = atan2(y2 - y1, x2 - x1);
  const headSize = 9;
  push();
  translate(x2, y2);
  rotate(angle);
  fill(fillColor);
  stroke(strokeColor);
  strokeWeight(1.2);
  triangle(0, 0, -headSize, -headSize * 0.5, -headSize, headSize * 0.5);
  pop();
}

// ==========================================
// VIEW 2: STEP-BY-STEP MATRIX CALCULUS (Z_48)
// ==========================================
function drawCalculusView(x, y, w, h, digraph, res, mat, isCompact = false) {
  push();
  translate(x, y);

  fill(PALETTE.ink);
  noStroke();
  textAlign(LEFT, TOP);
  textSize(isCompact ? 11 : 13);
  textStyle(BOLD);
  text("CÁLCULO MATRICIAL PASSO A PASSO (ℤ₄₈)", 18, 14);
  textStyle(NORMAL);
  textSize(isCompact ? 9 : 10.5);
  fill("#5e6863");
  text("Multiplicação linha por coluna no anel modular ℤ₄₈ (48 símbolos)", 18, isCompact ? 28 : 32);

  if (!mat) {
    fill(PALETTE.red);
    textSize(12);
    text("✕ Matriz chave inválida: não é possível calcular a transformação.", 24, 60);
    pop();
    return;
  }

  const startY = isCompact ? 48 : 60;

  // Render Matrix Equation
  drawMatrixEquation(20, startY, w - 40, digraph, res, mat, isCompact);

  // Detailed Step-by-Step Rows
  const rowStartY = startY + (isCompact ? 76 : 96);
  drawRowCalculations(20, rowStartY, w - 40, digraph, res, mat, isCompact);

  // Modular Alphabet Ribbon at bottom if enough room
  if (!isCompact && h >= 530) {
    drawAlphabetRibbon(20, h - 96, w - 40, digraph, res);
  }

  pop();
}

function drawMatrixEquation(ex, ey, ew, digraph, res, mat, isCompact) {
  const bH = isCompact ? 60 : 76;
  const m11 = mat[0][0],
    m12 = mat[0][1],
    m21 = mat[1][0],
    m22 = mat[1][1];
  const p1 = digraph.v1,
    p2 = digraph.v2;

  fill("#fffefb");
  stroke(PALETTE.ink);
  strokeWeight(1);
  rect(ex, ey, ew, bH);

  let curX = ex + 14;
  const midY = ey + bH / 2;

  // Matrix K brackets and entries
  curX = drawBracketedMatrix(curX, midY, [[m11, m12], [m21, m22]], isCompact ? 44 : 54, isCompact ? 34 : 44, PALETTE.ink);

  // Multiplication symbol
  noStroke();
  fill(PALETTE.ink);
  textSize(isCompact ? 13 : 16);
  textAlign(CENTER, CENTER);
  text("·", curX + 10, midY);
  curX += 20;

  // Vector P brackets and entries
  curX = drawBracketedVector(
    curX,
    midY,
    [p1, p2],
    [formatGlyph(digraph.p1), formatGlyph(digraph.p2)],
    isCompact ? 30 : 36,
    isCompact ? 34 : 44,
    PALETTE.yellow
  );

  // Equals symbol
  noStroke();
  fill(PALETTE.ink);
  textSize(isCompact ? 12 : 15);
  textAlign(CENTER, CENTER);
  text("=", curX + 12, midY);
  curX += 24;

  // Expanded Dot Product Vector (if screen is wide enough)
  if (ew >= 520) {
    curX = drawBracketedExpressions(
      curX,
      midY,
      [
        `(${m11}·${p1}) + (${m12}·${p2})`,
        `(${m21}·${p1}) + (${m22}·${p2})`
      ],
      isCompact ? 120 : 154,
      isCompact ? 34 : 44
    );

    // Equals symbol
    noStroke();
    fill(PALETTE.ink);
    textSize(isCompact ? 12 : 15);
    textAlign(CENTER, CENTER);
    text("=", curX + 12, midY);
    curX += 24;
  }

  // Raw sums vector
  curX = drawBracketedVector(curX, midY, [res.raw1, res.raw2], null, isCompact ? 32 : 40, isCompact ? 34 : 44, "#e8e2d5");

  // Equivalence mod 48 symbol
  noStroke();
  fill(PALETTE.ink);
  textSize(isCompact ? 12 : 15);
  textAlign(CENTER, CENTER);
  text("≡", curX + 12, midY);
  curX += 24;

  // Modulo 48 Result Vector C
  curX = drawBracketedVector(
    curX,
    midY,
    [res.c1, res.c2],
    [formatGlyph(res.char1), formatGlyph(res.char2)],
    isCompact ? 32 : 40,
    isCompact ? 34 : 44,
    PALETTE.orange
  );

  // Mod 48 label
  noStroke();
  fill(PALETTE.ink);
  textSize(isCompact ? 9 : 11);
  textAlign(LEFT, CENTER);
  text("(mod 48)", curX + 6, midY);
}

function drawBracketedMatrix(bx, cy, values, w, h, col) {
  stroke(col);
  strokeWeight(1.4);
  noFill();
  line(bx + 4, cy - h / 2, bx, cy - h / 2);
  line(bx, cy - h / 2, bx, cy + h / 2);
  line(bx, cy + h / 2, bx + 4, cy + h / 2);

  line(bx + w - 4, cy - h / 2, bx + w, cy - h / 2);
  line(bx + w, cy - h / 2, bx + w, cy + h / 2);
  line(bx + w, cy + h / 2, bx + w - 4, cy + h / 2);

  noStroke();
  fill(col);
  textSize(11);
  textStyle(BOLD);
  textAlign(CENTER, CENTER);
  text(values[0][0], bx + w * 0.3, cy - h * 0.25);
  text(values[0][1], bx + w * 0.7, cy - h * 0.25);
  text(values[1][0], bx + w * 0.3, cy + h * 0.25);
  text(values[1][1], bx + w * 0.7, cy + h * 0.25);
  textStyle(NORMAL);

  return bx + w;
}

function drawBracketedVector(bx, cy, values, letters, w, h, bgHighlight) {
  fill(bgHighlight);
  stroke(PALETTE.ink);
  strokeWeight(0.8);
  rect(bx + 2, cy - h / 2 + 1, w - 4, h - 2);

  stroke(PALETTE.ink);
  strokeWeight(1.4);
  noFill();
  line(bx + 4, cy - h / 2, bx, cy - h / 2);
  line(bx, cy - h / 2, bx, cy + h / 2);
  line(bx, cy + h / 2, bx + 4, cy + h / 2);

  line(bx + w - 4, cy - h / 2, bx + w, cy - h / 2);
  line(bx + w, cy - h / 2, bx + w, cy + h / 2);
  line(bx + w, cy + h / 2, bx + w - 4, cy + h / 2);

  noStroke();
  fill(PALETTE.ink);
  textSize(10.5);
  textStyle(BOLD);
  textAlign(CENTER, CENTER);
  const text1 = letters ? `${values[0]} '${letters[0]}'` : `${values[0]}`;
  const text2 = letters ? `${values[1]} '${letters[1]}'` : `${values[1]}`;
  text(text1, bx + w / 2, cy - h * 0.25);
  text(text2, bx + w / 2, cy + h * 0.25);
  textStyle(NORMAL);

  return bx + w;
}

function drawBracketedExpressions(bx, cy, exprs, w, h) {
  stroke(PALETTE.ink);
  strokeWeight(1.4);
  noFill();
  line(bx + 4, cy - h / 2, bx, cy - h / 2);
  line(bx, cy - h / 2, bx, cy + h / 2);
  line(bx, cy + h / 2, bx + 4, cy + h / 2);

  line(bx + w - 4, cy - h / 2, bx + w, cy - h / 2);
  line(bx + w, cy - h / 2, bx + w, cy + h / 2);
  line(bx + w, cy + h / 2, bx + w - 4, cy + h / 2);

  noStroke();
  fill(PALETTE.ink);
  textSize(9.5);
  textAlign(CENTER, CENTER);
  text(exprs[0], bx + w / 2, cy - h * 0.25);
  text(exprs[1], bx + w / 2, cy + h * 0.25);

  return bx + w;
}

function drawRowCalculations(rx, ry, rw, digraph, res, mat, isCompact) {
  const rowH = isCompact ? 54 : 68;
  const m11 = mat[0][0],
    m12 = mat[0][1],
    m21 = mat[1][0],
    m22 = mat[1][1];
  const p1 = digraph.v1,
    p2 = digraph.v2;

  // Box 1: Linha 1
  fill("#fffefb");
  stroke(PALETTE.ink);
  strokeWeight(1);
  rect(rx, ry, rw, rowH);

  fill(PALETTE.ink);
  noStroke();
  textAlign(LEFT, TOP);
  textSize(isCompact ? 9.5 : 10.5);
  textStyle(BOLD);
  text("Linha 1 ➔ 1º Símbolo do Dígrafo:", rx + 12, ry + 8);
  textStyle(NORMAL);

  const term11 = m11 * p1;
  const term12 = m12 * p2;
  const q1 = Math.floor(res.raw1 / MODULUS);
  textSize(isCompact ? 8.5 : 10);
  fill("#2d3732");
  text(
    `c₁ = (${m11} × ${p1} + ${m12} × ${p2}) mod 48 = (${term11} + ${term12}) mod 48 = ${res.raw1} mod 48`,
    rx + 12,
    ry + (isCompact ? 24 : 28)
  );

  fill(PALETTE.orange);
  textStyle(BOLD);
  text(
    `   = ${res.raw1} - (${q1} × 48) = ${res.c1} ➔ Símbolo '${formatGlyph(res.char1)}'`,
    rx + 12,
    ry + (isCompact ? 38 : 45)
  );
  textStyle(NORMAL);

  // Box 2: Linha 2
  const ry2 = ry + rowH + (isCompact ? 8 : 10);
  fill("#fffefb");
  stroke(PALETTE.ink);
  strokeWeight(1);
  rect(rx, ry2, rw, rowH);

  fill(PALETTE.ink);
  noStroke();
  textAlign(LEFT, TOP);
  textSize(isCompact ? 9.5 : 10.5);
  textStyle(BOLD);
  text("Linha 2 ➔ 2º Símbolo do Dígrafo:", rx + 12, ry2 + 8);
  textStyle(NORMAL);

  const term21 = m21 * p1;
  const term22 = m22 * p2;
  const q2 = Math.floor(res.raw2 / MODULUS);
  textSize(isCompact ? 8.5 : 10);
  fill("#2d3732");
  text(
    `c₂ = (${m21} × ${p1} + ${m22} × ${p2}) mod 48 = (${term21} + ${term22}) mod 48 = ${res.raw2} mod 48`,
    rx + 12,
    ry2 + (isCompact ? 24 : 28)
  );

  fill(PALETTE.orange);
  textStyle(BOLD);
  text(
    `   = ${res.raw2} - (${q2} × 48) = ${res.c2} ➔ Símbolo '${formatGlyph(res.char2)}'`,
    rx + 12,
    ry2 + (isCompact ? 38 : 45)
  );
  textStyle(NORMAL);
}

// 2-row ribbon of all 48 symbols at bottom of canvas
function drawAlphabetRibbon(ax, ay, aw, digraph, res) {
  fill("#f6f2e8");
  stroke(PALETTE.ink);
  strokeWeight(1);
  rect(ax, ay, aw, 78);

  fill(PALETTE.ink);
  noStroke();
  textAlign(LEFT, TOP);
  textSize(9.5);
  textStyle(BOLD);
  text("TABELA DE REFERÊNCIA RÁPIDA (48 SÍMBOLOS EM ℤ₄₈):", ax + 10, ay + 5);
  textStyle(NORMAL);

  const cols = 24;
  const cellW = (aw - 20) / cols;
  const cellH = 24;

  for (let i = 0; i < MODULUS; i++) {
    const row = i < 24 ? 0 : 1;
    const col = i % 24;
    const cx = ax + 10 + col * cellW;
    const cy = ay + 22 + row * (cellH + 2);

    const isInput = i === digraph.v1 || i === digraph.v2;
    const isOutput = res && (i === res.c1 || i === res.c2);

    if (isInput && isOutput) {
      fill("#e89f3c");
      stroke(PALETTE.ink);
      rect(cx, cy, cellW - 1, cellH);
    } else if (isOutput) {
      fill(PALETTE.orange);
      stroke(PALETTE.ink);
      rect(cx, cy, cellW - 1, cellH);
    } else if (isInput) {
      fill(PALETTE.yellow);
      stroke(PALETTE.ink);
      rect(cx, cy, cellW - 1, cellH);
    } else {
      fill("#fffdf7");
      stroke(PALETTE.line);
      rect(cx, cy, cellW - 1, cellH);
    }

    noStroke();
    fill(isOutput || isInput ? PALETTE.ink : "#555e59");
    textSize(8.5);
    textStyle(isOutput || isInput ? BOLD : NORMAL);
    textAlign(CENTER, CENTER);
    text(formatGlyph(CHARS[i]), cx + cellW / 2, cy + 8);
    textSize(6.5);
    text(i, cx + cellW / 2, cy + 18);
    textStyle(NORMAL);
  }
}
