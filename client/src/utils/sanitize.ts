import { sanitizeInput as sharedSanitizeInput } from '@shared/sanitize'

export function escapeHtml(text: string): string
{
	const div = document.createElement('div')
	div.textContent = text
	return div.innerHTML
}

export const sanitizeInput = sharedSanitizeInput
