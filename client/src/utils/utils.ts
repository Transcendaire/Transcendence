import { sanitizeInput as sharedSanitizeInput } from '@shared/sanitize'

export function escapeHtml(text: string): string
{
	const div = document.createElement('div')
	div.textContent = text
	return div.innerHTML
}

/**
 * @brief Get status styling classes based on player status
 */
export function getStatusStyling(status: string): { color: string; text: string; textColor: string }
{
	switch (status)
	{
		case 'online':
			return { color: 'bg-green-500', text: 'En ligne', textColor: 'text-green-400' }
		case 'in-game':
			return { color: 'bg-sonpi16-gold', text: 'En jeu', textColor: 'text-sonpi16-gold' }

		default:
			return { color: 'bg-gray-500', text: 'Hors ligne', textColor: 'text-gray-400' }
	}
}

export const sanitizeInput = sharedSanitizeInput
