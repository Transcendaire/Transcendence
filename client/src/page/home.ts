import { registerPageInitializer, navigate } from "../router.js";

function initHomePage(): void
{
    const playButton = document.getElementById("playButton");
    const loginButton = document.getElementById("loginButton");
    const profileButton = document.getElementById("profileButton");
    const loginModal = document.getElementById("loginModal");
    const cancelButton = document.getElementById("cancelButton")

    if (!playButton || !loginButton || !profileButton || !loginModal || !cancelButton) {
        console.error('[HOME] Éléments manquants');
        return;
    }

    playButton.addEventListener('click', () => {
        navigate('game');
    })

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