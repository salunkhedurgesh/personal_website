async function fetchDOIMetadata(doi) {
    const url = `https://api.crossref.org/works/${encodeURIComponent(doi)}`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("DOI not found");

        const data = await response.json();
        const item = data.message;

        const title = item.title?.[0] || "N/A";
        const authors = item.author?.map(a => `${a.given} ${a.family}`).join(", ") || "N/A";
        const abstract = item.abstract || "No abstract found";
        const published = item["published-print"]?.["date-parts"]?.[0]?.join("-") || "N/A";
        const referenceLink = item.URL;

        console.log("Title:", title);
        console.log("Authors:", authors);
        console.log("Abstract:", abstract);
        console.log("Published:", published);
        console.log("Reference:", referenceLink);
    } catch (error) {
        console.error("Error fetching DOI metadata:", error);
    }
}

// Example usage:
fetchDOIMetadata("10.1109/5.771073");
