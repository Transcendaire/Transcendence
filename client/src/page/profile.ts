import { registerPageInitializer, navigate } from "../router";
import { getEl } from "../app";
import { playerName } from "./home";

function initprofilepage() {
    getEl("backHome").addEventListener('click',  () => navigate('home'));
    const username = getEl("username");

    username.innerText = playerName;
}

registerPageInitializer('profile', initprofilepage)