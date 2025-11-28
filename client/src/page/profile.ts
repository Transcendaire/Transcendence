import { registerPageInitializer, navigate } from "../router";
import { getEl } from "../app";
import { isLoggedIn , playerName } from "./home";

function initprofilepage() {
    getEl("backHome").addEventListener('click',  () => navigate('home'));

    
}

registerPageInitializer('profile', initprofilepage)