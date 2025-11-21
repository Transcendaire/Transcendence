// import { BadRequest } from "@app/shared/errors.js"

// function testValidity

// export function validateRegistering(requestBody: any) //*purely simple parsing (no duplicates check and so on)
// {
// 	const {login, password, passwordValidation, publicLogin } = requestBody;

// 	if (typeof login !== 'string')
// 		throw new BadRequest('Veuillez entrer votre login');
// 	if (login.length < 3)
// 		throw new BadRequest('Le login doit être composé d\'au moins 3 caractères.')
// 	else if (login.length > 32)
// 		throw new BadRequest('Le login ne doit pas faire plus de 32 caractères')
// 	if (!/^[a-zA-Z0-9_-]+$/.test(login))
// 	if (typeof password !== 'string' || password.length < 6)
// 	//*length, different, existing, 
// }