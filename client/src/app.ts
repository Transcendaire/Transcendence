import { render } from './router.js';

console.log('app.ts charger');

document.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded déclenché');
  render('home');
});