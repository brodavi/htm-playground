const canvasDisplay = {
  getDigit: function getDigit (arr) {
    // Translate one-hot to digit
    for (var i = 0; i < arr.length; i++) {
      if (arr[i] !== 0) {
        return arr.indexOf(arr[i])
      }
    }
  },

  drawDigit: function drawDigit ({ layerID, digit, position }) {
    const canvases = document.querySelectorAll(`[data-layerid='${layerID}']`)

    let canvas
    for (var i = 0; i < canvases.length; i++) {
      if (canvases[i].nodeName === 'CANVAS') {
        canvas = canvases[i]
      }
    }

    const ctx = canvas.getContext('2d')

    const imageData = ctx.createImageData(28, 28)

    const data = imageData.data

    let thisPixel
    let count = 0

    for (var i = 0; i < data.length; i += 4) {
      thisPixel = digit[count]

      if (thisPixel === 0) {
        val = 00
      } else if (thisPixel < .3) {
        val = 11
      } else if (thisPixel < .5) {
        val = 44
      } else if (thisPixel < .7) {
        val = 88
      } else if (thisPixel < .9) {
        val = 111
      } else {
        val = 222
      }

      data[i]     = val // red
      data[i + 1] = val // green
      data[i + 2] = val // blue
      data[i + 3] = 255 // alpha

      count++
    }

    ctx.putImageData(imageData, position.x, position.y)
  },

  // Draw the back projection of the active columns
  drawBackProjection: function drawBackProjection ({ layerID, backProjection, position }) {

    const canvases = document.querySelectorAll(`[data-layerid='${layerID}']`)

    let canvas
    for (var i = 0; i < canvases.length; i++) {
      if (canvases[i].nodeName === 'CANVAS') {
        canvas = canvases[i]
      }
    }

    const ctx = canvas.getContext('2d')

    const imageData = ctx.createImageData(28, 28) // NOTE: only showing mnist backprojections at the moment

    const data = imageData.data

    let thisProjection
    let count = 0

    for (var i = 0; i < data.length; i += 4) {
      thisProjection = backProjection[count]

      if (thisProjection) {
        if (thisProjection < 0.1) {
          data[i]     = 0 // red
          data[i + 1] = 77 // green
          data[i + 2] = 77 // blue
          data[i + 3] = 255 // alpha
        } else if (thisProjection < 0.3) {
          data[i]     = 0 // red
          data[i + 1] = 99 // green
          data[i + 2] = 99 // blue
          data[i + 3] = 255 // alpha
        } else if (thisProjection < 0.5) {
          data[i]     = 0 // red
          data[i + 1] = 111 // green
          data[i + 2] = 111 // blue
          data[i + 3] = 255 // alpha
        } else if (thisProjection < 0.7) {
          data[i]     = 0 // red
          data[i + 1] = 177 // green
          data[i + 2] = 177 // blue
          data[i + 3] = 255 // alpha
        } else if (thisProjection < 0.9) {
          data[i]     = 0 // red
          data[i + 1] = 222 // green
          data[i + 2] = 222 // blue
          data[i + 3] = 255 // alpha
        } else if (thisProjection < 1) {
          data[i]     = 0 // red
          data[i + 1] = 255 // green
          data[i + 2] = 255 // blue
          data[i + 3] = 255 // alpha
        }
      } else {
        data[i]     = 0 // red
        data[i + 1] = 0 // green
        data[i + 2] = 0 // blue
        data[i + 3] = 255 // alpha
      }
      count++
    }

    ctx.putImageData(imageData, position.x, position.y)
  },


  // Draw all the columns in the layer... show active/inactive
  drawActiveColumns: function drawActiveColumns ({ layerID, activeColumns, position }) {
    const canvases = document.querySelectorAll(`[data-layerid='${layerID}']`)

    let canvas
    for (var i = 0; i < canvases.length; i++) {
      if (canvases[i].nodeName === 'CANVAS') {
        canvas = canvases[i]
      }
    }

    const ctx = canvas.getContext('2d')

    // Handle any size layer
    const rowNum = Math.ceil(Math.sqrt(activeColumns.length))

    const imageData = ctx.createImageData(rowNum, rowNum)

    const data = imageData.data

    let count = 0
    let logged = false
    let thisColumnPotential

    for (var i = 0; i < data.length; i += 4) {
      thisColumnPotential = activeColumns[count]
      if (thisColumnPotential === 0) {
        // Perhaps confusingly, potential of 0 means the column has JUST FIRED
        // This was done just to make increasing potential easier
        // Also perhaps confusingly, the higher the potential, the darker the
        // pixel. This in effect makes "most recently fired" columns the lighter
        // ones. The darker ones have fired the longest ago, and thus have the
        // highest potential
        data[i]     = 255 // red
        data[i + 1] = 0 // green
        data[i + 2] = 0 // blue
        data[i + 3] = 255 // alpha
      } else if (thisColumnPotential < 0.3) {
        data[i]     = 222 // red
        data[i + 1] = 0 // green
        data[i + 2] = 0 // blue
        data[i + 3] = 255 // alpha
      } else if (thisColumnPotential < 0.5) {
        data[i]     = 177 // red
        data[i + 1] = 0 // green
        data[i + 2] = 0 // blue
        data[i + 3] = 255 // alpha
      } else if (thisColumnPotential < 0.7) {
        data[i]     = 111 // red
        data[i + 1] = 0 // green
        data[i + 2] = 0 // blue
        data[i + 3] = 255 // alpha
      } else if (thisColumnPotential < 0.9) {
        data[i]     = 77 // red
        data[i + 1] = 0 // green
        data[i + 2] = 0 // blue
        data[i + 3] = 255 // alpha
      } else if (thisColumnPotential < 1) {
        data[i]     = 33 // red
        data[i + 1] = 0 // green
        data[i + 2] = 0 // blue
        data[i + 3] = 255 // alpha
      } else if (thisColumnPotential === 1) {
        data[i]     = 0 // red
        data[i + 1] = 0 // green
        data[i + 2] = 0 // blue
        data[i + 3] = 255 // alpha
      } else {
        data[i]     = 0 // red
        data[i + 1] = 0 // green
        data[i + 2] = 0 // blue
        data[i + 3] = 255 // alpha
      }
      count++
    }

    ctx.putImageData(imageData, position.x, position.y)
  },

  // Display the right / wrong guess info for a particular layer
  updateGuesses: function updateGuesses ({ layerID, bestGuess, out, bestGuesses, rightWrong }) {
    const goodGuessLabel = document.querySelector(`.goodGuessLabel[data-layerid='${layerID}']`)
    const badGuessLabel = document.querySelector(`.badGuessLabel[data-layerid='${layerID}']`)

    const goodGuesses = parseInt(goodGuessLabel.dataset.count)
    const badGuesses = parseInt(badGuessLabel.dataset.count)

    if (rightWrong == 'CORRECT!') {
      goodGuessLabel.dataset.count = goodGuesses + 1
      goodGuessLabel.innerHTML = 'CORRECT: ' + goodGuessLabel.dataset.count
    } else if (rightWrong == 'WRONG!') {
      badGuessLabel.dataset.count = badGuesses + 1
      badGuessLabel.innerHTML = 'WRONG: ' + badGuessLabel.dataset.count
    }

    const ratioLabel = document.querySelector(`.guessRatioLabel[data-layerid='${layerID}']`)
    ratioLabel.innerHTML = 'RATIO: ' + (goodGuesses / (goodGuesses + badGuesses)).toFixed(5)
    const bestGuessesLabel = document.querySelector(`.bestGuessesLabel[data-layerid='${layerID}']`)
    bestGuessesLabel.innerHTML = JSON.stringify(bestGuesses) + ' I think it is a: ' + bestGuess + ' ... ' + rightWrong + ' it is a ' + out
  }
}

module.exports = canvasDisplay