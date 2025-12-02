import { BadRequest, UserError, errClient } from "@app/shared/errors.js"
import { getDatabase } from "../db/databaseSingleton.js"
import { verifyPassword } from "../utils/passwords.js";

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).+$/;
const ALIAS_PATTERN = /^[a-zA-Z0-9_-]+$/;
const db = getDatabase()

export function validateNewPassword(newPassword: string | undefined)
{
	if (!newPassword || newPassword === undefined)
        throw new BadRequest('Le nouveau mot de passe est requis');
    if (newPassword.length < 6)
        throw new BadRequest('Le nouveau mot de passe doit contenir au moins 6 caractères');
    if (newPassword.length > 20)
        throw new BadRequest('Le nouveau mot de passe ne peut pas dépasser 20 caractères');
    if (!PASSWORD_PATTERN.test(newPassword))
        throw new BadRequest('Le nouveau mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial');
}

export function validateCurrentPassword(currentPassword: string | undefined, hashedPassword: string)
{
    if (!currentPassword || currentPassword === undefined)
        throw new BadRequest('Le mot de passe actuel est requis');
    if (!verifyPassword(currentPassword, hashedPassword))
        throw new UserError('Mot de passe actuel incorrect', errClient.INVALID_CREDENTIALS);
}

export function validateNewAlias(newAlias: string | undefined, userId: string, userLogin: string): void {
    if (!newAlias || newAlias === undefined)
        throw new BadRequest('Le nouvel alias est requis');
    
    const trimmedAlias = newAlias.trim();
    if (trimmedAlias.length < 3)
        throw new BadRequest('Le nouvel alias doit contenir au moins 3 caractères');
    if (trimmedAlias.length > 16)
        throw new BadRequest('Le nouvel alias ne peut pas dépasser 16 caractères');

    if (!ALIAS_PATTERN.test(trimmedAlias))
        throw new BadRequest('Le nouvel alias ne peut contenir que des lettres, chiffres, tirets et underscores');

    if (trimmedAlias === userLogin)
        throw new BadRequest('Le nouvel alias ne peut pas être identique au login');
    
    const existingUser = db.getUserByAlias(trimmedAlias);
    if (existingUser && existingUser.id !== userId)
        throw new UserError('Cet alias est déjà utilisé', errClient.ALIAS_ALREADY_TAKEN, 409);
}