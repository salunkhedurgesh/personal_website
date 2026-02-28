console.log("Loaded: generate_papers.js");

function generatePaperHTML({ id, title, authors, journal, short, year, doi, bibLink, pdfLink, webLink, abstract, note }) {
    const highlightedAuthors = authors.replace(
        /Durgesh Haribhau Salunkhe/g,
        '<span style="color: var(--halycon)">Durgesh Haribhau Salunkhe</span>'
    );

    let placeStr = journal;
    if (short) placeStr += ` (<span style="color: var(--halycon)">${short}</span>)`;
    if (doi) placeStr += `, doi: ${doi}`;

    const webHTML = webLink
        ? `<div class="action_row" style="text-align: center">
                    <a href="#${id}_abstract"><img src="/projects/main/webpage_resources/images/blank.png" alt="blank"></a>
                    <a href="${webLink}" target="_blank"><img src="/projects/main/webpage_resources/images/web_internet.png" alt="details"></a>
                </div>`
        : '';

    const noteHTML = note
        ? `<br><span style="color: var(--halycon)">Note: </span><span>${note}</span>`
        : '';

    const bibHref = bibLink || '#';
    const pdfHref = pdfLink || '#';

    return `
    <div class="paper">
        <div class="paper_description">
            <div>
                <div class="action_row" id="${id}_paper">
                    <a href="${bibHref}" target="_blank"><img src="/projects/main/webpage_resources/images/icon_cite_dark.png" alt="cite"></a>
                    <a href="${pdfHref}" target="_blank"><img src="/projects/main/webpage_resources/images/icon_download_dark.png" alt="download"></a>
                    <a onclick="abstractClick('${id}_abstract')"><img src="/projects/main/webpage_resources/images/icon_abstract_dark.png" alt="abstract"></a>
                </div>
                ${webHTML}
            </div>
            <div class="paper_title">
                <p class="paper_heading">${title}</p>
                <p class="authors">
                    Authors: ${highlightedAuthors}<br>
                    In: ${placeStr}, ${year}${noteHTML}
                </p>
            </div>
        </div>
        <div id="${id}_abstract" style="display: none;" class="abstract">
            <p>${abstract}</p>
        </div>
    </div>`;
}

// Robust RFC 4180 CSV parser
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
    return rows.slice(1)
        .filter(r => r.length > 1 && r[0].trim())
        .map(r => {
            const obj = {};
            headers.forEach((h, idx) => { obj[h] = (r[idx] || '').trim(); });
            return obj;
        });
}

// Fetch papers.csv, group by year, and render into #publication
fetch('/projects/main/publications/papers.csv')
    .then(r => {
        if (!r.ok) throw new Error('Failed to fetch papers.csv');
        return r.text();
    })
    .then(text => {
        const papers = parseCSV(text);
        const container = document.getElementById('publication');
        if (!container) return;

        // Group papers: yearGroup takes priority over year for the section label
        const groups = new Map();
        papers.forEach(p => {
            const key = p.yearGroup || p.year;
            if (!groups.has(key)) {
                groups.set(key, { label: key, papers: [], maxYear: 0 });
            }
            const g = groups.get(key);
            g.papers.push(p);
            const y = parseInt(p.year, 10);
            if (y > g.maxYear) g.maxYear = y;
        });

        // Sort groups descending by the highest year within each group
        const sorted = [...groups.entries()].sort((a, b) => b[1].maxYear - a[1].maxYear);

        sorted.forEach(([key, group]) => {
            const yearBlock = document.createElement('div');
            yearBlock.className = 'year_block';

            const yearHeader = document.createElement('div');
            yearHeader.className = 'year';
            yearHeader.innerHTML = `<p>${group.label}</p>`;
            yearBlock.appendChild(yearHeader);

            group.papers.forEach(paper => {
                yearBlock.innerHTML += generatePaperHTML(paper);
            });

            container.appendChild(yearBlock);
        });
    })
    .catch(err => console.error('generate_papers.js:', err));
