import { UserError } from "../server/src/errors";

function showError(message: string): void
{
    alert(message);
}

export class inputParserClass {

	// public parseTournament(tournamentName: string, nbPlayers: number ) {
	
	// 	if (!tournamentName) {
	// 		showError("Veuillez entrer un nom de tournoi")
	// 		return false;
	// 	}
	
	// 	else if (tournamentName.length < 3)	{
	// 		showError("Le nom de tournoi doit comporter au moins 3 caractères");
	// 		return false;
	// 	}
	
	// 	else if (!/^[a-zA-Z0-9_-]+$/.test(tournamentName)) {
	// 		showError("Au moins un caractère invalide dans le nom de tournoi");
	// 		return false;
	// 	}
	
	// 	if (nbPlayers % 2) {
	// 		showError("Le tournoi doit comporter un nombre pair de joueurs");
	// 		return false;
	// 	}

	// 	if (nbPlayers < 2 || nbPlayers > 64) {
	// 		showError("Le tournoi doit comporter entre 2 et 64 joueurs");
	// 		return false;
	// 	}
	// 	return true;
	// }

	// public parsePlayerName(name: string): boolean {

	// 	if (!name)
	// 	{
	// 		showError("Veuillez entrer votre nom")
	// 		return false
	// 	}
	// 	else if (name.length < 3)
	// 	{
	// 		showError("Le nom doit comporter au moins 3 caractères");
	// 		throw new Error("Le nom doit comporter au moins 3 caractères")
	// 	}
	// 	else if (!/^[a-zA-Z0-9_-]+$/.test(name))
	// 	{
	// 		showError("Au moins un caractère invalide dans le nom");
	// 		return false;
	// 	}
	// 	return true;
	// }

	public parseTournamentAtCreation(tournamentName: string, maxPlayers: number)
	{
		if (!tournamentName)
			throw new Error("Veuillez entrer un nom de tournoi")
	
		else if (tournamentName.length < 3)
			throw new Error("Le nom de tournoi doit comporter au moins 3 caractères");
	
		else if (!/^[a-zA-Z0-9_-]+$/.test(tournamentName))
			throw new Error("Au moins un caractère invalide dans le nom de tournoi");
		
	}

	public parseTournamentAtJoin(tournament: any | undefined): void
    {

		const status = tournament.getStatus();
        if (status === 'running')
			throw new Error(`Le tournoi ${name} a déjà commencé`)

        if (status === 'finished')
			throw new Error(`Le tournoi ${name} est terminé`)

        const currentPlayers = tournament.getPlayerCount();
        const maxPlayers = tournament.maxPlayers;
        
        if (tournament.getPlayerCount() === tournament.maxPlayers)
            throw new Error(`Le tournoi ${name} est complet`)
    }

	public parsePlayerName(playerName: string): void
	{
		if (!playerName || playerName === undefined)
			throw new UserError('Nom du joueur requis');
    	if (playerName.trim().length < 3)
			throw new UserError('Le nom doit faire au moins 3 caractères')
    	if (!/^[a-zA-Z0-9_-]+$/.test(playerName))
			throw new UserError('Au moins un caractère invalide dans le nom du joueur')
	}

	
};