/*
@license
  Impulse by Archetype Themes (https://archetypethemes.co)
  Access unminified JS in assets/theme.js

  Use this event listener to run your own JS outside of this file.
  Documentation - https://archetypethemes.co/blogs/impulse/javascript-events-for-developers

  document.addEventListener('page:loaded', function() {
    // Page has loaded and theme assets are ready
  });
*/

window.theme = window.theme || {};
window.Shopify = window.Shopify || {};

theme.config = {
  bpSmall: false,
  hasSessionStorage: true,
  hasLocalStorage: true,
  mediaQuerySmall: 'screen and (max-width: '+ 769 +'px)',
  youTubeReady: false,
  vimeoReady: false,
  vimeoLoading: false,
  isTouch: ('ontouchstart' in window) || window.DocumentTouch && window.document instanceof DocumentTouch || window.navigator.maxTouchPoints || window.navigator.msMaxTouchPoints ? true : false,
  stickyHeader: false,
  rtl: document.documentElement.getAttribute('dir') == 'rtl' ? true : false
};

if (theme.config.isTouch) {
  document.documentElement.className += ' supports-touch';
}

if (console && console.log) {
  console.log('Impulse theme ('+theme.settings.themeVersion+') by ARCHΞTYPE | Learn more at https://archetypethemes.co');
}

theme.recentlyViewed = {
  recent: {}, // will store handle+url of recent products
  productInfo: {} // will store product data to reduce API calls
};

