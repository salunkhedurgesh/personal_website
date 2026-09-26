const papers = [...document.querySelectorAll('[data-paper]')];
const search = document.querySelector('#paper-search');
const year = document.querySelector('#paper-year');
const filters = [...document.querySelectorAll('[data-filter]')];
const count = document.querySelector('#result-count');
const empty = document.querySelector('#empty-state');
let active = 'all';
function applyFilters() {
  const query = search.value.trim().toLocaleLowerCase();
  let visible = 0;
  for (const paper of papers) {
    const matches = (!query || paper.textContent.toLocaleLowerCase().includes(query))
      && (year.value === 'all' || paper.dataset.year === year.value)
      && (active === 'all' || paper.dataset.topic === active);
    paper.hidden = !matches;
    if (matches) visible++;
  }
  count.textContent = `${visible} of ${papers.length} papers`;
  empty.hidden = visible !== 0;
  filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === active)));
}
filters.forEach(button => button.addEventListener('click', () => {
  active = button.dataset.filter;
  applyFilters();
  try {
    const url = new URL(location.href);
    if (active === 'all') url.searchParams.delete('topic');
    else url.searchParams.set('topic', active);
    history.replaceState(null, '', url);
  } catch { /* Filtering also works when opened as a local file. */ }
}));
search.addEventListener('input', applyFilters);
year.addEventListener('change', applyFilters);
document.querySelector('#clear-filters').addEventListener('click', () => {
  search.value = ''; year.value = 'all'; active = 'all'; applyFilters(); search.focus();
  try { const url = new URL(location.href); url.searchParams.delete('topic'); history.replaceState(null, '', url); } catch { /* Local-file fallback. */ }
});
const requested = new URLSearchParams(location.search).get('topic');
if (filters.some(button => button.dataset.filter === requested)) active = requested;
applyFilters();
