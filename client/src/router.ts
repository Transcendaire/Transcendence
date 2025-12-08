import { checkAuthentication } from "./components/auth.js";

export type Route = 'home' | 'profile' | 'game' | 'lobby' | 'friends';

const ROUTES: Record<Route, string> = {
    home: '/page/home.html',
    profile: '/page/profile.html',
    game: '/page/game.html',
    lobby: '/page/lobby.html',
	friends: '/page/friends.html'
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

	if (!ROUTES[route]) {
		console.error(`Route invalide: ${route}`);
		window.location.href = '/404.html';
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

export async function navigate(route: Route, params?:string)
{
	const protectedRoutes = ['lobby', 'game', 'profile', 'friends'];
	if (protectedRoutes.includes(route)) {
		const isAuthenticated = await checkAuthentication();
		if (!isAuthenticated)
		{
			window.history.pushState({ route: 'home' }, '', '/home');
			render('home');
			alert('Veuillez vous reconnecter');
			return;
		}
	}
    let url = `/${route}`;
    if (params) {
        let userParams;
        route === 'profile' ? userParams = `?alias=${encodeURIComponent(params)}` : userParams = `?${params}`
        console.log(`url avant = ${url}`)
        url += userParams;
        console.log(`url = ${url}`)
    }
    window.history.pushState(route, '', url);
    render(route);
}

export function getRouteParams(): Record<string, string> {
    const search = window.location.search.slice(1);
    
    if (!search) return {};
    
    const params: Record<string, string> = {};
    search.split('&').forEach(param => {
        const [key, value] = param.split('=');
        if (key && value) {
            params[key] = decodeURIComponent(value);
        }
    });
    
    return params;
}

export function getCurrentRoute(): Route 
{
	const path = window.location.pathname.slice(1);
	const routePart = path.split('?')[0];
    return (routePart || 'home') as Route;
}