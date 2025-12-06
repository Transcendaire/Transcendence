let isGoogleScriptLoaded = false;
let isGoogleScriptLoading = false;

declare const google: any;

function handleCredentialResponse(response: any) {
    handleGoogleLogin(response.credential);
}

async function handleGoogleLogin(credential: string) 
{
    try {
        console.log('[GOOGLE] 🚀 fetch() démarre...');
        const response = await fetch('/api/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential }),
            credentials: 'include'
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error || 'Erreur connexion Google');
            return;
        }

        localStorage.setItem('userId', data.id);
        localStorage.setItem('userEmail', data.email);
        localStorage.setItem('userAlias', data.alias);
        localStorage.setItem('userPicture', data.picture || '');

        window.location.reload();

    } catch (error) {
        console.error('[GOOGLE] ❌ Erreur réseau (serveur inaccessible):', error);
        alert('Impossible de contacter le serveur. Vérifiez que le backend est démarré.');
    }
}

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

export async function initGoogle() {

    const clientId = "782178545544-31i17kv4fli13eqj7o0l4dclqnbb3hql.apps.googleusercontent.com";

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
        google.accounts.id.initialize({
            client_id: clientId,
            callback: handleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
        });

    } catch (error) {
        console.error('[GOOGLE] ❌ Erreur initialisation:', error);
        alert('Impossible de charger Google Sign-In');
    }
}

function attachCustomButton() : HTMLElement 
{
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
    return hiddenContainer;
}

export function triggerGoogleLogin() 
{
    try {
        let hiddenContainer = attachCustomButton();
        google.accounts.id.renderButton(
            hiddenContainer,
            { theme: "outline", size: "large" }
        );

        const googleBtn = hiddenContainer.querySelector('div[role="button"]') as HTMLElement | null;
        if (googleBtn) {
            console.log('[GOOGLE] Déclenchement automatique du clic sur le bouton Google...');
            googleBtn.click();
        } else {
            console.error('[GOOGLE] Bouton Google non trouvé dans le conteneur caché');
        }
    } catch (error) {
        console.error('[GOOGLE] Erreur lors du rendu du bouton caché:', error);
    }
}