require('dotenv').config()

const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const { StreamChat } = require('stream-chat')

const app = express()

app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

const serverSideClient = new StreamChat(
  process.env.GET_STREAM_KEY,
  process.env.GET_STREAM_SECRET,
)

let systemAdmin, generalChannel

app.post('/join', async (req, res) => {
  const { username } = req.body
  const userToken = serverSideClient.createToken(username)

  const user = {
    id: username,
    name: username,
  }
  try {
    await serverSideClient.upsertUser(user, userToken)
    await generalChannel.addMembers([username, 'admin'])

    let message = `User '${username}' has joined`
    console.log(`Server: ${message}`)
    generalChannel.sendMessage({ text: message, user_id: systemAdmin.id })

    res.status(200).json({
      user,
      token: userToken,
      apiKey: process.env.GET_STREAM_KEY,
    })
  } catch (err) {
    console.error(err)
    res.status(500)
  }
})

const server = app.listen(process.env.PORT || 3000, async () => {
  const { port } = server.address()
  console.log(`Server started and listening on: ${port}`)

  if (!systemAdmin) {
    systemAdmin = { id: 'System', name: 'System' }
    let adminToken = serverSideClient.createToken(systemAdmin.name)
    await serverSideClient.upsertUser(systemAdmin, adminToken)
  }
  if (!generalChannel) {
    generalChannel = serverSideClient.channel('team', 'general', {
      name: 'general',
      created_by: systemAdmin,
    })
    await generalChannel.create()
    await generalChannel.addMembers([systemAdmin.id, 'admin'])
  }
})
