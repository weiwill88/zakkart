const cloud = require('wx-server-sdk')

let initialized = false

function initCloud() {
  if (!initialized) {
    cloud.init({
      env: cloud.DYNAMIC_CURRENT_ENV
    })
    initialized = true
  }
}

function getDb() {
  initCloud()
  return cloud.database()
}

function getCollection(name) {
  return getDb().collection(name)
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function createKeywordRegExp(keyword) {
  const trimmed = String(keyword || '').trim()
  if (!trimmed) {
    return null
  }

  return getDb().RegExp({
    regexp: escapeRegExp(trimmed),
    options: 'i'
  })
}

module.exports = {
  initCloud,
  getDb,
  getCollection,
  createKeywordRegExp,
  get command() {
    return getDb().command
  }
}
