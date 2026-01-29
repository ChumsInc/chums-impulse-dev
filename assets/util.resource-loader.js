export async function loadScript(src, globalObjectName = null) {
  if (globalObjectName && window[globalObjectName]) {
    return window[globalObjectName]
  }

  if (document.querySelector(`script[src="${src}"]`)) {
    console.warn(`Script with src "${src}" is already loaded.`)
    return waitForGlobalObject(globalObjectName)
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = src
    script.async = true

    script.onload = () => {
      if (globalObjectName) {
        waitForGlobalObject(globalObjectName).then(resolve).catch(reject)
      } else {
        resolve()
      }
    }

    script.onerror = () => reject(new Error(`Failed to load script: ${src}`))

    document.head.appendChild(script)
  })
}

export function loadCSS(href) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`link[href="${href}"]`)) {
      console.warn(`CSS with href "${href}" is already loaded.`)
      resolve()
      return
    }

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href

    link.onload = resolve
    link.onerror = () => reject(new Error(`Failed to load CSS: ${href}`))

    const firstLinkTag = document.getElementsByTagName('link')[0]
    if (firstLinkTag) {
      firstLinkTag.parentNode.insertBefore(link, firstLinkTag)
    } else {
      document.head.appendChild(link)
    }
  })
}

function waitForGlobalObject(objectName, maxWait = 2000, interval = 50) {
  const startTime = Date.now()
  return new Promise((resolve, reject) => {
    const checkObject = () => {
      if (window[objectName]) {
        resolve(window[objectName])
      } else if (Date.now() - startTime > maxWait) {
        reject(new Error(`Timeout waiting for ${objectName}`))
      } else {
        setTimeout(checkObject, interval)
      }
    }
    checkObject()
  })
}
