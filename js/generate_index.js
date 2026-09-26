// ============================================================
// EDIT THESE ARRAYS TO UPDATE THE INDEX PAGE SECTIONS
// ============================================================

const currentWork = [
    `<span style="color:var(--halycon)">How can robot behaviour be made safe and explainable?</span> Kinematic intelligence: augmenting robot learning with analytical properties, with <span style="color:var(--blueBC)">Stithpragya Gupta, EPFL, Lausanne</span>`,
    `<span style="color:var(--halycon)">How to have better geometric insights regarding kinematics of robots?</span> Conformal Geometric Algebra, in collaboration with <span style="color:var(--blueBC)">Abhilash Nayak, CSIC, Barcelona</span>`,
    `<span style="color:var(--halycon)">What will the future generation of robots look like?</span> Novel kinematic actuations and robots of future, in collaboration with <span style="color:var(--blueBC)">Vimalesh Muralidharan, IIT Bhubaneswar</span>`,
];

// ============================================================

function renderSection(containerId, listId, titleId, titleText, items, noListStyle) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const listStyle = noListStyle ? ' style="list-style: none"' : '';
    const listItems = items.map(item => `        <li>${item}</li>`).join('\n');
    container.innerHTML = `<div class="recent" onclick="click_recent(['${listId}'], ['${titleId}', '${titleText}'])">
    <p class="recent-title" id="${titleId}">- ${titleText} &#x2191</p>
    <div class="spacediv" id="${containerId}_spacediv"></div>
    <ol id="${listId}" class="dropdown"${listStyle}>
${listItems}
    </ol>
</div>`;
}

document.addEventListener('DOMContentLoaded', () => {
    renderSection('current', 'current_list', 'current_title', 'What I\'m thinking about', currentWork, false);
});