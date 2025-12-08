import { sanitizeInput as sharedSanitizeInput, validateAlias as sharedValidateAlias, validateLobbyName as sharedValidateLobbyName } from '@app/shared/sanitize'

export const sanitizeInput = sharedSanitizeInput
export const validateAlias = sharedValidateAlias
export const validateLobbyName = sharedValidateLobbyName

export function escapeHtml(text: string): string
{
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;')
}
