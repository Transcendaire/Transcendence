import { navigate, registerPageInitializer, render } from "../router";
import { getEl, show, hide } from "../app";

interface Friend {
    id: string;
    alias: string;
    online: boolean;
    since: number;
}

interface FriendRequest {
    id: string;
    from_user_id?: string;
    from_alias?: string;
    to_user_id?: string;
    to_alias?: string;
    created_at: number;
}

async function fetchFriends()
{
	const response = await fetch('/api/friends');
	
	if (!response.ok)
		throw new Error('Erreur lors de la récupération des amis');
	
	const data = await response.json();
	return data.friends || [];
}

async function fetchPendingRequests()
{
	const response = await fetch('/api/friends/requests/pending');

	if (!response.ok)
		throw new Error('Erreur lors de la récupération des demandes en attente');

	const data = await response.json();
	return data.pendingRequests || [];
}

async function fetchSentRequests()
{
	const response = await fetch('/api/friends/requests/sent');

	if (!response.ok)
		throw new Error('Erreur lors de la récupération des demandes envoyées');

	const data = await response.json();
	return data.sentRequests || [];
}

async function sendRequest(toUserAlias: string)
{
	const response = await fetch('/api/friends/request', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			alias: toUserAlias
		})
	});

	const data = await response.json();
	if (!response.ok)
		throw new Error(data.message || `Erreur lors de l'envoi de la demande d'ami à ${toUserAlias}`);

	return data;
}

async function acceptRequest(fromUserAlias: string)
{
	const response = await fetch('/api/friends/accept', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			alias: fromUserAlias
		})
	});

	const data = await response.json();
	if (!response.ok)
		throw new Error(data.message || `Erreur lors de l\'acceptation de la demande d\'ami de ${fromUserAlias}`);

	return data;
}

async function rejectRequest(fromUserAlias: string)
{
	const response = await fetch('/api/friends/reject', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			alias: fromUserAlias
		})
	});

	const data = await response.json();
	if (!response.ok)
		throw new Error(data.message || `Erreur lors du refus de la demande d\'ami de ${fromUserAlias}`);

	return data;
}

async function cancelRequest(alias: string)
{
	const response = await fetch(`/api/friends/request/${alias}`, {
		method: 'DELETE'
	});
	
	const data = await response.json();
	if (!response.ok)
		throw new Error(data.message || `Erreur lors de l\'annulation de la demande d\'ami de ${alias}`);
}

async function deleteFriend(alias: string)
{
	const response = await fetch(`/api/friends/${alias}`, {
		method: 'DELETE'
	});

	const data = await response.json();
	if (!response.ok)
		throw new Error(data.message || `Erreur lors de la suppression de ${alias} de vos amis`)
}


function renderFriends(friends: Friend[]): void {
    const container = getEl('friendsList');
    const countEl = getEl('friendsCount');
    
    countEl.textContent = friends.length.toString();

    if (friends.length === 0)
	{
        container.innerHTML = `
            <p class="text-gray-400 text-center py-8 font-quency col-span-2">
                Vous n'avez pas encore d'amis
            </p>
        `;
        return;
    }

    container.innerHTML = friends.map(friend => `
        <div class="bg-sonpi16-orange bg-opacity-10 rounded-lg p-4 
                    border-2 border-transparent hover:border-sonpi16-orange 
                    transition-all duration-300">
            <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-3">
                    <div class="w-12 h-12 bg-sonpi16-orange rounded-full flex items-center justify-center">
                        <span class="text-white font-quency text-xl">${friend.alias[0]!.toUpperCase()}</span>
                    </div>
                    <div>
                        <p class="text-sonpi16-orange font-quency font-bold text-lg">${friend.alias}</p>
                        <div class="flex items-center gap-2">
                            <div class="w-2 h-2 rounded-full ${friend.online ? 'bg-green-400' : 'bg-gray-500'}"></div>
                            <span class="text-sm ${friend.online ? 'text-green-400' : 'text-gray-400'} font-quency">
                                ${friend.online ? 'En ligne' : 'Hors ligne'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            
            <button 
                data-alias="${friend.alias}"
                class="remove-friend-btn w-full bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded 
                       font-quency text-sm transition-all hover:scale-105 active:scale-95">
                Supprimer
            </button>
        </div>
    `).join('');

    container.querySelectorAll('.remove-friend-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const alias = (e.target as HTMLElement).dataset.alias;
            if (!alias)
				return;
            
            if (!confirm(`Voulez-vous vraiment supprimer ${alias} de vos amis ?`))
				return;
            
            try {
                await deleteFriend(alias);
                await loadAllData();
            } catch (error: any) {
                alert(error.message || 'Erreur lors de la suppression');
            }
        });
    });
}

