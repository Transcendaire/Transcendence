import { getEl, show, hide } from "../app";
import { wsClient, getWebSocketUrl } from "../components/WebSocketClient";
import { registerPageInitializer, navigate } from "../router";

async function initProfilePage(): Promise<void> {
    console.log('[PROFILE] Initializing profile page');

    let ownerAlias = await loadUserProfile();
    if (!ownerAlias) {
        console.error('[PROFILE] User not authenticated, redirecting to home');
        navigate('home');
        return;
    }

    const usernameDiv = getEl("username");

    getEl("backHome").addEventListener('click', () => navigate('home'));
    setupSearchPlayer();

    const urlAlias = getAliasFromUrl();
    const targetAlias = urlAlias;
    let isOwnProfile = false;

    if (!targetAlias) {
        usernameDiv.innerText = ownerAlias;
        initAvatarEdit();
        initAliasEdit(usernameDiv);
        isOwnProfile = true;
    }

    const profileData = await fetchProfileData(targetAlias || ownerAlias);

    if (!profileData) {
        console.error('[PROFILE] Failed to load profile for:', targetAlias);
        const usernameEl = getEl('username');
        usernameEl.innerText = 'Utilisateur non trouvé';

		const avatarImg = getEl('userAvatar') as HTMLImageElement;
    	const userInitialEl = getEl('userInitial');
    	avatarImg.src = '/avatars/defaults/Transcendaire.png';
    	avatarImg.classList.remove('hidden');
    	userInitialEl.classList.add('hidden');

        return;
    }
    updateProfileUI(profileData, isOwnProfile);
    await connectWebSocketForStatus(ownerAlias);
    if (!isOwnProfile && targetAlias)
        await setupFriendButton(targetAlias, ownerAlias);
}

async function loadUserProfile(): Promise<string> {
    const response = await fetch('/api/auth/me', {
        credentials: 'include'
    });

    if (!response.ok) return "";

    const user = await response.json();

    console.log(`username = ${user.alias}`);

    return user.alias;
}

function initAliasEdit(usernameDiv: HTMLElement) {
    const editAliasBtn = getEl("editAliasBtn") as HTMLButtonElement;
    const newAliasInput = getEl("aliasInput") as HTMLInputElement;

    const showEditInput = () => { show(newAliasInput); hide(usernameDiv) }
    const hideEditInput = () => { hide(newAliasInput); show(usernameDiv) }

    editAliasBtn.addEventListener('click', showEditInput);
    newAliasInput.addEventListener('click', (e) => {
        if (e.target !== newAliasInput)
            hideEditInput;
    })

    newAliasInput.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === "Escape") {
            hide(newAliasInput);
            show(usernameDiv);
        }
        if (e.key === "Enter") {
            try { updateAlias(newAliasInput.value); }
            catch { alert() }
        }
    })
}

interface MatchHistoryEntry {
    id: string;
    player_alias: string;
    game_type: '1v1' | 'battle_royale';
    opponent_info: string;
    player_count: number;
    bot_count: number;
    score_for: number;
    score_against: number;
    position: number;
    position_with_bots: number;
    result: 'win' | 'loss';
    tournament_id: string | null;
    created_at: number;
}

interface TournamentMatch {
    id: string;
    tournament_id: string;
    player_a_id: string;
    player_b_id: string;
    alias_a: string;
    alias_b: string;
    score_a: number;
    score_b: number;
    state: string;
    created_at: number;
}

interface TournamentResultEntry {
    id: string;
    player_alias: string;
    tournament_id: string;
    tournament_name: string;
    position: number;
    total_participants: number;
    matches_won: number;
    matches_lost: number;
    created_at: number;
    matches: TournamentMatch[];
}

interface PlayerStats {
    totalGames: number;
    wins: number;
    losses: number;
    winRate: number;
    tournamentsPlayed: number;
    tournamentsWon: number;
}

interface ProfileData {
    alias: string;
    createdAt: number;
    avatar: string;
    stats: PlayerStats;
    matchHistory: MatchHistoryEntry[];
    tournamentResults: TournamentResultEntry[];
}

type FriendStatus = 'none' | 'friends' | 'pending-sent' | 'pending-received'

// ============ Avatar Functions ============

function updateDeleteButtonVisibility(hasCustomAvatar: boolean): void {
    const deleteBtn = document.getElementById('deleteAvatarBtn');
    if (deleteBtn) {
        if (hasCustomAvatar)
            deleteBtn.classList.remove('hidden');
        else
            deleteBtn.classList.add('hidden');
    }
}

