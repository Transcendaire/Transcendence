function showError(message) {
    alert(message);
}
export class inputParserClass {
    parseTournament(tournamentName, nbPlayers) {
        if (!tournamentName) {
            showError("Veuillez entrer un nom de tournoi");
            return false;
        }
        else if (tournamentName.length < 3) {
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
    parsePlayerName(name) {
        if (!name) {
            showError("Veuillez entrer votre nom");
            return false;
        }
        else if (name.length < 3) {
            showError("Le nom doit comporter au moins 3 caractères");
            return false;
        }
        else if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
            showError("Au moins un caractère invalide dans le nom");
            return false;
        }
        return true;
    }
    parseTournamentWithHTTPResponse(tournament, res) {
        if (!tournament || tournament === undefined)
            res.code(404).send({ error: "Le tournoi n'a pas été trouvé" });
        if (tournament.getStatus() !== 'waiting')
            res.code(409).send({ error: "Le tournoi n'accepte plus de joueurs" });
        if (tournament.getPlayerCount() === tournament.maxPlayers)
            res.code(409).send({ error: "Le tournoi est rempli" });
    }
}
;
//# sourceMappingURL=inputParser.js.map