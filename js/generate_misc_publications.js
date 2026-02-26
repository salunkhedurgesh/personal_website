console.log("Loaded: generate_misc_publications.js");

function parseCSV(text) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;
    let i = 0;

    while (i < text.length) {
        const ch = text[i];
        if (inQuotes) {
            if (ch === '"' && text[i + 1] === '"') {
                field += '"';
                i += 2;
            } else if (ch === '"') {
                inQuotes = false;
                i++;
            } else {
                field += ch;
                i++;
            }
        } else {
            if (ch === '"') {
                inQuotes = true;
                i++;
            } else if (ch === ',') {
                row.push(field);
                field = '';
                i++;
            } else if (ch === '\r' && text[i + 1] === '\n') {
                row.push(field);
                field = '';
                rows.push(row);
                row = [];
                i += 2;
            } else if (ch === '\n') {
                row.push(field);
                field = '';
                rows.push(row);
                row = [];
                i++;
            } else {
                field += ch;
                i++;
            }
        }
    }

    if (field || row.length > 0) {
        row.push(field);
        rows.push(row);
    }

    if (rows.length < 2) return [];
    const headers = rows[0].map(h => h.trim());
    return rows
        .slice(1)
        .filter(r => r.length > 1 && r[0].trim())
        .map(r => {
            const obj = {};
            headers.forEach((h, idx) => {
                obj[h] = (r[idx] || '').trim();
            });
            return obj;
        });
}

function iconButton(href, imgSrc, altText) {
    if (!href) return '';
    return `<a href="${href}" target="_blank"><img src="${imgSrc}" alt="${altText}"></a>`;
}

function generateMiscPaperHTML({ id, title, authors, journal, short, year, doi, bibLink, pdfLink, webLink, abstract, note }) {
    const highlightedAuthors = (authors || '').replace(
        /Durgesh Haribhau Salunkhe/g,
        '<span style="color: var(--halycon)">Durgesh Haribhau Salunkhe</span>'
    );

    let placeStr = journal || '';
    if (short) placeStr += ` (<span style="color: var(--halycon)">${short}</span>)`;
    if (doi) placeStr += `, doi: ${doi}`;

    const noteHTML = note ? `<br><span style="color: var(--halycon)">Note: </span><span>${note}</span>` : '';
    const abstractAction = abstract
        ? `<a onclick="abstractClick('${id}_abstract')"><img src="/projects/main/webpage_resources/images/icon_abstract_dark.png" alt="abstract"></a>`
        : '';
    const webAction = webLink
        ? `<a href="${webLink}" target="_blank"><img src="/projects/main/webpage_resources/images/web_internet.png" alt="details"></a>`
        : '';

    const actionsHTML = `
        <div class="action_row" id="${id}_paper">
            ${iconButton(bibLink, '/projects/main/webpage_resources/images/icon_cite_dark.png', 'cite')}
            ${iconButton(pdfLink, '/projects/main/webpage_resources/images/icon_download_dark.png', 'download')}
            ${webAction}
            ${abstractAction}
        </div>`;

    const detailsLine = placeStr ? `In: ${placeStr}, ${year}${noteHTML}` : `${year}${noteHTML}`;

    return `
    <div class="paper">
        <div class="paper_description">
            <div>
                ${actionsHTML}
            </div>
            <div class="paper_title">
                <p class="paper_heading">${title || ''}</p>
                <p class="authors">
                    Authors: ${highlightedAuthors}<br>
                    ${detailsLine}
                </p>
            </div>
        </div>
        ${abstract ? `<div id="${id}_abstract" style="display: none;" class="abstract"><p>${abstract}</p></div>` : ''}
    </div>`;
}

function renderMiscFromCSV(csvPath, containerId) {
    fetch(csvPath)
        .then(r => {
            if (!r.ok) throw new Error(`Failed to fetch ${csvPath}`);
            return r.text();
        })
        .then(text => {
            const papers = parseCSV(text);
            const container = document.getElementById(containerId);
            if (!container) return;
            container.innerHTML = '';

            const groups = new Map();
            papers.forEach(p => {
                const key = p.yearGroup || p.year || 'Unknown';
                if (!groups.has(key)) {
                    groups.set(key, { label: key, papers: [], maxYear: 0 });
                }
                const g = groups.get(key);
                g.papers.push(p);
                const y = parseInt(p.year, 10);
                if (!Number.isNaN(y) && y > g.maxYear) g.maxYear = y;
            });

            const sorted = [...groups.entries()].sort((a, b) => b[1].maxYear - a[1].maxYear);

            sorted.forEach(([, group]) => {
                const yearBlock = document.createElement('div');
                yearBlock.className = 'year_block';

                const yearHeader = document.createElement('div');
                yearHeader.className = 'year';
                yearHeader.innerHTML = `<p>${group.label}</p>`;
                yearBlock.appendChild(yearHeader);

                group.papers.forEach(paper => {
                    yearBlock.innerHTML += generateMiscPaperHTML(paper);
                });

                container.appendChild(yearBlock);
            });

            if (containerId === 'book_chapters') {
                const spacer = document.createElement('div');
                spacer.className = 'desktop_spacer';
                container.appendChild(spacer);
            }
        })
        .catch(err => console.error('generate_misc_publications.js:', err));
}

function initMiscCSVSections() {
    renderMiscFromCSV('/projects/main/publications/theses.csv', 'thesis');
    renderMiscFromCSV('/projects/main/publications/talks.csv', 'talks');
    renderMiscFromCSV('/projects/main/publications/books.csv', 'book_chapters');
}

window.addEventListener('DOMContentLoaded', initMiscCSVSections);

