const EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/
const PHONE_RE = /^\+?[0-9\s\-().]{7,20}$/

export type ValidationError = { field: string; message: string }

export function validateEmail(email: unknown): string {
  if (typeof email !== 'string') throw { field: 'email', message: 'Email is required' }
  const v = email.trim().toLowerCase()
  if (!EMAIL_RE.test(v)) throw { field: 'email', message: 'Invalid email address' }
  if (v.length > 254) throw { field: 'email', message: 'Email too long' }
  return v
}

export function validatePassword(pw: unknown): string {
  if (typeof pw !== 'string') throw { field: 'password', message: 'Password is required' }
  if (pw.length < 8) throw { field: 'password', message: 'Password must be at least 8 characters' }
  if (pw.length > 128) throw { field: 'password', message: 'Password too long' }
  const hasUpper = /[A-Z]/.test(pw)
  const hasLower = /[a-z]/.test(pw)
  const hasDigit = /[0-9]/.test(pw)
  if (!hasUpper || !hasLower || !hasDigit) {
    throw { field: 'password', message: 'Password must contain uppercase, lowercase, and a number' }
  }
  return pw
}

export function validateName(name: unknown): string {
  if (typeof name !== 'string') throw { field: 'name', message: 'Name is required' }
  const v = name.trim()
  if (v.length < 2) throw { field: 'name', message: 'Name must be at least 2 characters' }
  if (v.length > 100) throw { field: 'name', message: 'Name too long' }
  return v
}

export function validatePhone(phone: unknown): string | null {
  if (!phone || phone === '') return null
  if (typeof phone !== 'string') return null
  const v = phone.trim()
  if (!PHONE_RE.test(v)) throw { field: 'phone', message: 'Invalid phone number' }
  return v
}

export function validateAmount(amount: unknown, field = 'amount'): number {
  const n = Number(amount)
  if (!isFinite(n) || n <= 0) throw { field, message: 'Amount must be a positive number' }
  if (n > 1_000_000) throw { field, message: 'Amount exceeds maximum' }
  return Math.round(n * 100) / 100
}

export function sanitizeString(s: unknown, max = 255): string {
  if (typeof s !== 'string') return ''
  return s.trim().slice(0, max)
}

export function validateCountry(country: unknown): string {
  const VALID = ['GB','US','DE','FR','BE','NL','ES','IT','PT','IE','PL','SE','NO','CH',
    'NG','KE','GH','TZ','UG','ZA','SN','CI','BF','ML','GN','CM','XOF','XAF','MA','ET','ZM']
  if (typeof country !== 'string') return 'GB'
  const v = country.toUpperCase().trim()
  return VALID.includes(v) ? v : 'GB'
}

export function validateCurrency(currency: unknown): string {
  const VALID = ['EUR','GBP','USD','NGN','KES','GHS','TZS','UGX','ZAR','XOF','XAF','MAD','ETB','ZMW','CDF']
  if (typeof currency !== 'string') throw { field: 'currency', message: 'Invalid currency' }
  const v = currency.toUpperCase().trim()
  if (!VALID.includes(v)) throw { field: 'currency', message: 'Unsupported currency' }
  return v
}
