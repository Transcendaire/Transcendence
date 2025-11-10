import { registerPageInitializer, navigate } from "../router.js";
import { Player } from "@shared/type"

function getEl<T extends HTMLElement>(id: string): T
{
    const el = document.getElementById(id);
    if (!el) 
        throw new Error(`Element with id="${id}" not found`);
    else
        console.log(`id = "${id}" bien charger`);
    return el as T;
}

function initHomePage(): void
{
    console.log("appel de inithomepage");

    // const playButton = getEl<HTMLElement>("playButton");
    const loginButton = getEl<HTMLElement>("loginButton");
    const profileButton = getEl<HTMLElement>("profileButton");
    const invitePlayer = getEl<HTMLElement>("invitePlayer");
    const loginModal = getEl<HTMLElement>("loginModal");
    const cancelButton = getEl<HTMLElement>("cancelButton");

    // playButton.addEventListener('click', () => {
    //     navigate('game');
    // })

    loginButton.addEventListener('click', () => {
        console.log('[HOME] Ouverture du modal de connexion');
        loginModal.classList.remove('hidden');
    });

    cancelButton.addEventListener('click', () => {
        console.log('[HOME] Fermeture du modal');
        loginModal.classList.add('hidden');
    });

    // Fermer le modal en cliquant sur l'arrière-plan
    loginModal.addEventListener('click', (event) => {
        // Si on clique directement sur le fond noir (pas sur le contenu)
        if (event.target === loginModal) {
            console.log('[HOME] Fermeture du modal (clic extérieur)');
            loginModal.classList.add('hidden');
        }
    });
}

registerPageInitializer('home', initHomePage);