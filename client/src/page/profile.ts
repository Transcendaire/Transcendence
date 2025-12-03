import { registerPageInitializer, navigate } from "../router";
import { getEl } from "../app";
import { playerName } from "./home";
import { inputParserClass } from "../components/inputParser";

const inputParser = new inputParserClass();


function initprofilepage() 
{
    getEl("backHome").addEventListener('click', () => navigate('home'));

    loadUserProfile();
    initAliasEdit();
}

async function loadUserProfile() {
    const response = await fetch('/api/auth/me', {
        credentials: 'include'
    });

    if (!response.ok) return;

    const user = await response.json();

    getEl("username").innerText = user.alias;
}

function initAliasEdit()
{

}

registerPageInitializer('profile', initprofilepage)