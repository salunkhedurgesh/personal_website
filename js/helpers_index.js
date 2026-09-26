const image_path = '/projects/main/webpage_resources/images/';
const page_path = '/projects/main/';

// Mapping of elements to update
const elements = [
    { id: 'personalLink', prop: 'href', value: '/personal' },
    { id: 'logoImg', prop: 'src', value: image_path + 'logo_indark.png' },
    { id: 'homeLink', prop: 'href', value: '/' },
    { id: 'homeImage', prop: 'src', value: image_path + 'home_green.png' },
    { id: 'persoImage', prop: 'src', value: image_path + 'logo_perso.png' },
    { id: 'projectsLink', prop: 'href', value: '/researchprojects' },
    { id: 'projectsImage', prop: 'src', value: image_path + 'projects_green.png' },
    { id: 'publicationsLink', prop: 'href', value: '/publications' },
    { id: 'publicationsImage', prop: 'src', value: image_path + 'publications_green.png' },
    { id: 'contactLink', prop: 'href', value: '#' },
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

function alignNavWithAboutMeRight() {
    const nav = document.querySelector('.navcontent');
    if (!nav) return;

    if (window.innerWidth >= 800) {
        const aboutMeText = document.querySelector('#about_me p') || document.getElementById('about_me') || document.querySelector('.profileDetails');
        if (aboutMeText) {
            const rect = aboutMeText.getBoundingClientRect();
            if (rect.right > 0) {
                const rightMargin = window.innerWidth - rect.right;
                nav.style.right = `${rightMargin}px`;
                nav.style.left = 'auto';
                return;
            }
        }
    } else {
        nav.style.right = '1rem';
        nav.style.left = 'auto';
    }
}

window.addEventListener('resize', alignNavWithAboutMeRight);
window.addEventListener('load', alignNavWithAboutMeRight);
document.addEventListener('DOMContentLoaded', () => {
    alignNavWithAboutMeRight();
    setTimeout(alignNavWithAboutMeRight, 150);
    setTimeout(alignNavWithAboutMeRight, 500);
});

