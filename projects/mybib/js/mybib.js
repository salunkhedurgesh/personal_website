(function () {
  const state = {
    rawPapers: [],
    papers: [],
    categories: { categories: [], projects: [] },
    notes: {},
    metadataOverrides: {},
    activeNoteId: null,
    activeMetadataId: null
  };

  const els = {};
  const noteKey = "mybib.notes.v1";
  const metadataKey = "mybib.metadata.v1";

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    [
      "searchInput", "categoryFilter", "projectFilter", "yearFilter", "authorFilter",
      "sortSelect", "paperList", "emptyState", "resultCount", "dataWarning",
      "downloadFiltered", "downloadCategory", "downloadProject", "exportNotes",
      "importNotes", "exportMetadata", "exportMetadataYaml", "importMetadata", "notesDialog", "notesTitle",
      "notesText", "saveNotes", "metadataDialog", "metadataTitle", "metadataPaperTitle",
      "metadataAuthors", "metadataYear", "metadataVenue", "metadataDoi",
      "metadataBibtexKey", "metadataProjects", "metadataCategories", "metadataTags",
      "metadataNotes", "saveMetadata", "resetMetadata"
    ].forEach((id) => { els[id] = document.getElementById(id); });

    wireEvents();
    await loadData();
    populateFilters();
    render();
  }

  function wireEvents() {
    ["searchInput", "categoryFilter", "projectFilter", "yearFilter", "authorFilter", "sortSelect"].forEach((id) => {
      els[id].addEventListener("input", render);
    });
    els.downloadFiltered.addEventListener("click", () => downloadBib("mybib-filtered.bib", filteredPapers()));
    els.downloadCategory.addEventListener("click", () => {
      const value = els.categoryFilter.value;
      downloadBib(value ? `mybib-category-${value}.bib` : "mybib-all-categories.bib", filteredPapers());
    });
    els.downloadProject.addEventListener("click", () => {
      const value = els.projectFilter.value;
      downloadBib(value ? `mybib-project-${value}.bib` : "mybib-all-projects.bib", filteredPapers());
    });
    els.exportNotes.addEventListener("click", exportNotes);
    els.importNotes.addEventListener("change", importNotes);
    els.exportMetadata.addEventListener("click", exportMetadataJson);
    els.exportMetadataYaml.addEventListener("click", exportMetadataYamlFile);
    els.importMetadata.addEventListener("change", importMetadata);
    els.saveNotes.addEventListener("click", saveActiveNote);
    els.saveMetadata.addEventListener("click", saveActiveMetadata);
    els.resetMetadata.addEventListener("click", resetActiveMetadata);
  }

  async function loadData() {
    const warnings = [];
    state.rawPapers = await fetchJson("data/papers.json", [], warnings);
    state.categories = await fetchJson("data/categories.json", { categories: [], projects: [] }, warnings);
    state.notes = Object.assign({}, await fetchJson("data/notes.json", {}, warnings), readLocalJson(noteKey));
    state.metadataOverrides = readLocalJson(metadataKey);

    const clean = [];
    state.rawPapers.forEach((paper, index) => {
      if (!paper || typeof paper !== "object") {
        warnings.push(`Paper entry ${index + 1} is malformed`);
        return;
      }
      clean.push(applyLocalMetadata(normalizePaper(paper, index)));
    });
    state.papers = clean;

    if (warnings.length) {
      els.dataWarning.hidden = false;
      els.dataWarning.textContent = warnings.join("; ");
    }
  }

  async function fetchJson(path, fallback, warnings) {
    try {
      const response = await fetch(path, { cache: "no-cache" });
      if (!response.ok) {
        warnings.push(`${path} is missing or unavailable`);
        return fallback;
      }
      return await response.json();
    } catch (error) {
      warnings.push(`${path} could not be parsed`);
      return fallback;
    }
  }

  function normalizePaper(paper, index) {
    return {
      id: paper.id || `paper-${index}`,
      title: paper.title || "Untitled paper",
      authors: Array.isArray(paper.authors) ? paper.authors : [],
      year: paper.year || "",
      venue: paper.venue || "",
      doi: paper.doi || "",
      url: paper.url || (paper.doi ? `https://doi.org/${paper.doi}` : ""),
      pdf: paper.pdf || "",
      bibtex_key: paper.bibtex_key || "",
      bibtex: paper.bibtex || "",
      abstract: paper.abstract || "",
      categories: Array.isArray(paper.categories) ? paper.categories : [],
      projects: Array.isArray(paper.projects) ? paper.projects : [],
      tags: Array.isArray(paper.tags) ? paper.tags : [],
      notes: paper.notes || "",
      needs_review: Boolean(paper.needs_review),
      review_reasons: Array.isArray(paper.review_reasons) ? paper.review_reasons : []
    };
  }

  function applyLocalMetadata(paper) {
    const override = state.metadataOverrides[paper.id] || state.metadataOverrides[paper.doi] || {};
    const merged = Object.assign({}, paper, override);
    merged.authors = Array.isArray(merged.authors) ? merged.authors : splitLines(merged.authors);
    merged.categories = Array.isArray(merged.categories) ? merged.categories : splitComma(merged.categories);
    merged.projects = Array.isArray(merged.projects) ? merged.projects : splitComma(merged.projects);
    merged.tags = Array.isArray(merged.tags) ? merged.tags : splitComma(merged.tags);
    merged.notes = state.notes[paper.id] || state.notes[paper.doi] || merged.notes || "";
    if (merged.doi) merged.url = `https://doi.org/${merged.doi}`;
    if ((state.metadataOverrides[paper.id] || state.metadataOverrides[paper.doi]) && merged.title && (merged.authors.length || merged.doi || merged.year)) {
      merged.review_reasons = merged.review_reasons.filter((reason) => reason !== "metadata_not_extracted");
      merged.needs_review = merged.review_reasons.length > 0;
    }
    merged.bibtex = makeBibtex(merged);
    return merged;
  }

  function populateFilters() {
    fillSelect(els.categoryFilter, state.categories.categories || []);
    fillSelect(els.projectFilter, state.categories.projects || []);
    fillMultiSelect(els.metadataCategories, state.categories.categories || []);
    fillMultiSelect(els.metadataProjects, state.categories.projects || []);
    refreshYearFilter();
  }

  function refreshYearFilter() {
    const selected = els.yearFilter.value;
    els.yearFilter.innerHTML = "";
    els.yearFilter.append(new Option("All years", ""));
    const years = [...new Set(state.papers.map((paper) => paper.year).filter(Boolean))].sort((a, b) => b - a);
    years.forEach((year) => els.yearFilter.append(new Option(year, year)));
    els.yearFilter.value = years.map(String).includes(selected) ? selected : "";
  }

  function fillSelect(select, items) {
    items.forEach((item) => select.append(new Option(item.label || item.id, item.id)));
  }

  function fillMultiSelect(select, items) {
    select.innerHTML = "";
    items.forEach((item) => select.append(new Option(item.label || item.id, item.id)));
  }

  function filteredPapers() {
    const query = els.searchInput.value.trim().toLowerCase();
    const category = els.categoryFilter.value;
    const project = els.projectFilter.value;
    const year = els.yearFilter.value;
    const author = els.authorFilter.value.trim().toLowerCase();

    return state.papers.filter((paper) => {
      const haystack = [
        paper.title, paper.authors.join(" "), paper.year, paper.venue, paper.doi,
        paper.tags.join(" "), paper.categories.join(" "), paper.projects.join(" "), paper.notes
      ].join(" ").toLowerCase();
      if (query && !haystack.includes(query)) return false;
      if (category && !paper.categories.includes(category)) return false;
      if (project && !paper.projects.includes(project)) return false;
      if (year && String(paper.year) !== year) return false;
      if (author && !paper.authors.join(" ").toLowerCase().includes(author)) return false;
      return true;
    }).sort(comparePapers);
  }

  function comparePapers(a, b) {
    const sort = els.sortSelect.value;
    if (sort === "oldest") return Number(a.year || 0) - Number(b.year || 0);
    if (sort === "title") return a.title.localeCompare(b.title);
    if (sort === "author") return firstSurname(a).localeCompare(firstSurname(b));
    if (sort === "venue") return a.venue.localeCompare(b.venue);
    return Number(b.year || 0) - Number(a.year || 0);
  }

  function firstSurname(paper) {
    const author = paper.authors[0] || "";
    return author.includes(",") ? author.split(",")[0] : author.split(/\s+/).pop() || "";
  }

  function render() {
    const papers = filteredPapers();
    els.resultCount.textContent = `${papers.length} paper${papers.length === 1 ? "" : "s"}`;
    els.paperList.innerHTML = "";
    els.emptyState.hidden = papers.length !== 0;
    papers.forEach((paper) => els.paperList.append(renderPaper(paper)));
  }

  function renderPaper(paper) {
    const row = document.createElement("article");
    row.className = `paper-row${paper.needs_review ? " needs-review" : ""}`;
    row.innerHTML = `
      <div class="paper-main">
        <h2 class="paper-title"></h2>
        <div class="paper-subline"></div>
        <div class="badge-row categories"></div>
        <div class="badge-row tags"></div>
        <p class="notes-preview"></p>
      </div>
      <div class="paper-authors"></div>
      <div class="paper-date"></div>
      <div class="paper-projects badge-row"></div>
      <div class="paper-actions"></div>
    `;
    row.querySelector(".paper-title").textContent = paper.title;
    row.querySelector(".paper-authors").textContent = paper.authors.length ? paper.authors.join(", ") : "Unknown authors";
    row.querySelector(".paper-date").textContent = paper.year || "No year";
    row.querySelector(".paper-subline").append(...metadataNodes(paper));
    fillBadges(row.querySelector(".categories"), paper.categories, "badge");
    fillBadges(row.querySelector(".paper-projects"), paper.projects, "badge project");
    fillBadges(row.querySelector(".tags"), paper.tags, "badge tag");
    row.querySelector(".notes-preview").textContent = paper.notes ? paper.notes.slice(0, 220) : "";
    renderActions(row.querySelector(".paper-actions"), paper);
    return row;
  }

  function metadataNodes(paper) {
    const nodes = [];
    if (paper.venue) nodes.push(textNode("span", paper.venue));
    if (paper.doi) {
      const link = document.createElement("a");
      link.href = paper.url || `https://doi.org/${paper.doi}`;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = paper.doi;
      nodes.push(link);
    }
    if (paper.needs_review) {
      const span = textNode("span", `Needs review${paper.review_reasons.length ? ": " + paper.review_reasons.join(", ") : ""}`);
      span.className = "warning";
      nodes.push(span);
    }
    return nodes;
  }

  function textNode(tag, text) {
    const node = document.createElement(tag);
    node.textContent = text;
    return node;
  }

  function fillBadges(container, values, className) {
    container.hidden = !values.length;
    values.forEach((value) => {
      const span = document.createElement("span");
      span.className = className;
      span.textContent = value;
      container.append(span);
    });
  }

  function renderActions(container, paper) {
    if (paper.pdf) {
      container.append(linkButton("Open PDF", paper.pdf, false));
      container.append(linkButton("Download PDF", paper.pdf, true));
    }
    container.append(actionButton("Copy BibTeX", () => copyText(paper.bibtex || "")));
    container.append(actionButton("Download BibTeX", () => downloadText(`${paper.bibtex_key || paper.id}.bib`, paper.bibtex || "")));
    container.append(actionButton("Edit notes", () => editNotes(paper)));
    container.append(actionButton("Edit metadata", () => editMetadata(paper)));
  }

  function linkButton(text, href, download) {
    const link = document.createElement("a");
    link.className = "button";
    link.href = href;
    link.textContent = text;
    if (download) link.download = "";
    else link.target = "_blank";
    return link;
  }

  function actionButton(text, handler) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = text;
    button.addEventListener("click", handler);
    return button;
  }

  async function copyText(text) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      downloadText("citation.bib", text);
    }
  }

  function downloadBib(filename, papers) {
    const body = papers.map((paper) => paper.bibtex).filter(Boolean).join("\n\n");
    downloadText(filename, body);
  }

  function downloadText(filename, text) {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function readLocalJson(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || "{}");
    } catch (error) {
      return {};
    }
  }

  function writeLocalNotes() {
    localStorage.setItem(noteKey, JSON.stringify(state.notes, null, 2));
  }

  function writeLocalMetadata() {
    localStorage.setItem(metadataKey, JSON.stringify(state.metadataOverrides, null, 2));
  }

  function editNotes(paper) {
    state.activeNoteId = paper.id;
    els.notesTitle.textContent = paper.title;
    els.notesText.value = paper.notes || "";
    els.notesDialog.showModal();
  }

  function saveActiveNote() {
    if (!state.activeNoteId) return;
    state.notes[state.activeNoteId] = els.notesText.value;
    writeLocalNotes();
    rebuildPapers();
    els.notesDialog.close();
    render();
  }

  function editMetadata(paper) {
    state.activeMetadataId = paper.id;
    els.metadataTitle.textContent = paper.title;
    els.metadataPaperTitle.value = paper.title || "";
    els.metadataAuthors.value = paper.authors.join("\n");
    els.metadataYear.value = paper.year || "";
    els.metadataVenue.value = paper.venue || "";
    els.metadataDoi.value = paper.doi || "";
    els.metadataBibtexKey.value = paper.bibtex_key || "";
    setSelected(els.metadataProjects, paper.projects);
    setSelected(els.metadataCategories, paper.categories);
    els.metadataTags.value = paper.tags.join(", ");
    els.metadataNotes.value = paper.notes || "";
    els.metadataDialog.showModal();
  }

  function saveActiveMetadata() {
    if (!state.activeMetadataId) return;
    const override = {
      title: els.metadataPaperTitle.value.trim(),
      authors: splitLines(els.metadataAuthors.value),
      year: els.metadataYear.value ? Number(els.metadataYear.value) : "",
      venue: els.metadataVenue.value.trim(),
      doi: els.metadataDoi.value.trim(),
      bibtex_key: els.metadataBibtexKey.value.trim(),
      projects: selectedValues(els.metadataProjects),
      categories: selectedValues(els.metadataCategories),
      tags: splitComma(els.metadataTags.value),
      notes: els.metadataNotes.value
    };
    state.metadataOverrides[state.activeMetadataId] = compactOverride(override);
    state.notes[state.activeMetadataId] = els.metadataNotes.value;
    writeLocalMetadata();
    writeLocalNotes();
    rebuildPapers();
    els.metadataDialog.close();
    render();
  }

  function resetActiveMetadata() {
    if (!state.activeMetadataId) return;
    delete state.metadataOverrides[state.activeMetadataId];
    writeLocalMetadata();
    rebuildPapers();
    els.metadataDialog.close();
    render();
  }

  function compactOverride(override) {
    const compact = {};
    Object.entries(override).forEach(([key, value]) => {
      if (Array.isArray(value) && value.length) compact[key] = value;
      else if (!Array.isArray(value) && value !== "" && value !== null && value !== undefined) compact[key] = value;
    });
    return compact;
  }

  function rebuildPapers() {
    state.papers = state.rawPapers.map((paper, index) => applyLocalMetadata(normalizePaper(paper, index)));
    refreshYearFilter();
  }

  function exportNotes() {
    downloadText("notes.json", JSON.stringify(state.notes, null, 2) + "\n");
  }

  function exportMetadataJson() {
    downloadText("mybib_metadata_overrides.json", JSON.stringify({ papers: state.metadataOverrides }, null, 2) + "\n");
  }

  function exportMetadataYamlFile() {
    downloadText("manual_overrides.yaml", overridesToYaml(state.metadataOverrides));
  }

  async function importNotes(event) {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const imported = JSON.parse(await file.text());
      state.notes = Object.assign({}, state.notes, imported);
      writeLocalNotes();
      rebuildPapers();
      render();
    } catch (error) {
      alert("Could not import notes.json. Please check that it is valid JSON.");
    }
    event.target.value = "";
  }

  async function importMetadata(event) {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const imported = JSON.parse(await file.text());
      const papers = imported.papers || imported;
      state.metadataOverrides = Object.assign({}, state.metadataOverrides, papers);
      writeLocalMetadata();
      rebuildPapers();
      render();
    } catch (error) {
      alert("Could not import metadata JSON. Exported YAML should be placed in data/manual_overrides.yaml.");
    }
    event.target.value = "";
  }

  function selectedValues(select) {
    return Array.from(select.selectedOptions).map((option) => option.value);
  }

  function setSelected(select, values) {
    const selected = new Set(values || []);
    Array.from(select.options).forEach((option) => {
      option.selected = selected.has(option.value);
    });
  }

  function splitLines(value) {
    if (Array.isArray(value)) return value;
    return String(value || "").split(/\n|;/).map((item) => item.trim()).filter(Boolean);
  }

  function splitComma(value) {
    if (Array.isArray(value)) return value;
    return String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
  }

  function makeBibtex(paper) {
    const key = paper.bibtex_key || fallbackKey(paper);
    const type = /conference|proceedings|icra|iros|rss|case/i.test(paper.venue || "") ? "inproceedings" : "article";
    const fields = {
      title: paper.title,
      author: paper.authors.join(" and "),
      year: paper.year,
      [type === "article" ? "journal" : "booktitle"]: paper.venue,
      doi: paper.doi,
      url: paper.url || (paper.doi ? `https://doi.org/${paper.doi}` : "")
    };
    const lines = [`@${type}{${key},`];
    Object.entries(fields).forEach(([field, value]) => {
      if (value) lines.push(`  ${field} = {${escapeBibtex(value)}},`);
    });
    if (lines[lines.length - 1].endsWith(",")) lines[lines.length - 1] = lines[lines.length - 1].slice(0, -1);
    lines.push("}");
    return lines.join("\n");
  }

  function fallbackKey(paper) {
    const first = firstSurname(paper).replace(/[^A-Za-z0-9]/g, "") || "Unknown";
    const year = paper.year || "NoYear";
    const short = (paper.title || "Paper").split(/\s+/).filter(Boolean).slice(0, 2).map(capitalize).join("");
    return `${first}${year}${short || "Paper"}`.replace(/[^A-Za-z0-9:_-]/g, "");
  }

  function capitalize(value) {
    return value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
  }

  function escapeBibtex(value) {
    return String(value).replace(/\\/g, "\\\\").replace(/\{/g, "\\{").replace(/\}/g, "\\}");
  }

  function overridesToYaml(overrides) {
    const lines = ["papers:"];
    Object.entries(overrides).forEach(([id, override]) => {
      lines.push(`  ${quoteYaml(id)}:`);
      Object.entries(override).forEach(([key, value]) => appendYamlField(lines, key, value, 4));
    });
    return lines.join("\n") + "\n";
  }

  function appendYamlField(lines, key, value, indent) {
    const pad = " ".repeat(indent);
    if (Array.isArray(value)) {
      lines.push(`${pad}${key}:`);
      value.forEach((item) => lines.push(`${pad}  - ${quoteYaml(item)}`));
    } else {
      lines.push(`${pad}${key}: ${quoteYaml(value)}`);
    }
  }

  function quoteYaml(value) {
    return `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
})();
