export type Route = 'home' | 'profile';

const ROUTES: Record<Route, string> = {
    home: '/page/home.html',
    profile: '/page/profile.html'
}

export function registerPageInitializer(route: Route) : fonction {}

export async function render(route: Route) {
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
}
