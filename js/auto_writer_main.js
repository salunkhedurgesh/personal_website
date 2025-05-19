console.log("Loaded function: generatePresentationHTML")

function generatePresentationHTML(title, link, location, date) {
    return `
<div class="paper">
    <div class="paper_description">
        <div style="width: 6rem">
            <div class="action_row">
                <img src="/projects/main/webpage_resources/images/blank.png" alt="details">
                <a href="${link}" target="_blank">
                    <img src="/projects/main/webpage_resources/images/web_internet.png" alt="details">
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


