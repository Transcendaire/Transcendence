import { playerName, isLoggedIn } from "../page/home.js"

let isGoogleScriptLoaded = false;
let isGoogleScriptLoading = false;

export function loadGoogleScript(): Promise<void> {
    return new Promise((resolve, reject) => {
        if (isGoogleScriptLoaded) {
            console.log('[GOOGLE] Script déjà chargé');
            resolve();
            return;
        }

        if (isGoogleScriptLoading) {
            console.log('[GOOGLE] Script en cours de chargement, attente...');
            setTimeout(() => {
                if (isGoogleScriptLoaded) resolve();
                else reject(new Error('Timeout'));
            }, 5000);
            return;
        }

        console.log('[GOOGLE] Chargement du script...');
        isGoogleScriptLoading = true;

        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;

        script.onload = () => {
            console.log('[GOOGLE] Script chargé avec succès');
            isGoogleScriptLoaded = true;
            isGoogleScriptLoading = false;
            resolve();
        };

        script.onerror = () => {
            console.error('[GOOGLE] Erreur de chargement du script');
            isGoogleScriptLoading = false;
            reject(new Error('Failed to load Google script'));
        };

        document.head.appendChild(script);
    });
}

export async function initGoogle() {
    console.log('[GOOGLE] Initialisation...');

    try {
        // Charger le script si nécessaire

        // Attendre un peu pour s'assurer que google est disponible
        await new Promise(resolve => setTimeout(resolve, 100));

        if (typeof google === 'undefined') {
            console.error('[GOOGLE] google undefined après chargement du script');
            return;
        }

        console.log('[GOOGLE] Initialisation de google.accounts.id');

        const clientId = "290138831985-p0tabf2g94p0l377ct2rcpbsbqekgcua.apps.googleusercontent.com"
        google.accounts.id.initialize({
            client_id: clientId,
            callback: handleCredentialResponse,
        })
    } catch (error) {
        console.error('[GOOGLE] Erreur:', error);
    }
}


function handleCredentialResponse(response: any) {
    console.log('[GOOGLE] Credential reçu');
    handleGoogleLogin(response.credential);
}

async function handleGoogleLogin(credential: string) {
    console.log('[GOOGLE] Envoi au backend...');


    try {
        const response = await fetch('/api/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential }),
            credentials: 'include'
        });

        const data = await response.json();
        if (!response.ok) {
            console.error('[GOOGLE] Erreur backend:', data.error);
            alert(data.error || 'Erreur connexion Google');
            return;
        }

        console.log('[GOOGLE] Connexion réussie:', data);

        // Appeler la callback            
    } catch (error) {
        console.error('[GOOGLE] Erreur réseau:', error);
        alert('Impossible de se connecter');
    }
}