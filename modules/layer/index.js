
const shuffle = require('shuffle-array')
const utilities = require('../utilities')

const layer = {

  // Just to return the output number instead of the one-hot
  getOut: function getOut (arr) {
    return arr.indexOf(1)
  },

  // Create a new layer
  createLayer: function createLayer ({ id, settings }) {

    const columnCount = settings.columnSqrtCount * settings.columnSqrtCount // so that we always have a "square sheet" of columns (to simplify neighbor calculations)

    // potentialPool is an array whose elements signify whether or not the
    // column has a potential to connect to the input space cell... the percent
    // of the input space is given by potentialPercent
    // this is shuffled for each column
    let potentialPool = new Array(settings.inputSpace)
    for (var p = 0; p < settings.inputSpace * settings.potentialPercent; p++) {
      potentialPool[p] = 1
    }

    // Assign random permanence values for every potential cell connection in the input space
    let columns = new Array(columnCount)

    // for each column
    for (var c = 0; c < columnCount; c++) {

      // shuffle the potential pool
      shuffle(potentialPool)

      // create a column object
      columns[c] = {
        permanenceValues: new Array(settings.inputSpace),
        potential: 1
      }

      // for each input space cell
      for (var i = 0; i < settings.inputSpace; i++) {
        // if the input space cell is to be a potential connection, let's add it
        if (potentialPool[i] === 1) {
          columns[c].permanenceValues[i] = (utilities.normalDistribution(settings.connectionThreshold))
        }
      }

    }

    // NOTE probabilities are only useful for MNIST recognition, nothing else at the moment
    let probabilities = {}
    for (var x = 0; x < 10; x++) {
      // for every digit 0 - 9, have an array of counts of column activations
      probabilities[x] = new Array(columnCount)
    }

    /*
      layer: {
        columns: [
          {
            permanenceValues: [0.245, 0, 0.34...],
            potential: 0.1
          }
        ],
        probabilities: {
          1: [0,0,32,0,7,3,0...0,0,6],
          2: [0,11,9,0,0,1,0...3,0,4],
          ...
        },
        settings: {
          columnSqrtCount: 12,
          inputSpace: 724,
          ...
        },
        id: 'abcdf123456'
      }
    */

    return {columns: columns, probabilities: probabilities, settings: settings, id: id}
  },

  // Determine a column's overlap score with a given input and given sensitivity
  getColumnOverlapScore: function getColumnOverlapScore ({ column, potential, input, sensitivity }) {
    let overlapScore = 0
    for (var x = 0; x < input.length; x++) {
      const thisCellConnection = column[x] * potential // the permanence value (factoring in potential)
      if (thisCellConnection && (input[x] > sensitivity)) {
        overlapScore++
      }
    }
    return overlapScore
  },

  // Determine the indexes of the active columns, as limited by activeColumnRatioPerInhibitionArea
  getActiveColumns: function getActiveColumns ({ columns, activeColumnRatioPerInhibitionArea, connectionThreshold, input, inputSensitivity, boost }) {

    // How many columns are active for this input?
    let overlapScores = []
    for (var c = 0; c < columns.length; c++) {
      const overlapScore = layer.getColumnOverlapScore({
        column: columns[c].permanenceValues,
        potential: columns[c].potential,
        input: input,
        sensitivity: inputSensitivity
      })

      overlapScores.push({column: c, score: overlapScore})
    }

    // Sort the columns
    overlapScores.sort(function sort (a, b) {
      return a.score < b.score ? 1 : -1
    })

    // Depending on inhibition, only get the first X "winner" columns
    let winnerCount = Math.ceil(columns.length * activeColumnRatioPerInhibitionArea)

    let allColumns = new Array(columns.length)

    // only mark the top X columns where X is activeColumnRatioPerInhibitionArea * column length
    for (var i = 0; i < overlapScores.length; i++) {
      if (winnerCount <= 0) {
        // Losers get marked whatever their potential is (1 by default)
        allColumns[overlapScores[i].column] = columns[overlapScores[i].column].potential
      } else {
        // Winners get marked solid 0 (meaning they have just fired)
        allColumns[overlapScores[i].column] = 0
      }
      winnerCount--
    }

    return allColumns
  },

  // Do learning on a layer l given an input
  layerLearn: function layerLearn ({ l, input, output }) {
    const out = layer.getOut(output)

    // So first, mark the active columns for this input (with a 0)....
    const activeColumns = layer.getActiveColumns({
      columns: l.columns,
      activeColumnRatioPerInhibitionArea: l.settings.activeColumnRatioPerInhibitionArea,
      connectionThreshold: l.settings.connectionThreshold,
      input: input,
      inputSensitivity: l.settings.inputSensitivity,
      boost: l.settings.boost
    })

    // "activeColumns" is just an array representing column indices, active ones marked 0
    for (var i = 0; i < activeColumns.length; i++) {
      if (activeColumns[i] === 0) {
        // Train one of these winner columns (marked by 0)
        // Think of activeColumns return as potentials return

        layer.columnLearn({
          column: l.columns[i].permanenceValues,
          input: input,
          activeIncrement: l.settings.activeIncrement,
          inactiveDecrement: l.settings.inactiveDecrement
        })


        /////// Update probabilities ///////

        // This column has been activated for this input, so record it
        // for probability purposes
        if (!l.probabilities[out][i]) {
          l.probabilities[out][i] = 1
        } else {
          l.probabilities[out][i] = l.probabilities[out][i] + 1
        }


        /////// Update potentials ///////

        // If this column just fired, bring down its potential a bit, minimum 0
        l.columns[i].potential = l.columns[i].potential * l.settings.depotentialization
      } else { // Loser columns
        // (activity not 0) this column is a "loser" column, but still has potential
        // ... increase that potential till up to max 1
        l.columns[i].potential = l.columns[i].potential * l.settings.repotentialization
      }
      l.columns[i].potential = utilities.clamp(l.columns[i].potential, 0, 1)
    }

    // Get the back projection for visualization purposes
    const backProjection = layer.getBackProjection({
      columns: l.columns,
      activeColumns: activeColumns
    })

    return { activeColumns: activeColumns, backProjection: backProjection }
  },

  // Do hebbian learning for a given column on an input, with an inc and dec
  columnLearn: function columnLearn ({ column, input, activeIncrement, inactiveDecrement }) {
    // for each input data point....
    for (var x = 0; x < input.length; x++) {

      // If there is no connection, ignore this input space index
      if (!column[x]) {
        continue
      }

      // else there is a cell connection...

      // ....and the input has overlap
      if (column[x] && (input[x] !== 0)) {
        // then increase the cell connection permanence value
        column[x] = column[x] + activeIncrement
      } else {
        // ...but no overlap, so decrease the cell connection permanence value
        column[x] = column[x] - inactiveDecrement
      }

      column[x] = utilities.clamp(column[x], 0, 1)
    }

    return column
  },

  getBackProjection: function getBackProjection ({ columns, activeColumns }) {
    let backProjection = []
    let count = 0
    for (var i = 0; i < activeColumns.length; i++) {
      if (activeColumns[i] === 0) {
        // this column is active, so get its receptive field and add it to the back projection
        for (var x = 0; x < columns[i].permanenceValues.length; x++) {
          if (!backProjection[x]) {
            backProjection[x] = 0
          }
          backProjection[x] += columns[i].permanenceValues[x] || 0
        }
        count += 1
      }
    }

    // average the back projections
    for (var j = 0; j < backProjection.length; j++) {
      backProjection[j] = backProjection[j] / count
    }

    return backProjection
  },

  getBestGuesses: function getBestGuesses ({ activeColumns, probabilities }) {
    // We're going to try to guess what the digit is, by way of number of times
    // we've seen these columns active before, given ground truth
    let score = 0
    let bestGuesses = {}

    // for each output
    for (var guess in probabilities) {
      // for each column's probabilities
      for (var x = 0; x < probabilities[guess].length; x++) {
        // if this column is active and has been active before on this input,
        // take all previous activities under consideration
        if (probabilities[guess][x] && (activeColumns[x] === 0)) {
          // This guess has an overlap, it get a point
          if (!bestGuesses[guess]) {
            // start at zero if necessary
            bestGuesses[guess] = 0
          }
          // Add the number from the probabilities
          bestGuesses[guess] += probabilities[guess][x]
        }
      }
    }

    return bestGuesses
  },

  // Determine our best guess of all our best guesses
  getBestGuess: function getBestGuess (bestGuesses) {
    let bestScore = 0
    let bestGuess = undefined
    for (var guess in bestGuesses) {
      if (bestGuesses[guess] > bestScore) {
        bestGuess = guess
        bestScore = bestGuesses[guess]
      }
    }
    return bestGuess
  }
}

module.exports = layer