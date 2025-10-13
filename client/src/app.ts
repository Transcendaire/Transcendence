import { render } from './router.js';

import './pages/home/js'
import './pages/game.js'

console.log('app.ts charger');

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded déclenché');

    const path = window.location.pathname;
    
    if (path === '/' || path === '/home') {
        render('home');
    } else if (path === '/game') {
        render('game');
    } else if (path === '/profile') {
        render('profile');
    } else {
        render('home');
    }});