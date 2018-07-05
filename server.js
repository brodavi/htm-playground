// Vendor libs
const mnist = require('mnist')
const app = require('express')()
const http = require('http').Server(app)
const io = require('socket.io')(http)
const Layer = require('./modules/layer')
const md5 = require('md5')

// Partition training and test sets
const set = mnist.set(8000, 2000)
const trainingSet = set.training
const testSet = set.test

// The "working layers".. these are not persisted! Only exist in working memory for now
const layers = []

/////////////                                                  /////////////
/////////////      ===========HYPERPARAMETERS===========       /////////////
/////////////                                                  /////////////
let settings = {}
settings.columnSqrtCount = 28
settings.inputSpace = 783 // 784 starting from 0 (28x28 images)
settings.potentialPercent = 0.55 // multiply this by input space to get number of input space connections per column
settings.inactiveDecrement = 0.1 // how much to decrement "loser" columns' connections to the input space
settings.activeIncrement = 0.05 // how much to increment "winner" columns' connections to the input space
settings.connectionThreshold = 0.2 // how high a permanence value must be before it is considered connected
settings.activeColumnRatioPerInhibitionArea = 0.01 // how many active columns there are in an inhibition area (currently global)
settings.inputSensitivity = 0.7 // how high a permanence value must be to be considered an overlap on the input space
// settings.columnDimension = 1
settings.repotentialization = 1.05 // multiplier to re-potentialize the column after losing potential to obtain homeostasis
settings.depotentialization = .2 // multiplier to de-potentialize a column after it has fired to obtain homeostasis
/////////////                                                  /////////////
/////////////      ===========HYPERPARAMETERS===========       /////////////
/////////////                                                  /////////////


// Get static files
app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html')
})

app.get('/bundle.js', function (req, res) {
  res.sendFile(__dirname + '/bundle.js')
})

app.get('/jquery.min.js', function (req, res) {
  res.sendFile(__dirname + '/jquery.min.js')
})


