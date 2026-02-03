console.log("Loaded presentation writer");

function generatePresentationHTML(title, link, location, date) {
    return `
<div class="paper">
    <div class="paper_description">
        <div style="width: 6rem">
            <div class="action_row">
                <img src="/projects/main/webpage_resources/images/blank.png" alt="details">
                <a href="${link}" target="_blank">
                    <img src="/projects/main/webpage_resources/images/web_internet.png" alt="web link">
                </a>
            </div>
        </div>

        <div class="paper_title">
            <p class="paper_heading">${title}</p>
            <p>&#64; ${location}</p>
            <p>Date: ${date}</p>
        </div>
    </div>
</div>
    `.trim();
}

// Example input data (replace with your own list)
const presentations = [
    {
        title: "Leveraging kinematic intelligence for safer learning and skill transfer in robots",
        link: "https://www.laas.fr/fr/equipes/gepetto/",
        location: "IISc, Bengaluru",
        date: "21<sup>st</sup> November, 2025"
    },
    {
        title: "Leveraging kinematic analysis in human-to-robot and robot-to-robot behavior transfer",
        link: "https://www.laas.fr/fr/equipes/gepetto/",
        location: "LAAS, CNRS, Toulouse",
        date: "25<sup>th</sup> June, 2025"
    },
    {
        title: "Leveraging kinematic analysis in transfer of robot behavior",
        link: "https://rdh.icube.unistra.fr/index.php?title=Main_Page",
        location: "ICube, CNRS, Strasbourg",
        date: "25<sup>th</sup> April, 2025"
    },
    {
        title: "Cuspidal robots: geometrical analysis and issues in path planning of 6R cobots",
        link: "https://www.ricam.oeaw.ac.at/specsem/specsem2024/workshop5/",
        location: "Workshop on Kinematic Aspects of Robotics.",
        date: "29<sup>th</sup> April to 03<sup>rd</sup> May, 2024"
    },
    {
        title: "Cuspidal robots: dangers in 6R cobots, and how to avoid them",
        link: "https://www.epfl.ch/labs/lasa/",
        location: "LASA lab, EPFL",
        date: "14<sup>th</sup> November, 2023"
    },
    {
        title: "Recent results on cuspidal robots",
        link: "https://simero.org/",
        location: "Summer school on Singularities of Mechanisms and Robotic Manipulators (SIMERO).",
        date: "18<sup>th</sup> to 23<sup>rd</sup> September, 2023"
    }
];


// Reverse chronological order
const container = document.getElementById("talksContainer");
presentations.reverse().forEach(entry => {
    container.innerHTML = generatePresentationHTML(entry.title, entry.link, entry.location, entry.date) + container.innerHTML;
});
