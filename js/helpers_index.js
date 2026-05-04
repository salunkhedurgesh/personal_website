const image_path = '/projects/main/webpage_resources/images/';
const page_path = '/projects/main/';

// Mapping of elements to update
const elements = [
    { id: 'personalLink', prop: 'href', value: '/personal' },
    { id: 'logoImg', prop: 'src', value: image_path + 'logo_indark.png' },
    { id: 'homeLink', prop: 'href', value: '/' },
    { id: 'homeImage', prop: 'src', value: image_path + 'home_green.png' },
    { id: 'persoImage', prop: 'src', value: image_path + 'logo_perso.png' },
    { id: 'experienceLink', prop: 'href', value: '/experience' },
    { id: 'experienceImage', prop: 'src', value: image_path + 'experience_green.png' },
    { id: 'projectsLink', prop: 'href', value: '/researchprojects' },
    { id: 'projectsImage', prop: 'src', value: image_path + 'projects_green.png' },
    { id: 'publicationsLink', prop: 'href', value: '/publications' },
    { id: 'publicationsImage', prop: 'src', value: image_path + 'publications_green.png' },
    { id: 'contactLink', prop: 'href', value: '#', prop: 'data-attribute', value: "contact" },
    { id: 'contactImage', prop: 'src', value: image_path + 'contact_green.png' }
];

for (const item of elements) {
    try {
        const el = document.getElementById(item.id);
        if (el) {
            el[item.prop] = item.value;
        } else {
            console.warn(`${item.id} not found`);
        }
    } catch (e) {
        console.warn(`Error updating ${item.id}:`, e);
    }
}

// Add tooltips to nav items
document.querySelectorAll('.navlogo').forEach(logo => {
    const tooltip = document.createElement('span');
    tooltip.className = 'nav-tooltip';
    tooltip.textContent = logo.parentElement.querySelector('.navtitle').textContent;
    logo.appendChild(tooltip);
});

// Add tooltip functionality to nav icons
document.querySelectorAll('.navlogo').forEach(logo => {
    let timeout;
    logo.addEventListener('mouseenter', () => {
        timeout = setTimeout(() => {
            const tooltip = logo.querySelector('.nav-tooltip');
            if (tooltip) tooltip.style.display = 'block';
        }, 200);
    });
    logo.addEventListener('mouseleave', () => {
        clearTimeout(timeout);
        const tooltip = logo.querySelector('.nav-tooltip');
        if (tooltip) tooltip.style.display = 'none';
    });
});
