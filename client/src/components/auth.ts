export type AuthEvent = 'login' | 'logout';

export async function getUserWithCookies(): Promise<string | undefined> {
    try {
        console.log('[AUTH] Fetching /api/auth/me');
        const res = await fetch('/api/auth/me', { credentials: 'same-origin' });
        console.log('[AUTH] Response status:', res.status);
        
        const data = await res.json();
        console.log('[AUTH] Response data:', data);

        if (res.ok) {
            console.log('[AUTH] User is logged in as:', data.alias);
            return data.alias;
        } else {
            console.log('[AUTH] User not logged in');
            return undefined;
        }
    } catch (error) {
        console.error('[AUTH] getUserWithCookies error:', error);
        return undefined;
    }
}

export async function checkAuthentication()
{
	const alias = await getUserWithCookies();
	if (alias)
		return true;
	return false;
}

const channel = new BroadcastChannel('auth');

export function broadcastAuthEvent(type: AuthEvent): void {
    console.log('[AUTH] Broadcasting event:', type);
    channel.postMessage({ type });
}

export function initAuth(onChange: (alias?: string) => void, hydrate = true): void {
    console.log('[AUTH] Initializing auth with hydrate:', hydrate);
    
    channel.onmessage = async (event) => {
        console.log('[AUTH] Received broadcast:', event.data);
        const alias = await getUserWithCookies();
        console.log('[AUTH] After broadcast check, alias:', alias);
        onChange(alias);
    };

    if (hydrate) {
        (async () => {
            console.log('[AUTH] Hydrating on init');
            const alias = await getUserWithCookies();
            console.log('[AUTH] Initial hydration, alias:', alias);
            onChange(alias);
        })();
    }
}