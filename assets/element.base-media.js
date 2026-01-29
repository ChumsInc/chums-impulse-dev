import inView from 'vendor.in-view'

export default class extends HTMLElement {
  constructor() {
    super()
    this.player = null
    this.pausedByUser = false
    this.playingWhenLastViewed = false
  }

  connectedCallback() {
    if (!this.hasAttribute('defer-hydration')) {
      this.hydrate()
    }
  }

  async hydrate() {
    const playerTarget = this.getPlayerTarget()
    const handler = {
      get: (target, prop) => {
        return async () => {
          const resolvedTarget = await target
          this.playerHandler(resolvedTarget, prop)
        }
      }
    }

    this.player = new Proxy(playerTarget, handler)
    this.setupInViewHandler()
  }

  setupInViewHandler() {
    inView(this, () => {
      if ((this.autoplay && !this.pausedByUser) || this.playingWhenLastViewed) {
        this.play()
      }
      return () => {
        this.playingWhenLastViewed = this.playing
        this.pause()
      }
    })
  }

  static get observedAttributes() {
    return ['defer-hydration', 'playing']
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'defer-hydration' && newValue === null) {
      this.hydrate()
    } else if (name === 'playing') {
      this.handlePlayingAttributeChange(oldValue, newValue)
    }
  }

  handlePlayingAttributeChange(oldValue, newValue) {
    if (oldValue === null && newValue === '') {
      this.dispatchEvent(new CustomEvent('media:play', { bubbles: true }))
    } else if (newValue === null) {
      this.dispatchEvent(new CustomEvent('media:pause', { bubbles: true }))
    }
  }

  play() {
    this.pausedByUser = false

    if (this.playing) return
    this.player.play()
    this.playingWhenLastViewed = true
  }

  pause() {
    this.pausedByUser = true

    if (!this.playing) return
    this.player.pause()
  }

  getPlayerTarget() {
    throw new Error('getPlayerTarget must be implemented in a subclass')
  }

  playerHandler(target, prop) {
    throw new Error('playerHandler must be implemented in a subclass')
  }

  get playing() {
    return this.hasAttribute('playing')
  }

  get autoplay() {
    return this.hasAttribute('autoplay')
  }
}
