import { registerPageInitializer, navigate } from "../router";
import { getProfileUserId } from "../router";
import { getEl, show, hide } from "../app";

function initprofilepage() 
{
    getEl("backHome").addEventListener('click', () => navigate('home'));

    const usernameDiv = getEl("username");
    const userId = getProfileUserId();
}

async function loadUserProfile(usernameDiv : HTMLElement) {
    const response = await fetch('/api/auth/me', {
        credentials: 'include'
    });

    if (!response.ok) return;

    const user = await response.json();

    console.log(`username = ${user.alias}`);

    usernameDiv.innerText = user.alias;
}

function initAliasEdit(usernameDiv : HTMLElement)
{   
    const editAliasBtn = getEl("editAliasBtn") as HTMLButtonElement;
    const newAliasInput = getEl("aliasInput") as HTMLInputElement;

    const showEditInput = () =>{show(newAliasInput); hide(usernameDiv)}
    const hideEditInput = () =>{hide(newAliasInput); show(usernameDiv)} 

    editAliasBtn.addEventListener('click', showEditInput);
    newAliasInput.addEventListener('click', (e) => {
        if (e.target !== newAliasInput)
            hideEditInput;
    })

    newAliasInput.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === "Escape"){
            hide(newAliasInput);
            show(usernameDiv);
        }
        if (e.key === "Enter")
        {
            try{updateAlias(newAliasInput.value);} 
            catch {alert()}
        }
    })
}

async function updateAlias(newAlias: string)
{
    const response = await fetch('/api/user/alias', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alias: newAlias })
    });

    const data = await response.json();

    if (!response.ok)
        throw new Error(data.message || 'Erreur lors du changement de l\'alias');

    window.location.reload();

    return { success: true, message: data.message, alias: newAlias };
}
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

registerPageInitializer('profile', initprofilepage)