(function(){
  'use strict';

  theme.delegate = {
    on: function(event, callback, options){
      if( !this.namespaces ) // save the namespaces on the DOM element itself
        this.namespaces = {};
  
      this.namespaces[event] = callback;
      options = options || false;
  
      this.addEventListener(event.split('.')[0], callback, options);
      return this;
    },
    off: function(event) {
      if (!this.namespaces) { return }
      this.removeEventListener(event.split('.')[0], this.namespaces[event]);
      delete this.namespaces[event];
      return this;
    }
  };
  
  // Extend the DOM with these above custom methods
  window.on = Element.prototype.on = theme.delegate.on;
  window.off = Element.prototype.off = theme.delegate.off;
  
  theme.utils = {
    defaultTo: function(value, defaultValue) {
      return (value == null || value !== value) ? defaultValue : value
    },
  
    wrap: function(el, wrapper) {
      el.parentNode.insertBefore(wrapper, el);
      wrapper.appendChild(el);
    },
  
    debounce: function(wait, callback, immediate) {
      var timeout;
      return function() {
        var context = this, args = arguments;
        var later = function() {
          timeout = null;
          if (!immediate) callback.apply(context, args);
        };
        var callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) callback.apply(context, args);
      }
    },
  
    throttle: function(limit, callback) {
      var waiting = false;
      return function () {
        if (!waiting) {
          callback.apply(this, arguments);
          waiting = true;
          setTimeout(function () {
            waiting = false;
          }, limit);
        }
      }
    },
  
    prepareTransition: function(el, callback) {
      el.addEventListener('transitionend', removeClass);
  
      function removeClass(evt) {
        el.classList.remove('is-transitioning');
        el.removeEventListener('transitionend', removeClass);
      }
  
      el.classList.add('is-transitioning');
      el.offsetWidth; // check offsetWidth to force the style rendering
  
      if (typeof callback === 'function') {
        callback();
      }
    },
  
    // _.compact from lodash
    // Creates an array with all falsey values removed. The values `false`, `null`,
    // `0`, `""`, `undefined`, and `NaN` are falsey.
    // _.compact([0, 1, false, 2, '', 3]);
    // => [1, 2, 3]
    compact: function(array) {
      var index = -1,
          length = array == null ? 0 : array.length,
          resIndex = 0,
          result = [];
  
      while (++index < length) {
        var value = array[index];
        if (value) {
          result[resIndex++] = value;
        }
      }
      return result;
    },
  
    serialize: function(form) {
      var arr = [];
      Array.prototype.slice.call(form.elements).forEach(function(field) {
        if (
          !field.name ||
          field.disabled ||
          ['file', 'reset', 'submit', 'button'].indexOf(field.type) > -1
        )
          return;
        if (field.type === 'select-multiple') {
          Array.prototype.slice.call(field.options).forEach(function(option) {
            if (!option.selected) return;
            arr.push(
              encodeURIComponent(field.name) +
                '=' +
                encodeURIComponent(option.value)
            );
          });
          return;
        }
        if (['checkbox', 'radio'].indexOf(field.type) > -1 && !field.checked)
          return;
        arr.push(
          encodeURIComponent(field.name) + '=' + encodeURIComponent(field.value)
        );
      });
      return arr.join('&');
    }
  };
  
  theme.a11y = {
    trapFocus: function(options) {
      var eventsName = {
        focusin: options.namespace ? 'focusin.' + options.namespace : 'focusin',
        focusout: options.namespace
          ? 'focusout.' + options.namespace
          : 'focusout',
        keydown: options.namespace
          ? 'keydown.' + options.namespace
          : 'keydown.handleFocus'
      };
  
      // Get every possible visible focusable element
      var focusableEls = options.container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex^="-"])');
      var elArray = [].slice.call(focusableEls);
      var focusableElements = elArray.filter(el => el.offsetParent !== null);
  
      var firstFocusable = focusableElements[0];
      var lastFocusable = focusableElements[focusableElements.length - 1];
  
      if (!options.elementToFocus) {
        options.elementToFocus = options.container;
      }
  
      options.container.setAttribute('tabindex', '-1');
      options.elementToFocus.focus();
  
      document.documentElement.off('focusin');
      document.documentElement.on(eventsName.focusout, function() {
        document.documentElement.off(eventsName.keydown);
      });
  
      document.documentElement.on(eventsName.focusin, function(evt) {
        if (evt.target !== options.container && evt.target !== lastFocusable && evt.target !== firstFocusable) return;
  
        document.documentElement.on(eventsName.keydown, function(evt) {
          _manageFocus(evt);
        });
      });
  
      function _manageFocus(evt) {
        if (evt.keyCode !== 9) return;
        /**
         * On the first focusable element and tab backward,
         * focus the last element
         */
        if (evt.target === lastFocusable && !evt.shiftKey) {
          evt.preventDefault();
          firstFocusable.focus();
        }
      }
    },
    removeTrapFocus: function(options) {
      var eventName = options.namespace
        ? 'focusin.' + options.namespace
        : 'focusin';
  
      if (options.container) {
        options.container.removeAttribute('tabindex');
      }
  
      document.documentElement.off(eventName);
    },
  
    lockMobileScrolling: function(namespace, element) {
      var el = element ? element : document.documentElement;
      document.documentElement.classList.add('lock-scroll');
      el.on('touchmove' + namespace, function() {
        return true;
      });
    },
  
    unlockMobileScrolling: function(namespace, element) {
      document.documentElement.classList.remove('lock-scroll');
      var el = element ? element : document.documentElement;
      el.off('touchmove' + namespace);
    }
  };
  
  // Add class when tab key starts being used to show outlines
  document.documentElement.on('keyup.tab', function(evt) {
    if (evt.keyCode === 9) {
      document.documentElement.classList.add('tab-outline');
      document.documentElement.off('keyup.tab');
    }
  });
  
  const trapFocusHandlers = {};
  
  /**
   * Currency Helpers
   * -----------------------------------------------------------------------------
   * A collection of useful functions that help with currency formatting
   *
   * Current contents
   * - formatMoney - Takes an amount in cents and returns it as a formatted dollar value.
   *   - When theme.settings.superScriptPrice is enabled, format cents in <sup> tag
   * - getBaseUnit - Splits unit price apart to get value + unit
   *
   */
  
  theme.Currency = (function() {
    var moneyFormat = '${{amount}}';
    var superScript = theme && theme.settings && theme.settings.superScriptPrice;
  
    function formatMoney(cents, format) {
      if (!format) {
        format = theme.settings.moneyFormat;
      }
  
      if (typeof cents === 'string') {
        cents = cents.replace('.', '');
      }
      var value = '';
      var placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
      var formatString = (format || moneyFormat);
  
      function formatWithDelimiters(number, precision, thousands, decimal) {
        precision = theme.utils.defaultTo(precision, 2);
        thousands = theme.utils.defaultTo(thousands, ',');
        decimal = theme.utils.defaultTo(decimal, '.');
  
        if (isNaN(number) || number == null) {
          return 0;
        }
  
        number = (number / 100.0).toFixed(precision);
  
        var parts = number.split('.');
        var dollarsAmount = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + thousands);
        var centsAmount = parts[1] ? (decimal + parts[1]) : '';
  
        return dollarsAmount + centsAmount;
      }
  
      switch (formatString.match(placeholderRegex)[1]) {
        case 'amount':
          value = formatWithDelimiters(cents, 2);
  
          if (superScript && value && value.includes('.')) {
            value = value.replace('.', '<sup>') + '</sup>';
          }
  
          break;
        case 'amount_no_decimals':
          value = formatWithDelimiters(cents, 0);
          break;
        case 'amount_with_comma_separator':
          value = formatWithDelimiters(cents, 2, '.', ',');
  
          if (superScript && value && value.includes(',')) {
            value = value.replace(',', '<sup>') + '</sup>';
          }
  
          break;
        case 'amount_no_decimals_with_comma_separator':
          value = formatWithDelimiters(cents, 0, '.', ',');
          break;
        case 'amount_no_decimals_with_space_separator':
          value = formatWithDelimiters(cents, 0, ' ');
          break;
      }
  
      return formatString.replace(placeholderRegex, value);
    }
  
    function getBaseUnit(variant) {
      if (!variant) {
        return;
      }
  
      if (!variant.unit_price_measurement || !variant.unit_price_measurement.reference_value) {
        return;
      }
  
      return variant.unit_price_measurement.reference_value === 1
        ? variant.unit_price_measurement.reference_unit
        : variant.unit_price_measurement.reference_value +
            variant.unit_price_measurement.reference_unit;
    }
  
    return {
      formatMoney: formatMoney,
      getBaseUnit: getBaseUnit
    }
  })();
  
  theme.Images = (function() {
  
    /**
     * Find the Shopify image attribute size
     */
    function imageSize(src) {
      if (!src) {
        return '620x'; // default based on theme
      }
  
      var match = src.match(/.+_((?:pico|icon|thumb|small|compact|medium|large|grande)|\d{1,4}x\d{0,4}|x\d{1,4})[_\.@]/);
  
      if (match !== null) {
        return match[1];
      } else {
        return null;
      }
    }
  
    /**
     * Adds a Shopify size attribute to a URL
     */
    function getSizedImageUrl(src, size) {
      if (!src) {
        return src;
      }
  
      if (size == null) {
        return src;
      }
  
      if (size === 'master') {
        return this.removeProtocol(src);
      }
  
      var match = src.match(/\.(jpg|jpeg|gif|png|bmp|bitmap|tiff|tif)(\?v=\d+)?$/i);
  
      if (match != null) {
        var prefix = src.split(match[0]);
        var suffix = match[0];
  
        return this.removeProtocol(prefix[0] + '_' + size + suffix);
      }
  
      return null;
    }
  
    function removeProtocol(path) {
      return path.replace(/http(s)?:/, '');
    }
  
    function buildImagePath(string, widths) {
  
      if (string == null) return [];
  
      if (widths) {
        const imageUrls = [];
  
        widths.forEach(width => {
          let url = `${string}?width=${width}`;
          if (width === widths[widths.length - 1]) {
            url += ` ${width}w`
          } else {
            url += ` ${width}w,`
          }
          imageUrls.push(url);
        })
        return imageUrls;
      } else {
        return [string];
      }
    }
  
    return {
      imageSize: imageSize,
      getSizedImageUrl: getSizedImageUrl,
      removeProtocol: removeProtocol,
      buildImagePath: buildImagePath
    };
  })();
  
  // Init section function when it's visible, then disable observer
  theme.initWhenVisible = function (options) {
    var threshold = options.threshold ? options.threshold : 0
  
    var observer = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          if (typeof options.callback === 'function') {
            options.callback()
            observer.unobserve(entry.target)
          }
        }
      })
    }, { rootMargin: '0px 0px ' + threshold + 'px 0px' })
  
    observer.observe(options.element)
  }
  
  theme.LibraryLoader = (function() {
    var types = {
      link: 'link',
      script: 'script'
    };
  
    var status = {
      requested: 'requested',
      loaded: 'loaded'
    };
  
    var cloudCdn = 'https://cdn.shopify.com/shopifycloud/';
  
    var libraries = {
      youtubeSdk: {
        tagId: 'youtube-sdk',
        src: 'https://www.youtube.com/iframe_api',
        type: types.script
      },
      vimeo: {
        tagId: 'vimeo-api',
        src: 'https://player.vimeo.com/api/player.js',
        type: types.script
      },
      shopifyXr: {
        tagId: 'shopify-model-viewer-xr',
        src: cloudCdn + 'shopify-xr-js/assets/v1.0/shopify-xr.en.js',
        type: types.script
      },
      modelViewerUi: {
        tagId: 'shopify-model-viewer-ui',
        src: cloudCdn + 'model-viewer-ui/assets/v1.0/model-viewer-ui.en.js',
        type: types.script
      },
      modelViewerUiStyles: {
        tagId: 'shopify-model-viewer-ui-styles',
        src: cloudCdn + 'model-viewer-ui/assets/v1.0/model-viewer-ui.css',
        type: types.link
      }
    };
  
    function load(libraryName, callback) {
      var library = libraries[libraryName];
  
      if (!library) return;
      if (library.status === status.requested) return;
  
      callback = callback || function() {};
      if (library.status === status.loaded) {
        callback();
        return;
      }
  
      library.status = status.requested;
  
      var tag;
  
      switch (library.type) {
        case types.script:
          tag = createScriptTag(library, callback);
          break;
        case types.link:
          tag = createLinkTag(library, callback);
          break;
      }
  
      tag.id = library.tagId;
      library.element = tag;
  
      var firstScriptTag = document.getElementsByTagName(library.type)[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }
  
    function createScriptTag(library, callback) {
      var tag = document.createElement('script');
      tag.src = library.src;
      tag.addEventListener('load', function() {
        library.status = status.loaded;
        callback();
      });
      return tag;
    }
  
    function createLinkTag(library, callback) {
      var tag = document.createElement('link');
      tag.href = library.src;
      tag.rel = 'stylesheet';
      tag.type = 'text/css';
      tag.addEventListener('load', function() {
        library.status = status.loaded;
        callback();
      });
      return tag;
    }
  
    return {
      load: load
    };
  })();
  
  theme.rteInit = function() {
    // Wrap tables so they become scrollable on small screens
    document.querySelectorAll('.rte table').forEach(table => {
      var wrapWith = document.createElement('div');
      wrapWith.classList.add('table-wrapper');
      theme.utils.wrap(table, wrapWith);
    });
  
    // Wrap video iframe embeds so they are responsive
    document.querySelectorAll('.rte iframe[src*="youtube.com/embed"]').forEach(iframe => {
      wrapVideo(iframe);
    });
    document.querySelectorAll('.rte iframe[src*="player.vimeo"]').forEach(iframe => {
      wrapVideo(iframe);
    });
  
    function wrapVideo(iframe) {
      // Reset the src attribute on each iframe after page load
      // for Chrome's "incorrect iFrame content on 'back'" bug.
      // https://code.google.com/p/chromium/issues/detail?id=395791
      iframe.src = iframe.src;
      var wrapWith = document.createElement('div');
      wrapWith.classList.add('video-wrapper');
      theme.utils.wrap(iframe, wrapWith);
    }
  
    // Remove CSS that adds animated underline under image links
    document.querySelectorAll('.rte a img').forEach(img => {
      img.parentNode.classList.add('rte__image');
    });
  }
  
  theme.Sections = function Sections() {
    this.constructors = {};
    this.instances = [];
  
    document.addEventListener('shopify:section:load', this._onSectionLoad.bind(this));
    document.addEventListener('shopify:section:unload', this._onSectionUnload.bind(this));
    document.addEventListener('shopify:section:select', this._onSelect.bind(this));
    document.addEventListener('shopify:section:deselect', this._onDeselect.bind(this));
    document.addEventListener('shopify:block:select', this._onBlockSelect.bind(this));
    document.addEventListener('shopify:block:deselect', this._onBlockDeselect.bind(this));
  };
  
  theme.Sections.prototype = Object.assign({}, theme.Sections.prototype, {
    _createInstance: function(container, constructor, scope) {
      var id = container.getAttribute('data-section-id');
      var type = container.getAttribute('data-section-type');
  
      constructor = constructor || this.constructors[type];
  
      if (typeof constructor === 'undefined') {
        return;
      }
  
      // If custom scope passed, check to see if instance
      // is already initialized so we don't double up
      if (scope) {
        var instanceExists = this._findInstance(id);
        if (instanceExists) {
          this._removeInstance(id);
        }
      }
  
      // If a section fails to init, handle the error without letting all subsequest section registers to fail
      try {
        var instance = Object.assign(new constructor(container), {
          id: id,
          type: type,
          container: container
        });
        this.instances.push(instance);
      } catch (e) {
        console.error(e);
      }
    },
  
    _findInstance: function(id) {
      for (var i = 0; i < this.instances.length; i++) {
        if (this.instances[i].id === id) {
          return this.instances[i];
        }
      }
    },
  
    _removeInstance: function(id) {
      var i = this.instances.length;
      var instance;
  
      while(i--) {
        if (this.instances[i].id === id) {
          instance = this.instances[i];
          this.instances.splice(i, 1);
          break;
        }
      }
  
      return instance;
    },
  
    _onSectionLoad: function(evt, subSection, subSectionId) {
      if (window.AOS) { AOS.refreshHard() }
      if (theme && theme.initGlobals) {
        theme.initGlobals();
      }
  
      var container = subSection ? subSection : evt.target;
      var section = subSection ? subSection : evt.target.querySelector('[data-section-id]');
  
      if (!section) {
        return;
      }
  
      this._createInstance(section);
  
      var instance = subSection ? subSectionId : this._findInstance(evt.detail.sectionId);
  
      // Check if we have subsections to load
      var haveSubSections = container.querySelectorAll('[data-subsection]');
      if (haveSubSections.length) {
        this.loadSubSections(container);
      }
  
      // Run JS only in case of the section being selected in the editor
      // before merchant clicks "Add"
      if (instance && typeof instance.onLoad === 'function') {
        instance.onLoad(evt);
      }
  
      // Force editor to trigger scroll event when loading a section
      setTimeout(function() {
        window.dispatchEvent(new Event('scroll'));
      }, 200);
    },
  
    _onSectionUnload: function(evt) {
      this.instances = this.instances.filter(function(instance) {
        var isEventInstance = instance.id === evt.detail.sectionId;
  
        if (isEventInstance) {
          if (typeof instance.onUnload === 'function') {
            instance.onUnload(evt);
          }
        }
  
        return !isEventInstance;
      });
    },
  
    loadSubSections: function(scope) {
      if (!scope) {
        return;
      }
  
      var sections = scope.querySelectorAll('[data-section-id]');
  
      sections.forEach(el => {
        this._onSectionLoad(null, el, el.dataset.sectionId);
      });
    },
  
    _onSelect: function(evt) {
      var instance = this._findInstance(evt.detail.sectionId);
  
      if (
        typeof instance !== 'undefined' &&
        typeof instance.onSelect === 'function'
      ) {
        instance.onSelect(evt);
      }
    },
  
    _onDeselect: function(evt) {
      var instance = this._findInstance(evt.detail.sectionId);
  
      if (
        typeof instance !== 'undefined' &&
        typeof instance.onDeselect === 'function'
      ) {
        instance.onDeselect(evt);
      }
    },
  
    _onBlockSelect: function(evt) {
      var instance = this._findInstance(evt.detail.sectionId);
  
      if (
        typeof instance !== 'undefined' &&
        typeof instance.onBlockSelect === 'function'
      ) {
        instance.onBlockSelect(evt);
      }
    },
  
    _onBlockDeselect: function(evt) {
      var instance = this._findInstance(evt.detail.sectionId);
  
      if (
        typeof instance !== 'undefined' &&
        typeof instance.onBlockDeselect === 'function'
      ) {
        instance.onBlockDeselect(evt);
      }
    },
  
    register: function(type, constructor, scope) {
      this.constructors[type] = constructor;
  
      var sections = document.querySelectorAll('[data-section-type="' + type + '"]');
  
      if (scope) {
        sections = scope.querySelectorAll('[data-section-type="' + type + '"]');
      }
  
      sections.forEach(
        function(container) {
          this._createInstance(container, constructor, scope);
        }.bind(this)
      );
    },
  
    reinit: function(section) {
      for (var i = 0; i < this.instances.length; i++) {
        var instance = this.instances[i];
        if (instance['type'] === section) {
          if (typeof instance.forceReload === 'function') {
            instance.forceReload();
          }
        }
      }
    }
  });
  
  /*
    Options:
      container
      enableHistoryState - enable when on single product page to update URL
      singleOptionSelector - selector for individual variant option (e.g. 'Blue' or 'Small')
      originalSelectorId - selector for base variant selector (visually hidden)
      variants - JSON parsed object of product variant info
   */
  theme.Variants = (function() {
  
    function Variants(options) {
      this.container = options.container;
      this.variants = options.variants;
      this.singleOptionSelector = options.singleOptionSelector;
      this.originalSelectorId = options.originalSelectorId;
      this.enableHistoryState = options.enableHistoryState;
      this.dynamicVariantsEnabled = options.dynamicVariantsEnabled;
      this.currentlySelectedValues = this._getCurrentOptions();
      this.currentVariant = this._getVariantFromOptions();
  
      this.container.querySelectorAll(this.singleOptionSelector).forEach(el => {
        el.addEventListener('change', this._onSelectChange.bind(this));
      });
    }
  
    Variants.prototype = Object.assign({}, Variants.prototype, {
  
      _getCurrentOptions: function() {
        var result = [];
  
        this.container.querySelectorAll(this.singleOptionSelector).forEach(el => {
          var type = el.getAttribute('type');
  
          if (type === 'radio' || type === 'checkbox') {
            if (el.checked) {
              result.push({
                value: el.value,
                index: el.dataset.index
              });
            }
          } else {
            result.push({
              value: el.value,
              index: el.dataset.index
            });
          }
        });
  
        // remove any unchecked input values if using radio buttons or checkboxes
        result = theme.utils.compact(result);
  
        return result;
      },
  
      // Pull the number out of the option index name, e.g. 'option1' -> 1
      _numberFromOptionKey: function(key) {
        return parseInt(key.substr(-1));
      },
  
      // Options should be ordered from highest to lowest priority. Make sure that priority
      // is represented using weighted values when finding best match
      _getWeightedOptionMatchCount: function(variant) {
        return this._getCurrentOptions().reduce((count, {value, index}) => {
          const optionIndex = this._numberFromOptionKey(index);
          const weightedCount = 4 - optionIndex; // The lower the index, the better the match we have
          return variant[index] === value ? count + weightedCount : count;
        },0)
      },
  
      _getFullMatch(needsToBeAvailable) {
        const currentlySelectedOptions = this._getCurrentOptions();
        const variants = this.variants;
  
        return variants.find(variant => {
          const isMatch = currentlySelectedOptions.every(({value, index}) => {
            return variant[index] === value;
          });
  
          if (needsToBeAvailable) {
            return isMatch && variant.available;
          } else {
            return isMatch;
          }
        });
      },
  
      // Find a variant that is available and best matches last selected option
      _getClosestAvailableMatch: function(lastSelectedOption) {
        if (!lastSelectedOption) return null;
  
        const currentlySelectedOptions = this._getCurrentOptions();
        const variants = this.variants;
  
        const potentialAvailableMatches = lastSelectedOption && variants.filter(variant => {
          return currentlySelectedOptions
            .filter(
              // Only match based selected options that are equal and preceeding the last selected option
              ({value, index}) => this._numberFromOptionKey(index) <= this._numberFromOptionKey(lastSelectedOption.index)
            ).every(({value, index}) => {
              // Variant needs to have options that match the current and preceeding selection options
              return variant[index] === value;
            }) && variant.available
        });
  
        return potentialAvailableMatches.reduce((bestMatch, variant) => {
          // If this is the first potential match we've found, store it as the best match
          if (bestMatch === null) return variant;
  
          // If this is not the first potential match, compare the number of options our current best match has in common
          // compared to the next contender.
          const bestMatchCount = this._getWeightedOptionMatchCount(bestMatch, lastSelectedOption);
          const newCount = this._getWeightedOptionMatchCount(variant, lastSelectedOption);
  
          return newCount > bestMatchCount ? variant : bestMatch;
        }, null);
      },
  
      _getVariantFromOptions: function(lastSelectedOption) {
        const availableFullMatch = this._getFullMatch(true);
        const closestAvailableMatch = this._getClosestAvailableMatch(lastSelectedOption);
        const fullMatch = this._getFullMatch(false);
  
        if (this.dynamicVariantsEnabled) {
          // Add some additional smarts to variant matching if Dynamic Variants are enabled
          return availableFullMatch || closestAvailableMatch || fullMatch || null;
        } else {
          // Only return a full match or null (variant doesn't exist) if Dynamic Variants are disabled
          return fullMatch || null;
        }
  
      },
  
      _updateInputState: function (variant, el) {
        return (input) => {
          if (variant === null) return;
  
          const index = input.dataset.index;
          const value = input.value;
          const type = input.getAttribute('type');
  
          if (type === 'radio' || type === 'checkbox') {
            input.checked = variant[index] === value
            if (input.checked) {
              input.dispatchEvent(new Event('updateSwatch'));
            }
          } else {
            input.value = variant[index];
          }
        }
      },
  
      _onSelectChange: function({srcElement}) {
        const optionSelectElements = this.container.querySelectorAll(this.singleOptionSelector);
  
        // Get the best variant based on the current selection + last selected element
        const variant = this._getVariantFromOptions({
          index: srcElement.dataset.index,
          value: srcElement.value
        });
  
        // Update DOM option input states based on the variant that was found
        optionSelectElements.forEach(this._updateInputState(variant, srcElement))
  
        // Make sure our currently selected values are up to date after updating state of DOM
        const currentlySelectedValues = this.currentlySelectedValues = this._getCurrentOptions();
  
        const detail = {
          variant,
          currentlySelectedValues,
          value: srcElement.value,
          index: srcElement.parentElement.dataset.index
        }
  
        this.container.dispatchEvent(new CustomEvent('variantChange', {detail}));
        document.dispatchEvent(new CustomEvent('variant:change', {detail}));
  
        if (!variant) {
          return;
        }
  
        this._updateMasterSelect(variant);
        this._updateImages(variant);
        this._updatePrice(variant);
        this._updateUnitPrice(variant);
        this._updateSKU(variant);
        this.currentVariant = variant;
  
        if (this.enableHistoryState) {
          this._updateHistoryState(variant);
        }
      },
  
      _updateImages: function(variant) {
        if (!variant.featured_image) {
          return;
        }
  
        this.container.dispatchEvent(new CustomEvent('variantImageChange', {
          detail: {
            variant: variant
          }
        }));
      },
  
      _updatePrice: function(variant) {
        if (this.currentVariant && variant.price === this.currentVariant.price && variant.compare_at_price === this.currentVariant.compare_at_price) {
          return;
        }
  
        this.container.dispatchEvent(new CustomEvent('variantPriceChange', {
          detail: {
            variant: variant
          }
        }));
      },
  
      _updateUnitPrice: function(variant) {
        if (this.currentVariant && variant.unit_price === this.currentVariant.unit_price) {
          return;
        }
  
        this.container.dispatchEvent(new CustomEvent('variantUnitPriceChange', {
          detail: {
            variant: variant
          }
        }));
      },
  
      _updateSKU: function(variant) {
        if (this.currentVariant && variant.sku === this.currentVariant.sku) {
          return;
        }
  
        this.container.dispatchEvent(new CustomEvent('variantSKUChange', {
          detail: {
            variant: variant
          }
        }));
      },
  
      _updateHistoryState: function(variant) {
        if (!history.replaceState || !variant) {
          return;
        }
  
        var newurl = window.location.protocol + '//' + window.location.host + window.location.pathname + '?variant=' + variant.id;
        window.history.replaceState({path: newurl}, '', newurl);
      },
  
      _updateMasterSelect: function(variant) {
        let masterSelect = this.container.querySelector(this.originalSelectorId);
        if (!masterSelect) return;
  
        masterSelect.value = variant.id;
        // Force a change event so Shop Pay installments works after a variant is changed
        masterSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  
    return Variants;
  })();
  
  window.vimeoApiReady = function () {
    theme.config.vimeoLoading = true
  
    // Because there's no way to check for the Vimeo API being loaded
    // asynchronously, we use this terrible timeout to wait for it being ready
    checkIfVimeoIsReady()
      .then(function () {
        theme.config.vimeoReady = true
        theme.config.vimeoLoading = false
        document.dispatchEvent(new CustomEvent('vimeoReady'))
      })
  }
  
  function checkIfVimeoIsReady () {
    let wait
    let timeout
  
    return new Promise((resolve, reject) => {
      wait = setInterval(function () {
        if (!Vimeo) {
          return
        }
  
        clearInterval(wait)
        clearTimeout(timeout)
        resolve()
      }, 500)
  
      timeout = setTimeout(function () {
        clearInterval(wait)
        reject()
      }, 4000) // subjective. test up to 8 times over 4 seconds
    })
  }
  
  theme.VimeoPlayer = (function () {
    const classes = {
      loading: 'loading',
      loaded: 'loaded',
      interactable: 'video-interactable'
    }
  
    const defaults = {
      byline: false,
      loop: true,
      muted: true,
      playsinline: true,
      portrait: false,
      title: false
    }
  
    function VimeoPlayer (divId, videoId, options) {
      this.divId = divId
      this.el = document.getElementById(divId)
      this.videoId = videoId
      this.iframe = null
      this.options = options
  
      if (this.options && this.options.videoParent) {
        this.parent = this.el.closest(this.options.videoParent)
      }
  
      this.setAsLoading()
  
      if (theme.config.vimeoReady) {
        this.init()
      } else {
        theme.LibraryLoader.load('vimeo', window.vimeoApiReady)
        document.addEventListener('vimeoReady', this.init.bind(this))
      }
    }
  
    VimeoPlayer.prototype = Object.assign({}, VimeoPlayer.prototype, {
      init: function () {
        const args = defaults
        args.id = this.videoId
  
        this.videoPlayer = new Vimeo.Player(this.el, args)
  
        this.videoPlayer.ready().then(this.playerReady.bind(this))
      },
  
      playerReady: function () {
        this.iframe = this.el.querySelector('iframe')
        this.iframe.setAttribute('tabindex', '-1')
  
        if (this.options.loop === 'false') {
          this.videoPlayer.setLoop(false)
        }
  
        // When sound is enabled in section settings,
        // for some mobile browsers Vimeo video playback
        // will stop immediately after starting and
        // will require users to tap the play button once more
        if (this.options.style === 'sound') {
          this.videoPlayer.setVolume(1)
        } else {
          this.videoPlayer.setVolume(0)
        }
  
        this.setAsLoaded()
  
        // pause when out of view
        const observer = new IntersectionObserver((entries, observer) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              this.play()
            } else {
              this.pause()
            }
          })
        }, { rootMargin: '0px 0px 50px 0px' })
  
        observer.observe(this.iframe)
      },
  
      setAsLoading: function () {
        if (!this.parent) return
        this.parent.classList.add(classes.loading)
      },
  
      setAsLoaded: function () {
        if (!this.parent) return
        this.parent.classList.remove(classes.loading)
        this.parent.classList.add(classes.loaded)
        this.parent.classList.add(classes.interactable) // Once video is loaded, we should be able to interact with it
        if (Shopify && Shopify.designMode) {
          if (window.AOS) {AOS.refreshHard()}
        }
      },
  
      enableInteraction: function () {
        if (!this.parent) return
        this.parent.classList.add(classes.interactable)
      },
  
      play: function () {
        if (this.videoPlayer && typeof this.videoPlayer.play === 'function') {
          this.videoPlayer.play()
        }
      },
  
      pause: function () {
        if (this.videoPlayer && typeof this.videoPlayer.pause === 'function') {
          this.videoPlayer.pause()
        }
      },
  
      destroy: function () {
        if (this.videoPlayer && typeof this.videoPlayer.destroy === 'function') {
          this.videoPlayer.destroy()
        }
      }
    })
  
    return VimeoPlayer
  })()
  
  window.onYouTubeIframeAPIReady = function() {
    theme.config.youTubeReady = true;
    document.dispatchEvent(new CustomEvent('youTubeReady'));
  }
  
  /*============================================================================
    YouTube SDK method
    Parameters:
      - player div id (required)
      - arguments
        - videoId (required)
        - videoParent (selector, optional for section loading state)
        - events (object, optional)
  ==============================================================================*/
  theme.YouTube = (function() {
    var classes = {
      loading: 'loading',
      loaded: 'loaded',
      interactable: 'video-interactable'
    }
  
    var defaults = {
      width: 1280,
      height: 720,
      playerVars: {
        autohide: 0,
        autoplay: 1,
        cc_load_policy: 0,
        controls: 0,
        fs: 0,
        iv_load_policy: 3,
        modestbranding: 1,
        playsinline: 1,
        rel: 0
      }
    };
  
    function YouTube(divId, options) {
      this.divId = divId;
      this.iframe = null;
  
      this.attemptedToPlay = false;
  
      // API callback events
      defaults.events = {
        onReady: this.onVideoPlayerReady.bind(this),
        onStateChange: this.onVideoStateChange.bind(this)
      };
  
      this.options = Object.assign({}, defaults, options);
  
      if (this.options) {
        if (this.options.videoParent) {
          this.parent = document.getElementById(this.divId).closest(this.options.videoParent);
        }
  
        // Most YT videos will autoplay. If in product media,
        // will handle in theme.Product instead
        if (!this.options.autoplay) {
          this.options.playerVars.autoplay = this.options.autoplay;
        }
  
        if (this.options.style === 'sound') {
          this.options.playerVars.controls = 1;
          this.options.playerVars.autoplay = 0;
        }
  
      }
  
      this.setAsLoading();
  
      if (theme.config.youTubeReady) {
        this.init();
      } else {
        theme.LibraryLoader.load('youtubeSdk');
        document.addEventListener('youTubeReady', this.init.bind(this));
      }
    }
  
    YouTube.prototype = Object.assign({}, YouTube.prototype, {
      init: function() {
        this.videoPlayer = new YT.Player(this.divId, this.options);
      },
  
      onVideoPlayerReady: function(evt) {
        this.iframe = document.getElementById(this.divId); // iframe once YT loads
        this.iframe.setAttribute('tabindex', '-1');
  
        if (this.options.style !== 'sound') {
          evt.target.mute();
        }
  
        // pause when out of view
        var observer = new IntersectionObserver((entries, observer) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              this.play();
            } else {
              this.pause();
            }
          });
        }, {rootMargin: '0px 0px 50px 0px'});
  
        observer.observe(this.iframe);
      },
  
      onVideoStateChange: function(evt) {
        switch (evt.data) {
          case -1: // unstarted
            // Handle low power state on iOS by checking if
            // video is reset to unplayed after attempting to buffer
            if (this.attemptedToPlay) {
              this.setAsLoaded();
              this.enableInteraction();
            }
            break;
          case 0: // ended, loop it
            this.play(evt);
            break;
          case 1: // playing
            this.setAsLoaded();
            break;
          case 3: // buffering
            this.attemptedToPlay = true;
            break;
        }
      },
  
      setAsLoading: function() {
        if (!this.parent) return;
        this.parent.classList.add(classes.loading);
      },
  
      setAsLoaded: function() {
        if (!this.parent) return;
        this.parent.classList.remove(classes.loading);
        this.parent.classList.add(classes.loaded);
        if (Shopify && Shopify.designMode) {
          if (window.AOS) {AOS.refreshHard()}
        }
      },
  
      enableInteraction: function() {
        if (!this.parent) return;
        this.parent.classList.add(classes.interactable);
      },
  
      play: function() {
        if (this.videoPlayer && typeof this.videoPlayer.playVideo === 'function') {
          this.videoPlayer.playVideo();
        }
      },
  
      pause: function() {
        if (this.videoPlayer && typeof this.videoPlayer.pauseVideo === 'function') {
          this.videoPlayer.pauseVideo();
        }
      },
  
      destroy: function() {
        if (this.videoPlayer && typeof this.videoPlayer.destroy === 'function') {
          this.videoPlayer.destroy();
        }
      }
    });
  
    return YouTube;
  })();
  
  // Prevent vertical scroll while using flickity sliders
  (function() {
    var e = !1;
    var t;
  
    document.body.addEventListener('touchstart', function(i) {
      if (!i.target.closest('.flickity-slider')) {
        return e = !1;
        void 0;
      }
      e = !0;
      t = {
        x: i.touches[0].pageX,
        y: i.touches[0].pageY
      }
    })
  
    document.body.addEventListener('touchmove', function(i) {
      if (e && i.cancelable) {
        var n = {
          x: i.touches[0].pageX - t.x,
          y: i.touches[0].pageY - t.y
        };
        Math.abs(n.x) > Flickity.defaults.dragThreshold && i.preventDefault()
      }
    }, { passive: !1 })
  })();
  

  /**
   * Ajax Renderer
   * -----------------------------------------------------------------------------
   * Render sections without reloading the page.
   * @param {Object[]} sections - The section to update on render.
   * @param {string} sections[].sectionId - The ID of the section from Shopify.
   * @param {string} sections[].nodeId - The ID of the DOM node to replace.
   * @param {Function} sections[].onReplace (optional) - The custom render function.
   * @param {boolean} debug - Output logs to console for debugging.
   *
   */
  
  theme.AjaxRenderer = (function () {
    function AjaxRenderer({ sections, onReplace, debug } = {}) {
      this.sections = sections || [];
      this.cachedSections = [];
      this.onReplace = onReplace;
      this.debug = Boolean(debug);
    }
  
    AjaxRenderer.prototype = Object.assign({}, AjaxRenderer.prototype, {
      renderPage: function (basePath, newParams, updateURLHash = true) {
        const currentParams = new URLSearchParams(window.location.search);
        const updatedParams = this.getUpdatedParams(currentParams, newParams)
  
        const sectionRenders = this.sections.map(section => {
  
          const url = `${basePath}?section_id=${section.sectionId}&${updatedParams.toString()}`;
          const cachedSectionUrl = cachedSection => cachedSection.url === url;
  
          return this.cachedSections.some(cachedSectionUrl)
            ? this.renderSectionFromCache(cachedSectionUrl, section)
            : this.renderSectionFromFetch(url, section);
        });
  
        if (updateURLHash) this.updateURLHash(updatedParams);
  
        return Promise.all(sectionRenders);
      },
  
      renderSectionFromCache: function (url, section) {
        const cachedSection = this.cachedSections.find(url);
  
        this.log(`[AjaxRenderer] rendering from cache: url=${cachedSection.url}`);
        this.renderSection(cachedSection.html, section);
        return Promise.resolve(section);
      },
  
      renderSectionFromFetch: function (url, section) {
        this.log(`[AjaxRenderer] redering from fetch: url=${url}`);
  
        return new Promise((resolve, reject) => {
          fetch(url)
            .then(response => response.text())
            .then(responseText => {
              const html = responseText;
              this.cachedSections = [...this.cachedSections, { html, url }];
              this.renderSection(html, section);
              resolve(section);
            })
            .catch(err => reject(err));
        });
      },
  
      renderSection: function (html, section) {
        this.log(
          `[AjaxRenderer] rendering section: section=${JSON.stringify(section)}`,
        );
  
        const newDom = new DOMParser().parseFromString(html, 'text/html');
        if (this.onReplace) {
          this.onReplace(newDom, section);
        } else {
          if (typeof section.nodeId === 'string') {
            var newContentEl = newDom.getElementById(section.nodeId);
            if (!newContentEl) {
              return;
            }
  
            document.getElementById(section.nodeId).innerHTML =
              newContentEl.innerHTML;
          } else {
            section.nodeId.forEach(id => {
              document.getElementById(id).innerHTML =
                newDom.getElementById(id).innerHTML;
            });
          }
        }
  
        return section;
      },
  
      getUpdatedParams: function (currentParams, newParams) {
        const clone = new URLSearchParams(currentParams);
        const preservedParams = ['sort_by', 'q', 'options[prefix]', 'type'];
  
        // Find what params need to be removed
        // delete happens first as we cannot specify keys based off of values
        for (const [key, value] of clone.entries()) {
          if (!newParams.getAll(key).includes(value) && !preservedParams.includes(key)) {
            clone.delete(key);
          };
        }
  
        // Find what params need to be added
        for (const [key, value] of newParams.entries()) {
          if (!clone.getAll(key).includes(value) && value !== '') {
            clone.append(key, value);
          }
        }
  
        return clone;
      },
  
      updateURLHash: function (searchParams) {
        history.pushState(
          {},
          '',
          `${window.location.pathname}${
            searchParams && '?'.concat(searchParams)
          }`,
        );
      },
  
      log: function (...args) {
        if (this.debug) {
          console.log(...args);
        }
      },
    });
  
    return AjaxRenderer;
  })();
  
  if (window.Shopify && window.Shopify.theme && navigator && navigator.sendBeacon && window.Shopify.designMode) {
    navigator.sendBeacon('https://api.archetypethemes.co/api/beacon', new URLSearchParams({
      shop: window.Shopify.shop,
      themeName: window.theme && window.theme.settings && `${window.theme.settings.themeName} v${window.theme.settings.themeVersion}`,
      role: window.Shopify.theme.role,
      route: window.location.pathname,
      themeId: window.Shopify.theme.id,
      themeStoreId: window.Shopify.theme.theme_store_id || 0,
      isThemeEditor: !!window.Shopify.designMode
    }))
  }
  theme.cart = {
    getCart: function() {
      var url = ''.concat(theme.routes.cart, '?t=').concat(Date.now());
      return fetch(url, {
        credentials: 'same-origin',
        method: 'GET'
      }).then(response => response.json());
    },
  
    getCartProductMarkup: function() {
      var url = ''.concat(theme.routes.cartPage, '?t=').concat(Date.now());
  
      url = url.indexOf('?') === -1 ? (url + '?view=ajax') : (url + '&view=ajax');
  
      return fetch(url, {
        credentials: 'same-origin',
        method: 'GET'
      })
      .then(response => response.text())
      .catch(e => console.error(e));
    },
  
    changeItem: function(key, qty) {
  
      return this._updateCart({
        url: ''.concat(theme.routes.cartChange, '?t=').concat(Date.now()),
        data: JSON.stringify({
          id: key,
          quantity: qty
        })
      })
    },
  
    _updateCart: function(params) {
      return fetch(params.url, {
        method: 'POST',
        body: params.data,
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': 'application/json'
        }
      })
      .then(response => { return response.text() })
      .then(cart => { return cart; });
    },
  
    updateAttribute: function(key, value) {
      return this._updateCart({
        url: '/cart/update.js',
        data: JSON.stringify({
          attributes: {
            [key]: theme.cart.attributeToString(value)
          }
        })
      });
    },
  
    updateNote: function(note) {
      return this._updateCart({
        url: '/cart/update.js',
        data: JSON.stringify({
          note: theme.cart.attributeToString(note)
        })
      });
    },
  
    attributeToString: function(attribute) {
      if ((typeof attribute) !== 'string') {
        attribute += '';
        if (attribute === 'undefined') {
          attribute = '';
        }
      }
      return attribute.trim();
    }
  }
  
  /*============================================================================
    CartForm
    - Prevent checkout when terms checkbox exists
    - Listen to quantity changes, rebuild cart (both widget and page)
  ==============================================================================*/
  theme.CartForm = (function() {
    var selectors = {
      products: '[data-products]',
      qtySelector: '.js-qty__wrapper',
      discounts: '[data-discounts]',
      savings: '[data-savings]',
      subTotal: '[data-subtotal]',
  
      cartBubble: '.cart-link__bubble',
      cartNote: '[name="note"]',
      termsCheckbox: '.cart__terms-checkbox',
      checkoutBtn: '.cart__checkout'
    };
  
    var classes = {
      btnLoading: 'btn--loading'
    };
  
    var config = {
      requiresTerms: false
    };
  
    function CartForm(form) {
      if (!form) {
        return;
      }
  
      this.form = form;
      this.wrapper = form.parentNode;
      this.location = form.dataset.location;
      this.namespace = '.cart-' + this.location;
      this.products = form.querySelector(selectors.products)
      this.submitBtn = form.querySelector(selectors.checkoutBtn);
  
      this.discounts = form.querySelector(selectors.discounts);
      this.savings = form.querySelector(selectors.savings);
      this.subtotal = form.querySelector(selectors.subTotal);
      this.termsCheckbox = form.querySelector(selectors.termsCheckbox);
      this.noteInput = form.querySelector(selectors.cartNote);
  
      this.cartItemsUpdated = false;
  
      if (this.termsCheckbox) {
        config.requiresTerms = true;
      }
  
      this.init();
    }
  
    CartForm.prototype = Object.assign({}, CartForm.prototype, {
      init: function() {
        this.initQtySelectors();
  
        document.addEventListener('cart:quantity' + this.namespace, this.quantityChanged.bind(this));
  
        this.form.on('submit' + this.namespace, this.onSubmit.bind(this));
  
        if (this.noteInput) {
          this.noteInput.addEventListener('change', function() {
            var newNote = this.value;
            theme.cart.updateNote(newNote);
          });
        }
  
        // Dev-friendly way to build the cart
        document.addEventListener('cart:build', function() {
          this.buildCart();
        }.bind(this));
      },
  
      reInit: function() {
        this.initQtySelectors();
      },
  
      onSubmit: function(evt) {
        this.submitBtn.classList.add(classes.btnLoading);
  
        /*
          Checks for drawer or cart open class on body element
          and then stops the form from being submitted. We are also
          checking against a custom property, this.cartItemsUpdated = false.
  
          Error is handled in the quantityChanged method
  
          For Expanse/Fetch/Gem quick add, if an error is present it is alerted
          through the add to cart fetch request in quick-add.js.
  
          Custom property this.cartItemsUpdated = false is reset in cart-drawer.js for
          Expanse/Fetch/Gem when using quick add
        */
  
        if (document.documentElement.classList.contains('js-drawer-open') && this.cartItemsUpdated ||
          document.documentElement.classList.contains('cart-open') && this.cartItemsUpdated) {
          this.submitBtn.classList.remove(classes.btnLoading);
          evt.preventDefault();
          return false;
        }
  
        if (config.requiresTerms) {
          if (this.termsCheckbox.checked) {
            // continue to checkout
          } else {
            alert(theme.strings.cartTermsConfirmation);
            this.submitBtn.classList.remove(classes.btnLoading)
            evt.preventDefault();
            return false;
          }
        }
      },
  
      /*============================================================================
        Query cart page to get markup
      ==============================================================================*/
      _parseProductHTML: function(text) {
        const html = document.createElement('div');
        html.innerHTML = text;
  
        return {
          items: html.querySelector('.cart__items'),
          discounts: html.querySelector('.cart__discounts')
        }
      },
  
      buildCart: function() {
        theme.cart.getCartProductMarkup().then(this.cartMarkup.bind(this));
      },
  
      cartMarkup: function(text) {
        var markup = this._parseProductHTML(text);
        var items = markup.items;
        var count = parseInt(items.dataset.count);
        var subtotal = items.dataset.cartSubtotal;
        var savings = items.dataset.cartSavings;
  
        this.updateCartDiscounts(markup.discounts);
        this.updateSavings(savings);
  
        if (count > 0) {
          this.wrapper.classList.remove('is-empty');
        } else {
          this.wrapper.classList.add('is-empty');
        }
  
        this.updateCount(count);
  
        // Append item markup
        this.products.innerHTML = '';
        this.products.append(items);
  
        // Update subtotal
        this.subtotal.innerHTML = theme.Currency.formatMoney(subtotal, theme.settings.moneyFormat);
  
        this.reInit();
  
        if (window.AOS) { AOS.refreshHard() }
  
        if (Shopify && Shopify.StorefrontExpressButtons) {
          Shopify.StorefrontExpressButtons.initialize();
        }
      },
  
      updateCartDiscounts: function(markup) {
        if (!this.discounts) {
          return;
        }
        this.discounts.innerHTML = '';
        this.discounts.append(markup);
      },
  
      /*============================================================================
        Quantity handling
      ==============================================================================*/
      initQtySelectors: function() {
        this.form.querySelectorAll(selectors.qtySelector).forEach(el => {
          var selector = new theme.QtySelector(el, {
            namespace: this.namespace,
            isCart: true
          });
        });
      },
  
      quantityChanged: function(evt) {
        var key = evt.detail[0];
        var qty = evt.detail[1];
        var el = evt.detail[2];
  
        if (!key || !qty) {
          return;
        }
  
        // Disable qty selector so multiple clicks can't happen while loading
        if (el) {
          el.classList.add('is-loading');
        }
  
        theme.cart.changeItem(key, qty)
          .then(function(cart) {
  
            const parsedCart = JSON.parse(cart);
  
            if (parsedCart.status === 422) {
              alert(parsedCart.message);
            } else {
              const updatedItem = parsedCart.items.find(item => item.key === key);
  
              // Update cartItemsUpdated property on object so we can reference later
              if (updatedItem && (evt.type === 'cart:quantity.cart-cart-drawer' || evt.type === 'cart:quantity.cart-header')) {
                this.cartItemsUpdated = true;
              }
  
              if ((updatedItem && evt.type === 'cart:quantity.cart-cart-drawer') || (updatedItem && evt.type === 'cart:quantity.cart-header')) {
                if (updatedItem.quantity !== qty) {
                }
                // Reset property on object so that checkout button will work as usual
                this.cartItemsUpdated = false;
              }
  
              if (parsedCart.item_count > 0) {
                this.wrapper.classList.remove('is-empty');
              } else {
                this.wrapper.classList.add('is-empty');
              }
            }
  
            this.buildCart();
  
            document.dispatchEvent(new CustomEvent('cart:updated', {
              detail: {
                cart: parsedCart
              }
            }));
          }.bind(this))
          .catch(function(XMLHttpRequest){});
      },
  
      /*============================================================================
        Update elements of the cart
      ==============================================================================*/
      updateSubtotal: function(subtotal) {
        this.form.querySelector(selectors.subTotal).innerHTML = theme.Currency.formatMoney(subtotal, theme.settings.moneyFormat);
      },
  
      updateSavings: function(savings) {
        if (!this.savings) {
          return;
        }
  
        if (savings > 0) {
          var amount = theme.Currency.formatMoney(savings, theme.settings.moneyFormat);
          this.savings.classList.remove('hide');
          this.savings.innerHTML = theme.strings.cartSavings.replace('[savings]', amount);
        } else {
          this.savings.classList.add('hide');
        }
      },
  
      updateCount: function(count) {
        var countEls = document.querySelectorAll('.cart-link__bubble-num');
  
        if (countEls.length) {
          countEls.forEach(el => {
            el.innerText = count;
          });
        }
  
        // show/hide bubble(s)
        var bubbles = document.querySelectorAll(selectors.cartBubble);
        if (bubbles.length) {
          if (count > 0) {
            bubbles.forEach(b => {
              b.classList.add('cart-link__bubble--visible');
            });
          } else {
            bubbles.forEach(b => {
              b.classList.remove('cart-link__bubble--visible');
            });
          }
        }
      }
    });
  
    return CartForm;
  })();
  
  // Either collapsible containers all acting individually,
  // or tabs that can only have one open at a time
  theme.collapsibles = (function() {
    var selectors = {
      trigger: '.collapsible-trigger',
      module: '.collapsible-content',
      moduleInner: '.collapsible-content__inner',
      tabs: '.collapsible-trigger--tab'
    };
  
    var classes = {
      hide: 'hide',
      open: 'is-open',
      autoHeight: 'collapsible--auto-height',
      tabs: 'collapsible-trigger--tab'
    };
  
    var namespace = '.collapsible';
  
    var isTransitioning = false;
  
    function init(scope) {
      var el = scope ? scope : document;
      el.querySelectorAll(selectors.trigger).forEach(trigger => {
        var state = trigger.classList.contains(classes.open);
        trigger.setAttribute('aria-expanded', state);
  
        trigger.off('click' + namespace);
        trigger.on('click' + namespace, toggle);
      });
    }
  
    function toggle(evt) {
      if (isTransitioning) {
        return;
      }
  
      isTransitioning = true;
  
      var el = evt.currentTarget;
      var isOpen = el.classList.contains(classes.open);
      var isTab = el.classList.contains(classes.tabs);
      var moduleId = el.getAttribute('aria-controls');
      var container = document.getElementById(moduleId);
  
      if (!moduleId) {
        moduleId = el.dataset.controls;
      }
  
      // No ID, bail
      if (!moduleId) {
        return;
      }
  
      // If container=null, there isn't a matching ID.
      // Check if data-id is set instead. Could be multiple.
      // Select based on being in the same parent div.
      if (!container) {
        var multipleMatches = document.querySelectorAll('[data-id="' + moduleId + '"]');
        if (multipleMatches.length > 0) {
          container = el.parentNode.querySelector('[data-id="' + moduleId + '"]');
        }
      }
  
      if (!container) {
        isTransitioning = false;
        return;
      }
  
      var height = container.querySelector(selectors.moduleInner).offsetHeight;
      var isAutoHeight = container.classList.contains(classes.autoHeight);
      var parentCollapsibleEl = container.parentNode.closest(selectors.module);
      var childHeight = height;
  
      if (isTab) {
        if(isOpen) {
          isTransitioning = false;
          return;
        }
  
        var newModule;
        document.querySelectorAll(selectors.tabs + '[data-id="'+ el.dataset.id +'"]').forEach(el => {
          el.classList.remove(classes.open);
          newModule = document.querySelector('#' + el.getAttribute('aria-controls'));
          setTransitionHeight(newModule, 0, true);
        });
      }
  
      // If isAutoHeight, set the height to 0 just after setting the actual height
      // so the closing animation works nicely
      if (isOpen && isAutoHeight) {
        setTimeout(function() {
          height = 0;
          setTransitionHeight(container, height, isOpen, isAutoHeight);
        }, 0);
      }
  
      if (isOpen && !isAutoHeight) {
        height = 0;
      }
  
      el.setAttribute('aria-expanded', !isOpen);
      if (isOpen) {
        el.classList.remove(classes.open);
      } else {
        el.classList.add(classes.open);
      }
  
      setTransitionHeight(container, height, isOpen, isAutoHeight);
  
      // If we are in a nested collapsible element like the mobile nav,
      // also set the parent element's height
      if (parentCollapsibleEl) {
        var parentHeight = parentCollapsibleEl.style.height;
  
        if (isOpen && parentHeight === 'auto') {
          childHeight = 0; // Set childHeight to 0 if parent is initially opened
        }
  
        var totalHeight = isOpen
                        ? parentCollapsibleEl.offsetHeight - childHeight
                        : height + parentCollapsibleEl.offsetHeight;
  
        setTransitionHeight(parentCollapsibleEl, totalHeight, false, false);
      }
    }
  
    function setTransitionHeight(container, height, isOpen, isAutoHeight) {
      container.classList.remove(classes.hide);
      theme.utils.prepareTransition(container, function() {
  
        container.style.height = height+'px';
        if (isOpen) {
          container.classList.remove(classes.open);
        } else {
          container.classList.add(classes.open);
        }
      });
  
      if (!isOpen && isAutoHeight) {
        var o = container;
        window.setTimeout(function() {
          o.css('height','auto');
          isTransitioning = false;
        }, 500);
      } else {
        isTransitioning = false;
      }
    }
  
    return {
      init: init
    };
  })();
  
  // Shopify-built select-like popovers for currency and language selection
  theme.Disclosure = (function() {
    var selectors = {
      disclosureForm: '[data-disclosure-form]',
      disclosureList: '[data-disclosure-list]',
      disclosureToggle: '[data-disclosure-toggle]',
      disclosureInput: '[data-disclosure-input]',
      disclosureOptions: '[data-disclosure-option]'
    };
  
    var classes = {
      listVisible: 'disclosure-list--visible'
    };
  
    function Disclosure(disclosure) {
      this.container = disclosure;
      this._cacheSelectors();
      this._setupListeners();
    }
  
    Disclosure.prototype = Object.assign({}, Disclosure.prototype, {
      _cacheSelectors: function() {
        this.cache = {
          disclosureForm: this.container.closest(selectors.disclosureForm),
          disclosureList: this.container.querySelector(selectors.disclosureList),
          disclosureToggle: this.container.querySelector(
            selectors.disclosureToggle
          ),
          disclosureInput: this.container.querySelector(
            selectors.disclosureInput
          ),
          disclosureOptions: this.container.querySelectorAll(
            selectors.disclosureOptions
          )
        };
      },
  
      _setupListeners: function() {
        this.eventHandlers = this._setupEventHandlers();
  
        this.cache.disclosureToggle.addEventListener(
          'click',
          this.eventHandlers.toggleList
        );
  
        this.cache.disclosureOptions.forEach(function(disclosureOption) {
          disclosureOption.addEventListener(
            'click',
            this.eventHandlers.connectOptions
          );
        }, this);
  
        this.container.addEventListener(
          'keyup',
          this.eventHandlers.onDisclosureKeyUp
        );
  
        this.cache.disclosureList.addEventListener(
          'focusout',
          this.eventHandlers.onDisclosureListFocusOut
        );
  
        this.cache.disclosureToggle.addEventListener(
          'focusout',
          this.eventHandlers.onDisclosureToggleFocusOut
        );
  
        document.body.addEventListener('click', this.eventHandlers.onBodyClick);
      },
  
      _setupEventHandlers: function() {
        return {
          connectOptions: this._connectOptions.bind(this),
          toggleList: this._toggleList.bind(this),
          onBodyClick: this._onBodyClick.bind(this),
          onDisclosureKeyUp: this._onDisclosureKeyUp.bind(this),
          onDisclosureListFocusOut: this._onDisclosureListFocusOut.bind(this),
          onDisclosureToggleFocusOut: this._onDisclosureToggleFocusOut.bind(this)
        };
      },
  
      _connectOptions: function(event) {
        event.preventDefault();
  
        this._submitForm(event.currentTarget.dataset.value);
      },
  
      _onDisclosureToggleFocusOut: function(event) {
        var disclosureLostFocus =
          this.container.contains(event.relatedTarget) === false;
  
        if (disclosureLostFocus) {
          this._hideList();
        }
      },
  
      _onDisclosureListFocusOut: function(event) {
        var childInFocus = event.currentTarget.contains(event.relatedTarget);
  
        var isVisible = this.cache.disclosureList.classList.contains(
          classes.listVisible
        );
  
        if (isVisible && !childInFocus) {
          this._hideList();
        }
      },
  
      _onDisclosureKeyUp: function(event) {
        if (event.which !== 27) return;
        this._hideList();
        this.cache.disclosureToggle.focus();
      },
  
      _onBodyClick: function(event) {
        var isOption = this.container.contains(event.target);
        var isVisible = this.cache.disclosureList.classList.contains(
          classes.listVisible
        );
  
        if (isVisible && !isOption) {
          this._hideList();
        }
      },
  
      _submitForm: function(value) {
        this.cache.disclosureInput.value = value;
        this.cache.disclosureForm.submit();
      },
  
      _hideList: function() {
        this.cache.disclosureList.classList.remove(classes.listVisible);
        this.cache.disclosureToggle.setAttribute('aria-expanded', false);
      },
  
      _toggleList: function() {
        var ariaExpanded =
          this.cache.disclosureToggle.getAttribute('aria-expanded') === 'true';
        this.cache.disclosureList.classList.toggle(classes.listVisible);
        this.cache.disclosureToggle.setAttribute('aria-expanded', !ariaExpanded);
      },
  
      destroy: function() {
        this.cache.disclosureToggle.removeEventListener(
          'click',
          this.eventHandlers.toggleList
        );
  
        this.cache.disclosureOptions.forEach(function(disclosureOption) {
          disclosureOption.removeEventListener(
            'click',
            this.eventHandlers.connectOptions
          );
        }, this);
  
        this.container.removeEventListener(
          'keyup',
          this.eventHandlers.onDisclosureKeyUp
        );
  
        this.cache.disclosureList.removeEventListener(
          'focusout',
          this.eventHandlers.onDisclosureListFocusOut
        );
  
        this.cache.disclosureToggle.removeEventListener(
          'focusout',
          this.eventHandlers.onDisclosureToggleFocusOut
        );
  
        document.body.removeEventListener(
          'click',
          this.eventHandlers.onBodyClick
        );
      }
    });
  
    return Disclosure;
  })();
  
  theme.Drawers = (function() {
    function Drawers(id, name) {
      this.config = {
        id: id,
        close: '.js-drawer-close',
        open: '.js-drawer-open-' + name,
        openClass: 'js-drawer-open',
        closingClass: 'js-drawer-closing',
        activeDrawer: 'drawer--is-open',
        namespace: '.drawer-' + name
      };
  
      this.nodes = {
        page: document.querySelector('#MainContent')
      };
  
      this.drawer = document.querySelector('#' + id);
      this.isOpen = false;
  
      if (!this.drawer) {
        return;
      }
  
      this.init();
    }
  
    Drawers.prototype = Object.assign({}, Drawers.prototype, {
      init: function() {
        // Setup open button(s)
        document.querySelectorAll(this.config.open).forEach(openBtn => {
          openBtn.setAttribute('aria-expanded', 'false');
          openBtn.addEventListener('click', this.open.bind(this));
        });
  
        this.drawer.querySelector(this.config.close).addEventListener('click', this.close.bind(this));
  
        // Close modal if a drawer is opened
        document.addEventListener('modalOpen', function() {
          this.close();
        }.bind(this));
      },
  
      open: function(evt, returnFocusEl) {
        if (evt) {
          evt.preventDefault();
        }
  
        if (this.isOpen) {
          return;
        }
  
        // Without this the drawer opens, the click event bubbles up to $nodes.page which closes the drawer.
        if (evt && evt.stopPropagation) {
          evt.stopPropagation();
          // save the source of the click, we'll focus to this on close
          evt.currentTarget.setAttribute('aria-expanded', 'true');
          this.activeSource = evt.currentTarget;
        } else if (returnFocusEl) {
          returnFocusEl.setAttribute('aria-expanded', 'true');
          this.activeSource = returnFocusEl;
        }
  
        theme.utils.prepareTransition(this.drawer, function() {
          this.drawer.classList.add(this.config.activeDrawer);
        }.bind(this));
  
        document.documentElement.classList.add(this.config.openClass);
        this.isOpen = true;
  
        theme.a11y.trapFocus({
          container: this.drawer,
          namespace: 'drawer_focus'
        });
  
        document.dispatchEvent(new CustomEvent('drawerOpen'));
        document.dispatchEvent(new CustomEvent('drawerOpen.' + this.config.id));
  
        this.bindEvents();
      },
  
      close: function(evt) {
        if (!this.isOpen) {
          return;
        }
  
        // Do not close if click event came from inside drawer
        if (evt) {
          if (evt.target.closest('.js-drawer-close')) {
            // Do not close if using the drawer close button
          } else if (evt.target.closest('.drawer')) {
            return;
          }
        }
  
        // deselect any focused form elements
        document.activeElement.blur();
  
        theme.utils.prepareTransition(this.drawer, function() {
          this.drawer.classList.remove(this.config.activeDrawer);
        }.bind(this));
  
        document.documentElement.classList.remove(this.config.openClass);
        document.documentElement.classList.add(this.config.closingClass);
  
        window.setTimeout(function() {
          document.documentElement.classList.remove(this.config.closingClass);
          if (this.activeSource && this.activeSource.getAttribute('aria-expanded')) {
            this.activeSource.setAttribute('aria-expanded', 'false');
            this.activeSource.focus();
          }
        }.bind(this), 500);
  
        this.isOpen = false;
  
        theme.a11y.removeTrapFocus({
          container: this.drawer,
          namespace: 'drawer_focus'
        });
  
        this.unbindEvents();
      },
  
      bindEvents: function() {
        // Clicking out of drawer closes it
        window.on('click' + this.config.namespace, function(evt) {
          this.close(evt)
          return;
        }.bind(this));
  
        // Pressing escape closes drawer
        window.on('keyup' + this.config.namespace, function(evt) {
          if (evt.keyCode === 27) {
            this.close();
          }
        }.bind(this));
  
        theme.a11y.lockMobileScrolling(this.config.namespace, this.nodes.page);
      },
  
      unbindEvents: function() {
        window.off('click' + this.config.namespace);
        window.off('keyup' + this.config.namespace);
  
        theme.a11y.unlockMobileScrolling(this.config.namespace, this.nodes.page);
      }
    });
  
    return Drawers;
  })();
  
  theme.Modals = (function() {
    function Modal(id, name, options) {
      var defaults = {
        close: '.js-modal-close',
        open: '.js-modal-open-' + name,
        openClass: 'modal--is-active',
        closingClass: 'modal--is-closing',
        bodyOpenClass: ['modal-open'],
        bodyOpenSolidClass: 'modal-open--solid',
        bodyClosingClass: 'modal-closing',
        closeOffContentClick: true
      };
  
      this.id = id;
      this.modal = document.getElementById(id);
  
      if (!this.modal) {
        return false;
      }
  
      this.modalContent = this.modal.querySelector('.modal__inner');
  
      this.config = Object.assign(defaults, options);
      this.modalIsOpen = false;
      this.focusOnOpen = this.config.focusIdOnOpen ? document.getElementById(this.config.focusIdOnOpen) : this.modal;
      this.isSolid = this.config.solid;
  
      this.init();
    }
  
    Modal.prototype.init = function() {
      document.querySelectorAll(this.config.open).forEach(btn => {
        btn.setAttribute('aria-expanded', 'false');
        btn.addEventListener('click', this.open.bind(this));
  
        btn.classList.remove('btn--not-ready')
      });
  
      this.modal.querySelectorAll(this.config.close).forEach(btn => {
        btn.addEventListener('click', this.close.bind(this));
      });
  
      // Close modal if a drawer is opened
      document.addEventListener('drawerOpen', function() {
        this.close();
      }.bind(this));
    };
  
    Modal.prototype.open = function(evt) {
      // Keep track if modal was opened from a click, or called by another function
      var externalCall = false;
  
      // don't open an opened modal
      if (this.modalIsOpen) {
        return;
      }
  
      // Prevent following href if link is clicked
      if (evt) {
        evt.preventDefault();
      } else {
        externalCall = true;
      }
  
      // Without this, the modal opens, the click event bubbles up to $nodes.page
      // which closes the modal.
      if (evt && evt.stopPropagation) {
        evt.stopPropagation();
        // save the source of the click, we'll focus to this on close
        this.activeSource = evt.currentTarget.setAttribute('aria-expanded', 'true');
      }
  
      if (this.modalIsOpen && !externalCall) {
        this.close();
      }
  
      this.modal.classList.add(this.config.openClass);
  
      document.documentElement.classList.add(...this.config.bodyOpenClass);
  
      if (this.isSolid) {
        document.documentElement.classList.add(this.config.bodyOpenSolidClass);
      }
  
      this.modalIsOpen = true;
  
      // Delay trap focus to ensure elements are seen by screen readers
      setTimeout(() => {
        theme.a11y.trapFocus({
          container: this.modal,
          elementToFocus: this.focusOnOpen,
          namespace: 'modal_focus'
        });
      }, 100);
  
  
      document.dispatchEvent(new CustomEvent('modalOpen'));
      document.dispatchEvent(new CustomEvent('modalOpen.' + this.id));
  
      this.bindEvents();
    };
  
    Modal.prototype.close = function(evt) {
      // don't close a closed modal
      if (!this.modalIsOpen) {
        return;
      }
  
      // Do not close modal if click happens inside modal content
      if (evt) {
        if (evt.target.closest('.js-modal-close')) {
          // Do not close if using the modal close button
        } else if (evt.target.closest('.modal__inner')) {
          return;
        }
      }
  
      // deselect any focused form elements
      document.activeElement.blur();
  
      this.modal.classList.remove(this.config.openClass);
      this.modal.classList.add(this.config.closingClass);
  
      document.documentElement.classList.remove(...this.config.bodyOpenClass);
      document.documentElement.classList.add(this.config.bodyClosingClass);
  
      window.setTimeout(function() {
        document.documentElement.classList.remove(this.config.bodyClosingClass);
        this.modal.classList.remove(this.config.closingClass);
        if (this.activeSource && this.activeSource.getAttribute('aria-expanded')) {
          this.activeSource.setAttribute('aria-expanded', 'false').focus();
        }
      }.bind(this), 500); // modal close css transition
  
      if (this.isSolid) {
        document.documentElement.classList.remove(this.config.bodyOpenSolidClass);
      }
  
      this.modalIsOpen = false;
  
      theme.a11y.removeTrapFocus({
        container: this.modal,
        namespace: 'modal_focus'
      });
  
      document.dispatchEvent(new CustomEvent('modalClose.' + this.id));
  
      this.unbindEvents();
    };
  
    Modal.prototype.bindEvents = function() {
      window.on('keyup.modal', function(evt) {
        if (evt.keyCode === 27) {
          this.close();
        }
      }.bind(this));
  
      if (this.config.closeOffContentClick) {
        // Clicking outside of the modal content also closes it
        this.modal.on('click.modal', this.close.bind(this));
      }
    };
  
    Modal.prototype.unbindEvents = function() {
      document.documentElement.off('.modal');
  
      if (this.config.closeOffContentClick) {
        this.modal.off('.modal');
      }
    };
  
    return Modal;
  })();
  
  /*============================================================================
    ParallaxImage
  ==============================================================================*/
  
  class ParallaxImage extends HTMLElement {
    constructor() {
      super();
      this.parallaxImage = this.querySelector('[data-parallax-image]');
      this.windowInnerHeight = window.innerHeight;
      this.isActive = false;
      this.timeout = null;
      this.directionMap = {
        right: 0,
        top: 90,
        left: 180,
        bottom: 270
      }
      this.directionMultipliers = {
        0: [  1,  0 ],
        90: [  0, -1 ],
        180: [ -1,  0 ],
        270: [  0,  1 ]
      }
  
      this.init();
      window.addEventListener('scroll', () => this.scrollHandler());
    }
  
    getParallaxInfo() {
      const { width, height, top } = this.parallaxImage.getBoundingClientRect();
      let element = this.parallaxImage;
      let multipliers;
      let { angle, movement } = element.dataset;
  
      let movementPixels = angle === 'top' ? Math.ceil(height * (parseFloat(movement) / 100)) : Math.ceil(width * (parseFloat(movement) / 100));
  
      // angle has shorthands "top", "left", "bottom" and "right"
      // nullish coalescing. using `||` here would fail for `0`
      angle = this.directionMap[angle] ?? parseFloat(angle);
  
      // fallback if undefined
      // NaN is the only value that doesn't equal itself
      if (angle !== angle) angle = 270; // move to bottom (default parallax effect)
      if (movementPixels !== movementPixels) movementPixels = 100; // 100px
  
      // check if angle is located in top half and/or left half
      angle %= 360;
      if (angle < 0) angle += 360
  
      const toLeft = angle > 90 && angle < 270;
      const toTop  = angle < 180;
  
      element.style[toLeft ? 'left' : 'right'] = 0;
      element.style[toTop  ? 'top' : 'bottom'] = 0;
  
      // if it's not a perfectly horizontal or vertical movement, get cos and sin
      if (angle % 90) {
        const radians = angle * Math.PI / 180
        multipliers = [ Math.cos(radians), Math.sin(radians) * -1 ] // only sin has to be inverted
      } else {
        multipliers = this.directionMultipliers[angle];
      }
  
      // increase width and height according to movement and multipliers
      if (multipliers[0]) element.style.width  = `calc(100% + ${movementPixels * Math.abs(multipliers[0])}px)`;
      if (multipliers[1]) element.style.height = `calc(100% + ${movementPixels * Math.abs(multipliers[1])}px)`;
  
      return {
        element,
        movementPixels,
        multipliers,
        top,
        height
      }
    }
  
    init() {
      const { element, movementPixels, multipliers, top, height } = this.getParallaxInfo();;
  
      const scrolledInContainer = this.windowInnerHeight - top;
      const scrollArea = this.windowInnerHeight + height;
      const progress = scrolledInContainer / scrollArea;
  
      if (progress > -0.1 && progress < 1.1) {
        const position = Math.min(Math.max(progress, 0), 1) * movementPixels;
        element.style.transform = `translate3d(${position * multipliers[0]}px, ${position * multipliers[1]}px, 0)`;
      }
  
      if (this.isActive) requestAnimationFrame(this.init.bind(this));
    }
  
    scrollHandler() {
      if (this.isActive) {
        clearTimeout(this.timeout);
      } else {
        this.isActive = true;
        requestAnimationFrame(this.init.bind(this));
      }
  
      this.timeout = setTimeout(() => this.isActive = false, 20);
    }
  }
  
  customElements.define('parallax-image', ParallaxImage);
  
  if (typeof window.noUiSlider === 'undefined') {
    throw new Error('theme.PriceRange is missing vendor noUiSlider: // =require vendor/nouislider.js');
  }
  
  theme.PriceRange = (function () {
    var defaultStep = 10;
    var selectors = {
      priceRange: '.price-range',
      priceRangeSlider: '.price-range__slider',
      priceRangeInputMin: '.price-range__input-min',
      priceRangeInputMax: '.price-range__input-max',
      priceRangeDisplayMin: '.price-range__display-min',
      priceRangeDisplayMax: '.price-range__display-max',
    };
  
    function PriceRange(container, {onChange, onUpdate, ...sliderOptions} = {}) {
      this.container = container;
      this.onChange = onChange;
      this.onUpdate = onUpdate;
      this.sliderOptions = sliderOptions || {};
  
      return this.init();
    }
  
    PriceRange.prototype = Object.assign({}, PriceRange.prototype, {
      init: function () {
        if (!this.container.classList.contains('price-range')) {
          throw new Error('You must instantiate PriceRange with a valid container')
        }
  
        this.formEl = this.container.closest('form');
        this.sliderEl = this.container.querySelector(selectors.priceRangeSlider);
        this.inputMinEl = this.container.querySelector(selectors.priceRangeInputMin);
        this.inputMaxEl = this.container.querySelector(selectors.priceRangeInputMax);
        this.displayMinEl = this.container.querySelector(selectors.priceRangeDisplayMin);
        this.displayMaxEl = this.container.querySelector(selectors.priceRangeDisplayMax);
  
        this.minRange = parseFloat(this.container.dataset.min) || 0;
        this.minValue = parseFloat(this.container.dataset.minValue) || 0;
        this.maxRange = parseFloat(this.container.dataset.max) || 100;
        this.maxValue = parseFloat(this.container.dataset.maxValue) || this.maxRange;
  
        return this.createPriceRange();
      },
  
      createPriceRange: function () {
        if (this.sliderEl && this.sliderEl.noUiSlider && typeof this.sliderEl.noUiSlider.destroy === 'function') {
          this.sliderEl.noUiSlider.destroy();
        }
  
        var slider = noUiSlider.create(this.sliderEl, {
          connect: true,
          step: defaultStep,
          ...this.sliderOptions,
          // Do not allow overriding these options
          start: [this.minValue, this.maxValue],
          range: {
            min: this.minRange,
            max: this.maxRange,
          },
        });
  
        slider.on('update', values => {
          this.displayMinEl.innerHTML = theme.Currency.formatMoney(
            values[0],
            theme.settings.moneyFormat,
          );
          this.displayMaxEl.innerHTML = theme.Currency.formatMoney(
            values[1],
            theme.settings.moneyFormat,
          );
  
          if (this.onUpdate) {
            this.onUpdate(values);
          }
        });
  
        slider.on('change', values => {
          this.inputMinEl.value = values[0];
          this.inputMaxEl.value = values[1];
  
          if (this.onChange) {
            const formData = new FormData(this.formEl);
            this.onChange(formData);
          }
        });
  
        return slider;
      },
    });
  
    return PriceRange;
  })();
  
  theme.AjaxProduct = (function() {
    var status = {
      loading: false
    };
  
    function ProductForm(form, submit, args) {
      this.form = form;
      this.args = args;
  
      var submitSelector = submit ? submit : '.add-to-cart';
  
      if (this.form) {
        this.addToCart = form.querySelector(submitSelector);
        this.form.addEventListener('submit', this.addItemFromForm.bind(this));
      }
    };
  
    ProductForm.prototype = Object.assign({}, ProductForm.prototype, {
      addItemFromForm: function(evt, callback){
        evt.preventDefault();
  
        if (status.loading) {
          return;
        }
  
        // Loading indicator on add to cart button
        this.addToCart.classList.add('btn--loading');
  
        status.loading = true;
  
        var data = new FormData(this.form);
  
        fetch(theme.routes.cartAdd, {
          method: 'POST',
          body: data,
          headers: {
            'X-Requested-With': 'XMLHttpRequest'
          }
        })
        .then(response => response.json())
        .then(function(data) {
          if (data.status === 422) {
            this.error(data);
            document.dispatchEvent(new CustomEvent('ajaxProduct:added'));
          } else {
            var product = data;
            this.success(product);
          }
  
          status.loading = false;
          this.addToCart.classList.remove('btn--loading');
  
          // Reload page if adding product from a section on the cart page
          if (document.body.classList.contains('template-cart')) {
            window.scrollTo(0, 0);
            location.reload();
          }
        }.bind(this));
      },
  
      success: function(product) {
        var errors = this.form.querySelector('.errors');
        if (errors) {
          errors.remove();
        }
  
        if (theme.settings.cartType === 'page') {
          window.location = theme.routes.cartPage;
        }
  
        this.form.dispatchEvent(new CustomEvent('ajaxProduct:added', {
          detail: {
            product: product,
            addToCartBtn: this.addToCart
          },
          bubbles: true
        }));
  
        if (this.args && this.args.scopedEventId) {
          document.dispatchEvent(new CustomEvent('ajaxProduct:added:' + this.args.scopedEventId, {
            detail: {
              product: product,
              addToCartBtn: this.addToCart
            }
          }));
        }
      },
  
      error: function(error) {
        if (!error.description) {
          console.warn(error);
          return;
        }
  
        var errors = this.form.querySelector('.errors');
        if (errors) {
          errors.remove();
        }
  
        var errorDiv = document.createElement('div');
        errorDiv.classList.add('errors', 'text-center');
  
        if (typeof error.description === 'object') {
          errorDiv.textContent = error.message;
        } else {
          errorDiv.textContent = error.description;
        }
  
        this.form.append(errorDiv);
  
        this.form.dispatchEvent(new CustomEvent('ajaxProduct:error', {
          detail: {
            errorMessage: error.description
          },
          bubbles: true
        }));
  
        if (this.args && this.args.scopedEventId) {
          document.dispatchEvent(new CustomEvent('ajaxProduct:error:' + this.args.scopedEventId, {
            detail: {
              errorMessage: error.description
            }
          }));
        }
      }
    });
  
    return ProductForm;
  })();
  
  theme.ProductMedia = (function() {
    var modelJsonSections = {};
    var models = {};
    var xrButtons = {};
  
    var selectors = {
      mediaGroup: '[data-product-single-media-group]',
      xrButton: '[data-shopify-xr]'
    };
  
    function init(modelViewerContainers, sectionId) {
      modelJsonSections[sectionId] = {
        loaded: false
      };
  
      modelViewerContainers.forEach(function(container, index) {
        var mediaId = container.dataset.mediaId;
        var modelViewerElement = container.querySelector('model-viewer');
        var modelId = modelViewerElement.dataset.modelId;
  
        if (index === 0) {
          var mediaGroup = container.closest(selectors.mediaGroup);
          var xrButton = mediaGroup.querySelector(selectors.xrButton);
          xrButtons[sectionId] = {
            element: xrButton,
            defaultId: modelId
          };
        }
  
        models[mediaId] = {
          modelId: modelId,
          sectionId: sectionId,
          container: container,
          element: modelViewerElement
        };
  
      });
  
      window.Shopify.loadFeatures([
        {
          name: 'shopify-xr',
          version: '1.0',
          onLoad: setupShopifyXr
        },
        {
          name: 'model-viewer-ui',
          version: '1.0',
          onLoad: setupModelViewerUi
        }
      ]);
  
      theme.LibraryLoader.load('modelViewerUiStyles');
    }
  
    function setupShopifyXr(errors) {
      if (errors) return;
  
      if (!window.ShopifyXR) {
        document.addEventListener('shopify_xr_initialized', function() {
          setupShopifyXr();
        });
        return;
      }
  
      for (var sectionId in modelJsonSections) {
        if (modelJsonSections.hasOwnProperty(sectionId)) {
          var modelSection = modelJsonSections[sectionId];
  
          if (modelSection.loaded) continue;
  
          var modelJson = document.querySelector('#ModelJson-' + sectionId);
  
          window.ShopifyXR.addModels(JSON.parse(modelJson.innerHTML));
          modelSection.loaded = true;
        }
      }
      window.ShopifyXR.setupXRElements();
    }
  
    function setupModelViewerUi(errors) {
      if (errors) return;
  
      for (var key in models) {
        if (models.hasOwnProperty(key)) {
          var model = models[key];
          if (!model.modelViewerUi && Shopify) {
            model.modelViewerUi = new Shopify.ModelViewerUI(model.element);
          }
          setupModelViewerListeners(model);
        }
      }
    }
  
    function setupModelViewerListeners(model) {
      var xrButton = xrButtons[model.sectionId];
  
      model.container.addEventListener('mediaVisible', function() {
        xrButton.element.setAttribute('data-shopify-model3d-id', model.modelId);
        if (theme.config.isTouch) return;
        model.modelViewerUi.play();
      });
  
      model.container.addEventListener('mediaHidden', function() {
        xrButton.element.setAttribute('data-shopify-model3d-id', xrButton.defaultId);
        model.modelViewerUi.pause();
      });
  
      model.container.addEventListener('xrLaunch', function() {
        model.modelViewerUi.pause();
      });
    }
  
    function removeSectionModels(sectionId) {
      for (var key in models) {
        if (models.hasOwnProperty(key)) {
          var model = models[key];
          if (model.sectionId === sectionId) {
            delete models[key];
          }
        }
      }
      delete modelJsonSections[sectionId];
    }
  
    return {
      init: init,
      removeSectionModels: removeSectionModels
    };
  })();
  
  theme.QtySelector = (function() {
    var selectors = {
      input: '.js-qty__num',
      plus: '.js-qty__adjust--plus',
      minus: '.js-qty__adjust--minus'
    };
  
    function QtySelector(el, options) {
      this.wrapper = el;
      this.plus = el.querySelector(selectors.plus);
      this.minus = el.querySelector(selectors.minus);
      this.input = el.querySelector(selectors.input);
      this.minValue = this.input.getAttribute('min') || 1;
  
      var defaults = {
        namespace: null,
        isCart: false,
        key: this.input.dataset.id
      };
  
      this.options = Object.assign({}, defaults, options);
  
      this.init();
    }
  
    QtySelector.prototype = Object.assign({}, QtySelector.prototype, {
      init: function() {
        this.plus.addEventListener('click', function() {
          var qty = this._getQty();
          this._change(qty + 1);
        }.bind(this));
  
        this.minus.addEventListener('click', function() {
          var qty = this._getQty();
          this._change(qty - 1);
        }.bind(this));
  
        this.input.addEventListener('change', function(evt) {
          this._change(this._getQty());
        }.bind(this));
      },
  
      _getQty: function() {
        var qty = this.input.value;
        if((parseFloat(qty) == parseInt(qty)) && !isNaN(qty)) {
          // We have a valid number!
        } else {
          // Not a number. Default to 1.
          qty = 1;
        }
        return parseInt(qty);
      },
  
      _change: function(qty) {
        if (qty <= this.minValue) {
          qty = this.minValue;
        }
  
        this.input.value = qty;
  
        if (this.options.isCart) {
          document.dispatchEvent(new CustomEvent('cart:quantity' + this.options.namespace, {
              detail: [this.options.key, qty, this.wrapper]
          }));
        }
      }
    });
  
    return QtySelector;
  })();
  
  theme.initQuickShop = function() {
    var ids = [];
    var products = document.querySelectorAll('.grid-product');
  
    if (!products.length || !theme.settings.quickView) {
      return;
    }
  
    products.forEach(product => {
      product.addEventListener('mouseover', productMouseover);
      product.addEventListener('focusin', productMouseover);
    });
  
    function productMouseover(evt) {
      var el = evt.currentTarget;
      // No quick view on mobile breakpoint
      if (!theme.config.bpSmall) {
        el.removeEventListener('mouseover', productMouseover);
        el.removeEventListener('focusin', productMouseover);
        if (!el || !el.dataset.productId) {
          // Onboarding product, no real data
          return;
        }
        var productId = el.dataset.productId;
        var handle = el.dataset.productHandle;
        var btn = el.querySelector('.quick-product__btn');
        theme.preloadProductModal(handle, productId, btn);
      }
    }
  };
  
  theme.preloadProductModal = function(handle, productId, btn) {
    var holder = document.getElementById('QuickShopHolder-' + handle);
    var url = theme.routes.home + '/products/' + handle + '?view=modal';
  
    // remove double `/` in case shop might have /en or language in URL
    url = url.replace('//', '/');
  
    fetch(url)
    .then(response => response.text())
    .then(text => {
      const html = document.createElement('div');
      html.innerHTML = text;
      const div = html.querySelector('.product-section[data-product-handle="'+handle+'"]');
  
      if (!holder) {
        return;
      }
  
      holder.innerHTML = '';
      holder.append(div);
  
      // Setup quick view modal
      var modalId = 'QuickShopModal-' + productId;
      var name = 'quick-modal-' + productId;
      new theme.Modals(modalId, name);
  
      // Register product template inside quick view
      theme.sections.register('product', theme.Product, holder);
  
      // Register collapsible elements
      theme.collapsibles.init();
  
      // Register potential video modal links (when video has sound)
      theme.videoModal();
    });
  }
  
  // theme.Slideshow handles all flickity based sliders
  // Child navigation is only setup to work on product images
  theme.Slideshow = (function() {
    var classes = {
      animateOut: 'animate-out',
      isPaused: 'is-paused',
      isActive: 'is-active'
    };
  
    var selectors = {
      allSlides: '.slideshow__slide',
      currentSlide: '.is-selected',
      wrapper: '.slideshow-wrapper',
      pauseButton: '.slideshow__pause'
    };
  
    var productSelectors = {
      thumb: '.product__thumb-item:not(.hide)',
      links: '.product__thumb-item:not(.hide) a',
      arrow: '.product__thumb-arrow'
    };
  
    var defaults = {
      adaptiveHeight: false,
      autoPlay: false,
      avoidReflow: false, // custom by Archetype
      childNav: null, // element. Custom by Archetype instead of asNavFor
      childNavScroller: null, // element
      childVertical: false,
      dragThreshold: 7,
      fade: false,
      friction: 0.8,
      initialIndex: 0,
      pageDots: false,
      pauseAutoPlayOnHover: false,
      prevNextButtons: false,
      rightToLeft: theme.config.rtl,
      selectedAttraction: 0.14,
      setGallerySize: true,
      wrapAround: true
    };
  
    function slideshow(el, args) {
      this.el = el;
      this.args = Object.assign({}, defaults, args);
  
      // Setup listeners as part of arguments
      this.args.on = {
        ready: this.init.bind(this),
        change: this.slideChange.bind(this),
        settle: this.afterChange.bind(this)
      };
  
      if (this.args.childNav) {
        this.childNavEls = this.args.childNav.querySelectorAll(productSelectors.thumb);
        this.childNavLinks = this.args.childNav.querySelectorAll(productSelectors.links);
        this.arrows = this.args.childNav.querySelectorAll(productSelectors.arrow);
        if (this.childNavLinks.length) {
          this.initChildNav();
        }
      }
  
      if (this.args.avoidReflow) {
        avoidReflow(el);
      }
  
      this.slideshow = new Flickity(el, this.args);
  
      // Prevent dragging on the product slider from triggering a zoom on product images
      if (el.dataset.zoom && el.dataset.zoom === 'true') {
        this.slideshow.on('dragStart', () => {
          this.slideshow.slider.style.pointerEvents = 'none';
  
          // With fade enabled, we also need to adjust the pointerEvents on the selected slide
          if (this.slideshow.options.fade) {
            this.slideshow.slider.querySelector('.is-selected').style.pointerEvents = 'none';
          }
        });
        this.slideshow.on('dragEnd', () => {
          this.slideshow.slider.style.pointerEvents = 'auto';
  
          // With fade enabled, we also need to adjust the pointerEvents on the selected slide
          if (this.slideshow.options.fade) {
            this.slideshow.slider.querySelector('.is-selected').style.pointerEvents = 'auto';
          }
        });
      }
  
      if (this.args.autoPlay) {
        var wrapper = el.closest(selectors.wrapper);
        this.pauseBtn = wrapper.querySelector(selectors.pauseButton);
        if (this.pauseBtn) {
          this.pauseBtn.addEventListener('click', this._togglePause.bind(this));
        }
      }
  
      // Reset dimensions on resize
      window.on('resize', theme.utils.debounce(300, function() {
        this.resize();
      }.bind(this)));
  
      // Set flickity-viewport height to first element to
      // avoid awkward page reflows while initializing.
      // Must be added in a `style` tag because element does not exist yet.
      // Slideshow element must have an ID
      function avoidReflow(el) {
        if (!el.id) return;
        var firstChild = el.firstChild;
        while(firstChild != null && firstChild.nodeType == 3){ // skip TextNodes
          firstChild = firstChild.nextSibling;
        }
        var style = document.createElement('style');
        style.innerHTML = `#${el.id} .flickity-viewport{height:${firstChild.offsetHeight}px}`;
        document.head.appendChild(style);
      }
    }
  
    slideshow.prototype = Object.assign({}, slideshow.prototype, {
      init: function(el) {
        this.currentSlide = this.el.querySelector(selectors.currentSlide);
  
        // Optional onInit callback
        if (this.args.callbacks && this.args.callbacks.onInit) {
          if (typeof this.args.callbacks.onInit === 'function') {
            this.args.callbacks.onInit(this.currentSlide);
          }
        }
  
        if (window.AOS) { AOS.refresh() }
      },
  
      slideChange: function(index) {
        // Outgoing fade styles
        if (this.args.fade && this.currentSlide) {
          this.currentSlide.classList.add(classes.animateOut);
          this.currentSlide.addEventListener('transitionend', function() {
            this.currentSlide.classList.remove(classes.animateOut);
          }.bind(this));
        }
  
        // Match index with child nav
        if (this.args.childNav) {
          this.childNavGoTo(index);
        }
  
        // Optional onChange callback
        if (this.args.callbacks && this.args.callbacks.onChange) {
          if (typeof this.args.callbacks.onChange === 'function') {
            this.args.callbacks.onChange(index);
          }
        }
  
        // Show/hide arrows depending on selected index
        if (this.arrows && this.arrows.length) {
          this.arrows[0].classList.toggle('hide', index === 0);
          this.arrows[1].classList.toggle('hide', index === (this.childNavLinks.length - 1));
        }
      },
      afterChange: function(index) {
        // Remove all fade animation classes after slide is done
        if (this.args.fade) {
          this.el.querySelectorAll(selectors.allSlides).forEach(slide => {
            slide.classList.remove(classes.animateOut);
          });
        }
  
        this.currentSlide = this.el.querySelector(selectors.currentSlide);
  
        // Match index with child nav (in case slider height changed first)
        if (this.args.childNav) {
          this.childNavGoTo(this.slideshow.selectedIndex);
        }
      },
      destroy: function() {
        if (this.args.childNav && this.childNavLinks.length) {
          this.childNavLinks.forEach(a => {
            a.classList.remove(classes.isActive);
          });
        }
  
        this.slideshow.destroy();
      },
      reposition: function() {
        this.slideshow.reposition();
      },
      _togglePause: function() {
        if (this.pauseBtn.classList.contains(classes.isPaused)) {
          this.pauseBtn.classList.remove(classes.isPaused);
          this.slideshow.playPlayer();
        } else {
          this.pauseBtn.classList.add(classes.isPaused);
          this.slideshow.pausePlayer();
        }
      },
      resize: function() {
        this.slideshow.resize();
      },
      play: function() {
        this.slideshow.playPlayer();
      },
      pause: function() {
        this.slideshow.pausePlayer();
      },
      goToSlide: function(i) {
        this.slideshow.select(i);
      },
      setDraggable: function(enable) {
        this.slideshow.options.draggable = enable;
        this.slideshow.updateDraggable();
      },
  
      initChildNav: function() {
        this.childNavLinks[this.args.initialIndex].classList.add('is-active');
  
        // Setup events
        this.childNavLinks.forEach((link, i) => {
          // update data-index because image-set feature may be enabled
          link.setAttribute('data-index', i);
  
          link.addEventListener('click', function(evt) {
            evt.preventDefault();
            this.goToSlide(this.getChildIndex(evt.currentTarget))
          }.bind(this));
          link.addEventListener('focus', function(evt) {
            this.goToSlide(this.getChildIndex(evt.currentTarget))
          }.bind(this));
          link.addEventListener('keydown', function(evt) {
            if (evt.keyCode === 13) {
              this.goToSlide(this.getChildIndex(evt.currentTarget))
            }
          }.bind(this));
        });
  
        // Setup optional arrows
        if (this.arrows.length) {
          this.arrows.forEach(arrow => {
            arrow.addEventListener('click', this.arrowClick.bind(this));
          });;
        }
      },
  
      getChildIndex: function(target) {
        return parseInt(target.dataset.index);
      },
  
      childNavGoTo: function(index) {
        this.childNavLinks.forEach(a => {
          a.blur();
          a.classList.remove(classes.isActive);
        });
  
        var el = this.childNavLinks[index];
        el.classList.add(classes.isActive);
  
        if (!this.args.childNavScroller) {
          return;
        }
  
        if (this.args.childVertical) {
          var elTop = el.offsetTop;
          this.args.childNavScroller.scrollTop = elTop - 100;
        } else {
          var elLeft = el.offsetLeft;
          this.args.childNavScroller.scrollLeft = elLeft - 100;
        }
      },
  
      arrowClick: function(evt) {
        if (evt.currentTarget.classList.contains('product__thumb-arrow--prev')) {
          this.slideshow.previous();
        } else {
          this.slideshow.next();
        }
      }
    });
  
    return slideshow;
  })();
  
  /*============================================================================
    VariantAvailability
    - Cross out sold out or unavailable variants
    - To disable, use the Variant Picker Block setting
    - Required markup:
      - class=variant-input-wrap to wrap select or button group
      - class=variant-input to wrap button/label
  ==============================================================================*/
  
  theme.VariantAvailability = (function() {
    var classes = {
      disabled: 'disabled'
    };
  
    function availability(args) {
      this.type = args.type;
      this.variantsObject = args.variantsObject;
      this.currentVariantObject = args.currentVariantObject;
      this.container = args.container;
      this.namespace = args.namespace;
  
      this.init();
    }
  
    availability.prototype = Object.assign({}, availability.prototype, {
      init: function() {
        this.container.on('variantChange' + this.namespace, this.setAvailability.bind(this));
  
        // Set default state based on current selected variant
        this.setInitialAvailability();
      },
  
      // Create a list of all options. If any variant exists and is in stock with that option, it's considered available
      createAvailableOptionsTree(variants, currentlySelectedValues) {
        // Reduce variant array into option availability tree
        return variants.reduce((options, variant) => {
  
          // Check each option group (e.g. option1, option2, option3) of the variant
          Object.keys(options).forEach(index => {
  
            if (variant[index] === null) return;
  
            let entry = options[index].find(option => option.value === variant[index]);
  
            if (typeof entry === 'undefined') {
              // If option has yet to be added to the options tree, add it
              entry = {value: variant[index], soldOut: true}
              options[index].push(entry);
            }
  
            const currentOption1 = currentlySelectedValues.find(({value, index}) => index === 'option1')
            const currentOption2 = currentlySelectedValues.find(({value, index}) => index === 'option2')
  
            switch (index) {
              case 'option1':
                // Option1 inputs should always remain enabled based on all available variants
                entry.soldOut = entry.soldOut && variant.available ? false : entry.soldOut;
                break;
              case 'option2':
                // Option2 inputs should remain enabled based on available variants that match first option group
                if (currentOption1 && variant['option1'] === currentOption1.value) {
                  entry.soldOut = entry.soldOut && variant.available ? false : entry.soldOut;
                }
              case 'option3':
                // Option 3 inputs should remain enabled based on available variants that match first and second option group
                if (
                  currentOption1 && variant['option1'] === currentOption1.value
                  && currentOption2 && variant['option2'] === currentOption2.value
                ) {
                  entry.soldOut = entry.soldOut && variant.available ? false : entry.soldOut;
                }
            }
          })
  
          return options;
        }, { option1: [], option2: [], option3: []})
      },
  
      setInitialAvailability: function() {
        this.container.querySelectorAll('.variant-input-wrap').forEach(group => {
          this.disableVariantGroup(group);
        });
  
        const currentlySelectedValues = this.currentVariantObject.options.map((value,index) => {return {value, index: `option${index+1}`}})
        const initialOptions = this.createAvailableOptionsTree(this.variantsObject, currentlySelectedValues, this.currentVariantObject);
  
        for (var [option, values] of Object.entries(initialOptions)) {
          this.manageOptionState(option, values);
        }
      },
  
      setAvailability: function(evt) {
  
        const {value: lastSelectedValue, index: lastSelectedIndex, currentlySelectedValues, variant} = evt.detail;
  
        // Object to hold all options by value.
        // This will be what sets a button/dropdown as
        // sold out or unavailable (not a combo set as purchasable)
        const valuesToManage = this.createAvailableOptionsTree(this.variantsObject, currentlySelectedValues, variant, lastSelectedIndex, lastSelectedValue)
  
        // Loop through all option levels and send each
        // value w/ args to function that determines to show/hide/enable/disable
        for (var [option, values] of Object.entries(valuesToManage)) {
          this.manageOptionState(option, values, lastSelectedValue);
        }
      },
  
      manageOptionState: function(option, values) {
        var group = this.container.querySelector('.variant-input-wrap[data-index="'+ option +'"]');
  
        // Loop through each option value
        values.forEach(obj => {
          this.enableVariantOption(group, obj);
        });
      },
  
      enableVariantOption: function(group, obj) {
        // Selecting by value so escape it
        var value = obj.value.replace(/([ #;&,.+*~\':"!^$[\]()=>|\/@])/g,'\\$1');
  
        if (this.type === 'dropdown') {
          if (obj.soldOut) {
            group.querySelector('option[value="'+ value +'"]').disabled = true;
          } else {
            group.querySelector('option[value="'+ value +'"]').disabled = false;
          }
        } else {
          var buttonGroup = group.querySelector('.variant-input[data-value="'+ value +'"]');
          var input = buttonGroup.querySelector('input');
          var label = buttonGroup.querySelector('label');
  
          // Variant exists - enable & show variant
          input.classList.remove(classes.disabled);
          label.classList.remove(classes.disabled);
  
          // Variant sold out - cross out option (remains selectable)
          if (obj.soldOut) {
            input.classList.add(classes.disabled);
            label.classList.add(classes.disabled);
          }
        }
      },
  
      disableVariantGroup: function(group) {
        if (this.type === 'dropdown') {
          group.querySelectorAll('option').forEach(option => {
            option.disabled = true;
          });
        } else {
          group.querySelectorAll('input').forEach(input => {
            input.classList.add(classes.disabled);
          });
          group.querySelectorAll('label').forEach(label => {
            label.classList.add(classes.disabled);
          });
        }
      }
  
    });
  
    return availability;
  })();
  
  // Video modal will auto-initialize for any anchor link that points to YouTube
  // MP4 videos must manually be enabled with:
  //   - .product-video-trigger--mp4 (trigger button)
  //   - .product-video-mp4-sound video player element (cloned into modal)
  //     - see media.liquid for example of this
  theme.videoModal = function() {
    var youtubePlayer;
    var vimeoPlayer;
  
    var videoHolderId = 'VideoHolder';
    var selectors = {
      youtube: 'a[href*="youtube.com/watch"], a[href*="youtu.be/"]',
      vimeo: 'a[href*="player.vimeo.com/player/"], a[href*="vimeo.com/"]',
      mp4Trigger: '.product-video-trigger--mp4',
      mp4Player: '.product-video-mp4-sound'
    };
  
    var youtubeTriggers = document.querySelectorAll(selectors.youtube);
    var vimeoTriggers = document.querySelectorAll(selectors.vimeo);
    var mp4Triggers = document.querySelectorAll(selectors.mp4Trigger);
  
    if (!youtubeTriggers.length && !vimeoTriggers.length && !mp4Triggers.length) {
      return;
    }
  
    var videoHolderDiv = document.getElementById(videoHolderId);
  
    if (youtubeTriggers.length) {
      theme.LibraryLoader.load('youtubeSdk');
    }
  
    if (vimeoTriggers.length) {
      theme.LibraryLoader.load('vimeo', window.vimeoApiReady);
    }
  
    var modal = new theme.Modals('VideoModal', 'video-modal', {
      closeOffContentClick: true,
      bodyOpenClass: ['modal-open', 'video-modal-open'],
      solid: true
    });
  
    youtubeTriggers.forEach(btn => {
      btn.addEventListener('click', triggerYouTubeModal);
    });
  
    vimeoTriggers.forEach(btn => {
      btn.addEventListener('click', triggerVimeoModal);
    });
  
    mp4Triggers.forEach(btn => {
      btn.addEventListener('click', triggerMp4Modal);
    });
  
    document.addEventListener('modalClose.VideoModal', closeVideoModal);
  
    function triggerYouTubeModal(evt) {
      // If not already loaded, treat as normal link
      if (!theme.config.youTubeReady) {
        return;
      }
  
      evt.preventDefault();
      emptyVideoHolder();
  
      modal.open(evt);
  
      var videoId = getYoutubeVideoId(evt.currentTarget.getAttribute('href'));
      youtubePlayer = new theme.YouTube(
        videoHolderId,
        {
          videoId: videoId,
          style: 'sound',
          events: {
            onReady: onYoutubeReady
          }
        }
      );
    }
  
    function triggerVimeoModal(evt) {
      // If not already loaded, treat as normal link
      if (!theme.config.vimeoReady) {
        return;
      }
  
      evt.preventDefault();
      emptyVideoHolder();
  
      modal.open(evt);
  
      var videoId = evt.currentTarget.dataset.videoId;
      var videoLoop = evt.currentTarget.dataset.videoLoop;
      vimeoPlayer = new theme.VimeoPlayer(
        videoHolderId,
        videoId,
        {
          style: 'sound',
          loop: videoLoop,
        }
      );
    }
  
    function triggerMp4Modal(evt) {
      emptyVideoHolder();
  
      var el = evt.currentTarget;
      var player = el.parentNode.querySelector(selectors.mp4Player);
  
      // Clone video element and place it in the modal
      var playerClone = player.cloneNode(true);
      playerClone.classList.remove('hide');
  
      videoHolderDiv.append(playerClone);
      modal.open(evt);
  
      // Play new video element
      videoHolderDiv.querySelector('video').play();
    }
  
    function onYoutubeReady(evt) {
      evt.target.unMute();
      evt.target.playVideo();
    }
  
    function getYoutubeVideoId(url) {
      var regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/;
      var match = url.match(regExp);
      return (match&&match[7].length==11)? match[7] : false;
    }
  
    function emptyVideoHolder() {
      videoHolderDiv.innerHTML = '';
    }
  
    function closeVideoModal() {
      if (youtubePlayer && typeof youtubePlayer.destroy === 'function') {
        youtubePlayer.destroy();
      } else if (vimeoPlayer && typeof vimeoPlayer.destroy === 'function') {
        vimeoPlayer.destroy();
      } else {
        emptyVideoHolder();
      }
    }
  };
  
  
  /*============================================================================
    ToolTip
  ==============================================================================*/
  
  class ToolTip extends HTMLElement {
    constructor() {
      super();
      this.el = this;
      this.inner = this.querySelector('[data-tool-tip-inner]');
      this.closeButton = this.querySelector('[data-tool-tip-close]');
      this.toolTipContent = this.querySelector('[data-tool-tip-content]');
      this.toolTipTitle = this.querySelector('[data-tool-tip-title]');
  
      this.triggers = document.querySelectorAll('[data-tool-tip-trigger]');
  
      document.addEventListener('tooltip:open', e => {
        this._open(e.detail.context, e.detail.content);
      });
    }
  
    _open(context, insertedHtml) {
      this.toolTipContent.innerHTML = insertedHtml;
  
      // Ensure we set a title for product availability
      if (context != 'store-availability') {
        this.toolTipTitle.remove();
      }
  
      this._lockScrolling();
  
      if (this.closeButton) {
        this.closeButton.on('click' + '.tooltip-close', () => {
          this._close();
        });
      }
  
      document.documentElement.on('click' + '.tooltip-outerclick', event => {
        if (this.el.dataset.toolTipOpen === 'true' && !this.inner.contains(event.target)) this._close();
      });
  
      document.documentElement.on('keydown' + '.tooltip-esc', event => {
        if (event.code === 'Escape') this._close();
      });
  
      this.el.dataset.toolTipOpen = true;
      this.el.dataset.toolTip = context;
    }
  
    _close() {
      this.toolTipContent.innerHTML = '';
      this.el.dataset.toolTipOpen = 'false';
      this.el.dataset.toolTip = '';
  
      this._unlockScrolling();
  
      this.closeButton.off('click' + '.tooltip-close');
      document.documentElement.off('click' + '.tooltip-outerclick');
      document.documentElement.off('keydown' + '.tooltip-esc');
    }
  
    _lockScrolling() {
      theme.a11y.trapFocus({
        container: this.el,
        namespace: 'tooltip_focus'
      });
  
      theme.a11y.lockMobileScrolling();
      document.documentElement.classList.add('modal-open');
    }
  
    _unlockScrolling() {
      theme.a11y.removeTrapFocus({
        container: this.el,
        namespace: 'tooltip_focus'
      });
  
      theme.a11y.unlockMobileScrolling();
      document.documentElement.classList.remove('modal-open');
    }
  }
  
  customElements.define('tool-tip', ToolTip);
  
  /*============================================================================
    ToolTipTrigger
  ==============================================================================*/
  
  class ToolTipTrigger extends HTMLElement {
    constructor() {
      super();
      this.el = this;
      this.toolTipContent = this.querySelector('[data-tool-tip-content]');
      this.init();
    }
  
    init() {
      const toolTipOpen = new CustomEvent('tooltip:open', {
        detail: {
          context: this.dataset.toolTip,
          content: this.toolTipContent.innerHTML
        },
        bubbles: true
      });
  
      this.el.addEventListener('click', e => {
        e.stopPropagation();
        this.dispatchEvent(toolTipOpen);
      });
    }
  }
  
  customElements.define('tool-tip-trigger', ToolTipTrigger);
  
  /*============================================================================
    NewsletterReminder
  ==============================================================================*/
  
  class NewsletterReminder extends HTMLElement {
    constructor() {
      super();
      this.closeBtn = this.querySelector('[data-close-button]');
      this.popupTrigger = this.querySelector('[data-message]');
  
      this.id = this.dataset.sectionId;
      this.newsletterId = `NewsletterPopup-${ this.id }`;
      this.cookie = Cookies.get(`newsletter-${this.id}`);
      this.cookieName = `newsletter-${this.id}`;
      this.secondsBeforeShow = this.dataset.delaySeconds;
      this.expiry = parseInt(this.dataset.delayDays);
      this.modal = new theme.Modals(`NewsletterPopup-${this.newsletterId}`, 'newsletter-popup-modal');
  
      this.init();
    }
  
    init() {
      document.addEventListener('shopify:block:select', (evt) => {
        if (evt.detail.sectionId === this.id) {
          this.show(0, true)
        }
      });
  
      document.addEventListener('shopify:block:deselect', (evt) => {
        if (evt.detail.sectionId === this.id) {
          this.hide();
        }
      });
  
      document.addEventListener(`modalOpen.${this.newsletterId}`, () => this.hide());
      document.addEventListener(`modalClose.${this.newsletterId}`, () => this.show());
      document.addEventListener(`newsletter:openReminder`, () => this.show(0));
  
      this.closeBtn.addEventListener('click', () => {
        this.hide();
        Cookies.set(this.cookieName, 'opened', { path: '/', expires: this.expiry });
      });
  
      this.popupTrigger.addEventListener('click', () => {
        const reminderOpen = new CustomEvent('reminder:openNewsletter', { bubbles: true });
        this.dispatchEvent(reminderOpen);
  
        this.hide();
      });
    }
  
    show(time = this.secondsBeforeShow, forceOpen = false) {
      const reminderAppeared = (sessionStorage.getItem('reminderAppeared') === 'true');
  
      if (!reminderAppeared) {
        setTimeout(() => {
          this.dataset.enabled = 'true';
          sessionStorage.setItem('reminderAppeared', true);
        }, time * 1000);
      }
    }
  
    hide() {
      this.dataset.enabled = 'false';
    }
  }
  
  customElements.define('newsletter-reminder', NewsletterReminder);
  
  /*============================================================================
    ImageElement
  ==============================================================================*/
  
  class ImageElement extends HTMLElement {
    constructor() {
      super();
  
      this.init();
    }
  
    init() {
  
      const handleIntersection = (entries, observer) => {
        if (!entries[0].isIntersecting) return;
  
        this.removeAnimations();
  
        observer.unobserve(this);
      }
  
      // Set an IntersectionObserver to check if the image is nearly in the viewport
      new IntersectionObserver(handleIntersection.bind(this), {rootMargin: '0px 0px 400px 0px'}).observe(this);
    }
  
    removeAnimations() {
      // Find the closest image-wrap and remove the animation (fix for streamline image-wrap shimmer)
      const imageWrap = this.closest('.image-wrap');
      const skrimWrap = this.closest('.skrim__link');
  
      if (imageWrap) {
        imageWrap.classList.add('loaded');
      }
  
      if (skrimWrap) {
        skrimWrap.classList.add('loaded');
      }
    }
  }
  
  customElements.define('image-element', ImageElement);
  
  /*============================================================================
    PredictiveSearch
  ==============================================================================*/
  
  class PredictiveSearch extends HTMLElement {
    constructor() {
      super();
      this.enabled = this.getAttribute('data-enabled');
      this.context = this.getAttribute('data-context');
      this.input = this.querySelector('input[type="search"]');
      this.predictiveSearchResults = this.querySelector('#predictive-search');
      this.closeBtn = this.querySelector('.btn--close-search');
      this.screen = this.querySelector('[data-screen]');
      this.SearchModal = this.closest('#SearchModal') || null;
  
      // Open events
      document.addEventListener('predictive-search:open', e => {
        if (e.detail.context !== this.context) return;
        this.classList.add('is-active');
  
        // Wait for opening events to finish then apply focus
        setTimeout(() => { this.input.focus(); }, 100);
  
        document.body.classList.add('predictive-overflow-hidden');
      });
  
      // listen for class change of 'modal--is-active on this.SearchModal
      if (this.SearchModal) {
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            if (mutation.attributeName === 'class') {
              const modalClass = mutation.target.className;
              if (modalClass.indexOf('modal--is-active') > -1) {
                setTimeout(() => { this.input.focus(); }, 100);
              }
            }
          });
        });
  
        observer.observe(this.SearchModal, {
          attributes: true
        });
      }
  
      if (this.enabled === 'false') return;
  
      // On typing
      this.input.addEventListener('keydown', () => { this.classList.add('is-active'); });
  
      this.input.addEventListener('input', this.debounce((event) => {
        this.onChange(event);
      }, 300).bind(this));
  
      // Close events
      document.addEventListener('predictive-search:close', () => { this.close(); });
      document.addEventListener('keydown', (event) => { if (event.keyCode === 27) this.close(); });
      this.closeBtn.addEventListener('click', e => { e.preventDefault(); this.close(); });
      this.screen.addEventListener('click', () => { this.close(); });
    }
  
    onChange() {
      const searchTerm = this.input.value.trim();
  
      if (!searchTerm.length) return;
  
      this.getSearchResults(searchTerm);
    }
  
    getSearchResults(searchTerm) {
      const searchObj = {
        'q': searchTerm,
        'resources[limit]': 3,
        'resources[limit_scope]': 'each'
      };
  
      const params = this.paramUrl(searchObj);
  
      fetch(`${theme.routes.predictiveSearch}?${params}&section_id=search-results`)
        .then((response) => {
          if (!response.ok) {
            const error = new Error(response.status);
            this.close();
            throw error;
          }
  
          return response.text();
        })
        .then((text) => {
          const resultsMarkup = new DOMParser().parseFromString(text, 'text/html').querySelector('#shopify-section-search-results').innerHTML;
          this.predictiveSearchResults.innerHTML = resultsMarkup;
          this.open();
  
          AOS.refreshHard();
        })
        .catch((error) => {
          this.close();
          throw error;
        });
    }
  
    open() {
      this.predictiveSearchResults.style.display = 'block';
    }
  
    close() {
      this.predictiveSearchResults.style.display = 'none';
      this.predictiveSearchResults.innerHTML = '';
      this.classList.remove('is-active');
      document.body.classList.remove('predictive-overflow-hidden');
  
      document.dispatchEvent(new CustomEvent('predictive-search:close-all'));
    }
  
    debounce(fn, wait) {
      let t;
      return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), wait);
      };
    }
  
    paramUrl(obj) {
      return Object.keys(obj).map(function(key) {
        return key + '=' + encodeURIComponent(obj[key]);
      }).join('&')
    }
  }
  
  customElements.define('predictive-search', PredictiveSearch);
  
  class RecipientForm extends HTMLElement {
    constructor() {
      super();
      this.checkboxInput = this.querySelector(`#Recipient-Checkbox-${ this.dataset.sectionId }`);
      this.emailInput = this.querySelector(`#Recipient-email-${ this.dataset.sectionId }`);
      this.nameInput = this.querySelector(`#Recipient-name-${ this.dataset.sectionId }`);
      this.messageInput = this.querySelector(`#Recipient-message-${ this.dataset.sectionId }`);
      this.dateInput = this.querySelector(`#Recipient-send-on-${ this.dataset.sectionId }`);
      this.addEventListener('change', () => this.onChange());
      this.recipientFields = this.querySelector('.recipient-fields');
  
      this.checkboxInput.addEventListener('change', () => {
        this.recipientFields.style.display = this.checkboxInput.checked ? 'block' : 'none';
      });
    }
  
    connectedCallback() {
      document.addEventListener('ajaxProduct:error', (event) => {
        const productVariantID = event.target.querySelector('[name="id"]').value;
        if (productVariantID === this.dataset.productVariantId) {
          this.displayErrorMessage(event.detail.errorMessage);
        }
      });
  
      document.addEventListener('ajaxProduct:added', (event) => {
        const productVariantID = event.target.querySelector('[name="id"]').value;
        if (productVariantID === this.dataset.productVariantId) {
          this.clearInputFields();
          this.clearErrorMessage();
        }
      });
    }
  
    onChange() {
      if (!this.checkboxInput.checked) {
        this.clearInputFields();
        this.clearErrorMessage();
      }
    }
  
    clearInputFields() {
      this.querySelectorAll('.field__input').forEach(el => el.value = '');
    }
  
    displayErrorMessage(body) {
      this.clearErrorMessage();
      if (body) {
        return Object.entries(body).forEach(([key, value]) => {
          const inputElement = this[`${key}Input`];
          if (!inputElement) return;
  
          inputElement.setAttribute('aria-invalid', true);
          inputElement.classList.add('field__input--error');
        });
      }
    }
  
    clearErrorMessage() {
      this.querySelectorAll('.field__input').forEach(inputElement => {
        inputElement.setAttribute('aria-invalid', false);
        inputElement.removeAttribute('aria-describedby');
        inputElement.classList.remove('field__input--error');
      });
    }
  };
  
  customElements.define('recipient-form', RecipientForm);
  

  theme.announcementBar = (function() {
    var args = {
      autoPlay: 5000,
      avoidReflow: true,
      cellAlign: theme.config.rtl ? 'right' : 'left'
    };
    var bar;
    var flickity;
  
    function init() {
      bar = document.getElementById('AnnouncementSlider');
      if (!bar) {
        return;
      }
  
      unload();
  
      if (bar.dataset.blockCount === 1) {
        return;
      }
  
      if (theme.config.bpSmall || bar.dataset.compact === 'true') {
        initSlider();
      }
  
      document.addEventListener('matchSmall', function() {
        unload();
        initSlider();
      });
  
      document.addEventListener('unmatchSmall', function() {
        unload();
        if (bar.dataset.compact === 'true') {
          initSlider();
        }
      });
    }
  
    function initSlider() {
      flickity = new theme.Slideshow(bar, args);
    }
  
    // Go to slide if selected in the editor
    function onBlockSelect(id) {
      var slide = bar.querySelector('#AnnouncementSlide-' + id);
      var index = parseInt(slide.dataset.index);
  
      if (flickity && typeof flickity.pause === 'function') {
        flickity.goToSlide(index);
        flickity.pause();
      }
    }
  
    function onBlockDeselect() {
      if (flickity && typeof flickity.play === 'function') {
        flickity.play();
      }
    }
  
    function unload() {
      if (flickity && typeof flickity.destroy === 'function') {
        flickity.destroy();
      }
    }
  
    return {
      init: init,
      onBlockSelect: onBlockSelect,
      onBlockDeselect: onBlockDeselect,
      unload: unload
    };
  })();
  
  theme.customerTemplates = function() {
    checkUrlHash();
    initEventListeners();
    resetPasswordSuccess();
    customerAddressForm();
  
    function checkUrlHash() {
      var hash = window.location.hash;
  
      // Allow deep linking to recover password form
      if (hash === '#recover') {
        toggleRecoverPasswordForm();
      }
    }
  
    function toggleRecoverPasswordForm() {
      var passwordForm = document.getElementById('RecoverPasswordForm').classList.toggle('hide');
      var loginForm = document.getElementById('CustomerLoginForm').classList.toggle('hide');
    }
  
    function initEventListeners() {
      // Show reset password form
      var recoverForm = document.getElementById('RecoverPassword');
      if (recoverForm) {
        recoverForm.addEventListener('click', function(evt) {
          evt.preventDefault();
          toggleRecoverPasswordForm();
        });
      }
  
      // Hide reset password form
      var hideRecoverPassword = document.getElementById('HideRecoverPasswordLink');
      if (hideRecoverPassword) {
        hideRecoverPassword.addEventListener('click', function(evt) {
          evt.preventDefault();
          toggleRecoverPasswordForm();
        });
      }
    }
  
    function resetPasswordSuccess() {
      var formState = document.querySelector('.reset-password-success');
  
      // check if reset password form was successfully submitted
      if (!formState) {
        return;
      }
  
      // show success message
      document.getElementById('ResetSuccess').classList.remove('hide');
    }
  
    function customerAddressForm() {
      var newAddressForm = document.getElementById('AddressNewForm');
      var addressForms = document.querySelectorAll('.js-address-form');
  
      if (!newAddressForm || !addressForms.length) {
        return;
      }
  
      // Country/province selector can take a short time to load
      setTimeout(function() {
        document.querySelectorAll('.js-address-country').forEach(el => {
          var countryId = el.dataset.countryId;
          var provinceId = el.dataset.provinceId;
          var provinceContainerId = el.dataset.provinceContainerId;
  
          new Shopify.CountryProvinceSelector(
            countryId,
            provinceId,
            {
              hideElement: provinceContainerId
            }
          );
        });
      }, 1000);
  
      // Toggle new/edit address forms
      document.querySelectorAll('.address-new-toggle').forEach(el => {
        el.addEventListener('click', function() {
          newAddressForm.classList.toggle('hide');
        });
      });
  
      document.querySelectorAll('.address-edit-toggle').forEach(el => {
        el.addEventListener('click', function(evt) {
          var formId = evt.currentTarget.dataset.formId;
          document.getElementById('EditAddress_' + formId).classList.toggle('hide');
        });
      });
  
      document.querySelectorAll('.address-delete').forEach(el => {
        el.addEventListener('click', function(evt) {
          var formId = evt.currentTarget.dataset.formId;
          var confirmMessage = evt.currentTarget.dataset.confirmMessage;
  
          if (confirm(confirmMessage || 'Are you sure you wish to delete this address?')) {
            if (Shopify) {
              Shopify.postLink('/account/addresses/' + formId, {parameters: {_method: 'delete'}});
            }
          }
        })
      });
    }
  };
  
  theme.CartDrawer = (function() {
    var selectors = {
      drawer: '#CartDrawer',
      form: '#CartDrawerForm'
    };
  
    function CartDrawer() {
      this.form = document.querySelector(selectors.form);
      this.drawer = new theme.Drawers('CartDrawer', 'cart');
  
      this.init();
    }
  
    CartDrawer.prototype = Object.assign({}, CartDrawer.prototype, {
      init: function() {
        this.cartForm = new theme.CartForm(this.form);
        this.cartForm.buildCart();
  
        document.addEventListener('ajaxProduct:added', function(evt) {
          this.cartForm.buildCart();
          this.open();
        }.bind(this));
  
        // Dev-friendly way to open cart
        document.addEventListener('cart:open', this.open.bind(this));
        document.addEventListener('cart:close', this.close.bind(this));
      },
  
      open: function() {
        this.drawer.open();
  
        theme.a11y.trapFocus({
          container: this.form,
          elementToFocus: this.form,
          namespace: 'cartdrawer_focus'
        });
      },
  
      close: function() {
        this.drawer.close();
  
        theme.a11y.removeTrapFocus({
          container: this.form,
          namespace: 'cartdrawer_focus'
        });
      }
    });
  
    return CartDrawer;
  })();
  
  theme.headerNav = (function() {
    var selectors = {
      wrapper: '#HeaderWrapper',
      siteHeader: '#SiteHeader',
      searchBtn: '.js-search-header',
      closeSearch: '#SearchClose',
      searchContainer: '.site-header__search-container',
      logo: '#LogoContainer img',
      megamenu: '.megamenu',
      navItems: '.site-nav__item',
      navLinks: '.site-nav__link',
      navLinksWithDropdown: '.site-nav__link--has-dropdown',
      navDropdownLinks: '.site-nav__dropdown-link--second-level',
      navDetails: '.site-nav__details',
    };
  
    var classes = {
      hasDropdownClass: 'site-nav--has-dropdown',
      hasSubDropdownClass: 'site-nav__deep-dropdown-trigger',
      dropdownActive: 'is-focused'
    };
  
    var config = {
      namespace: '.siteNav',
      wrapperOverlayed: false,
      overlayedClass: 'is-light',
      overlayEnabledClass: 'header-wrapper--sticky',
      stickyEnabled: false,
      stickyActive: false,
      stickyClass: 'site-header--stuck',
      stickyHeaderWrapper: 'StickyHeaderWrap',
      openTransitionClass: 'site-header--opening',
      lastScroll: 0
    };
  
    // Elements used in resize functions, defined in init
    var wrapper;
    var siteHeader;
  
    function init() {
      wrapper = document.querySelector(selectors.wrapper);
      siteHeader = document.querySelector(selectors.siteHeader);
  
      config.stickyEnabled = (siteHeader.dataset.sticky === 'true');
      if (config.stickyEnabled) {
        config.wrapperOverlayed = wrapper.classList.contains(config.overlayedClass);
        stickyHeaderCheck();
      }
  
      theme.settings.overlayHeader = (siteHeader.dataset.overlay === 'true');
      // Disable overlay header if on collection template with no collection image
      if (theme.settings.overlayHeader && Shopify && Shopify.designMode) {
        if (document.body.classList.contains('template-collection') && !document.querySelector('.collection-hero')) {
          this.disableOverlayHeader();
        }
      }
  
      menuDetailsHandler();
      searchDrawer();
    }
  
    function menuDetailsHandler() {
      const navDetails = document.querySelectorAll(selectors.navDetails);
  
      navDetails.forEach((navDetail) => {
        const summary = navDetail.querySelector('summary');
  
        // if the navDetail is open, then close it when the user clicks outside of it
        document.addEventListener('click', (evt) => {
          if (navDetail.hasAttribute('open') && !navDetail.contains(evt.target)) {
            navDetail.removeAttribute('open');
            summary.setAttribute('aria-expanded', 'false');
          } else {
            if (navDetail.hasAttribute('open')) {
              summary.setAttribute('aria-expanded', 'false');
            } else {
              summary.setAttribute('aria-expanded', 'true');
            }
          }
        });
      });
    }
  
    // If the header setting to overlay the menu on the collection image
    // is enabled but the collection setting is disabled, we need to undo
    // the init of the sticky nav
    function disableOverlayHeader() {
      wrapper.classList.remove(config.overlayEnabledClass, config.overlayedClass);
      config.wrapperOverlayed = false;
      theme.settings.overlayHeader = false;
    }
  
    function stickyHeaderCheck() {
      // Disable sticky header if any mega menu is taller than window
      theme.config.stickyHeader = doesMegaMenuFit();
  
      if (theme.config.stickyHeader) {
        config.forceStopSticky = false;
        stickyHeader();
      } else {
        config.forceStopSticky = true;
      }
    }
  
    function doesMegaMenuFit() {
      var largestMegaNav = 0;
      siteHeader.querySelectorAll(selectors.megamenu).forEach(nav => {
        var h = nav.offsetHeight;
        if (h > largestMegaNav) {
          largestMegaNav = h;
        }
      });
  
      // 120 ~ space of visible header when megamenu open
      if (window.innerHeight < (largestMegaNav + 120)) {
        return false;
      }
  
      return true;
    }
  
    function stickyHeader() {
      config.lastScroll = 0;
  
      var wrapWith = document.createElement('div');
      wrapWith.id = config.stickyHeaderWrapper;
      theme.utils.wrap(siteHeader, wrapWith);
  
      stickyHeaderInitialPosition(siteHeader);
      stickyHeaderHeight();
  
      window.on('resize' + config.namespace, theme.utils.debounce(50, stickyHeaderHeight));
      window.on('scroll' + config.namespace, theme.utils.throttle(20, stickyHeaderScroll));
  
      // This gets messed up in the editor, so here's a fix
      if (Shopify && Shopify.designMode) {
        setTimeout(function() {
          stickyHeaderHeight();
        }, 250);
      }
    }
  
    function stickyHeaderInitialPosition(header) {
      const headerParent = header.closest('.shopify-section-group-header-group');
      const parentNextSibling = headerParent.nextElementSibling;
  
      // if parentNextSibling has same class as headerParent, then header is above announcement bar
      if (parentNextSibling && parentNextSibling.classList.contains('shopify-section-group-header-group')) {
        // get height of announcement bar and set header wrapper top to that value
        const nextSiblingHeight = parentNextSibling.offsetHeight;
        document.querySelector(selectors.wrapper).style.top = nextSiblingHeight + 'px';
      }
    }
  
    function stickyHeaderHeight() {
      if (!config.stickyEnabled) {
        return;
      }
  
      var h = siteHeader.offsetHeight;
  
      // If sticky header is 'active' i.e. we have scrolled a bit down the page
      // the site header has 20px less padding when sticky
      // and this is not factored into the height calculation
      // The 20px is what causes the header to overlap the announcement bar
      // This only applies when the height is being calculated on larger screen sizes
      if (siteHeader.classList.contains('site-header--stuck') && !theme.config.bpSmall) {
        let siteHeaderPadding = parseFloat(window.getComputedStyle(siteHeader, null).getPropertyValue('padding-top'));
        h += siteHeaderPadding * 2;
      }
  
      var stickyHeader = document.querySelector('#' + config.stickyHeaderWrapper);
      stickyHeader.style.height = h + 'px';
    }
  
    function stickyHeaderScroll() {
      if (!config.stickyEnabled) {
        return;
      }
  
      if (config.forceStopSticky) {
        return;
      }
  
      requestAnimationFrame(scrollHandler);
  
      config.lastScroll = window.scrollY;
    }
  
    function scrollHandler() {
      if (window.scrollY > 250) {
        if (config.stickyActive) {
          return;
        }
  
        config.stickyActive = true;
  
        siteHeader.classList.add(config.stickyClass);
        if (config.wrapperOverlayed) {
          wrapper.classList.remove(config.overlayedClass);
        }
  
        // Add open transition class after element is set to fixed
        // so CSS animation is applied correctly
        setTimeout(function() {
          siteHeader.classList.add(config.openTransitionClass);
        }, 100);
      } else {
        if (!config.stickyActive) {
          return;
        }
  
        config.stickyActive = false;
  
        siteHeader.classList.remove(config.openTransitionClass);
        siteHeader.classList.remove(config.stickyClass);
        if (config.wrapperOverlayed) {
          wrapper.classList.add(config.overlayedClass);
        }
      }
    }
  
    function searchDrawer() {
      document.querySelectorAll(selectors.searchBtn).forEach(btn => {
        btn.addEventListener('click', function(evt) {
          evt.preventDefault();
          evt.stopPropagation();
          document.dispatchEvent(new CustomEvent('predictive-search:open', {
            detail: {
              context: 'header'
            },
            bubbles: true
          }));
  
          // add is-active class to .site-header__search-container
          document.querySelector(selectors.searchContainer).classList.add('is-active');
        });
      });
  
      document.addEventListener('predictive-search:close-all', function() {
        closeSearchDrawer();
      });
    }
  
    function closeSearchDrawer(evt) {
      // Do not close if click event came from inside drawer
      if (evt) {
        // evt.path is non-standard, so have fallback
        var path = evt.path || (evt.composedPath && evt.composedPath());
        for (var i = 0; i < path.length; i++) {
          if (path[i].classList) {
            if (path[i].classList.contains('site-header__search-btn')) {
              break;
            }
  
            if (path[i].classList.contains('site-header__search-container')) {
              return;
            }
          }
        }
      }
  
      // deselect any focused form elements
      document.activeElement.blur();
  
      document.documentElement.classList.add('js-drawer-closing');
      document.documentElement.classList.remove('js-drawer-open', 'js-drawer-open--search');
  
      window.setTimeout(function() {
        document.documentElement.classList.remove('js-drawer-closing');
      }.bind(this), 500);
  
      var container = document.querySelector(selectors.searchContainer);
      theme.utils.prepareTransition(container, function() {
        container.classList.remove('is-active');
      }.bind(this));
    }
  
    return {
      init: init,
      disableOverlayHeader: disableOverlayHeader
    };
  })();
  
  window.onpageshow = function(evt) {
    // Removes unload class when returning to page via history
    if (evt.persisted) {
      document.body.classList.remove('unloading');
      document.querySelectorAll('.cart__checkout').forEach(el => {
        el.classList.remove('btn--loading');
      });
    }
  };
  
  theme.buildProductGridItem = function(items, gridWidth, rowOf, imageSizes) {
    var output = '';
  
    items.forEach(product => {
      var image = theme.buildProductImage(product, imageSizes);
  
      let priceMarkup = '';
      let vendorMarkup = '';
  
      if (theme.settings.predictiveSearchPrice) priceMarkup = `<div class="grid-product__price">${theme.strings.productFrom}${theme.Currency.formatMoney(product.price_min, theme.moneyFormat)}</div>`;
      if (theme.settings.predictiveSearchVendor) vendorMarkup = `<div class="grid-product__vendor">${product.vendor}</div>`;
  
      var markup = `
        <div class="grid__item grid-product ${gridWidth} aos-animate" data-aos="row-of-${rowOf}">
          <div class="grid-product__content">
            <a href="${product.url}" class="grid-product__link">
            <!-- aria-hidden="true" due to image alt text just includes product title, duplicated below // SM:2025.06.20, rule: image-redundant-alt -->
              <div class="grid-product__image-mask" aria-hidden="true">
                ${image}
              </div>
              <div class="grid-product__meta">
                <div class="grid-product__title">${product.title}</div>
                ${priceMarkup}
                ${vendorMarkup}
              </div>
            </a>
          </div>
        </div>
      `;
  
      output += markup;
    });
  
    return output;
  }
  
  theme.buildProductImage = function(product, imageSizes) {
    var size = theme.settings.productImageSize;
    var output = '';
  
    if (size === 'natural') {
      const template = document.getElementById("naturalImageMarkup");
      const clonedMarkup = template.content.cloneNode(true);
      const imageEl = clonedMarkup.querySelector('img');
      const imageWrapperEl = clonedMarkup.querySelector('.image-wrap');
  
      imageWrapperEl.style.paddingBottom = `${product.image_aspect_ratio}%`;
  
      addImageProperties(imageEl, imageSizes);
  
      const imageDiv = document.createElement('div');
      imageDiv.appendChild(clonedMarkup);
  
      output = imageDiv.innerHTML;
    } else {
      const template = document.getElementById("fixedRatioImageMarkup");
      const clonedMarkup = template.content.cloneNode(true);
      const imageEl = clonedMarkup.querySelector('img');
      const imageWrapperEl = clonedMarkup.querySelector('.grid__image-ratio');
  
      imageWrapperEl.classList.add(`grid__image-ratio--${size}`);
  
      if (!theme.settings.productImageCover) {
        imageEl.classList.add('grid__image-contain');
      }
  
      addImageProperties(imageEl, imageSizes);
  
      const imageDiv = document.createElement('div');
      imageDiv.appendChild(clonedMarkup);
  
      output = imageDiv.innerHTML;
    }
  
    function addImageProperties(imageEl, imageSizes) {
      imageEl.src = product.image_responsive_url;
      imageEl.srcset = product.image_responsive_urls.toString();
      imageEl.alt = product.title;
      imageEl.sizes = imageSizes;
    }
  
    return output;
  }
  

  /*============================================================================
    Age Verification Popup
  ==============================================================================*/
  
  class AgeVerificationPopup extends HTMLElement {
    constructor() {
      super();
  
      this.cookieName = this.id;
      this.cookie = Cookies.get(this.cookieName);
  
      this.classes = {
        activeContent: 'age-verification-popup__content--active',
        inactiveContent: 'age-verification-popup__content--inactive',
        inactiveDeclineContent: 'age-verification-popup__decline-content--inactive',
        activeDeclineContent: 'age-verification-popup__decline-content--active',
      }
  
      this.declineButton = this.querySelector('[data-age-verification-popup-decline-button]');
      this.declineContent = this.querySelector('[data-age-verification-popup-decline-content]');
      this.content = this.querySelector('[data-age-verification-popup-content]');
      this.returnButton = this.querySelector('[data-age-verification-popup-return-button]');
      this.exitButton = this.querySelector('[data-age-verification-popup-exit-button]');
      this.backgroundImage = this.querySelector('[data-background-image]');
      this.mobileBackgroundImage = this.querySelector('[data-mobile-background-image]');
  
      if (Shopify.designMode) {
        document.addEventListener('shopify:section:select', (event) => {
          if (event.detail.sectionId === this.dataset.sectionId) {
            this.init();
          }
        })
  
        document.addEventListener('shopify:section:load', (event) => {
          if (event.detail.sectionId === this.dataset.sectionId) {
            this.init();
  
            // If 'Test mode' is enabled, remove the cookie we've set
            if (this.dataset.testMode === 'true' && this.cookie) {
              Cookies.remove(this.cookieName);
            }
  
            // Check session storage if user was editing on the second view
            const secondViewVisited = sessionStorage.getItem(this.id);
  
            if (!secondViewVisited) return;
  
            this.showDeclineContent();
          }
        })
  
        document.addEventListener('shopify:section:unload', (event) => {
          if (event.detail.sectionId === this.dataset.sectionId) {
            this.modal.close();
          }
        })
      }
  
      // Age verification popup will only be hidden if test mode is disabled AND
      // either a cookie exists OR visibility is toggled in the editor
      if ((this.cookie) && this.dataset.testMode === 'false') return;
  
      this.init();
    }
  
    init() {
      this.modal = new theme.Modals(this.id, 'age-verification-popup-modal', {
        closeOffContentClick: false
      });
  
      if (this.backgroundImage) {
        this.backgroundImage.style.display = 'block';
      }
  
      if (theme.config.bpSmall && this.mobileBackgroundImage) {
        this.mobileBackgroundImage.style.display = 'block';
      }
  
      this.modal.open();
  
      theme.a11y.lockMobileScrolling(`#${this.id}`, document.querySelector('#MainContent'));
  
      if (this.declineButton) {
        this.declineButton.addEventListener('click', (e) => {
          e.preventDefault();
          this.showDeclineContent();
  
          // If in editor, save to session storage to indicate that user has moved on to the second view
          // Allows view to persist while making changes in the editor
          if (Shopify.designMode) {
            sessionStorage.setItem(this.id, 'second-view');
          }
        });
      }
  
      if (this.returnButton) {
        this.returnButton.addEventListener('click', (e) => {
          e.preventDefault();
          this.hideDeclineContent();
  
          // Remove data from session storage so second view doesn't persist
          const secondViewVisited = sessionStorage.getItem(this.id);
  
          if (Shopify.designMode && secondViewVisited) {
            sessionStorage.removeItem(this.id);
          }
        })
      }
  
      if (this.exitButton) {
        this.exitButton.addEventListener('click', (e) => {
          e.preventDefault();
  
          // We don't want to set a cookie if in test mode
          if (this.dataset.testMode === 'false') {
            Cookies.set(this.cookieName, 'entered', { expires: 30, sameSite: 'none', secure: true });
          }
  
          if (this.backgroundImage) {
            this.backgroundImage.style.display = 'none';
          }
  
          if (theme.config.bpSmall && this.mobileBackgroundImage) {
            this.mobileBackgroundImage.style.display = 'none';
          }
  
          this.modal.close();
  
          theme.a11y.unlockMobileScrolling(`#${this.id}`, document.querySelector('#MainContent'));
        })
      }
    }
  
    showDeclineContent() {
      this.declineContent.classList.remove(this.classes.inactiveDeclineContent);
      this.declineContent.classList.add(this.classes.activeDeclineContent);
  
      this.content.classList.add(this.classes.inactiveContent);
      this.content.classList.remove(this.classes.activeContent);
    }
  
    hideDeclineContent() {
      this.declineContent.classList.add(this.classes.inactiveDeclineContent);
      this.declineContent.classList.remove(this.classes.activeDeclineContent);
  
      this.content.classList.remove(this.classes.inactiveContent);
      this.content.classList.add(this.classes.activeContent);
    }
  }
  
  customElements.define('age-verification-popup', AgeVerificationPopup);
  
  
  
  theme.Maps = (function() {
    var config = {
      zoom: 14
    };
    var apiStatus = null;
    var mapsToLoad = [];
  
    var errors = {};
  
    var selectors = {
      section: '[data-section-type="map"]',
      map: '[data-map]',
      mapOverlay: '.map-section__overlay'
    };
  
    // Global function called by Google on auth errors.
    // Show an auto error message on all map instances.
    window.gm_authFailure = function() {
      if (!Shopify.designMode) {
        return;
      }
  
      document.querySelectorAll(selectors.section).forEach(section => {
        section.classList.add('map-section--load-error');
      });
  
      document.querySelectorAll(selectors.map).forEach(map => {
        map.parentNode.removeChild(map);
      });
  
      window.mapError(theme.strings.authError);
    };
  
    window.mapError = function(error) {
      var message = document.createElement('div');
      message.classList.add('map-section__error', 'errors', 'text-center');
      message.innerHTML = error;
      document.querySelectorAll(selectors.mapOverlay).forEach(overlay => {
        overlay.parentNode.prepend(message);
      });
      document.querySelectorAll('.map-section__link').forEach(link => {
        link.classList.add('hide');
      });
    };
  
    function Map(container) {
      this.container = container;
      this.sectionId = this.container.getAttribute('data-section-id');
      this.namespace = '.map-' + this.sectionId;
      this.map = container.querySelector(selectors.map);
      this.key = this.map.dataset.apiKey;
  
      errors = {
        addressNoResults: theme.strings.addressNoResults,
        addressQueryLimit: theme.strings.addressQueryLimit,
        addressError: theme.strings.addressError,
        authError: theme.strings.authError
      };
  
      if (!this.key) {
        return;
      }
  
      theme.initWhenVisible({
        element: this.container,
        callback: this.prepMapApi.bind(this),
        threshold: 20
      });
    }
  
    // API has loaded, load all Map instances in queue
    function initAllMaps() {
      mapsToLoad.forEach(instance => {
        instance.createMap();
      });
    }
  
    function geolocate(map) {
      var geocoder = new google.maps.Geocoder();
  
      if (!map) {
        return;
      }
  
      var address = map.dataset.addressSetting;
  
      var deferred = new Promise((resolve, reject) => {
        geocoder.geocode({ address: address }, function(results, status) {
          if (status !== google.maps.GeocoderStatus.OK) {
            reject(status);
          }
          resolve(results);
        });
      });
  
      return deferred;
    }
  
    Map.prototype = Object.assign({}, Map.prototype, {
      prepMapApi: function() {
        if (apiStatus === 'loaded') {
          this.createMap();
        } else {
          mapsToLoad.push(this);
  
          if (apiStatus !== 'loading') {
            apiStatus = 'loading';
            if (typeof window.google === 'undefined' || typeof window.google.maps === 'undefined' ) {
  
              var script = document.createElement('script');
              script.onload = function () {
                apiStatus = 'loaded';
                initAllMaps();
              };
              script.src = 'https://maps.googleapis.com/maps/api/js?key=' + this.key;
              document.head.appendChild(script);
            }
          }
        }
      },
  
      createMap: function() {
        var mapDiv = this.map;
  
        return geolocate(mapDiv)
          .then(
            function(results) {
              var mapOptions = {
                zoom: config.zoom,
                backgroundColor: 'none',
                center: results[0].geometry.location,
                draggable: false,
                clickableIcons: false,
                scrollwheel: false,
                disableDoubleClickZoom: true,
                disableDefaultUI: true
              };
  
              var map = (this.map = new google.maps.Map(mapDiv, mapOptions));
              var center = (this.center = map.getCenter());
  
              var marker = new google.maps.Marker({
                map: map,
                position: map.getCenter()
              });
  
              google.maps.event.addDomListener(
                window,
                'resize',
                theme.utils.debounce(250, function() {
                  google.maps.event.trigger(map, 'resize');
                  map.setCenter(center);
                  mapDiv.removeAttribute('style');
                })
              );
  
              if (Shopify.designMode) {
                if (window.AOS) { AOS.refreshHard() }
              }
            }.bind(this)
          )
          .catch(function(status) {
            var errorMessage;
  
            switch (status) {
              case 'ZERO_RESULTS':
                errorMessage = errors.addressNoResults;
                break;
              case 'OVER_QUERY_LIMIT':
                errorMessage = errors.addressQueryLimit;
                break;
              case 'REQUEST_DENIED':
                errorMessage = errors.authError;
                break;
              default:
                errorMessage = errors.addressError;
                break;
            }
  
            // Show errors only to merchant in the editor.
            if (Shopify.designMode) {
              window.mapError(errorMessage);
            }
          });
      },
  
      onUnload: function() {
        if (this.map.length === 0) {
          return;
        }
        // Causes a harmless JS error when a section without an active map is reloaded
        if (google && google.maps && google.maps.event) {
          google.maps.event.clearListeners(this.map, 'resize');
        }
      }
    });
  
    return Map;
  })();
  
  theme.NewsletterPopup = (function () {
    function NewsletterPopup(container) {
      this.container = container;
      var sectionId = this.container.getAttribute('data-section-id');
  
      this.cookieName = 'newsletter-' + sectionId;
      this.cookie = Cookies.get(this.cookieName);
  
      if (!container) {
        return;
      }
  
      // Prevent popup on Shopify robot challenge page
      if (window.location.pathname === '/challenge') {
        return;
      }
  
      // Prevent popup on password page
      if (window.location.pathname === '/password') {
        return;
      }
  
      this.data = {
        secondsBeforeShow: container.dataset.delaySeconds,
        daysBeforeReappear: container.dataset.delayDays,
        hasReminder: container.dataset.hasReminder,
        testMode: container.dataset.testMode
      };
  
      this.modal = new theme.Modals('NewsletterPopup-' + sectionId, 'newsletter-popup-modal');
  
      // Set cookie if optional button is clicked
      var btn = container.querySelector('.popup-cta a');
      if (btn) {
        btn.addEventListener('click', function () {
          this.closePopup(true);
        }.bind(this));
      }
  
      // Open modal if errors or success message exist
      if (container.querySelector('.errors') || container.querySelector('.note--success')) {
        this.modal.open();
      }
  
      // Set cookie as opened if success message
      if (container.querySelector('.note--success')) {
        this.closePopup(true);
        return;
      }
  
      document.addEventListener('modalClose.' + container.id, this.closePopup.bind(this));
  
      if (!this.cookie) {
        this.initPopupDelay();
      }
  
      // Open modal if triggered by newsletter reminder
      document.addEventListener('reminder:openNewsletter', () => {
        this.modal.open();
      });
    }
  
    NewsletterPopup.prototype = Object.assign({}, NewsletterPopup.prototype, {
      initPopupDelay: function () {
        if (this.data.testMode === 'true') {
          return;
        }
        setTimeout(function () {
          const newsletterAppeared = (sessionStorage.getItem('newsletterAppeared') === 'true');
          if (newsletterAppeared) {
            const openReminder = new CustomEvent('newsletter:openReminder', { bubbles: true });
            this.container.dispatchEvent(openReminder);
          } else {
            this.modal.open();
            sessionStorage.setItem('newsletterAppeared', true);
          }
  
        }.bind(this), this.data.secondsBeforeShow * 1000);
      },
  
      closePopup: function (success) {
        // Remove a cookie in case it was set in test mode
        if (this.data.testMode === 'true') {
          Cookies.remove(this.cookieName, { path: '/' });
          return;
        }
  
        var expiry = success ? 200 : this.data.daysBeforeReappear;
        var hasReminder = (this.data.hasReminder === 'true');
        var reminderAppeared = (sessionStorage.getItem('reminderAppeared') === 'true');
  
        if (hasReminder && reminderAppeared) {
          Cookies.set(this.cookieName, 'opened', { path: '/', expires: expiry });
        } else if(!hasReminder) {
          Cookies.set(this.cookieName, 'opened', { path: '/', expires: expiry });
        }
      },
  
      onLoad: function () {
        this.modal.open();
      },
  
      onSelect: function () {
        this.modal.open();
      },
  
      onDeselect: function () {
        this.modal.close();
      },
  
      onBlockSelect: function () {
        this.modal.close();
      },
  
      onBlockDeselect: function () {
        this.modal.open();
      },
  
      onUnload: function() {
        this.modal.close();
      }
    });
  
    return NewsletterPopup;
  })();
  
  theme.PasswordHeader = (function() {
    function PasswordHeader() {
      this.init();
    }
  
    PasswordHeader.prototype = Object.assign({}, PasswordHeader.prototype, {
      init: function() {
        if (!document.querySelector('#LoginModal')) {
          return;
        }
  
        var passwordModal = new theme.Modals('LoginModal', 'login-modal', {
          focusIdOnOpen: 'password',
          solid: true
        });
  
        // Open modal if errors exist
        if (document.querySelectorAll('.errors').length) {
          passwordModal.open();
        }
      }
    });
  
    return PasswordHeader;
  })();
  
  theme.Photoswipe = (function() {
    var selectors = {
      trigger: '.js-photoswipe__zoom',
      images: '.photoswipe__image',
      slideshowTrack: '.flickity-viewport ',
      activeImage: '.is-selected'
    };
  
    function Photoswipe(container, sectionId) {
      this.container = container;
      this.sectionId = sectionId;
      this.namespace = '.photoswipe-' + this.sectionId;
      this.gallery;
      this.images;
      this.items;
      this.inSlideshow = false;
  
      if (!container || container.dataset.zoom === 'false') {
        return;
      }
  
      this.init();
    }
  
    Photoswipe.prototype = Object.assign({}, Photoswipe.prototype, {
      init: function() {
        this.container.querySelectorAll(selectors.trigger).forEach(trigger => {
          trigger.on('click' + this.namespace, this.triggerClick.bind(this));
        });
      },
  
      triggerClick: function(evt) {
        // Streamline changes between a slideshow and
        // stacked images, so recheck if we are still
        // working with a slideshow when initializing zoom
        if (this.container.dataset && this.container.dataset.hasSlideshow === 'true') {
          this.inSlideshow = true;
        } else {
          this.inSlideshow = false;
        }
  
        this.items = this.getImageData();
  
        var image = this.inSlideshow ? this.container.querySelector(selectors.activeImage) : evt.currentTarget;
  
        var index = this.inSlideshow ? this.getChildIndex(image) : image.dataset.index;
  
        this.initGallery(this.items, index);
      },
  
      // Because of image set feature, need to get index based on location in parent
      getChildIndex: function(el) {
        var i = 0;
        while( (el = el.previousSibling) != null ) {
          i++;
        }
  
        // 1-based index required
        return i + 1;
      },
  
      getImageData: function() {
        this.images = this.inSlideshow
                        ? this.container.querySelectorAll(selectors.slideshowTrack + selectors.images)
                        : this.container.querySelectorAll(selectors.images);
  
        var items = [];
        var options = {};
  
        this.images.forEach(el => {
          var item = {
            msrc: el.currentSrc || el.src,
            src: el.getAttribute('data-photoswipe-src'),
            w: el.getAttribute('data-photoswipe-width'),
            h: el.getAttribute('data-photoswipe-height'),
            el: el,
            initialZoomLevel: 0.5
          }
  
          items.push(item);
        });
  
        return items;
      },
  
      initGallery: function(items, index) {
        var pswpElement = document.querySelectorAll('.pswp')[0];
  
        var options = {
          allowPanToNext: false,
          captionEl: false,
          closeOnScroll: false,
          counterEl: false,
          history: false,
          index: index - 1,
          pinchToClose: false,
          preloaderEl: false,
          scaleMode: 'zoom',
          shareEl: false,
          tapToToggleControls: false,
          getThumbBoundsFn: function(index) {
            var pageYScroll = window.pageYOffset || document.documentElement.scrollTop;
            var thumbnail = items[index].el;
            var rect = thumbnail.getBoundingClientRect();
            return {x:rect.left, y:rect.top + pageYScroll, w:rect.width};
          }
        }
  
        this.gallery = new PhotoSwipe(pswpElement, PhotoSwipeUI_Default, items, options);
        this.gallery.listen('afterChange', this.afterChange.bind(this));
        this.gallery.init();
  
        this.preventiOS15Scrolling();
      },
  
      afterChange: function() {
        var index = this.gallery.getCurrentIndex();
        this.container.dispatchEvent(new CustomEvent('photoswipe:afterChange', {
          detail: {
            index: index
          }
        }));
      },
  
      syncHeight: function() {
        document.documentElement.style.setProperty(
          "--window-inner-height", 
          `${window.innerHeight}px`
        );
      },
  
      // Fix poached from https://gist.github.com/dimsemenov/0b8c255c0d87f2989e8ab876073534ea
      preventiOS15Scrolling: function() {
        let initialScrollPos;
  
        if (!/iPhone|iPad|iPod/i.test(window.navigator.userAgent)) return; 
        
        this.syncHeight();
              
        // Store scroll position to restore it later
        initialScrollPos = window.scrollY;
        
        // Add class to root element when PhotoSwipe opens
        document.documentElement.classList.add('pswp-open-in-ios');
  
        window.addEventListener('resize', this.syncHeight);
      
        this.gallery.listen('destroy', () => {
          document.documentElement.classList.remove('pswp-open-in-ios');
          window.scrollTo(0, initialScrollPos);
        });
      }
    });
  
    return Photoswipe;
  })();
  
  
  /*============================================================================
    ProductRecommendations
  ==============================================================================*/
  
  class ProductRecommendations extends HTMLElement {
    constructor() {
      super();
      this.el = this;
      this.url = this.dataset.url;
      this.intent = this.dataset.intent;
      this.placeholder = this.querySelector('.product-recommendations-placeholder');
      this.productResults =  this.querySelector('.grid-product');
      this.sectionId = this.dataset.sectionId;
      this.blockId = this.dataset.blockId;
  
      document.addEventListener('recommendations:loaded', (e) => {
        this.colorImages = this.el.querySelectorAll('.grid-product__color-image');
        if (this.colorImages.length) {
          this.swatches = this.el.querySelectorAll('.color-swatch--with-image');
          this.colorSwatchHovering();
        }
      });
    }
  
    connectedCallback() {
      fetch(this.url)
        .then(response => response.text())
        .then(text => {
  
        const html = document.createElement('div');
        html.innerHTML = text;
        const recommendations = html.querySelector('.product-recommendations');
  
        if (!recommendations) {
          this.el.classList.add('hide');
          if (AOS) { AOS.refreshHard() }
          return;
        }
  
        this.placeholder.innerHTML = '';
        this.placeholder.innerHTML = recommendations.innerHTML;
  
        theme.reinitProductGridItem(this.el);
  
        this.slideshow = this.querySelector('[data-slideshow]');
  
        if (this.slideshow) {
          this.setupSlider();
        }
  
        document.dispatchEvent(new CustomEvent('recommendations:loaded', {
          detail: {
            section: this.el,
            intent: this.intent
          }
        }));
  
        })
        .catch(e => {
          console.error(e);
        });
    }
  
    setupSlider() {
      const controlType = this.slideshow.dataset.controls;
      const perSlide = parseFloat(this.slideshow.dataset.perSlide);
      const count = parseFloat(this.slideshow.dataset.count);
  
      let prevNextButtons = false;
      let pageDots = true;
  
      if (controlType === 'arrows') {
        pageDots = false;
        prevNextButtons = true;
      }
  
      if (perSlide < count) {
        this.flickity = new theme.Slideshow(this.slideshow, {
          prevNextButtons,
          pageDots,
          adaptiveHeight: true,
          wrapAround: false,
        });
      }
    }
  
    colorSwatchHovering() {
      this.swatches.forEach(swatch => {
        swatch.addEventListener('mouseenter', function() {
          this.setActiveColorImage(swatch);
        }.bind(this));
  
        swatch.addEventListener('touchstart', function(evt) {
          evt.preventDefault();
          this.setActiveColorImage(swatch);
        }.bind(this), {passive: true});
  
        swatch.addEventListener('mouseleave', function() {
          this.removeActiveColorImage(swatch);
        }.bind(this));
      });
    }
  
    setActiveColorImage(swatch) {
      const id = swatch.dataset.variantId;
      const image = swatch.dataset.variantImage;
  
      // Unset all active swatch images
      this.colorImages.forEach(el => {
        el.classList.remove('is-active');
      });
  
      // Unset all active swatches
      this.swatches.forEach(el => {
        el.classList.remove('is-active');
      });
  
      // Set active image and swatch
      const imageEl = this.el.querySelector(`.grid-product__color-image--${id}`);
  
      imageEl.style.backgroundImage = 'url(' + image + ')';
      imageEl.classList.add('is-active');
      swatch.classList.add('is-active');
  
      // Update product grid item href with variant URL
      const variantUrl = swatch.dataset.url;
      const gridItem = swatch.closest('.grid-item__link');
      gridItem.setAttribute('href', variantUrl);
    }
  
    removeActiveColorImage(swatch) {
      const id = swatch.dataset.variantId;
      this.el.querySelector(`.grid-product__color-image--${id}`).classList.remove('is-active');
    }
  }
  
  customElements.define('product-recommendations', ProductRecommendations);
  
  theme.SlideshowSection = (function() {
  
    var selectors = {
      parallaxContainer: '.parallax-container'
    };
  
    function SlideshowSection(container) {
      this.container = container;
      var sectionId = container.getAttribute('data-section-id');
      this.slideshow = container.querySelector('#Slideshow-' + sectionId);
      this.namespace = '.' + sectionId;
  
      this.initialIndex = 0;
  
      if (!this.slideshow) { return }
  
      // Get shopify-created div that section markup lives in,
      // then get index of it inside its parent
      var sectionEl = container.parentElement;
      var sectionIndex = [].indexOf.call(sectionEl.parentElement.children, sectionEl);
  
      if (sectionIndex === 0) {
        this.init();
      } else {
        theme.initWhenVisible({
          element: this.container,
          callback: this.init.bind(this)
        });
      }
  
    }
  
    SlideshowSection.prototype = Object.assign({}, SlideshowSection.prototype, {
      init: function() {
        var slides = this.slideshow.querySelectorAll('.slideshow__slide');
  
        this.slideshow.classList.remove('loading', 'loading--delayed');
        this.slideshow.classList.add('loaded');
  
        if (slides.length > 1) {
          var sliderArgs = {
            prevNextButtons: this.slideshow.hasAttribute('data-arrows'),
            pageDots: this.slideshow.hasAttribute('data-dots'),
            fade: true,
            setGallerySize: false,
            initialIndex: this.initialIndex,
            autoPlay: this.slideshow.dataset.autoplay === 'true'
              ? parseInt(this.slideshow.dataset.speed)
              : false
          };
  
          this.flickity = new theme.Slideshow(this.slideshow, sliderArgs);
        } else {
          // Add loaded class to first slide
          slides[0].classList.add('is-selected');
        }
      },
  
      forceReload: function() {
        this.onUnload();
        this.init();
      },
  
      onUnload: function() {
        if (this.flickity && typeof this.flickity.destroy === 'function') {
          this.flickity.destroy();
        }
      },
  
      onDeselect: function() {
        if (this.flickity && typeof this.flickity.play === 'function') {
          this.flickity.play();
        }
      },
  
      onBlockSelect: function(evt) {
        var slide = this.slideshow.querySelector('.slideshow__slide--' + evt.detail.blockId)
        var index = parseInt(slide.dataset.index);
  
        if (this.flickity && typeof this.flickity.pause === 'function') {
          this.flickity.goToSlide(index);
          this.flickity.pause();
        } else {
          // If section reloads, slideshow might not have been setup yet, wait a second and try again
          this.initialIndex = index;
          setTimeout(function() {
            if (this.flickity && typeof this.flickity.pause === 'function') {
              this.flickity.pause();
            }
          }.bind(this), 1000);
        }
      },
  
      onBlockDeselect: function() {
        if (this.flickity && typeof this.flickity.play === 'function') {
          if (this.flickity.args.autoPlay) {
            this.flickity.play();
          }
        }
      }
    });
  
    return SlideshowSection;
  })();
  
  theme.StoreAvailability = (function() {
    var selectors = {
      drawerOpenBtn: '.js-drawer-open-availability',
      modalOpenBtn: '.js-modal-open-availability',
      productTitle: '[data-availability-product-title]'
    };
  
    function StoreAvailability(container) {
      this.container = container;
      this.baseUrl = container.dataset.baseUrl;
      this.productTitle = container.dataset.productName;
    }
  
    StoreAvailability.prototype = Object.assign({}, StoreAvailability.prototype, {
      updateContent: function(variantId) {
        var variantSectionUrl =
          this.baseUrl +
          '/variants/' +
          variantId +
          '/?section_id=store-availability';
  
        var self = this;
  
        fetch(variantSectionUrl)
          .then(function(response) {
            return response.text();
          })
          .then(function(html) {
            if (html.trim() === '') {
              this.container.innerHTML = '';
              return;
            }
  
            self.container.innerHTML = html;
            self.container.innerHTML = self.container.firstElementChild.innerHTML;
  
            // Setup drawer if have open button
            if (self.container.querySelector(selectors.drawerOpenBtn)) {
              self.drawer = new theme.Drawers('StoreAvailabilityDrawer', 'availability');
            }
  
            // Setup modal if have open button
            if (self.container.querySelector(selectors.modalOpenBtn)) {
              self.modal = new theme.Modals('StoreAvailabilityModal', 'availability');
            }
  
            var title = self.container.querySelector(selectors.productTitle);
            if (title) {
              title.textContent = self.productTitle;
            }
          });
      }
    });
  
    return StoreAvailability;
  })();
  
  theme.VideoSection = (function() {
    var selectors = {
      videoParent: '.video-parent-section'
    };
  
    function videoSection(container) {
      this.container = container;
      this.sectionId = container.getAttribute('data-section-id');
      this.namespace = '.video-' + this.sectionId;
      this.videoObject;
  
      theme.initWhenVisible({
        element: this.container,
        callback: this.init.bind(this),
        threshold: 500
      });
    }
  
    videoSection.prototype = Object.assign({}, videoSection.prototype, {
      init: function() {
        var dataDiv = this.container.querySelector('.video-div');
        if (!dataDiv) {
          return;
        }
        var type = dataDiv.dataset.type;
  
        switch(type) {
          case 'youtube':
            var videoId = dataDiv.dataset.videoId;
            this.initYoutubeVideo(videoId);
            break;
          case 'vimeo':
            var videoId = dataDiv.dataset.videoId;
            this.initVimeoVideo(videoId);
            break;
          case 'mp4':
            this.initMp4Video();
            break;
        }
      },
  
      initYoutubeVideo: function(videoId) {
        this.videoObject = new theme.YouTube(
          'YouTubeVideo-' + this.sectionId,
          {
            videoId: videoId,
            videoParent: selectors.videoParent
          }
        );
      },
  
      initVimeoVideo: function(videoId) {
        this.videoObject = new theme.VimeoPlayer(
          'Vimeo-' + this.sectionId,
          videoId,
          {
            videoParent: selectors.videoParent
          }
        );
      },
  
      initMp4Video: function() {
        var mp4Video = 'Mp4Video-' + this.sectionId;
        var mp4Div = document.getElementById(mp4Video);
        var parent = mp4Div.closest(selectors.videoParent);
  
        if (mp4Div) {
          parent.classList.add('loaded');
  
          var playPromise = document.querySelector('#' + mp4Video).play();
  
          // Edge does not return a promise (video still plays)
          if (playPromise !== undefined) {
            playPromise.then(function() {
                // playback normal
              }).catch(function() {
                mp4Div.setAttribute('controls', '');
                parent.classList.add('video-interactable');
              });
          }
        }
      },
  
      onUnload: function(evt) {
        var sectionId = evt.target.id.replace('shopify-section-', '');
        if (this.videoObject && typeof this.videoObject.destroy === 'function') {
          this.videoObject.destroy();
        }
      }
    });
  
    return videoSection;
  })();
  
  /*============================================================================
    CountdownTimer
  ==============================================================================*/
  
  class CountdownTimer extends HTMLElement {
    constructor() {
      super();
      this.el = this;
      this.display = this.querySelector('[data-time-display]');
      this.block = this.closest('.countdown__block--timer');
      this.year = this.el.dataset.year;
      this.month = this.el.dataset.month;
      this.day = this.el.dataset.day;
      this.hour = this.el.dataset.hour;
      this.minute = this.el.dataset.minute;
      this.daysPlaceholder = this.querySelector('[date-days-placeholder]');
      this.hoursPlaceholder = this.querySelector('[date-hours-placeholder]');
      this.minutesPlaceholder = this.querySelector('[date-minutes-placeholder]');
      this.secondsPlaceholder = this.querySelector('[date-seconds-placeholder]');
      this.messagePlaceholder = this.querySelector('[data-message-placeholder]');
      this.hideTimerOnComplete = this.el.dataset.hideTimer;
      this.completeMessage = this.el.dataset.completeMessage;
  
      this.timerComplete = false;
  
      this.init();
    }
  
    init() {
      setInterval(() => {
        if (!this.timerComplete) {
          this._calculate();
        }
      }, 1000);
  
    }
  
    _calculate() {
      // Find time difference and convert to integer
      const timeDifference = +new Date(`${this.month}/${this.day}/${this.year} ${this.hour}:${this.minute}:00`).getTime() - +new Date().getTime();
      // If time difference is greater than 0, calculate remaining time
      if (timeDifference > 0) {
        const intervals = {
          days: Math.floor(timeDifference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((timeDifference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((timeDifference / 1000 / 60) % 60),
          seconds: Math.floor((timeDifference / 1000) % 60),
        };
  
        this.daysPlaceholder.innerHTML = intervals.days;
        this.hoursPlaceholder.innerHTML = intervals.hours;
        this.minutesPlaceholder.innerHTML = intervals.minutes;
        this.secondsPlaceholder.innerHTML = intervals.seconds;
  
        setTimeout(() => {
          this.display.classList.add('countdown__display--loaded');
        }, 1);
      } else {
        if (this.completeMessage && this.messagePlaceholder) {
          this.messagePlaceholder.classList.add('countdown__timer-message--visible');
        }
  
        if (this.hideTimerOnComplete === 'true') {
          this.display.classList.remove('countdown__display--visible');
          this.display.classList.add('countdown__display--hidden');
        }
  
        if (!this.completeMessage && this.hideTimerOnComplete === 'true') {
          this.block.classList.add('countdown__block--hidden');
        }
  
        this.timerComplete = true;
      }
    }
  }
  
  customElements.define('countdown-timer', CountdownTimer);
  
  /*============================================================================
    HotSpots
  ==============================================================================*/
  
  class HotSpots extends HTMLElement {
    constructor() {
      super();
      this.el = this;
      this.buttons = this.querySelectorAll('[data-button]');
      this.hotspotBlocks = this.querySelectorAll('[data-hotspot-block]');
      this.blockContainer = this.querySelector('[data-block-container]');
      this.colorImages = this.querySelectorAll('.grid-product__color-image');
      this.colorSwatches = this.querySelectorAll('.color-swatch--with-image');
  
      this._bindEvents();
      this._setupQuickShop();
  
      if (this.colorImages.length) {
        this._colorSwatchHovering();
      }
    }
  
    _colorSwatchHovering() {
      this.colorSwatches.forEach(swatch => {
        swatch.addEventListener('mouseenter', function() {
          this._setActiveColorImage(swatch);
        }.bind(this));
  
        swatch.addEventListener('touchstart', function(evt) {
          evt.preventDefault();
          this._setActiveColorImage(swatch);
        }.bind(this), {passive: true});
  
        swatch.addEventListener('mouseleave', function() {
          this._removeActiveColorImage(swatch);
        }.bind(this));
      });
    }
  
    _setActiveColorImage(swatch) {
      var id = swatch.dataset.variantId;
      var image = swatch.dataset.variantImage;
  
      // Unset all active swatch images
      this.colorImages.forEach(el => {
        el.classList.remove('is-active');
      });
  
      // Unset all active swatches
      this.colorSwatches.forEach(el => {
        el.classList.remove('is-active');
      });
  
      // Set active image and swatch
      var imageEl = this.el.querySelector('.grid-product__color-image--' + id);
      imageEl.style.backgroundImage = 'url(' + image + ')';
      imageEl.classList.add('is-active');
      swatch.classList.add('is-active');
  
      // Update product grid item href with variant URL
      var variantUrl = swatch.dataset.url;
      var gridItem = swatch.closest('.grid-item__link');
  
      if (gridItem) gridItem.setAttribute('href', variantUrl);
    }
  
    _removeActiveColorImage(swatch) {
      const id = swatch.dataset.variantId;
      this.querySelector(`.grid-product__color-image--${id}`).classList.remove('is-active');
    }
  
    /* Setup event listeners */
    _bindEvents() {
      this.buttons.forEach(button => {
        const id = button.dataset.button;
  
        button.on('click', e => {
          e.preventDefault();
          e.stopPropagation();
          this._showContent(id);
        });
      });
  
      // Display active hotspot block on theme editor select
      document.addEventListener('shopify:block:select', (e) => {
        const blockId = e.detail.blockId;
        this._showContent(`${blockId}`);
      });
    }
  
    /* Toggle sidebar content */
    _showContent(id) {
      // Hide all hotspotBlock
      // Show the hotspotBlock with the id
      this.hotspotBlocks.forEach((block) => {
        if (block.dataset.hotspotBlock === id) {
          block.classList.add('is-active');
        } else {
          block.classList.remove('is-active');
        }
      });
    }
  
    _setupQuickShop() {
      if (this.querySelectorAll('[data-block-type="product"]').length > 0) {
        // Ensure we are utilizing the right version of QuickShop based off of theme
        if (typeof theme.QuickShop === 'function') {
          new theme.QuickShop(this.blockContainer);
        } else if (typeof theme.initQuickShop === 'function') {
          theme.initQuickShop();
        }
  
        if (typeof theme.QuickAdd === 'function') {
          new theme.QuickAdd(this.blockContainer);
        }
      }
    }
  }
  
  customElements.define('hot-spots', HotSpots);
  
  /*============================================================================
    ImageCompare
  ==============================================================================*/
  
  class ImageCompare extends HTMLElement {
    constructor() {
      super();
      this.el = this;
      this.sectionId = this.dataset.sectionId;
      this.button = this.querySelector('[data-button]');
      this.draggableContainer = this.querySelector('[data-draggable]');
      this.primaryImage = this.querySelector('[data-primary-image]');
      this.secondaryImage = this.querySelector('[data-secondary-image]');
  
      this.calculateSizes();
  
      this.active = false;
      this.currentX = 0;
      this.initialX = 0;
      this.xOffset = 0;
  
      this.buttonOffset = this.button.offsetWidth / 2;
  
      this.el.addEventListener("touchstart", this.dragStart, false);
      this.el.addEventListener("touchend", this.dragEnd, false);
      this.el.addEventListener("touchmove", this.drag, false);
  
      this.el.addEventListener("mousedown", this.dragStart, false);
      this.el.addEventListener("mouseup", this.dragEnd, false);
      this.el.addEventListener("mousemove", this.drag, false);
  
      window.on('resize', theme.utils.debounce(250, () => { this.calculateSizes(true)}));
  
      document.addEventListener('shopify:section:load', event => {
        if (event.detail.sectionId === this.sectionId && this.primaryImage !== null) {
          this.calculateSizes();
        }
      });
    }
  
    calculateSizes(hasResized = false) {
      this.active = false;
      this.currentX = 0;
      this.initialX = 0;
      this.xOffset = 0;
  
      this.buttonOffset = this.button.offsetWidth / 2;
  
      this.elWidth = this.el.offsetWidth;
  
      this.button.style.transform = `translate(-${this.buttonOffset}px, -50%)`;
  
      if (this.primaryImage) {
        this.primaryImage.style.width = `${this.elWidth}px`;
      }
  
      if (hasResized) this.draggableContainer.style.width = `${this.elWidth/2}px`;
    }
  
    dragStart(e) {
      if (e.type === "touchstart") {
        this.initialX = e.touches[0].clientX - this.xOffset;
      } else {
        this.initialX = e.clientX - this.xOffset;
      }
  
      if (e.target === this.button) {
        this.active = true;
      }
    }
  
    dragEnd(e) {
      this.initialX = this.currentX;
  
      this.active = false;
    }
  
    drag(e) {
      if (this.active) {
  
        e.preventDefault();
  
        if (e.type === "touchmove") {
          this.currentX = e.touches[0].clientX - this.initialX;
        } else {
          this.currentX = e.clientX - this.initialX;
        }
  
        this.xOffset = this.currentX;
        this.setTranslate(this.currentX, this.button);
      }
    }
  
    setTranslate(xPos, el) {
      let newXpos = xPos - this.buttonOffset;
      let newVal = (this.elWidth/2) + xPos;
  
      const boundaryPadding = 50;
      const XposMin = (this.elWidth/2 + this.buttonOffset) * -1;
      const XposMax = this.elWidth/2 - this.buttonOffset;
  
      // Set boundaries for dragging
      if (newXpos < (XposMin + boundaryPadding)) {
        newXpos = XposMin + boundaryPadding;
        newVal = boundaryPadding
      } else if (newXpos > (XposMax - boundaryPadding)) {
        newXpos = XposMax - boundaryPadding;
        newVal = this.elWidth - boundaryPadding;
      }
  
      el.style.transform = `translate(${newXpos}px, -50%)`;
      this.draggableContainer.style.width = `${newVal}px`;
    }
  }
  
  customElements.define('image-compare', ImageCompare);
  


  theme.Blog = (function() {

  

    function Blog(container) {

      this.tagFilters();

    }

  

    Blog.prototype = Object.assign({}, Blog.prototype, {

      tagFilters: function() {

        var filterBy = document.getElementById('BlogTagFilter');

  

        if (!filterBy) {

          return;

        }

  

        filterBy.addEventListener('change', function() {

          location.href = filterBy.value;

        });

      }

    });

  

    return Blog;

  })();

  
  theme.CollectionHeader = (function() {
    var hasLoadedBefore = false;
  
    function CollectionHeader(container) {
      this.namespace = '.collection-header';
  
      var heroImageContainer = container.querySelector('.collection-hero');
      if (heroImageContainer) {
        if (hasLoadedBefore) {
          this.checkIfNeedReload();
        }
        heroImageContainer.classList.remove('loading', 'loading--delayed');
        heroImageContainer.classList.add('loaded');
      } else if (theme.settings.overlayHeader) {
        theme.headerNav.disableOverlayHeader();
      }
  
      hasLoadedBefore = true;
    }
  
    CollectionHeader.prototype = Object.assign({}, CollectionHeader.prototype, {
      // A liquid variable in the header needs a full page refresh
      // if the collection header hero image setting is enabled
      // and the header is set to sticky. Only necessary in the editor.
      checkIfNeedReload: function() {
        if (!Shopify.designMode) {
          return;
        }
  
        if (theme.settings.overlayHeader) {
          var header = document.querySelector('.header-wrapper');
          if (!header.classList.contains('header-wrapper--overlay')) {
            location.reload();
          }
        }
      }
    });
  
    return CollectionHeader;
  })();
  
  theme.CollectionSidebar = (function() {
    var drawerStyle = false;
    var selectors = {
      sidebar: '#CollectionSidebar',
    };
  
    function CollectionSidebar(container) {
      this.container = container.querySelector(selectors.sidebar);
    }
  
    CollectionSidebar.prototype = Object.assign({}, CollectionSidebar.prototype, {
      init: function() {
        // Do not load when no sidebar exists
        if(!this.container) {
          return;
        }
  
        this.onUnload();
  
        drawerStyle = this.container.dataset.style === 'drawer';
        theme.FilterDrawer = new theme.Drawers('FilterDrawer', 'collection-filters', true);
      },
  
      forceReload: function() {
        this.init();
      },
  
      onSelect: function() {
        if (theme.FilterDrawer) {
          if (!drawerStyle) {
            theme.FilterDrawer.close();
            return;
          }
  
          if (drawerStyle || theme.config.bpSmall) {
            theme.FilterDrawer.open();
          }
        }
      },
  
      onDeselect: function() {
        if (theme.FilterDrawer) {
          theme.FilterDrawer.close();
        }
      },
  
      onUnload: function() {
        if (theme.FilterDrawer) {
          theme.FilterDrawer.close();
        }
      }
    });
  
    return CollectionSidebar;
  })();
  
  theme.Collection = (function() {
    var isAnimating = false;
  
    var selectors = {
      sortSelect: '#SortBy',
  
      colorSwatchImage: '.grid-product__color-image',
      colorSwatch: '.color-swatch--with-image',
  
      collectionGrid: '.collection-grid__wrapper',
      trigger: '.collapsible-trigger',
      sidebar: '#CollectionSidebar',
      filterSidebar: '.collapsible-content--sidebar',
      activeTagList: '.tag-list--active-tags',
      tags: '.tag-list input',
      activeTags: '.tag-list a',
      tagsForm: '.filter-form',
      filters: '.collection-filter',
      priceRange: '.price-range',
    };
  
    var classes = {
      activeTag: 'tag--active',
      removeTagParent: 'tag--remove',
      filterSidebar: 'collapsible-content--sidebar',
      isOpen: 'is-open',
    };
  
    function Collection(container) {
      this.container = container;
      this.sectionId = container.getAttribute('data-section-id');
      this.namespace = '.collection-' + this.sectionId;
      this.sidebar = new theme.CollectionSidebar(container);
      this.context = container.getAttribute('data-context');
      this.ajaxRenderer = new theme.AjaxRenderer({
        sections: [
          {
            sectionId: this.sectionId,
            nodeId: 'CollectionAjaxContent',
          },
        ],
        onReplace: this.onReplaceAjaxContent.bind(this),
      });
  
      this.init();
    }
  
    Collection.prototype = Object.assign({}, Collection.prototype, {
      init: function() {
  
        /* Prevent extra JS from running for featured collection on a collection template */
        if (this.context && this.context === 'featured-collection') {
          this.colorSwatchHovering();
        } else {
          this.initSort();
          this.colorSwatchHovering();
          this.initFilters();
          this.initPriceRange();
          this.sidebar.init();
        }
      },
  
      initSort: function() {
        this.sortSelect = document.querySelector(selectors.sortSelect);
  
        if (this.sortSelect) {
          this.defaultSort = this.getDefaultSortValue();
          this.sortSelect.on('change' + this.namespace, this.onSortChange.bind(this));
        }
      },
  
      getSortValue: function() {
        return this.sortSelect.value || this.defaultSort;
      },
  
      getDefaultSortValue: function() {
        return this.sortSelect.getAttribute('data-default-sortby');
      },
  
      onSortChange: function() {
        this.queryParams = new URLSearchParams(window.location.search);
  
        this.queryParams.set('sort_by', this.getSortValue());
        this.queryParams.delete('page'); // Delete if it exists
  
        window.location.search = this.queryParams.toString();
      },
  
      colorSwatchHovering: function() {
        var colorImages = this.container.querySelectorAll(selectors.colorSwatchImage);
        if (!colorImages.length) {
          return;
        }
  
        this.container.querySelectorAll(selectors.colorSwatch).forEach(swatch => {
          swatch.addEventListener('mouseenter', () => {
            var id = swatch.dataset.variantId;
            var image = swatch.dataset.variantImage;
            var el = this.container.querySelector('.grid-product__color-image--' + id);
            el.style.backgroundImage = 'url(' + image + ')';
            el.classList.add('is-active');
          });
          swatch.addEventListener('mouseleave', () => {
            var id = swatch.dataset.variantId;
            this.container.querySelector('.grid-product__color-image--' + id).classList.remove('is-active');
          });
        });
      },
  
      /*====================
        Collection filters
      ====================*/
      initFilters: function() {
        var tags = document.querySelectorAll(selectors.tags);
  
        if (!tags.length) {
          return;
        }
  
        this.bindBackButton();
  
        // Set mobile top value for filters if sticky header enabled
        if (theme.config.stickyHeader) {
          this.setFilterStickyPosition();
  
          window.on('resize', theme.utils.debounce(500, this.setFilterStickyPosition));
        }
  
        document.querySelectorAll(selectors.activeTags).forEach(tag => {
          tag.addEventListener('click', this.tagClick.bind(this));
        });
  
        document.querySelectorAll(selectors.tagsForm).forEach(form => {
          form.addEventListener('input', this.onFormSubmit.bind(this));
        });
      },
  
      initPriceRange: function() {
        const priceRangeEls = document.querySelectorAll(selectors.priceRange);
        priceRangeEls.forEach((el) => new theme.PriceRange(el, {
          // onChange passes in formData
          onChange: this.renderFromFormData.bind(this),
        }));
      },
  
      tagClick: function(evt) {
        var el = evt.currentTarget;
  
        if (theme.FilterDrawer) {
          theme.FilterDrawer.close();
        }
  
        // Do not ajax-load collection links
        if (el.classList.contains('no-ajax')) {
          return;
        }
  
        evt.preventDefault();
  
        if (isAnimating) {
          return;
        }
  
        isAnimating = true;
  
        const parent = el.parentNode;
        const newUrl = new URL(el.href);
  
        this.renderActiveTag(parent, el);
        this.updateScroll(true);
        this.startLoading();
        this.renderCollectionPage(newUrl.searchParams);
      },
  
      onFormSubmit: function(evt) {
        var el = evt.target;
  
        if (theme.FilterDrawer) {
          theme.FilterDrawer.close();
        }
  
        // Do not ajax-load collection links
        if (el.classList.contains('no-ajax')) {
          return;
        }
  
        evt.preventDefault();
        if (isAnimating) {
          return;
        }
  
        isAnimating = true;
  
        const parent = el.closest('li');
        const formEl = el.closest('form');
        const formData = new FormData(formEl);
  
        this.renderActiveTag(parent, el);
        this.updateScroll(true);
        this.startLoading();
        this.renderFromFormData(formData);
      },
  
      fetchOpenCollasibleFilters: function() {
        return Array.from(
          document.querySelectorAll(
            `${selectors.sidebar} ${selectors.trigger}.${classes.isOpen}`,
          ),
        ).map(trigger => trigger.dataset.collapsibleId);
      },
  
      renderActiveTag: function(parent, el) {
        const textEl = parent.querySelector('.tag__text');
  
        if (parent.classList.contains(classes.activeTag)) {
          parent.classList.remove(classes.activeTag);
        } else {
          parent.classList.add(classes.activeTag);
  
          // If adding a tag, show new tag right away.
          // Otherwise, remove it before ajax finishes
          if (el.closest('li').classList.contains(classes.removeTagParent)) {
            parent.remove();
          } else {
            // Append new tag in both drawer and sidebar
            document.querySelectorAll(selectors.activeTagList).forEach(list => {
              const newTag = document.createElement('li');
              const newTagLink = document.createElement('a');
              newTag.classList.add('tag', 'tag--remove');
              newTagLink.classList.add('btn', 'btn--small');
              newTagLink.innerText = textEl.innerText;
              newTag.appendChild(newTagLink);
  
              list.appendChild(newTag);
            });
          }
        }
      },
  
      renderFromFormData: function(formData) {
        const searchParams = new URLSearchParams(formData);
        this.renderCollectionPage(searchParams);
      },
  
      onReplaceAjaxContent: function(newDom, section) {
        const openCollapsibleIds = this.fetchOpenCollasibleFilters();
  
        openCollapsibleIds.forEach(selector => {
          newDom
            .querySelectorAll(`[data-collapsible-id=${selector}]`)
            .forEach(this.openCollapsible);
        });
  
        var newContentEl = newDom.getElementById(section.nodeId);
        if (!newContentEl) {
          return;
        }
  
        document.getElementById(section.nodeId).innerHTML = newContentEl.innerHTML;
      },
  
      openCollapsible: function(el) {
        if (el.classList.contains(classes.filterSidebar)) {
          el.style.height = 'auto';
        }
  
        el.classList.add(classes.isOpen);
      },
  
      renderCollectionPage: function(searchParams, updateURLHash = true) {
        this.ajaxRenderer
          .renderPage(window.location.pathname, searchParams, updateURLHash)
          .then(() => {
            theme.sections.reinit('collection-grid');
            this.updateScroll(false);
            this.initPriceRange();
            theme.reinitProductGridItem();
  
            document.dispatchEvent(new CustomEvent('collection:reloaded'));
  
            isAnimating = false;
          });
      },
  
      bindBackButton: function() {
        // Ajax page on back button
        window.off('popstate' + this.namespace);
        window.on('popstate' + this.namespace, function(state) {
          if (state) {
            const newUrl = new URL(window.location.href);
            this.renderCollectionPage(newUrl.searchParams, false);
          }
        }.bind(this));
      },
  
      updateScroll: function(animate) {
        var scrollToElement = document.querySelector('[data-scroll-to]');
        var scrollTo = scrollToElement && scrollToElement.offsetTop;
  
        if (!theme.config.bpSmall) {
          scrollTo -= 15;
        }
  
        if (theme.config.stickyHeader) {
          var headerHeight = document.querySelector('.site-header').offsetHeight;
          scrollTo = scrollTo - headerHeight;
        }
  
        if (animate) {
          window.scrollTo({top: scrollTo, behavior: 'smooth'});
        } else {
          window.scrollTo({top: scrollTo});
        }
      },
  
      setFilterStickyPosition: function() {
        var headerHeight = document.querySelector('.site-header').offsetHeight;
        document.querySelector(selectors.filters).style.top = headerHeight + 10 + 'px';
  
        // Also update top position of sticky sidebar
        var stickySidebar = document.querySelector('.grid__item--sidebar');
        if (stickySidebar) {
          stickySidebar.style.top = headerHeight + 10 + 'px';
        }
      },
  
      forceReload: function() {
        this.init();
      },
  
      startLoading: function() {
        document.querySelector(selectors.collectionGrid).classList.add('unload');
      },
    });
  
    return Collection;
  })();
  
  theme.FooterSection = (function() {
    var selectors = {
      locale: '[data-disclosure-locale]',
      currency: '[data-disclosure-currency]'
    };
  
    function FooterSection(container) {
      this.container = container;
      this.localeDisclosure = null;
      this.currencyDisclosure = null;
  
      this.init();
    }
  
    FooterSection.prototype = Object.assign({}, FooterSection.prototype, {
      init: function() {
        var localeEl = this.container.querySelector(selectors.locale);
        var currencyEl = this.container.querySelector(selectors.currency);
  
        if (localeEl) {
          this.localeDisclosure = new theme.Disclosure(localeEl);
        }
  
        if (currencyEl) {
          this.currencyDisclosure = new theme.Disclosure(currencyEl);
        }
  
        // Change email icon to submit text
        var newsletterInput = document.querySelector('.footer__newsletter-input');
        if (newsletterInput) {
          newsletterInput.addEventListener('keyup', function() {
            newsletterInput.classList.add('footer__newsletter-input--active');
          });
        }
  
        // Re-hook up collapsible box triggers
        theme.collapsibles.init(this.container);
      },
  
      onUnload: function() {
        if (this.localeDisclosure) {
          this.localeDisclosure.destroy();
        }
  
        if (this.currencyDisclosure) {
          this.currencyDisclosure.destroy();
        }
      }
    });
  
    return FooterSection;
  })();
  
  theme.HeaderSection = (function() {
  
    var selectors = {
      locale: '[data-disclosure-locale]',
      currency: '[data-disclosure-currency]'
    };
  
    function HeaderSection(container) {
      this.container = container;
      this.sectionId = this.container.getAttribute('data-section-id');
  
      this.init();
    }
  
    HeaderSection.prototype = Object.assign({}, HeaderSection.prototype, {
      init: function() {
        // Reload any slideshow if header is reloaded to make sure
        // sticky header works as expected
        // (can be anywhere in sections.instance array)
        if (Shopify && Shopify.designMode) {
          theme.sections.reinit('slideshow-section');
  
          // Set a timer to resize the header in case the logo changes size
          setTimeout(function() {
            window.dispatchEvent(new Event('resize'));
          }, 500);
        }
  
        this.initDrawers();
        this.initDisclosures();
        theme.headerNav.init();
        theme.announcementBar.init();
        this.hoverMenu();
      },
  
      hoverMenu: function() {
        const detailsEl = document.querySelectorAll('[data-section-type="header"] details[data-hover="true"]');
  
        detailsEl.forEach((detail) => {
          const summary = detail.querySelector('summary');
          const summaryLink = summary.dataset.link;
  
          summary.addEventListener('click', e => {
            e.preventDefault();
            window.location.href = summaryLink;
          });
  
          // if detail has :focus-within
          detail.addEventListener('focusin', () => {
            if (!detail.hasAttribute('open')) {
  
              // close all other details
              detailsEl.forEach((detail) => {
                detail.removeAttribute('open');
                detail.setAttribute('aria-expanded', 'false');
              });
  
              detail.setAttribute('open', '');
              detail.setAttribute('aria-expanded', 'true');
            }
          });
  
          detail.addEventListener('focusout', () => {
            if (detail.hasAttribute('open') && !detail.matches(':focus-within')) {
              detail.removeAttribute('open');
              detail.setAttribute('aria-expanded', 'false');
            }
          });
  
          detail.addEventListener('mouseover', () => {
            if (!detail.hasAttribute('open')) {
              detail.setAttribute('open', '');
              detail.setAttribute('aria-expanded', 'true');
            }
          });
  
          detail.addEventListener('mouseleave', () => {
            if (detail.hasAttribute('open')) {
              detail.removeAttribute('open');
              detail.setAttribute('aria-expanded', 'false');
            }
          });
        });
      },
  
      initDisclosures: function() {
        var localeEl = this.container.querySelector(selectors.locale);
        var currencyEl = this.container.querySelector(selectors.currency);
  
        if (localeEl) {
          this.localeDisclosure = new theme.Disclosure(localeEl);
        }
  
        if (currencyEl) {
          this.currencyDisclosure = new theme.Disclosure(currencyEl);
        }
      },
  
      initDrawers: function() {
        theme.NavDrawer = new theme.Drawers('NavDrawer', 'nav');
        if (theme.settings.cartType === 'drawer') {
          if (!document.body.classList.contains('template-cart')) {
            new theme.CartDrawer();
          }
        }
  
        theme.collapsibles.init(document.getElementById('NavDrawer'));
      },
  
      onUnload: function() {
        theme.NavDrawer.close();
        theme.announcementBar.unload();
  
        if (this.localeDisclosure) {
          this.localeDisclosure.destroy();
        }
  
        if (this.currencyDisclosure) {
          this.currencyDisclosure.destroy();
        }
      }
    });
  
    return HeaderSection;
  })();
  
  theme.Product = (function() {
    var videoObjects = {};
  
    var classes = {
      onSale: 'on-sale',
      disabled: 'disabled',
      isModal: 'is-modal',
      loading: 'loading',
      loaded: 'loaded',
      hidden: 'hide',
      interactable: 'video-interactable',
      visuallyHide: 'visually-invisible',
      lowInventory: 'inventory--low',
    };
  
    var selectors = {
      productVideo: '.product__video',
      videoParent: '.product__video-wrapper',
      slide: '.product-main-slide',
      slideGroupAll: '.product-main-slide[data-group-all]',
      currentSlide: '.is-selected',
      startingSlide: '.starting-slide',
      variantType: '.variant-wrapper',
      blocks: '[data-product-blocks]',
      blocksHolder: '[data-blocks-holder]',
      dynamicVariantsEnabled: '[data-dynamic-variants-enabled]',
    };
  
    function Product(container) {
      this.container = container;
      var sectionId = this.sectionId = container.getAttribute('data-section-id');
      var productId = this.productId = container.getAttribute('data-product-id');
  
      this.inModal = (container.dataset.modal === 'true');
      this.modal;
  
      this.settings = {
        enableHistoryState: container.dataset.history || false,
        namespace: '.product-' + sectionId,
        inventory: false,
        inventoryThreshold: 10,
        modalInit: false,
        hasImages: true,
        imageSetName: null,
        imageSetIndex: null,
        currentImageSet: null,
        imageSize: '620x',
        currentSlideIndex: 0,
        videoLooping: container.dataset.videoLooping
      };
  
      // Overwrite some settings when loaded in modal
      if (this.inModal) {
        this.settings.enableHistoryState = false;
        this.settings.namespace = '.product-' + sectionId + '-modal';
        this.modal = document.getElementById('QuickShopModal-' + productId);
      }
  
      this.selectors = {
        variantsJson: '[data-variant-json]',
        currentVariantJson: '[data-current-variant-json]',
        form: '.product-single__form',
  
        media: '[data-product-media-type-model]',
        closeMedia: '.product-single__close-media',
        photoThumbs: '[data-product-thumb]',
        thumbSlider: '[data-product-thumbs]',
        thumbScroller: '.product__thumbs--scroller',
        mainSlider: '[data-product-photos]',
        imageContainer: '[data-product-images]',
        productImageMain: '[data-product-image-main]',
  
        priceWrapper: '[data-product-price-wrap]',
        price: '[data-product-price]',
        comparePrice: '[data-compare-price]',
        savePrice: '[data-save-price]',
        priceA11y: '[data-a11y-price]',
        comparePriceA11y: '[data-compare-price-a11y]',
        unitWrapper: '[data-unit-price-wrapper]',
        unitPrice: '[data-unit-price]',
        unitPriceBaseUnit: '[data-unit-base]',
        sku: '[data-sku]',
        inventory: '[data-product-inventory]',
        incomingInventory: '[data-incoming-inventory]',
        colorLabel: '[data-variant-color-label]',
  
        addToCart: '[data-add-to-cart]',
        addToCartText: '[data-add-to-cart-text]',
  
        originalSelectorId: '[data-product-select]',
        singleOptionSelector: '[data-variant-input]',
        variantColorSwatch: '.variant__input--color-swatch',
        dynamicVariantsEnabled: '[data-dynamic-variants-enabled]',
  
        availabilityContainer: '[data-store-availability-holder]'
      };
  
      this.cacheElements();
  
      this.firstProductImage = this.cache.mainSlider.querySelector('img');
  
      if (!this.firstProductImage) {
        this.settings.hasImages = false;
      }
  
      var dataSetEl = this.cache.mainSlider.querySelector('[data-set-name]');
      if (dataSetEl) {
        this.settings.imageSetName = dataSetEl.dataset.setName;
      }
  
      this.init();
    }
  
    Product.prototype = Object.assign({}, Product.prototype, {
      init: function() {
        if (this.inModal) {
          this.container.classList.add(classes.isModal);
          document.addEventListener('modalOpen.QuickShopModal-' + this.productId, this.openModalProduct.bind(this));
          document.addEventListener('modalClose.QuickShopModal-' + this.productId, this.closeModalProduct.bind(this));
        }
  
        if (!this.inModal) {
          this.formSetup();
          this.productSetup();
          this.videoSetup();
          this.initProductSlider();
          this.customMediaListners();
          this.addIdToRecentlyViewed();
        }
      },
  
      cacheElements: function() {
        this.cache = {
          form: this.container.querySelector(this.selectors.form),
          mainSlider: this.container.querySelector(this.selectors.mainSlider),
          thumbSlider: this.container.querySelector(this.selectors.thumbSlider),
          thumbScroller: this.container.querySelector(this.selectors.thumbScroller),
          productImageMain: this.container.querySelector(this.selectors.productImageMain),
  
          // Price-related
          priceWrapper: this.container.querySelector(this.selectors.priceWrapper),
          comparePriceA11y: this.container.querySelector(this.selectors.comparePriceA11y),
          comparePrice: this.container.querySelector(this.selectors.comparePrice),
          price: this.container.querySelector(this.selectors.price),
          savePrice: this.container.querySelector(this.selectors.savePrice),
          priceA11y: this.container.querySelector(this.selectors.priceA11y)
        };
      },
  
      formSetup: function() {
        this.initQtySelector();
        this.initAjaxProductForm();
        this.availabilitySetup();
        this.initVariants();
  
        // We know the current variant now so setup image sets
        if (this.settings.imageSetName) {
          this.updateImageSet();
        }
      },
  
      availabilitySetup: function() {
        var container = this.container.querySelector(this.selectors.availabilityContainer);
        if (container) {
          this.storeAvailability = new theme.StoreAvailability(container);
        }
      },
  
      productSetup: function() {
        this.setImageSizes();
        this.initImageZoom();
        this.initModelViewerLibraries();
        this.initShopifyXrLaunch();
      },
  
      setImageSizes: function() {
        if (!this.settings.hasImages) {
          return;
        }
  
        // Get srcset image src, works on most modern browsers
        // otherwise defaults to settings.imageSize
        var currentImage = this.firstProductImage.currentSrc;
  
        if (currentImage) {
          this.settings.imageSize = theme.Images.imageSize(currentImage);
        }
      },
  
      addIdToRecentlyViewed: function() {
        var handle = this.container.getAttribute('data-product-handle');
        var url = this.container.getAttribute('data-product-url');
        var aspectRatio = this.container.getAttribute('data-aspect-ratio');
        var featuredImage = this.container.getAttribute('data-img-url');
  
        // Remove current product if already in set of recent
        if (theme.recentlyViewed.recent.hasOwnProperty(handle)) {
          delete theme.recentlyViewed.recent[handle];
        }
  
        // Add it back to the end
        theme.recentlyViewed.recent[handle] = {
          url: url,
          aspectRatio: aspectRatio,
          featuredImage: featuredImage
        };
  
        if (theme.config.hasLocalStorage) {
          window.localStorage.setItem('theme-recent', JSON.stringify(theme.recentlyViewed.recent));
        }
      },
  
      initVariants: function() {
        var variantJson = this.container.querySelector(this.selectors.variantsJson);
  
        if (!variantJson) {
          return;
        }
  
        this.variantsObject = JSON.parse(variantJson.innerHTML);
        var dynamicVariantsEnabled = !!this.container.querySelector(selectors.dynamicVariantsEnabled)
  
        var options = {
          container: this.container,
          enableHistoryState: this.settings.enableHistoryState,
          singleOptionSelector: this.selectors.singleOptionSelector,
          originalSelectorId: this.selectors.originalSelectorId,
          variants: this.variantsObject,
          dynamicVariantsEnabled
        };
  
        var swatches = this.container.querySelectorAll(this.selectors.variantColorSwatch);
        if (swatches.length) {
          swatches.forEach(swatch => {
            swatch.addEventListener('updateSwatch', function(evt) {
              var color = swatch.dataset.colorName;
              var index = swatch.dataset.colorIndex;
              this.updateColorName(color, index);
            }.bind(this))
          });
        }
  
        this.variants = new theme.Variants(options);
  
        // Product availability on page load
        if (this.storeAvailability) {
          var variant_id = this.variants.currentVariant ? this.variants.currentVariant.id : this.variants.variants[0].id;
  
          this.storeAvailability.updateContent(variant_id);
          this.container.on('variantChange' + this.settings.namespace, this.updateAvailability.bind(this));
        }
  
        this.container.on('variantChange' + this.settings.namespace, this.updateCartButton.bind(this));
        this.container.on('variantImageChange' + this.settings.namespace, this.updateVariantImage.bind(this));
        this.container.on('variantPriceChange' + this.settings.namespace, this.updatePrice.bind(this));
        this.container.on('variantUnitPriceChange' + this.settings.namespace, this.updateUnitPrice.bind(this));
  
        if (this.container.querySelector(this.selectors.sku)) {
          this.container.on('variantSKUChange' + this.settings.namespace, this.updateSku.bind(this));
        }
  
        var inventoryEl = this.container.querySelector(this.selectors.inventory);
        if (inventoryEl) {
          this.settings.inventory = true;
          this.settings.inventoryThreshold = inventoryEl.dataset.threshold;
  
          // Update inventory on page load
          this.updateInventory({ detail: { variant: this.variants.currentVariant } });
  
          this.container.on('variantChange' + this.settings.namespace, this.updateInventory.bind(this));
        }
  
        // Update individual variant availability on each selection
        if (dynamicVariantsEnabled) {
          var currentVariantJson = this.container.querySelector(this.selectors.currentVariantJson);
  
          if (currentVariantJson) {
            var variantType = this.container.querySelector(selectors.variantType);
  
            if (variantType) {
              new theme.VariantAvailability({
                container: this.container,
                namespace: this.settings.namespace,
                type: variantType.dataset.type,
                variantsObject: this.variantsObject,
                currentVariantObject: JSON.parse(currentVariantJson.innerHTML)
              });
            }
          }
        }
  
        // image set names variant change listeners
        if (this.settings.imageSetName) {
          var variantWrapper = this.container.querySelector('.variant-input-wrap[data-handle="'+this.settings.imageSetName+'"]');
          if (variantWrapper) {
            this.settings.imageSetIndex = variantWrapper.dataset.index;
            this.container.on('variantChange' + this.settings.namespace, this.updateImageSet.bind(this))
          } else {
            this.settings.imageSetName = null;
          }
        }
      },
  
      initQtySelector: function() {
        this.container.querySelectorAll('.js-qty__wrapper').forEach(el => {
          new theme.QtySelector(el, {
            namespace: '.product'
          });
        });
      },
  
      initAjaxProductForm: function() {
        new theme.AjaxProduct(this.cache.form);
      },
  
      /*============================================================================
        Variant change methods
      ==============================================================================*/
      updateColorName: function(color, index) {
        // Updates on radio button change, not variant.js
        this.container.querySelector(this.selectors.colorLabel + `[data-index="${index}"`).textContent = color;
      },
  
      updateCartButton: function(evt) {
        var variant = evt.detail.variant;
        var cartBtn = this.container.querySelector(this.selectors.addToCart);
        var cartBtnText = this.container.querySelector(this.selectors.addToCartText);
  
        if (!cartBtn) return;
  
        if (variant) {
          if (variant.available) {
            // Available, enable the submit button and change text
            cartBtn.classList.remove(classes.disabled);
            cartBtn.disabled = false;
            var defaultText = cartBtnText.dataset.defaultText;
            cartBtnText.textContent = defaultText;
          } else {
            // Sold out, disable the submit button and change text
            cartBtn.classList.add(classes.disabled);
            cartBtn.disabled = true;
            cartBtnText.textContent = theme.strings.soldOut;
          }
        } else {
          // The variant doesn't exist, disable submit button
          cartBtn.classList.add(classes.disabled);
          cartBtn.disabled = true;
          cartBtnText.textContent = theme.strings.unavailable;
        }
      },
  
      updatePrice: function(evt) {
        var variant = evt.detail.variant;
  
        if (variant) {
          // Regular price
          this.cache.price.innerHTML = theme.Currency.formatMoney(variant.price, theme.settings.moneyFormat);
  
          // Sale price, if necessary
          if (variant.compare_at_price > variant.price) {
            this.cache.comparePrice.innerHTML = theme.Currency.formatMoney(variant.compare_at_price, theme.settings.moneyFormat);
            this.cache.priceWrapper.classList.remove(classes.hidden);
            this.cache.price.classList.add(classes.onSale);
            this.cache.comparePriceA11y.setAttribute('aria-hidden', 'false');
            this.cache.priceA11y.setAttribute('aria-hidden', 'false');
  
            var savings = variant.compare_at_price - variant.price;
  
            if (theme.settings.saveType == 'percent') {
              savings = Math.round(((savings) * 100) / variant.compare_at_price) + '%';
            } else {
              savings = theme.Currency.formatMoney(savings, theme.settings.moneyFormat);
            }
  
            this.cache.savePrice.classList.remove(classes.hidden);
            this.cache.savePrice.innerHTML = theme.strings.savePrice.replace('[saved_amount]', savings);
          } else {
            if (this.cache.priceWrapper) {
              this.cache.priceWrapper.classList.add(classes.hidden);
            }
            this.cache.savePrice.classList.add(classes.hidden);
            this.cache.price.classList.remove(classes.onSale);
            if (this.cache.comparePriceA11y) {
              this.cache.comparePriceA11y.setAttribute('aria-hidden', 'true');
            }
            this.cache.priceA11y.setAttribute('aria-hidden', 'true');
          }
        }
      },
  
      updateUnitPrice: function(evt) {
        var variant = evt.detail.variant;
  
        if (variant && variant.unit_price) {
          this.container.querySelector(this.selectors.unitPrice).innerHTML = theme.Currency.formatMoney(variant.unit_price, theme.settings.moneyFormat);
          this.container.querySelector(this.selectors.unitPriceBaseUnit).innerHTML = theme.Currency.getBaseUnit(variant);
          this.container.querySelector(this.selectors.unitWrapper).classList.remove(classes.hidden);
        } else {
          this.container.querySelector(this.selectors.unitWrapper).classList.add(classes.hidden);
        }
      },
  
      imageSetArguments: function(variant) {
        var variant = variant ? variant : (this.variants ? this.variants.currentVariant : null);
        if (!variant) return;
  
        var setValue = this.settings.currentImageSet = this.getImageSetName(variant[this.settings.imageSetIndex]);
        var set = this.settings.imageSetName + '_' + setValue;
  
        // Always start on index 0
        this.settings.currentSlideIndex = 0;
  
        // Return object that adds cellSelector to mainSliderArgs
        return {
          cellSelector: '[data-group="'+set+'"]',
          imageSet: set,
          initialIndex: this.settings.currentSlideIndex
        }
      },
  
      updateImageSet: function(evt) {
        // If called directly, use current variant
        var variant = evt ? evt.detail.variant : (this.variants ? this.variants.currentVariant : null);
        if (!variant) {
          return;
        }
  
        var setValue = this.getImageSetName(variant[this.settings.imageSetIndex]);
  
        // Already on the current image group
        if (this.settings.currentImageSet === setValue) {
          return;
        }
  
        this.initProductSlider(variant);
      },
  
      // Show/hide thumbnails based on current image set
      updateImageSetThumbs: function(set) {
        // CHUMS, SM 2026.01.29
        this.cache.thumbSlider.querySelectorAll('.product__thumb-item[data-group-all]').forEach(thumb => {
          thumb.dataset.group = set;
        })
        // END CHUMS
        this.cache.thumbSlider.querySelectorAll('.product__thumb-item').forEach(thumb => {
          thumb.classList.toggle(classes.hidden, thumb.dataset.group !== set);
        });
      },
  
      getImageSetName: function(string) {
        return string.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '').replace(/^-/, '');
      },
  
      updateSku: function(evt) {
        var variant = evt.detail.variant;
        var newSku = '';
  
        if (variant) {
          if (variant.sku) {
            newSku = variant.sku;
          }
  
          this.container.querySelector(this.selectors.sku).textContent = newSku;
        }
      },
  
      updateInventory: function(evt) {
        var variant = evt.detail.variant;
  
        // Override to display in stock message for sold out variants with policy set to continue
        // Must be set to true in order to display in stock message for sold out variants
        const inStockForOOSAndContinueSelling = false;
  
        if (!variant) {
          // Variant is unavailable
          // So we want to hide both the inventory quantity + incoming transfer notice
          this.toggleInventoryQuantity('hidden', false);
          this.toggleIncomingInventory(false);
          return;
        }
  
        // Inventory management is nil
        // So we want to hide the low inventory message but show an In stock status
        // And hide the incoming transfer notice
        if (!variant.inventory_management) {
          this.toggleInventoryQuantity('visible', false);
          this.toggleIncomingInventory(false);
          return;
        }
  
        if (variant.inventory_management === 'shopify' && window.inventories && window.inventories[this.productId]) {
          const variantInventoryObject = window.inventories[this.productId][variant.id];
  
          const { quantity, policy, incoming, next_incoming_date } = variantInventoryObject || {};
  
          this.toggleInventoryQuantity(undefined, quantity);
  
          if (inStockForOOSAndContinueSelling) {
            if (quantity <= 0 && policy === 'continue') {
              this.toggleInventoryQuantity('visible', false);
              this.toggleIncomingInventory(false);
              return;
            }
          }
  
          if ((incoming && !variant.available) || (quantity <= 0 && policy === 'continue')) {
            this.toggleIncomingInventory(true, next_incoming_date, policy);
          } else {
            this.toggleIncomingInventory(false);
          }
        }
      },
  
      updateAvailability: function(evt) {
        var variant = evt.detail.variant;
        if (!variant) {
          return;
        }
  
        this.storeAvailability.updateContent(variant.id);
      },
  
      toggleInventoryQuantity: function(state = undefined, quantity) {
        const productInventoryEl = this.container.querySelector(this.selectors.inventory);
        const inventorySalesPoint = productInventoryEl.closest('.sales-point');
  
        if (state && state === 'hidden') {
          // variant is unavailable
          // hide and return
          if (inventorySalesPoint) {
            inventorySalesPoint.classList.add(classes.hidden);
          }
  
          return;
        }
  
        let showLowInventoryMessage = false;
  
        // Check if we should show low inventory message
        if (parseInt(quantity) <= parseInt(this.settings.inventoryThreshold) && parseInt(quantity) > 0) {
          showLowInventoryMessage = true;
        }
  
        if (parseInt(quantity) > 0 || (state && state === 'visible')) {
          if (showLowInventoryMessage) {
            productInventoryEl.parentNode.classList.add(classes.lowInventory);
            if (quantity > 1) {
              productInventoryEl.textContent = theme.strings.otherStockLabel.replace('[count]', quantity);
            } else {
              productInventoryEl.textContent = theme.strings.oneStockLabel.replace('[count]', quantity);
            }
          } else {
            productInventoryEl.parentNode.classList.remove(classes.lowInventory);
            productInventoryEl.textContent = theme.strings.inStockLabel;
          }
  
          if (inventorySalesPoint) {
            inventorySalesPoint.classList.remove(classes.hidden);
          }
  
        } else {
          if (inventorySalesPoint) {
            inventorySalesPoint.classList.add(classes.hidden);
          }
        }
      },
  
      toggleIncomingInventory: function(showIncomingInventory, incomingInventoryDate, policy) {
  
        const incomingInventoryEl = this.container.querySelector(this.selectors.incomingInventory);
        const incomingInventoryIcon = incomingInventoryEl.querySelector('.icon-and-text');
  
        if (!incomingInventoryEl) return;
  
        const incomingInventoryBlockEnabled = incomingInventoryEl.dataset.enabled === 'true';
        const textEl = incomingInventoryEl.querySelector('.js-incoming-text');
  
        // If incoming inventory block is disabled, hide it
        if (!incomingInventoryBlockEnabled) {
          incomingInventoryEl.classList.add(classes.hidden);
          return;
        }
  
        if (showIncomingInventory) {
          if (incomingInventoryDate) {
            textEl.textContent = theme.strings.willBeInStockAfter.replace('[date]', incomingInventoryDate);
            incomingInventoryEl.classList.remove(classes.hidden);
          } else {
            textEl.textContent = theme.strings.waitingForStock;
            incomingInventoryEl.classList.remove(classes.hidden);
          }
  
          // When OOS and incoming inventory and continue selling disabled, update icon to low inventory
          if (incomingInventoryIcon) {
            if (policy !== 'continue') {
              incomingInventoryIcon.classList.add(classes.lowInventory);
            } else {
              incomingInventoryIcon.classList.remove(classes.lowInventory);
            }
          }
  
        } else {
          incomingInventoryEl.classList.add(classes.hidden);
        }
      },
  
      /*============================================================================
        Product videos
      ==============================================================================*/
      videoSetup: function() {
        var productVideos = this.cache.mainSlider.querySelectorAll(selectors.productVideo);
  
        if (!productVideos.length) {
          return false;
        }
  
        productVideos.forEach(vid => {
          var type = vid.dataset.videoType;
          if (type === 'youtube') {
            this.initYoutubeVideo(vid);
          } else if (type === 'vimeo') {
            this.initVimeoVideo(vid);
          } else if (type === 'mp4') {
            this.initMp4Video(vid);
          }
        });
      },
  
      initYoutubeVideo: function(div) {
        videoObjects[div.id] = new theme.YouTube(
          div.id,
          {
            videoId: div.dataset.videoId,
            videoParent: selectors.videoParent,
            autoplay: false, // will handle this in callback
            style: div.dataset.videoStyle,
            loop: div.dataset.videoLoop,
            events: {
              onReady: this.youtubePlayerReady.bind(this),
              onStateChange: this.youtubePlayerStateChange.bind(this)
            }
          }
        );
      },
  
      initVimeoVideo: function(div) {
        videoObjects[div.id] = new theme.VimeoPlayer(
          div.id,
          div.dataset.videoId,
          {
            videoParent: selectors.videoParent,
            autoplay: false,
            style: div.dataset.videoStyle,
            loop: div.dataset.videoLoop,
          }
        )
      },
  
      // Comes from YouTube SDK
      // Get iframe ID with evt.target.getIframe().id
      // Then access product video players with videoObjects[id]
      youtubePlayerReady: function(evt) {
        var iframeId = evt.target.getIframe().id;
  
        if (!videoObjects[iframeId]) {
          // No youtube player data
          return;
        }
  
        var obj = videoObjects[iframeId];
        var player = obj.videoPlayer;
  
        if (obj.options.style !== 'sound') {
          player.mute();
        }
  
        obj.parent.classList.remove('loading');
        obj.parent.classList.add('loaded');
        obj.parent.classList.add('video-interactable'); // Previously, video was only interactable after slide change
  
        // If we have an element, it is in the visible/first slide,
        // and is muted, play it
        if (this._isFirstSlide(iframeId) && obj.options.style !== 'sound') {
          player.playVideo();
        }
      },
  
      _isFirstSlide: function(id) {
        return this.cache.mainSlider.querySelector(selectors.startingSlide + ' ' + '#' + id);
      },
  
      youtubePlayerStateChange: function(evt) {
        var iframeId = evt.target.getIframe().id;
        var obj = videoObjects[iframeId];
  
        switch (evt.data) {
          case -1: // unstarted
            // Handle low power state on iOS by checking if
            // video is reset to unplayed after attempting to buffer
            if (obj.attemptedToPlay) {
              obj.parent.classList.add('video-interactable');
            }
            break;
          case 0: // ended
            if (obj && obj.options.loop === 'true') {
              obj.videoPlayer.playVideo();
            }
            break;
          case 3: // buffering
            obj.attemptedToPlay = true;
            break;
        }
      },
  
      initMp4Video: function(div) {
        videoObjects[div.id] = {
          id: div.id,
          type: 'mp4'
        };
  
        if (this._isFirstSlide(div.id)) {
          this.playMp4Video(div.id);
        }
      },
  
      stopVideos: function() {
        for (var [id, vid] of Object.entries(videoObjects)) {
          if (vid.videoPlayer) {
            if (typeof vid.videoPlayer.stopVideo === 'function') {
              vid.videoPlayer.stopVideo(); // YouTube player
            }
          } else if (vid.type === 'mp4') {
            this.stopMp4Video(vid.id); // MP4 player
          }
        }
      },
  
      _getVideoType: function(video) {
        return video.getAttribute('data-video-type');
      },
  
      _getVideoDivId: function(video) {
        return video.id;
      },
  
      playMp4Video: function(id) {
        var player = this.container.querySelector('#' + id);
        var playPromise = player.play();
  
        if (playPromise !== undefined) {
          playPromise.then(function() {
            // Playing as expected
          })
          .catch(function(error) {
            // Likely low power mode on iOS, show controls
            player.setAttribute('controls', '');
            player.closest(selectors.videoParent).setAttribute('data-video-style', 'unmuted');
          });
        }
      },
  
      stopMp4Video: function(id) {
        var player = this.container.querySelector('#' + id);
        if (player && typeof player.pause === 'function') {
          player.pause();
        }
      },
  
      /*============================================================================
        Product images
      ==============================================================================*/
      initImageZoom: function() {
        var container = this.container.querySelector(this.selectors.imageContainer);
        if (!container) {
          return;
        }
        var imageZoom = new theme.Photoswipe(container, this.sectionId);
        container.addEventListener('photoswipe:afterChange', function(evt) {
          if (this.flickity) {
            this.flickity.goToSlide(evt.detail.index);
          }
        }.bind(this));
      },
  
      getThumbIndex: function(target) {
        return target.dataset.index;
      },
  
      updateVariantImage: function(evt) {
        var variant = evt.detail.variant;
        var sizedImgUrl = theme.Images.getSizedImageUrl(variant.featured_media.preview_image.src, this.settings.imageSize);
  
        var newImage = this.container.querySelector('.product__thumb[data-id="' + variant.featured_media.id + '"]');
        var imageIndex = this.getThumbIndex(newImage);
  
        // If there is no index, slider is not initalized
        if (typeof imageIndex === 'undefined') {
          return;
        }
  
        // Go to that variant image's slide
        if (this.flickity) {
          this.flickity.goToSlide(imageIndex);
        }
      },
  
      initProductSlider: function(variant) {
        // Stop if only a single image, but add active class to first slide
        if (this.cache.mainSlider.querySelectorAll(selectors.slide).length <= 1) {
          var slide = this.cache.mainSlider.querySelector(selectors.slide);
          if (slide) {
            slide.classList.add('is-selected');
          }
          return;
        }
  
        // Destroy slider in preparation of new initialization
        if (this.flickity && typeof this.flickity.destroy === 'function') {
          this.flickity.destroy();
        }
  
        // If variant argument exists, slideshow is reinitializing because of the
        // image set feature enabled and switching to a new group.
        // currentSlideIndex
        if (!variant) {
          var activeSlide = this.cache.mainSlider.querySelector(selectors.startingSlide);
          this.settings.currentSlideIndex = this._slideIndex(activeSlide);
        }
  
        var mainSliderArgs = {
          dragThreshold: 25,
          adaptiveHeight: true,
          avoidReflow: true,
          initialIndex: this.settings.currentSlideIndex,
          childNav: this.cache.thumbSlider,
          childNavScroller: this.cache.thumbScroller,
          childVertical: this.cache.thumbSlider.dataset.position === 'beside',
          pageDots: true, // mobile only with CSS
          wrapAround: true,
          callbacks: {
            onInit: this.onSliderInit.bind(this),
            onChange: this.onSlideChange.bind(this)
          }
        };
  
        // Override default settings if image set feature enabled
        if (this.settings.imageSetName) {
          var imageSetArgs = this.imageSetArguments(variant);
          // CHUMS, SM 2026.01.29
          this.cache.mainSlider.querySelectorAll(selectors.slideGroupAll).forEach(el => {
            el.dataset.setName = this.settings.imageSetName;
            el.dataset.group = this.settings.imageSetName + '_' + this.settings.currentImageSet;
          })
          // END CHUMS
          mainSliderArgs = Object.assign({}, mainSliderArgs, imageSetArgs);
          this.updateImageSetThumbs(mainSliderArgs.imageSet);
        }
  
        this.flickity = new theme.Slideshow(this.cache.mainSlider, mainSliderArgs);
      },
  
      onSliderInit: function(slide) {
        // If slider is initialized with image set feature active,
        // initialize any videos/media when they are first slide
        if (this.settings.imageSetName) {
          this.prepMediaOnSlide(slide);
        }
      },
  
      onSlideChange: function(index) {
        if (!this.flickity) return;
  
        var prevSlide = this.cache.mainSlider.querySelector('.product-main-slide[data-index="'+this.settings.currentSlideIndex+'"]');
  
        // If imageSetName exists, use a more specific selector
        var nextSlide = this.settings.imageSetName ?
                        this.cache.mainSlider.querySelectorAll('.flickity-slider .product-main-slide')[index] :
                        this.cache.mainSlider.querySelector('.product-main-slide[data-index="'+index+'"]');
  
        prevSlide.setAttribute('tabindex', '-1');
        nextSlide.setAttribute('tabindex', 0);
  
        // Pause any existing slide video/media
        this.stopMediaOnSlide(prevSlide);
  
        // Prep next slide video/media
        this.prepMediaOnSlide(nextSlide);
  
        // Update current slider index
        this.settings.currentSlideIndex = index;
      },
  
      stopMediaOnSlide(slide) {
        // Stop existing video
        var video = slide.querySelector(selectors.productVideo);
        if (video) {
          var videoType = this._getVideoType(video);
          var videoId = this._getVideoDivId(video);
          if (videoType === 'youtube') {
            if (videoObjects[videoId].videoPlayer) {
              videoObjects[videoId].videoPlayer.stopVideo();
              return;
            }
          } else if (videoType === 'mp4') {
            this.stopMp4Video(videoId);
            return;
          }
        }
  
        // Stop existing media
        var currentMedia = slide.querySelector(this.selectors.media);
        if (currentMedia) {
          currentMedia.dispatchEvent(
            new CustomEvent('mediaHidden', {
              bubbles: true,
              cancelable: true
            })
          );
        }
      },
  
      prepMediaOnSlide(slide) {
        var video = slide.querySelector(selectors.productVideo);
        if (video) {
          this.flickity.reposition();
          var videoType = this._getVideoType(video);
          var videoId = this._getVideoDivId(video);
          if (videoType === 'youtube') {
            if (videoObjects[videoId].videoPlayer && videoObjects[videoId].options.style !== 'sound') {
              videoObjects[videoId].videoPlayer.playVideo();
              return;
            }
          } else if (videoType === 'mp4') {
            this.playMp4Video(videoId);
          }
        }
  
        var nextMedia = slide.querySelector(this.selectors.media);
        if (nextMedia) {
          nextMedia.dispatchEvent(
            new CustomEvent('mediaVisible', {
              bubbles: true,
              cancelable: true
            })
          );
          slide.querySelector('.shopify-model-viewer-ui__button').setAttribute('tabindex', 0);
          slide.querySelector('.product-single__close-media').setAttribute('tabindex', 0);
        }
      },
  
      _slideIndex: function(el) {
        return el.getAttribute('data-index');
      },
  
      /*============================================================================
        Products when in quick view modal
      ==============================================================================*/
      openModalProduct: function() {
        var initialized = false;
  
        if (!this.settings.modalInit) {
          this.blocksHolder = this.container.querySelector(selectors.blocksHolder);
          var url = this.blocksHolder.dataset.url;
  
          fetch(url).then(function(response) {
            return response.text();
          }).then(function(html) {
            var parser = new DOMParser();
            var doc = parser.parseFromString(html, 'text/html');
            var blocks = doc.querySelector(selectors.blocks);
  
            // Because the same product could be opened in quick view
            // on the page we load the form elements from, we need to
            // update any `id`, `for`, and `form` attributes
            blocks.querySelectorAll('[id]').forEach(el => {
              // Update input `id`
              var val = el.getAttribute('id');
              el.setAttribute('id', val + '-modal');
  
              // Update related label if it exists
              var label = blocks.querySelector(`[for="${val}"]`);
              if (label) {
                label.setAttribute('for', val + '-modal');
              }
  
              // Update any collapsible elements
              var collapsibleTrigger = blocks.querySelector(`[aria-controls="${val}"]`);
              if (collapsibleTrigger) {
                collapsibleTrigger.setAttribute('aria-controls', val + '-modal');
              }
            });
  
            // Update any elements with `form` attribute.
            // Form element already has `-modal` appended
            var form = blocks.querySelector(this.selectors.form);
            if (form) {
              var formId = form.getAttribute('id');
              blocks.querySelectorAll('[form]').forEach(el => {
                el.setAttribute('form', formId);
              });
            }
  
            this.blocksHolder.innerHTML = '';
            this.blocksHolder.append(blocks);
            this.blocksHolder.classList.add('product-form-holder--loaded');
  
            this.cacheElements();
  
            this.formSetup();
            this.updateModalProductInventory();
  
            if (Shopify && Shopify.PaymentButton) {
              Shopify.PaymentButton.init();
            }
  
            // Re-hook up collapsible box triggers
            theme.collapsibles.init(this.container);
  
            document.dispatchEvent(new CustomEvent('quickview:loaded', {
              detail: {
                productId: this.productId
              }
            }));
          }.bind(this));
  
          this.productSetup();
          this.videoSetup();
  
          // Enable product slider in quick view
          // 1. with image sets enabled, make sure we have this.variants before initializing
          // 2. initialize normally, form data not required
          if (this.settings.imageSetName) {
            if (this.variants) {
              this.initProductSlider();
            } else {
              document.addEventListener('quickview:loaded', function(evt) {
                if (evt.detail.productId === this.productId) {
                  this.initProductSlider();
                }
              }.bind(this));
            }
          } else {
            this.initProductSlider();
          }
          this.customMediaListners();
          this.addIdToRecentlyViewed();
          this.settings.modalInit = true;
        } else {
          initialized = true;
        }
  
        AOS.refreshHard();
  
        document.dispatchEvent(new CustomEvent('quickview:open', {
          detail: {
            initialized: initialized,
            productId: this.productId
          }
        }));
      },
  
      // Recommended products load via JS and don't add variant inventory to the
      // global variable that we later check. This function scrapes a data div
      // to get that info and manually add the values.
      updateModalProductInventory: function() {
        window.inventories = window.inventories || {};
        this.container.querySelectorAll('.js-product-inventory-data').forEach(el => {
          var productId = el.dataset.productId;
          window.inventories[productId] = {};
  
          el.querySelectorAll('.js-variant-inventory-data').forEach(el => {
            window.inventories[productId][el.dataset.id] = {
              'quantity': el.dataset.quantity,
              'policy': el.dataset.policy,
              'incoming': el.dataset.incoming,
              'next_incoming_date': el.dataset.date
            }
          });
        });
      },
  
      closeModalProduct: function() {
        this.stopVideos();
      },
  
      /*============================================================================
        Product media (3D)
      ==============================================================================*/
      initModelViewerLibraries: function() {
        var modelViewerElements = this.container.querySelectorAll(this.selectors.media);
        if (modelViewerElements.length < 1) return;
  
        theme.ProductMedia.init(modelViewerElements, this.sectionId);
      },
  
      initShopifyXrLaunch: function() {
        document.addEventListener(
          'shopify_xr_launch',
          function() {
            var currentMedia = this.container.querySelector(
              this.selectors.productMediaWrapper +
                ':not(.' +
                self.classes.hidden +
                ')'
            );
            currentMedia.dispatchEvent(
              new CustomEvent('xrLaunch', {
                bubbles: true,
                cancelable: true
              })
            );
          }.bind(this)
        );
      },
  
      customMediaListners: function() {
        document.querySelectorAll(this.selectors.closeMedia).forEach(el => {
          el.addEventListener('click', function() {
            var slide = this.cache.mainSlider.querySelector(selectors.currentSlide);
            var media = slide.querySelector(this.selectors.media);
            if (media) {
              media.dispatchEvent(
                new CustomEvent('mediaHidden', {
                  bubbles: true,
                  cancelable: true
                })
              );
            }
          }.bind(this))
        });
  
        var modelViewers = this.container.querySelectorAll('model-viewer');
        if (modelViewers.length) {
          modelViewers.forEach(el => {
            el.addEventListener('shopify_model_viewer_ui_toggle_play', function(evt) {
              this.mediaLoaded(evt);
            }.bind(this));
  
            el.addEventListener('shopify_model_viewer_ui_toggle_pause', function(evt) {
              this.mediaUnloaded(evt);
            }.bind(this));
          });
        }
      },
  
      mediaLoaded: function(evt) {
        this.container.querySelectorAll(this.selectors.closeMedia).forEach(el => {
          el.classList.remove(classes.hidden);
        });
  
        if (this.flickity) {
          this.flickity.setDraggable(false);
        }
      },
  
      mediaUnloaded: function(evt) {
        this.container.querySelectorAll(this.selectors.closeMedia).forEach(el => {
          el.classList.add(classes.hidden);
        });
  
        if (this.flickity) {
          this.flickity.setDraggable(true);
        }
      },
  
      onUnload: function() {
        theme.ProductMedia.removeSectionModels(this.sectionId);
  
        if (this.flickity && typeof this.flickity.destroy === 'function') {
          this.flickity.destroy();
        }
      }
    });
  
    return Product;
  })();
  
  theme.RecentlyViewed = (function() {
    var init = false;
  
    function RecentlyViewed(container) {
      if (!container) {
        return;
      }
  
      this.container = container;
      this.sectionId = this.container.getAttribute('data-section-id');
      this.namespace = '.recently-viewed' + this.sectionId;
      this.gridItemWidth = this.container.getAttribute('data-grid-item-class');
      this.rowOf = this.container.getAttribute('data-row-of');
      this.imageSizes = this.container.getAttribute('data-image-sizes');
  
      theme.initWhenVisible({
        element: this.container,
        callback: this.init.bind(this),
        threshold: 600
      });
    };
  
    RecentlyViewed.prototype = Object.assign({}, RecentlyViewed.prototype, {
      init: function() {
        if (init) {
          return;
        }
  
        init = true;
  
        if (Object.keys(theme.recentlyViewed.recent).length === 0 && theme.recentlyViewed.recent.constructor === Object) {
          // No previous history on page load, so bail
          this.container.classList.add('hide');
          return;
        }
  
        this.outputContainer = document.getElementById('RecentlyViewed-' + this.sectionId);
        this.handle = this.container.getAttribute('data-product-handle');
  
        // Request new product info via JS API
        var promises = [];
        Object.keys(theme.recentlyViewed.recent).forEach(function (handle) {
          if (handle !== 'undefined') {
            promises.push(this.getProductInfo(handle));
          }
        }.bind(this));
  
        Promise.all(promises).then(function(result) {
          this.setupOutput(result);
          this.captureProductDetails(result);
        }.bind(this));
      },
  
      getProductInfo: function(handle) {
        return new Promise(function(resolve, reject) {
          if (theme.recentlyViewed.productInfo.hasOwnProperty(handle)) {
            resolve(theme.recentlyViewed.productInfo[handle]);
          } else {
            fetch('/products/'+ handle +'.js').then(function(response) {
              return response.text();
            }).then(function(product) {
              resolve(product);
            });
          }
        });
      },
  
      setupOutput: function(products) {
        var allProducts = [];
        var data = {};
        var limit = this.container.getAttribute('data-recent-count');
  
        var i = 0;
  
        Object.keys(products).forEach(function (key) {
          if (!products[key]) {
            return;
          }
          var product = JSON.parse(products[key]);
  
          // Ignore current product
          if (product.handle === this.handle) {
            return;
          }
  
          // Ignore undefined key
          if (typeof product.handle == 'undefined') {
            return;
          }
  
          i++;
  
          // New or formatted properties
          const widths = [180, 360, 540, 720, 900];
          product.url = theme.recentlyViewed.recent[product.handle] ? theme.recentlyViewed.recent[product.handle].url : product.url;
          product.image_responsive_url = theme.Images.buildImagePath(product.featured_image),
          product.image_responsive_urls = theme.Images.buildImagePath(product.featured_image, widths),
          product.image_aspect_ratio = theme.recentlyViewed.recent[product.handle].aspectRatio;
  
          // Unit pricing checks first variant
          var firstVariant = product.variants[0];
          if (firstVariant && firstVariant.unit_price) {
            var baseUnit = '';
  
            if (firstVariant.unit_price_measurement) {
              if (firstVariant.unit_price_measurement.reference_value != 1) {
                baseUnit += firstVariant.unit_price_measurement.reference_value + ' ';
              }
              baseUnit += firstVariant.unit_price_measurement.reference_unit;
            }
  
            product.unit_price = theme.Currency.formatMoney(firstVariant.unit_price);
            if (baseUnit != '') {
              product.unit_price += '/' + baseUnit;
            }
          }
  
          allProducts.unshift(product);
        }.bind(this));
  
        if (allProducts.length === 0) {
          this.container.classList.add('hide');
          return;
        }
  
        var productMarkup = theme.buildProductGridItem(allProducts.slice(0, limit), this.gridItemWidth, this.rowOf, this.imageSizes);
  
        this.outputContainer.innerHTML = productMarkup;
  
        if (AOS) {
          AOS.refreshHard();
        }
      },
  
      captureProductDetails: function(products) {
        for (var i = 0; i < products.length; i++) {
          var product = products[i];
          theme.recentlyViewed.productInfo[product.handle] = product;
        }
  
        // Add data to session storage to reduce API requests later
        if (theme.config.hasSessionStorage) {
          sessionStorage.setItem('recent-products', JSON.stringify(theme.recentlyViewed.productInfo));
        }
      },
  
      onUnload: function() {
        init = false;
      }
    });
  
    return RecentlyViewed;
  })();
  
  theme.Testimonials = (function() {
    var defaults = {
      adaptiveHeight: true,
      avoidReflow: true,
      pageDots: true,
      prevNextButtons: false
    };
  
    function Testimonials(container) {
      this.container = container;
      this.timeout;
      var sectionId = container.getAttribute('data-section-id');
      this.slideshow = container.querySelector('#Testimonials-' + sectionId);
      this.namespace = '.testimonial-' + sectionId;
  
      if (!this.slideshow) { return }
  
      theme.initWhenVisible({
        element: this.container,
        callback: this.init.bind(this),
        threshold: 600
      });
    }
  
    Testimonials.prototype = Object.assign({}, Testimonials.prototype, {
      init: function() {
        // Do not wrap when only a few blocks
        if (this.slideshow.dataset.count <= 3) {
          defaults.wrapAround = false;
        }
  
        this.flickity = new theme.Slideshow(this.slideshow, defaults);
  
        // Autoscroll to next slide on load to indicate more blocks
        if (this.slideshow.dataset.count > 2) {
          this.timeout = setTimeout(function() {
            this.flickity.goToSlide(1);
          }.bind(this), 1000);
        }
      },
  
      onUnload: function() {
        if (this.flickity && typeof this.flickity.destroy === 'function') {
          this.flickity.destroy();
        }
      },
  
      onDeselect: function() {
        if (this.flickity && typeof this.flickity.play === 'function') {
          this.flickity.play();
        }
      },
  
      onBlockSelect: function(evt) {
        var slide = this.slideshow.querySelector('.testimonials-slide--' + evt.detail.blockId)
        var index = parseInt(slide.dataset.index);
  
        clearTimeout(this.timeout);
  
        if (this.flickity && typeof this.flickity.pause === 'function') {
          this.flickity.goToSlide(index);
          this.flickity.pause();
        }
      },
  
      onBlockDeselect: function() {
        if (this.flickity && typeof this.flickity.play === 'function') {
          this.flickity.play();
        }
      }
    });
  
    return Testimonials;
  })();
  

  theme.isStorageSupported = function(type) {
    // Return false if we are in an iframe without access to sessionStorage
    if (window.self !== window.top) {
      return false;
    }

    var testKey = 'test';
    var storage;
    if (type === 'session') {
      storage = window.sessionStorage;
    }
    if (type === 'local') {
      storage = window.localStorage;
    }

    try {
      storage.setItem(testKey, '1');
      storage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  };

  theme.reinitProductGridItem = function(scope) {
    if (AOS) {AOS.refreshHard()}

    if (!document.documentElement.classList.contains('modal-open')) {
      theme.initQuickShop();
    }

    // Re-hook up collapsible box triggers
    theme.collapsibles.init();
  };

  /*============================================================================
    Things that don't require DOM to be ready
  ==============================================================================*/
  theme.config.hasSessionStorage = theme.isStorageSupported('session');
  theme.config.hasLocalStorage = theme.isStorageSupported('local');
  AOS.init({
    easing: 'ease-out-quad',
    once: true,
    offset: 60,
    disableMutationObserver: true
  });

  if (theme.config.hasLocalStorage) {
    theme.recentlyViewed.localStorage = window.localStorage.getItem('theme-recent');

    if (theme.recentlyViewed.localStorage) {
      theme.recentlyViewed.recent = JSON.parse(theme.recentlyViewed.localStorage);
    }
  }

  theme.recentlyViewed.productInfo = theme.config.hasSessionStorage && sessionStorage['recent-products'] ? JSON.parse(sessionStorage['recent-products']) : {};

  // Trigger events when going between breakpoints
  theme.config.bpSmall = matchMedia(theme.config.mediaQuerySmall).matches;
  matchMedia(theme.config.mediaQuerySmall).addListener(function(mql) {
    if (mql.matches) {
      theme.config.bpSmall = true;
      document.dispatchEvent(new CustomEvent('matchSmall'));
    }
    else {
      theme.config.bpSmall = false;
      document.dispatchEvent(new CustomEvent('unmatchSmall'));
    }
  });

  /*============================================================================
    Things that require DOM to be ready
  ==============================================================================*/
  function DOMready(callback) {
    if (document.readyState != 'loading') callback();
    else document.addEventListener('DOMContentLoaded', callback);
  }

  // Load generic JS. Also reinitializes when sections are
  // added, edited, or removed in Shopify's editor
  theme.initGlobals = function() {
    theme.collapsibles.init();
    theme.videoModal();
  }

  DOMready(function(){
    theme.sections = new theme.Sections();

    theme.sections.register('slideshow-section', theme.SlideshowSection);
    theme.sections.register('header', theme.HeaderSection);
    theme.sections.register('product', theme.Product);
    theme.sections.register('blog', theme.Blog);
    theme.sections.register('password-header', theme.PasswordHeader);
    theme.sections.register('photoswipe', theme.Photoswipe);
    theme.sections.register('background-image', theme.BackgroundImage);
    theme.sections.register('testimonials', theme.Testimonials);
    theme.sections.register('video-section', theme.VideoSection);
    theme.sections.register('map', theme.Maps);
    theme.sections.register('footer-section', theme.FooterSection);
    theme.sections.register('store-availability', theme.StoreAvailability);
    theme.sections.register('recently-viewed', theme.RecentlyViewed);
    theme.sections.register('newsletter-popup', theme.NewsletterPopup);
    theme.sections.register('collection-header', theme.CollectionHeader);
    theme.sections.register('collection-grid', theme.Collection);

    theme.initGlobals();
    theme.initQuickShop();
    theme.rteInit();

    if (document.body.classList.contains('template-cart')) {
      var cartPageForm = document.getElementById('CartPageForm');
      if (cartPageForm) {
        new theme.CartForm(cartPageForm);
      }
    }

    if (theme.settings.isCustomerTemplate) {
      theme.customerTemplates();
    }

    document.dispatchEvent(new CustomEvent('page:loaded'));
  });

})();
