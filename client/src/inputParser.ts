

function showError(message: string): void
{
    alert(message);
}

export class inputParserClass {

	public parseTournament(tournamentName: string, nbPlayers: number ) {
	
		if (!tournamentName) {
			showError("Veuillez entrer un nom de tournoi")
			return false;
		}
	
		else if (tournamentName.length < 3)	{
			showError("Le nom de tournoi doit comporter au moins 3 caractères");
			return false;
		}
	
		else if (!/^[a-zA-Z0-9_-]+$/.test(tournamentName)) {
			showError("Au moins un caractère invalide dans le nom de tournoi");
			return false;
		}
	
		if (nbPlayers % 2) {
			showError("Le tournoi doit comporter un nombre pair de joueurs");
			return false;
		}

		if (nbPlayers < 2 || nbPlayers > 64) {
			showError("Le tournoi doit comporter entre 2 et 64 joueurs");
			return false;
		}
		return true;
	}

	public parsePlayerName(name: string): boolean {

		if (!name)
		{
			showError("Veuillez entrer votre nom")
			return false;
		}
		else if (name.length < 3)
		{
			showError("Le nom doit comporter au moins 3 caractères");
			return false;
		}
		else if (!/^[a-zA-Z0-9_-]+$/.test(name))
		{
			showError("Au moins un caractère invalide dans le nom");
			return false;
		}
		return true;
	}

	public parseTournamentWithHTTPResponse(tournament: any | undefined, res: any): void
    {
        if (!tournament || tournament === undefined)
		{
            res.code(404).send({ error: 'Tournoi introuvable' });
            return;
        }

		const status = tournament.getStatus();
        if (status === 'running')
		{
            res.code(409).send({ error: 'Le tournoi a déjà commencé' });
            return;
        }

        if (status === 'finished')
		{
            res.code(409).send({ error: 'Le tournoi est terminé' });
            return;
        }

        const currentPlayers = tournament.getPlayerCount();
        const maxPlayers = tournament.maxPlayers;
        
        if (tournament.getPlayerCount() === tournament.maxPlayers)
		{
            res.code(409).send({ error: 'Le tournoi est complet' });
            return;
        }
    }

	public parsePlayerNameWithHTTPResponse(playerName: string, res: any): void
	{
		if (!playerName || playerName === undefined)
			return res.code(400).send({ error: 'Nom du joueur requis' });
    	if (playerName.trim().length < 3)
    	  return res.code(400).send({ error: 'Le nom doit faire au moins 3 caractères' });
    	if (!/^[a-zA-Z0-9_-]+$/.test(playerName))
    	  return res.code(400).send({ error: 'Au moins un caractère invalide dans le nom du joueur'});
	}

	
};