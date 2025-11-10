import { registerPageInitializer, navigate } from "../router.js";

function getEl<T extends HTMLElement>(id: string): T
{
    const el = document.getElementById(id);
    if (!el) 
        throw new Error(`Element with id="${id}" not found`);
    return el as T;
}

function initHomePage(): void
{
    const playButton = getEl<HTMLElement>("playButton");
    const loginButton = getEl<HTMLElement>("loginButton");
    const profileButton = getEl<HTMLElement>("profileButton");
    const loginModal = getEl<HTMLElement>("loginModal");
    const cancelButton = getEl<HTMLElement>("cancelButton")

    // playButton.addEventListener('click', () => {
    //     navigate('game');
    // })

    // 4. Ouvrir le modal de connexion
    loginButton.addEventListener('click', () => {
        console.log('[HOME] Ouverture du modal de connexion');
        loginModal.classList.remove('hidden');
    });

    // 5. Fermer le modal avec le bouton "Annuler"
    cancelButton.addEventListener('click', () => {
        console.log('[HOME] Fermeture du modal');
        loginModal.classList.add('hidden');
    });

    // 6. Fermer le modal en cliquant sur l'arrière-plan
    loginModal.addEventListener('click', (event) => {
        // Si on clique directement sur le fond noir (pas sur le contenu)
        if (event.target === loginModal) {
            console.log('[HOME] Fermeture du modal (clic extérieur)');
            loginModal.classList.add('hidden');
        }
    });
}

registerPageInitializer('home', initHomePage);