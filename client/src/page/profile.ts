import { registerPageInitializer, navigate } from "../router";
import { getEl, show, hide } from "../app";
import { playerName } from "./home";
import { inputParserClass } from "../components/inputParser";

const inputParser = new inputParserClass();


function initprofilepage() 
{
    getEl("backHome").addEventListener('click', () => navigate('home'));

    loadUserProfile();
	initAvatarEdit();
    initAliasEdit();
}

async function loadUserProfile()
{
	try {
		const response = await fetch('/api/auth/me', {
			credentials: 'include'
		});
		if (!response.ok)
		{
			navigate('home');
			return ;
		}
			
		const user = await response.json();
			
		getEl("username").innerText = user.alias;
			
		await loadAvatar(); 
		} catch (error) {
			console.error("[PROFILE] Erreur lors du chargement du profil: ", error);
			showToast('Erreur lors du chargement du profil', 'error');
		}
}

async function loadAvatar()
{
    try {
        const response = await fetch('/api/user/avatar', {
            credentials: 'include'
        });

        if (!response.ok)
		{
			showInitials();
            return;
        }

        const data = await response.json();
        const avatarImg = getEl('userAvatar') as HTMLImageElement;
        const userInitial = getEl('userInitial');

        avatarImg.src = data.avatar;
        avatarImg.classList.remove('hidden');
        userInitial.classList.add('hidden');

        avatarImg.onerror = () => {
			console.error('[PROFILE] Avatar image failed to load:', data.avatar);
            showInitials();
        };
    } catch (error) {
        console.error('[PROFILE] Error loading avatar:', error);
        showInitials();
    }
}

function initAvatarEdit()
{
    const editBtn = getEl('editAvatarBtn');
    const deleteBtn = getEl('deleteAvatarBtn');
    const fileInput = getEl('avatarFileInput') as HTMLInputElement;
    const deleteModal = getEl('deleteAvatarModal');
    const confirmDeleteBtn = getEl('confirmDeleteAvatar');
    const cancelDeleteBtn = getEl('cancelDeleteAvatar');

    editBtn.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', async (e) => {
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];
        
        if (!file)
			return ;

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

    deleteBtn.addEventListener('click', () => {
        show(deleteModal);
    });

    confirmDeleteBtn.addEventListener('click', async () => {
        hide(deleteModal);
        await deleteAvatar();
    });

    cancelDeleteBtn.addEventListener('click', () => {
        hide(deleteModal);
    });

    deleteModal.addEventListener('click', (e) => {
        if (e.target === deleteModal) {
            hide(deleteModal);
        }
    });
}

function showInitials()
{
    const avatarImg = getEl('userAvatar') as HTMLImageElement;
    const userInitial = getEl('userInitial');
    const username = getEl('username').innerText;

    avatarImg.classList.add('hidden');
    userInitial.classList.remove('hidden');
    userInitial.innerText = username.charAt(0).toUpperCase();
}

async function uploadAvatar(file: File)
{
    try {
		console.log('[PROFILE] Starting upload...');
        const formData = new FormData();
        formData.append('file', file);

		console.log('[PROFILE] FormData created, sending request...');

        const response = await fetch('/api/user/avatar', {
            method: 'POST',
            credentials: 'include',
            body: formData
        });

		console.log('[PROFILE] Response status:', response.status);

        const data = await response.json();

		console.log('[PROFILE] Response data:', data);

        if (!response.ok) {
            throw new Error(data.message || 'Erreur lors de l\'upload');
        }

        showToast('Avatar mis à jour avec succès', 'success');
        await loadAvatar();
    } catch (error) {
        console.error('[PROFILE] Error uploading avatar:', error);
        showToast(error instanceof Error ? error.message : 'Erreur lors de l\'upload', 'error');
    }
}

async function deleteAvatar()
{
    try {
        const response = await fetch('/api/user/avatar', {
            method: 'DELETE',
            credentials: 'include'
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Erreur lors de la suppression');
        }

        showToast('Avatar supprimé, avatar par défaut restauré', 'success');
        await loadAvatar();
    } catch (error) {
        console.error('[PROFILE] Error deleting avatar:', error);
        showToast(error instanceof Error ? error.message : 'Erreur lors de la suppression', 'error');
    }
}

function showToast(message: string, type: 'success' | 'error') 
{
    const existingToast = document.getElementById('toast');
    if (existingToast)
        existingToast.remove();

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


function initAliasEdit()
{

}

registerPageInitializer('profile', initprofilepage)


async function updateAlias(newAlias: string)
{
	const response = await fetch('/api/user/alias', {
		method: 'PUT',
		credentials: 'same-origin',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ newAlias })
	});

	const data = await response.json();

	if (!response.ok)
		throw new Error(data.message || 'Erreur lors du changement de l\'alias');

	return { success: true, message: data.message, alias: newAlias };
}

//*current password est le mot de passe récupéré via le formulaire sur le profil, pas celui de la base de données
async function updatePassword(currentPassword: string, newPassword: string)
{
	const response = await fetch('/api/user/password', {
		method: 'PUT',
		credentials: 'same-origin',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ currentPassword, newPassword })
	});

	const data = await response.json();

	if (!response.ok)
		throw new Error(data.message || 'Erreur lors du changement de mot de passe');

	return ({ success: true });
}


