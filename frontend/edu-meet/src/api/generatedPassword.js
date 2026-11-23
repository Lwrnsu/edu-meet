export function passwordFromPersonalInfo(firstName, lastName) {
  const surname = String(lastName ?? '').trim().replace(/\s+/g, '')
  const given = String(firstName ?? '').trim().replace(/\s+/g, '')
  const password = surname + given.slice(0, 2)

  if (password.length < 6) {
    throw new Error(
      'The generated password is shorter than 6 characters. Enter a longer surname.'
    )
  }

  return password
}
