import { Resend } from 'resend'

const API_KEY = process.env.RESEND_API_KEY
const FROM = process.env.FROM_EMAIL || 'RemitFlow <noreply@remitflow.app>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://remitflow.app'

// If no API key, log in dev and skip silently in prod
const resend = API_KEY ? new Resend(API_KEY) : null

async function send(to: string, subject: string, html: string): Promise<void> {
  if (!resend) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[email:dev] To: ${to}\nSubject: ${subject}`)
    }
    return
  }
  try {
    await resend.emails.send({ from: FROM, to, subject, html })
  } catch (err) {
    console.error('[email] send failed', err)
  }
}

// ─── Shared styles ─────────────────────────────────────────────────────────────

const BASE = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>RemitFlow</title>
</head>
<body style="margin:0;padding:0;background:#080706;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="min-height:100vh;background:#080706;">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="100%" style="max-width:520px;">
`

const BASE_CLOSE = `
      </table>
    </td></tr>
  </table>
</body>
</html>`

function logo() {
  return `
    <tr><td style="padding-bottom:28px;">
      <div style="display:inline-flex;align-items:center;gap:10px;">
        <div style="width:36px;height:36px;background:#1326FD;border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:16px;color:#fff;font-family:monospace;">RF</div>
        <span style="font-size:18px;font-weight:700;color:#fff;letter-spacing:-0.3px;">RemitFlow</span>
      </div>
    </td></tr>`
}

function card(content: string) {
  return `
    <tr><td style="background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.09);border-radius:20px;padding:28px 24px;">
      ${content}
    </td></tr>`
}

function btn(href: string, label: string, danger = false) {
  const bg = danger ? '#C0392B' : '#1326FD'
  return `<a href="${href}" style="display:inline-block;padding:13px 28px;background:${bg};color:#fff;font-weight:600;font-size:14px;border-radius:12px;text-decoration:none;margin-top:20px;">${label}</a>`
}

function footer() {
  return `
    <tr><td style="padding-top:24px;text-align:center;">
      <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.3);">
        You're receiving this because it's required for account security.<br/>
        RemitFlow · <a href="${APP_URL}" style="color:rgba(255,255,255,0.4);">remitflow.app</a>
      </p>
    </td></tr>`
}

function row(label: string, value: string) {
  return `
    <tr>
      <td style="padding:7px 0;font-size:13px;color:rgba(255,255,255,0.45);width:45%;">${label}</td>
      <td style="padding:7px 0;font-size:13px;color:#fff;font-weight:500;text-align:right;">${value}</td>
    </tr>`
}

function divider() {
  return `<tr><td colspan="2" style="border-bottom:1px solid rgba(255,255,255,0.07);padding:0;"></td></tr>`
}

function parseUA(ua: string) {
  const os = /Windows/i.test(ua) ? 'Windows'
    : /Mac OS X/i.test(ua) ? 'macOS'
    : /Linux/i.test(ua) ? 'Linux'
    : /Android/i.test(ua) ? 'Android'
    : /iPhone|iPad/i.test(ua) ? 'iOS'
    : 'Unknown OS'
  const browser = /Edg\//i.test(ua) ? 'Edge'
    : /OPR\//i.test(ua) ? 'Opera'
    : /Firefox\//i.test(ua) ? 'Firefox'
    : /Chrome\//i.test(ua) ? 'Chrome'
    : /Safari\//i.test(ua) ? 'Safari'
    : 'Browser'
  return `${browser} on ${os}`
}

// ─── Email: new device login ───────────────────────────────────────────────────

export async function sendNewDeviceAlert(opts: {
  to: string
  name: string
  ip: string
  userAgent: string
  loginAt: Date
}) {
  const { to, name, ip, userAgent, loginAt } = opts
  const device = parseUA(userAgent)
  const time = loginAt.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short',
  })

  const html = BASE + logo() + card(`
    <h1 style="margin:0 0 6px;font-size:20px;font-weight:700;color:#fff;">New sign-in detected</h1>
    <p style="margin:0 0 20px;font-size:14px;color:rgba(255,255,255,0.55);">Hi ${name}, your RemitFlow account was accessed from a new device.</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${row('Device', device)}
      ${divider()}
      ${row('IP address', ip)}
      ${divider()}
      ${row('Time', time)}
    </table>
    <p style="margin:20px 0 0;font-size:13px;color:rgba(255,255,255,0.45);">
      If this was you, no action is needed. If you don't recognise this sign-in,
      sign out of all devices immediately and change your password.
    </p>
    ${btn(`${APP_URL}/settings`, 'Review active sessions', true)}
  `) + footer() + BASE_CLOSE

  await send(to, 'New sign-in to your RemitFlow account', html)
}