async function loadAvatar(): Promise<void> {
    const avatarImg = getEl('userAvatar') as HTMLImageElement;

    try {
        const response = await fetch('/api/user/avatar', { credentials: 'include' });
        if (!response.ok) {
            avatarImg.src = '/avatars/defaults/Transcendaire.png';
			avatarImg.classList.remove('hidden');
            userInitial.classList.add('hidden');
            updateDeleteButtonVisibility(false);
            return;
        }
        const data = await response.json();
		
		if (data.avatar && data.avatar !== '/avatars/defaults/Transcendaire.png')
		{
        	avatarImg.src = data.avatar;
 			console.log('[PROFILE] Using custom avatar:', avatarImg.src);
		}
		else if (data.googlePicture)
		{
			avatarImg.src = data.googlePicture;
 			console.log('[PROFILE] Using google avatar:', avatarImg.src);

		}
		else
		{
			avatarImg.src = '/avatars/defaults/Transcendaire.png';
			 console.log('[PROFILE] Using default avatar:', avatarImg.src);
		}

        avatarImg.classList.remove('hidden');

        const hasCustomAvatar = !data.avatar.includes('/avatars/defaults/');
        updateDeleteButtonVisibility(hasCustomAvatar);
    }
    catch (error) {
        console.error('[PROFILE] Error loading avatar:', error);
        avatarImg.src = '/avatars/defaults/Transcendaire.png';
		avatarImg.classList.remove('hidden');
        userInitial.classList.add('hidden');
        updateDeleteButtonVisibility(false);
    }
}

async function uploadAvatar(file: File): Promise<void> {
    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/user/avatar', {
            method: 'POST',
            credentials: 'include',
            body: formData
        });

        const data = await response.json();
        if (!response.ok)
            throw new Error(data.message || 'Erreur lors de l\'upload');

        showToast('Avatar mis à jour avec succès', 'success');
        await loadAvatar();
    } catch (error) {
        console.error('[PROFILE] Error uploading avatar:', error);
        showToast(error instanceof Error ? error.message : 'Erreur lors de l\'upload', 'error');
    }
}

async function deleteAvatar(): Promise<void> {
    try {
        const response = await fetch('/api/user/avatar', {
            method: 'DELETE',
            credentials: 'include'
        });

        const data = await response.json();
        if (!response.ok)
            throw new Error(data.message || 'Erreur lors de la suppression');

        showToast('Avatar supprimé, avatar par défaut restauré', 'success');
        await loadAvatar();
    } catch (error) {
        console.error('[PROFILE] Error deleting avatar:', error);
        showToast(error instanceof Error ? error.message : 'Erreur lors de la suppression', 'error');
    }
}

function initAvatarEdit(): void {
    const editBtn = getEl('editAvatarBtn');
    const deleteBtn = getEl('deleteAvatarBtn');
    const fileInput = getEl('avatarFileInput') as HTMLInputElement;
    const deleteModal = getEl('deleteAvatarModal');
    const confirmDeleteBtn = getEl('confirmDeleteAvatar');
    const cancelDeleteBtn = getEl('cancelDeleteAvatar');

    editBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', async (e) => {
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];
        if (!file) return;

        if (!['image/jpeg', 'image/png'].includes(file.type)) {
            showToast('Format invalide. Utilisez JPEG ou PNG', 'error');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            showToast('Fichier trop volumineux (max 5MB)', 'error');
            return;
        }

        await uploadAvatar(file);
        fileInput.value = '';
    });

    deleteBtn.addEventListener('click', () => show(deleteModal));
    confirmDeleteBtn.addEventListener('click', async () => {
        hide(deleteModal);
        await deleteAvatar();
    });
    cancelDeleteBtn.addEventListener('click', () => hide(deleteModal));
    deleteModal.addEventListener('click', (e) => {
        if (e.target === deleteModal) hide(deleteModal);
    });
}

