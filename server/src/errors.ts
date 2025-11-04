export class ServerError extends Error 
{
	constructor(message: string)
	{
		super(message);
		this.name = 'ServerError';
	}
}

export class DatabaseError extends Error 
{
	constructor(message: string)
	{
		super(message);
		this.name = 'DatabaseError';
	}
}

export class UserError extends Error
{
	constructor(message: string)
	{
		super(message);
		this.name = ('UserError');
	}
}

export class TournamentError extends Error
{
	constructor(message: string)
	{
		super(message);
		this.name = ('TournamentError');
	}
}

export class BracketError extends Error
{
	constructor(message: string)
	{
		super(message);
		this.name = ('BracketError');
	}
}


