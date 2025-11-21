import { FastifyInstance } from "fastify"
import { BadRequest, ServerError, DatabaseError, UserError, TournamentError, BracketError } from "@app/shared/errors.js"

export async function registerErrorRoutes(server: FastifyInstance) //*redundant but readable
{
	server.setErrorHandler((error, req, res) => {
		if (error instanceof BadRequest)
		{
			return res.code(error.status).send({
				error: error.message,
				status: error.status
			})

		}

		if (error instanceof ServerError)
		{
			return res.code(error.statusCode).send({
				error: error.message, 
				status: error.statusCode
			})
		}

		if (error instanceof DatabaseError)
		{
			return res.code(error.statusCode).send({
				error: error.message, 
				status: error.statusCode
			})
		}
		if (error instanceof UserError)
		{
			return res.code(error.statusCode).send({
				error: error.message, 
				status: error.statusCode
			})
		}

		if (error instanceof TournamentError)
		{
			return res.code(error.statusCode).send({
				error: error.message, 
				status: error.statusCode
			})
		}

		if (error instanceof BracketError)
		{
			return res.code(error.statusCode).send({
				error: error.message, 
				status: error.statusCode
			})
		}

		return res.code(500).send({
			error: 'Erreur interne',
			status: 500
		});
	})

}