function showToast(message: string, type: 'success' | 'error'): void {
    const existingToast = document.getElementById('toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = `fixed top-4 right-4 px-6 py-4 rounded-xl shadow-2xl font-quency font-bold text-white z-50 
                       transform transition-all duration-300 ease-in-out
                       ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============ Friend Functions ============

async function getFriendStatus(alias: string): Promise<FriendStatus> {
    try {
        const res = await fetch(`/api/friends/status/${encodeURIComponent(alias)}`);
        if (!res.ok) return 'none';
        const data = await res.json();
        return data.status || 'none';
    } catch { return 'none'; }
}

async function sendFriendRequest(alias: string): Promise<boolean> {
    try {
        const res = await fetch('/api/friends/request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ alias })
        });
        return res.ok;
    } catch { return false; }
}

async function cancelFriendRequest(alias: string): Promise<boolean> {
    try {
        const res = await fetch(`/api/friends/request/${encodeURIComponent(alias)}`, { method: 'DELETE' });
        return res.ok;
    } catch { return false; }
}

async function acceptFriendRequest(alias: string): Promise<boolean> {
    try {
        const res = await fetch('/api/friends/accept', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ alias })
        });
        return res.ok;
    } catch { return false; }
}

async function removeFriend(alias: string): Promise<boolean> {
    try {
        const res = await fetch(`/api/friends/${encodeURIComponent(alias)}`, { method: 'DELETE' });
        return res.ok;
    } catch { return false; }
}

function updateFriendButton(btn: HTMLElement, status: FriendStatus): void {
    btn.className = 'px-4 py-2 rounded-xl hover:scale-105 transition font-quency font-bold';
    switch (status) {
        case 'none':
            btn.innerText = 'Ajouter en ami';
            btn.classList.add('bg-green-600', 'text-white');
            break;
        case 'pending-sent':
            btn.innerText = 'Demande envoyée ✗';
            btn.classList.add('bg-yellow-500', 'text-white');
            break;
        case 'pending-received':
            btn.innerText = 'Accepter la demande';
            btn.classList.add('bg-blue-600', 'text-white');
            break;
        case 'friends':
            btn.innerText = 'Supprimer l\'ami';
            btn.classList.add('bg-red-600', 'text-white');
            break;
    }
}

async function setupFriendButton(targetAlias: string, currentAlias: string): Promise<void> {
    const btn = getEl('friend-action-btn');
    if (targetAlias === currentAlias) {
        hide(btn);
        return;
    }

    let status = await getFriendStatus(targetAlias);
    updateFriendButton(btn, status);
    show(btn);

    btn.onclick = async () => {
        btn.classList.add('opacity-50', 'pointer-events-none');
        let success = false;

        switch (status) {
            case 'none':
                success = await sendFriendRequest(targetAlias);
                if (success) status = 'pending-sent';
                break;
            case 'pending-sent':
                success = await cancelFriendRequest(targetAlias);
                if (success) status = 'none';
                break;
            case 'pending-received':
                success = await acceptFriendRequest(targetAlias);
                if (success) status = 'friends';
                break;
            case 'friends':
                success = await removeFriend(targetAlias);
                if (success) status = 'none';
                break;
        }

        updateFriendButton(btn, status);
        btn.classList.remove('opacity-50', 'pointer-events-none');
    };
}

// ============ Profile Data Functions ============

function getAliasFromUrl(): string | null {
    const params = new URLSearchParams(window.location.search);
    return params.get('alias');
}

async function fetchProfileData(alias: string): Promise<ProfileData | null> {
    try {
        const response = await fetch(`/api/user/profile/${encodeURIComponent(alias)}`);
        if (!response.ok) {
            console.error('[PROFILE] Failed to fetch profile:', response.status);
            return null;
        }
        return await response.json();
    } catch (error) {
        console.error('[PROFILE] Error fetching profile:', error);
        return null;
    }
}

function formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

function formatRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins}m`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Il y a ${diffHours}h`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `Il y a ${diffDays}j`;

    return formatDate(timestamp);
}

function getPositionBadge(position: number): string {
    switch (position) {
        case 1: return '<span class="text-yellow-500 font-bold">🥇 1er</span>';
        case 2: return '<span class="text-gray-400 font-bold">🥈 2ème</span>';
        case 3: return '<span class="text-amber-600 font-bold">🥉 3ème</span>';
        default: return `<span class="text-gray-600">${position}ème</span>`;
    }
}

