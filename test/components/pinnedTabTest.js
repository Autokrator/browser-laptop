/* global describe, it, before */

const Brave = require('../lib/brave')

const messages = require('../../js/constants/messages')
const siteTags = require('../../js/constants/siteTags')
const {urlInput, tabsTabs, pinnedTabsTabs, navigator} = require('../lib/selectors')

function * loadUrl (client, url) {
  yield client.ipcSend('shortcut-focus-url')
    .moveToObject(navigator)
    .moveToObject(urlInput)
    .click(urlInput)
    .waitForElementFocus(urlInput)
    .setValue(urlInput, url)
    // hit enter
    .keys('\uE007')
}

describe('pinnedTabs', function () {
  function * setup (client) {
    yield client
      .waitUntilWindowLoaded()
      .waitForVisible('#window')
      .waitForVisible(urlInput)
  }

  describe('Pins an existing frame', function () {
    Brave.beforeAll(this)
    before(function *() {
      yield setup(this.app.client)
      const page1Url = Brave.server.url('page1.html')
      yield this.app.client
        .ipcSend(messages.SHORTCUT_NEW_FRAME, page1Url)
        .waitForExist('.tab[data-frame-key="2"]')
        .setPinned(2, true)
        .waitUntil(function () {
          return this.elements(pinnedTabsTabs).then((res) => res.value.length === 1)
        })
        .waitUntil(function () {
          return this.elements(tabsTabs).then((res) => res.value.length === 1)
        })
    })
    it('creates when signaled', function *() {
      yield this.app.client
        .waitForExist('.tab.isPinned[data-frame-key="2"]')
    })
    it('unpins and creates a non-pinned tab', function *() {
      yield this.app.client
        .setPinned(2, false)
        .waitForExist('.tab:not(.isPinned)[data-frame-key="2"]')
        .waitUntil(function () {
          return this.elements(pinnedTabsTabs).then((res) => res.value.length === 0)
        })
        .waitUntil(function () {
          return this.elements(tabsTabs).then((res) => res.value.length === 2)
        })
    })
    it('pinning the same site again combines it', function *() {
      const page1Url = Brave.server.url('page1.html')
      yield this.app.client
        .ipcSend(messages.SHORTCUT_NEW_FRAME, page1Url)
        .waitForExist('.tab[data-frame-key="3"]')
        .setPinned(3, true)
        .waitUntil(function () {
          return this.elements(pinnedTabsTabs).then((res) => res.value.length === 1)
        })
        .waitUntil(function () {
          return this.elements(tabsTabs).then((res) => res.value.length === 2)
        })
    })
    it('pinning the same site again with a different session is allowed', function *() {
      const page1Url = Brave.server.url('page1.html')
      yield this.app.client
        .ipcSend(messages.SHORTCUT_NEW_FRAME, page1Url, { isPartitioned: true })
        .waitForExist('.tab[data-frame-key="4"]')
        .setPinned(4, true)
        .waitUntil(function () {
          return this.elements(pinnedTabsTabs).then((res) => res.value.length === 1)
        })
        .waitUntil(function () {
          return this.elements(tabsTabs).then((res) => res.value.length === 2)
        })
    })
  })

  describe('Gets pins from external windows', function () {
    Brave.beforeAll(this)
    before(function *() {
      yield setup(this.app.client)
      const page1Url = Brave.server.url('page1.html')
      const page2Url = Brave.server.url('page2.html')
      yield this.app.client
        .addSite({ location: page1Url }, siteTags.PINNED)
        .waitForExist('.tab.isPinned[data-frame-key="2"]')
        .addSite({ location: page2Url }, siteTags.PINNED)
        .waitForExist('.tab.isPinned[data-frame-key="3"]')
    })
    it('creates when signaled', function *() {
      yield this.app.client.waitUntil(function () {
        return this.elements(pinnedTabsTabs).then((res) => res.value.length === 2)
      })
      .waitUntil(function () {
        return this.elements(tabsTabs).then((res) => res.value.length === 1)
      })
    })
    it('disappears when signaled externally', function *() {
      const page1Url = Brave.server.url('page1.html')
      yield this.app.client
        .removeSite({ location: page1Url }, siteTags.PINNED)
        .waitUntil(function () {
          return this.elements(pinnedTabsTabs).then((res) => res.value.length === 1)
        })
        .waitUntil(function () {
          return this.elements(tabsTabs).then((res) => res.value.length === 1)
        })
    })
    it('Adding a site that already exists does not add another pinned tab', function *() {
      const page2Url = Brave.server.url('page2.html')
      yield this.app.client
        .addSite({ location: page2Url }, siteTags.PINNED)
        .waitUntil(function () {
          return this.elements(pinnedTabsTabs).then((res) => res.value.length === 1)
        })
        .waitUntil(function () {
          return this.elements(tabsTabs).then((res) => res.value.length === 1)
        })
    })
    it('Adding a site with a diff session that already exists is allowed', function *() {
      const page2Url = Brave.server.url('page2.html')
      yield this.app.client
        .addSite({ location: page2Url, partitionNumber: 1 }, siteTags.PINNED)
        .waitUntil(function () {
          return this.elements(pinnedTabsTabs).then((res) => res.value.length === 2)
        })
        .waitUntil(function () {
          return this.elements(tabsTabs).then((res) => res.value.length === 1)
        })
    })
  })

  describe('Pinned tab navigation', function () {
    Brave.beforeAll(this)
    before(function *() {
      yield setup(this.app.client)
      const page1Url = Brave.server.url('page1.html')
      yield this.app.client
        .ipcSend(messages.SHORTCUT_NEW_FRAME, page1Url)
        .waitForExist('.tab[data-frame-key="2"]')
        .setPinned(2, true)
    })
    it('navigate within the same origin', function *() {
      const page2Url = Brave.server.url('page2.html')
      yield loadUrl(this.app.client, page2Url)
      yield this.app.client
        .waitUntil(function () {
          return this.getAttribute('webview[data-frame-key="2"]', 'src').then(src => src === page2Url)
        })
        .waitUntil(function () {
          return this.elements(pinnedTabsTabs).then((res) => res.value.length === 1)
        })
        .waitUntil(function () {
          return this.elements(tabsTabs).then((res) => res.value.length === 1)
        })
    })
    it('navigating to a different origin opens a new tab', function *() {
      const page2Url = Brave.server.url('page2.html').replace('localhost', '127.0.0.1')
      yield loadUrl(this.app.client, page2Url)
      this.app.client.waitForExist('webview[data-frame-key="3"]')
        .waitUntil(function () {
          return this.elements(pinnedTabsTabs).then((res) => res.value.length === 1)
        })
        .waitUntil(function () {
          return this.elements(tabsTabs).then((res) => res.value.length === 2)
        })
    })
  })

  describe('Closing pinned tabs', function () {
    Brave.beforeAll(this)
    before(function *() {
      yield setup(this.app.client)
      const page1Url = Brave.server.url('page1.html')
      const page2Url = Brave.server.url('page2.html')
      yield this.app.client
        .ipcSend(messages.SHORTCUT_NEW_FRAME, page1Url)
        .waitForExist('.tab[data-frame-key="2"]')
        .setPinned(2, true)
        .ipcSend(messages.SHORTCUT_NEW_FRAME, page2Url)
        .waitForExist('.tab[data-frame-key="3"]')
        .setPinned(3, true)
        .waitUntil(function () {
          return this.elements(pinnedTabsTabs).then((res) => res.value.length === 2)
        })
        .waitUntil(function () {
          return this.elements(tabsTabs).then((res) => res.value.length === 1)
        })
    })
    it('close attempt retains pinned tab and selects next active frame', function *() {
      yield this.app.client
        .waitForExist('.tab.active[data-frame-key="3"]')
        .ipcSend(messages.SHORTCUT_CLOSE_FRAME)
        .waitUntil(function () {
          return this.elements(tabsTabs).then((res) => res.value.length === 1)
        })
        .waitForExist('.tab.active[data-frame-key="1"]')
        .ipcSend(messages.SHORTCUT_CLOSE_FRAME)
        .waitUntil(function () {
          return this.elements(pinnedTabsTabs).then((res) => res.value.length === 2)
        })
        .waitUntil(function () {
          return this.elements(tabsTabs).then((res) => res.value.length === 0)
        })
    })
  })
})
