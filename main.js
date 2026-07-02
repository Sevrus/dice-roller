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
        ? '<span style="color: var(--muted); font-style: italic; font-size: 0.875rem;">Aucun dé sélectionné</span>'
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

    decreaseBtn.addEventListener('click', () => {
        if (diceSelection[type] > 0) {
            diceSelection[type]--;
            updateDiceSelectorUI(type);
            updateSelectionSummary();
        }
    });

    increaseBtn.addEventListener('click', () => {
        if (getTotalDice() < 30) {
            diceSelection[type]++;
            updateDiceSelectorUI(type);
            updateSelectionSummary();
        }
    });
});
