export class ServerError extends Error 
{
	constructor(message: string)
	{
		super(message);
		this.name = ''
	}
}

export class DatabaseError extends Error 
{
	constructor(message: string)
	{
		super(message);
		this.name = ''
	}
}

export class UserError extends Error
{
	constructor(message: string)
	{
		super(message);
	}
}

export class TournamentError extends Error
{
	constructor(message: string)
	{
		super(message);
		this.name = ''
	}
}

export class BracketError extends Error
{
	constructor(message: string)
	{
		super(message);
		this.name = ''
	}
}


