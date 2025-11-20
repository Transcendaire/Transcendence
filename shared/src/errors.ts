export class ServerError extends Error 
{
	code: string | undefined;
	constructor(message: string, code?: string)
	{
		super(message);
		this.name = ''
		this.code = code;
	}
}

export class DatabaseError extends Error 
{
	code: string | undefined;
	constructor(message: string, code?: string)
	{
		super(message);
		this.name = ''
		this.code = code;
	}
}

export class UserError extends Error
{
	code: string | undefined;
	constructor(message: string, code?: string)
	{
		super(message);
		this.name = '';
		this.code = code;
	}
}

export class TournamentError extends Error
{
	code: string | undefined;
	constructor(message: string, code?: string)
	{
		super(message);
		this.name = '';
		this.code = code;
	}
}

export class BracketError extends Error
{
	code: string | undefined;
	constructor(message: string, code?: string)
	{
		super(message);
		this.name = ''
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
	DUPLICATE_NAME = 'DUPLICATE_NAME',
	ALREADY_IN_TOURNAMENT = 'ALREADY_IN_TOURNAMENT',
	UNAUTHENTICATED_PLAYER = 'UNAUTHENTICATED_PLAYER',
	NONEXISTING_PLAYER = 'NONEXISTING_PLAYER'
};