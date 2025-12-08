import { registerPageInitializer } from '../router'

function init404(): void
{
	document.body.classList.remove('bg-sonpi16-orange')
	document.body.classList.add('bg-sonpi16-blue')
	document.body.style.display = 'flex'
	document.body.style.alignItems = 'center'
	document.body.style.justifyContent = 'center'
}

registerPageInitializer('404', init404)
