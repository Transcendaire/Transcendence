import '../public/config/main.css';
import '../public/config/tools.css';
import { render, getCurrentRoute, type Route } from './router';

import './page/home';
import './page/profile';
import './page/game/index';
import './page/lobby';
import './page/friends';


console.log('[APP] Application chargée');

function initApp(): void {
    console.log('[APP] Initialisation de l\'application');
    
    const initialRoute = getCurrentRoute();
    console.log('[APP] Route initiale:', initialRoute);
    render(initialRoute);
    
    window.addEventListener('popstate', (event) => {
        if (event.state && event.state.route !== undefined) {
            console.log('[APP] Ignoring programmatic navigation');
            return;
        }
        const route = getCurrentRoute();
        console.log('[APP] Popstate détecté (back button), navigation vers:', route);
        render(route);
    });
}

export function setupGlobalModalEvents(modal: HTMLElement, showButton: HTMLButtonElement, cancelButton: HTMLButtonElement)
{
    modal.addEventListener('click', (event) => {
        if (event.target === modal) 
            hide(modal);
        });

    modal.addEventListener('keydown', (event: KeyboardEvent) => {
        if (event.key === 'Escape')
            hide(modal);
    });

    showButton.addEventListener('click', () => show(modal));
    cancelButton.addEventListener('click', () => hide(modal));
}

export function getEl(id: string): HTMLElement {
    const el = document.getElementById(id);
    if (!el) throw new Error(`#${id} not found`);
    return el;
}

export function show(element: HTMLElement): void {
    element.classList.remove('hidden');
}

export function hide(element: HTMLElement): void {
    element.classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', initApp);