// ─── Email: transfer receipt ───────────────────────────────────────────────────

export async function sendTransferReceipt(opts: {
  to: string
  name: string
  reference: string
  sendAmount: number
  sendCurrency: string
  receiveAmount: number
  receiveCurrency: string
  recipientName: string
  recipientCountry: string
  exchangeRate: number
  fee: number
  totalAmount: number
  estimatedDelivery: string
  completedAt: Date
}) {
  const {
    to, name, reference, sendAmount, sendCurrency,
    receiveAmount, receiveCurrency, recipientName, recipientCountry,
    exchangeRate, fee, totalAmount, estimatedDelivery, completedAt,
  } = opts

  const time = completedAt.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short',
  })
  const subject = `Transfer completed · ${reference} · ${sendCurrency} ${sendAmount.toFixed(2)} → ${receiveCurrency} ${receiveAmount.toFixed(2)}`

  const html = BASE + logo() + card(`
    <div style="display:inline-flex;align-items:center;gap:8px;background:rgba(0,200,100,0.12);border:1px solid rgba(0,200,100,0.20);border-radius:8px;padding:6px 12px;margin-bottom:18px;">
      <span style="color:#2ECC71;font-size:13px;font-weight:600;">✓ Completed</span>
    </div>
    <h1 style="margin:0 0 4px;font-size:20px;font-weight:700;color:#fff;">Transfer receipt</h1>
    <p style="margin:0 0 20px;font-size:14px;color:rgba(255,255,255,0.55);">Hi ${name}, your transfer has been delivered.</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${row('You sent', `${sendCurrency} ${sendAmount.toFixed(2)}`)}
      ${divider()}
      ${row('Recipient gets', `${receiveCurrency} ${receiveAmount.toFixed(2)}`)}
      ${divider()}
      ${row('Exchange rate', `1 ${sendCurrency} = ${exchangeRate} ${receiveCurrency}`)}
      ${divider()}
      ${row('Fee', `${sendCurrency} ${fee.toFixed(2)}`)}
      ${divider()}
      ${row('Total charged', `${sendCurrency} ${totalAmount.toFixed(2)}`)}
      ${divider()}
      ${row('Recipient', `${recipientName} (${recipientCountry})`)}
      ${divider()}
      ${row('Reference', reference)}
      ${divider()}
      ${row('Delivery', estimatedDelivery)}
      ${divider()}
      ${row('Completed', time)}
    </table>
    ${btn(`${APP_URL}/transactions`, 'View transaction history')}
  `) + footer() + BASE_CLOSE

  await send(to, subject, html)
}

// ─── Email: welcome ────────────────────────────────────────────────────────────

export async function sendWelcomeEmail(opts: {
  to: string
  name: string
  country: string
}) {
  const { to, name, country } = opts

  const html = BASE + logo() + card(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#fff;">Welcome to RemitFlow, ${name.split(' ')[0]}!</h1>
    <p style="margin:0 0 20px;font-size:14px;color:rgba(255,255,255,0.55);">
      Send money to Africa instantly — with real exchange rates and low fees.
      Your account is ready and you can start sending up to £50/week right away.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${row('Account country', country)}
      ${divider()}
      ${row('Pre-KYC weekly limit', '£50')}
      ${divider()}
      ${row('Verified limit', 'Up to £5,000/day')}
    </table>
    <p style="margin:20px 0 0;font-size:13px;color:rgba(255,255,255,0.45);">
      Verify your identity to unlock higher limits and faster transfers.
    </p>
    ${btn(`${APP_URL}/verify`, 'Verify identity')}
  `) + footer() + BASE_CLOSE

  await send(to, `Welcome to RemitFlow, ${name.split(' ')[0]}!`, html)
}
