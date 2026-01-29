import { wrap } from 'util.misc'

class ElementTextRTE extends HTMLElement {
  connectedCallback() {
    // Wrap tables so they become scrollable on small screens
    this.querySelectorAll('table').forEach((table) => {
      var wrapWith = document.createElement('div')
      wrapWith.classList.add('table-wrapper')
      wrap(table, wrapWith)
    })

    // Wrap video iframe embeds so they are responsive
    this.querySelectorAll('iframe[src*="youtube.com/embed"]').forEach((iframe) => {
      this.wrapVideo(iframe)
    })
    this.querySelectorAll('iframe[src*="player.vimeo"]').forEach((iframe) => {
      this.wrapVideo(iframe)
    })

    // Remove CSS that adds animated underline under image links
    this.querySelectorAll('a img').forEach((img) => {
      img.parentNode.classList.add('rte__image')
    })
  }

  wrapVideo(iframe) {
    // Reset the src attribute on each iframe after page load
    // for Chrome's "incorrect iFrame content on 'back'" bug.
    // https://code.google.com/p/chromium/issues/detail?id=395791
    iframe.src = iframe.src
    var wrapWith = document.createElement('div')
    wrapWith.classList.add('video-wrapper')
    wrap(iframe, wrapWith)
  }
}

customElements.define('element-text-rte', ElementTextRTE)
