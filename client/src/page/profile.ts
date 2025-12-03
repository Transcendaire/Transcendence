import { registerPageInitializer, navigate } from "../router";
import { getEl } from "../app";
import { playerName } from "./home";

function initprofilepage() {
    getEl("backHome").addEventListener('click',  () => navigate('home'));
    const username = getEl("username");

    username.innerText = playerName;
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


