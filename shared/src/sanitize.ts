export function sanitizeInput(input: string): string
{
	return input.trim()
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;')
}

export function validateAlias(alias: string): boolean
{
	if (!alias || alias.length < 3 || alias.length > 20)
		return false
	return /^[a-zA-Z0-9À-ÿ_\-\s]+$/.test(alias)
}

export function validateLobbyName(name: string): boolean
{
	if (!name || name.length < 3 || name.length > 50)
		return false
	return /^[a-zA-Z0-9À-ÿ_\-\s]+$/.test(name)
}
