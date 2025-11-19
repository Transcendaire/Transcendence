import { render, navigate, getCurrentRoute, Route } from './router.js';
import { UserError, errClient } from '/dist/shared/errors.js'
import './page/home.js';
import './page/profile.js';
import './page/game.js';
import './page/lobby.js'


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


export async function getPlayerName(): Promise<string | undefined>
{
	const response = await fetch('/api/players/me');
	const data = await response.json();

	if (response.status === 200)
		return data.playerName;
	else if (response.status === 401)
		throw new UserError(data.error, errClient.UNAUTHENTICATED_PLAYER);
	throw new UserError(data.error, errClient.NONEXISTING_PLAYER);
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

