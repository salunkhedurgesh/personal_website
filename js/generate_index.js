// ============================================================
// EDIT THESE ARRAYS TO UPDATE THE INDEX PAGE SECTIONS
// ============================================================

const recentNews = [
    `19<sup>th</sup> February, 2026: Course proposed on Kinematics grounded robot motion planning at EPFL with Prof. Aude Billard.`,
    `21<sup>st</sup> November, 2025: Invited talk at IISc, Bangalore.`,
    `25<sup>th</sup> June, 2025 : Invited talk at LAAS, CNRS, Toulouse.`,
];

const currentWork = [
    `<span style="color:var(--halycon)">How can robot behaviour be made safe and explainable?</span> Kinematic intelligence: augmenting robot learning with analytical properties, with <span style="color:var(--blueBC)">Stithpragya Gupta, EPFL, Lausanne</span>`,
    `<span style="color:var(--halycon)">How to have better geometric insights regarding kinematics of robots?</span> Conformal Geometric Algebra, in collaboration with <span style="color:var(--blueBC)">Abhilash Nayak, CSIC, Barcelona</span>`,
    `<span style="color:var(--halycon)">Is robot design dead?</span> Novel kinematic actuations and robots of future, in collaboration with <span style="color:var(--blueBC)">Vimalesh Muralidharan, IIT Bhubaneswar</span>`,
    `<span style="color:var(--halycon)">How can a robot learn from simpler building blocks?</span> Transfer Learning with Sub-domain guarantees, in collaboration with <span style="color:var(--blueBC)">Bernardo Fichera, Max Planck, Tubingen</span>`,
];

// ============================================================

function renderSection(containerId, listId, titleId, titleText, items, noListStyle) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const listStyle = noListStyle ? ' style="list-style: none"' : '';
    const listItems = items.map(item => `        <li>${item}</li>`).join('\n');
    container.innerHTML = `<div class="recent" onclick="click_recent(['${listId}'], ['${titleId}', '${titleText}'])">
    <h3 id="${titleId}">- ${titleText} &#x2191</h3>
    <div class="spacediv" id="${containerId}_spacediv"></div>
    <ol id="${listId}" class="dropdown"${listStyle}>
${listItems}
    </ol>
</div>`;
}

document.addEventListener('DOMContentLoaded', () => {
    renderSection('recent_news', 'recent_list', 'recent_title', 'Recent news', recentNews, true);
    renderSection('current', 'current_list', 'current_title', 'What I\'m thinking about', currentWork, false);
});