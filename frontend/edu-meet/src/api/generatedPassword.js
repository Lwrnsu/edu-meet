export function passwordFromPersonalInfo(firstName, lastName) {
  const surname = String(lastName ?? '').trim().replace(/\s+/g, '')
  const given = String(firstName ?? '').trim().replace(/\s+/g, '')

  if (surname === '' || given === '') {
    throw new Error('First name and surname are required to generate a password.')
  }

  let password = surname + given.slice(0, 2)
  while (password.length < 8) {
    password += '0'
  }

  return password
}
