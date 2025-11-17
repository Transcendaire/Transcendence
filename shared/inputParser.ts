import { UserError, TournamentError, errTournament } from "./errors"

function showError(message: string): void
{
    alert(message);
}

export class inputParserClass {

	public parseTournamentAtCreation(tournamentName: string, maxPlayers: number)
	{
		if (!tournamentName)
			throw new TournamentError("Veuillez entrer un nom de tournoi")
	
		else if (tournamentName.length < 3)
			throw new TournamentError("Le nom de tournoi doit comporter au moins 3 caractères");
	
		else if (!/^[a-zA-Z0-9_-]+$/.test(tournamentName))
			throw new TournamentError("Au moins un caractère invalide dans le nom de tournoi");
		
	}

	public parseTournamentAtJoin(tournament: any | undefined): void
    {
		if (tournament === undefined || !tournament)
			throw new TournamentError('Le tournoi n\'existe pas', errTournament.NOT_EXISTING)

		const name = tournament.name;
		const status = tournament.getStatus();
        if (status === 'running')
			throw new TournamentError(`Le tournoi ${name} a déjà commencé`, errTournament.ALREADY_STARTED)

        if (status === 'finished')
			throw new TournamentError(`Le tournoi ${name} est terminé`, errTournament.ALREADY_OVER)

        const currentPlayers = tournament.getPlayerCount();
        const maxPlayers = tournament.maxPlayers;
        
        if (tournament.getPlayerCount() === tournament.maxPlayers)
            throw new TournamentError(`Le tournoi ${name} est complet`, errTournament.TOURNAMENT_FULL)
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