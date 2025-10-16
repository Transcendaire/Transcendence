import { render } from './router.js';

import "./page/home.js"

console.log("hi")
document.addEventListener('DOMContentLoaded', () => 
    {
  console.log('DOMContentLoaded déclenché');

    const path = window.location.pathname;
    console.log("home")
    if (path === '/' || path === '/home') {

        render('home');
    } 
    else if (path === '/game') 
        render('game');
    else if (path === '/profile')
        render('profile');
    else
        render('home');
});