function renderMatchHistory(matches: MatchHistoryEntry[]): void {
    const container = getEl('match-history-list');

    if (matches.length === 0) {
        container.innerHTML = `<p class="text-gray-400 text-center py-8 font-quency">Aucun match joué</p>`;
        return;
    }

    container.innerHTML = matches.map(match => {
        const isWin = match.result === 'win';
        const isBR = match.game_type === 'battle_royale';
        const bgColor = isWin ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';
        const resultText = isWin ? 'Victoire' : 'Défaite';
        const resultColor = isWin ? 'text-green-600' : 'text-red-600';
        const totalPlayers = match.player_count + (match.bot_count || 0);

        let gameTypeLabel = '';
        if (isBR)
            gameTypeLabel = `<span class="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">Battle Royale (${totalPlayers})</span>`;
        else if (match.tournament_id)
            gameTypeLabel = '<span class="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Tournoi</span>';
        else
            gameTypeLabel = '<span class="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">Quickmatch</span>';

        let scoreDisplay = '';
        if (isBR) {
            const hasBots = match.bot_count && match.bot_count > 0;
            if (hasBots)
                scoreDisplay = `${match.position}/${match.player_count} joueurs • ${match.position_with_bots}/${totalPlayers} total`;
            else
                scoreDisplay = `Position: ${match.position}/${match.player_count}`;
        } else {
            scoreDisplay = `${match.score_for} - ${match.score_against}`;
        }

        const botSuffix = (match.bot_count && match.bot_count > 0) ? ` et ${match.bot_count} Bot${match.bot_count > 1 ? 's' : ''}` : '';

        return `
            <div class="flex items-center justify-between p-4 rounded-lg border ${bgColor}">
                <div class="flex items-center gap-4">
                    <div class="w-10 h-10 ${isWin ? 'bg-green-500' : 'bg-red-500'} rounded-full flex items-center justify-center">
                        <span class="text-white font-bold">${isWin ? '✓' : '✗'}</span>
                    </div>
                    <div>
                        <p class="font-quency font-bold text-sonpi16-black">vs ${match.opponent_info}${botSuffix}</p>
                        <div class="flex items-center gap-2">
                            ${gameTypeLabel}
                            <span class="text-xs text-gray-500">${formatRelativeTime(match.created_at)}</span>
                        </div>
                    </div>
                </div>
                <div class="text-right">
                    <p class="font-bold ${resultColor}">${resultText}</p>
                    <p class="text-sm text-gray-600">${scoreDisplay}</p>
                </div>
            </div>
        `;
    }).join('');
}

function renderTournamentResults(results: TournamentResultEntry[]): void {
    const container = getEl('tournament-results-list');

    if (results.length === 0) {
        container.innerHTML = `<p class="text-gray-400 text-center py-8 font-quency">Aucun tournoi joué</p>`;
        return;
    }

    container.innerHTML = results.map((result, index) => {
        const isChampion = result.position === 1;
        const bgColor = isChampion ? 'bg-yellow-50 border-yellow-300' : 'bg-gray-50 border-gray-200';
        const matchesHtml = result.matches && result.matches.length > 0
            ? result.matches.map(m => {
                const isWinnerA = m.score_a > m.score_b;
                return `
                    <div class="flex justify-between items-center py-2 px-3 bg-white rounded border">
                        <span class="font-quency ${isWinnerA ? 'font-bold text-green-600' : 'text-gray-600'}">${m.alias_a}</span>
                        <span class="text-sm font-bold">${m.score_a} - ${m.score_b}</span>
                        <span class="font-quency ${!isWinnerA ? 'font-bold text-green-600' : 'text-gray-600'}">${m.alias_b}</span>
                    </div>
                `;
            }).join('')
            : '<p class="text-gray-400 text-sm py-2">Aucun match enregistré</p>';

        return `
            <div class="rounded-lg border ${bgColor} overflow-hidden">
                <div class="flex items-center justify-between p-4 cursor-pointer hover:bg-opacity-80 transition-all"
                     onclick="document.getElementById('tournament-matches-${index}').classList.toggle('hidden'); this.querySelector('.chevron').classList.toggle('rotate-180');">
                    <div class="flex items-center gap-4">
                        <div class="w-12 h-12 bg-sonpi16-orange rounded-full flex items-center justify-center">
                            <span class="text-white font-bold text-lg">${isChampion ? '🏆' : result.position}</span>
                        </div>
                        <div>
                            <p class="font-quency font-bold text-sonpi16-black">${result.tournament_name}</p>
                            <p class="text-sm text-gray-600">${result.matches_won}V - ${result.matches_lost}D</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-3">
                        <div class="text-right">
                            ${getPositionBadge(result.position)}
                            <p class="text-xs text-gray-500">${formatRelativeTime(result.created_at)}</p>
                        </div>
                        <svg class="chevron w-5 h-5 text-gray-400 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                        </svg>
                    </div>
                </div>
                <div id="tournament-matches-${index}" class="hidden border-t px-4 py-3 space-y-2 bg-gray-50">
                    <p class="text-xs text-gray-500 font-bold mb-2">Matchs du tournoi:</p>
                    ${matchesHtml}
                </div>
            </div>
        `;
    }).join('');
}

