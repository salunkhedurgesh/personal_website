// ============================================================
// EDIT THESE ARRAYS TO UPDATE THE INDEX PAGE SECTIONS
// ============================================================

const recentNews = [
    `19<sup>th</sup> February, 2026: Course proposed on Kinematics grounded robot motion planning at EPFL with Prof. Aude Billard.`,
    `21<sup>st</sup> November, 2025: Invited talk at IISc, Bangalore.`,
    `25<sup>th</sup> June, 2025 : Invited talk at LAAS, CNRS, Toulouse.`,
];

const currentWork = [
    `Working on a Kinematic intelligence: augmenting robot learning with analytical properties, with Stithpragya Gupta, EPFL, Lausanne`,
    `Collaboration with Abhilash Nayak, CSIC, Barcelona,  on Conformal Geometric Algebra`,
    `Collaboration with Vimalesh Muralidharan, IIT Bhubaneswar, on novel kinematic actuations and robots of future`,
    `Collaboration with Bernardo Fichera, Max Planck, Tubingen, on Transfer Learning with Sub-domain guarantees`,
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
    renderSection('current', 'current_list', 'current_title', 'Currently working on...', currentWork, false);
});