const display = require('../canvas-display')

function createLayerControls (layers, socket) {
  let layersContainer = document.createElement('div')

  for (var i = 0; i < layers.length; i++) {
    const layerControls = document.createElement('div')
    layerControls.classList.add('layerControlsContainer')

    const idLabel = document.createElement('div')
    idLabel.classList.add('layerId')
    idLabel.innerHTML = layers[i].id

    // Create a button to delete a particular layer
    const deleteButton = document.createElement('button')
    deleteButton.classList.add('deleteLayer')
    deleteButton.dataset.layerid = layers[i].id
    deleteButton.innerHTML = 'Delete Layer'
    deleteButton.addEventListener('click', function handleClick (e) {
      const id = e.target.dataset.layerid
      socket.emit('delete layer', id)
    })

    // Create a button to activate a layer on a particular training input
    const activateTrainButton = document.createElement('button')
    activateTrainButton.classList.add('activateLayerTrain')
    activateTrainButton.dataset.layerid = layers[i].id
    activateTrainButton.innerHTML = 'Activate Training Input'
    activateTrainButton.addEventListener('click', function handleClick (e) {
      const id = e.target.dataset.layerid
      const idx = e.target.parentElement.querySelector('.idxInput').value
      socket.emit('activate layer', { layerID: id, type: 'train', inputIDX: idx })
    })

    // Create a button to activate a layer on a particular test input
    const activateTestButton = document.createElement('button')
    activateTestButton.classList.add('activateLayerTest')
    activateTestButton.dataset.layerid = layers[i].id
    activateTestButton.innerHTML = 'Activate Test Input'
    activateTestButton.addEventListener('click', function handleClick (e) {
      const id = e.target.dataset.layerid
      const idx = e.target.parentElement.querySelector('.idxInput').value
      socket.emit('activate layer', { layerID: id, type: 'test', inputIDX: idx })
    })

    // Create a text field to hold the index of the input user wants to activate on
    const idxField = document.createElement('input')
    idxField.classList.add('idxInput')
    idxField.dataset.layerid = layers[i].id
    idxField.setAttribute('placeholder', 'input idx')

    // Create a button to train a layer on the first 100 digits of the training set
    const trainButton = document.createElement('button')
    trainButton.classList.add('trainLayer')
    trainButton.dataset.layerid = layers[i].id
    trainButton.innerHTML = 'Train'
    trainButton.addEventListener('click', function handleClick (e) {
      const id = e.target.dataset.layerid
      const inputNum = document.querySelector(`.inputNumInput[data-layerid='${id}']`).value

      // set the interval
      let count = 0
      const interval = window.setInterval(emitLearn, 50)

      function emitLearn () {
        if (count >= inputNum) {
          window.clearInterval(interval)
        } else {
          count += 1
          socket.emit('train layer', { layerID: id, inputIDX: count })
        }
      }

    })

    // Create a button to test a layer on the first 100 digits of the test set
    const testButton = document.createElement('button')
    testButton.classList.add('testLayer')
    testButton.dataset.layerid = layers[i].id
    testButton.innerHTML = 'Test'
    testButton.addEventListener('click', function handleClick (e) {
      const id = e.target.dataset.layerid
      const inputNum = document.querySelector(`.inputNumInput[data-layerid='${id}']`).value

      // init the counters for this layer
      const goodGuessLabel = document.querySelector(`.goodGuessLabel[data-layerid='${id}']`)
      const badGuessLabel = document.querySelector(`.badGuessLabel[data-layerid='${id}']`)
      goodGuessLabel.dataset.count = 0
      badGuessLabel.dataset.count = 0

      // set the interval
      let count = 0
      const interval = window.setInterval(emitTest, 50)

      function emitTest () {
        if (count >= inputNum) {
          window.clearInterval(interval)
        } else {
          count += 1
          socket.emit('test layer', { layerID: id, inputIDX: count })
        }
      }

    })

    // Create a text field to hold the number of inputs to train / test
    const inputNumField = document.createElement('input')
    inputNumField.classList.add('inputNumInput')
    inputNumField.dataset.layerid = layers[i].id
    inputNumField.setAttribute('placeholder', 'input num')

    // Create a label showing how many good guesses
    const goodGuessLabel = document.createElement('div')
    goodGuessLabel.classList.add('goodGuessLabel')
    goodGuessLabel.dataset.layerid = layers[i].id
    goodGuessLabel.dataset.count = 0

    // Create a label showing how many bad guesses
    const badGuessLabel = document.createElement('div')
    badGuessLabel.classList.add('badGuessLabel')
    badGuessLabel.dataset.layerid = layers[i].id
    badGuessLabel.dataset.count = 0

    // Create a label showing the good guess / total ratio
    const guessRatioLabel = document.createElement('div')
    guessRatioLabel.classList.add('guessRatioLabel')
    guessRatioLabel.dataset.layerid = layers[i].id

    // the whole layer
    const layer = document.createElement('li')
    layer.dataset.layerid = layers[i].id
    layer.classList.add('layer')

    // the output canvas
    const canvas = document.createElement('canvas')
    canvas.dataset.layerid = layers[i].id
    canvas.setAttribute('width', 100)
    canvas.setAttribute('height', 70)

    // the best guesses label
    const bestGuessesLabel = document.createElement('div')
    bestGuessesLabel.classList.add('bestGuessesLabel')
    bestGuessesLabel.dataset.layerid = layers[i].id

    // the settings controls
    const settingsControls = document.createElement('div')
    settingsControls.classList.add('settingControlsContainer')
    for (var setting in layers[i].settings) {
      if (layers[i].settings.hasOwnProperty(setting)) {
        const control = document.createElement('div')
        control.classList.add('settingControl')
        const label = document.createElement('div')
        label.classList.add('settingControlLabel')
        label.innerHTML = setting
        const input = document.createElement('input')
        input.classList.add('inputSmall')
        input.dataset.layerid = layers[i].id
        input.dataset.key = setting
        input.setAttribute('placeholder', layers[i].settings[setting])
        input.addEventListener('keydown', function handleKeyDown (e) {
          if (e.keyCode === 13) {
            socket.emit('update settings', e.target.dataset.layerid, e.target.dataset.key, e.target.value)
          }
        })
        control.appendChild(label)
        control.appendChild(input)
        settingsControls.appendChild(control)
      }
    }

    // Container for activate controls
    const activateControlsContainer = document.createElement('div')
    activateControlsContainer.classList.add('activateControlsContainer')
    activateControlsContainer.classList.add('bubble')

    // Container for training controls
    const trainingControlsContainer = document.createElement('div')
    trainingControlsContainer.classList.add('trainingControlsContainer')
    trainingControlsContainer.classList.add('bubble')

    // Container for guesses
    const guessContainer = document.createElement('div')
    guessContainer.classList.add('guessContainer')
    guessContainer.classList.add('bubble')

    // append everything
    layerControls.appendChild(deleteButton)

    activateControlsContainer.appendChild(activateTrainButton)
    activateControlsContainer.appendChild(activateTestButton)
    activateControlsContainer.appendChild(idxField)
    layerControls.appendChild(activateControlsContainer)

    trainingControlsContainer.appendChild(trainButton)
    trainingControlsContainer.appendChild(testButton)
    trainingControlsContainer.appendChild(inputNumField)
    layerControls.appendChild(trainingControlsContainer)

    guessContainer.appendChild(goodGuessLabel)
    guessContainer.appendChild(badGuessLabel)
    guessContainer.appendChild(guessRatioLabel)
    layerControls.appendChild(guessContainer)

    layer.appendChild(idLabel)
    layer.appendChild(layerControls)
    layer.appendChild(canvas)
    layer.appendChild(bestGuessesLabel)
    layer.appendChild(settingsControls)

    layersContainer.appendChild(layer)
  }

  return layersContainer
}

module.exports = createLayerControls