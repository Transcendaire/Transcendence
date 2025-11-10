import { render, navigate, getCurrentRoute, Route } from './router.js';

import './page/home.js';
import './page/profile.js';
// import './page/game.js'; // Plus tard

console.log('[APP] Application chargée');

function initApp(): void {
    console.log('[APP] Initialisation de l\'application');
    
    const initialRoute = getCurrentRoute();
    console.log('[APP] Route initiale:', initialRoute);
    render(initialRoute);
    
    window.addEventListener('popstate', (event) => {
        const route = getCurrentRoute();
        console.log('[APP] Popstate détecté, navigation vers:', route);
        render(route);
    });
    
    setupGlobalEvents();
}

function setupGlobalEvents(): void {
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modals = document.querySelectorAll('.modal:not(.hidden)');
            modals.forEach(modal => modal.classList.add('hidden'));
        }
    });
    
    window.addEventListener('storage', (e) => {
        if (e.key === 'logout') {
            navigate('home');
        }
    });
}

document.addEventListener('DOMContentLoaded', initApp);