export class BadRequest extends Error
{
	status: number;
	constructor(message: string, status: number = 400)
	{
		super(message);
		this.name = '';
		this.status = status;
	}
}

export class ServerError extends Error 
{
	code: string | undefined;
	statusCode: number;
	constructor(message: string, code?: string, statusCode: number = 500)
	{
		super(message);
		this.name = '';
		this.statusCode = statusCode;
		this.code = code;
	}
}

export class DatabaseError extends Error 
{
	code: string | undefined;
	statusCode: number;
	constructor(message: string, code?: string, statusCode: number = 500)
	{
		super(message);
		this.name = '';
		this.statusCode = statusCode;
		this.code = code;
	}
}

export class UserError extends Error
{
	code: string | undefined;
	statusCode: number;
	constructor(message: string, code?: string, statusCode: number = 400)
	{
		super(message);
		this.name = '';
		this.statusCode = statusCode;
		this.code = code;
	}
}

export class TournamentError extends Error
{
	code: string | undefined;
	statusCode: number;
	constructor(message: string, code?: string, statusCode: number = 500)
	{
		super(message);
		this.name = '';
		this.statusCode = statusCode;
		this.code = code;
	}
}

export class BracketError extends Error
{
	code: string | undefined;
	statusCode: number;
	constructor(message: string, code?: string, statusCode: number = 500)
	{
		super(message);
		this.name = '';
		this.statusCode = statusCode;
		this.code = code;
	}
}


export enum errTournament {

	ALREADY_EXISTING = 'ALREADY_EXISTING',
	NOT_EXISTING = 'NOT_EXISTING',
	ALREADY_STARTED = 'ALREADY_STARTED',
	ALREADY_OVER = 'ALREADY_OVER',
	TOURNAMENT_FULL = 'TOURNAMENT_FULL'

};

export enum errClient {
	DUPLICATE_LOGIN = 'DUPLICATE_LOGIN',
	DUPLICATE_NAME = 'DUPLICATE_NAME',
	ALREADY_IN_TOURNAMENT = 'ALREADY_IN_TOURNAMENT',
	UNAUTHENTICATED_PLAYER = 'UNAUTHENTICATED_PLAYER',
	NONEXISTING_PLAYER = 'NONEXISTING_PLAYER',
	INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
	ALIAS_ALREADY_TAKEN = 'ALIAS_ALREADY_TAKEN'
};

export enum errDatabase {
	USERNAME_ALREADY_TAKEN = 'USERNAME_ALREADY_TAKEN',
	ALIAS_ALREADY_TAKEN = 'ALIAS_ALREADY_TAKEN',
	PLAYER_NOT_FOUND = 'PLAYER_NOT_FOUND'
}

//TODO adapts erros numbers for each thrown error