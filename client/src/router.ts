export type Route = 'home';

const ROUTES: Record<Route, string> = {
    home: '/page/home.html'  // Chemin absolu depuis la racine
}

export async function render(route: Route) {
  const app = document.getElementById('app')!;
  const res = await fetch(ROUTES[route], { cache: 'no-cache' });
  
  if (!res.ok) {
    console.error(`Erreur de chargement: ${ROUTES[route]} (${res.status})`);
    app.innerHTML = '<p>Erreur de chargement de la page</p>';
    return;
  }
  
  const html = await res.text();
  app.innerHTML = html;
  // Attache les events ici si besoin
}

