class ParallaxImage extends HTMLElement {
  connectedCallback() {
    this.abortController = new AbortController()
    this.parallaxImage = this.querySelector('[data-parallax-image]')
    this.windowInnerHeight = window.innerHeight
    this.isActive = false
    this.timeout = null
    this.directionMap = {
      right: 0,
      top: 90,
      left: 180,
      bottom: 270
    }
    this.directionMultipliers = {
      0: [1, 0],
      90: [0, -1],
      180: [-1, 0],
      270: [0, 1]
    }


    window.addEventListener('scroll', this.scrollHandler.bind(this), { signal: this.abortController.signal })

    this.init()
  }

  disconnectedCallback() {
    this.abortController.abort()
  }

  getParallaxInfo() {
    const { width, height, top } = this.parallaxImage.getBoundingClientRect()
    let element = this.parallaxImage
    let multipliers
    let { angle, movement } = element.dataset

    let movementPixels =
      angle === 'top'
        ? Math.ceil(height * (parseFloat(movement) / 100))
        : Math.ceil(width * (parseFloat(movement) / 100))

    // angle has shorthands "top", "left", "bottom" and "right"
    // nullish coalescing. using `||` here would fail for `0`
    angle = this.directionMap[angle] ?? parseFloat(angle)

    // fallback if undefined
    // NaN is the only value that doesn't equal itself
    if (angle !== angle) angle = 270 // move to bottom (default parallax effect)
    if (movementPixels !== movementPixels) movementPixels = 100 // 100px

    // check if angle is located in top half and/or left half
    angle %= 360
    if (angle < 0) angle += 360

    const toLeft = angle > 90 && angle < 270
    const toTop = angle < 180

    element.style[toLeft ? 'left' : 'right'] = 0
    element.style[toTop ? 'top' : 'bottom'] = 0

    // if it's not a perfectly horizontal or vertical movement, get cos and sin
    if (angle % 90) {
      const radians = (angle * Math.PI) / 180
      multipliers = [Math.cos(radians), Math.sin(radians) * -1] // only sin has to be inverted
    } else {
      multipliers = this.directionMultipliers[angle]
    }

    // increase width and height according to movement and multipliers
    if (multipliers[0]) element.style.width = `calc(100% + ${movementPixels * Math.abs(multipliers[0])}px)`
    if (multipliers[1]) element.style.height = `calc(100% + ${movementPixels * Math.abs(multipliers[1])}px)`

    return {
      element,
      movementPixels,
      multipliers,
      top,
      height
    }
  }

  init() {
    const { element, movementPixels, multipliers, top, height } = this.getParallaxInfo()

    const scrolledInContainer = this.windowInnerHeight - top
    const scrollArea = this.windowInnerHeight + height
    const progress = scrolledInContainer / scrollArea

    if (progress > -0.1 && progress < 1.1) {
      const position = Math.min(Math.max(progress, 0), 1) * movementPixels
      element.style.transform = `translate3d(${position * multipliers[0]}px, ${position * multipliers[1]}px, 0)`
    }

    if (this.isActive) requestAnimationFrame(this.init.bind(this))
  }

  scrollHandler() {
    if (this.isActive) {
      clearTimeout(this.timeout)
    } else {
      this.isActive = true
      requestAnimationFrame(this.init.bind(this))
    }

    this.timeout = setTimeout(() => (this.isActive = false), 20)
  }
}

customElements.define('parallax-image', ParallaxImage)
