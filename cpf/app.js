// Checksum do CPF - Visualizador Interativo de Somas Ponderadas e Aritmética Modular Z_11
// Laboratório de Matemática e Ensino

document.addEventListener("DOMContentLoaded", () => {
  const REGIONS = {
    "1": "1ª RF: DF, GO, MT, MS, TO",
    "2": "2ª RF: AC, AP, AM, PA, RO, RR",
    "3": "3ª RF: CE, MA, PI",
    "4": "4ª RF: AL, PB, PE, RN",
    "5": "5ª RF: BA, SE",
    "6": "6ª RF: MG",
    "7": "7ª RF: ES, RJ",
    "8": "8ª RF: SP",
    "9": "9ª RF: PR, SC",
    "0": "10ª RF: RS"
  };

  const inputs = Array.from(document.querySelectorAll(".digit-input"));
  const btnCalcDVs = document.getElementById("btnCalcDVs");
  const btnRandomCpf = document.getElementById("btnRandomCpf");
  const btnClearCpf = document.getElementById("btnClearCpf");
  const presetButtons = document.querySelectorAll("[data-preset]");

  // Status elements
  const validationBadge = document.getElementById("validationBadge");
  const validationMessage = document.getElementById("validationMessage");
  const regionName = document.getElementById("regionName");

  // DV1 table elements
  const dv1RowDigits = document.getElementById("dv1RowDigits");
  const dv1RowProducts = document.getElementById("dv1RowProducts");
  const dv1FormulaText = document.getElementById("dv1FormulaText");
  const dv1SumVal = document.getElementById("dv1SumVal");
  const dv1DivStep = document.getElementById("dv1DivStep");
  const dv1RestoVal = document.getElementById("dv1RestoVal");
  const dv1RuleText = document.getElementById("dv1RuleText");
  const dv1FinalVal = document.getElementById("dv1FinalVal");
  const dv1Comparison = document.getElementById("dv1Comparison");

  // DV2 table elements
  const dv2RowDigits = document.getElementById("dv2RowDigits");
  const dv2RowProducts = document.getElementById("dv2RowProducts");
  const dv2FormulaText = document.getElementById("dv2FormulaText");
  const dv2SumVal = document.getElementById("dv2SumVal");
  const dv2DivStep = document.getElementById("dv2DivStep");
  const dv2RestoVal = document.getElementById("dv2RestoVal");
  const dv2RuleText = document.getElementById("dv2RuleText");
  const dv2FinalVal = document.getElementById("dv2FinalVal");
  const dv2Comparison = document.getElementById("dv2Comparison");

  // Theory tabs
  const tabBtns = document.querySelectorAll(".theory-tab-btn");
  const tabPanes = document.querySelectorAll(".theory-pane");

  // Error simulation lab
  const btnSimSingleError = document.getElementById("btnSimSingleError");
  const btnSimSwapError = document.getElementById("btnSimSwapError");
  const btnRestoreCpf = document.getElementById("btnRestoreCpf");
  const errorSimResult = document.getElementById("errorSimResult");
  const errorSimTitle = document.getElementById("errorSimTitle");
  const errorSimExplanation = document.getElementById("errorSimExplanation");

  let lastValidCpfDigits = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 9];

  // Helper: Get array of 11 values from inputs (null if empty)
  function getDigits() {
    return inputs.map((input) => {
      const v = input.value.trim();
      return /^[0-9]$/.test(v) ? parseInt(v, 10) : null;
    });
  }

  // Helper: Set inputs from digit array
  function setDigits(arr) {
    inputs.forEach((input, i) => {
      input.value = arr[i] !== null && arr[i] !== undefined ? String(arr[i]) : "";
    });
    recompute();
  }

  // Helper: Check if all digits are equal
  function allDigitsIdentical(arr) {
    if (arr.some((d) => d === null)) return false;
    return arr.every((d) => d === arr[0]);
  }

  // Core computation & reactive update
  function recompute() {
    const digits = getDigits();
    const d1_9 = digits.slice(0, 9);
    const typedDV1 = digits[9];
    const typedDV2 = digits[10];

    // Fiscal Region (9th digit, index 8)
    const d9 = digits[8];
    if (d9 !== null) {
      regionName.textContent = REGIONS[String(d9)] || "Desconhecida";
    } else {
      regionName.textContent = "Aguardando d₉...";
    }

    // --- 1. Compute DV1 ---
    const w1 = [10, 9, 8, 7, 6, 5, 4, 3, 2];
    let s1 = 0;
    let s1Terms = [];
    let dv1CellsDigits = '<td style="font-size:0.65rem; font-family:\'DM Mono\'; color:#8c8273;">Dígito</td>';
    let dv1CellsProducts = '<td style="font-size:0.65rem; color:#8c8273;">d × p</td>';

    for (let i = 0; i < 9; i++) {
      const d = d1_9[i];
      if (d !== null) {
        const prod = d * w1[i];
        s1 += prod;
        s1Terms.push(`${d}×${w1[i]}(=${prod})`);
        dv1CellsDigits += `<td>${d}</td>`;
        dv1CellsProducts += `<td>${prod}</td>`;
      } else {
        dv1CellsDigits += `<td style="color:#c9c1b1;">—</td>`;
        dv1CellsProducts += `<td style="color:#c9c1b1;">—</td>`;
      }
    }

    dv1RowDigits.innerHTML = dv1CellsDigits;
    dv1RowProducts.innerHTML = dv1CellsProducts;

    const baseComplete = d1_9.every((d) => d !== null);

    let calcDV1 = null;
    if (baseComplete) {
      dv1FormulaText.textContent = `S₁ = ${s1Terms.join(" + ")} = ${s1}`;
      dv1SumVal.textContent = s1;

      const q1 = Math.floor(s1 / 11);
      const r1 = s1 % 11;
      dv1DivStep.textContent = `${s1} = (11 × ${q1}) + resto ${r1}`;
      dv1RestoVal.textContent = r1;

      calcDV1 = r1 < 2 ? 0 : 11 - r1;
      dv1RuleText.innerHTML =
        r1 < 2
          ? `Como R₁ = <strong>${r1} &lt; 2</strong> ➔ <strong>DV₁ = 0</strong>`
          : `Como R₁ = <strong>${r1} ≥ 2</strong> ➔ DV₁ = 11 - ${r1} = <strong>${calcDV1}</strong>`;
      dv1FinalVal.textContent = calcDV1;

      if (typedDV1 !== null) {
        if (typedDV1 === calcDV1) {
          dv1Comparison.innerHTML = `<span style="color:var(--green); font-weight:600;">✓ Coincide com o d₁₀ digitado (${typedDV1})</span>`;
        } else {
          dv1Comparison.innerHTML = `<span style="color:var(--red); font-weight:600;">⚠️ Difere do d₁₀ digitado (${typedDV1})</span>`;
        }
      } else {
        dv1Comparison.textContent = "Aguardando preenchimento de d₁₀";
      }
    } else {
      dv1FormulaText.textContent = s1Terms.length ? `S₁ (parcial) = ${s1Terms.join(" + ")} = ${s1}` : "S₁ = ...";
      dv1SumVal.textContent = s1Terms.length ? `${s1} (parcial)` : "0";
      dv1DivStep.textContent = "Preencha os 9 primeiros dígitos";
      dv1RestoVal.textContent = "—";
      dv1RuleText.textContent = "Se R₁ < 2 ➔ DV₁ = 0; senão ➔ 11 - R₁";
      dv1FinalVal.textContent = "—";
      dv1Comparison.textContent = "Aguardando d₁ até d₉";
    }

    // --- 2. Compute DV2 ---
    const effectiveDV1 = baseComplete ? (typedDV1 !== null ? typedDV1 : calcDV1) : null;
    const w2 = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
    let s2 = 0;
    let s2Terms = [];
    let dv2CellsDigits = '<td style="font-size:0.65rem; font-family:\'DM Mono\'; color:#8c8273;">Dígito</td>';
    let dv2CellsProducts = '<td style="font-size:0.65rem; color:#8c8273;">d × p</td>';

    const d1_10 = [...d1_9, effectiveDV1];

    for (let i = 0; i < 10; i++) {
      const d = d1_10[i];
      const isDV1Pos = i === 9;
      if (d !== null && d !== undefined) {
        const prod = d * w2[i];
        s2 += prod;
        s2Terms.push(`${d}×${w2[i]}(=${prod})`);
        dv2CellsDigits += `<td class="${isDV1Pos ? "highlight-dv" : ""}">${d}</td>`;
        dv2CellsProducts += `<td class="${isDV1Pos ? "highlight-dv" : ""}">${prod}</td>`;
      } else {
        dv2CellsDigits += `<td class="${isDV1Pos ? "highlight-dv" : ""}" style="color:#c9c1b1;">—</td>`;
        dv2CellsProducts += `<td class="${isDV1Pos ? "highlight-dv" : ""}" style="color:#c9c1b1;">—</td>`;
      }
    }

    dv2RowDigits.innerHTML = dv2CellsDigits;
    dv2RowProducts.innerHTML = dv2CellsProducts;

    let calcDV2 = null;
    if (baseComplete && effectiveDV1 !== null) {
      dv2FormulaText.textContent = `S₂ = ${s2Terms.join(" + ")} = ${s2}`;
      dv2SumVal.textContent = s2;

      const q2 = Math.floor(s2 / 11);
      const r2 = s2 % 11;
      dv2DivStep.textContent = `${s2} = (11 × ${q2}) + resto ${r2}`;
      dv2RestoVal.textContent = r2;

      calcDV2 = r2 < 2 ? 0 : 11 - r2;
      dv2RuleText.innerHTML =
        r2 < 2
          ? `Como R₂ = <strong>${r2} &lt; 2</strong> ➔ <strong>DV₂ = 0</strong>`
          : `Como R₂ = <strong>${r2} ≥ 2</strong> ➔ DV₂ = 11 - ${r2} = <strong>${calcDV2}</strong>`;
      dv2FinalVal.textContent = calcDV2;

      if (typedDV2 !== null) {
        if (typedDV2 === calcDV2) {
          dv2Comparison.innerHTML = `<span style="color:var(--green); font-weight:600;">✓ Coincide com o d₁₁ digitado (${typedDV2})</span>`;
        } else {
          dv2Comparison.innerHTML = `<span style="color:var(--red); font-weight:600;">⚠️ Difere do d₁₁ digitado (${typedDV2})</span>`;
        }
      } else {
        dv2Comparison.textContent = "Aguardando preenchimento de d₁₁";
      }
    } else {
      dv2FormulaText.textContent = s2Terms.length ? `S₂ (parcial) = ${s2Terms.join(" + ")} = ${s2}` : "S₂ = ...";
      dv2SumVal.textContent = s2Terms.length ? `${s2} (parcial)` : "0";
      dv2DivStep.textContent = "Preencha os 9 primeiros dígitos";
      dv2RestoVal.textContent = "—";
      dv2RuleText.textContent = "Se R₂ < 2 ➔ DV₂ = 0; senão ➔ 11 - R₂";
      dv2FinalVal.textContent = "—";
      dv2Comparison.textContent = "Aguardando d₁ até d₁₀";
    }

    // --- 3. Overall Validation Status ---
    const allFilled = digits.every((d) => d !== null);

    if (allFilled) {
      if (allDigitsIdentical(digits)) {
        validationBadge.className = "status-badge invalid";
        validationBadge.textContent = "Inválido (Dígitos Repetidos)";
        validationMessage.textContent = "Apesar de satisfazer o checksum elementar, a Receita Federal rejeita números com todos os 11 dígitos idênticos.";
      } else {
        const dv1Ok = typedDV1 === calcDV1;
        const dv2Ok = typedDV2 === calcDV2;

        if (dv1Ok && dv2Ok) {
          validationBadge.className = "status-badge valid";
          validationBadge.textContent = "CPF Válido ✓";
          validationMessage.textContent = "Ambos os dígitos verificadores foram conferidos com sucesso pelas equações modulares em ℤ₁₁.";
          lastValidCpfDigits = [...digits];
        } else {
          validationBadge.className = "status-badge invalid";
          validationBadge.textContent = "CPF Inválido ✕";
          const errors = [];
          if (!dv1Ok) errors.push(`d₁₀ digitado foi ${typedDV1}, mas o cálculo exigia ${calcDV1}`);
          if (!dv2Ok) errors.push(`d₁₁ digitado foi ${typedDV2}, mas o cálculo exigia ${calcDV2}`);
          validationMessage.textContent = "Inconsistência detectada: " + errors.join("; ");
        }
      }
    } else {
      const missingCount = digits.filter((d) => d === null).length;
      validationBadge.className = "status-badge incomplete";
      validationBadge.textContent = "Preenchimento Incompleto";
      validationMessage.textContent = `Faltam preencher ${missingCount} dígito(s) para validar completamente o CPF.`;
    }
  }

  // --- Input Events: Typing, Auto-Advance, Backspace, Arrows, Paste ---
  inputs.forEach((input, idx) => {
    input.addEventListener("input", (e) => {
      let val = input.value.replace(/\D/g, "");
      if (val.length > 1) {
        val = val.slice(-1);
      }
      input.value = val;

      if (val && idx < inputs.length - 1) {
        inputs[idx + 1].focus();
        inputs[idx + 1].select();
      }
      recompute();
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !input.value && idx > 0) {
        inputs[idx - 1].focus();
        inputs[idx - 1].select();
      } else if (e.key === "ArrowLeft" && idx > 0) {
        e.preventDefault();
        inputs[idx - 1].focus();
        inputs[idx - 1].select();
      } else if (e.key === "ArrowRight" && idx < inputs.length - 1) {
        e.preventDefault();
        inputs[idx + 1].focus();
        inputs[idx + 1].select();
      }
    });

    input.addEventListener("paste", (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData("text");
      const cleanDigits = text.replace(/\D/g, "").split("");
      if (!cleanDigits.length) return;

      const startIdx = cleanDigits.length === 11 ? 0 : idx;
      cleanDigits.forEach((char, offset) => {
        const target = startIdx + offset;
        if (target < inputs.length) {
          inputs[target].value = char;
        }
      });

      const nextFocus = Math.min(startIdx + cleanDigits.length, inputs.length - 1);
      inputs[nextFocus].focus();
      recompute();
    });

    input.addEventListener("focus", () => {
      input.select();
    });
  });

  // --- Buttons Handling ---
  btnCalcDVs.addEventListener("click", () => {
    const digits = getDigits();
    const d1_9 = digits.slice(0, 9);
    if (d1_9.some((d) => d === null)) {
      alert("Por favor, preencha ao menos os 9 primeiros dígitos para calcular os DVs.");
      return;
    }

    // DV1
    const w1 = [10, 9, 8, 7, 6, 5, 4, 3, 2];
    let s1 = 0;
    for (let i = 0; i < 9; i++) s1 += d1_9[i] * w1[i];
    const r1 = s1 % 11;
    const dv1 = r1 < 2 ? 0 : 11 - r1;
    inputs[9].value = dv1;

    // DV2
    const w2 = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
    const d1_10 = [...d1_9, dv1];
    let s2 = 0;
    for (let i = 0; i < 10; i++) s2 += d1_10[i] * w2[i];
    const r2 = s2 % 11;
    const dv2 = r2 < 2 ? 0 : 11 - r2;
    inputs[10].value = dv2;

    recompute();
  });

  btnRandomCpf.addEventListener("click", () => {
    let rand9;
    do {
      rand9 = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
    } while (rand9.every((d) => d === rand9[0])); // avoid all identical

    const w1 = [10, 9, 8, 7, 6, 5, 4, 3, 2];
    let s1 = 0;
    for (let i = 0; i < 9; i++) s1 += rand9[i] * w1[i];
    const r1 = s1 % 11;
    const dv1 = r1 < 2 ? 0 : 11 - r1;

    const w2 = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
    const d1_10 = [...rand9, dv1];
    let s2 = 0;
    for (let i = 0; i < 10; i++) s2 += d1_10[i] * w2[i];
    const r2 = s2 % 11;
    const dv2 = r2 < 2 ? 0 : 11 - r2;

    const fullCpf = [...rand9, dv1, dv2];
    setDigits(fullCpf);
    inputs[0].focus();
  });

  btnClearCpf.addEventListener("click", () => {
    inputs.forEach((input) => (input.value = ""));
    recompute();
    inputs[0].focus();
  });

  presetButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const presetStr = btn.getAttribute("data-preset");
      const arr = presetStr.split("").map(Number);
      setDigits(arr);
    });
  });

  // --- Theory Tabs Logic ---
  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabBtns.forEach((b) => b.classList.remove("active"));
      tabPanes.forEach((p) => p.classList.remove("active"));

      btn.classList.add("active");
      const target = document.getElementById(btn.getAttribute("data-tab"));
      if (target) target.classList.add("active");
    });
  });

  // --- Error Simulation Lab Logic ---
  btnSimSingleError.addEventListener("click", () => {
    // If not currently valid, generate a random valid one first
    const digits = getDigits();
    if (digits.some((d) => d === null) || validationBadge.className.includes("invalid")) {
      btnRandomCpf.click();
    }

    const currentDigits = getDigits();
    lastValidCpfDigits = [...currentDigits];

    // Pick a random index between 0 and 8 (base digits)
    const idx = Math.floor(Math.random() * 9);
    const origVal = currentDigits[idx];
    let wrongVal;
    do {
      wrongVal = Math.floor(Math.random() * 10);
    } while (wrongVal === origVal);

    currentDigits[idx] = wrongVal;
    setDigits(currentDigits);

    // Highlight modified input
    inputs[idx].style.borderColor = "var(--red)";
    inputs[idx].style.boxShadow = "0 0 0 4px rgba(217, 67, 52, 0.4)";
    setTimeout(() => {
      inputs[idx].style.borderColor = "";
      inputs[idx].style.boxShadow = "";
    }, 2800);

    const weight1 = 10 - idx;
    const diff = wrongVal - origVal;
    const deltaS = diff * weight1;

    errorSimResult.style.display = "block";
    errorSimTitle.textContent = `Erro de Dígito Único Injetado na Posição ${idx + 1} (d${idx + 1})`;
    errorSimExplanation.innerHTML = `
      O dígito original era <strong>${origVal}</strong> e foi alterado para <strong>${wrongVal}</strong> (diferença $e = ${diff > 0 ? "+" + diff : diff}$).<br/>
      O peso nessa posição é $w = ${weight1}$. A alteração na soma ponderada foi:<br/>
      $$\\Delta S_1 = ${weight1} \\times (${diff}) = ${deltaS} \\not\\equiv 0 \\pmod{11}$$
      Como $11$ é primo e não divide nem o peso ($w \\le 10$) nem a diferença ($1 \\le |e| \\le 9$), <strong>o resto da divisão fatalmente mudou</strong> e o erro foi 100% detectado!
    `;
    triggerMathRender(errorSimExplanation);
  });

  btnSimSwapError.addEventListener("click", () => {
    const digits = getDigits();
    if (digits.some((d) => d === null) || validationBadge.className.includes("invalid")) {
      btnRandomCpf.click();
    }

    const currentDigits = getDigits();
    lastValidCpfDigits = [...currentDigits];

    // Find two adjacent distinct digits in base digits (0..7)
    let swapIdx = -1;
    for (let i = 0; i < 8; i++) {
      if (currentDigits[i] !== currentDigits[i + 1]) {
        swapIdx = i;
        break;
      }
    }

    if (swapIdx === -1) {
      btnRandomCpf.click();
      return btnSimSwapError.click();
    }

    const a = currentDigits[swapIdx];
    const b = currentDigits[swapIdx + 1];

    currentDigits[swapIdx] = b;
    currentDigits[swapIdx + 1] = a;
    setDigits(currentDigits);

    // Highlight swapped inputs
    [swapIdx, swapIdx + 1].forEach((i) => {
      inputs[i].style.borderColor = "var(--red)";
      inputs[i].style.boxShadow = "0 0 0 4px rgba(217, 67, 52, 0.4)";
      setTimeout(() => {
        inputs[i].style.borderColor = "";
        inputs[i].style.boxShadow = "";
      }, 2800);
    });

    const diff = a - b;
    errorSimResult.style.display = "block";
    errorSimTitle.textContent = `Transposição de Dígitos Adjacentes Injetada (Posições ${swapIdx + 1} e ${swapIdx + 2})`;
    errorSimExplanation.innerHTML = `
      Os dígitos vizinhos <strong>${a}</strong> e <strong>${b}</strong> trocaram de lugar, virando <strong>${b}</strong> e <strong>${a}</strong>.<br/>
      Como os pesos adjacentes diferem sempre de exatamente $1$ ($w_i - w_{i+1} = 1$), a variação na soma ponderada é simplesmente:<br/>
      $$\\Delta S_1 = (${a} - ${b}) \\times 1 = ${diff} \\not\\equiv 0 \\pmod{11}$$
      Essa propriedade matemática garante que <strong>100% das trocas acidentais de dois dígitos consecutivos são identificadas</strong> pelo algoritmo!
    `;
    triggerMathRender(errorSimExplanation);
  });

  function triggerMathRender(el = document.body) {
    if (window.renderMathInElement) {
      try {
        window.renderMathInElement(el, {
          delimiters: [
            { left: "$$", right: "$$", display: true },
            { left: "$", right: "$", display: false }
          ],
          throwOnError: false
        });
      } catch (e) {
        // fallback
      }
    }
  }

  btnRestoreCpf.addEventListener("click", () => {
    setDigits(lastValidCpfDigits);
    errorSimResult.style.display = "none";
  });

  // Initial computation on load with default example
  recompute();

  window.addEventListener("load", () => {
    triggerMathRender();
  });
});
