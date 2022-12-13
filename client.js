const axios = require('axios')
const prompt = require('prompt')
const { StreamChat } = require('stream-chat')
const util = require('util')
const blessed = require('neo-blessed')

function fetchToken(username) {
  return axios.post('http://localhost:3000/join', username)
}

async function main() {
  prompt.start()
  prompt.message = ''
  const get = util.promisify(prompt.get)

  const usernameSchema = [
    {
      description: 'Enter your username',
      name: 'username',
      type: 'string',
      pattern: /^[a-zA-Z0-9\-]+$/,
      message: 'Username must be only alphanumerical or dashes',
      required: true,
    },
  ]

  const username = await get(usernameSchema)
  try {
    const response = await fetchToken(username)
    const { user, token, apiKey } = response.data
    const chatClient = new StreamChat.getInstance(apiKey)

    // Needed to be changed from setUser to connectUser, but a warning comes up
    await chatClient.connectUser(user, token)

    const channel = chatClient.channel('team', 'general')
    await channel.watch()

    // ####################### Blessed Terminal UI - Start ###
    process.stdin.removeAllListeners('data')

    const screen = blessed.screen({
      smartCSR: true,
      title: 'Stream Chat Demo',
    })

    // ####################### Blessed Terminal UI - Creating and setting up a list for messages
    var messageList = blessed.list({
      aling: 'left',
      mouse: true,
      keys: true,
      width: '100%',
      height: '90%',
      top: 0,
      left: 0,
      scrollbar: {
        ch: ' ',
        inverse: true,
      },
      items: [],
    })

    // ####################### lessed Terminal UI - Creating and setting up a box for messages
    var input = blessed.textarea({
      bottom: 0,
      height: '10%',
      inputOnFocus: true,
      padding: {
        top: 1,
        left: 2,
      },
      style: {
        fg: '#787878',
        bg: '#454545',
        focus: {
          fg: '#f6f6f6',
          bg: '#353535',
        },
      },
    })

    // ####################### Blessed Terminal UI - Giving functionality to previous box
    //Setting 'enter' as 'sender button'
    input.key('enter', async function () {
      var message = this.getValue()

      try {
        await channel.sendMessage({
          text: message,
        })
      } catch (err) {
        //error handling
      } finally {
        this.clearValue()
        screen.render()
      }
    })

    // ####################### Blessed Terminal UI - Giving functionality to screen
    screen.key(['escape', 'q', 'C-c'], async function () {
      await channel.disconnectUser()
      return process.exit(0)
    })

    // ####################### Blessed Terminal UI - Building components and rendering screen
    screen.append(messageList)
    screen.append(input)
    input.focus()

    screen.render()
    // ####################### Blessed Terminal UI - End ###

    channel.on('message.new', async (messageWritten) => {
      messageList.addItem(
        `${messageWritten.user.id}: ${messageWritten.message.text}`,
      )
      messageList.scrollTo(100)
      screen.render()
    })
  } catch (err) {
    console.log(err)
    process.exit(1)
  }
}

main()
