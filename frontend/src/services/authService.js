import api from './api'

export const login = (email, password) =>
  api.post('/auth/login', { email, password })

export const register = ({ email, password, role, fullName, phoneNumber, organization }) =>
  api.post('/auth/register', {
    email,
    password,
    role,
    full_name: fullName || null,
    phone_number: phoneNumber || null,
    organization: organization || null,
  })