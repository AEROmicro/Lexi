const DICT_API = "https://api.dictionaryapi.dev/api/v2/entries/en/";
const SUGGEST_API = "https://api.datamuse.com/sug?s=";

const input = document.getElementById('word-input');
const autoBox = document.getElementById('autocomplete-list');
const resultContainer = document.getElementById('result-container');
const starsList = document.getElementById('stars-list');

let favorites = JSON.parse(localStorage.getItem('lexi_stars')) || [];
let showPhonetics = JSON.parse(localStorage.getItem('lexi_phonetics')) ?? true;

// --- AUTOCOMPLETE LOGIC ---
input.addEventListener('input', async () => {
    const query = input.value.trim();
    if (query.length < 2) { 
        autoBox.classList.remove('active');
        return; 
    }
    try {
        const res = await fetch(`${SUGGEST_API}${query}`);
        const data = await res.json();
        if (data.length > 0) {
            autoBox.innerHTML = data.slice(0, 5).map(item => `<div onclick="selectWord('${item.word}')">${item.word}</div>`).join('');
            autoBox.classList.add('active');
        } else {
            autoBox.classList.remove('active');
        }
    } catch (e) { console.error("Suggest error"); }
});

function selectWord(word) {
    input.value = word;
    autoBox.classList.remove('active');
    fetchWord(word);
}

// Close autocomplete when clicking outside
document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !autoBox.contains(e.target)) {
        autoBox.classList.remove('active');
    }
});

// --- CORE SEARCH LOGIC ---
async function fetchWord(word) {
    const target = (word || input.value).trim().toLowerCase();
    if (!target) return;

    input.value = target;
    autoBox.classList.remove('active');
    resultContainer.innerHTML = "<p style='text-align:center;'>Searching...</p>";
    
    try {
        const res = await fetch(`${DICT_API}${target}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        renderResult(data[0]);
    } catch (err) {
        resultContainer.innerHTML = `<div class="result-card"><h3>Word not found.</h3><p>Could not find "${target}". Please check spelling.</p></div>`;
    }
}

function renderResult(data) {
    const isStarred = favorites.includes(data.word.toLowerCase());
    const phoneticStr = (showPhonetics && data.phonetic) ? data.phonetic : "";

    let html = `
        <div class="result-card">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h1 style="margin:0; text-transform:capitalize;">${data.word} <span class="phonetic-text">${phoneticStr}</span></h1>
                <button class="nav-link ${isStarred ? 'danger-btn' : ''}" style="width:auto; margin:0; ${isStarred ? 'background:#fee2e2;' : ''}" onclick="toggleStar('${data.word}')">
                    ${isStarred ? 'Unstar' : 'Star Word'}
                </button>
            </div>
    `;

    data.meanings.forEach(m => {
        html += `
            <div class="meaning-section">
                <span class="pos-label">${m.partOfSpeech}</span>
                <ol class="definition-list">
                    ${m.definitions.map(def => `<li>${def.definition}</li>`).join('')}
                </ol>
                ${m.synonyms && m.synonyms.length ? `
                    <div class="synonyms">
                        <p style="margin:10px 0 5px; font-size:12px; font-weight:700; color:var(--text-muted);">SYNONYMS</p>
                        ${m.synonyms.slice(0, 5).map(s => `<span class="synonym-tag" onclick="fetchWord('${s}')">${s}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    });
    resultContainer.innerHTML = html + `</div>`;
}

// --- APP HELPERS ---
function toggleStar(word) {
    const w = word.toLowerCase();
    favorites = favorites.includes(w) ? favorites.filter(item => item !== w) : [...favorites, w];
    localStorage.setItem('lexi_stars', JSON.stringify(favorites));
    fetchWord(w);
    updateStarsUI();
}

function updateStarsUI() {
    starsList.innerHTML = favorites.map(w => `
        <li onclick="fetchWord('${w}'); closePanels();">
            <span style="text-transform: capitalize; font-weight:600;">${w}</span>
            <button class="remove-btn" onclick="event.stopPropagation(); removeStar('${w}')">Remove</button>
        </li>
    `).join('');
}

function removeStar(word) {
    favorites = favorites.filter(w => w !== word.toLowerCase());
    localStorage.setItem('lexi_stars', JSON.stringify(favorites));
    updateStarsUI();
    if (input.value.toLowerCase() === word.toLowerCase()) fetchWord(word);
}

function closePanels() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('settings-panel').classList.remove('open');
}

// --- HANDLERS ---
document.getElementById('theme-toggle').addEventListener('change', (e) => {
    document.body.classList.toggle('dark-mode', e.target.checked);
    localStorage.setItem('lexi_dark', e.target.checked);
});

document.getElementById('phonetic-toggle').addEventListener('change', (e) => {
    showPhonetics = e.target.checked;
    localStorage.setItem('lexi_phonetics', showPhonetics);
    if(input.value) fetchWord(input.value);
});

document.getElementById('reset-all').onclick = () => {
    if(confirm("Erase all data?")) { localStorage.clear(); location.reload(); }
};

document.getElementById('search-btn').onclick = () => fetchWord();
document.getElementById('open-sidebar').onclick = () => document.getElementById('sidebar').classList.add('open');
document.getElementById('open-settings').onclick = () => document.getElementById('settings-panel').classList.add('open');
document.getElementById('close-sidebar').onclick = closePanels;
document.getElementById('close-settings').onclick = closePanels;
input.onkeypress = (e) => { if(e.key === 'Enter') fetchWord(); };

// Init
if(localStorage.getItem('lexi_dark') === 'true') {
    document.body.classList.add('dark-mode');
    document.getElementById('theme-toggle').checked = true;
}
updateStarsUI();
