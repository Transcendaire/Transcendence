import { UserError, errClient } from '/dist/shared/errors'

export async function checkIfPlayerNameAlreadyTaken(playerName: string) //!rethink logic here? -> name of api is confusing
{
	const response = await fetch(`/api/players/check-playerNameAvailability?playerName=${playerName}`)
	const data = await response.json();
	
	if (!response.ok)
		throw new UserError(data.error || 'Impossible de vérifier si le nom existe déjà');
	if (data.taken === true)
		throw new UserError(`Le nom ${playerName} est déjà pris`, errClient.DUPLICATE_NAME);
}


export async function checkIfPlayerIsInAnotherTournament(playerName: string)
{
	const response = await fetch(`/api/players/${encodeURIComponent(playerName)}/tournament`);
	const data = await response.json();

	if (data.canConnect === false)
		throw new UserError('Le joueur est déjà présent dans un tournoi. Merci de le quitter avant de créer un nouveau tournoi', errClient.ALREADY_IN_TOURNAMENT);
}
