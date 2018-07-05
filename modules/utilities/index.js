const gaussian = require('gaussian')

const utilities = {
  normalDistribution: function normalDistribution (connectionThreshold) {
    const distribution = gaussian(connectionThreshold, Math.sqrt(connectionThreshold))
    return distribution.pdf(Math.random())
  },
  clamp: function clamp (a,b,c) {
    return Math.max(b, Math.min(c, a))
  }
}

module.exports = utilities