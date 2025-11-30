let isGoogleScriptLoaded = false;
let isGoogleScriptLoading = false;

// Callback appelée automatiquement par Google après connexion
function handleCredentialResponse(response: any) {
    handleGoogleLogin(response.credential);
}

// Envoyer le JWT token au backend
async function handleGoogleLogin(credential: string) {
    console.log('[GOOGLE] Envoi du token au backend...');

    try {
        const response = await fetch('/api/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential }),
            credentials: 'include'
        });

        const data = await response.json();
        
        if (!response.ok) {
            console.error('[GOOGLE] ❌ Erreur backend:', data.error);
            alert(data.error || 'Erreur connexion Google');
            return;
        }

        console.log('[GOOGLE] ✅ Connexion réussie !', data);
        alert(`Bienvenue ${data.alias || data.email} !`);
        
        // TODO: Mettre à jour l'état de l'application
        // window.location.reload(); ou mettre à jour playerName, isLoggedIn
        
    } catch (error) {
        console.error('[GOOGLE] ❌ Erreur réseau:', error);
        alert('Impossible de contacter le serveur');
    }
}

// Charger le script Google
export function loadGoogleScript(): Promise<void> {
    return new Promise((resolve, reject) => {
        if (isGoogleScriptLoaded) {
            console.log('[GOOGLE] Script déjà chargé');
            resolve();
            return;
        }

        if (isGoogleScriptLoading) {
            console.log('[GOOGLE] Script en cours de chargement...');
            const checkInterval = setInterval(() => {
                if (isGoogleScriptLoaded) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
            
            setTimeout(() => {
                clearInterval(checkInterval);
                if (!isGoogleScriptLoaded) {
                    reject(new Error('Timeout chargement script'));
                }
            }, 10000);
            return;
        }

        console.log('[GOOGLE] Chargement du script...');
        isGoogleScriptLoading = true;

        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;

        script.onload = () => {
            console.log('[GOOGLE] ✅ Script chargé avec succès');
            isGoogleScriptLoaded = true;
            isGoogleScriptLoading = false;
            resolve();
        };

        script.onerror = (error) => {
            console.error('[GOOGLE] ❌ Erreur chargement script:', error);
            isGoogleScriptLoading = false;
            reject(new Error('Échec chargement script Google'));
        };

        document.head.appendChild(script);
    });
}

// Initialiser Google Sign-In
export async function initGoogle() {
    console.log('[GOOGLE] ========================================');
    console.log('[GOOGLE] INITIALISATION GOOGLE SIGN-IN');
    console.log('[GOOGLE] ========================================');
    console.log('[GOOGLE] Origin:', window.location.origin);
    console.log('[GOOGLE] Href:', window.location.href);
    
    const clientId = "782178545544-31i17kv4fli13eqj7o0l4dclqnbb3hql.apps.googleusercontent.com";
    console.log('[GOOGLE] Client ID:', clientId);

    try {
        await loadGoogleScript();
        
        let attempts = 0;
        while (typeof google === 'undefined' && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (typeof google === 'undefined') {
            throw new Error('Objet google non disponible après 5 secondes');
        }

        console.log('[GOOGLE] ✅ Objet google disponible');

        google.accounts.id.initialize({
            client_id: clientId,
            callback: handleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
        });

        console.log('[GOOGLE] ✅ google.accounts.id.initialize() terminé');

        attachCustomButton();

    } catch (error) {
        console.error('[GOOGLE] ❌ Erreur initialisation:', error);
        alert('Impossible de charger Google Sign-In');
    }
}

// Attacher l'événement à ton bouton custom
function attachCustomButton() {
    const customButton = document.getElementById('googleLoginButton');
    if (!customButton) {
        console.error('[GOOGLE] ❌ Bouton #googleLoginButton introuvable');
        return;
    }

    console.log('[GOOGLE] Attachement du bouton custom...');

    customButton.addEventListener('click', () => {
        console.log('[GOOGLE] Clic sur bouton custom, création du conteneur invisible...');
        
        let hiddenContainer = document.getElementById('googleSignInDivHidden');
        if (!hiddenContainer) {
            hiddenContainer = document.createElement('div');
            hiddenContainer.id = 'googleSignInDivHidden';
            hiddenContainer.style.position = 'fixed';
            hiddenContainer.style.top = '-9999px';
            hiddenContainer.style.left = '-9999px';
            hiddenContainer.style.opacity = '0';
            hiddenContainer.style.pointerEvents = 'none';
            document.body.appendChild(hiddenContainer);
        }

        try {
            google.accounts.id.renderButton(
                hiddenContainer,
                { theme: "outline", size: "large" }
            );

            setTimeout(() => {
                const googleBtn = hiddenContainer!.querySelector('div[role="button"]') as HTMLElement;
                if (googleBtn) {
                    console.log('[GOOGLE] Déclenchement automatique du clic sur le bouton Google...');
                    googleBtn.click();
                } else {
                    console.error('[GOOGLE] Bouton Google non trouvé dans le conteneur caché');
                }
            }, 100);

        } catch (error) {
            console.error('[GOOGLE] Erreur lors du rendu du bouton caché:', error);
        }
    });

    console.log('[GOOGLE] ✅ Bouton custom attaché avec succès');
}