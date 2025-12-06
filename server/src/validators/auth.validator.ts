import { BadRequest, UserError, errClient } from "@app/shared/errors.js"
import { getDatabase } from "../db/databaseSingleton.js"
import { verifyPassword } from "../utils/passwords.js";

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).+$/;
const LOGIN_PATTERN = /^[a-zA-Z0-9_!@#$%&*=-]+$/;
const ALIAS_PATTERN = /^[a-zA-Z0-9_ -]+$/;




const db = getDatabase()

export function validateRegistering(requestBody: any) //*purely simple parsing (no duplicates check and so on)
{
	const {login, password, passwordValidation, alias } = requestBody;

	console.log(`[login] : ${login}\n
				[password] : ${password}\n
				[passwordValidation] : ${[passwordValidation]}\n
				[alias] : ${alias}`);

	if (typeof login !== 'string')
		throw new BadRequest('Veuillez entrer votre nom d\'utilisateur');
	if (login.length < 3)
		throw new BadRequest('Le nom d\'utilisateur doit être composé d\'au moins 3 caractères.')
	else if (login.length > 24)
		throw new BadRequest('Le nom d\'utilisateur ne doit pas faire plus de 24 caractères')
	if (!LOGIN_PATTERN.test(login))
		throw new BadRequest('Au moins un caractère invalide dans le nom d\'utilisateur')
	
	if (typeof alias !== 'string')
		throw new BadRequest('Veuillez entrer votre alias');
	if (alias.length < 3)
		throw new BadRequest('L\'alias doit être composé d\'au moins 3 caractères.')
	else if (alias.length > 24)
		throw new BadRequest('L\'alias ne doit pas faire plus de 24 caractères')
	if (!ALIAS_PATTERN.test(alias))
		throw new BadRequest('Au moins un caractère invalide dans l\'alias')
	if (login === alias)
		throw new BadRequest('Le nom d\'utilisateur et l\'alias doivent être différents')

	if (typeof password !== 'string')
		throw new BadRequest('Veuillez entrer un mot de passe');
	if (password.length < 6)
		throw new BadRequest('Le mot de passe doit être composé d\'au moins 6 caractères.')
	if (password.length > 32)
		throw new BadRequest('Le mot de passe doit être inférieur à 32 caractères')
	if (!PASSWORD_PATTERN.test(password))
		throw new BadRequest('Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial')

	if (password !== passwordValidation)
		throw new BadRequest('Les mots de passe sont différents');
}

export function checkForDuplicatesAtRegistering(login: string, alias: string)
{
	if (db.getUserByLogin(login))
		throw new UserError('Le nom d\'utilisateur choisi existe déjà', errClient.DUPLICATE_LOGIN, 409);

	if (db.getUserByAlias(alias))
		throw new UserError('L\'alias choisi existe déjà', errClient.DUPLICATE_NAME, 409);

}


export function validateLoggingIn(requestBody: any)
{
	const { login, password } = requestBody;
	
	console.log(`[login] : ${login}\n[password] : ${password}`);
	
	if (!login)
		throw new BadRequest('Veuillez entrer votre nom d\'utilisateur');
	
	if (!password)
		throw new BadRequest('Veuillez entrer votre mot de passe');

	const user = db.getUserByLogin(login);
	if (!user)
		throw new BadRequest('Nom d\'utilisateur et/ou mot de passe incorrect', 404);
	
	console.log(`Found user: login=${user.login}, alias=${user.alias}, id=${user.id}`);
	
	const hashedPassword = user.password;
	if (verifyPassword(password, hashedPassword!) === false)
		throw new BadRequest('Nom d\'utilisateur et/ou mot de passe incorrect', 404);
}

const EXPECTED_CLIENT_ID = "782178545544-31i17kv4fli13eqj7o0l4dclqnbb3hql.apps.googleusercontent.com";
export async function validateGoogleToken(credential: string | undefined)
{
	if (!credential)
		throw new BadRequest('Token manquant', 400);


	const googleResponse = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`
    );

    if (!googleResponse.ok)
    {
        console.error('[AUTH] ❌ Token rejeté par Google');
        throw new BadRequest('Token invalide', 401);
    }

    const payload = await googleResponse.json();
	console.log('[AUTH] Google payload picture:', payload.picture);
    console.log('[AUTH] ✅ Token vérifié');

    if (payload.aud !== EXPECTED_CLIENT_ID)
    {
        console.error('[AUTH] ❌ Token pas pour cette application');
        throw new BadRequest('Token invalide', 401);
    }

    if (!payload.email)
        throw new BadRequest('Email manquant', 400);

    const name = payload.name || payload.email.split('@')[0] || 'User';

    return { email: payload.email, name: name, picture: payload.picture };
}