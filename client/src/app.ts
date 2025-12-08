import '../public/config/main.css';
import '../public/config/tools.css';
import { render, getCurrentRoute, type Route } from './router';

import './page/home';
import './page/profile';
import './page/game/index';
import './page/lobby';
import './page/friends';
import './page/404';

let preventNavigation = false;
let lastPath = '/';

export function setNavigationLock(locked: boolean): void
{
	preventNavigation = locked;
	console.log('[APP] Navigation lock:', locked);
}

export function updateLastPath(path: string): void
{
	lastPath = path;
}

export function getLastPath(): string
{
	return lastPath;
}

console.log('[APP] Application chargée');

function initApp(): void
{
    const initialRoute = getCurrentRoute()
    console.log('[APP] Init - route initiale:', initialRoute)
    lastPath = window.location.pathname
    render(initialRoute)
    
    window.addEventListener('popstate', async (event) =>
    {
        const currentPath = window.location.pathname
        const comingFromGame = lastPath === '/game'
        const goingToGame = currentPath === '/game'
        
        console.log('[APP] POPSTATE déclenché!')
        console.log('[APP] - lastPath:', lastPath)
        console.log('[APP] - currentPath:', currentPath)
        console.log('[APP] - comingFromGame:', comingFromGame)
        console.log('[APP] - preventNavigation:', preventNavigation)
        
        if (preventNavigation && comingFromGame && !goingToGame)
        {
            console.log('[APP] 🚫 BLOCAGE DE LA NAVIGATION!')
            event.preventDefault()
            event.stopImmediatePropagation()
            window.history.pushState({ path: '/game' }, '', '/game')
            lastPath = '/game'
            
            setTimeout(() =>
            {
                const modal = document.getElementById("surrenderModal")
                console.log('[APP] Modal trouvé?', !!modal)
                if (modal)
                    modal.classList.remove("hidden")
            }, 50)
            return
        }
        
        console.log('[APP] ✅ Navigation autorisée vers:', currentPath)
        lastPath = currentPath
        const route = getCurrentRoute()
        render(route)
    })
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