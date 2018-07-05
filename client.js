// libs
const display = require('./modules/canvas-display')

// components
const createLayerControls = require('./modules/layer-controls')

function main () {
  const socket = io();

  // Handle messages from the server============================================

  // On "server message" message, display messages from server
  socket.on('server message', function (msg) {
    console.log('got server message: ', msg)
    const messages = document.getElementById('messages')
    const li = document.createElement('li')
    li.innerHTML = msg
    messages.appendChild(li)
    messages.scrollTop = messages.scrollHeight
  })


  // On "layers" message, update the list of active layers
  socket.on('layers', function handleLayers (layers) {
    const layersDiv = document.getElementById('layers')
    layersDiv.innerHTML = ''
    const newControls = createLayerControls(layers, socket)
    layersDiv.appendChild(newControls)
  })


  // On "digit" message, draw the digit
  socket.on('digit', function displayDigit ({ layerID, digit }) {
    display.drawDigit({
      layerID: layerID,
      digit: digit,
      position: {x: 0, y: 0}
    })
  })


  // On 'layer activation' message, draw the layer
  socket.on('layer activation', function displayLayer ({ layerID, activeColumns, backProjection }) {

    // Draw which columns are active
    display.drawActiveColumns({
      layerID: layerID,
      activeColumns: activeColumns,
      position: {x: 0, y: 40}
    })

    // Draw the back projection of the active columns
    display.drawBackProjection({
      layerID: layerID,
      backProjection: backProjection,
      position: {x: 35, y: 0}
    })
  })

  // On 'guess' message, tally up the guesses for stats
  socket.on('guess', function tallyGuess ({ layerID, bestGuess, out, bestGuesses, rightWrong }) {
    display.updateGuesses({ layerID: layerID, bestGuess: bestGuess, out: out, bestGuesses: bestGuesses, rightWrong: rightWrong })
    console.log('testing')
  })

  // Bind the buttons===========================================================

  // Bind the "create layer" button to send a socket.io message
  $('#createLayer').on('click', function handleClick () {
    socket.emit('create layer')
  })
}

if (typeof window !== 'undefined') {
  window.addEventListener('load', main)
} else {
  main()
}