// Bootstrap handlers on connection
io.on('connection', function (socket) {

  // Tell client we are ready
  io.emit('server message', 'ready....')

  // Let client know about the layers in play
  io.emit('layers', layers)

  // Got a "create layer" command from the client
  socket.on('create layer', function createLayer () {
    // Create an m-length layer of n-dimensional columns, with a perceptive field
    // on the input space, given some potential percent and connection threshold
    const settingsObj = {
      columnSqrtCount: settings.columnSqrtCount,
      inputSpace: settings.inputSpace,
      potentialPercent: settings.potentialPercent,
      inactiveDecrement: settings.inactiveDecrement,
      activeIncrement: settings.activeIncrement,
      connectionThreshold: settings.connectionThreshold,
      activeColumnRatioPerInhibitionArea: settings.activeColumnRatioPerInhibitionArea,
      inputSensitivity: settings.inputSensitivity,
      // n: settings.columnDimension,
      boost: settings.boost,
      repotentialization: settings.repotentialization,
      depotentialization: settings.depotentialization
    }

    const id = md5(new Date())

    const layer = Layer.createLayer({
      settings: settingsObj,
      id: id
    })

    // add to working layers workspace
    layers.push(layer)

    io.emit('server message', `layer created: ${id}`)
    io.emit('layers', layers)
  })


  // Got a "train" command from the client
  socket.on('train layer', function train ({ layerID, inputIDX }) {
    // Train layer ID on the digit IDX
    if (!inputIDX) {
      inputIDX = 0
    }

    if (!trainingSet[inputIDX]) {
      io.emit('server message', 'that input index (' + inputIDX + ') is empty')
      return
    }

    io.emit('server message', 'training....')
    // Find the layer in question
    const layer = layers.find(function findLayer (l) {
      return l.id == layerID
    })

    if (!layer) {
      io.emit('server message', 'no layer with id' + layerID)
      return
    }

    // And train it on the input..... getting active columns and backprojection as an output
    const learnings = Layer.layerLearn({ l: layer, input: trainingSet[inputIDX].input, output: trainingSet[inputIDX].output})

    // Show the client the digit input trained on
    io.emit('digit', { layerID: layer.id, digit: trainingSet[inputIDX].input })

    // Show the client the layer activations and back projections
    io.emit('layer activation', { layerID: layer.id, activeColumns: learnings.activeColumns, backProjection: learnings.backProjection})
  })

  // Got a "test layer" command from the client
  socket.on('test layer', function test ({ layerID, inputIDX }) {
    // Train layer ID on the digit IDX
    if (!inputIDX) {
      inputIDX = 0
    }

    if (!testSet[inputIDX]) {
      io.emit('server message', 'that input index (' + inputIDX + ') is empty')
      return
    }

    // Find the layer in question
    const layer = layers.find(function findLayer (l) {
      return l.id == layerID
    })

    if (!layer) {
      io.emit('server message', 'no layer with id' + id)
      return
    }

    // And test it on the input.....

    // So first, find the active columns for this input....
    const activeColumns = Layer.getActiveColumns({
      columns: layer.columns,
      activeColumnRatioPerInhibitionArea: layer.settings.activeColumnRatioPerInhibitionArea,
      connectionThreshold: layer.settings.connectionThreshold,
      input: testSet[inputIDX].input,
      inputSensitivity: layer.settings.inputSensitivity
    })

    // Get the back projection for visualization purposes
    const backProjection = Layer.getBackProjection({
      columns: layer.columns,
      activeColumns: activeColumns
    })

    // Show the client the digit input tested on
    io.emit('digit', { layerID: layer.id, digit: testSet[inputIDX].input })

    // Show the client the layer activations and back projections
    io.emit('layer activation', { layerID: layer.id, activeColumns: activeColumns, backProjection: backProjection})

    const bestGuesses = Layer.getBestGuesses({ activeColumns: activeColumns, probabilities: layer.probabilities })
    // Just send the best guesses, let the client display them how it wishes
    const bestGuess = Layer.getBestGuess(bestGuesses)
    const out = Layer.getOut(testSet[inputIDX].output)
    const rightWrong = bestGuess == out ? 'CORRECT!' : 'WRONG!'
    io.emit('guess', { layerID: layer.id, bestGuess: bestGuess, out: out, bestGuesses: bestGuesses, rightWrong: rightWrong })
  })

  // Got a "update settings" command from the client... change settings
  socket.on('update settings', function updateSettings (id, key, val) {
    // Find the layer in question
    const layer = layers.find(function findLayer (l) {
      return l.id == id
    })

    // Update the layer
    layer.settings[key] = val

    // If the update is columnSqrtCount, resize the layer, and re-initialize
    if (key === 'columnSqrtCount') {
      layer.columns = Layer.createLayer({
        id: id,
        settings: layer.settings
      }).columns
    }

    // Keep client in the loop
    io.emit('server message', key + ' setting updated')
    io.emit('layers', layers)
  })

  // Got a "activate layer" command from the client
  socket.on('activate layer', function activateLayer ({ layerID, type, inputIDX }) {
    const training = type == 'train'

    // Activate layer ID on the digit IDX
    if (!inputIDX) {
      inputIDX = 0
    }

    // Find the layer in question
    const layer = layers.find(function findLayer (l) {
      return l.id == layerID
    })

    if (!layer) {
      io.emit('server message', 'no layer with id' + layerID)
      return
    }

    const activeColumns = Layer.getActiveColumns({
      columns: layer.columns,
      activeColumnRatioPerInhibitionArea: layer.settings.activeColumnRatioPerInhibitionArea,
      connectionThreshold: layer.settings.connectionThreshold,
      input: training ? trainingSet[inputIDX].input : testSet[inputIDX].input,
      inputSensitivity: layer.settings.inputSensitivity
    })

    const backProjection = Layer.getBackProjection({
      columns: layer.columns,
      activeColumns: activeColumns
    })

    io.emit('digit', { layerID: layerID, digit: training ? trainingSet[inputIDX].input : testSet[inputIDX].input })
    io.emit('layer activation', { layerID: layerID, activeColumns: activeColumns, backProjection: backProjection})

    const bestGuesses = Layer.getBestGuesses({ activeColumns: activeColumns, probabilities: layer.probabilities })
    // Just send the best guesses, let the client display them how it wishes
    const bestGuess = Layer.getBestGuess(bestGuesses)
    const out = Layer.getOut(training ? trainingSet[inputIDX].output : testSet[inputIDX].output)
    const rightWrong = bestGuess == out ? 'CORRECT!' : 'WRONG!'
    io.emit('guess', { layerID: layer.id, bestGuess: bestGuess, out: out, bestGuesses: bestGuesses, rightWrong: rightWrong })
  })

  // Got a "delete layer" command from the client
  socket.on('delete layer', function deleteLayer (layerID) {
    // Find the layer in question
    const layer = layers.find(function findLayer (l) {
      return l.id == layerID
    })

    if (!layer) {
      io.emit('server message', 'no layer with id' + layerID)
      return
    }

    // Find the layer's index
    const idx = layers.indexOf(layer)

    // Remove the layer
    layers.splice(idx, 1)

    // Keep client in the loop
    io.emit('server message', `layer ${layerID} deleted`)
    io.emit('layers', layers)
  })
})



// Start the server
http.listen(3000, function () {
  console.log('listening on *:3000')
})