import bcrypt from 'bcryptjs'

export function hashPassword(password: string): string
{
	const saltRounds = 10; //* cost factor for generating the salt. adds 2^rounds calculations (roughly) : bruteforcing a lot of passwords become harder
	const salt = bcrypt.genSaltSync(saltRounds); //*adds a random piece to the password before hashing it. 
	const hashedPassword  = bcrypt.hashSync(password, salt);
	return hashedPassword;
}

export function verifyPassword(plainPassword: string, hashedPassword: string): boolean
{
	return bcrypt.compareSync(plainPassword, hashedPassword);
}
