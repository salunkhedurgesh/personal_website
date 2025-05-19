console.log("Loaded: generate_papers.js");

function generatePaperHTML({ id, title, authors, place, year, pdfLink = "#", bibLink = "#", ytLink = "", abstract }) {
    const highlightedAuthors = authors.replace(
        /Durgesh Haribhau Salunkhe/g,
        '<span style="color: var(--halycon)">Durgesh Haribhau Salunkhe</span>'
    );

    const highlightedPlace = place.replace(/\(([^)]+)\)/, (_, p1) =>
        `(<span style="color: var(--halycon)">${p1}</span>)`
    );

    const ytHTML = ytLink
        ? `<a href="${ytLink}" target="_blank"><img src="/projects/main/webpage_resources/images/web_internet.png" alt="details"></a>`
        : "";

    return `
    <div class="paper">
        <div class="paper_description">
            <div>
                <div class="action_row" id="${id}_paper">
                    <a href="${bibLink}" target="_blank"><img src="/projects/main/webpage_resources/images/icon_cite_dark.png" alt="cite"></a>
                    <a href="${pdfLink}" target="_blank"><img src="/projects/main/webpage_resources/images/icon_download_dark.png" alt="download"></a>
                    <a onclick="abstractClick('${id}_abstract')"><img src="/projects/main/webpage_resources/images/icon_abstract_dark.png" alt="abstract"></a>
                </div>
                <div class="action_row" style="text-align: center">
                    <a href="#${id}_abstract"><img src="/projects/main/webpage_resources/images/blank.png" alt="blank"></a>
                    ${ytHTML}
                </div>
            </div>
            <div class="paper_title">
                <p class="paper_heading">${title}</p>
                <p class="authors">
                    Authors: ${highlightedAuthors}<br>
                    In: ${highlightedPlace}, ${year}
                </p>
            </div>
        </div>
        <div id="${id}_abstract" style="display: none;" class="abstract">
            <p>${abstract}</p>
        </div>
    </div>`;
}

// Example array
const papers = [
    {
        id: "cga25_nayak",
        title: "Inverse kinematic model of 3R robots using Conformal Geometric Algebra",
        authors: "Abhilash Nayak and Durgesh Haribhau Salunkhe",
        place: "3rd IMA Conference on Mathematics of Robotics (IMA)",
        year: 2025,
        pdfLink: "resources/papers/ijrr24_salunkhe.pdf",
        bibLink: "resources/citations/ijrr24_salunkhe.bib",
        ytLink: "https://www.youtube.com/watch?v=NAWq6LBL2Dc",
        abstract: "Cuspidal serial robots can change inverse kinematic solutions (IKS) without crossing singularities..."
    },
    {
        id: "redundant25_mueller_2024",
        title: "Path planning in redundant cuspidal robots",
        authors: "Tobias Marauli, Durgesh Haribhau Salunkhe, Andreas Mueller",
        place: "Workshop on Advances in Robot Kinematics (ARK)",
        year: 2024,
        abstract: "We explore feasibility issues in path planning arising from nonsingular transitions in redundant setups."
    },
    {
        id: "redundant25_mueller_2023",
        title: "Path planning in redundant cuspidal robots",
        authors: "Tobias Marauli, Durgesh Haribhau Salunkhe, Andreas Mueller",
        place: "Workshop on Advances in Robot Kinematics (ARK)",
        year: 2023,
        abstract: "We explore feasibility issues in path planning arising from nonsingular transitions in redundant setups."
    },
    {
        id: "redundant25_mueller_2022",
        title: "Path planning in redundant cuspidal robots",
        authors: "Tobias Marauli, Durgesh Haribhau Salunkhe, Andreas Mueller",
        place: "Workshop on Advances in Robot Kinematics (ARK)",
        year: 2022,
        abstract: "We explore feasibility issues in path planning arising from nonsingular transitions in redundant setups."
    },
    {
        id: "redundant25_mueller_2020",
        title: "Path planning in redundant cuspidal robots",
        authors: "Tobias Marauli, Durgesh Haribhau Salunkhe, Andreas Mueller",
        place: "Workshop on Advances in Robot Kinematics (ARK)",
        year: 2020,
        abstract: "We explore feasibility issues in path planning arising from nonsingular transitions in redundant setups."
    },
    {
        id: "redundant25_mueller_2017",
        title: "Path planning in redundant cuspidal robots",
        authors: "Tobias Marauli, Durgesh Haribhau Salunkhe, Andreas Mueller",
        place: "Workshop on Advances in Robot Kinematics (ARK)",
        year: 2017,
        abstract: "We explore feasibility issues in path planning arising from nonsingular transitions in redundant setups."
    },
    {
        id: "redundant25_mueller_2016",
        title: "Path planning in redundant cuspidal robots",
        authors: "Tobias Marauli, Durgesh Haribhau Salunkhe, Andreas Mueller",
        place: "Workshop on Advances in Robot Kinematics (ARK)",
        year: 2016,
        abstract: "We explore feasibility issues in path planning arising from nonsingular transitions in redundant setups."
    }
];

// Group by year
const papersByYear = {};
papers.forEach(paper => {
    if (!papersByYear[paper.year]) papersByYear[paper.year] = [];
    papersByYear[paper.year].push(paper);
});

// Sort years descending and inject
Object.keys(papersByYear).sort((a, b) => b - a).forEach(year => {
    const yearBlock = document.createElement("div");
    yearBlock.className = "year_block";

    const yearHeader = document.createElement("div");
    yearHeader.className = "year";
    yearHeader.innerHTML = `<p onclick="click_experience('year_papers_${year}')">${year}</p>`;
    yearBlock.appendChild(yearHeader);

    const papersWrapper = document.createElement("div");
    papersWrapper.id = `year_papers_${year}`;
    papersWrapper.className = "year_papers";

    papersByYear[year].sort((a, b) => a.title.localeCompare(b.title));
    papersByYear[year].forEach(paper => {
        papersWrapper.innerHTML += generatePaperHTML(paper);
    });

    yearBlock.appendChild(papersWrapper);

    const container = document.getElementById(`publications_${year}`);
    if (container) {
        container.appendChild(yearBlock);
    } else {
        console.warn("Missing container for year:", year);
    }
});
