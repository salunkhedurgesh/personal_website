const image_path = '/projects/main/webpage_resources/images/';
const page_path = '/projects/personal/';

// Mapping of elements to update
const elements = [
    { id: 'personalLink', prop: 'href', value: '/projects/personal/personal.html' },
    { id: 'logoImg', prop: 'src', value: image_path + 'logo_indark.png' },
    { id: 'homeLink', prop: 'href', value: '/index.html' },
    { id: 'homeImage', prop: 'src', value: image_path + 'home_green.png' },
    { id: 'persoImage', prop: 'src', value: image_path + 'logo_perso.png' },
    { id: 'hobbiesLink', prop: 'href', value: '/projects/personal/hobbies/hobbies.html' },
    { id: 'hobbiesImage', prop: 'src', value: image_path + 'hobbies.png' },
    { id: 'travelLink', prop: 'href', value: '/projects/personal/travel/travel.html' },
    { id: 'travelImage', prop: 'src', value: image_path + 'travel.png' },
    { id: 'blogLink', prop: 'href', value: '/projects/personal/blog/blog.html' },
    { id: 'blogImage', prop: 'src', value: image_path + 'blog.png' },
    { id: 'contactImage', prop: 'src', value: image_path + 'contact_perso.png'}
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
