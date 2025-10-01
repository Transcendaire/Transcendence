// import { showError } from "./main.js"

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

		if (nbPlayers < 0 || nbPlayers > 64) {
			showError("Le tournoi doit comporter entre 0 et 64 joueurs");
			return false;
		}
		return true;
	}

	public parsePlayerName(name: string): boolean {

		if (!name) //? simple check here but need to parse the input just like user creation?
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
};