export type Route = 'home' | 'game' | 'profile' | 'lobby';

const ROUTES: Record<Route, string> = {
    home: '/page/home.html',
    game: '/page/game.html',
    profile: '/page/profile.html',
    lobby: '/page/lobby.html'
};

// Callbacks pour initialiser la logique de chaque page
type PageInitializer = () => void;
const PAGE_INITIALIZERS: Partial<Record<Route, PageInitializer>> = {};

/**
 * Enregistrer un initializer pour une route
 */
export function registerPageInitializer(route: Route, initializer: PageInitializer): void {
    PAGE_INITIALIZERS[route] = initializer;
}

/**
 * Charger et afficher une page
 */
export async function render(route: Route): Promise<void> {
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
    
    // Exécuter l'initializer de la page si défini
    const initializer = PAGE_INITIALIZERS[route];
    if (initializer) {
        console.log(`Exécution de l'initializer pour ${route}`);
        initializer();
    }
}

/**
 * Naviguer vers une route (à utiliser dans les pages)
 */
export function navigate(route: Route): void {
    // Mettre à jour l'URL sans recharger la page
    window.history.pushState({}, '', `/${route}`);
    render(route);
}

/**
 * Gérer le bouton "back" du navigateur
 */
window.addEventListener('popstate', () => {
    const path = window.location.pathname.slice(1) as Route;
    if (path in ROUTES) {
        render(path);
    } else {
        render('home');
    }
});