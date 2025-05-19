const image_path = '/projects/main/webpage_resources/images/';
const page_path = '/projects/main/';

// Mapping of elements to update
const elements = [
    { id: 'personalLink', prop: 'href', value: page_path + 'personal/personal.html' },
    { id: 'logoImg', prop: 'src', value: image_path + 'logo_indark.png' },
    { id: 'homeLink', prop: 'href', value: '/index.html' },
    { id: 'homeImage', prop: 'src', value: image_path + 'home_green.png' },
    { id: 'experienceLink', prop: 'href', value: page_path + 'experience/experience.html' },
    { id: 'experienceImage', prop: 'src', value: image_path + 'experience_green.png' },
    { id: 'projectsLink', prop: 'href', value: page_path + 'projects/projects.html' },
    { id: 'projectsImage', prop: 'src', value: image_path + 'projects_green.png' },
    { id: 'publicationsLink', prop: 'href', value: page_path + 'publications/publications.html' },
    { id: 'publicationsImage', prop: 'src', value: image_path + 'publications_green.png' },
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