function renderPendingRequests(requests: FriendRequest[]): void {
    const container = getEl('pendingRequestsList');
    const countEl = getEl('pendingCount');
    
    countEl.textContent = requests.length.toString();

    if (requests.length === 0)
	{
        container.innerHTML = `
            <p class="text-gray-400 text-center py-8 font-quency">
                Aucune demande en attente
            </p>
        `;
        return;
    }

    container.innerHTML = requests.map(request => `
        <div class="bg-sonpi16-orange bg-opacity-10 rounded-lg p-4 
                    border-2 border-sonpi16-orange">
            <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                    <span class="text-2xl">👤</span>
                    <span class="text-sonpi16-orange font-quency font-bold">${request.from_alias}</span>
                </div>
                <span class="text-xs text-gray-400 font-quency">
                    ${formatTime(request.created_at)}
                </span>
            </div>
            
            <div class="flex gap-2">
                <button 
                    data-alias="${request.from_alias}"
                    class="accept-request-btn flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded 
                           font-quency text-sm transition-all hover:scale-105 active:scale-95">
                    ✓ Accepter
                </button>
                <button 
                    data-alias="${request.from_alias}"
                    class="reject-request-btn flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded 
                           font-quency text-sm transition-all hover:scale-105 active:scale-95">
                    ✗ Refuser
                </button>
            </div>
        </div>
    `).join('');

    container.querySelectorAll('.accept-request-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const alias = (e.target as HTMLElement).dataset.alias;
            if (!alias)
				return;
            
            try {
                await acceptRequest(alias);
                await loadAllData();
            } catch (error: any) {
                alert(error.message || 'Erreur lors de l\'acceptation');
            }
        });
    });

    container.querySelectorAll('.reject-request-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const alias = (e.target as HTMLElement).dataset.alias;
            if (!alias)
				return;
            
            try {
                await rejectRequest(alias);
                await loadPendingRequests();
            } catch (error: any) {
                alert(error.message || 'Erreur lors du refus');
            }
        });
    });
}

function renderSentRequests(requests: FriendRequest[]): void {
    const container = getEl('sentRequestsList');
    const countEl = getEl('sentCount');
    
    countEl.textContent = requests.length.toString();

    if (requests.length === 0)
	{
        container.innerHTML = `
            <p class="text-gray-400 text-center py-8 font-quency">
                Aucune demande envoyée
            </p>
        `;
        return;
    }

    container.innerHTML = requests.map(request => `
        <div class="bg-sonpi16-orange bg-opacity-10 rounded-lg p-4 
                    border-2 border-transparent hover:border-sonpi16-orange transition-all">
            <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                    <span class="text-2xl">📤</span>
                    <span class="text-sonpi16-orange font-quency font-bold">${request.to_alias}</span>
                </div>
                <span class="text-xs text-gray-400 font-quency">
                    ${formatTime(request.created_at)}
                </span>
            </div>
            
            <button 
                data-alias="${request.to_alias}"
                class="cancel-request-btn w-full bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded 
                       font-quency text-sm transition-all hover:scale-105 active:scale-95">
                Annuler
            </button>
        </div>
    `).join('');


    container.querySelectorAll('.cancel-request-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const alias = (e.target as HTMLElement).dataset.alias;
            if (!alias)
				return;
            
            try {
                await cancelRequest(alias);
                await loadSentRequests();
            } catch (error: any) {
                alert(error.message || 'Erreur lors de l\'annulation');
            }
        });
    });
}

function formatTime(timestamp: number): string
{
	const date = new Date(timestamp);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMins = Math.floor(diffMs / 60000);

	if (diffMins < 1)
		return 'à l\'instant';
    if (diffMins < 60)
		return `il y a ${diffMins}m`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24)
		return `il y a ${diffHours}h`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `il y a ${diffDays}j`;
}

function showMessage(element: HTMLElement, message: string, type: 'success' | 'error'): void
{
    element.textContent = message;
    element.className = `text-sm text-center font-quency ${
        type === 'success' ? 'text-green-400' : 'text-red-400'
    }`;
    show(element);
    
    setTimeout(() => hide(element), 3000);
}


async function loadAllData()
{
    await Promise.all([
        loadFriends(),
        loadPendingRequests(),
        loadSentRequests()
    ]);
}

async function loadFriends() 
{
    try {
        const friends = await fetchFriends();
        renderFriends(friends);
    } catch (error: any) {
        console.error('[FRIENDS] Error loading friends:', error);
    }
}

async function loadPendingRequests() 
{
    try {
        const requests = await fetchPendingRequests();
        renderPendingRequests(requests);
    } catch (error: any) {
        console.error('[FRIENDS] Error loading pending requests:', error);
    }
}

async function loadSentRequests() 
{
    try {
        const requests = await fetchSentRequests();
        renderSentRequests(requests);
    } catch (error: any) {
        console.error('[FRIENDS] Error loading sent requests:', error);
    }
}

function setupAddFriend(): void
{
    const input = getEl('addFriendInput') as HTMLInputElement;
    const button = getEl('sendFriendRequestButton');
    const messageEl = getEl('addFriendMessage');

    const handleSend = async () => {
        const alias = input.value.trim();
        
        if (!alias) {
            showMessage(messageEl, 'Veuillez entrer un alias', 'error');
            return;
        }

        try {
            button.textContent = 'Envoi...';
            button.setAttribute('disabled', 'true');
            
            const result = await sendRequest(alias);
            showMessage(messageEl, result.message, 'success');
            input.value = '';
            
            await loadSentRequests();
            
        } catch (error: any) {
            showMessage(messageEl, error.message || 'Erreur lors de l\'envoi', 'error');
        } finally {
            button.textContent = 'Envoyer la demande';
            button.removeAttribute('disabled');
        }
    };

    button.addEventListener('click', handleSend);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSend();
    });
}



function initFriendsPage(): void {
    console.log('[FRIENDS] Initializing friends page');

    getEl('backHomeFromFriends').addEventListener('click', () => navigate('home'));

    setupAddFriend();

    loadAllData();

    // setInterval(() => {
    //     loadAllData();
    // }, 5000);
}

registerPageInitializer('friends', initFriendsPage);