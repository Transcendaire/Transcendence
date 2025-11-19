import { registerPageInitializer, navigate } from "../router.js";
import { getEl } from "../app.js";
import { isLoggedIn , playerName } from "./home.js";

function initprofilepage() {
    getEl("backHome").addEventListener('click',  () => navigate('home'));

    
}

registerPageInitializer('profile', initprofilepage)