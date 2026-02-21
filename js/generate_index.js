// ============================================================
// EDIT THESE ARRAYS TO UPDATE THE INDEX PAGE SECTIONS
// ============================================================

const recentNews = [
    `21<sup>st</sup> November, 2025: Invited talk at IISc, Bangalore.`,
    `25<sup>th</sup> June, 2025 : Invited talk at LAAS, CNRS, Toulouse.`,
];

const currentWork = [
    `Working on a Kinematic intelligence: augmenting robot learning with analytical properties',`,
    `Collaboration with <a href="https://scholar.google.com/citations?user=Ku2w7U0AAAAJ&hl=en" target="_blank">Keerthi Sagar</a> on cuspidal robots`,
    `Collaboration with Abhilash Nayak</a> on climbing robots`,
    `Working on deep learning methodologies for application in finance`,
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