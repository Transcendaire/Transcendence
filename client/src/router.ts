export type Route = 'home' | 'profile' | 'game';

const ROUTES: Record<Route, string> = {
    home: '/page/home.html',
    profile: '/page/profile.html',
    game: '/page/game.html'
};

type PageInitializer = () => void;
const pageInitializers: Partial<Record<Route, PageInitializer>> = {};

export function registerPageInitializer(route: Route, initializer: PageInitializer): void 
{
    console.log(`[ROUTER] Enregistrement de l'initializer pour "${route}"`);
    pageInitializers[route] = initializer;
}

export async function render(route: Route) 
{
    console.log('render() appelé avec route:', route);
    
    const app = document.getElementById('app');
    if (!app) {
        console.error('Element #app introuvable !');
        return;
    }
    
    console.log('Fetch de:', ROUTES[route]);
    const res = await fetch(ROUTES[route], { cache: 'no-cache' });
    console.log('Réponse fetch:', res.status, res.ok);
    
    if (!res.ok) {
        console.error(`Erreur de chargement: ${ROUTES[route]} (${res.status})`);
        app.innerHTML = '<p class="text-center p-6 text-red-600">Erreur de chargement de la page</p>';
        return;
    }
    
    const html = await res.text();
    console.log('HTML chargé, longueur:', html.length);
    app.innerHTML = html;
    console.log('HTML injecté dans #app');
    
    const initializer = pageInitializers[route];
    if (initializer) {
        console.log(`[ROUTER] Appel de l'initializer pour "${route}"`);
        initializer();
    } else {
        console.warn(`[ROUTER] Aucun initializer trouvé pour "${route}"`);
    }
}

export function navigate(route: Route) {
    console.log('Navigation vers:', route);
    window.history.pushState({}, '', `/${route}`);
    render(route);
}

export function getCurrentRoute(): Route {

  const path = window.location.pathname.slice(1);
    return(path || 'home') as Route;
}