import axios from 'axios';
window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
if (csrfToken) {
    window.axios.defaults.headers.common['X-CSRF-TOKEN'] = csrfToken;
}

// Prevent mouse wheel from incrementing/decrementing focused number inputs.
window.addEventListener('wheel', (event) => {
    const activeElement = document.activeElement;

    if (!(activeElement instanceof HTMLInputElement) || activeElement.type !== 'number') {
        return;
    }

    if (event.target instanceof Node && activeElement.contains(event.target)) {
        activeElement.blur();
    }
}, { passive: true, capture: true });
