let i18n = {};
let currentLang = 'fr';

// initialize translations on load
async function loadTranslations() {
    try {
        const response = await fetch('i18n.json');
        if (!response.ok) throw new Error("Erreur réseau");

        i18n = await response.json();

        const browserLang = navigator.language.substring(0, 2);
        if (i18n[browserLang]) {
            currentLang = browserLang;
            document.getElementById('langSelector').value = currentLang;
        }

        setLanguage(currentLang);
    } catch (error) {
        console.error("Impossible de charger les traductions :", error);
    }
}

function setLanguage(lang) {
    if (!i18n[lang]) return;
    currentLang = lang;

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (i18n[lang][key]) {
            el.textContent = i18n[lang][key];
        }
    });

    if (selectionSummary.innerHTML.includes('italic')) {
        selectionSummary.innerHTML = `<span style="color: var(--muted); font-style: italic; font-size: 0.875rem;">${i18n[lang]["emptySelection"]}</span>`;
    }

    if (getTotalDice() === 0) {
        diceArena.innerHTML = `<p style="color: var(--muted);">${i18n[lang]["arenaEmpty"]}</p>`;
    }

    renderHistory();
}

loadTranslations();

document.getElementById('langSelector').addEventListener('change', (e) => {
    setLanguage(e.target.value);
});

// State initialization
const diceSelection = { 3: 0, 4: 0, 6: 0, 8: 0, 10: 0, 12: 0, 20: 0, 100: 0 };
let isRolling = false;
const history = [];
const MAX_HISTORY = 12;

// DOM elements
const diceSelectors = document.querySelectorAll(".dice-selector");
const clearSelectionBtn = document.getElementById("clearSelection");
const rollBtn = document.getElementById("rollBtn");
const diceArena = document.getElementById("diceArena");
const resultArea = document.getElementById("resultArea");
const historyContainer = document.getElementById("history");
const selectionSummary = document.getElementById("selectionSummary");
const clearHistoryBtn = document.getElementById("clearHistory");

function updateSelectionSummary() {
    const selected = [];
    Object.entries(diceSelection).forEach(([type, count]) => {
        if (count > 0) selected.push(`${count}D${type}`);
    });

    selectionSummary.innerHTML = selected.length === 0
        ? `<span style="color: var(--muted); font-style: italic; font-size: 0.875rem;">${i18n[currentLang]["emptySelection"]}</span>`
        : selected.map(s => `<span class="selection-tag">${s}</span>`).join('');

    rollBtn.disabled = selected.length === 0;
}

function updateDiceSelectorUI(type) {
    const selector = document.querySelector(`.dice-selector[data-dice="${type}"]`);
    const countSpan = selector.querySelector('.dice-counter span');
    countSpan.textContent = diceSelection[type];
    selector.classList.toggle("has-dice", diceSelection[type] > 0);
}

function getTotalDice() {
    return Object.values(diceSelection).reduce((sum, count) => sum + count, 0);
}

diceSelectors.forEach(selector => {
    const type = parseInt(selector.dataset.dice);
    const [decreaseBtn, increaseBtn] = selector.querySelectorAll('.dice-counter button');

    decreaseBtn.addEventListener("click", () => {
        if (diceSelection[type] > 0) {
            diceSelection[type]--;
            updateDiceSelectorUI(type);
            updateSelectionSummary();
        }
    });

    increaseBtn.addEventListener("click", () => {
        if (getTotalDice() < 30) {
            diceSelection[type]++;
            updateDiceSelectorUI(type);
            updateSelectionSummary();
        }
    });
});

clearSelectionBtn.addEventListener("click", () => {
    Object.keys(diceSelection).forEach(type => {
        diceSelection[type] = 0;
        updateDiceSelectorUI(type);
    });
    updateSelectionSummary();

    diceArena.innerHTML = `<p style="color: var(--muted);">${i18n[currentLang]["arenaEmpty"]}</p>`;
    resultArea.innerHTML = "";
});

function rollDice(max) {
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    return (array[0] % max) + 1;
}

function createDiceElement(value, type, index) {
    const dice = document.createElement("div");
    dice.className = "dice";
    dice.innerHTML = `
        <div class="dice-inner">
          <div class="dice-face">
            ${value}<span class="dice-type-badge">D${type}</span>
          </div>
        </div>`;
    dice.style.animationDelay = `${index * 0.07}s`;
    return dice;
}

async function performRoll() {
    if (isRolling) return;
    isRolling = true;
    rollBtn.disabled = true;

    diceArena.innerHTML = "";
    resultArea.innerHTML = "";

    const rollConfig = [];
    Object.entries(diceSelection).forEach(([type, count]) => {
        for (let i = 0; i < count; i++) rollConfig.push(parseInt(type));
    });

    const diceElements = [];
    const results = [];

    rollConfig.forEach((type, index) => {
        const dice = createDiceElement(rollDice(type), type, index);
        diceArena.appendChild(dice);
        diceElements.push({ element: dice, type });
        results.push({ value: rollDice(type), type });
    });

    diceElements.forEach(item => item.element.classList.add("rolling"));
    await new Promise(r => setTimeout(r, 600));

    diceElements.forEach((item, i) => {
        item.element.classList.remove("rolling");
        item.element.querySelector(".dice-face").firstChild.textContent = results[i].value;
        item.element.classList.add("arrived");
    });

    const total = results.reduce((sum, r) => sum + r.value, 0);
    const breakdown = buildBreakdown(results);

    resultArea.innerHTML = `
        <div class="result-total">${total}</div>
        <div class="result-breakdown">${breakdown}</div>`;

    addToHistory(results, total);
    isRolling = false;
    rollBtn.disabled = false;
}

function buildBreakdown(results) {
    const grouped = {};
    results.forEach(r => {
        if (!grouped[r.type]) grouped[r.type] = [];
        grouped[r.type].push(r.value);
    });
    return Object.entries(grouped)
        .map(([type, values]) => `${values.length}D${type}: [${values.join(" + ")}]`)
        .join(" | ");
}

function addToHistory(results, total) {
    const grouped = {};
    results.forEach(r => { grouped[r.type] = (grouped[r.type] || 0) + 1; });
    const rollStr = Object.entries(grouped).map(([t, c]) => `${c}D${t}`).join(" + ");
    const valuesStr = results.map(r => r.value).join(" + ");

    history.unshift({ rollStr, valuesStr, total });
    if (history.length > MAX_HISTORY) history.pop();
    renderHistory();
}

function renderHistory() {
    historyContainer.innerHTML = history.length === 0
        ? `<p style="color: var(--muted); font-style: italic; font-size: 0.875rem;">${i18n[currentLang]["emptyHistory"]}</p>`
        : history.map(item => `
            <div class="history-item">
              <div>
                <span class="history-roll">${item.rollStr}</span>
                <span style="color: var(--border); margin: 0 0.5rem;">|</span>
                <span style="color: var(--muted); font-size: 0.6875rem;">${item.valuesStr}</span>
              </div>
              <span class="history-result">${item.total}</span>
            </div>`).join("");
}

clearHistoryBtn.addEventListener("click", () => {
    history.length = 0;
    renderHistory();
});

rollBtn.addEventListener("click", performRoll);

document.addEventListener("keydown", (e) => {
    if (e.code === "Space" && !isRolling &&
        !["INPUT", "BUTTON"].includes(document.activeElement.tagName) &&
        !rollBtn.disabled) {
        e.preventDefault();
        performRoll();
    }
});
