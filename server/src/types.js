"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// | { type: "createTournament"; name: string, maxPlayers: number }
// | { type: "joinTournament"; tournamentId: string, player: string}
// | { type: "tournamentUpdate"; tournament: Tournament}
// | { type: "endTournament"; name:string }
//? not necessary anymore?
//*RANDOM
/*
-> NV WEBSOCKET POUR LES TOURNOIS
-> /tournament as endpoint
-> one client creates a tournamnt and is the admin (starting, ending...)
-> server sends available tournament when joining /tournament. Client can join/create tournament
-> formulaire de creation d'un tournoi a la creation (nb joueurs, nom tournoi...).
    temps d'attente ensuite et fill par ia si pas assez de joueurs sinon lancer game
-> servir les tournois/game room dispo dans /tournament.
-> possibilite de spectatecg
-> using w3ebclass as base class for websockettournament and modify handleMessage
-> websocket is served because the client is sent to it according to its actions on a given button
*/ 
