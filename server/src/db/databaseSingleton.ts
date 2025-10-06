import { DatabaseService } from "./database.js"

let singleton: DatabaseService | null = null;

export function getDatabase(): DatabaseService {

	if (!singleton)
		singleton = new DatabaseService('transcendaire')
	return singleton;
}
