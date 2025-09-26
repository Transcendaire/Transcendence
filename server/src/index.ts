import fastify, { HookHandlerDoneFunction } from 'fastify'
import { FastifyRequest, FastifyReply, preValidationHookHandler } from 'fastify';

const server = fastify()

//!							NOT USEFUL FOR NOW

/*
BY using hooks, we can intercept a request before they reach route handlers and 
modify the request body by adding a new property
There are global and route-level hooks (like in this file)
Pre validation can be used to check permissions, enforce constraints, short-circuit invalid request
and so on (before they even reach the handler)
*/
interface IQuerystring {
	username: string;
	password: string;
  }
  
  interface IHeaders {
	'h-Custom': string;
  }
  
  interface IReply {
	200: { success: boolean };
	302: { url: string };
	'4xx': { error: string };
  }

server.get('/ping', async (request, reply) => {
  return 'pong\n'
})



//* server.get(path, options object, handler)
server.get<{
	Querystring: IQuerystring,
	Headers: IHeaders,
	Reply: IReply
}>('/auth', {
preValidation: (request, reply, done) => {
	const {username, password } = request.query
	done (username !== 'admin' ? new Error("Must be admin") : undefined)
}
},
async (request, reply) =>
{
	console.log('hello from handler function')
	const { username, password } = request.query
	if (username === undefined || password === undefined)
			reply.code(400).send({error: "No credentials"})
	const customerHeader = request.headers['h-Customs']
	console.log(username, password)
	console.log(customerHeader)

	reply.code(200).send({ success: true })
	reply.code(404).send({ error: "Not found" });
	return { success: true }
})

server.listen({ port: 8080 }, (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
}
console.log(`Server listening at ${address}`)
})


/*
function preValidation(request: FastifyRequest<AuthRoute>,
	 reply: FastifyReply,
	 done: HookHandlerDoneFunction) {
	const {username, password} = request.query
	if (username !== 'admin')
			done(new Error('Must be admin'))
	else
		done()
}

server.get<{
	Querystring: IQuerystring,
	Headers: IHeaders,
	Reply: IReply
}>('/auth', { preValidation }, async (request, reply) => {
	const { username, password } = request.query
	if (username === undefined || password === undefined)
			reply.code(400).send({error: "No credentials"})
	const customerHeader = request.headers['h-Customs']
	console.log(username, password)
	console.log(customerHeader)

	reply.code(200).send({ success: true })
	reply.code(404).send({ error: "Not found" });
	return { success: true }
})
*/