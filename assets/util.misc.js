export function prepareTransition(el, callback) {
  el.addEventListener('transitionend', removeClass)

  function removeClass(evt) {
    el.classList.remove('is-transitioning')
    el.removeEventListener('transitionend', removeClass)
  }

  el.classList.add('is-transitioning')
  el.offsetWidth // check offsetWidth to force the style rendering

  if (typeof callback === 'function') {
    callback()
  }
}

export function defaultTo(value, defaultValue) {
  return value == null || value !== value ? defaultValue : value
}

export function wrap(el, wrapper) {
  el.parentNode.insertBefore(wrapper, el)
  wrapper.appendChild(el)
}

export function executeJSmodules(scripts) {
  for (let i = 0; i < scripts.length; i++) {
    let script = document.createElement('script')
    script.type = 'module'
    script.textContent = scripts[i].textContent
    scripts[i].parentNode.replaceChild(script, scripts[i])
  }
}

export function debounce(wait, callback, immediate) {
  let timeout
  return function () {
    let context = this,
      args = arguments
    let later = function () {
      timeout = null
      if (!immediate) callback.apply(context, args)
    }
    let callNow = immediate && !timeout
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
    if (callNow) callback.apply(context, args)
  }
}

export function throttle(limit, callback) {
  let waiting = false
  return function () {
    if (!waiting) {
      callback.apply(this, arguments)
      waiting = true
      setTimeout(function () {
        waiting = false
      }, limit)
    }
  }
}