function updateProfileUI(data: ProfileData, isOwnProfile: boolean): void {
    const usernameEl = getEl('username');
    const userInitialEl = getEl('userInitial');
    const joinDateEl = getEl('join-date');
    const totalGamesEl = getEl('total-games');
    const winsEl = getEl('wins');
    const lossesEl = getEl('losses');
    const winRateEl = getEl('win-rate');
    const tournamentsPlayedEl = getEl('tournaments-played');
    const tournamentsWonEl = getEl('tournaments-won');
    const avatarImg = getEl('userAvatar') as HTMLImageElement;

    usernameEl.innerText = data.alias;
    userInitialEl.innerText = data.alias.charAt(0).toUpperCase();
    joinDateEl.innerText = formatDate(data.createdAt);

    totalGamesEl.innerText = data.stats.totalGames.toString();
    winsEl.innerText = data.stats.wins.toString();
    lossesEl.innerText = data.stats.losses.toString();
    winRateEl.innerText = `${data.stats.winRate}%`;
    tournamentsPlayedEl.innerText = data.stats.tournamentsPlayed.toString();
    tournamentsWonEl.innerText = data.stats.tournamentsWon.toString();

    avatarImg.onerror = () => {
        console.warn('[PROFILE] Failed to load avatar (likely rate limited), using default');
        avatarImg.src = '/avatars/defaults/Transcendaire.png';
        avatarImg.onerror = null;
    };

    avatarImg.src = data.avatar || '/avatars/defaults/Transcendaire.png';
    avatarImg.classList.remove('hidden');
    userInitialEl.classList.add('hidden');

    if (isOwnProfile) {
        const avatarOverlay = getEl('avatar-edit-overlay');
        const editAliasBtn = getEl('editAliasBtn');
        avatarOverlay.classList.remove('hidden');
        editAliasBtn.classList.remove('hidden');
        const hasCustomAvatar = !!data.avatar && !data.avatar.includes('/avatars/defaults/');
        updateDeleteButtonVisibility(hasCustomAvatar);
    }

    renderMatchHistory(data.matchHistory);
    renderTournamentResults(data.tournamentResults);
}

/**
 * @brief Connect to WebSocket to appear online to friends
 * @param alias Player's alias to register
 */
async function connectWebSocketForStatus(alias: string): Promise<void>
{
	if (!alias)
		return
	try
	{
		await wsClient.connect(getWebSocketUrl())
		wsClient.registerPlayer(alias)
		console.log(`[PROFILE] WebSocket connected for status: ${alias}`)
	}
	catch (error)
	{
		console.log('[PROFILE] Failed to connect WebSocket for status:', error)
	}
}

/**
 * @brief Search for a player by alias and navigate to their profile
 */
async function searchPlayer(): Promise<void>
{
	const input = getEl('search-player-input') as HTMLInputElement
	const errorEl = getEl('search-player-error')
	const searchAlias = input.value.trim()

	hide(errorEl)
	if (!searchAlias)
	{
		errorEl.innerText = 'Veuillez entrer un nom de joueur'
		show(errorEl)
		return
	}
	const profile = await fetchProfileData(searchAlias)

	if (!profile)
	{
		errorEl.innerText = `Joueur "${searchAlias}" introuvable`
		show(errorEl)
		return
	}
	navigate('profile', searchAlias)
}

function setupSearchPlayer(): void {
    const input = getEl('search-player-input') as HTMLInputElement;
    const btn = getEl('search-player-btn');

    btn.addEventListener('click', searchPlayer);
    input.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Enter') searchPlayer();
    });
}

async function updateAlias(newAlias: string) {
    const response = await fetch('/api/user/alias', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newAlias })
    });

    const data = await response.json();

    if (!response.ok)
        throw new Error(data.message || 'Erreur lors du changement de l\'alias');

    window.location.reload();

    return { success: true, message: data.message, alias: newAlias };
}
async function updatePassword(currentPassword: string, newPassword: string) {
    const response = await fetch('/api/user/password', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
    });

    const data = await response.json();

    if (!response.ok)
        throw new Error(data.message || 'Erreur lors du changement de mot de passe');

    return { success: true };
}

registerPageInitializer('profile', initProfilePage)

