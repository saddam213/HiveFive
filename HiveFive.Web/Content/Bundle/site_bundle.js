/**!
 * @fileOverview Kickass library to create and place poppers near their reference elements.
 * @version 1.14.3
 * @license
 * Copyright (c) 2016 Federico Zivolo and contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.Popper = factory());
}(this, (function () { 'use strict';

var isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

var longerTimeoutBrowsers = ['Edge', 'Trident', 'Firefox'];
var timeoutDuration = 0;
for (var i = 0; i < longerTimeoutBrowsers.length; i += 1) {
  if (isBrowser && navigator.userAgent.indexOf(longerTimeoutBrowsers[i]) >= 0) {
    timeoutDuration = 1;
    break;
  }
}

function microtaskDebounce(fn) {
  var called = false;
  return function () {
    if (called) {
      return;
    }
    called = true;
    window.Promise.resolve().then(function () {
      called = false;
      fn();
    });
  };
}

function taskDebounce(fn) {
  var scheduled = false;
  return function () {
    if (!scheduled) {
      scheduled = true;
      setTimeout(function () {
        scheduled = false;
        fn();
      }, timeoutDuration);
    }
  };
}

var supportsMicroTasks = isBrowser && window.Promise;

/**
* Create a debounced version of a method, that's asynchronously deferred
* but called in the minimum time possible.
*
* @method
* @memberof Popper.Utils
* @argument {Function} fn
* @returns {Function}
*/
var debounce = supportsMicroTasks ? microtaskDebounce : taskDebounce;

/**
 * Check if the given variable is a function
 * @method
 * @memberof Popper.Utils
 * @argument {Any} functionToCheck - variable to check
 * @returns {Boolean} answer to: is a function?
 */
function isFunction(functionToCheck) {
  var getType = {};
  return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
}

/**
 * Get CSS computed property of the given element
 * @method
 * @memberof Popper.Utils
 * @argument {Eement} element
 * @argument {String} property
 */
function getStyleComputedProperty(element, property) {
  if (element.nodeType !== 1) {
    return [];
  }
  // NOTE: 1 DOM access here
  var css = getComputedStyle(element, null);
  return property ? css[property] : css;
}

/**
 * Returns the parentNode or the host of the element
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element
 * @returns {Element} parent
 */
function getParentNode(element) {
  if (element.nodeName === 'HTML') {
    return element;
  }
  return element.parentNode || element.host;
}

/**
 * Returns the scrolling parent of the given element
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element
 * @returns {Element} scroll parent
 */
function getScrollParent(element) {
  // Return body, `getScroll` will take care to get the correct `scrollTop` from it
  if (!element) {
    return document.body;
  }

  switch (element.nodeName) {
    case 'HTML':
    case 'BODY':
      return element.ownerDocument.body;
    case '#document':
      return element.body;
  }

  // Firefox want us to check `-x` and `-y` variations as well

  var _getStyleComputedProp = getStyleComputedProperty(element),
      overflow = _getStyleComputedProp.overflow,
      overflowX = _getStyleComputedProp.overflowX,
      overflowY = _getStyleComputedProp.overflowY;

  if (/(auto|scroll|overlay)/.test(overflow + overflowY + overflowX)) {
    return element;
  }

  return getScrollParent(getParentNode(element));
}

var isIE11 = isBrowser && !!(window.MSInputMethodContext && document.documentMode);
var isIE10 = isBrowser && /MSIE 10/.test(navigator.userAgent);

/**
 * Determines if the browser is Internet Explorer
 * @method
 * @memberof Popper.Utils
 * @param {Number} version to check
 * @returns {Boolean} isIE
 */
function isIE(version) {
  if (version === 11) {
    return isIE11;
  }
  if (version === 10) {
    return isIE10;
  }
  return isIE11 || isIE10;
}

/**
 * Returns the offset parent of the given element
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element
 * @returns {Element} offset parent
 */
function getOffsetParent(element) {
  if (!element) {
    return document.documentElement;
  }

  var noOffsetParent = isIE(10) ? document.body : null;

  // NOTE: 1 DOM access here
  var offsetParent = element.offsetParent;
  // Skip hidden elements which don't have an offsetParent
  while (offsetParent === noOffsetParent && element.nextElementSibling) {
    offsetParent = (element = element.nextElementSibling).offsetParent;
  }

  var nodeName = offsetParent && offsetParent.nodeName;

  if (!nodeName || nodeName === 'BODY' || nodeName === 'HTML') {
    return element ? element.ownerDocument.documentElement : document.documentElement;
  }

  // .offsetParent will return the closest TD or TABLE in case
  // no offsetParent is present, I hate this job...
  if (['TD', 'TABLE'].indexOf(offsetParent.nodeName) !== -1 && getStyleComputedProperty(offsetParent, 'position') === 'static') {
    return getOffsetParent(offsetParent);
  }

  return offsetParent;
}

function isOffsetContainer(element) {
  var nodeName = element.nodeName;

  if (nodeName === 'BODY') {
    return false;
  }
  return nodeName === 'HTML' || getOffsetParent(element.firstElementChild) === element;
}

/**
 * Finds the root node (document, shadowDOM root) of the given element
 * @method
 * @memberof Popper.Utils
 * @argument {Element} node
 * @returns {Element} root node
 */
function getRoot(node) {
  if (node.parentNode !== null) {
    return getRoot(node.parentNode);
  }

  return node;
}

/**
 * Finds the offset parent common to the two provided nodes
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element1
 * @argument {Element} element2
 * @returns {Element} common offset parent
 */
function findCommonOffsetParent(element1, element2) {
  // This check is needed to avoid errors in case one of the elements isn't defined for any reason
  if (!element1 || !element1.nodeType || !element2 || !element2.nodeType) {
    return document.documentElement;
  }

  // Here we make sure to give as "start" the element that comes first in the DOM
  var order = element1.compareDocumentPosition(element2) & Node.DOCUMENT_POSITION_FOLLOWING;
  var start = order ? element1 : element2;
  var end = order ? element2 : element1;

  // Get common ancestor container
  var range = document.createRange();
  range.setStart(start, 0);
  range.setEnd(end, 0);
  var commonAncestorContainer = range.commonAncestorContainer;

  // Both nodes are inside #document

  if (element1 !== commonAncestorContainer && element2 !== commonAncestorContainer || start.contains(end)) {
    if (isOffsetContainer(commonAncestorContainer)) {
      return commonAncestorContainer;
    }

    return getOffsetParent(commonAncestorContainer);
  }

  // one of the nodes is inside shadowDOM, find which one
  var element1root = getRoot(element1);
  if (element1root.host) {
    return findCommonOffsetParent(element1root.host, element2);
  } else {
    return findCommonOffsetParent(element1, getRoot(element2).host);
  }
}

/**
 * Gets the scroll value of the given element in the given side (top and left)
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element
 * @argument {String} side `top` or `left`
 * @returns {number} amount of scrolled pixels
 */
function getScroll(element) {
  var side = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'top';

  var upperSide = side === 'top' ? 'scrollTop' : 'scrollLeft';
  var nodeName = element.nodeName;

  if (nodeName === 'BODY' || nodeName === 'HTML') {
    var html = element.ownerDocument.documentElement;
    var scrollingElement = element.ownerDocument.scrollingElement || html;
    return scrollingElement[upperSide];
  }

  return element[upperSide];
}

/*
 * Sum or subtract the element scroll values (left and top) from a given rect object
 * @method
 * @memberof Popper.Utils
 * @param {Object} rect - Rect object you want to change
 * @param {HTMLElement} element - The element from the function reads the scroll values
 * @param {Boolean} subtract - set to true if you want to subtract the scroll values
 * @return {Object} rect - The modifier rect object
 */
function includeScroll(rect, element) {
  var subtract = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

  var scrollTop = getScroll(element, 'top');
  var scrollLeft = getScroll(element, 'left');
  var modifier = subtract ? -1 : 1;
  rect.top += scrollTop * modifier;
  rect.bottom += scrollTop * modifier;
  rect.left += scrollLeft * modifier;
  rect.right += scrollLeft * modifier;
  return rect;
}

/*
 * Helper to detect borders of a given element
 * @method
 * @memberof Popper.Utils
 * @param {CSSStyleDeclaration} styles
 * Result of `getStyleComputedProperty` on the given element
 * @param {String} axis - `x` or `y`
 * @return {number} borders - The borders size of the given axis
 */

function getBordersSize(styles, axis) {
  var sideA = axis === 'x' ? 'Left' : 'Top';
  var sideB = sideA === 'Left' ? 'Right' : 'Bottom';

  return parseFloat(styles['border' + sideA + 'Width'], 10) + parseFloat(styles['border' + sideB + 'Width'], 10);
}

function getSize(axis, body, html, computedStyle) {
  return Math.max(body['offset' + axis], body['scroll' + axis], html['client' + axis], html['offset' + axis], html['scroll' + axis], isIE(10) ? html['offset' + axis] + computedStyle['margin' + (axis === 'Height' ? 'Top' : 'Left')] + computedStyle['margin' + (axis === 'Height' ? 'Bottom' : 'Right')] : 0);
}

function getWindowSizes() {
  var body = document.body;
  var html = document.documentElement;
  var computedStyle = isIE(10) && getComputedStyle(html);

  return {
    height: getSize('Height', body, html, computedStyle),
    width: getSize('Width', body, html, computedStyle)
  };
}

var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();





var defineProperty = function (obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
};

var _extends = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

/**
 * Given element offsets, generate an output similar to getBoundingClientRect
 * @method
 * @memberof Popper.Utils
 * @argument {Object} offsets
 * @returns {Object} ClientRect like output
 */
function getClientRect(offsets) {
  return _extends({}, offsets, {
    right: offsets.left + offsets.width,
    bottom: offsets.top + offsets.height
  });
}

/**
 * Get bounding client rect of given element
 * @method
 * @memberof Popper.Utils
 * @param {HTMLElement} element
 * @return {Object} client rect
 */
function getBoundingClientRect(element) {
  var rect = {};

  // IE10 10 FIX: Please, don't ask, the element isn't
  // considered in DOM in some circumstances...
  // This isn't reproducible in IE10 compatibility mode of IE11
  try {
    if (isIE(10)) {
      rect = element.getBoundingClientRect();
      var scrollTop = getScroll(element, 'top');
      var scrollLeft = getScroll(element, 'left');
      rect.top += scrollTop;
      rect.left += scrollLeft;
      rect.bottom += scrollTop;
      rect.right += scrollLeft;
    } else {
      rect = element.getBoundingClientRect();
    }
  } catch (e) {}

  var result = {
    left: rect.left,
    top: rect.top,
    width: rect.right - rect.left,
    height: rect.bottom - rect.top
  };

  // subtract scrollbar size from sizes
  var sizes = element.nodeName === 'HTML' ? getWindowSizes() : {};
  var width = sizes.width || element.clientWidth || result.right - result.left;
  var height = sizes.height || element.clientHeight || result.bottom - result.top;

  var horizScrollbar = element.offsetWidth - width;
  var vertScrollbar = element.offsetHeight - height;

  // if an hypothetical scrollbar is detected, we must be sure it's not a `border`
  // we make this check conditional for performance reasons
  if (horizScrollbar || vertScrollbar) {
    var styles = getStyleComputedProperty(element);
    horizScrollbar -= getBordersSize(styles, 'x');
    vertScrollbar -= getBordersSize(styles, 'y');

    result.width -= horizScrollbar;
    result.height -= vertScrollbar;
  }

  return getClientRect(result);
}

function getOffsetRectRelativeToArbitraryNode(children, parent) {
  var fixedPosition = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

  var isIE10 = isIE(10);
  var isHTML = parent.nodeName === 'HTML';
  var childrenRect = getBoundingClientRect(children);
  var parentRect = getBoundingClientRect(parent);
  var scrollParent = getScrollParent(children);

  var styles = getStyleComputedProperty(parent);
  var borderTopWidth = parseFloat(styles.borderTopWidth, 10);
  var borderLeftWidth = parseFloat(styles.borderLeftWidth, 10);

  // In cases where the parent is fixed, we must ignore negative scroll in offset calc
  if (fixedPosition && parent.nodeName === 'HTML') {
    parentRect.top = Math.max(parentRect.top, 0);
    parentRect.left = Math.max(parentRect.left, 0);
  }
  var offsets = getClientRect({
    top: childrenRect.top - parentRect.top - borderTopWidth,
    left: childrenRect.left - parentRect.left - borderLeftWidth,
    width: childrenRect.width,
    height: childrenRect.height
  });
  offsets.marginTop = 0;
  offsets.marginLeft = 0;

  // Subtract margins of documentElement in case it's being used as parent
  // we do this only on HTML because it's the only element that behaves
  // differently when margins are applied to it. The margins are included in
  // the box of the documentElement, in the other cases not.
  if (!isIE10 && isHTML) {
    var marginTop = parseFloat(styles.marginTop, 10);
    var marginLeft = parseFloat(styles.marginLeft, 10);

    offsets.top -= borderTopWidth - marginTop;
    offsets.bottom -= borderTopWidth - marginTop;
    offsets.left -= borderLeftWidth - marginLeft;
    offsets.right -= borderLeftWidth - marginLeft;

    // Attach marginTop and marginLeft because in some circumstances we may need them
    offsets.marginTop = marginTop;
    offsets.marginLeft = marginLeft;
  }

  if (isIE10 && !fixedPosition ? parent.contains(scrollParent) : parent === scrollParent && scrollParent.nodeName !== 'BODY') {
    offsets = includeScroll(offsets, parent);
  }

  return offsets;
}

function getViewportOffsetRectRelativeToArtbitraryNode(element) {
  var excludeScroll = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

  var html = element.ownerDocument.documentElement;
  var relativeOffset = getOffsetRectRelativeToArbitraryNode(element, html);
  var width = Math.max(html.clientWidth, window.innerWidth || 0);
  var height = Math.max(html.clientHeight, window.innerHeight || 0);

  var scrollTop = !excludeScroll ? getScroll(html) : 0;
  var scrollLeft = !excludeScroll ? getScroll(html, 'left') : 0;

  var offset = {
    top: scrollTop - relativeOffset.top + relativeOffset.marginTop,
    left: scrollLeft - relativeOffset.left + relativeOffset.marginLeft,
    width: width,
    height: height
  };

  return getClientRect(offset);
}

/**
 * Check if the given element is fixed or is inside a fixed parent
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element
 * @argument {Element} customContainer
 * @returns {Boolean} answer to "isFixed?"
 */
function isFixed(element) {
  var nodeName = element.nodeName;
  if (nodeName === 'BODY' || nodeName === 'HTML') {
    return false;
  }
  if (getStyleComputedProperty(element, 'position') === 'fixed') {
    return true;
  }
  return isFixed(getParentNode(element));
}

/**
 * Finds the first parent of an element that has a transformed property defined
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element
 * @returns {Element} first transformed parent or documentElement
 */

function getFixedPositionOffsetParent(element) {
  // This check is needed to avoid errors in case one of the elements isn't defined for any reason
  if (!element || !element.parentElement || isIE()) {
    return document.documentElement;
  }
  var el = element.parentElement;
  while (el && getStyleComputedProperty(el, 'transform') === 'none') {
    el = el.parentElement;
  }
  return el || document.documentElement;
}

/**
 * Computed the boundaries limits and return them
 * @method
 * @memberof Popper.Utils
 * @param {HTMLElement} popper
 * @param {HTMLElement} reference
 * @param {number} padding
 * @param {HTMLElement} boundariesElement - Element used to define the boundaries
 * @param {Boolean} fixedPosition - Is in fixed position mode
 * @returns {Object} Coordinates of the boundaries
 */
function getBoundaries(popper, reference, padding, boundariesElement) {
  var fixedPosition = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;

  // NOTE: 1 DOM access here

  var boundaries = { top: 0, left: 0 };
  var offsetParent = fixedPosition ? getFixedPositionOffsetParent(popper) : findCommonOffsetParent(popper, reference);

  // Handle viewport case
  if (boundariesElement === 'viewport') {
    boundaries = getViewportOffsetRectRelativeToArtbitraryNode(offsetParent, fixedPosition);
  } else {
    // Handle other cases based on DOM element used as boundaries
    var boundariesNode = void 0;
    if (boundariesElement === 'scrollParent') {
      boundariesNode = getScrollParent(getParentNode(reference));
      if (boundariesNode.nodeName === 'BODY') {
        boundariesNode = popper.ownerDocument.documentElement;
      }
    } else if (boundariesElement === 'window') {
      boundariesNode = popper.ownerDocument.documentElement;
    } else {
      boundariesNode = boundariesElement;
    }

    var offsets = getOffsetRectRelativeToArbitraryNode(boundariesNode, offsetParent, fixedPosition);

    // In case of HTML, we need a different computation
    if (boundariesNode.nodeName === 'HTML' && !isFixed(offsetParent)) {
      var _getWindowSizes = getWindowSizes(),
          height = _getWindowSizes.height,
          width = _getWindowSizes.width;

      boundaries.top += offsets.top - offsets.marginTop;
      boundaries.bottom = height + offsets.top;
      boundaries.left += offsets.left - offsets.marginLeft;
      boundaries.right = width + offsets.left;
    } else {
      // for all the other DOM elements, this one is good
      boundaries = offsets;
    }
  }

  // Add paddings
  boundaries.left += padding;
  boundaries.top += padding;
  boundaries.right -= padding;
  boundaries.bottom -= padding;

  return boundaries;
}

function getArea(_ref) {
  var width = _ref.width,
      height = _ref.height;

  return width * height;
}

/**
 * Utility used to transform the `auto` placement to the placement with more
 * available space.
 * @method
 * @memberof Popper.Utils
 * @argument {Object} data - The data object generated by update method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function computeAutoPlacement(placement, refRect, popper, reference, boundariesElement) {
  var padding = arguments.length > 5 && arguments[5] !== undefined ? arguments[5] : 0;

  if (placement.indexOf('auto') === -1) {
    return placement;
  }

  var boundaries = getBoundaries(popper, reference, padding, boundariesElement);

  var rects = {
    top: {
      width: boundaries.width,
      height: refRect.top - boundaries.top
    },
    right: {
      width: boundaries.right - refRect.right,
      height: boundaries.height
    },
    bottom: {
      width: boundaries.width,
      height: boundaries.bottom - refRect.bottom
    },
    left: {
      width: refRect.left - boundaries.left,
      height: boundaries.height
    }
  };

  var sortedAreas = Object.keys(rects).map(function (key) {
    return _extends({
      key: key
    }, rects[key], {
      area: getArea(rects[key])
    });
  }).sort(function (a, b) {
    return b.area - a.area;
  });

  var filteredAreas = sortedAreas.filter(function (_ref2) {
    var width = _ref2.width,
        height = _ref2.height;
    return width >= popper.clientWidth && height >= popper.clientHeight;
  });

  var computedPlacement = filteredAreas.length > 0 ? filteredAreas[0].key : sortedAreas[0].key;

  var variation = placement.split('-')[1];

  return computedPlacement + (variation ? '-' + variation : '');
}

/**
 * Get offsets to the reference element
 * @method
 * @memberof Popper.Utils
 * @param {Object} state
 * @param {Element} popper - the popper element
 * @param {Element} reference - the reference element (the popper will be relative to this)
 * @param {Element} fixedPosition - is in fixed position mode
 * @returns {Object} An object containing the offsets which will be applied to the popper
 */
function getReferenceOffsets(state, popper, reference) {
  var fixedPosition = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;

  var commonOffsetParent = fixedPosition ? getFixedPositionOffsetParent(popper) : findCommonOffsetParent(popper, reference);
  return getOffsetRectRelativeToArbitraryNode(reference, commonOffsetParent, fixedPosition);
}

/**
 * Get the outer sizes of the given element (offset size + margins)
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element
 * @returns {Object} object containing width and height properties
 */
function getOuterSizes(element) {
  var styles = getComputedStyle(element);
  var x = parseFloat(styles.marginTop) + parseFloat(styles.marginBottom);
  var y = parseFloat(styles.marginLeft) + parseFloat(styles.marginRight);
  var result = {
    width: element.offsetWidth + y,
    height: element.offsetHeight + x
  };
  return result;
}

/**
 * Get the opposite placement of the given one
 * @method
 * @memberof Popper.Utils
 * @argument {String} placement
 * @returns {String} flipped placement
 */
function getOppositePlacement(placement) {
  var hash = { left: 'right', right: 'left', bottom: 'top', top: 'bottom' };
  return placement.replace(/left|right|bottom|top/g, function (matched) {
    return hash[matched];
  });
}

/**
 * Get offsets to the popper
 * @method
 * @memberof Popper.Utils
 * @param {Object} position - CSS position the Popper will get applied
 * @param {HTMLElement} popper - the popper element
 * @param {Object} referenceOffsets - the reference offsets (the popper will be relative to this)
 * @param {String} placement - one of the valid placement options
 * @returns {Object} popperOffsets - An object containing the offsets which will be applied to the popper
 */
function getPopperOffsets(popper, referenceOffsets, placement) {
  placement = placement.split('-')[0];

  // Get popper node sizes
  var popperRect = getOuterSizes(popper);

  // Add position, width and height to our offsets object
  var popperOffsets = {
    width: popperRect.width,
    height: popperRect.height
  };

  // depending by the popper placement we have to compute its offsets slightly differently
  var isHoriz = ['right', 'left'].indexOf(placement) !== -1;
  var mainSide = isHoriz ? 'top' : 'left';
  var secondarySide = isHoriz ? 'left' : 'top';
  var measurement = isHoriz ? 'height' : 'width';
  var secondaryMeasurement = !isHoriz ? 'height' : 'width';

  popperOffsets[mainSide] = referenceOffsets[mainSide] + referenceOffsets[measurement] / 2 - popperRect[measurement] / 2;
  if (placement === secondarySide) {
    popperOffsets[secondarySide] = referenceOffsets[secondarySide] - popperRect[secondaryMeasurement];
  } else {
    popperOffsets[secondarySide] = referenceOffsets[getOppositePlacement(secondarySide)];
  }

  return popperOffsets;
}

/**
 * Mimics the `find` method of Array
 * @method
 * @memberof Popper.Utils
 * @argument {Array} arr
 * @argument prop
 * @argument value
 * @returns index or -1
 */
function find(arr, check) {
  // use native find if supported
  if (Array.prototype.find) {
    return arr.find(check);
  }

  // use `filter` to obtain the same behavior of `find`
  return arr.filter(check)[0];
}

/**
 * Return the index of the matching object
 * @method
 * @memberof Popper.Utils
 * @argument {Array} arr
 * @argument prop
 * @argument value
 * @returns index or -1
 */
function findIndex(arr, prop, value) {
  // use native findIndex if supported
  if (Array.prototype.findIndex) {
    return arr.findIndex(function (cur) {
      return cur[prop] === value;
    });
  }

  // use `find` + `indexOf` if `findIndex` isn't supported
  var match = find(arr, function (obj) {
    return obj[prop] === value;
  });
  return arr.indexOf(match);
}

/**
 * Loop trough the list of modifiers and run them in order,
 * each of them will then edit the data object.
 * @method
 * @memberof Popper.Utils
 * @param {dataObject} data
 * @param {Array} modifiers
 * @param {String} ends - Optional modifier name used as stopper
 * @returns {dataObject}
 */
function runModifiers(modifiers, data, ends) {
  var modifiersToRun = ends === undefined ? modifiers : modifiers.slice(0, findIndex(modifiers, 'name', ends));

  modifiersToRun.forEach(function (modifier) {
    if (modifier['function']) {
      // eslint-disable-line dot-notation
      console.warn('`modifier.function` is deprecated, use `modifier.fn`!');
    }
    var fn = modifier['function'] || modifier.fn; // eslint-disable-line dot-notation
    if (modifier.enabled && isFunction(fn)) {
      // Add properties to offsets to make them a complete clientRect object
      // we do this before each modifier to make sure the previous one doesn't
      // mess with these values
      data.offsets.popper = getClientRect(data.offsets.popper);
      data.offsets.reference = getClientRect(data.offsets.reference);

      data = fn(data, modifier);
    }
  });

  return data;
}

/**
 * Updates the position of the popper, computing the new offsets and applying
 * the new style.<br />
 * Prefer `scheduleUpdate` over `update` because of performance reasons.
 * @method
 * @memberof Popper
 */
function update() {
  // if popper is destroyed, don't perform any further update
  if (this.state.isDestroyed) {
    return;
  }

  var data = {
    instance: this,
    styles: {},
    arrowStyles: {},
    attributes: {},
    flipped: false,
    offsets: {}
  };

  // compute reference element offsets
  data.offsets.reference = getReferenceOffsets(this.state, this.popper, this.reference, this.options.positionFixed);

  // compute auto placement, store placement inside the data object,
  // modifiers will be able to edit `placement` if needed
  // and refer to originalPlacement to know the original value
  data.placement = computeAutoPlacement(this.options.placement, data.offsets.reference, this.popper, this.reference, this.options.modifiers.flip.boundariesElement, this.options.modifiers.flip.padding);

  // store the computed placement inside `originalPlacement`
  data.originalPlacement = data.placement;

  data.positionFixed = this.options.positionFixed;

  // compute the popper offsets
  data.offsets.popper = getPopperOffsets(this.popper, data.offsets.reference, data.placement);

  data.offsets.popper.position = this.options.positionFixed ? 'fixed' : 'absolute';

  // run the modifiers
  data = runModifiers(this.modifiers, data);

  // the first `update` will call `onCreate` callback
  // the other ones will call `onUpdate` callback
  if (!this.state.isCreated) {
    this.state.isCreated = true;
    this.options.onCreate(data);
  } else {
    this.options.onUpdate(data);
  }
}

/**
 * Helper used to know if the given modifier is enabled.
 * @method
 * @memberof Popper.Utils
 * @returns {Boolean}
 */
function isModifierEnabled(modifiers, modifierName) {
  return modifiers.some(function (_ref) {
    var name = _ref.name,
        enabled = _ref.enabled;
    return enabled && name === modifierName;
  });
}

/**
 * Get the prefixed supported property name
 * @method
 * @memberof Popper.Utils
 * @argument {String} property (camelCase)
 * @returns {String} prefixed property (camelCase or PascalCase, depending on the vendor prefix)
 */
function getSupportedPropertyName(property) {
  var prefixes = [false, 'ms', 'Webkit', 'Moz', 'O'];
  var upperProp = property.charAt(0).toUpperCase() + property.slice(1);

  for (var i = 0; i < prefixes.length; i++) {
    var prefix = prefixes[i];
    var toCheck = prefix ? '' + prefix + upperProp : property;
    if (typeof document.body.style[toCheck] !== 'undefined') {
      return toCheck;
    }
  }
  return null;
}

/**
 * Destroy the popper
 * @method
 * @memberof Popper
 */
function destroy() {
  this.state.isDestroyed = true;

  // touch DOM only if `applyStyle` modifier is enabled
  if (isModifierEnabled(this.modifiers, 'applyStyle')) {
    this.popper.removeAttribute('x-placement');
    this.popper.style.position = '';
    this.popper.style.top = '';
    this.popper.style.left = '';
    this.popper.style.right = '';
    this.popper.style.bottom = '';
    this.popper.style.willChange = '';
    this.popper.style[getSupportedPropertyName('transform')] = '';
  }

  this.disableEventListeners();

  // remove the popper if user explicity asked for the deletion on destroy
  // do not use `remove` because IE11 doesn't support it
  if (this.options.removeOnDestroy) {
    this.popper.parentNode.removeChild(this.popper);
  }
  return this;
}

/**
 * Get the window associated with the element
 * @argument {Element} element
 * @returns {Window}
 */
function getWindow(element) {
  var ownerDocument = element.ownerDocument;
  return ownerDocument ? ownerDocument.defaultView : window;
}

function attachToScrollParents(scrollParent, event, callback, scrollParents) {
  var isBody = scrollParent.nodeName === 'BODY';
  var target = isBody ? scrollParent.ownerDocument.defaultView : scrollParent;
  target.addEventListener(event, callback, { passive: true });

  if (!isBody) {
    attachToScrollParents(getScrollParent(target.parentNode), event, callback, scrollParents);
  }
  scrollParents.push(target);
}

/**
 * Setup needed event listeners used to update the popper position
 * @method
 * @memberof Popper.Utils
 * @private
 */
function setupEventListeners(reference, options, state, updateBound) {
  // Resize event listener on window
  state.updateBound = updateBound;
  getWindow(reference).addEventListener('resize', state.updateBound, { passive: true });

  // Scroll event listener on scroll parents
  var scrollElement = getScrollParent(reference);
  attachToScrollParents(scrollElement, 'scroll', state.updateBound, state.scrollParents);
  state.scrollElement = scrollElement;
  state.eventsEnabled = true;

  return state;
}

/**
 * It will add resize/scroll events and start recalculating
 * position of the popper element when they are triggered.
 * @method
 * @memberof Popper
 */
function enableEventListeners() {
  if (!this.state.eventsEnabled) {
    this.state = setupEventListeners(this.reference, this.options, this.state, this.scheduleUpdate);
  }
}

/**
 * Remove event listeners used to update the popper position
 * @method
 * @memberof Popper.Utils
 * @private
 */
function removeEventListeners(reference, state) {
  // Remove resize event listener on window
  getWindow(reference).removeEventListener('resize', state.updateBound);

  // Remove scroll event listener on scroll parents
  state.scrollParents.forEach(function (target) {
    target.removeEventListener('scroll', state.updateBound);
  });

  // Reset state
  state.updateBound = null;
  state.scrollParents = [];
  state.scrollElement = null;
  state.eventsEnabled = false;
  return state;
}

/**
 * It will remove resize/scroll events and won't recalculate popper position
 * when they are triggered. It also won't trigger onUpdate callback anymore,
 * unless you call `update` method manually.
 * @method
 * @memberof Popper
 */
function disableEventListeners() {
  if (this.state.eventsEnabled) {
    cancelAnimationFrame(this.scheduleUpdate);
    this.state = removeEventListeners(this.reference, this.state);
  }
}

/**
 * Tells if a given input is a number
 * @method
 * @memberof Popper.Utils
 * @param {*} input to check
 * @return {Boolean}
 */
function isNumeric(n) {
  return n !== '' && !isNaN(parseFloat(n)) && isFinite(n);
}

/**
 * Set the style to the given popper
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element - Element to apply the style to
 * @argument {Object} styles
 * Object with a list of properties and values which will be applied to the element
 */
function setStyles(element, styles) {
  Object.keys(styles).forEach(function (prop) {
    var unit = '';
    // add unit if the value is numeric and is one of the following
    if (['width', 'height', 'top', 'right', 'bottom', 'left'].indexOf(prop) !== -1 && isNumeric(styles[prop])) {
      unit = 'px';
    }
    element.style[prop] = styles[prop] + unit;
  });
}

/**
 * Set the attributes to the given popper
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element - Element to apply the attributes to
 * @argument {Object} styles
 * Object with a list of properties and values which will be applied to the element
 */
function setAttributes(element, attributes) {
  Object.keys(attributes).forEach(function (prop) {
    var value = attributes[prop];
    if (value !== false) {
      element.setAttribute(prop, attributes[prop]);
    } else {
      element.removeAttribute(prop);
    }
  });
}

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by `update` method
 * @argument {Object} data.styles - List of style properties - values to apply to popper element
 * @argument {Object} data.attributes - List of attribute properties - values to apply to popper element
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The same data object
 */
function applyStyle(data) {
  // any property present in `data.styles` will be applied to the popper,
  // in this way we can make the 3rd party modifiers add custom styles to it
  // Be aware, modifiers could override the properties defined in the previous
  // lines of this modifier!
  setStyles(data.instance.popper, data.styles);

  // any property present in `data.attributes` will be applied to the popper,
  // they will be set as HTML attributes of the element
  setAttributes(data.instance.popper, data.attributes);

  // if arrowElement is defined and arrowStyles has some properties
  if (data.arrowElement && Object.keys(data.arrowStyles).length) {
    setStyles(data.arrowElement, data.arrowStyles);
  }

  return data;
}

/**
 * Set the x-placement attribute before everything else because it could be used
 * to add margins to the popper margins needs to be calculated to get the
 * correct popper offsets.
 * @method
 * @memberof Popper.modifiers
 * @param {HTMLElement} reference - The reference element used to position the popper
 * @param {HTMLElement} popper - The HTML element used as popper
 * @param {Object} options - Popper.js options
 */
function applyStyleOnLoad(reference, popper, options, modifierOptions, state) {
  // compute reference element offsets
  var referenceOffsets = getReferenceOffsets(state, popper, reference, options.positionFixed);

  // compute auto placement, store placement inside the data object,
  // modifiers will be able to edit `placement` if needed
  // and refer to originalPlacement to know the original value
  var placement = computeAutoPlacement(options.placement, referenceOffsets, popper, reference, options.modifiers.flip.boundariesElement, options.modifiers.flip.padding);

  popper.setAttribute('x-placement', placement);

  // Apply `position` to popper before anything else because
  // without the position applied we can't guarantee correct computations
  setStyles(popper, { position: options.positionFixed ? 'fixed' : 'absolute' });

  return options;
}

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by `update` method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function computeStyle(data, options) {
  var x = options.x,
      y = options.y;
  var popper = data.offsets.popper;

  // Remove this legacy support in Popper.js v2

  var legacyGpuAccelerationOption = find(data.instance.modifiers, function (modifier) {
    return modifier.name === 'applyStyle';
  }).gpuAcceleration;
  if (legacyGpuAccelerationOption !== undefined) {
    console.warn('WARNING: `gpuAcceleration` option moved to `computeStyle` modifier and will not be supported in future versions of Popper.js!');
  }
  var gpuAcceleration = legacyGpuAccelerationOption !== undefined ? legacyGpuAccelerationOption : options.gpuAcceleration;

  var offsetParent = getOffsetParent(data.instance.popper);
  var offsetParentRect = getBoundingClientRect(offsetParent);

  // Styles
  var styles = {
    position: popper.position
  };

  // Avoid blurry text by using full pixel integers.
  // For pixel-perfect positioning, top/bottom prefers rounded
  // values, while left/right prefers floored values.
  var offsets = {
    left: Math.floor(popper.left),
    top: Math.round(popper.top),
    bottom: Math.round(popper.bottom),
    right: Math.floor(popper.right)
  };

  var sideA = x === 'bottom' ? 'top' : 'bottom';
  var sideB = y === 'right' ? 'left' : 'right';

  // if gpuAcceleration is set to `true` and transform is supported,
  //  we use `translate3d` to apply the position to the popper we
  // automatically use the supported prefixed version if needed
  var prefixedProperty = getSupportedPropertyName('transform');

  // now, let's make a step back and look at this code closely (wtf?)
  // If the content of the popper grows once it's been positioned, it
  // may happen that the popper gets misplaced because of the new content
  // overflowing its reference element
  // To avoid this problem, we provide two options (x and y), which allow
  // the consumer to define the offset origin.
  // If we position a popper on top of a reference element, we can set
  // `x` to `top` to make the popper grow towards its top instead of
  // its bottom.
  var left = void 0,
      top = void 0;
  if (sideA === 'bottom') {
    top = -offsetParentRect.height + offsets.bottom;
  } else {
    top = offsets.top;
  }
  if (sideB === 'right') {
    left = -offsetParentRect.width + offsets.right;
  } else {
    left = offsets.left;
  }
  if (gpuAcceleration && prefixedProperty) {
    styles[prefixedProperty] = 'translate3d(' + left + 'px, ' + top + 'px, 0)';
    styles[sideA] = 0;
    styles[sideB] = 0;
    styles.willChange = 'transform';
  } else {
    // othwerise, we use the standard `top`, `left`, `bottom` and `right` properties
    var invertTop = sideA === 'bottom' ? -1 : 1;
    var invertLeft = sideB === 'right' ? -1 : 1;
    styles[sideA] = top * invertTop;
    styles[sideB] = left * invertLeft;
    styles.willChange = sideA + ', ' + sideB;
  }

  // Attributes
  var attributes = {
    'x-placement': data.placement
  };

  // Update `data` attributes, styles and arrowStyles
  data.attributes = _extends({}, attributes, data.attributes);
  data.styles = _extends({}, styles, data.styles);
  data.arrowStyles = _extends({}, data.offsets.arrow, data.arrowStyles);

  return data;
}

/**
 * Helper used to know if the given modifier depends from another one.<br />
 * It checks if the needed modifier is listed and enabled.
 * @method
 * @memberof Popper.Utils
 * @param {Array} modifiers - list of modifiers
 * @param {String} requestingName - name of requesting modifier
 * @param {String} requestedName - name of requested modifier
 * @returns {Boolean}
 */
function isModifierRequired(modifiers, requestingName, requestedName) {
  var requesting = find(modifiers, function (_ref) {
    var name = _ref.name;
    return name === requestingName;
  });

  var isRequired = !!requesting && modifiers.some(function (modifier) {
    return modifier.name === requestedName && modifier.enabled && modifier.order < requesting.order;
  });

  if (!isRequired) {
    var _requesting = '`' + requestingName + '`';
    var requested = '`' + requestedName + '`';
    console.warn(requested + ' modifier is required by ' + _requesting + ' modifier in order to work, be sure to include it before ' + _requesting + '!');
  }
  return isRequired;
}

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by update method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function arrow(data, options) {
  var _data$offsets$arrow;

  // arrow depends on keepTogether in order to work
  if (!isModifierRequired(data.instance.modifiers, 'arrow', 'keepTogether')) {
    return data;
  }

  var arrowElement = options.element;

  // if arrowElement is a string, suppose it's a CSS selector
  if (typeof arrowElement === 'string') {
    arrowElement = data.instance.popper.querySelector(arrowElement);

    // if arrowElement is not found, don't run the modifier
    if (!arrowElement) {
      return data;
    }
  } else {
    // if the arrowElement isn't a query selector we must check that the
    // provided DOM node is child of its popper node
    if (!data.instance.popper.contains(arrowElement)) {
      console.warn('WARNING: `arrow.element` must be child of its popper element!');
      return data;
    }
  }

  var placement = data.placement.split('-')[0];
  var _data$offsets = data.offsets,
      popper = _data$offsets.popper,
      reference = _data$offsets.reference;

  var isVertical = ['left', 'right'].indexOf(placement) !== -1;

  var len = isVertical ? 'height' : 'width';
  var sideCapitalized = isVertical ? 'Top' : 'Left';
  var side = sideCapitalized.toLowerCase();
  var altSide = isVertical ? 'left' : 'top';
  var opSide = isVertical ? 'bottom' : 'right';
  var arrowElementSize = getOuterSizes(arrowElement)[len];

  //
  // extends keepTogether behavior making sure the popper and its
  // reference have enough pixels in conjuction
  //

  // top/left side
  if (reference[opSide] - arrowElementSize < popper[side]) {
    data.offsets.popper[side] -= popper[side] - (reference[opSide] - arrowElementSize);
  }
  // bottom/right side
  if (reference[side] + arrowElementSize > popper[opSide]) {
    data.offsets.popper[side] += reference[side] + arrowElementSize - popper[opSide];
  }
  data.offsets.popper = getClientRect(data.offsets.popper);

  // compute center of the popper
  var center = reference[side] + reference[len] / 2 - arrowElementSize / 2;

  // Compute the sideValue using the updated popper offsets
  // take popper margin in account because we don't have this info available
  var css = getStyleComputedProperty(data.instance.popper);
  var popperMarginSide = parseFloat(css['margin' + sideCapitalized], 10);
  var popperBorderSide = parseFloat(css['border' + sideCapitalized + 'Width'], 10);
  var sideValue = center - data.offsets.popper[side] - popperMarginSide - popperBorderSide;

  // prevent arrowElement from being placed not contiguously to its popper
  sideValue = Math.max(Math.min(popper[len] - arrowElementSize, sideValue), 0);

  data.arrowElement = arrowElement;
  data.offsets.arrow = (_data$offsets$arrow = {}, defineProperty(_data$offsets$arrow, side, Math.round(sideValue)), defineProperty(_data$offsets$arrow, altSide, ''), _data$offsets$arrow);

  return data;
}

/**
 * Get the opposite placement variation of the given one
 * @method
 * @memberof Popper.Utils
 * @argument {String} placement variation
 * @returns {String} flipped placement variation
 */
function getOppositeVariation(variation) {
  if (variation === 'end') {
    return 'start';
  } else if (variation === 'start') {
    return 'end';
  }
  return variation;
}

/**
 * List of accepted placements to use as values of the `placement` option.<br />
 * Valid placements are:
 * - `auto`
 * - `top`
 * - `right`
 * - `bottom`
 * - `left`
 *
 * Each placement can have a variation from this list:
 * - `-start`
 * - `-end`
 *
 * Variations are interpreted easily if you think of them as the left to right
 * written languages. Horizontally (`top` and `bottom`), `start` is left and `end`
 * is right.<br />
 * Vertically (`left` and `right`), `start` is top and `end` is bottom.
 *
 * Some valid examples are:
 * - `top-end` (on top of reference, right aligned)
 * - `right-start` (on right of reference, top aligned)
 * - `bottom` (on bottom, centered)
 * - `auto-right` (on the side with more space available, alignment depends by placement)
 *
 * @static
 * @type {Array}
 * @enum {String}
 * @readonly
 * @method placements
 * @memberof Popper
 */
var placements = ['auto-start', 'auto', 'auto-end', 'top-start', 'top', 'top-end', 'right-start', 'right', 'right-end', 'bottom-end', 'bottom', 'bottom-start', 'left-end', 'left', 'left-start'];

// Get rid of `auto` `auto-start` and `auto-end`
var validPlacements = placements.slice(3);

/**
 * Given an initial placement, returns all the subsequent placements
 * clockwise (or counter-clockwise).
 *
 * @method
 * @memberof Popper.Utils
 * @argument {String} placement - A valid placement (it accepts variations)
 * @argument {Boolean} counter - Set to true to walk the placements counterclockwise
 * @returns {Array} placements including their variations
 */
function clockwise(placement) {
  var counter = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

  var index = validPlacements.indexOf(placement);
  var arr = validPlacements.slice(index + 1).concat(validPlacements.slice(0, index));
  return counter ? arr.reverse() : arr;
}

var BEHAVIORS = {
  FLIP: 'flip',
  CLOCKWISE: 'clockwise',
  COUNTERCLOCKWISE: 'counterclockwise'
};

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by update method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function flip(data, options) {
  // if `inner` modifier is enabled, we can't use the `flip` modifier
  if (isModifierEnabled(data.instance.modifiers, 'inner')) {
    return data;
  }

  if (data.flipped && data.placement === data.originalPlacement) {
    // seems like flip is trying to loop, probably there's not enough space on any of the flippable sides
    return data;
  }

  var boundaries = getBoundaries(data.instance.popper, data.instance.reference, options.padding, options.boundariesElement, data.positionFixed);

  var placement = data.placement.split('-')[0];
  var placementOpposite = getOppositePlacement(placement);
  var variation = data.placement.split('-')[1] || '';

  var flipOrder = [];

  switch (options.behavior) {
    case BEHAVIORS.FLIP:
      flipOrder = [placement, placementOpposite];
      break;
    case BEHAVIORS.CLOCKWISE:
      flipOrder = clockwise(placement);
      break;
    case BEHAVIORS.COUNTERCLOCKWISE:
      flipOrder = clockwise(placement, true);
      break;
    default:
      flipOrder = options.behavior;
  }

  flipOrder.forEach(function (step, index) {
    if (placement !== step || flipOrder.length === index + 1) {
      return data;
    }

    placement = data.placement.split('-')[0];
    placementOpposite = getOppositePlacement(placement);

    var popperOffsets = data.offsets.popper;
    var refOffsets = data.offsets.reference;

    // using floor because the reference offsets may contain decimals we are not going to consider here
    var floor = Math.floor;
    var overlapsRef = placement === 'left' && floor(popperOffsets.right) > floor(refOffsets.left) || placement === 'right' && floor(popperOffsets.left) < floor(refOffsets.right) || placement === 'top' && floor(popperOffsets.bottom) > floor(refOffsets.top) || placement === 'bottom' && floor(popperOffsets.top) < floor(refOffsets.bottom);

    var overflowsLeft = floor(popperOffsets.left) < floor(boundaries.left);
    var overflowsRight = floor(popperOffsets.right) > floor(boundaries.right);
    var overflowsTop = floor(popperOffsets.top) < floor(boundaries.top);
    var overflowsBottom = floor(popperOffsets.bottom) > floor(boundaries.bottom);

    var overflowsBoundaries = placement === 'left' && overflowsLeft || placement === 'right' && overflowsRight || placement === 'top' && overflowsTop || placement === 'bottom' && overflowsBottom;

    // flip the variation if required
    var isVertical = ['top', 'bottom'].indexOf(placement) !== -1;
    var flippedVariation = !!options.flipVariations && (isVertical && variation === 'start' && overflowsLeft || isVertical && variation === 'end' && overflowsRight || !isVertical && variation === 'start' && overflowsTop || !isVertical && variation === 'end' && overflowsBottom);

    if (overlapsRef || overflowsBoundaries || flippedVariation) {
      // this boolean to detect any flip loop
      data.flipped = true;

      if (overlapsRef || overflowsBoundaries) {
        placement = flipOrder[index + 1];
      }

      if (flippedVariation) {
        variation = getOppositeVariation(variation);
      }

      data.placement = placement + (variation ? '-' + variation : '');

      // this object contains `position`, we want to preserve it along with
      // any additional property we may add in the future
      data.offsets.popper = _extends({}, data.offsets.popper, getPopperOffsets(data.instance.popper, data.offsets.reference, data.placement));

      data = runModifiers(data.instance.modifiers, data, 'flip');
    }
  });
  return data;
}

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by update method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function keepTogether(data) {
  var _data$offsets = data.offsets,
      popper = _data$offsets.popper,
      reference = _data$offsets.reference;

  var placement = data.placement.split('-')[0];
  var floor = Math.floor;
  var isVertical = ['top', 'bottom'].indexOf(placement) !== -1;
  var side = isVertical ? 'right' : 'bottom';
  var opSide = isVertical ? 'left' : 'top';
  var measurement = isVertical ? 'width' : 'height';

  if (popper[side] < floor(reference[opSide])) {
    data.offsets.popper[opSide] = floor(reference[opSide]) - popper[measurement];
  }
  if (popper[opSide] > floor(reference[side])) {
    data.offsets.popper[opSide] = floor(reference[side]);
  }

  return data;
}

/**
 * Converts a string containing value + unit into a px value number
 * @function
 * @memberof {modifiers~offset}
 * @private
 * @argument {String} str - Value + unit string
 * @argument {String} measurement - `height` or `width`
 * @argument {Object} popperOffsets
 * @argument {Object} referenceOffsets
 * @returns {Number|String}
 * Value in pixels, or original string if no values were extracted
 */
function toValue(str, measurement, popperOffsets, referenceOffsets) {
  // separate value from unit
  var split = str.match(/((?:\-|\+)?\d*\.?\d*)(.*)/);
  var value = +split[1];
  var unit = split[2];

  // If it's not a number it's an operator, I guess
  if (!value) {
    return str;
  }

  if (unit.indexOf('%') === 0) {
    var element = void 0;
    switch (unit) {
      case '%p':
        element = popperOffsets;
        break;
      case '%':
      case '%r':
      default:
        element = referenceOffsets;
    }

    var rect = getClientRect(element);
    return rect[measurement] / 100 * value;
  } else if (unit === 'vh' || unit === 'vw') {
    // if is a vh or vw, we calculate the size based on the viewport
    var size = void 0;
    if (unit === 'vh') {
      size = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
    } else {
      size = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    }
    return size / 100 * value;
  } else {
    // if is an explicit pixel unit, we get rid of the unit and keep the value
    // if is an implicit unit, it's px, and we return just the value
    return value;
  }
}

/**
 * Parse an `offset` string to extrapolate `x` and `y` numeric offsets.
 * @function
 * @memberof {modifiers~offset}
 * @private
 * @argument {String} offset
 * @argument {Object} popperOffsets
 * @argument {Object} referenceOffsets
 * @argument {String} basePlacement
 * @returns {Array} a two cells array with x and y offsets in numbers
 */
function parseOffset(offset, popperOffsets, referenceOffsets, basePlacement) {
  var offsets = [0, 0];

  // Use height if placement is left or right and index is 0 otherwise use width
  // in this way the first offset will use an axis and the second one
  // will use the other one
  var useHeight = ['right', 'left'].indexOf(basePlacement) !== -1;

  // Split the offset string to obtain a list of values and operands
  // The regex addresses values with the plus or minus sign in front (+10, -20, etc)
  var fragments = offset.split(/(\+|\-)/).map(function (frag) {
    return frag.trim();
  });

  // Detect if the offset string contains a pair of values or a single one
  // they could be separated by comma or space
  var divider = fragments.indexOf(find(fragments, function (frag) {
    return frag.search(/,|\s/) !== -1;
  }));

  if (fragments[divider] && fragments[divider].indexOf(',') === -1) {
    console.warn('Offsets separated by white space(s) are deprecated, use a comma (,) instead.');
  }

  // If divider is found, we divide the list of values and operands to divide
  // them by ofset X and Y.
  var splitRegex = /\s*,\s*|\s+/;
  var ops = divider !== -1 ? [fragments.slice(0, divider).concat([fragments[divider].split(splitRegex)[0]]), [fragments[divider].split(splitRegex)[1]].concat(fragments.slice(divider + 1))] : [fragments];

  // Convert the values with units to absolute pixels to allow our computations
  ops = ops.map(function (op, index) {
    // Most of the units rely on the orientation of the popper
    var measurement = (index === 1 ? !useHeight : useHeight) ? 'height' : 'width';
    var mergeWithPrevious = false;
    return op
    // This aggregates any `+` or `-` sign that aren't considered operators
    // e.g.: 10 + +5 => [10, +, +5]
    .reduce(function (a, b) {
      if (a[a.length - 1] === '' && ['+', '-'].indexOf(b) !== -1) {
        a[a.length - 1] = b;
        mergeWithPrevious = true;
        return a;
      } else if (mergeWithPrevious) {
        a[a.length - 1] += b;
        mergeWithPrevious = false;
        return a;
      } else {
        return a.concat(b);
      }
    }, [])
    // Here we convert the string values into number values (in px)
    .map(function (str) {
      return toValue(str, measurement, popperOffsets, referenceOffsets);
    });
  });

  // Loop trough the offsets arrays and execute the operations
  ops.forEach(function (op, index) {
    op.forEach(function (frag, index2) {
      if (isNumeric(frag)) {
        offsets[index] += frag * (op[index2 - 1] === '-' ? -1 : 1);
      }
    });
  });
  return offsets;
}

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by update method
 * @argument {Object} options - Modifiers configuration and options
 * @argument {Number|String} options.offset=0
 * The offset value as described in the modifier description
 * @returns {Object} The data object, properly modified
 */
function offset(data, _ref) {
  var offset = _ref.offset;
  var placement = data.placement,
      _data$offsets = data.offsets,
      popper = _data$offsets.popper,
      reference = _data$offsets.reference;

  var basePlacement = placement.split('-')[0];

  var offsets = void 0;
  if (isNumeric(+offset)) {
    offsets = [+offset, 0];
  } else {
    offsets = parseOffset(offset, popper, reference, basePlacement);
  }

  if (basePlacement === 'left') {
    popper.top += offsets[0];
    popper.left -= offsets[1];
  } else if (basePlacement === 'right') {
    popper.top += offsets[0];
    popper.left += offsets[1];
  } else if (basePlacement === 'top') {
    popper.left += offsets[0];
    popper.top -= offsets[1];
  } else if (basePlacement === 'bottom') {
    popper.left += offsets[0];
    popper.top += offsets[1];
  }

  data.popper = popper;
  return data;
}

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by `update` method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function preventOverflow(data, options) {
  var boundariesElement = options.boundariesElement || getOffsetParent(data.instance.popper);

  // If offsetParent is the reference element, we really want to
  // go one step up and use the next offsetParent as reference to
  // avoid to make this modifier completely useless and look like broken
  if (data.instance.reference === boundariesElement) {
    boundariesElement = getOffsetParent(boundariesElement);
  }

  // NOTE: DOM access here
  // resets the popper's position so that the document size can be calculated excluding
  // the size of the popper element itself
  var transformProp = getSupportedPropertyName('transform');
  var popperStyles = data.instance.popper.style; // assignment to help minification
  var top = popperStyles.top,
      left = popperStyles.left,
      transform = popperStyles[transformProp];

  popperStyles.top = '';
  popperStyles.left = '';
  popperStyles[transformProp] = '';

  var boundaries = getBoundaries(data.instance.popper, data.instance.reference, options.padding, boundariesElement, data.positionFixed);

  // NOTE: DOM access here
  // restores the original style properties after the offsets have been computed
  popperStyles.top = top;
  popperStyles.left = left;
  popperStyles[transformProp] = transform;

  options.boundaries = boundaries;

  var order = options.priority;
  var popper = data.offsets.popper;

  var check = {
    primary: function primary(placement) {
      var value = popper[placement];
      if (popper[placement] < boundaries[placement] && !options.escapeWithReference) {
        value = Math.max(popper[placement], boundaries[placement]);
      }
      return defineProperty({}, placement, value);
    },
    secondary: function secondary(placement) {
      var mainSide = placement === 'right' ? 'left' : 'top';
      var value = popper[mainSide];
      if (popper[placement] > boundaries[placement] && !options.escapeWithReference) {
        value = Math.min(popper[mainSide], boundaries[placement] - (placement === 'right' ? popper.width : popper.height));
      }
      return defineProperty({}, mainSide, value);
    }
  };

  order.forEach(function (placement) {
    var side = ['left', 'top'].indexOf(placement) !== -1 ? 'primary' : 'secondary';
    popper = _extends({}, popper, check[side](placement));
  });

  data.offsets.popper = popper;

  return data;
}

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by `update` method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function shift(data) {
  var placement = data.placement;
  var basePlacement = placement.split('-')[0];
  var shiftvariation = placement.split('-')[1];

  // if shift shiftvariation is specified, run the modifier
  if (shiftvariation) {
    var _data$offsets = data.offsets,
        reference = _data$offsets.reference,
        popper = _data$offsets.popper;

    var isVertical = ['bottom', 'top'].indexOf(basePlacement) !== -1;
    var side = isVertical ? 'left' : 'top';
    var measurement = isVertical ? 'width' : 'height';

    var shiftOffsets = {
      start: defineProperty({}, side, reference[side]),
      end: defineProperty({}, side, reference[side] + reference[measurement] - popper[measurement])
    };

    data.offsets.popper = _extends({}, popper, shiftOffsets[shiftvariation]);
  }

  return data;
}

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by update method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function hide(data) {
  if (!isModifierRequired(data.instance.modifiers, 'hide', 'preventOverflow')) {
    return data;
  }

  var refRect = data.offsets.reference;
  var bound = find(data.instance.modifiers, function (modifier) {
    return modifier.name === 'preventOverflow';
  }).boundaries;

  if (refRect.bottom < bound.top || refRect.left > bound.right || refRect.top > bound.bottom || refRect.right < bound.left) {
    // Avoid unnecessary DOM access if visibility hasn't changed
    if (data.hide === true) {
      return data;
    }

    data.hide = true;
    data.attributes['x-out-of-boundaries'] = '';
  } else {
    // Avoid unnecessary DOM access if visibility hasn't changed
    if (data.hide === false) {
      return data;
    }

    data.hide = false;
    data.attributes['x-out-of-boundaries'] = false;
  }

  return data;
}

/**
 * @function
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by `update` method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function inner(data) {
  var placement = data.placement;
  var basePlacement = placement.split('-')[0];
  var _data$offsets = data.offsets,
      popper = _data$offsets.popper,
      reference = _data$offsets.reference;

  var isHoriz = ['left', 'right'].indexOf(basePlacement) !== -1;

  var subtractLength = ['top', 'left'].indexOf(basePlacement) === -1;

  popper[isHoriz ? 'left' : 'top'] = reference[basePlacement] - (subtractLength ? popper[isHoriz ? 'width' : 'height'] : 0);

  data.placement = getOppositePlacement(placement);
  data.offsets.popper = getClientRect(popper);

  return data;
}

/**
 * Modifier function, each modifier can have a function of this type assigned
 * to its `fn` property.<br />
 * These functions will be called on each update, this means that you must
 * make sure they are performant enough to avoid performance bottlenecks.
 *
 * @function ModifierFn
 * @argument {dataObject} data - The data object generated by `update` method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {dataObject} The data object, properly modified
 */

/**
 * Modifiers are plugins used to alter the behavior of your poppers.<br />
 * Popper.js uses a set of 9 modifiers to provide all the basic functionalities
 * needed by the library.
 *
 * Usually you don't want to override the `order`, `fn` and `onLoad` props.
 * All the other properties are configurations that could be tweaked.
 * @namespace modifiers
 */
var modifiers = {
  /**
   * Modifier used to shift the popper on the start or end of its reference
   * element.<br />
   * It will read the variation of the `placement` property.<br />
   * It can be one either `-end` or `-start`.
   * @memberof modifiers
   * @inner
   */
  shift: {
    /** @prop {number} order=100 - Index used to define the order of execution */
    order: 100,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: true,
    /** @prop {ModifierFn} */
    fn: shift
  },

  /**
   * The `offset` modifier can shift your popper on both its axis.
   *
   * It accepts the following units:
   * - `px` or unitless, interpreted as pixels
   * - `%` or `%r`, percentage relative to the length of the reference element
   * - `%p`, percentage relative to the length of the popper element
   * - `vw`, CSS viewport width unit
   * - `vh`, CSS viewport height unit
   *
   * For length is intended the main axis relative to the placement of the popper.<br />
   * This means that if the placement is `top` or `bottom`, the length will be the
   * `width`. In case of `left` or `right`, it will be the height.
   *
   * You can provide a single value (as `Number` or `String`), or a pair of values
   * as `String` divided by a comma or one (or more) white spaces.<br />
   * The latter is a deprecated method because it leads to confusion and will be
   * removed in v2.<br />
   * Additionally, it accepts additions and subtractions between different units.
   * Note that multiplications and divisions aren't supported.
   *
   * Valid examples are:
   * ```
   * 10
   * '10%'
   * '10, 10'
   * '10%, 10'
   * '10 + 10%'
   * '10 - 5vh + 3%'
   * '-10px + 5vh, 5px - 6%'
   * ```
   * > **NB**: If you desire to apply offsets to your poppers in a way that may make them overlap
   * > with their reference element, unfortunately, you will have to disable the `flip` modifier.
   * > More on this [reading this issue](https://github.com/FezVrasta/popper.js/issues/373)
   *
   * @memberof modifiers
   * @inner
   */
  offset: {
    /** @prop {number} order=200 - Index used to define the order of execution */
    order: 200,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: true,
    /** @prop {ModifierFn} */
    fn: offset,
    /** @prop {Number|String} offset=0
     * The offset value as described in the modifier description
     */
    offset: 0
  },

  /**
   * Modifier used to prevent the popper from being positioned outside the boundary.
   *
   * An scenario exists where the reference itself is not within the boundaries.<br />
   * We can say it has "escaped the boundaries" — or just "escaped".<br />
   * In this case we need to decide whether the popper should either:
   *
   * - detach from the reference and remain "trapped" in the boundaries, or
   * - if it should ignore the boundary and "escape with its reference"
   *
   * When `escapeWithReference` is set to`true` and reference is completely
   * outside its boundaries, the popper will overflow (or completely leave)
   * the boundaries in order to remain attached to the edge of the reference.
   *
   * @memberof modifiers
   * @inner
   */
  preventOverflow: {
    /** @prop {number} order=300 - Index used to define the order of execution */
    order: 300,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: true,
    /** @prop {ModifierFn} */
    fn: preventOverflow,
    /**
     * @prop {Array} [priority=['left','right','top','bottom']]
     * Popper will try to prevent overflow following these priorities by default,
     * then, it could overflow on the left and on top of the `boundariesElement`
     */
    priority: ['left', 'right', 'top', 'bottom'],
    /**
     * @prop {number} padding=5
     * Amount of pixel used to define a minimum distance between the boundaries
     * and the popper this makes sure the popper has always a little padding
     * between the edges of its container
     */
    padding: 5,
    /**
     * @prop {String|HTMLElement} boundariesElement='scrollParent'
     * Boundaries used by the modifier, can be `scrollParent`, `window`,
     * `viewport` or any DOM element.
     */
    boundariesElement: 'scrollParent'
  },

  /**
   * Modifier used to make sure the reference and its popper stay near eachothers
   * without leaving any gap between the two. Expecially useful when the arrow is
   * enabled and you want to assure it to point to its reference element.
   * It cares only about the first axis, you can still have poppers with margin
   * between the popper and its reference element.
   * @memberof modifiers
   * @inner
   */
  keepTogether: {
    /** @prop {number} order=400 - Index used to define the order of execution */
    order: 400,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: true,
    /** @prop {ModifierFn} */
    fn: keepTogether
  },

  /**
   * This modifier is used to move the `arrowElement` of the popper to make
   * sure it is positioned between the reference element and its popper element.
   * It will read the outer size of the `arrowElement` node to detect how many
   * pixels of conjuction are needed.
   *
   * It has no effect if no `arrowElement` is provided.
   * @memberof modifiers
   * @inner
   */
  arrow: {
    /** @prop {number} order=500 - Index used to define the order of execution */
    order: 500,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: true,
    /** @prop {ModifierFn} */
    fn: arrow,
    /** @prop {String|HTMLElement} element='[x-arrow]' - Selector or node used as arrow */
    element: '[x-arrow]'
  },

  /**
   * Modifier used to flip the popper's placement when it starts to overlap its
   * reference element.
   *
   * Requires the `preventOverflow` modifier before it in order to work.
   *
   * **NOTE:** this modifier will interrupt the current update cycle and will
   * restart it if it detects the need to flip the placement.
   * @memberof modifiers
   * @inner
   */
  flip: {
    /** @prop {number} order=600 - Index used to define the order of execution */
    order: 600,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: true,
    /** @prop {ModifierFn} */
    fn: flip,
    /**
     * @prop {String|Array} behavior='flip'
     * The behavior used to change the popper's placement. It can be one of
     * `flip`, `clockwise`, `counterclockwise` or an array with a list of valid
     * placements (with optional variations).
     */
    behavior: 'flip',
    /**
     * @prop {number} padding=5
     * The popper will flip if it hits the edges of the `boundariesElement`
     */
    padding: 5,
    /**
     * @prop {String|HTMLElement} boundariesElement='viewport'
     * The element which will define the boundaries of the popper position,
     * the popper will never be placed outside of the defined boundaries
     * (except if keepTogether is enabled)
     */
    boundariesElement: 'viewport'
  },

  /**
   * Modifier used to make the popper flow toward the inner of the reference element.
   * By default, when this modifier is disabled, the popper will be placed outside
   * the reference element.
   * @memberof modifiers
   * @inner
   */
  inner: {
    /** @prop {number} order=700 - Index used to define the order of execution */
    order: 700,
    /** @prop {Boolean} enabled=false - Whether the modifier is enabled or not */
    enabled: false,
    /** @prop {ModifierFn} */
    fn: inner
  },

  /**
   * Modifier used to hide the popper when its reference element is outside of the
   * popper boundaries. It will set a `x-out-of-boundaries` attribute which can
   * be used to hide with a CSS selector the popper when its reference is
   * out of boundaries.
   *
   * Requires the `preventOverflow` modifier before it in order to work.
   * @memberof modifiers
   * @inner
   */
  hide: {
    /** @prop {number} order=800 - Index used to define the order of execution */
    order: 800,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: true,
    /** @prop {ModifierFn} */
    fn: hide
  },

  /**
   * Computes the style that will be applied to the popper element to gets
   * properly positioned.
   *
   * Note that this modifier will not touch the DOM, it just prepares the styles
   * so that `applyStyle` modifier can apply it. This separation is useful
   * in case you need to replace `applyStyle` with a custom implementation.
   *
   * This modifier has `850` as `order` value to maintain backward compatibility
   * with previous versions of Popper.js. Expect the modifiers ordering method
   * to change in future major versions of the library.
   *
   * @memberof modifiers
   * @inner
   */
  computeStyle: {
    /** @prop {number} order=850 - Index used to define the order of execution */
    order: 850,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: true,
    /** @prop {ModifierFn} */
    fn: computeStyle,
    /**
     * @prop {Boolean} gpuAcceleration=true
     * If true, it uses the CSS 3d transformation to position the popper.
     * Otherwise, it will use the `top` and `left` properties.
     */
    gpuAcceleration: true,
    /**
     * @prop {string} [x='bottom']
     * Where to anchor the X axis (`bottom` or `top`). AKA X offset origin.
     * Change this if your popper should grow in a direction different from `bottom`
     */
    x: 'bottom',
    /**
     * @prop {string} [x='left']
     * Where to anchor the Y axis (`left` or `right`). AKA Y offset origin.
     * Change this if your popper should grow in a direction different from `right`
     */
    y: 'right'
  },

  /**
   * Applies the computed styles to the popper element.
   *
   * All the DOM manipulations are limited to this modifier. This is useful in case
   * you want to integrate Popper.js inside a framework or view library and you
   * want to delegate all the DOM manipulations to it.
   *
   * Note that if you disable this modifier, you must make sure the popper element
   * has its position set to `absolute` before Popper.js can do its work!
   *
   * Just disable this modifier and define you own to achieve the desired effect.
   *
   * @memberof modifiers
   * @inner
   */
  applyStyle: {
    /** @prop {number} order=900 - Index used to define the order of execution */
    order: 900,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: true,
    /** @prop {ModifierFn} */
    fn: applyStyle,
    /** @prop {Function} */
    onLoad: applyStyleOnLoad,
    /**
     * @deprecated since version 1.10.0, the property moved to `computeStyle` modifier
     * @prop {Boolean} gpuAcceleration=true
     * If true, it uses the CSS 3d transformation to position the popper.
     * Otherwise, it will use the `top` and `left` properties.
     */
    gpuAcceleration: undefined
  }
};

/**
 * The `dataObject` is an object containing all the informations used by Popper.js
 * this object get passed to modifiers and to the `onCreate` and `onUpdate` callbacks.
 * @name dataObject
 * @property {Object} data.instance The Popper.js instance
 * @property {String} data.placement Placement applied to popper
 * @property {String} data.originalPlacement Placement originally defined on init
 * @property {Boolean} data.flipped True if popper has been flipped by flip modifier
 * @property {Boolean} data.hide True if the reference element is out of boundaries, useful to know when to hide the popper.
 * @property {HTMLElement} data.arrowElement Node used as arrow by arrow modifier
 * @property {Object} data.styles Any CSS property defined here will be applied to the popper, it expects the JavaScript nomenclature (eg. `marginBottom`)
 * @property {Object} data.arrowStyles Any CSS property defined here will be applied to the popper arrow, it expects the JavaScript nomenclature (eg. `marginBottom`)
 * @property {Object} data.boundaries Offsets of the popper boundaries
 * @property {Object} data.offsets The measurements of popper, reference and arrow elements.
 * @property {Object} data.offsets.popper `top`, `left`, `width`, `height` values
 * @property {Object} data.offsets.reference `top`, `left`, `width`, `height` values
 * @property {Object} data.offsets.arrow] `top` and `left` offsets, only one of them will be different from 0
 */

/**
 * Default options provided to Popper.js constructor.<br />
 * These can be overriden using the `options` argument of Popper.js.<br />
 * To override an option, simply pass as 3rd argument an object with the same
 * structure of this object, example:
 * ```
 * new Popper(ref, pop, {
 *   modifiers: {
 *     preventOverflow: { enabled: false }
 *   }
 * })
 * ```
 * @type {Object}
 * @static
 * @memberof Popper
 */
var Defaults = {
  /**
   * Popper's placement
   * @prop {Popper.placements} placement='bottom'
   */
  placement: 'bottom',

  /**
   * Set this to true if you want popper to position it self in 'fixed' mode
   * @prop {Boolean} positionFixed=false
   */
  positionFixed: false,

  /**
   * Whether events (resize, scroll) are initially enabled
   * @prop {Boolean} eventsEnabled=true
   */
  eventsEnabled: true,

  /**
   * Set to true if you want to automatically remove the popper when
   * you call the `destroy` method.
   * @prop {Boolean} removeOnDestroy=false
   */
  removeOnDestroy: false,

  /**
   * Callback called when the popper is created.<br />
   * By default, is set to no-op.<br />
   * Access Popper.js instance with `data.instance`.
   * @prop {onCreate}
   */
  onCreate: function onCreate() {},

  /**
   * Callback called when the popper is updated, this callback is not called
   * on the initialization/creation of the popper, but only on subsequent
   * updates.<br />
   * By default, is set to no-op.<br />
   * Access Popper.js instance with `data.instance`.
   * @prop {onUpdate}
   */
  onUpdate: function onUpdate() {},

  /**
   * List of modifiers used to modify the offsets before they are applied to the popper.
   * They provide most of the functionalities of Popper.js
   * @prop {modifiers}
   */
  modifiers: modifiers
};

/**
 * @callback onCreate
 * @param {dataObject} data
 */

/**
 * @callback onUpdate
 * @param {dataObject} data
 */

// Utils
// Methods
var Popper = function () {
  /**
   * Create a new Popper.js instance
   * @class Popper
   * @param {HTMLElement|referenceObject} reference - The reference element used to position the popper
   * @param {HTMLElement} popper - The HTML element used as popper.
   * @param {Object} options - Your custom options to override the ones defined in [Defaults](#defaults)
   * @return {Object} instance - The generated Popper.js instance
   */
  function Popper(reference, popper) {
    var _this = this;

    var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
    classCallCheck(this, Popper);

    this.scheduleUpdate = function () {
      return requestAnimationFrame(_this.update);
    };

    // make update() debounced, so that it only runs at most once-per-tick
    this.update = debounce(this.update.bind(this));

    // with {} we create a new object with the options inside it
    this.options = _extends({}, Popper.Defaults, options);

    // init state
    this.state = {
      isDestroyed: false,
      isCreated: false,
      scrollParents: []
    };

    // get reference and popper elements (allow jQuery wrappers)
    this.reference = reference && reference.jquery ? reference[0] : reference;
    this.popper = popper && popper.jquery ? popper[0] : popper;

    // Deep merge modifiers options
    this.options.modifiers = {};
    Object.keys(_extends({}, Popper.Defaults.modifiers, options.modifiers)).forEach(function (name) {
      _this.options.modifiers[name] = _extends({}, Popper.Defaults.modifiers[name] || {}, options.modifiers ? options.modifiers[name] : {});
    });

    // Refactoring modifiers' list (Object => Array)
    this.modifiers = Object.keys(this.options.modifiers).map(function (name) {
      return _extends({
        name: name
      }, _this.options.modifiers[name]);
    })
    // sort the modifiers by order
    .sort(function (a, b) {
      return a.order - b.order;
    });

    // modifiers have the ability to execute arbitrary code when Popper.js get inited
    // such code is executed in the same order of its modifier
    // they could add new properties to their options configuration
    // BE AWARE: don't add options to `options.modifiers.name` but to `modifierOptions`!
    this.modifiers.forEach(function (modifierOptions) {
      if (modifierOptions.enabled && isFunction(modifierOptions.onLoad)) {
        modifierOptions.onLoad(_this.reference, _this.popper, _this.options, modifierOptions, _this.state);
      }
    });

    // fire the first update to position the popper in the right place
    this.update();

    var eventsEnabled = this.options.eventsEnabled;
    if (eventsEnabled) {
      // setup event listeners, they will take care of update the position in specific situations
      this.enableEventListeners();
    }

    this.state.eventsEnabled = eventsEnabled;
  }

  // We can't use class properties because they don't get listed in the
  // class prototype and break stuff like Sinon stubs


  createClass(Popper, [{
    key: 'update',
    value: function update$$1() {
      return update.call(this);
    }
  }, {
    key: 'destroy',
    value: function destroy$$1() {
      return destroy.call(this);
    }
  }, {
    key: 'enableEventListeners',
    value: function enableEventListeners$$1() {
      return enableEventListeners.call(this);
    }
  }, {
    key: 'disableEventListeners',
    value: function disableEventListeners$$1() {
      return disableEventListeners.call(this);
    }

    /**
     * Schedule an update, it will run on the next UI update available
     * @method scheduleUpdate
     * @memberof Popper
     */


    /**
     * Collection of utilities useful when writing custom modifiers.
     * Starting from version 1.7, this method is available only if you
     * include `popper-utils.js` before `popper.js`.
     *
     * **DEPRECATION**: This way to access PopperUtils is deprecated
     * and will be removed in v2! Use the PopperUtils module directly instead.
     * Due to the high instability of the methods contained in Utils, we can't
     * guarantee them to follow semver. Use them at your own risk!
     * @static
     * @private
     * @type {Object}
     * @deprecated since version 1.8
     * @member Utils
     * @memberof Popper
     */

  }]);
  return Popper;
}();

/**
 * The `referenceObject` is an object that provides an interface compatible with Popper.js
 * and lets you use it as replacement of a real DOM node.<br />
 * You can use this method to position a popper relatively to a set of coordinates
 * in case you don't have a DOM node to use as reference.
 *
 * ```
 * new Popper(referenceObject, popperNode);
 * ```
 *
 * NB: This feature isn't supported in Internet Explorer 10
 * @name referenceObject
 * @property {Function} data.getBoundingClientRect
 * A function that returns a set of coordinates compatible with the native `getBoundingClientRect` method.
 * @property {number} data.clientWidth
 * An ES6 getter that will return the width of the virtual reference element.
 * @property {number} data.clientHeight
 * An ES6 getter that will return the height of the virtual reference element.
 */


Popper.Utils = (typeof window !== 'undefined' ? window : global).PopperUtils;
Popper.placements = placements;
Popper.Defaults = Defaults;

return Popper;

})));
//# sourceMappingURL=popper.js.map

/*!
  * Bootstrap v4.3.1 (https://getbootstrap.com/)
  * Copyright 2011-2019 The Bootstrap Authors (https://github.com/twbs/bootstrap/graphs/contributors)
  * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
  */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('jquery'), require('popper.js')) :
  typeof define === 'function' && define.amd ? define(['exports', 'jquery', 'popper.js'], factory) :
  (global = global || self, factory(global.bootstrap = {}, global.jQuery, global.Popper));
}(this, function (exports, $, Popper) { 'use strict';

  $ = $ && $.hasOwnProperty('default') ? $['default'] : $;
  Popper = Popper && Popper.hasOwnProperty('default') ? Popper['default'] : Popper;

  function _defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  function _createClass(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    return Constructor;
  }

  function _defineProperty(obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }

    return obj;
  }

  function _objectSpread(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i] != null ? arguments[i] : {};
      var ownKeys = Object.keys(source);

      if (typeof Object.getOwnPropertySymbols === 'function') {
        ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) {
          return Object.getOwnPropertyDescriptor(source, sym).enumerable;
        }));
      }

      ownKeys.forEach(function (key) {
        _defineProperty(target, key, source[key]);
      });
    }

    return target;
  }

  function _inheritsLoose(subClass, superClass) {
    subClass.prototype = Object.create(superClass.prototype);
    subClass.prototype.constructor = subClass;
    subClass.__proto__ = superClass;
  }

  /**
   * --------------------------------------------------------------------------
   * Bootstrap (v4.3.1): util.js
   * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
   * --------------------------------------------------------------------------
   */
  /**
   * ------------------------------------------------------------------------
   * Private TransitionEnd Helpers
   * ------------------------------------------------------------------------
   */

  var TRANSITION_END = 'transitionend';
  var MAX_UID = 1000000;
  var MILLISECONDS_MULTIPLIER = 1000; // Shoutout AngusCroll (https://goo.gl/pxwQGp)

  function toType(obj) {
    return {}.toString.call(obj).match(/\s([a-z]+)/i)[1].toLowerCase();
  }

  function getSpecialTransitionEndEvent() {
    return {
      bindType: TRANSITION_END,
      delegateType: TRANSITION_END,
      handle: function handle(event) {
        if ($(event.target).is(this)) {
          return event.handleObj.handler.apply(this, arguments); // eslint-disable-line prefer-rest-params
        }

        return undefined; // eslint-disable-line no-undefined
      }
    };
  }

  function transitionEndEmulator(duration) {
    var _this = this;

    var called = false;
    $(this).one(Util.TRANSITION_END, function () {
      called = true;
    });
    setTimeout(function () {
      if (!called) {
        Util.triggerTransitionEnd(_this);
      }
    }, duration);
    return this;
  }

  function setTransitionEndSupport() {
    $.fn.emulateTransitionEnd = transitionEndEmulator;
    $.event.special[Util.TRANSITION_END] = getSpecialTransitionEndEvent();
  }
  /**
   * --------------------------------------------------------------------------
   * Public Util Api
   * --------------------------------------------------------------------------
   */


  var Util = {
    TRANSITION_END: 'bsTransitionEnd',
    getUID: function getUID(prefix) {
      do {
        // eslint-disable-next-line no-bitwise
        prefix += ~~(Math.random() * MAX_UID); // "~~" acts like a faster Math.floor() here
      } while (document.getElementById(prefix));

      return prefix;
    },
    getSelectorFromElement: function getSelectorFromElement(element) {
      var selector = element.getAttribute('data-target');

      if (!selector || selector === '#') {
        var hrefAttr = element.getAttribute('href');
        selector = hrefAttr && hrefAttr !== '#' ? hrefAttr.trim() : '';
      }

      try {
        return document.querySelector(selector) ? selector : null;
      } catch (err) {
        return null;
      }
    },
    getTransitionDurationFromElement: function getTransitionDurationFromElement(element) {
      if (!element) {
        return 0;
      } // Get transition-duration of the element


      var transitionDuration = $(element).css('transition-duration');
      var transitionDelay = $(element).css('transition-delay');
      var floatTransitionDuration = parseFloat(transitionDuration);
      var floatTransitionDelay = parseFloat(transitionDelay); // Return 0 if element or transition duration is not found

      if (!floatTransitionDuration && !floatTransitionDelay) {
        return 0;
      } // If multiple durations are defined, take the first


      transitionDuration = transitionDuration.split(',')[0];
      transitionDelay = transitionDelay.split(',')[0];
      return (parseFloat(transitionDuration) + parseFloat(transitionDelay)) * MILLISECONDS_MULTIPLIER;
    },
    reflow: function reflow(element) {
      return element.offsetHeight;
    },
    triggerTransitionEnd: function triggerTransitionEnd(element) {
      $(element).trigger(TRANSITION_END);
    },
    // TODO: Remove in v5
    supportsTransitionEnd: function supportsTransitionEnd() {
      return Boolean(TRANSITION_END);
    },
    isElement: function isElement(obj) {
      return (obj[0] || obj).nodeType;
    },
    typeCheckConfig: function typeCheckConfig(componentName, config, configTypes) {
      for (var property in configTypes) {
        if (Object.prototype.hasOwnProperty.call(configTypes, property)) {
          var expectedTypes = configTypes[property];
          var value = config[property];
          var valueType = value && Util.isElement(value) ? 'element' : toType(value);

          if (!new RegExp(expectedTypes).test(valueType)) {
            throw new Error(componentName.toUpperCase() + ": " + ("Option \"" + property + "\" provided type \"" + valueType + "\" ") + ("but expected type \"" + expectedTypes + "\"."));
          }
        }
      }
    },
    findShadowRoot: function findShadowRoot(element) {
      if (!document.documentElement.attachShadow) {
        return null;
      } // Can find the shadow root otherwise it'll return the document


      if (typeof element.getRootNode === 'function') {
        var root = element.getRootNode();
        return root instanceof ShadowRoot ? root : null;
      }

      if (element instanceof ShadowRoot) {
        return element;
      } // when we don't find a shadow root


      if (!element.parentNode) {
        return null;
      }

      return Util.findShadowRoot(element.parentNode);
    }
  };
  setTransitionEndSupport();

  /**
   * ------------------------------------------------------------------------
   * Constants
   * ------------------------------------------------------------------------
   */

  var NAME = 'alert';
  var VERSION = '4.3.1';
  var DATA_KEY = 'bs.alert';
  var EVENT_KEY = "." + DATA_KEY;
  var DATA_API_KEY = '.data-api';
  var JQUERY_NO_CONFLICT = $.fn[NAME];
  var Selector = {
    DISMISS: '[data-dismiss="alert"]'
  };
  var Event = {
    CLOSE: "close" + EVENT_KEY,
    CLOSED: "closed" + EVENT_KEY,
    CLICK_DATA_API: "click" + EVENT_KEY + DATA_API_KEY
  };
  var ClassName = {
    ALERT: 'alert',
    FADE: 'fade',
    SHOW: 'show'
    /**
     * ------------------------------------------------------------------------
     * Class Definition
     * ------------------------------------------------------------------------
     */

  };

  var Alert =
  /*#__PURE__*/
  function () {
    function Alert(element) {
      this._element = element;
    } // Getters


    var _proto = Alert.prototype;

    // Public
    _proto.close = function close(element) {
      var rootElement = this._element;

      if (element) {
        rootElement = this._getRootElement(element);
      }

      var customEvent = this._triggerCloseEvent(rootElement);

      if (customEvent.isDefaultPrevented()) {
        return;
      }

      this._removeElement(rootElement);
    };

    _proto.dispose = function dispose() {
      $.removeData(this._element, DATA_KEY);
      this._element = null;
    } // Private
    ;

    _proto._getRootElement = function _getRootElement(element) {
      var selector = Util.getSelectorFromElement(element);
      var parent = false;

      if (selector) {
        parent = document.querySelector(selector);
      }

      if (!parent) {
        parent = $(element).closest("." + ClassName.ALERT)[0];
      }

      return parent;
    };

    _proto._triggerCloseEvent = function _triggerCloseEvent(element) {
      var closeEvent = $.Event(Event.CLOSE);
      $(element).trigger(closeEvent);
      return closeEvent;
    };

    _proto._removeElement = function _removeElement(element) {
      var _this = this;

      $(element).removeClass(ClassName.SHOW);

      if (!$(element).hasClass(ClassName.FADE)) {
        this._destroyElement(element);

        return;
      }

      var transitionDuration = Util.getTransitionDurationFromElement(element);
      $(element).one(Util.TRANSITION_END, function (event) {
        return _this._destroyElement(element, event);
      }).emulateTransitionEnd(transitionDuration);
    };

    _proto._destroyElement = function _destroyElement(element) {
      $(element).detach().trigger(Event.CLOSED).remove();
    } // Static
    ;

    Alert._jQueryInterface = function _jQueryInterface(config) {
      return this.each(function () {
        var $element = $(this);
        var data = $element.data(DATA_KEY);

        if (!data) {
          data = new Alert(this);
          $element.data(DATA_KEY, data);
        }

        if (config === 'close') {
          data[config](this);
        }
      });
    };

    Alert._handleDismiss = function _handleDismiss(alertInstance) {
      return function (event) {
        if (event) {
          event.preventDefault();
        }

        alertInstance.close(this);
      };
    };

    _createClass(Alert, null, [{
      key: "VERSION",
      get: function get() {
        return VERSION;
      }
    }]);

    return Alert;
  }();
  /**
   * ------------------------------------------------------------------------
   * Data Api implementation
   * ------------------------------------------------------------------------
   */


  $(document).on(Event.CLICK_DATA_API, Selector.DISMISS, Alert._handleDismiss(new Alert()));
  /**
   * ------------------------------------------------------------------------
   * jQuery
   * ------------------------------------------------------------------------
   */

  $.fn[NAME] = Alert._jQueryInterface;
  $.fn[NAME].Constructor = Alert;

  $.fn[NAME].noConflict = function () {
    $.fn[NAME] = JQUERY_NO_CONFLICT;
    return Alert._jQueryInterface;
  };

  /**
   * ------------------------------------------------------------------------
   * Constants
   * ------------------------------------------------------------------------
   */

  var NAME$1 = 'button';
  var VERSION$1 = '4.3.1';
  var DATA_KEY$1 = 'bs.button';
  var EVENT_KEY$1 = "." + DATA_KEY$1;
  var DATA_API_KEY$1 = '.data-api';
  var JQUERY_NO_CONFLICT$1 = $.fn[NAME$1];
  var ClassName$1 = {
    ACTIVE: 'active',
    BUTTON: 'btn',
    FOCUS: 'focus'
  };
  var Selector$1 = {
    DATA_TOGGLE_CARROT: '[data-toggle^="button"]',
    DATA_TOGGLE: '[data-toggle="buttons"]',
    INPUT: 'input:not([type="hidden"])',
    ACTIVE: '.active',
    BUTTON: '.btn'
  };
  var Event$1 = {
    CLICK_DATA_API: "click" + EVENT_KEY$1 + DATA_API_KEY$1,
    FOCUS_BLUR_DATA_API: "focus" + EVENT_KEY$1 + DATA_API_KEY$1 + " " + ("blur" + EVENT_KEY$1 + DATA_API_KEY$1)
    /**
     * ------------------------------------------------------------------------
     * Class Definition
     * ------------------------------------------------------------------------
     */

  };

  var Button =
  /*#__PURE__*/
  function () {
    function Button(element) {
      this._element = element;
    } // Getters


    var _proto = Button.prototype;

    // Public
    _proto.toggle = function toggle() {
      var triggerChangeEvent = true;
      var addAriaPressed = true;
      var rootElement = $(this._element).closest(Selector$1.DATA_TOGGLE)[0];

      if (rootElement) {
        var input = this._element.querySelector(Selector$1.INPUT);

        if (input) {
          if (input.type === 'radio') {
            if (input.checked && this._element.classList.contains(ClassName$1.ACTIVE)) {
              triggerChangeEvent = false;
            } else {
              var activeElement = rootElement.querySelector(Selector$1.ACTIVE);

              if (activeElement) {
                $(activeElement).removeClass(ClassName$1.ACTIVE);
              }
            }
          }

          if (triggerChangeEvent) {
            if (input.hasAttribute('disabled') || rootElement.hasAttribute('disabled') || input.classList.contains('disabled') || rootElement.classList.contains('disabled')) {
              return;
            }

            input.checked = !this._element.classList.contains(ClassName$1.ACTIVE);
            $(input).trigger('change');
          }

          input.focus();
          addAriaPressed = false;
        }
      }

      if (addAriaPressed) {
        this._element.setAttribute('aria-pressed', !this._element.classList.contains(ClassName$1.ACTIVE));
      }

      if (triggerChangeEvent) {
        $(this._element).toggleClass(ClassName$1.ACTIVE);
      }
    };

    _proto.dispose = function dispose() {
      $.removeData(this._element, DATA_KEY$1);
      this._element = null;
    } // Static
    ;

    Button._jQueryInterface = function _jQueryInterface(config) {
      return this.each(function () {
        var data = $(this).data(DATA_KEY$1);

        if (!data) {
          data = new Button(this);
          $(this).data(DATA_KEY$1, data);
        }

        if (config === 'toggle') {
          data[config]();
        }
      });
    };

    _createClass(Button, null, [{
      key: "VERSION",
      get: function get() {
        return VERSION$1;
      }
    }]);

    return Button;
  }();
  /**
   * ------------------------------------------------------------------------
   * Data Api implementation
   * ------------------------------------------------------------------------
   */


  $(document).on(Event$1.CLICK_DATA_API, Selector$1.DATA_TOGGLE_CARROT, function (event) {
    event.preventDefault();
    var button = event.target;

    if (!$(button).hasClass(ClassName$1.BUTTON)) {
      button = $(button).closest(Selector$1.BUTTON);
    }

    Button._jQueryInterface.call($(button), 'toggle');
  }).on(Event$1.FOCUS_BLUR_DATA_API, Selector$1.DATA_TOGGLE_CARROT, function (event) {
    var button = $(event.target).closest(Selector$1.BUTTON)[0];
    $(button).toggleClass(ClassName$1.FOCUS, /^focus(in)?$/.test(event.type));
  });
  /**
   * ------------------------------------------------------------------------
   * jQuery
   * ------------------------------------------------------------------------
   */

  $.fn[NAME$1] = Button._jQueryInterface;
  $.fn[NAME$1].Constructor = Button;

  $.fn[NAME$1].noConflict = function () {
    $.fn[NAME$1] = JQUERY_NO_CONFLICT$1;
    return Button._jQueryInterface;
  };

  /**
   * ------------------------------------------------------------------------
   * Constants
   * ------------------------------------------------------------------------
   */

  var NAME$2 = 'carousel';
  var VERSION$2 = '4.3.1';
  var DATA_KEY$2 = 'bs.carousel';
  var EVENT_KEY$2 = "." + DATA_KEY$2;
  var DATA_API_KEY$2 = '.data-api';
  var JQUERY_NO_CONFLICT$2 = $.fn[NAME$2];
  var ARROW_LEFT_KEYCODE = 37; // KeyboardEvent.which value for left arrow key

  var ARROW_RIGHT_KEYCODE = 39; // KeyboardEvent.which value for right arrow key

  var TOUCHEVENT_COMPAT_WAIT = 500; // Time for mouse compat events to fire after touch

  var SWIPE_THRESHOLD = 40;
  var Default = {
    interval: 5000,
    keyboard: true,
    slide: false,
    pause: 'hover',
    wrap: true,
    touch: true
  };
  var DefaultType = {
    interval: '(number|boolean)',
    keyboard: 'boolean',
    slide: '(boolean|string)',
    pause: '(string|boolean)',
    wrap: 'boolean',
    touch: 'boolean'
  };
  var Direction = {
    NEXT: 'next',
    PREV: 'prev',
    LEFT: 'left',
    RIGHT: 'right'
  };
  var Event$2 = {
    SLIDE: "slide" + EVENT_KEY$2,
    SLID: "slid" + EVENT_KEY$2,
    KEYDOWN: "keydown" + EVENT_KEY$2,
    MOUSEENTER: "mouseenter" + EVENT_KEY$2,
    MOUSELEAVE: "mouseleave" + EVENT_KEY$2,
    TOUCHSTART: "touchstart" + EVENT_KEY$2,
    TOUCHMOVE: "touchmove" + EVENT_KEY$2,
    TOUCHEND: "touchend" + EVENT_KEY$2,
    POINTERDOWN: "pointerdown" + EVENT_KEY$2,
    POINTERUP: "pointerup" + EVENT_KEY$2,
    DRAG_START: "dragstart" + EVENT_KEY$2,
    LOAD_DATA_API: "load" + EVENT_KEY$2 + DATA_API_KEY$2,
    CLICK_DATA_API: "click" + EVENT_KEY$2 + DATA_API_KEY$2
  };
  var ClassName$2 = {
    CAROUSEL: 'carousel',
    ACTIVE: 'active',
    SLIDE: 'slide',
    RIGHT: 'carousel-item-right',
    LEFT: 'carousel-item-left',
    NEXT: 'carousel-item-next',
    PREV: 'carousel-item-prev',
    ITEM: 'carousel-item',
    POINTER_EVENT: 'pointer-event'
  };
  var Selector$2 = {
    ACTIVE: '.active',
    ACTIVE_ITEM: '.active.carousel-item',
    ITEM: '.carousel-item',
    ITEM_IMG: '.carousel-item img',
    NEXT_PREV: '.carousel-item-next, .carousel-item-prev',
    INDICATORS: '.carousel-indicators',
    DATA_SLIDE: '[data-slide], [data-slide-to]',
    DATA_RIDE: '[data-ride="carousel"]'
  };
  var PointerType = {
    TOUCH: 'touch',
    PEN: 'pen'
    /**
     * ------------------------------------------------------------------------
     * Class Definition
     * ------------------------------------------------------------------------
     */

  };

  var Carousel =
  /*#__PURE__*/
  function () {
    function Carousel(element, config) {
      this._items = null;
      this._interval = null;
      this._activeElement = null;
      this._isPaused = false;
      this._isSliding = false;
      this.touchTimeout = null;
      this.touchStartX = 0;
      this.touchDeltaX = 0;
      this._config = this._getConfig(config);
      this._element = element;
      this._indicatorsElement = this._element.querySelector(Selector$2.INDICATORS);
      this._touchSupported = 'ontouchstart' in document.documentElement || navigator.maxTouchPoints > 0;
      this._pointerEvent = Boolean(window.PointerEvent || window.MSPointerEvent);

      this._addEventListeners();
    } // Getters


    var _proto = Carousel.prototype;

    // Public
    _proto.next = function next() {
      if (!this._isSliding) {
        this._slide(Direction.NEXT);
      }
    };

    _proto.nextWhenVisible = function nextWhenVisible() {
      // Don't call next when the page isn't visible
      // or the carousel or its parent isn't visible
      if (!document.hidden && $(this._element).is(':visible') && $(this._element).css('visibility') !== 'hidden') {
        this.next();
      }
    };

    _proto.prev = function prev() {
      if (!this._isSliding) {
        this._slide(Direction.PREV);
      }
    };

    _proto.pause = function pause(event) {
      if (!event) {
        this._isPaused = true;
      }

      if (this._element.querySelector(Selector$2.NEXT_PREV)) {
        Util.triggerTransitionEnd(this._element);
        this.cycle(true);
      }

      clearInterval(this._interval);
      this._interval = null;
    };

    _proto.cycle = function cycle(event) {
      if (!event) {
        this._isPaused = false;
      }

      if (this._interval) {
        clearInterval(this._interval);
        this._interval = null;
      }

      if (this._config.interval && !this._isPaused) {
        this._interval = setInterval((document.visibilityState ? this.nextWhenVisible : this.next).bind(this), this._config.interval);
      }
    };

    _proto.to = function to(index) {
      var _this = this;

      this._activeElement = this._element.querySelector(Selector$2.ACTIVE_ITEM);

      var activeIndex = this._getItemIndex(this._activeElement);

      if (index > this._items.length - 1 || index < 0) {
        return;
      }

      if (this._isSliding) {
        $(this._element).one(Event$2.SLID, function () {
          return _this.to(index);
        });
        return;
      }

      if (activeIndex === index) {
        this.pause();
        this.cycle();
        return;
      }

      var direction = index > activeIndex ? Direction.NEXT : Direction.PREV;

      this._slide(direction, this._items[index]);
    };

    _proto.dispose = function dispose() {
      $(this._element).off(EVENT_KEY$2);
      $.removeData(this._element, DATA_KEY$2);
      this._items = null;
      this._config = null;
      this._element = null;
      this._interval = null;
      this._isPaused = null;
      this._isSliding = null;
      this._activeElement = null;
      this._indicatorsElement = null;
    } // Private
    ;

    _proto._getConfig = function _getConfig(config) {
      config = _objectSpread({}, Default, config);
      Util.typeCheckConfig(NAME$2, config, DefaultType);
      return config;
    };

    _proto._handleSwipe = function _handleSwipe() {
      var absDeltax = Math.abs(this.touchDeltaX);

      if (absDeltax <= SWIPE_THRESHOLD) {
        return;
      }

      var direction = absDeltax / this.touchDeltaX; // swipe left

      if (direction > 0) {
        this.prev();
      } // swipe right


      if (direction < 0) {
        this.next();
      }
    };

    _proto._addEventListeners = function _addEventListeners() {
      var _this2 = this;

      if (this._config.keyboard) {
        $(this._element).on(Event$2.KEYDOWN, function (event) {
          return _this2._keydown(event);
        });
      }

      if (this._config.pause === 'hover') {
        $(this._element).on(Event$2.MOUSEENTER, function (event) {
          return _this2.pause(event);
        }).on(Event$2.MOUSELEAVE, function (event) {
          return _this2.cycle(event);
        });
      }

      if (this._config.touch) {
        this._addTouchEventListeners();
      }
    };

    _proto._addTouchEventListeners = function _addTouchEventListeners() {
      var _this3 = this;

      if (!this._touchSupported) {
        return;
      }

      var start = function start(event) {
        if (_this3._pointerEvent && PointerType[event.originalEvent.pointerType.toUpperCase()]) {
          _this3.touchStartX = event.originalEvent.clientX;
        } else if (!_this3._pointerEvent) {
          _this3.touchStartX = event.originalEvent.touches[0].clientX;
        }
      };

      var move = function move(event) {
        // ensure swiping with one touch and not pinching
        if (event.originalEvent.touches && event.originalEvent.touches.length > 1) {
          _this3.touchDeltaX = 0;
        } else {
          _this3.touchDeltaX = event.originalEvent.touches[0].clientX - _this3.touchStartX;
        }
      };

      var end = function end(event) {
        if (_this3._pointerEvent && PointerType[event.originalEvent.pointerType.toUpperCase()]) {
          _this3.touchDeltaX = event.originalEvent.clientX - _this3.touchStartX;
        }

        _this3._handleSwipe();

        if (_this3._config.pause === 'hover') {
          // If it's a touch-enabled device, mouseenter/leave are fired as
          // part of the mouse compatibility events on first tap - the carousel
          // would stop cycling until user tapped out of it;
          // here, we listen for touchend, explicitly pause the carousel
          // (as if it's the second time we tap on it, mouseenter compat event
          // is NOT fired) and after a timeout (to allow for mouse compatibility
          // events to fire) we explicitly restart cycling
          _this3.pause();

          if (_this3.touchTimeout) {
            clearTimeout(_this3.touchTimeout);
          }

          _this3.touchTimeout = setTimeout(function (event) {
            return _this3.cycle(event);
          }, TOUCHEVENT_COMPAT_WAIT + _this3._config.interval);
        }
      };

      $(this._element.querySelectorAll(Selector$2.ITEM_IMG)).on(Event$2.DRAG_START, function (e) {
        return e.preventDefault();
      });

      if (this._pointerEvent) {
        $(this._element).on(Event$2.POINTERDOWN, function (event) {
          return start(event);
        });
        $(this._element).on(Event$2.POINTERUP, function (event) {
          return end(event);
        });

        this._element.classList.add(ClassName$2.POINTER_EVENT);
      } else {
        $(this._element).on(Event$2.TOUCHSTART, function (event) {
          return start(event);
        });
        $(this._element).on(Event$2.TOUCHMOVE, function (event) {
          return move(event);
        });
        $(this._element).on(Event$2.TOUCHEND, function (event) {
          return end(event);
        });
      }
    };

    _proto._keydown = function _keydown(event) {
      if (/input|textarea/i.test(event.target.tagName)) {
        return;
      }

      switch (event.which) {
        case ARROW_LEFT_KEYCODE:
          event.preventDefault();
          this.prev();
          break;

        case ARROW_RIGHT_KEYCODE:
          event.preventDefault();
          this.next();
          break;

        default:
      }
    };

    _proto._getItemIndex = function _getItemIndex(element) {
      this._items = element && element.parentNode ? [].slice.call(element.parentNode.querySelectorAll(Selector$2.ITEM)) : [];
      return this._items.indexOf(element);
    };

    _proto._getItemByDirection = function _getItemByDirection(direction, activeElement) {
      var isNextDirection = direction === Direction.NEXT;
      var isPrevDirection = direction === Direction.PREV;

      var activeIndex = this._getItemIndex(activeElement);

      var lastItemIndex = this._items.length - 1;
      var isGoingToWrap = isPrevDirection && activeIndex === 0 || isNextDirection && activeIndex === lastItemIndex;

      if (isGoingToWrap && !this._config.wrap) {
        return activeElement;
      }

      var delta = direction === Direction.PREV ? -1 : 1;
      var itemIndex = (activeIndex + delta) % this._items.length;
      return itemIndex === -1 ? this._items[this._items.length - 1] : this._items[itemIndex];
    };

    _proto._triggerSlideEvent = function _triggerSlideEvent(relatedTarget, eventDirectionName) {
      var targetIndex = this._getItemIndex(relatedTarget);

      var fromIndex = this._getItemIndex(this._element.querySelector(Selector$2.ACTIVE_ITEM));

      var slideEvent = $.Event(Event$2.SLIDE, {
        relatedTarget: relatedTarget,
        direction: eventDirectionName,
        from: fromIndex,
        to: targetIndex
      });
      $(this._element).trigger(slideEvent);
      return slideEvent;
    };

    _proto._setActiveIndicatorElement = function _setActiveIndicatorElement(element) {
      if (this._indicatorsElement) {
        var indicators = [].slice.call(this._indicatorsElement.querySelectorAll(Selector$2.ACTIVE));
        $(indicators).removeClass(ClassName$2.ACTIVE);

        var nextIndicator = this._indicatorsElement.children[this._getItemIndex(element)];

        if (nextIndicator) {
          $(nextIndicator).addClass(ClassName$2.ACTIVE);
        }
      }
    };

    _proto._slide = function _slide(direction, element) {
      var _this4 = this;

      var activeElement = this._element.querySelector(Selector$2.ACTIVE_ITEM);

      var activeElementIndex = this._getItemIndex(activeElement);

      var nextElement = element || activeElement && this._getItemByDirection(direction, activeElement);

      var nextElementIndex = this._getItemIndex(nextElement);

      var isCycling = Boolean(this._interval);
      var directionalClassName;
      var orderClassName;
      var eventDirectionName;

      if (direction === Direction.NEXT) {
        directionalClassName = ClassName$2.LEFT;
        orderClassName = ClassName$2.NEXT;
        eventDirectionName = Direction.LEFT;
      } else {
        directionalClassName = ClassName$2.RIGHT;
        orderClassName = ClassName$2.PREV;
        eventDirectionName = Direction.RIGHT;
      }

      if (nextElement && $(nextElement).hasClass(ClassName$2.ACTIVE)) {
        this._isSliding = false;
        return;
      }

      var slideEvent = this._triggerSlideEvent(nextElement, eventDirectionName);

      if (slideEvent.isDefaultPrevented()) {
        return;
      }

      if (!activeElement || !nextElement) {
        // Some weirdness is happening, so we bail
        return;
      }

      this._isSliding = true;

      if (isCycling) {
        this.pause();
      }

      this._setActiveIndicatorElement(nextElement);

      var slidEvent = $.Event(Event$2.SLID, {
        relatedTarget: nextElement,
        direction: eventDirectionName,
        from: activeElementIndex,
        to: nextElementIndex
      });

      if ($(this._element).hasClass(ClassName$2.SLIDE)) {
        $(nextElement).addClass(orderClassName);
        Util.reflow(nextElement);
        $(activeElement).addClass(directionalClassName);
        $(nextElement).addClass(directionalClassName);
        var nextElementInterval = parseInt(nextElement.getAttribute('data-interval'), 10);

        if (nextElementInterval) {
          this._config.defaultInterval = this._config.defaultInterval || this._config.interval;
          this._config.interval = nextElementInterval;
        } else {
          this._config.interval = this._config.defaultInterval || this._config.interval;
        }

        var transitionDuration = Util.getTransitionDurationFromElement(activeElement);
        $(activeElement).one(Util.TRANSITION_END, function () {
          $(nextElement).removeClass(directionalClassName + " " + orderClassName).addClass(ClassName$2.ACTIVE);
          $(activeElement).removeClass(ClassName$2.ACTIVE + " " + orderClassName + " " + directionalClassName);
          _this4._isSliding = false;
          setTimeout(function () {
            return $(_this4._element).trigger(slidEvent);
          }, 0);
        }).emulateTransitionEnd(transitionDuration);
      } else {
        $(activeElement).removeClass(ClassName$2.ACTIVE);
        $(nextElement).addClass(ClassName$2.ACTIVE);
        this._isSliding = false;
        $(this._element).trigger(slidEvent);
      }

      if (isCycling) {
        this.cycle();
      }
    } // Static
    ;

    Carousel._jQueryInterface = function _jQueryInterface(config) {
      return this.each(function () {
        var data = $(this).data(DATA_KEY$2);

        var _config = _objectSpread({}, Default, $(this).data());

        if (typeof config === 'object') {
          _config = _objectSpread({}, _config, config);
        }

        var action = typeof config === 'string' ? config : _config.slide;

        if (!data) {
          data = new Carousel(this, _config);
          $(this).data(DATA_KEY$2, data);
        }

        if (typeof config === 'number') {
          data.to(config);
        } else if (typeof action === 'string') {
          if (typeof data[action] === 'undefined') {
            throw new TypeError("No method named \"" + action + "\"");
          }

          data[action]();
        } else if (_config.interval && _config.ride) {
          data.pause();
          data.cycle();
        }
      });
    };

    Carousel._dataApiClickHandler = function _dataApiClickHandler(event) {
      var selector = Util.getSelectorFromElement(this);

      if (!selector) {
        return;
      }

      var target = $(selector)[0];

      if (!target || !$(target).hasClass(ClassName$2.CAROUSEL)) {
        return;
      }

      var config = _objectSpread({}, $(target).data(), $(this).data());

      var slideIndex = this.getAttribute('data-slide-to');

      if (slideIndex) {
        config.interval = false;
      }

      Carousel._jQueryInterface.call($(target), config);

      if (slideIndex) {
        $(target).data(DATA_KEY$2).to(slideIndex);
      }

      event.preventDefault();
    };

    _createClass(Carousel, null, [{
      key: "VERSION",
      get: function get() {
        return VERSION$2;
      }
    }, {
      key: "Default",
      get: function get() {
        return Default;
      }
    }]);

    return Carousel;
  }();
  /**
   * ------------------------------------------------------------------------
   * Data Api implementation
   * ------------------------------------------------------------------------
   */


  $(document).on(Event$2.CLICK_DATA_API, Selector$2.DATA_SLIDE, Carousel._dataApiClickHandler);
  $(window).on(Event$2.LOAD_DATA_API, function () {
    var carousels = [].slice.call(document.querySelectorAll(Selector$2.DATA_RIDE));

    for (var i = 0, len = carousels.length; i < len; i++) {
      var $carousel = $(carousels[i]);

      Carousel._jQueryInterface.call($carousel, $carousel.data());
    }
  });
  /**
   * ------------------------------------------------------------------------
   * jQuery
   * ------------------------------------------------------------------------
   */

  $.fn[NAME$2] = Carousel._jQueryInterface;
  $.fn[NAME$2].Constructor = Carousel;

  $.fn[NAME$2].noConflict = function () {
    $.fn[NAME$2] = JQUERY_NO_CONFLICT$2;
    return Carousel._jQueryInterface;
  };

  /**
   * ------------------------------------------------------------------------
   * Constants
   * ------------------------------------------------------------------------
   */

  var NAME$3 = 'collapse';
  var VERSION$3 = '4.3.1';
  var DATA_KEY$3 = 'bs.collapse';
  var EVENT_KEY$3 = "." + DATA_KEY$3;
  var DATA_API_KEY$3 = '.data-api';
  var JQUERY_NO_CONFLICT$3 = $.fn[NAME$3];
  var Default$1 = {
    toggle: true,
    parent: ''
  };
  var DefaultType$1 = {
    toggle: 'boolean',
    parent: '(string|element)'
  };
  var Event$3 = {
    SHOW: "show" + EVENT_KEY$3,
    SHOWN: "shown" + EVENT_KEY$3,
    HIDE: "hide" + EVENT_KEY$3,
    HIDDEN: "hidden" + EVENT_KEY$3,
    CLICK_DATA_API: "click" + EVENT_KEY$3 + DATA_API_KEY$3
  };
  var ClassName$3 = {
    SHOW: 'show',
    COLLAPSE: 'collapse',
    COLLAPSING: 'collapsing',
    COLLAPSED: 'collapsed'
  };
  var Dimension = {
    WIDTH: 'width',
    HEIGHT: 'height'
  };
  var Selector$3 = {
    ACTIVES: '.show, .collapsing',
    DATA_TOGGLE: '[data-toggle="collapse"]'
    /**
     * ------------------------------------------------------------------------
     * Class Definition
     * ------------------------------------------------------------------------
     */

  };

  var Collapse =
  /*#__PURE__*/
  function () {
    function Collapse(element, config) {
      this._isTransitioning = false;
      this._element = element;
      this._config = this._getConfig(config);
      this._triggerArray = [].slice.call(document.querySelectorAll("[data-toggle=\"collapse\"][href=\"#" + element.id + "\"]," + ("[data-toggle=\"collapse\"][data-target=\"#" + element.id + "\"]")));
      var toggleList = [].slice.call(document.querySelectorAll(Selector$3.DATA_TOGGLE));

      for (var i = 0, len = toggleList.length; i < len; i++) {
        var elem = toggleList[i];
        var selector = Util.getSelectorFromElement(elem);
        var filterElement = [].slice.call(document.querySelectorAll(selector)).filter(function (foundElem) {
          return foundElem === element;
        });

        if (selector !== null && filterElement.length > 0) {
          this._selector = selector;

          this._triggerArray.push(elem);
        }
      }

      this._parent = this._config.parent ? this._getParent() : null;

      if (!this._config.parent) {
        this._addAriaAndCollapsedClass(this._element, this._triggerArray);
      }

      if (this._config.toggle) {
        this.toggle();
      }
    } // Getters


    var _proto = Collapse.prototype;

    // Public
    _proto.toggle = function toggle() {
      if ($(this._element).hasClass(ClassName$3.SHOW)) {
        this.hide();
      } else {
        this.show();
      }
    };

    _proto.show = function show() {
      var _this = this;

      if (this._isTransitioning || $(this._element).hasClass(ClassName$3.SHOW)) {
        return;
      }

      var actives;
      var activesData;

      if (this._parent) {
        actives = [].slice.call(this._parent.querySelectorAll(Selector$3.ACTIVES)).filter(function (elem) {
          if (typeof _this._config.parent === 'string') {
            return elem.getAttribute('data-parent') === _this._config.parent;
          }

          return elem.classList.contains(ClassName$3.COLLAPSE);
        });

        if (actives.length === 0) {
          actives = null;
        }
      }

      if (actives) {
        activesData = $(actives).not(this._selector).data(DATA_KEY$3);

        if (activesData && activesData._isTransitioning) {
          return;
        }
      }

      var startEvent = $.Event(Event$3.SHOW);
      $(this._element).trigger(startEvent);

      if (startEvent.isDefaultPrevented()) {
        return;
      }

      if (actives) {
        Collapse._jQueryInterface.call($(actives).not(this._selector), 'hide');

        if (!activesData) {
          $(actives).data(DATA_KEY$3, null);
        }
      }

      var dimension = this._getDimension();

      $(this._element).removeClass(ClassName$3.COLLAPSE).addClass(ClassName$3.COLLAPSING);
      this._element.style[dimension] = 0;

      if (this._triggerArray.length) {
        $(this._triggerArray).removeClass(ClassName$3.COLLAPSED).attr('aria-expanded', true);
      }

      this.setTransitioning(true);

      var complete = function complete() {
        $(_this._element).removeClass(ClassName$3.COLLAPSING).addClass(ClassName$3.COLLAPSE).addClass(ClassName$3.SHOW);
        _this._element.style[dimension] = '';

        _this.setTransitioning(false);

        $(_this._element).trigger(Event$3.SHOWN);
      };

      var capitalizedDimension = dimension[0].toUpperCase() + dimension.slice(1);
      var scrollSize = "scroll" + capitalizedDimension;
      var transitionDuration = Util.getTransitionDurationFromElement(this._element);
      $(this._element).one(Util.TRANSITION_END, complete).emulateTransitionEnd(transitionDuration);
      this._element.style[dimension] = this._element[scrollSize] + "px";
    };

    _proto.hide = function hide() {
      var _this2 = this;

      if (this._isTransitioning || !$(this._element).hasClass(ClassName$3.SHOW)) {
        return;
      }

      var startEvent = $.Event(Event$3.HIDE);
      $(this._element).trigger(startEvent);

      if (startEvent.isDefaultPrevented()) {
        return;
      }

      var dimension = this._getDimension();

      this._element.style[dimension] = this._element.getBoundingClientRect()[dimension] + "px";
      Util.reflow(this._element);
      $(this._element).addClass(ClassName$3.COLLAPSING).removeClass(ClassName$3.COLLAPSE).removeClass(ClassName$3.SHOW);
      var triggerArrayLength = this._triggerArray.length;

      if (triggerArrayLength > 0) {
        for (var i = 0; i < triggerArrayLength; i++) {
          var trigger = this._triggerArray[i];
          var selector = Util.getSelectorFromElement(trigger);

          if (selector !== null) {
            var $elem = $([].slice.call(document.querySelectorAll(selector)));

            if (!$elem.hasClass(ClassName$3.SHOW)) {
              $(trigger).addClass(ClassName$3.COLLAPSED).attr('aria-expanded', false);
            }
          }
        }
      }

      this.setTransitioning(true);

      var complete = function complete() {
        _this2.setTransitioning(false);

        $(_this2._element).removeClass(ClassName$3.COLLAPSING).addClass(ClassName$3.COLLAPSE).trigger(Event$3.HIDDEN);
      };

      this._element.style[dimension] = '';
      var transitionDuration = Util.getTransitionDurationFromElement(this._element);
      $(this._element).one(Util.TRANSITION_END, complete).emulateTransitionEnd(transitionDuration);
    };

    _proto.setTransitioning = function setTransitioning(isTransitioning) {
      this._isTransitioning = isTransitioning;
    };

    _proto.dispose = function dispose() {
      $.removeData(this._element, DATA_KEY$3);
      this._config = null;
      this._parent = null;
      this._element = null;
      this._triggerArray = null;
      this._isTransitioning = null;
    } // Private
    ;

    _proto._getConfig = function _getConfig(config) {
      config = _objectSpread({}, Default$1, config);
      config.toggle = Boolean(config.toggle); // Coerce string values

      Util.typeCheckConfig(NAME$3, config, DefaultType$1);
      return config;
    };

    _proto._getDimension = function _getDimension() {
      var hasWidth = $(this._element).hasClass(Dimension.WIDTH);
      return hasWidth ? Dimension.WIDTH : Dimension.HEIGHT;
    };

    _proto._getParent = function _getParent() {
      var _this3 = this;

      var parent;

      if (Util.isElement(this._config.parent)) {
        parent = this._config.parent; // It's a jQuery object

        if (typeof this._config.parent.jquery !== 'undefined') {
          parent = this._config.parent[0];
        }
      } else {
        parent = document.querySelector(this._config.parent);
      }

      var selector = "[data-toggle=\"collapse\"][data-parent=\"" + this._config.parent + "\"]";
      var children = [].slice.call(parent.querySelectorAll(selector));
      $(children).each(function (i, element) {
        _this3._addAriaAndCollapsedClass(Collapse._getTargetFromElement(element), [element]);
      });
      return parent;
    };

    _proto._addAriaAndCollapsedClass = function _addAriaAndCollapsedClass(element, triggerArray) {
      var isOpen = $(element).hasClass(ClassName$3.SHOW);

      if (triggerArray.length) {
        $(triggerArray).toggleClass(ClassName$3.COLLAPSED, !isOpen).attr('aria-expanded', isOpen);
      }
    } // Static
    ;

    Collapse._getTargetFromElement = function _getTargetFromElement(element) {
      var selector = Util.getSelectorFromElement(element);
      return selector ? document.querySelector(selector) : null;
    };

    Collapse._jQueryInterface = function _jQueryInterface(config) {
      return this.each(function () {
        var $this = $(this);
        var data = $this.data(DATA_KEY$3);

        var _config = _objectSpread({}, Default$1, $this.data(), typeof config === 'object' && config ? config : {});

        if (!data && _config.toggle && /show|hide/.test(config)) {
          _config.toggle = false;
        }

        if (!data) {
          data = new Collapse(this, _config);
          $this.data(DATA_KEY$3, data);
        }

        if (typeof config === 'string') {
          if (typeof data[config] === 'undefined') {
            throw new TypeError("No method named \"" + config + "\"");
          }

          data[config]();
        }
      });
    };

    _createClass(Collapse, null, [{
      key: "VERSION",
      get: function get() {
        return VERSION$3;
      }
    }, {
      key: "Default",
      get: function get() {
        return Default$1;
      }
    }]);

    return Collapse;
  }();
  /**
   * ------------------------------------------------------------------------
   * Data Api implementation
   * ------------------------------------------------------------------------
   */


  $(document).on(Event$3.CLICK_DATA_API, Selector$3.DATA_TOGGLE, function (event) {
    // preventDefault only for <a> elements (which change the URL) not inside the collapsible element
    if (event.currentTarget.tagName === 'A') {
      event.preventDefault();
    }

    var $trigger = $(this);
    var selector = Util.getSelectorFromElement(this);
    var selectors = [].slice.call(document.querySelectorAll(selector));
    $(selectors).each(function () {
      var $target = $(this);
      var data = $target.data(DATA_KEY$3);
      var config = data ? 'toggle' : $trigger.data();

      Collapse._jQueryInterface.call($target, config);
    });
  });
  /**
   * ------------------------------------------------------------------------
   * jQuery
   * ------------------------------------------------------------------------
   */

  $.fn[NAME$3] = Collapse._jQueryInterface;
  $.fn[NAME$3].Constructor = Collapse;

  $.fn[NAME$3].noConflict = function () {
    $.fn[NAME$3] = JQUERY_NO_CONFLICT$3;
    return Collapse._jQueryInterface;
  };

  /**
   * ------------------------------------------------------------------------
   * Constants
   * ------------------------------------------------------------------------
   */

  var NAME$4 = 'dropdown';
  var VERSION$4 = '4.3.1';
  var DATA_KEY$4 = 'bs.dropdown';
  var EVENT_KEY$4 = "." + DATA_KEY$4;
  var DATA_API_KEY$4 = '.data-api';
  var JQUERY_NO_CONFLICT$4 = $.fn[NAME$4];
  var ESCAPE_KEYCODE = 27; // KeyboardEvent.which value for Escape (Esc) key

  var SPACE_KEYCODE = 32; // KeyboardEvent.which value for space key

  var TAB_KEYCODE = 9; // KeyboardEvent.which value for tab key

  var ARROW_UP_KEYCODE = 38; // KeyboardEvent.which value for up arrow key

  var ARROW_DOWN_KEYCODE = 40; // KeyboardEvent.which value for down arrow key

  var RIGHT_MOUSE_BUTTON_WHICH = 3; // MouseEvent.which value for the right button (assuming a right-handed mouse)

  var REGEXP_KEYDOWN = new RegExp(ARROW_UP_KEYCODE + "|" + ARROW_DOWN_KEYCODE + "|" + ESCAPE_KEYCODE);
  var Event$4 = {
    HIDE: "hide" + EVENT_KEY$4,
    HIDDEN: "hidden" + EVENT_KEY$4,
    SHOW: "show" + EVENT_KEY$4,
    SHOWN: "shown" + EVENT_KEY$4,
    CLICK: "click" + EVENT_KEY$4,
    CLICK_DATA_API: "click" + EVENT_KEY$4 + DATA_API_KEY$4,
    KEYDOWN_DATA_API: "keydown" + EVENT_KEY$4 + DATA_API_KEY$4,
    KEYUP_DATA_API: "keyup" + EVENT_KEY$4 + DATA_API_KEY$4
  };
  var ClassName$4 = {
    DISABLED: 'disabled',
    SHOW: 'show',
    DROPUP: 'dropup',
    DROPRIGHT: 'dropright',
    DROPLEFT: 'dropleft',
    MENURIGHT: 'dropdown-menu-right',
    MENULEFT: 'dropdown-menu-left',
    POSITION_STATIC: 'position-static'
  };
  var Selector$4 = {
    DATA_TOGGLE: '[data-toggle="dropdown"]',
    FORM_CHILD: '.dropdown form',
    MENU: '.dropdown-menu',
    NAVBAR_NAV: '.navbar-nav',
    VISIBLE_ITEMS: '.dropdown-menu .dropdown-item:not(.disabled):not(:disabled)'
  };
  var AttachmentMap = {
    TOP: 'top-start',
    TOPEND: 'top-end',
    BOTTOM: 'bottom-start',
    BOTTOMEND: 'bottom-end',
    RIGHT: 'right-start',
    RIGHTEND: 'right-end',
    LEFT: 'left-start',
    LEFTEND: 'left-end'
  };
  var Default$2 = {
    offset: 0,
    flip: true,
    boundary: 'scrollParent',
    reference: 'toggle',
    display: 'dynamic'
  };
  var DefaultType$2 = {
    offset: '(number|string|function)',
    flip: 'boolean',
    boundary: '(string|element)',
    reference: '(string|element)',
    display: 'string'
    /**
     * ------------------------------------------------------------------------
     * Class Definition
     * ------------------------------------------------------------------------
     */

  };

  var Dropdown =
  /*#__PURE__*/
  function () {
    function Dropdown(element, config) {
      this._element = element;
      this._popper = null;
      this._config = this._getConfig(config);
      this._menu = this._getMenuElement();
      this._inNavbar = this._detectNavbar();

      this._addEventListeners();
    } // Getters


    var _proto = Dropdown.prototype;

    // Public
    _proto.toggle = function toggle() {
      if (this._element.disabled || $(this._element).hasClass(ClassName$4.DISABLED)) {
        return;
      }

      var parent = Dropdown._getParentFromElement(this._element);

      var isActive = $(this._menu).hasClass(ClassName$4.SHOW);

      Dropdown._clearMenus();

      if (isActive) {
        return;
      }

      var relatedTarget = {
        relatedTarget: this._element
      };
      var showEvent = $.Event(Event$4.SHOW, relatedTarget);
      $(parent).trigger(showEvent);

      if (showEvent.isDefaultPrevented()) {
        return;
      } // Disable totally Popper.js for Dropdown in Navbar


      if (!this._inNavbar) {
        /**
         * Check for Popper dependency
         * Popper - https://popper.js.org
         */
        if (typeof Popper === 'undefined') {
          throw new TypeError('Bootstrap\'s dropdowns require Popper.js (https://popper.js.org/)');
        }

        var referenceElement = this._element;

        if (this._config.reference === 'parent') {
          referenceElement = parent;
        } else if (Util.isElement(this._config.reference)) {
          referenceElement = this._config.reference; // Check if it's jQuery element

          if (typeof this._config.reference.jquery !== 'undefined') {
            referenceElement = this._config.reference[0];
          }
        } // If boundary is not `scrollParent`, then set position to `static`
        // to allow the menu to "escape" the scroll parent's boundaries
        // https://github.com/twbs/bootstrap/issues/24251


        if (this._config.boundary !== 'scrollParent') {
          $(parent).addClass(ClassName$4.POSITION_STATIC);
        }

        this._popper = new Popper(referenceElement, this._menu, this._getPopperConfig());
      } // If this is a touch-enabled device we add extra
      // empty mouseover listeners to the body's immediate children;
      // only needed because of broken event delegation on iOS
      // https://www.quirksmode.org/blog/archives/2014/02/mouse_event_bub.html


      if ('ontouchstart' in document.documentElement && $(parent).closest(Selector$4.NAVBAR_NAV).length === 0) {
        $(document.body).children().on('mouseover', null, $.noop);
      }

      this._element.focus();

      this._element.setAttribute('aria-expanded', true);

      $(this._menu).toggleClass(ClassName$4.SHOW);
      $(parent).toggleClass(ClassName$4.SHOW).trigger($.Event(Event$4.SHOWN, relatedTarget));
    };

    _proto.show = function show() {
      if (this._element.disabled || $(this._element).hasClass(ClassName$4.DISABLED) || $(this._menu).hasClass(ClassName$4.SHOW)) {
        return;
      }

      var relatedTarget = {
        relatedTarget: this._element
      };
      var showEvent = $.Event(Event$4.SHOW, relatedTarget);

      var parent = Dropdown._getParentFromElement(this._element);

      $(parent).trigger(showEvent);

      if (showEvent.isDefaultPrevented()) {
        return;
      }

      $(this._menu).toggleClass(ClassName$4.SHOW);
      $(parent).toggleClass(ClassName$4.SHOW).trigger($.Event(Event$4.SHOWN, relatedTarget));
    };

    _proto.hide = function hide() {
      if (this._element.disabled || $(this._element).hasClass(ClassName$4.DISABLED) || !$(this._menu).hasClass(ClassName$4.SHOW)) {
        return;
      }

      var relatedTarget = {
        relatedTarget: this._element
      };
      var hideEvent = $.Event(Event$4.HIDE, relatedTarget);

      var parent = Dropdown._getParentFromElement(this._element);

      $(parent).trigger(hideEvent);

      if (hideEvent.isDefaultPrevented()) {
        return;
      }

      $(this._menu).toggleClass(ClassName$4.SHOW);
      $(parent).toggleClass(ClassName$4.SHOW).trigger($.Event(Event$4.HIDDEN, relatedTarget));
    };

    _proto.dispose = function dispose() {
      $.removeData(this._element, DATA_KEY$4);
      $(this._element).off(EVENT_KEY$4);
      this._element = null;
      this._menu = null;

      if (this._popper !== null) {
        this._popper.destroy();

        this._popper = null;
      }
    };

    _proto.update = function update() {
      this._inNavbar = this._detectNavbar();

      if (this._popper !== null) {
        this._popper.scheduleUpdate();
      }
    } // Private
    ;

    _proto._addEventListeners = function _addEventListeners() {
      var _this = this;

      $(this._element).on(Event$4.CLICK, function (event) {
        event.preventDefault();
        event.stopPropagation();

        _this.toggle();
      });
    };

    _proto._getConfig = function _getConfig(config) {
      config = _objectSpread({}, this.constructor.Default, $(this._element).data(), config);
      Util.typeCheckConfig(NAME$4, config, this.constructor.DefaultType);
      return config;
    };

    _proto._getMenuElement = function _getMenuElement() {
      if (!this._menu) {
        var parent = Dropdown._getParentFromElement(this._element);

        if (parent) {
          this._menu = parent.querySelector(Selector$4.MENU);
        }
      }

      return this._menu;
    };

    _proto._getPlacement = function _getPlacement() {
      var $parentDropdown = $(this._element.parentNode);
      var placement = AttachmentMap.BOTTOM; // Handle dropup

      if ($parentDropdown.hasClass(ClassName$4.DROPUP)) {
        placement = AttachmentMap.TOP;

        if ($(this._menu).hasClass(ClassName$4.MENURIGHT)) {
          placement = AttachmentMap.TOPEND;
        }
      } else if ($parentDropdown.hasClass(ClassName$4.DROPRIGHT)) {
        placement = AttachmentMap.RIGHT;
      } else if ($parentDropdown.hasClass(ClassName$4.DROPLEFT)) {
        placement = AttachmentMap.LEFT;
      } else if ($(this._menu).hasClass(ClassName$4.MENURIGHT)) {
        placement = AttachmentMap.BOTTOMEND;
      }

      return placement;
    };

    _proto._detectNavbar = function _detectNavbar() {
      return $(this._element).closest('.navbar').length > 0;
    };

    _proto._getOffset = function _getOffset() {
      var _this2 = this;

      var offset = {};

      if (typeof this._config.offset === 'function') {
        offset.fn = function (data) {
          data.offsets = _objectSpread({}, data.offsets, _this2._config.offset(data.offsets, _this2._element) || {});
          return data;
        };
      } else {
        offset.offset = this._config.offset;
      }

      return offset;
    };

    _proto._getPopperConfig = function _getPopperConfig() {
      var popperConfig = {
        placement: this._getPlacement(),
        modifiers: {
          offset: this._getOffset(),
          flip: {
            enabled: this._config.flip
          },
          preventOverflow: {
            boundariesElement: this._config.boundary
          }
        } // Disable Popper.js if we have a static display

      };

      if (this._config.display === 'static') {
        popperConfig.modifiers.applyStyle = {
          enabled: false
        };
      }

      return popperConfig;
    } // Static
    ;

    Dropdown._jQueryInterface = function _jQueryInterface(config) {
      return this.each(function () {
        var data = $(this).data(DATA_KEY$4);

        var _config = typeof config === 'object' ? config : null;

        if (!data) {
          data = new Dropdown(this, _config);
          $(this).data(DATA_KEY$4, data);
        }

        if (typeof config === 'string') {
          if (typeof data[config] === 'undefined') {
            throw new TypeError("No method named \"" + config + "\"");
          }

          data[config]();
        }
      });
    };

    Dropdown._clearMenus = function _clearMenus(event) {
      if (event && (event.which === RIGHT_MOUSE_BUTTON_WHICH || event.type === 'keyup' && event.which !== TAB_KEYCODE)) {
        return;
      }

      var toggles = [].slice.call(document.querySelectorAll(Selector$4.DATA_TOGGLE));

      for (var i = 0, len = toggles.length; i < len; i++) {
        var parent = Dropdown._getParentFromElement(toggles[i]);

        var context = $(toggles[i]).data(DATA_KEY$4);
        var relatedTarget = {
          relatedTarget: toggles[i]
        };

        if (event && event.type === 'click') {
          relatedTarget.clickEvent = event;
        }

        if (!context) {
          continue;
        }

        var dropdownMenu = context._menu;

        if (!$(parent).hasClass(ClassName$4.SHOW)) {
          continue;
        }

        if (event && (event.type === 'click' && /input|textarea/i.test(event.target.tagName) || event.type === 'keyup' && event.which === TAB_KEYCODE) && $.contains(parent, event.target)) {
          continue;
        }

        var hideEvent = $.Event(Event$4.HIDE, relatedTarget);
        $(parent).trigger(hideEvent);

        if (hideEvent.isDefaultPrevented()) {
          continue;
        } // If this is a touch-enabled device we remove the extra
        // empty mouseover listeners we added for iOS support


        if ('ontouchstart' in document.documentElement) {
          $(document.body).children().off('mouseover', null, $.noop);
        }

        toggles[i].setAttribute('aria-expanded', 'false');
        $(dropdownMenu).removeClass(ClassName$4.SHOW);
        $(parent).removeClass(ClassName$4.SHOW).trigger($.Event(Event$4.HIDDEN, relatedTarget));
      }
    };

    Dropdown._getParentFromElement = function _getParentFromElement(element) {
      var parent;
      var selector = Util.getSelectorFromElement(element);

      if (selector) {
        parent = document.querySelector(selector);
      }

      return parent || element.parentNode;
    } // eslint-disable-next-line complexity
    ;

    Dropdown._dataApiKeydownHandler = function _dataApiKeydownHandler(event) {
      // If not input/textarea:
      //  - And not a key in REGEXP_KEYDOWN => not a dropdown command
      // If input/textarea:
      //  - If space key => not a dropdown command
      //  - If key is other than escape
      //    - If key is not up or down => not a dropdown command
      //    - If trigger inside the menu => not a dropdown command
      if (/input|textarea/i.test(event.target.tagName) ? event.which === SPACE_KEYCODE || event.which !== ESCAPE_KEYCODE && (event.which !== ARROW_DOWN_KEYCODE && event.which !== ARROW_UP_KEYCODE || $(event.target).closest(Selector$4.MENU).length) : !REGEXP_KEYDOWN.test(event.which)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (this.disabled || $(this).hasClass(ClassName$4.DISABLED)) {
        return;
      }

      var parent = Dropdown._getParentFromElement(this);

      var isActive = $(parent).hasClass(ClassName$4.SHOW);

      if (!isActive || isActive && (event.which === ESCAPE_KEYCODE || event.which === SPACE_KEYCODE)) {
        if (event.which === ESCAPE_KEYCODE) {
          var toggle = parent.querySelector(Selector$4.DATA_TOGGLE);
          $(toggle).trigger('focus');
        }

        $(this).trigger('click');
        return;
      }

      var items = [].slice.call(parent.querySelectorAll(Selector$4.VISIBLE_ITEMS));

      if (items.length === 0) {
        return;
      }

      var index = items.indexOf(event.target);

      if (event.which === ARROW_UP_KEYCODE && index > 0) {
        // Up
        index--;
      }

      if (event.which === ARROW_DOWN_KEYCODE && index < items.length - 1) {
        // Down
        index++;
      }

      if (index < 0) {
        index = 0;
      }

      items[index].focus();
    };

    _createClass(Dropdown, null, [{
      key: "VERSION",
      get: function get() {
        return VERSION$4;
      }
    }, {
      key: "Default",
      get: function get() {
        return Default$2;
      }
    }, {
      key: "DefaultType",
      get: function get() {
        return DefaultType$2;
      }
    }]);

    return Dropdown;
  }();
  /**
   * ------------------------------------------------------------------------
   * Data Api implementation
   * ------------------------------------------------------------------------
   */


  $(document).on(Event$4.KEYDOWN_DATA_API, Selector$4.DATA_TOGGLE, Dropdown._dataApiKeydownHandler).on(Event$4.KEYDOWN_DATA_API, Selector$4.MENU, Dropdown._dataApiKeydownHandler).on(Event$4.CLICK_DATA_API + " " + Event$4.KEYUP_DATA_API, Dropdown._clearMenus).on(Event$4.CLICK_DATA_API, Selector$4.DATA_TOGGLE, function (event) {
    event.preventDefault();
    event.stopPropagation();

    Dropdown._jQueryInterface.call($(this), 'toggle');
  }).on(Event$4.CLICK_DATA_API, Selector$4.FORM_CHILD, function (e) {
    e.stopPropagation();
  });
  /**
   * ------------------------------------------------------------------------
   * jQuery
   * ------------------------------------------------------------------------
   */

  $.fn[NAME$4] = Dropdown._jQueryInterface;
  $.fn[NAME$4].Constructor = Dropdown;

  $.fn[NAME$4].noConflict = function () {
    $.fn[NAME$4] = JQUERY_NO_CONFLICT$4;
    return Dropdown._jQueryInterface;
  };

  /**
   * ------------------------------------------------------------------------
   * Constants
   * ------------------------------------------------------------------------
   */

  var NAME$5 = 'modal';
  var VERSION$5 = '4.3.1';
  var DATA_KEY$5 = 'bs.modal';
  var EVENT_KEY$5 = "." + DATA_KEY$5;
  var DATA_API_KEY$5 = '.data-api';
  var JQUERY_NO_CONFLICT$5 = $.fn[NAME$5];
  var ESCAPE_KEYCODE$1 = 27; // KeyboardEvent.which value for Escape (Esc) key

  var Default$3 = {
    backdrop: true,
    keyboard: true,
    focus: true,
    show: true
  };
  var DefaultType$3 = {
    backdrop: '(boolean|string)',
    keyboard: 'boolean',
    focus: 'boolean',
    show: 'boolean'
  };
  var Event$5 = {
    HIDE: "hide" + EVENT_KEY$5,
    HIDDEN: "hidden" + EVENT_KEY$5,
    SHOW: "show" + EVENT_KEY$5,
    SHOWN: "shown" + EVENT_KEY$5,
    FOCUSIN: "focusin" + EVENT_KEY$5,
    RESIZE: "resize" + EVENT_KEY$5,
    CLICK_DISMISS: "click.dismiss" + EVENT_KEY$5,
    KEYDOWN_DISMISS: "keydown.dismiss" + EVENT_KEY$5,
    MOUSEUP_DISMISS: "mouseup.dismiss" + EVENT_KEY$5,
    MOUSEDOWN_DISMISS: "mousedown.dismiss" + EVENT_KEY$5,
    CLICK_DATA_API: "click" + EVENT_KEY$5 + DATA_API_KEY$5
  };
  var ClassName$5 = {
    SCROLLABLE: 'modal-dialog-scrollable',
    SCROLLBAR_MEASURER: 'modal-scrollbar-measure',
    BACKDROP: 'modal-backdrop',
    OPEN: 'modal-open',
    FADE: 'fade',
    SHOW: 'show'
  };
  var Selector$5 = {
    DIALOG: '.modal-dialog',
    MODAL_BODY: '.modal-body',
    DATA_TOGGLE: '[data-toggle="modal"]',
    DATA_DISMISS: '[data-dismiss="modal"]',
    FIXED_CONTENT: '.fixed-top, .fixed-bottom, .is-fixed, .sticky-top',
    STICKY_CONTENT: '.sticky-top'
    /**
     * ------------------------------------------------------------------------
     * Class Definition
     * ------------------------------------------------------------------------
     */

  };

  var Modal =
  /*#__PURE__*/
  function () {
    function Modal(element, config) {
      this._config = this._getConfig(config);
      this._element = element;
      this._dialog = element.querySelector(Selector$5.DIALOG);
      this._backdrop = null;
      this._isShown = false;
      this._isBodyOverflowing = false;
      this._ignoreBackdropClick = false;
      this._isTransitioning = false;
      this._scrollbarWidth = 0;
    } // Getters


    var _proto = Modal.prototype;

    // Public
    _proto.toggle = function toggle(relatedTarget) {
      return this._isShown ? this.hide() : this.show(relatedTarget);
    };

    _proto.show = function show(relatedTarget) {
      var _this = this;

      if (this._isShown || this._isTransitioning) {
        return;
      }

      if ($(this._element).hasClass(ClassName$5.FADE)) {
        this._isTransitioning = true;
      }

      var showEvent = $.Event(Event$5.SHOW, {
        relatedTarget: relatedTarget
      });
      $(this._element).trigger(showEvent);

      if (this._isShown || showEvent.isDefaultPrevented()) {
        return;
      }

      this._isShown = true;

      this._checkScrollbar();

      this._setScrollbar();

      this._adjustDialog();

      this._setEscapeEvent();

      this._setResizeEvent();

      $(this._element).on(Event$5.CLICK_DISMISS, Selector$5.DATA_DISMISS, function (event) {
        return _this.hide(event);
      });
      $(this._dialog).on(Event$5.MOUSEDOWN_DISMISS, function () {
        $(_this._element).one(Event$5.MOUSEUP_DISMISS, function (event) {
          if ($(event.target).is(_this._element)) {
            _this._ignoreBackdropClick = true;
          }
        });
      });

      this._showBackdrop(function () {
        return _this._showElement(relatedTarget);
      });
    };

    _proto.hide = function hide(event) {
      var _this2 = this;

      if (event) {
        event.preventDefault();
      }

      if (!this._isShown || this._isTransitioning) {
        return;
      }

      var hideEvent = $.Event(Event$5.HIDE);
      $(this._element).trigger(hideEvent);

      if (!this._isShown || hideEvent.isDefaultPrevented()) {
        return;
      }

      this._isShown = false;
      var transition = $(this._element).hasClass(ClassName$5.FADE);

      if (transition) {
        this._isTransitioning = true;
      }

      this._setEscapeEvent();

      this._setResizeEvent();

      $(document).off(Event$5.FOCUSIN);
      $(this._element).removeClass(ClassName$5.SHOW);
      $(this._element).off(Event$5.CLICK_DISMISS);
      $(this._dialog).off(Event$5.MOUSEDOWN_DISMISS);

      if (transition) {
        var transitionDuration = Util.getTransitionDurationFromElement(this._element);
        $(this._element).one(Util.TRANSITION_END, function (event) {
          return _this2._hideModal(event);
        }).emulateTransitionEnd(transitionDuration);
      } else {
        this._hideModal();
      }
    };

    _proto.dispose = function dispose() {
      [window, this._element, this._dialog].forEach(function (htmlElement) {
        return $(htmlElement).off(EVENT_KEY$5);
      });
      /**
       * `document` has 2 events `Event.FOCUSIN` and `Event.CLICK_DATA_API`
       * Do not move `document` in `htmlElements` array
       * It will remove `Event.CLICK_DATA_API` event that should remain
       */

      $(document).off(Event$5.FOCUSIN);
      $.removeData(this._element, DATA_KEY$5);
      this._config = null;
      this._element = null;
      this._dialog = null;
      this._backdrop = null;
      this._isShown = null;
      this._isBodyOverflowing = null;
      this._ignoreBackdropClick = null;
      this._isTransitioning = null;
      this._scrollbarWidth = null;
    };

    _proto.handleUpdate = function handleUpdate() {
      this._adjustDialog();
    } // Private
    ;

    _proto._getConfig = function _getConfig(config) {
      config = _objectSpread({}, Default$3, config);
      Util.typeCheckConfig(NAME$5, config, DefaultType$3);
      return config;
    };

    _proto._showElement = function _showElement(relatedTarget) {
      var _this3 = this;

      var transition = $(this._element).hasClass(ClassName$5.FADE);

      if (!this._element.parentNode || this._element.parentNode.nodeType !== Node.ELEMENT_NODE) {
        // Don't move modal's DOM position
        document.body.appendChild(this._element);
      }

      this._element.style.display = 'block';

      this._element.removeAttribute('aria-hidden');

      this._element.setAttribute('aria-modal', true);

      if ($(this._dialog).hasClass(ClassName$5.SCROLLABLE)) {
        this._dialog.querySelector(Selector$5.MODAL_BODY).scrollTop = 0;
      } else {
        this._element.scrollTop = 0;
      }

      if (transition) {
        Util.reflow(this._element);
      }

      $(this._element).addClass(ClassName$5.SHOW);

      if (this._config.focus) {
        this._enforceFocus();
      }

      var shownEvent = $.Event(Event$5.SHOWN, {
        relatedTarget: relatedTarget
      });

      var transitionComplete = function transitionComplete() {
        if (_this3._config.focus) {
          _this3._element.focus();
        }

        _this3._isTransitioning = false;
        $(_this3._element).trigger(shownEvent);
      };

      if (transition) {
        var transitionDuration = Util.getTransitionDurationFromElement(this._dialog);
        $(this._dialog).one(Util.TRANSITION_END, transitionComplete).emulateTransitionEnd(transitionDuration);
      } else {
        transitionComplete();
      }
    };

    _proto._enforceFocus = function _enforceFocus() {
      var _this4 = this;

      $(document).off(Event$5.FOCUSIN) // Guard against infinite focus loop
      .on(Event$5.FOCUSIN, function (event) {
        if (document !== event.target && _this4._element !== event.target && $(_this4._element).has(event.target).length === 0) {
          _this4._element.focus();
        }
      });
    };

    _proto._setEscapeEvent = function _setEscapeEvent() {
      var _this5 = this;

      if (this._isShown && this._config.keyboard) {
        $(this._element).on(Event$5.KEYDOWN_DISMISS, function (event) {
          if (event.which === ESCAPE_KEYCODE$1) {
            event.preventDefault();

            _this5.hide();
          }
        });
      } else if (!this._isShown) {
        $(this._element).off(Event$5.KEYDOWN_DISMISS);
      }
    };

    _proto._setResizeEvent = function _setResizeEvent() {
      var _this6 = this;

      if (this._isShown) {
        $(window).on(Event$5.RESIZE, function (event) {
          return _this6.handleUpdate(event);
        });
      } else {
        $(window).off(Event$5.RESIZE);
      }
    };

    _proto._hideModal = function _hideModal() {
      var _this7 = this;

      this._element.style.display = 'none';

      this._element.setAttribute('aria-hidden', true);

      this._element.removeAttribute('aria-modal');

      this._isTransitioning = false;

      this._showBackdrop(function () {
        $(document.body).removeClass(ClassName$5.OPEN);

        _this7._resetAdjustments();

        _this7._resetScrollbar();

        $(_this7._element).trigger(Event$5.HIDDEN);
      });
    };

    _proto._removeBackdrop = function _removeBackdrop() {
      if (this._backdrop) {
        $(this._backdrop).remove();
        this._backdrop = null;
      }
    };

    _proto._showBackdrop = function _showBackdrop(callback) {
      var _this8 = this;

      var animate = $(this._element).hasClass(ClassName$5.FADE) ? ClassName$5.FADE : '';

      if (this._isShown && this._config.backdrop) {
        this._backdrop = document.createElement('div');
        this._backdrop.className = ClassName$5.BACKDROP;

        if (animate) {
          this._backdrop.classList.add(animate);
        }

        $(this._backdrop).appendTo(document.body);
        $(this._element).on(Event$5.CLICK_DISMISS, function (event) {
          if (_this8._ignoreBackdropClick) {
            _this8._ignoreBackdropClick = false;
            return;
          }

          if (event.target !== event.currentTarget) {
            return;
          }

          if (_this8._config.backdrop === 'static') {
            _this8._element.focus();
          } else {
            _this8.hide();
          }
        });

        if (animate) {
          Util.reflow(this._backdrop);
        }

        $(this._backdrop).addClass(ClassName$5.SHOW);

        if (!callback) {
          return;
        }

        if (!animate) {
          callback();
          return;
        }

        var backdropTransitionDuration = Util.getTransitionDurationFromElement(this._backdrop);
        $(this._backdrop).one(Util.TRANSITION_END, callback).emulateTransitionEnd(backdropTransitionDuration);
      } else if (!this._isShown && this._backdrop) {
        $(this._backdrop).removeClass(ClassName$5.SHOW);

        var callbackRemove = function callbackRemove() {
          _this8._removeBackdrop();

          if (callback) {
            callback();
          }
        };

        if ($(this._element).hasClass(ClassName$5.FADE)) {
          var _backdropTransitionDuration = Util.getTransitionDurationFromElement(this._backdrop);

          $(this._backdrop).one(Util.TRANSITION_END, callbackRemove).emulateTransitionEnd(_backdropTransitionDuration);
        } else {
          callbackRemove();
        }
      } else if (callback) {
        callback();
      }
    } // ----------------------------------------------------------------------
    // the following methods are used to handle overflowing modals
    // todo (fat): these should probably be refactored out of modal.js
    // ----------------------------------------------------------------------
    ;

    _proto._adjustDialog = function _adjustDialog() {
      var isModalOverflowing = this._element.scrollHeight > document.documentElement.clientHeight;

      if (!this._isBodyOverflowing && isModalOverflowing) {
        this._element.style.paddingLeft = this._scrollbarWidth + "px";
      }

      if (this._isBodyOverflowing && !isModalOverflowing) {
        this._element.style.paddingRight = this._scrollbarWidth + "px";
      }
    };

    _proto._resetAdjustments = function _resetAdjustments() {
      this._element.style.paddingLeft = '';
      this._element.style.paddingRight = '';
    };

    _proto._checkScrollbar = function _checkScrollbar() {
      var rect = document.body.getBoundingClientRect();
      this._isBodyOverflowing = rect.left + rect.right < window.innerWidth;
      this._scrollbarWidth = this._getScrollbarWidth();
    };

    _proto._setScrollbar = function _setScrollbar() {
      var _this9 = this;

      if (this._isBodyOverflowing) {
        // Note: DOMNode.style.paddingRight returns the actual value or '' if not set
        //   while $(DOMNode).css('padding-right') returns the calculated value or 0 if not set
        var fixedContent = [].slice.call(document.querySelectorAll(Selector$5.FIXED_CONTENT));
        var stickyContent = [].slice.call(document.querySelectorAll(Selector$5.STICKY_CONTENT)); // Adjust fixed content padding

        $(fixedContent).each(function (index, element) {
          var actualPadding = element.style.paddingRight;
          var calculatedPadding = $(element).css('padding-right');
          $(element).data('padding-right', actualPadding).css('padding-right', parseFloat(calculatedPadding) + _this9._scrollbarWidth + "px");
        }); // Adjust sticky content margin

        $(stickyContent).each(function (index, element) {
          var actualMargin = element.style.marginRight;
          var calculatedMargin = $(element).css('margin-right');
          $(element).data('margin-right', actualMargin).css('margin-right', parseFloat(calculatedMargin) - _this9._scrollbarWidth + "px");
        }); // Adjust body padding

        var actualPadding = document.body.style.paddingRight;
        var calculatedPadding = $(document.body).css('padding-right');
        $(document.body).data('padding-right', actualPadding).css('padding-right', parseFloat(calculatedPadding) + this._scrollbarWidth + "px");
      }

      $(document.body).addClass(ClassName$5.OPEN);
    };

    _proto._resetScrollbar = function _resetScrollbar() {
      // Restore fixed content padding
      var fixedContent = [].slice.call(document.querySelectorAll(Selector$5.FIXED_CONTENT));
      $(fixedContent).each(function (index, element) {
        var padding = $(element).data('padding-right');
        $(element).removeData('padding-right');
        element.style.paddingRight = padding ? padding : '';
      }); // Restore sticky content

      var elements = [].slice.call(document.querySelectorAll("" + Selector$5.STICKY_CONTENT));
      $(elements).each(function (index, element) {
        var margin = $(element).data('margin-right');

        if (typeof margin !== 'undefined') {
          $(element).css('margin-right', margin).removeData('margin-right');
        }
      }); // Restore body padding

      var padding = $(document.body).data('padding-right');
      $(document.body).removeData('padding-right');
      document.body.style.paddingRight = padding ? padding : '';
    };

    _proto._getScrollbarWidth = function _getScrollbarWidth() {
      // thx d.walsh
      var scrollDiv = document.createElement('div');
      scrollDiv.className = ClassName$5.SCROLLBAR_MEASURER;
      document.body.appendChild(scrollDiv);
      var scrollbarWidth = scrollDiv.getBoundingClientRect().width - scrollDiv.clientWidth;
      document.body.removeChild(scrollDiv);
      return scrollbarWidth;
    } // Static
    ;

    Modal._jQueryInterface = function _jQueryInterface(config, relatedTarget) {
      return this.each(function () {
        var data = $(this).data(DATA_KEY$5);

        var _config = _objectSpread({}, Default$3, $(this).data(), typeof config === 'object' && config ? config : {});

        if (!data) {
          data = new Modal(this, _config);
          $(this).data(DATA_KEY$5, data);
        }

        if (typeof config === 'string') {
          if (typeof data[config] === 'undefined') {
            throw new TypeError("No method named \"" + config + "\"");
          }

          data[config](relatedTarget);
        } else if (_config.show) {
          data.show(relatedTarget);
        }
      });
    };

    _createClass(Modal, null, [{
      key: "VERSION",
      get: function get() {
        return VERSION$5;
      }
    }, {
      key: "Default",
      get: function get() {
        return Default$3;
      }
    }]);

    return Modal;
  }();
  /**
   * ------------------------------------------------------------------------
   * Data Api implementation
   * ------------------------------------------------------------------------
   */


  $(document).on(Event$5.CLICK_DATA_API, Selector$5.DATA_TOGGLE, function (event) {
    var _this10 = this;

    var target;
    var selector = Util.getSelectorFromElement(this);

    if (selector) {
      target = document.querySelector(selector);
    }

    var config = $(target).data(DATA_KEY$5) ? 'toggle' : _objectSpread({}, $(target).data(), $(this).data());

    if (this.tagName === 'A' || this.tagName === 'AREA') {
      event.preventDefault();
    }

    var $target = $(target).one(Event$5.SHOW, function (showEvent) {
      if (showEvent.isDefaultPrevented()) {
        // Only register focus restorer if modal will actually get shown
        return;
      }

      $target.one(Event$5.HIDDEN, function () {
        if ($(_this10).is(':visible')) {
          _this10.focus();
        }
      });
    });

    Modal._jQueryInterface.call($(target), config, this);
  });
  /**
   * ------------------------------------------------------------------------
   * jQuery
   * ------------------------------------------------------------------------
   */

  $.fn[NAME$5] = Modal._jQueryInterface;
  $.fn[NAME$5].Constructor = Modal;

  $.fn[NAME$5].noConflict = function () {
    $.fn[NAME$5] = JQUERY_NO_CONFLICT$5;
    return Modal._jQueryInterface;
  };

  /**
   * --------------------------------------------------------------------------
   * Bootstrap (v4.3.1): tools/sanitizer.js
   * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
   * --------------------------------------------------------------------------
   */
  var uriAttrs = ['background', 'cite', 'href', 'itemtype', 'longdesc', 'poster', 'src', 'xlink:href'];
  var ARIA_ATTRIBUTE_PATTERN = /^aria-[\w-]*$/i;
  var DefaultWhitelist = {
    // Global attributes allowed on any supplied element below.
    '*': ['class', 'dir', 'id', 'lang', 'role', ARIA_ATTRIBUTE_PATTERN],
    a: ['target', 'href', 'title', 'rel'],
    area: [],
    b: [],
    br: [],
    col: [],
    code: [],
    div: [],
    em: [],
    hr: [],
    h1: [],
    h2: [],
    h3: [],
    h4: [],
    h5: [],
    h6: [],
    i: [],
    img: ['src', 'alt', 'title', 'width', 'height'],
    li: [],
    ol: [],
    p: [],
    pre: [],
    s: [],
    small: [],
    span: [],
    sub: [],
    sup: [],
    strong: [],
    u: [],
    ul: []
    /**
     * A pattern that recognizes a commonly useful subset of URLs that are safe.
     *
     * Shoutout to Angular 7 https://github.com/angular/angular/blob/7.2.4/packages/core/src/sanitization/url_sanitizer.ts
     */

  };
  var SAFE_URL_PATTERN = /^(?:(?:https?|mailto|ftp|tel|file):|[^&:/?#]*(?:[/?#]|$))/gi;
  /**
   * A pattern that matches safe data URLs. Only matches image, video and audio types.
   *
   * Shoutout to Angular 7 https://github.com/angular/angular/blob/7.2.4/packages/core/src/sanitization/url_sanitizer.ts
   */

  var DATA_URL_PATTERN = /^data:(?:image\/(?:bmp|gif|jpeg|jpg|png|tiff|webp)|video\/(?:mpeg|mp4|ogg|webm)|audio\/(?:mp3|oga|ogg|opus));base64,[a-z0-9+/]+=*$/i;

  function allowedAttribute(attr, allowedAttributeList) {
    var attrName = attr.nodeName.toLowerCase();

    if (allowedAttributeList.indexOf(attrName) !== -1) {
      if (uriAttrs.indexOf(attrName) !== -1) {
        return Boolean(attr.nodeValue.match(SAFE_URL_PATTERN) || attr.nodeValue.match(DATA_URL_PATTERN));
      }

      return true;
    }

    var regExp = allowedAttributeList.filter(function (attrRegex) {
      return attrRegex instanceof RegExp;
    }); // Check if a regular expression validates the attribute.

    for (var i = 0, l = regExp.length; i < l; i++) {
      if (attrName.match(regExp[i])) {
        return true;
      }
    }

    return false;
  }

  function sanitizeHtml(unsafeHtml, whiteList, sanitizeFn) {
    if (unsafeHtml.length === 0) {
      return unsafeHtml;
    }

    if (sanitizeFn && typeof sanitizeFn === 'function') {
      return sanitizeFn(unsafeHtml);
    }

    var domParser = new window.DOMParser();
    var createdDocument = domParser.parseFromString(unsafeHtml, 'text/html');
    var whitelistKeys = Object.keys(whiteList);
    var elements = [].slice.call(createdDocument.body.querySelectorAll('*'));

    var _loop = function _loop(i, len) {
      var el = elements[i];
      var elName = el.nodeName.toLowerCase();

      if (whitelistKeys.indexOf(el.nodeName.toLowerCase()) === -1) {
        el.parentNode.removeChild(el);
        return "continue";
      }

      var attributeList = [].slice.call(el.attributes);
      var whitelistedAttributes = [].concat(whiteList['*'] || [], whiteList[elName] || []);
      attributeList.forEach(function (attr) {
        if (!allowedAttribute(attr, whitelistedAttributes)) {
          el.removeAttribute(attr.nodeName);
        }
      });
    };

    for (var i = 0, len = elements.length; i < len; i++) {
      var _ret = _loop(i, len);

      if (_ret === "continue") continue;
    }

    return createdDocument.body.innerHTML;
  }

  /**
   * ------------------------------------------------------------------------
   * Constants
   * ------------------------------------------------------------------------
   */

  var NAME$6 = 'tooltip';
  var VERSION$6 = '4.3.1';
  var DATA_KEY$6 = 'bs.tooltip';
  var EVENT_KEY$6 = "." + DATA_KEY$6;
  var JQUERY_NO_CONFLICT$6 = $.fn[NAME$6];
  var CLASS_PREFIX = 'bs-tooltip';
  var BSCLS_PREFIX_REGEX = new RegExp("(^|\\s)" + CLASS_PREFIX + "\\S+", 'g');
  var DISALLOWED_ATTRIBUTES = ['sanitize', 'whiteList', 'sanitizeFn'];
  var DefaultType$4 = {
    animation: 'boolean',
    template: 'string',
    title: '(string|element|function)',
    trigger: 'string',
    delay: '(number|object)',
    html: 'boolean',
    selector: '(string|boolean)',
    placement: '(string|function)',
    offset: '(number|string|function)',
    container: '(string|element|boolean)',
    fallbackPlacement: '(string|array)',
    boundary: '(string|element)',
    sanitize: 'boolean',
    sanitizeFn: '(null|function)',
    whiteList: 'object'
  };
  var AttachmentMap$1 = {
    AUTO: 'auto',
    TOP: 'top',
    RIGHT: 'right',
    BOTTOM: 'bottom',
    LEFT: 'left'
  };
  var Default$4 = {
    animation: true,
    template: '<div class="tooltip" role="tooltip">' + '<div class="arrow"></div>' + '<div class="tooltip-inner"></div></div>',
    trigger: 'hover focus',
    title: '',
    delay: 0,
    html: false,
    selector: false,
    placement: 'top',
    offset: 0,
    container: false,
    fallbackPlacement: 'flip',
    boundary: 'scrollParent',
    sanitize: true,
    sanitizeFn: null,
    whiteList: DefaultWhitelist
  };
  var HoverState = {
    SHOW: 'show',
    OUT: 'out'
  };
  var Event$6 = {
    HIDE: "hide" + EVENT_KEY$6,
    HIDDEN: "hidden" + EVENT_KEY$6,
    SHOW: "show" + EVENT_KEY$6,
    SHOWN: "shown" + EVENT_KEY$6,
    INSERTED: "inserted" + EVENT_KEY$6,
    CLICK: "click" + EVENT_KEY$6,
    FOCUSIN: "focusin" + EVENT_KEY$6,
    FOCUSOUT: "focusout" + EVENT_KEY$6,
    MOUSEENTER: "mouseenter" + EVENT_KEY$6,
    MOUSELEAVE: "mouseleave" + EVENT_KEY$6
  };
  var ClassName$6 = {
    FADE: 'fade',
    SHOW: 'show'
  };
  var Selector$6 = {
    TOOLTIP: '.tooltip',
    TOOLTIP_INNER: '.tooltip-inner',
    ARROW: '.arrow'
  };
  var Trigger = {
    HOVER: 'hover',
    FOCUS: 'focus',
    CLICK: 'click',
    MANUAL: 'manual'
    /**
     * ------------------------------------------------------------------------
     * Class Definition
     * ------------------------------------------------------------------------
     */

  };

  var Tooltip =
  /*#__PURE__*/
  function () {
    function Tooltip(element, config) {
      /**
       * Check for Popper dependency
       * Popper - https://popper.js.org
       */
      if (typeof Popper === 'undefined') {
        throw new TypeError('Bootstrap\'s tooltips require Popper.js (https://popper.js.org/)');
      } // private


      this._isEnabled = true;
      this._timeout = 0;
      this._hoverState = '';
      this._activeTrigger = {};
      this._popper = null; // Protected

      this.element = element;
      this.config = this._getConfig(config);
      this.tip = null;

      this._setListeners();
    } // Getters


    var _proto = Tooltip.prototype;

    // Public
    _proto.enable = function enable() {
      this._isEnabled = true;
    };

    _proto.disable = function disable() {
      this._isEnabled = false;
    };

    _proto.toggleEnabled = function toggleEnabled() {
      this._isEnabled = !this._isEnabled;
    };

    _proto.toggle = function toggle(event) {
      if (!this._isEnabled) {
        return;
      }

      if (event) {
        var dataKey = this.constructor.DATA_KEY;
        var context = $(event.currentTarget).data(dataKey);

        if (!context) {
          context = new this.constructor(event.currentTarget, this._getDelegateConfig());
          $(event.currentTarget).data(dataKey, context);
        }

        context._activeTrigger.click = !context._activeTrigger.click;

        if (context._isWithActiveTrigger()) {
          context._enter(null, context);
        } else {
          context._leave(null, context);
        }
      } else {
        if ($(this.getTipElement()).hasClass(ClassName$6.SHOW)) {
          this._leave(null, this);

          return;
        }

        this._enter(null, this);
      }
    };

    _proto.dispose = function dispose() {
      clearTimeout(this._timeout);
      $.removeData(this.element, this.constructor.DATA_KEY);
      $(this.element).off(this.constructor.EVENT_KEY);
      $(this.element).closest('.modal').off('hide.bs.modal');

      if (this.tip) {
        $(this.tip).remove();
      }

      this._isEnabled = null;
      this._timeout = null;
      this._hoverState = null;
      this._activeTrigger = null;

      if (this._popper !== null) {
        this._popper.destroy();
      }

      this._popper = null;
      this.element = null;
      this.config = null;
      this.tip = null;
    };

    _proto.show = function show() {
      var _this = this;

      if ($(this.element).css('display') === 'none') {
        throw new Error('Please use show on visible elements');
      }

      var showEvent = $.Event(this.constructor.Event.SHOW);

      if (this.isWithContent() && this._isEnabled) {
        $(this.element).trigger(showEvent);
        var shadowRoot = Util.findShadowRoot(this.element);
        var isInTheDom = $.contains(shadowRoot !== null ? shadowRoot : this.element.ownerDocument.documentElement, this.element);

        if (showEvent.isDefaultPrevented() || !isInTheDom) {
          return;
        }

        var tip = this.getTipElement();
        var tipId = Util.getUID(this.constructor.NAME);
        tip.setAttribute('id', tipId);
        this.element.setAttribute('aria-describedby', tipId);
        this.setContent();

        if (this.config.animation) {
          $(tip).addClass(ClassName$6.FADE);
        }

        var placement = typeof this.config.placement === 'function' ? this.config.placement.call(this, tip, this.element) : this.config.placement;

        var attachment = this._getAttachment(placement);

        this.addAttachmentClass(attachment);

        var container = this._getContainer();

        $(tip).data(this.constructor.DATA_KEY, this);

        if (!$.contains(this.element.ownerDocument.documentElement, this.tip)) {
          $(tip).appendTo(container);
        }

        $(this.element).trigger(this.constructor.Event.INSERTED);
        this._popper = new Popper(this.element, tip, {
          placement: attachment,
          modifiers: {
            offset: this._getOffset(),
            flip: {
              behavior: this.config.fallbackPlacement
            },
            arrow: {
              element: Selector$6.ARROW
            },
            preventOverflow: {
              boundariesElement: this.config.boundary
            }
          },
          onCreate: function onCreate(data) {
            if (data.originalPlacement !== data.placement) {
              _this._handlePopperPlacementChange(data);
            }
          },
          onUpdate: function onUpdate(data) {
            return _this._handlePopperPlacementChange(data);
          }
        });
        $(tip).addClass(ClassName$6.SHOW); // If this is a touch-enabled device we add extra
        // empty mouseover listeners to the body's immediate children;
        // only needed because of broken event delegation on iOS
        // https://www.quirksmode.org/blog/archives/2014/02/mouse_event_bub.html

        if ('ontouchstart' in document.documentElement) {
          $(document.body).children().on('mouseover', null, $.noop);
        }

        var complete = function complete() {
          if (_this.config.animation) {
            _this._fixTransition();
          }

          var prevHoverState = _this._hoverState;
          _this._hoverState = null;
          $(_this.element).trigger(_this.constructor.Event.SHOWN);

          if (prevHoverState === HoverState.OUT) {
            _this._leave(null, _this);
          }
        };

        if ($(this.tip).hasClass(ClassName$6.FADE)) {
          var transitionDuration = Util.getTransitionDurationFromElement(this.tip);
          $(this.tip).one(Util.TRANSITION_END, complete).emulateTransitionEnd(transitionDuration);
        } else {
          complete();
        }
      }
    };

    _proto.hide = function hide(callback) {
      var _this2 = this;

      var tip = this.getTipElement();
      var hideEvent = $.Event(this.constructor.Event.HIDE);

      var complete = function complete() {
        if (_this2._hoverState !== HoverState.SHOW && tip.parentNode) {
          tip.parentNode.removeChild(tip);
        }

        _this2._cleanTipClass();

        _this2.element.removeAttribute('aria-describedby');

        $(_this2.element).trigger(_this2.constructor.Event.HIDDEN);

        if (_this2._popper !== null) {
          _this2._popper.destroy();
        }

        if (callback) {
          callback();
        }
      };

      $(this.element).trigger(hideEvent);

      if (hideEvent.isDefaultPrevented()) {
        return;
      }

      $(tip).removeClass(ClassName$6.SHOW); // If this is a touch-enabled device we remove the extra
      // empty mouseover listeners we added for iOS support

      if ('ontouchstart' in document.documentElement) {
        $(document.body).children().off('mouseover', null, $.noop);
      }

      this._activeTrigger[Trigger.CLICK] = false;
      this._activeTrigger[Trigger.FOCUS] = false;
      this._activeTrigger[Trigger.HOVER] = false;

      if ($(this.tip).hasClass(ClassName$6.FADE)) {
        var transitionDuration = Util.getTransitionDurationFromElement(tip);
        $(tip).one(Util.TRANSITION_END, complete).emulateTransitionEnd(transitionDuration);
      } else {
        complete();
      }

      this._hoverState = '';
    };

    _proto.update = function update() {
      if (this._popper !== null) {
        this._popper.scheduleUpdate();
      }
    } // Protected
    ;

    _proto.isWithContent = function isWithContent() {
      return Boolean(this.getTitle());
    };

    _proto.addAttachmentClass = function addAttachmentClass(attachment) {
      $(this.getTipElement()).addClass(CLASS_PREFIX + "-" + attachment);
    };

    _proto.getTipElement = function getTipElement() {
      this.tip = this.tip || $(this.config.template)[0];
      return this.tip;
    };

    _proto.setContent = function setContent() {
      var tip = this.getTipElement();
      this.setElementContent($(tip.querySelectorAll(Selector$6.TOOLTIP_INNER)), this.getTitle());
      $(tip).removeClass(ClassName$6.FADE + " " + ClassName$6.SHOW);
    };

    _proto.setElementContent = function setElementContent($element, content) {
      if (typeof content === 'object' && (content.nodeType || content.jquery)) {
        // Content is a DOM node or a jQuery
        if (this.config.html) {
          if (!$(content).parent().is($element)) {
            $element.empty().append(content);
          }
        } else {
          $element.text($(content).text());
        }

        return;
      }

      if (this.config.html) {
        if (this.config.sanitize) {
          content = sanitizeHtml(content, this.config.whiteList, this.config.sanitizeFn);
        }

        $element.html(content);
      } else {
        $element.text(content);
      }
    };

    _proto.getTitle = function getTitle() {
      var title = this.element.getAttribute('data-original-title');

      if (!title) {
        title = typeof this.config.title === 'function' ? this.config.title.call(this.element) : this.config.title;
      }

      return title;
    } // Private
    ;

    _proto._getOffset = function _getOffset() {
      var _this3 = this;

      var offset = {};

      if (typeof this.config.offset === 'function') {
        offset.fn = function (data) {
          data.offsets = _objectSpread({}, data.offsets, _this3.config.offset(data.offsets, _this3.element) || {});
          return data;
        };
      } else {
        offset.offset = this.config.offset;
      }

      return offset;
    };

    _proto._getContainer = function _getContainer() {
      if (this.config.container === false) {
        return document.body;
      }

      if (Util.isElement(this.config.container)) {
        return $(this.config.container);
      }

      return $(document).find(this.config.container);
    };

    _proto._getAttachment = function _getAttachment(placement) {
      return AttachmentMap$1[placement.toUpperCase()];
    };

    _proto._setListeners = function _setListeners() {
      var _this4 = this;

      var triggers = this.config.trigger.split(' ');
      triggers.forEach(function (trigger) {
        if (trigger === 'click') {
          $(_this4.element).on(_this4.constructor.Event.CLICK, _this4.config.selector, function (event) {
            return _this4.toggle(event);
          });
        } else if (trigger !== Trigger.MANUAL) {
          var eventIn = trigger === Trigger.HOVER ? _this4.constructor.Event.MOUSEENTER : _this4.constructor.Event.FOCUSIN;
          var eventOut = trigger === Trigger.HOVER ? _this4.constructor.Event.MOUSELEAVE : _this4.constructor.Event.FOCUSOUT;
          $(_this4.element).on(eventIn, _this4.config.selector, function (event) {
            return _this4._enter(event);
          }).on(eventOut, _this4.config.selector, function (event) {
            return _this4._leave(event);
          });
        }
      });
      $(this.element).closest('.modal').on('hide.bs.modal', function () {
        if (_this4.element) {
          _this4.hide();
        }
      });

      if (this.config.selector) {
        this.config = _objectSpread({}, this.config, {
          trigger: 'manual',
          selector: ''
        });
      } else {
        this._fixTitle();
      }
    };

    _proto._fixTitle = function _fixTitle() {
      var titleType = typeof this.element.getAttribute('data-original-title');

      if (this.element.getAttribute('title') || titleType !== 'string') {
        this.element.setAttribute('data-original-title', this.element.getAttribute('title') || '');
        this.element.setAttribute('title', '');
      }
    };

    _proto._enter = function _enter(event, context) {
      var dataKey = this.constructor.DATA_KEY;
      context = context || $(event.currentTarget).data(dataKey);

      if (!context) {
        context = new this.constructor(event.currentTarget, this._getDelegateConfig());
        $(event.currentTarget).data(dataKey, context);
      }

      if (event) {
        context._activeTrigger[event.type === 'focusin' ? Trigger.FOCUS : Trigger.HOVER] = true;
      }

      if ($(context.getTipElement()).hasClass(ClassName$6.SHOW) || context._hoverState === HoverState.SHOW) {
        context._hoverState = HoverState.SHOW;
        return;
      }

      clearTimeout(context._timeout);
      context._hoverState = HoverState.SHOW;

      if (!context.config.delay || !context.config.delay.show) {
        context.show();
        return;
      }

      context._timeout = setTimeout(function () {
        if (context._hoverState === HoverState.SHOW) {
          context.show();
        }
      }, context.config.delay.show);
    };

    _proto._leave = function _leave(event, context) {
      var dataKey = this.constructor.DATA_KEY;
      context = context || $(event.currentTarget).data(dataKey);

      if (!context) {
        context = new this.constructor(event.currentTarget, this._getDelegateConfig());
        $(event.currentTarget).data(dataKey, context);
      }

      if (event) {
        context._activeTrigger[event.type === 'focusout' ? Trigger.FOCUS : Trigger.HOVER] = false;
      }

      if (context._isWithActiveTrigger()) {
        return;
      }

      clearTimeout(context._timeout);
      context._hoverState = HoverState.OUT;

      if (!context.config.delay || !context.config.delay.hide) {
        context.hide();
        return;
      }

      context._timeout = setTimeout(function () {
        if (context._hoverState === HoverState.OUT) {
          context.hide();
        }
      }, context.config.delay.hide);
    };

    _proto._isWithActiveTrigger = function _isWithActiveTrigger() {
      for (var trigger in this._activeTrigger) {
        if (this._activeTrigger[trigger]) {
          return true;
        }
      }

      return false;
    };

    _proto._getConfig = function _getConfig(config) {
      var dataAttributes = $(this.element).data();
      Object.keys(dataAttributes).forEach(function (dataAttr) {
        if (DISALLOWED_ATTRIBUTES.indexOf(dataAttr) !== -1) {
          delete dataAttributes[dataAttr];
        }
      });
      config = _objectSpread({}, this.constructor.Default, dataAttributes, typeof config === 'object' && config ? config : {});

      if (typeof config.delay === 'number') {
        config.delay = {
          show: config.delay,
          hide: config.delay
        };
      }

      if (typeof config.title === 'number') {
        config.title = config.title.toString();
      }

      if (typeof config.content === 'number') {
        config.content = config.content.toString();
      }

      Util.typeCheckConfig(NAME$6, config, this.constructor.DefaultType);

      if (config.sanitize) {
        config.template = sanitizeHtml(config.template, config.whiteList, config.sanitizeFn);
      }

      return config;
    };

    _proto._getDelegateConfig = function _getDelegateConfig() {
      var config = {};

      if (this.config) {
        for (var key in this.config) {
          if (this.constructor.Default[key] !== this.config[key]) {
            config[key] = this.config[key];
          }
        }
      }

      return config;
    };

    _proto._cleanTipClass = function _cleanTipClass() {
      var $tip = $(this.getTipElement());
      var tabClass = $tip.attr('class').match(BSCLS_PREFIX_REGEX);

      if (tabClass !== null && tabClass.length) {
        $tip.removeClass(tabClass.join(''));
      }
    };

    _proto._handlePopperPlacementChange = function _handlePopperPlacementChange(popperData) {
      var popperInstance = popperData.instance;
      this.tip = popperInstance.popper;

      this._cleanTipClass();

      this.addAttachmentClass(this._getAttachment(popperData.placement));
    };

    _proto._fixTransition = function _fixTransition() {
      var tip = this.getTipElement();
      var initConfigAnimation = this.config.animation;

      if (tip.getAttribute('x-placement') !== null) {
        return;
      }

      $(tip).removeClass(ClassName$6.FADE);
      this.config.animation = false;
      this.hide();
      this.show();
      this.config.animation = initConfigAnimation;
    } // Static
    ;

    Tooltip._jQueryInterface = function _jQueryInterface(config) {
      return this.each(function () {
        var data = $(this).data(DATA_KEY$6);

        var _config = typeof config === 'object' && config;

        if (!data && /dispose|hide/.test(config)) {
          return;
        }

        if (!data) {
          data = new Tooltip(this, _config);
          $(this).data(DATA_KEY$6, data);
        }

        if (typeof config === 'string') {
          if (typeof data[config] === 'undefined') {
            throw new TypeError("No method named \"" + config + "\"");
          }

          data[config]();
        }
      });
    };

    _createClass(Tooltip, null, [{
      key: "VERSION",
      get: function get() {
        return VERSION$6;
      }
    }, {
      key: "Default",
      get: function get() {
        return Default$4;
      }
    }, {
      key: "NAME",
      get: function get() {
        return NAME$6;
      }
    }, {
      key: "DATA_KEY",
      get: function get() {
        return DATA_KEY$6;
      }
    }, {
      key: "Event",
      get: function get() {
        return Event$6;
      }
    }, {
      key: "EVENT_KEY",
      get: function get() {
        return EVENT_KEY$6;
      }
    }, {
      key: "DefaultType",
      get: function get() {
        return DefaultType$4;
      }
    }]);

    return Tooltip;
  }();
  /**
   * ------------------------------------------------------------------------
   * jQuery
   * ------------------------------------------------------------------------
   */


  $.fn[NAME$6] = Tooltip._jQueryInterface;
  $.fn[NAME$6].Constructor = Tooltip;

  $.fn[NAME$6].noConflict = function () {
    $.fn[NAME$6] = JQUERY_NO_CONFLICT$6;
    return Tooltip._jQueryInterface;
  };

  /**
   * ------------------------------------------------------------------------
   * Constants
   * ------------------------------------------------------------------------
   */

  var NAME$7 = 'popover';
  var VERSION$7 = '4.3.1';
  var DATA_KEY$7 = 'bs.popover';
  var EVENT_KEY$7 = "." + DATA_KEY$7;
  var JQUERY_NO_CONFLICT$7 = $.fn[NAME$7];
  var CLASS_PREFIX$1 = 'bs-popover';
  var BSCLS_PREFIX_REGEX$1 = new RegExp("(^|\\s)" + CLASS_PREFIX$1 + "\\S+", 'g');

  var Default$5 = _objectSpread({}, Tooltip.Default, {
    placement: 'right',
    trigger: 'click',
    content: '',
    template: '<div class="popover" role="tooltip">' + '<div class="arrow"></div>' + '<h3 class="popover-header"></h3>' + '<div class="popover-body"></div></div>'
  });

  var DefaultType$5 = _objectSpread({}, Tooltip.DefaultType, {
    content: '(string|element|function)'
  });

  var ClassName$7 = {
    FADE: 'fade',
    SHOW: 'show'
  };
  var Selector$7 = {
    TITLE: '.popover-header',
    CONTENT: '.popover-body'
  };
  var Event$7 = {
    HIDE: "hide" + EVENT_KEY$7,
    HIDDEN: "hidden" + EVENT_KEY$7,
    SHOW: "show" + EVENT_KEY$7,
    SHOWN: "shown" + EVENT_KEY$7,
    INSERTED: "inserted" + EVENT_KEY$7,
    CLICK: "click" + EVENT_KEY$7,
    FOCUSIN: "focusin" + EVENT_KEY$7,
    FOCUSOUT: "focusout" + EVENT_KEY$7,
    MOUSEENTER: "mouseenter" + EVENT_KEY$7,
    MOUSELEAVE: "mouseleave" + EVENT_KEY$7
    /**
     * ------------------------------------------------------------------------
     * Class Definition
     * ------------------------------------------------------------------------
     */

  };

  var Popover =
  /*#__PURE__*/
  function (_Tooltip) {
    _inheritsLoose(Popover, _Tooltip);

    function Popover() {
      return _Tooltip.apply(this, arguments) || this;
    }

    var _proto = Popover.prototype;

    // Overrides
    _proto.isWithContent = function isWithContent() {
      return this.getTitle() || this._getContent();
    };

    _proto.addAttachmentClass = function addAttachmentClass(attachment) {
      $(this.getTipElement()).addClass(CLASS_PREFIX$1 + "-" + attachment);
    };

    _proto.getTipElement = function getTipElement() {
      this.tip = this.tip || $(this.config.template)[0];
      return this.tip;
    };

    _proto.setContent = function setContent() {
      var $tip = $(this.getTipElement()); // We use append for html objects to maintain js events

      this.setElementContent($tip.find(Selector$7.TITLE), this.getTitle());

      var content = this._getContent();

      if (typeof content === 'function') {
        content = content.call(this.element);
      }

      this.setElementContent($tip.find(Selector$7.CONTENT), content);
      $tip.removeClass(ClassName$7.FADE + " " + ClassName$7.SHOW);
    } // Private
    ;

    _proto._getContent = function _getContent() {
      return this.element.getAttribute('data-content') || this.config.content;
    };

    _proto._cleanTipClass = function _cleanTipClass() {
      var $tip = $(this.getTipElement());
      var tabClass = $tip.attr('class').match(BSCLS_PREFIX_REGEX$1);

      if (tabClass !== null && tabClass.length > 0) {
        $tip.removeClass(tabClass.join(''));
      }
    } // Static
    ;

    Popover._jQueryInterface = function _jQueryInterface(config) {
      return this.each(function () {
        var data = $(this).data(DATA_KEY$7);

        var _config = typeof config === 'object' ? config : null;

        if (!data && /dispose|hide/.test(config)) {
          return;
        }

        if (!data) {
          data = new Popover(this, _config);
          $(this).data(DATA_KEY$7, data);
        }

        if (typeof config === 'string') {
          if (typeof data[config] === 'undefined') {
            throw new TypeError("No method named \"" + config + "\"");
          }

          data[config]();
        }
      });
    };

    _createClass(Popover, null, [{
      key: "VERSION",
      // Getters
      get: function get() {
        return VERSION$7;
      }
    }, {
      key: "Default",
      get: function get() {
        return Default$5;
      }
    }, {
      key: "NAME",
      get: function get() {
        return NAME$7;
      }
    }, {
      key: "DATA_KEY",
      get: function get() {
        return DATA_KEY$7;
      }
    }, {
      key: "Event",
      get: function get() {
        return Event$7;
      }
    }, {
      key: "EVENT_KEY",
      get: function get() {
        return EVENT_KEY$7;
      }
    }, {
      key: "DefaultType",
      get: function get() {
        return DefaultType$5;
      }
    }]);

    return Popover;
  }(Tooltip);
  /**
   * ------------------------------------------------------------------------
   * jQuery
   * ------------------------------------------------------------------------
   */


  $.fn[NAME$7] = Popover._jQueryInterface;
  $.fn[NAME$7].Constructor = Popover;

  $.fn[NAME$7].noConflict = function () {
    $.fn[NAME$7] = JQUERY_NO_CONFLICT$7;
    return Popover._jQueryInterface;
  };

  /**
   * ------------------------------------------------------------------------
   * Constants
   * ------------------------------------------------------------------------
   */

  var NAME$8 = 'scrollspy';
  var VERSION$8 = '4.3.1';
  var DATA_KEY$8 = 'bs.scrollspy';
  var EVENT_KEY$8 = "." + DATA_KEY$8;
  var DATA_API_KEY$6 = '.data-api';
  var JQUERY_NO_CONFLICT$8 = $.fn[NAME$8];
  var Default$6 = {
    offset: 10,
    method: 'auto',
    target: ''
  };
  var DefaultType$6 = {
    offset: 'number',
    method: 'string',
    target: '(string|element)'
  };
  var Event$8 = {
    ACTIVATE: "activate" + EVENT_KEY$8,
    SCROLL: "scroll" + EVENT_KEY$8,
    LOAD_DATA_API: "load" + EVENT_KEY$8 + DATA_API_KEY$6
  };
  var ClassName$8 = {
    DROPDOWN_ITEM: 'dropdown-item',
    DROPDOWN_MENU: 'dropdown-menu',
    ACTIVE: 'active'
  };
  var Selector$8 = {
    DATA_SPY: '[data-spy="scroll"]',
    ACTIVE: '.active',
    NAV_LIST_GROUP: '.nav, .list-group',
    NAV_LINKS: '.nav-link',
    NAV_ITEMS: '.nav-item',
    LIST_ITEMS: '.list-group-item',
    DROPDOWN: '.dropdown',
    DROPDOWN_ITEMS: '.dropdown-item',
    DROPDOWN_TOGGLE: '.dropdown-toggle'
  };
  var OffsetMethod = {
    OFFSET: 'offset',
    POSITION: 'position'
    /**
     * ------------------------------------------------------------------------
     * Class Definition
     * ------------------------------------------------------------------------
     */

  };

  var ScrollSpy =
  /*#__PURE__*/
  function () {
    function ScrollSpy(element, config) {
      var _this = this;

      this._element = element;
      this._scrollElement = element.tagName === 'BODY' ? window : element;
      this._config = this._getConfig(config);
      this._selector = this._config.target + " " + Selector$8.NAV_LINKS + "," + (this._config.target + " " + Selector$8.LIST_ITEMS + ",") + (this._config.target + " " + Selector$8.DROPDOWN_ITEMS);
      this._offsets = [];
      this._targets = [];
      this._activeTarget = null;
      this._scrollHeight = 0;
      $(this._scrollElement).on(Event$8.SCROLL, function (event) {
        return _this._process(event);
      });
      this.refresh();

      this._process();
    } // Getters


    var _proto = ScrollSpy.prototype;

    // Public
    _proto.refresh = function refresh() {
      var _this2 = this;

      var autoMethod = this._scrollElement === this._scrollElement.window ? OffsetMethod.OFFSET : OffsetMethod.POSITION;
      var offsetMethod = this._config.method === 'auto' ? autoMethod : this._config.method;
      var offsetBase = offsetMethod === OffsetMethod.POSITION ? this._getScrollTop() : 0;
      this._offsets = [];
      this._targets = [];
      this._scrollHeight = this._getScrollHeight();
      var targets = [].slice.call(document.querySelectorAll(this._selector));
      targets.map(function (element) {
        var target;
        var targetSelector = Util.getSelectorFromElement(element);

        if (targetSelector) {
          target = document.querySelector(targetSelector);
        }

        if (target) {
          var targetBCR = target.getBoundingClientRect();

          if (targetBCR.width || targetBCR.height) {
            // TODO (fat): remove sketch reliance on jQuery position/offset
            return [$(target)[offsetMethod]().top + offsetBase, targetSelector];
          }
        }

        return null;
      }).filter(function (item) {
        return item;
      }).sort(function (a, b) {
        return a[0] - b[0];
      }).forEach(function (item) {
        _this2._offsets.push(item[0]);

        _this2._targets.push(item[1]);
      });
    };

    _proto.dispose = function dispose() {
      $.removeData(this._element, DATA_KEY$8);
      $(this._scrollElement).off(EVENT_KEY$8);
      this._element = null;
      this._scrollElement = null;
      this._config = null;
      this._selector = null;
      this._offsets = null;
      this._targets = null;
      this._activeTarget = null;
      this._scrollHeight = null;
    } // Private
    ;

    _proto._getConfig = function _getConfig(config) {
      config = _objectSpread({}, Default$6, typeof config === 'object' && config ? config : {});

      if (typeof config.target !== 'string') {
        var id = $(config.target).attr('id');

        if (!id) {
          id = Util.getUID(NAME$8);
          $(config.target).attr('id', id);
        }

        config.target = "#" + id;
      }

      Util.typeCheckConfig(NAME$8, config, DefaultType$6);
      return config;
    };

    _proto._getScrollTop = function _getScrollTop() {
      return this._scrollElement === window ? this._scrollElement.pageYOffset : this._scrollElement.scrollTop;
    };

    _proto._getScrollHeight = function _getScrollHeight() {
      return this._scrollElement.scrollHeight || Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    };

    _proto._getOffsetHeight = function _getOffsetHeight() {
      return this._scrollElement === window ? window.innerHeight : this._scrollElement.getBoundingClientRect().height;
    };

    _proto._process = function _process() {
      var scrollTop = this._getScrollTop() + this._config.offset;

      var scrollHeight = this._getScrollHeight();

      var maxScroll = this._config.offset + scrollHeight - this._getOffsetHeight();

      if (this._scrollHeight !== scrollHeight) {
        this.refresh();
      }

      if (scrollTop >= maxScroll) {
        var target = this._targets[this._targets.length - 1];

        if (this._activeTarget !== target) {
          this._activate(target);
        }

        return;
      }

      if (this._activeTarget && scrollTop < this._offsets[0] && this._offsets[0] > 0) {
        this._activeTarget = null;

        this._clear();

        return;
      }

      var offsetLength = this._offsets.length;

      for (var i = offsetLength; i--;) {
        var isActiveTarget = this._activeTarget !== this._targets[i] && scrollTop >= this._offsets[i] && (typeof this._offsets[i + 1] === 'undefined' || scrollTop < this._offsets[i + 1]);

        if (isActiveTarget) {
          this._activate(this._targets[i]);
        }
      }
    };

    _proto._activate = function _activate(target) {
      this._activeTarget = target;

      this._clear();

      var queries = this._selector.split(',').map(function (selector) {
        return selector + "[data-target=\"" + target + "\"]," + selector + "[href=\"" + target + "\"]";
      });

      var $link = $([].slice.call(document.querySelectorAll(queries.join(','))));

      if ($link.hasClass(ClassName$8.DROPDOWN_ITEM)) {
        $link.closest(Selector$8.DROPDOWN).find(Selector$8.DROPDOWN_TOGGLE).addClass(ClassName$8.ACTIVE);
        $link.addClass(ClassName$8.ACTIVE);
      } else {
        // Set triggered link as active
        $link.addClass(ClassName$8.ACTIVE); // Set triggered links parents as active
        // With both <ul> and <nav> markup a parent is the previous sibling of any nav ancestor

        $link.parents(Selector$8.NAV_LIST_GROUP).prev(Selector$8.NAV_LINKS + ", " + Selector$8.LIST_ITEMS).addClass(ClassName$8.ACTIVE); // Handle special case when .nav-link is inside .nav-item

        $link.parents(Selector$8.NAV_LIST_GROUP).prev(Selector$8.NAV_ITEMS).children(Selector$8.NAV_LINKS).addClass(ClassName$8.ACTIVE);
      }

      $(this._scrollElement).trigger(Event$8.ACTIVATE, {
        relatedTarget: target
      });
    };

    _proto._clear = function _clear() {
      [].slice.call(document.querySelectorAll(this._selector)).filter(function (node) {
        return node.classList.contains(ClassName$8.ACTIVE);
      }).forEach(function (node) {
        return node.classList.remove(ClassName$8.ACTIVE);
      });
    } // Static
    ;

    ScrollSpy._jQueryInterface = function _jQueryInterface(config) {
      return this.each(function () {
        var data = $(this).data(DATA_KEY$8);

        var _config = typeof config === 'object' && config;

        if (!data) {
          data = new ScrollSpy(this, _config);
          $(this).data(DATA_KEY$8, data);
        }

        if (typeof config === 'string') {
          if (typeof data[config] === 'undefined') {
            throw new TypeError("No method named \"" + config + "\"");
          }

          data[config]();
        }
      });
    };

    _createClass(ScrollSpy, null, [{
      key: "VERSION",
      get: function get() {
        return VERSION$8;
      }
    }, {
      key: "Default",
      get: function get() {
        return Default$6;
      }
    }]);

    return ScrollSpy;
  }();
  /**
   * ------------------------------------------------------------------------
   * Data Api implementation
   * ------------------------------------------------------------------------
   */


  $(window).on(Event$8.LOAD_DATA_API, function () {
    var scrollSpys = [].slice.call(document.querySelectorAll(Selector$8.DATA_SPY));
    var scrollSpysLength = scrollSpys.length;

    for (var i = scrollSpysLength; i--;) {
      var $spy = $(scrollSpys[i]);

      ScrollSpy._jQueryInterface.call($spy, $spy.data());
    }
  });
  /**
   * ------------------------------------------------------------------------
   * jQuery
   * ------------------------------------------------------------------------
   */

  $.fn[NAME$8] = ScrollSpy._jQueryInterface;
  $.fn[NAME$8].Constructor = ScrollSpy;

  $.fn[NAME$8].noConflict = function () {
    $.fn[NAME$8] = JQUERY_NO_CONFLICT$8;
    return ScrollSpy._jQueryInterface;
  };

  /**
   * ------------------------------------------------------------------------
   * Constants
   * ------------------------------------------------------------------------
   */

  var NAME$9 = 'tab';
  var VERSION$9 = '4.3.1';
  var DATA_KEY$9 = 'bs.tab';
  var EVENT_KEY$9 = "." + DATA_KEY$9;
  var DATA_API_KEY$7 = '.data-api';
  var JQUERY_NO_CONFLICT$9 = $.fn[NAME$9];
  var Event$9 = {
    HIDE: "hide" + EVENT_KEY$9,
    HIDDEN: "hidden" + EVENT_KEY$9,
    SHOW: "show" + EVENT_KEY$9,
    SHOWN: "shown" + EVENT_KEY$9,
    CLICK_DATA_API: "click" + EVENT_KEY$9 + DATA_API_KEY$7
  };
  var ClassName$9 = {
    DROPDOWN_MENU: 'dropdown-menu',
    ACTIVE: 'active',
    DISABLED: 'disabled',
    FADE: 'fade',
    SHOW: 'show'
  };
  var Selector$9 = {
    DROPDOWN: '.dropdown',
    NAV_LIST_GROUP: '.nav, .list-group',
    ACTIVE: '.active',
    ACTIVE_UL: '> li > .active',
    DATA_TOGGLE: '[data-toggle="tab"], [data-toggle="pill"], [data-toggle="list"]',
    DROPDOWN_TOGGLE: '.dropdown-toggle',
    DROPDOWN_ACTIVE_CHILD: '> .dropdown-menu .active'
    /**
     * ------------------------------------------------------------------------
     * Class Definition
     * ------------------------------------------------------------------------
     */

  };

  var Tab =
  /*#__PURE__*/
  function () {
    function Tab(element) {
      this._element = element;
    } // Getters


    var _proto = Tab.prototype;

    // Public
    _proto.show = function show() {
      var _this = this;

      if (this._element.parentNode && this._element.parentNode.nodeType === Node.ELEMENT_NODE && $(this._element).hasClass(ClassName$9.ACTIVE) || $(this._element).hasClass(ClassName$9.DISABLED)) {
        return;
      }

      var target;
      var previous;
      var listElement = $(this._element).closest(Selector$9.NAV_LIST_GROUP)[0];
      var selector = Util.getSelectorFromElement(this._element);

      if (listElement) {
        var itemSelector = listElement.nodeName === 'UL' || listElement.nodeName === 'OL' ? Selector$9.ACTIVE_UL : Selector$9.ACTIVE;
        previous = $.makeArray($(listElement).find(itemSelector));
        previous = previous[previous.length - 1];
      }

      var hideEvent = $.Event(Event$9.HIDE, {
        relatedTarget: this._element
      });
      var showEvent = $.Event(Event$9.SHOW, {
        relatedTarget: previous
      });

      if (previous) {
        $(previous).trigger(hideEvent);
      }

      $(this._element).trigger(showEvent);

      if (showEvent.isDefaultPrevented() || hideEvent.isDefaultPrevented()) {
        return;
      }

      if (selector) {
        target = document.querySelector(selector);
      }

      this._activate(this._element, listElement);

      var complete = function complete() {
        var hiddenEvent = $.Event(Event$9.HIDDEN, {
          relatedTarget: _this._element
        });
        var shownEvent = $.Event(Event$9.SHOWN, {
          relatedTarget: previous
        });
        $(previous).trigger(hiddenEvent);
        $(_this._element).trigger(shownEvent);
      };

      if (target) {
        this._activate(target, target.parentNode, complete);
      } else {
        complete();
      }
    };

    _proto.dispose = function dispose() {
      $.removeData(this._element, DATA_KEY$9);
      this._element = null;
    } // Private
    ;

    _proto._activate = function _activate(element, container, callback) {
      var _this2 = this;

      var activeElements = container && (container.nodeName === 'UL' || container.nodeName === 'OL') ? $(container).find(Selector$9.ACTIVE_UL) : $(container).children(Selector$9.ACTIVE);
      var active = activeElements[0];
      var isTransitioning = callback && active && $(active).hasClass(ClassName$9.FADE);

      var complete = function complete() {
        return _this2._transitionComplete(element, active, callback);
      };

      if (active && isTransitioning) {
        var transitionDuration = Util.getTransitionDurationFromElement(active);
        $(active).removeClass(ClassName$9.SHOW).one(Util.TRANSITION_END, complete).emulateTransitionEnd(transitionDuration);
      } else {
        complete();
      }
    };

    _proto._transitionComplete = function _transitionComplete(element, active, callback) {
      if (active) {
        $(active).removeClass(ClassName$9.ACTIVE);
        var dropdownChild = $(active.parentNode).find(Selector$9.DROPDOWN_ACTIVE_CHILD)[0];

        if (dropdownChild) {
          $(dropdownChild).removeClass(ClassName$9.ACTIVE);
        }

        if (active.getAttribute('role') === 'tab') {
          active.setAttribute('aria-selected', false);
        }
      }

      $(element).addClass(ClassName$9.ACTIVE);

      if (element.getAttribute('role') === 'tab') {
        element.setAttribute('aria-selected', true);
      }

      Util.reflow(element);

      if (element.classList.contains(ClassName$9.FADE)) {
        element.classList.add(ClassName$9.SHOW);
      }

      if (element.parentNode && $(element.parentNode).hasClass(ClassName$9.DROPDOWN_MENU)) {
        var dropdownElement = $(element).closest(Selector$9.DROPDOWN)[0];

        if (dropdownElement) {
          var dropdownToggleList = [].slice.call(dropdownElement.querySelectorAll(Selector$9.DROPDOWN_TOGGLE));
          $(dropdownToggleList).addClass(ClassName$9.ACTIVE);
        }

        element.setAttribute('aria-expanded', true);
      }

      if (callback) {
        callback();
      }
    } // Static
    ;

    Tab._jQueryInterface = function _jQueryInterface(config) {
      return this.each(function () {
        var $this = $(this);
        var data = $this.data(DATA_KEY$9);

        if (!data) {
          data = new Tab(this);
          $this.data(DATA_KEY$9, data);
        }

        if (typeof config === 'string') {
          if (typeof data[config] === 'undefined') {
            throw new TypeError("No method named \"" + config + "\"");
          }

          data[config]();
        }
      });
    };

    _createClass(Tab, null, [{
      key: "VERSION",
      get: function get() {
        return VERSION$9;
      }
    }]);

    return Tab;
  }();
  /**
   * ------------------------------------------------------------------------
   * Data Api implementation
   * ------------------------------------------------------------------------
   */


  $(document).on(Event$9.CLICK_DATA_API, Selector$9.DATA_TOGGLE, function (event) {
    event.preventDefault();

    Tab._jQueryInterface.call($(this), 'show');
  });
  /**
   * ------------------------------------------------------------------------
   * jQuery
   * ------------------------------------------------------------------------
   */

  $.fn[NAME$9] = Tab._jQueryInterface;
  $.fn[NAME$9].Constructor = Tab;

  $.fn[NAME$9].noConflict = function () {
    $.fn[NAME$9] = JQUERY_NO_CONFLICT$9;
    return Tab._jQueryInterface;
  };

  /**
   * ------------------------------------------------------------------------
   * Constants
   * ------------------------------------------------------------------------
   */

  var NAME$a = 'toast';
  var VERSION$a = '4.3.1';
  var DATA_KEY$a = 'bs.toast';
  var EVENT_KEY$a = "." + DATA_KEY$a;
  var JQUERY_NO_CONFLICT$a = $.fn[NAME$a];
  var Event$a = {
    CLICK_DISMISS: "click.dismiss" + EVENT_KEY$a,
    HIDE: "hide" + EVENT_KEY$a,
    HIDDEN: "hidden" + EVENT_KEY$a,
    SHOW: "show" + EVENT_KEY$a,
    SHOWN: "shown" + EVENT_KEY$a
  };
  var ClassName$a = {
    FADE: 'fade',
    HIDE: 'hide',
    SHOW: 'show',
    SHOWING: 'showing'
  };
  var DefaultType$7 = {
    animation: 'boolean',
    autohide: 'boolean',
    delay: 'number'
  };
  var Default$7 = {
    animation: true,
    autohide: true,
    delay: 500
  };
  var Selector$a = {
    DATA_DISMISS: '[data-dismiss="toast"]'
    /**
     * ------------------------------------------------------------------------
     * Class Definition
     * ------------------------------------------------------------------------
     */

  };

  var Toast =
  /*#__PURE__*/
  function () {
    function Toast(element, config) {
      this._element = element;
      this._config = this._getConfig(config);
      this._timeout = null;

      this._setListeners();
    } // Getters


    var _proto = Toast.prototype;

    // Public
    _proto.show = function show() {
      var _this = this;

      $(this._element).trigger(Event$a.SHOW);

      if (this._config.animation) {
        this._element.classList.add(ClassName$a.FADE);
      }

      var complete = function complete() {
        _this._element.classList.remove(ClassName$a.SHOWING);

        _this._element.classList.add(ClassName$a.SHOW);

        $(_this._element).trigger(Event$a.SHOWN);

        if (_this._config.autohide) {
          _this.hide();
        }
      };

      this._element.classList.remove(ClassName$a.HIDE);

      this._element.classList.add(ClassName$a.SHOWING);

      if (this._config.animation) {
        var transitionDuration = Util.getTransitionDurationFromElement(this._element);
        $(this._element).one(Util.TRANSITION_END, complete).emulateTransitionEnd(transitionDuration);
      } else {
        complete();
      }
    };

    _proto.hide = function hide(withoutTimeout) {
      var _this2 = this;

      if (!this._element.classList.contains(ClassName$a.SHOW)) {
        return;
      }

      $(this._element).trigger(Event$a.HIDE);

      if (withoutTimeout) {
        this._close();
      } else {
        this._timeout = setTimeout(function () {
          _this2._close();
        }, this._config.delay);
      }
    };

    _proto.dispose = function dispose() {
      clearTimeout(this._timeout);
      this._timeout = null;

      if (this._element.classList.contains(ClassName$a.SHOW)) {
        this._element.classList.remove(ClassName$a.SHOW);
      }

      $(this._element).off(Event$a.CLICK_DISMISS);
      $.removeData(this._element, DATA_KEY$a);
      this._element = null;
      this._config = null;
    } // Private
    ;

    _proto._getConfig = function _getConfig(config) {
      config = _objectSpread({}, Default$7, $(this._element).data(), typeof config === 'object' && config ? config : {});
      Util.typeCheckConfig(NAME$a, config, this.constructor.DefaultType);
      return config;
    };

    _proto._setListeners = function _setListeners() {
      var _this3 = this;

      $(this._element).on(Event$a.CLICK_DISMISS, Selector$a.DATA_DISMISS, function () {
        return _this3.hide(true);
      });
    };

    _proto._close = function _close() {
      var _this4 = this;

      var complete = function complete() {
        _this4._element.classList.add(ClassName$a.HIDE);

        $(_this4._element).trigger(Event$a.HIDDEN);
      };

      this._element.classList.remove(ClassName$a.SHOW);

      if (this._config.animation) {
        var transitionDuration = Util.getTransitionDurationFromElement(this._element);
        $(this._element).one(Util.TRANSITION_END, complete).emulateTransitionEnd(transitionDuration);
      } else {
        complete();
      }
    } // Static
    ;

    Toast._jQueryInterface = function _jQueryInterface(config) {
      return this.each(function () {
        var $element = $(this);
        var data = $element.data(DATA_KEY$a);

        var _config = typeof config === 'object' && config;

        if (!data) {
          data = new Toast(this, _config);
          $element.data(DATA_KEY$a, data);
        }

        if (typeof config === 'string') {
          if (typeof data[config] === 'undefined') {
            throw new TypeError("No method named \"" + config + "\"");
          }

          data[config](this);
        }
      });
    };

    _createClass(Toast, null, [{
      key: "VERSION",
      get: function get() {
        return VERSION$a;
      }
    }, {
      key: "DefaultType",
      get: function get() {
        return DefaultType$7;
      }
    }, {
      key: "Default",
      get: function get() {
        return Default$7;
      }
    }]);

    return Toast;
  }();
  /**
   * ------------------------------------------------------------------------
   * jQuery
   * ------------------------------------------------------------------------
   */


  $.fn[NAME$a] = Toast._jQueryInterface;
  $.fn[NAME$a].Constructor = Toast;

  $.fn[NAME$a].noConflict = function () {
    $.fn[NAME$a] = JQUERY_NO_CONFLICT$a;
    return Toast._jQueryInterface;
  };

  /**
   * --------------------------------------------------------------------------
   * Bootstrap (v4.3.1): index.js
   * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
   * --------------------------------------------------------------------------
   */

  (function () {
    if (typeof $ === 'undefined') {
      throw new TypeError('Bootstrap\'s JavaScript requires jQuery. jQuery must be included before Bootstrap\'s JavaScript.');
    }

    var version = $.fn.jquery.split(' ')[0].split('.');
    var minMajor = 1;
    var ltMajor = 2;
    var minMinor = 9;
    var minPatch = 1;
    var maxMajor = 4;

    if (version[0] < ltMajor && version[1] < minMinor || version[0] === minMajor && version[1] === minMinor && version[2] < minPatch || version[0] >= maxMajor) {
      throw new Error('Bootstrap\'s JavaScript requires at least jQuery v1.9.1 but less than v4.0.0');
    }
  })();

  exports.Util = Util;
  exports.Alert = Alert;
  exports.Button = Button;
  exports.Carousel = Carousel;
  exports.Collapse = Collapse;
  exports.Dropdown = Dropdown;
  exports.Modal = Modal;
  exports.Popover = Popover;
  exports.Scrollspy = ScrollSpy;
  exports.Tab = Tab;
  exports.Toast = Toast;
  exports.Tooltip = Tooltip;

  Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=bootstrap.js.map

/* jquery.signalR.core.js */
/*global window:false */
/*!
 * ASP.NET SignalR JavaScript Library 2.4.1
 * http://signalr.net/
 *
 * Copyright (c) .NET Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
 *
 */

/// <reference path="Scripts/jquery-1.6.4.js" />
/// <reference path="jquery.signalR.version.js" />
(function ($, window, undefined) {

    var resources = {
        nojQuery: "jQuery was not found. Please ensure jQuery is referenced before the SignalR client JavaScript file.",
        noTransportOnInit: "No transport could be initialized successfully. Try specifying a different transport or none at all for auto initialization.",
        errorOnNegotiate: "Error during negotiation request.",
        stoppedWhileLoading: "The connection was stopped during page load.",
        stoppedWhileNegotiating: "The connection was stopped during the negotiate request.",
        errorParsingNegotiateResponse: "Error parsing negotiate response.",
        errorRedirectionExceedsLimit: "Negotiate redirection limit exceeded.",
        errorDuringStartRequest: "Error during start request. Stopping the connection.",
        errorFromServer: "Error message received from the server: '{0}'.",
        stoppedDuringStartRequest: "The connection was stopped during the start request.",
        errorParsingStartResponse: "Error parsing start response: '{0}'. Stopping the connection.",
        invalidStartResponse: "Invalid start response: '{0}'. Stopping the connection.",
        protocolIncompatible: "You are using a version of the client that isn't compatible with the server. Client version {0}, server version {1}.",
        aspnetCoreSignalrServer: "Detected a connection attempt to an ASP.NET Core SignalR Server. This client only supports connecting to an ASP.NET SignalR Server. See https://aka.ms/signalr-core-differences for details.",
        sendFailed: "Send failed.",
        parseFailed: "Failed at parsing response: {0}",
        longPollFailed: "Long polling request failed.",
        eventSourceFailedToConnect: "EventSource failed to connect.",
        eventSourceError: "Error raised by EventSource",
        webSocketClosed: "WebSocket closed.",
        pingServerFailedInvalidResponse: "Invalid ping response when pinging server: '{0}'.",
        pingServerFailed: "Failed to ping server.",
        pingServerFailedStatusCode: "Failed to ping server.  Server responded with status code {0}, stopping the connection.",
        pingServerFailedParse: "Failed to parse ping server response, stopping the connection.",
        noConnectionTransport: "Connection is in an invalid state, there is no transport active.",
        webSocketsInvalidState: "The Web Socket transport is in an invalid state, transitioning into reconnecting.",
        reconnectTimeout: "Couldn't reconnect within the configured timeout of {0} ms, disconnecting.",
        reconnectWindowTimeout: "The client has been inactive since {0} and it has exceeded the inactivity timeout of {1} ms. Stopping the connection.",
        jsonpNotSupportedWithAccessToken: "The JSONP protocol does not support connections that require a Bearer token to connect, such as the Azure SignalR Service."
    };

    if (typeof ($) !== "function") {
        // no jQuery!
        throw new Error(resources.nojQuery);
    }

    var signalR,
        _connection,
        _pageLoaded = (window.document.readyState === "complete"),
        _pageWindow = $(window),
        _negotiateAbortText = "__Negotiate Aborted__",
        events = {
            onStart: "onStart",
            onStarting: "onStarting",
            onReceived: "onReceived",
            onError: "onError",
            onConnectionSlow: "onConnectionSlow",
            onReconnecting: "onReconnecting",
            onReconnect: "onReconnect",
            onStateChanged: "onStateChanged",
            onDisconnect: "onDisconnect"
        },
        ajaxDefaults = {
            processData: true,
            timeout: null,
            async: true,
            global: false,
            cache: false
        },
        log = function (msg, logging) {
            if (logging === false) {
                return;
            }
            var m;
            if (typeof (window.console) === "undefined") {
                return;
            }
            m = "[" + new Date().toTimeString() + "] SignalR: " + msg;
            if (window.console.debug) {
                window.console.debug(m);
            } else if (window.console.log) {
                window.console.log(m);
            }
        },

        changeState = function (connection, expectedState, newState) {
            if (expectedState === connection.state) {
                connection.state = newState;

                $(connection).triggerHandler(events.onStateChanged, [{ oldState: expectedState, newState: newState }]);
                return true;
            }

            return false;
        },

        isDisconnecting = function (connection) {
            return connection.state === signalR.connectionState.disconnected;
        },

        supportsKeepAlive = function (connection) {
            return connection._.keepAliveData.activated &&
                connection.transport.supportsKeepAlive(connection);
        },

        configureStopReconnectingTimeout = function (connection) {
            var stopReconnectingTimeout,
                onReconnectTimeout;

            // Check if this connection has already been configured to stop reconnecting after a specified timeout.
            // Without this check if a connection is stopped then started events will be bound multiple times.
            if (!connection._.configuredStopReconnectingTimeout) {
                onReconnectTimeout = function (connection) {
                    var message = signalR._.format(signalR.resources.reconnectTimeout, connection.disconnectTimeout);
                    connection.log(message);
                    $(connection).triggerHandler(events.onError, [signalR._.error(message, /* source */ "TimeoutException")]);
                    connection.stop(/* async */ false, /* notifyServer */ false);
                };

                connection.reconnecting(function () {
                    var connection = this;

                    // Guard against state changing in a previous user defined even handler
                    if (connection.state === signalR.connectionState.reconnecting) {
                        stopReconnectingTimeout = window.setTimeout(function () { onReconnectTimeout(connection); }, connection.disconnectTimeout);
                    }
                });

                connection.stateChanged(function (data) {
                    if (data.oldState === signalR.connectionState.reconnecting) {
                        // Clear the pending reconnect timeout check
                        window.clearTimeout(stopReconnectingTimeout);
                    }
                });

                connection._.configuredStopReconnectingTimeout = true;
            }
        };

    signalR = function (url, qs, logging) {
        /// <summary>Creates a new SignalR connection for the given url</summary>
        /// <param name="url" type="String">The URL of the long polling endpoint</param>
        /// <param name="qs" type="Object">
        ///     [Optional] Custom querystring parameters to add to the connection URL.
        ///     If an object, every non-function member will be added to the querystring.
        ///     If a string, it's added to the QS as specified.
        /// </param>
        /// <param name="logging" type="Boolean">
        ///     [Optional] A flag indicating whether connection logging is enabled to the browser
        ///     console/log. Defaults to false.
        /// </param>

        return new signalR.fn.init(url, qs, logging);
    };

    signalR._ = {
        defaultContentType: "application/x-www-form-urlencoded; charset=UTF-8",

        ieVersion: (function () {
            var version,
                matches;

            if (window.navigator.appName === 'Microsoft Internet Explorer') {
                // Check if the user agent has the pattern "MSIE (one or more numbers).(one or more numbers)";
                matches = /MSIE ([0-9]+\.[0-9]+)/.exec(window.navigator.userAgent);

                if (matches) {
                    version = window.parseFloat(matches[1]);
                }
            }

            // undefined value means not IE
            return version;
        })(),

        error: function (message, source, context) {
            var e = new Error(message);
            e.source = source;

            if (typeof context !== "undefined") {
                e.context = context;
            }

            return e;
        },

        transportError: function (message, transport, source, context) {
            var e = this.error(message, source, context);
            e.transport = transport ? transport.name : undefined;
            return e;
        },

        format: function () {
            /// <summary>Usage: format("Hi {0}, you are {1}!", "Foo", 100) </summary>
            var s = arguments[0];
            for (var i = 0; i < arguments.length - 1; i++) {
                s = s.replace("{" + i + "}", arguments[i + 1]);
            }
            return s;
        },

        firefoxMajorVersion: function (userAgent) {
            // Firefox user agents: http://useragentstring.com/pages/Firefox/
            var matches = userAgent.match(/Firefox\/(\d+)/);
            if (!matches || !matches.length || matches.length < 2) {
                return 0;
            }
            return parseInt(matches[1], 10 /* radix */);
        },

        configurePingInterval: function (connection) {
            var config = connection._.config,
                onFail = function (error) {
                    $(connection).triggerHandler(events.onError, [error]);
                };

            if (config && !connection._.pingIntervalId && config.pingInterval) {
                connection._.pingIntervalId = window.setInterval(function () {
                    signalR.transports._logic.pingServer(connection).fail(onFail);
                }, config.pingInterval);
            }
        }
    };

    signalR.events = events;

    signalR.resources = resources;

    signalR.ajaxDefaults = ajaxDefaults;

    signalR.changeState = changeState;

    signalR.isDisconnecting = isDisconnecting;

    signalR.connectionState = {
        connecting: 0,
        connected: 1,
        reconnecting: 2,
        disconnected: 4
    };

    signalR.hub = {
        start: function () {
            // This will get replaced with the real hub connection start method when hubs is referenced correctly
            throw new Error("SignalR: Error loading hubs. Ensure your hubs reference is correct, e.g. <script src='/signalr/js'></script>.");
        }
    };

    // .on() was added in version 1.7.0, .load() was removed in version 3.0.0 so we fallback to .load() if .on() does
    // not exist to not break existing applications
    if (typeof _pageWindow.on == "function") {
        _pageWindow.on("load", function () { _pageLoaded = true; });
    }
    else {
        _pageWindow.load(function () { _pageLoaded = true; });
    }

    function validateTransport(requestedTransport, connection) {
        /// <summary>Validates the requested transport by cross checking it with the pre-defined signalR.transports</summary>
        /// <param name="requestedTransport" type="Object">The designated transports that the user has specified.</param>
        /// <param name="connection" type="signalR">The connection that will be using the requested transports.  Used for logging purposes.</param>
        /// <returns type="Object" />

        if ($.isArray(requestedTransport)) {
            // Go through transport array and remove an "invalid" tranports
            for (var i = requestedTransport.length - 1; i >= 0; i--) {
                var transport = requestedTransport[i];
                if ($.type(transport) !== "string" || !signalR.transports[transport]) {
                    connection.log("Invalid transport: " + transport + ", removing it from the transports list.");
                    requestedTransport.splice(i, 1);
                }
            }

            // Verify we still have transports left, if we dont then we have invalid transports
            if (requestedTransport.length === 0) {
                connection.log("No transports remain within the specified transport array.");
                requestedTransport = null;
            }
        } else if (!signalR.transports[requestedTransport] && requestedTransport !== "auto") {
            connection.log("Invalid transport: " + requestedTransport.toString() + ".");
            requestedTransport = null;
        } else if (requestedTransport === "auto" && signalR._.ieVersion <= 8) {
            // If we're doing an auto transport and we're IE8 then force longPolling, #1764
            return ["longPolling"];

        }

        return requestedTransport;
    }

    function getDefaultPort(protocol) {
        if (protocol === "http:") {
            return 80;
        } else if (protocol === "https:") {
            return 443;
        }
    }

    function addDefaultPort(protocol, url) {
        // Remove ports  from url.  We have to check if there's a / or end of line
        // following the port in order to avoid removing ports such as 8080.
        if (url.match(/:\d+$/)) {
            return url;
        } else {
            return url + ":" + getDefaultPort(protocol);
        }
    }

    function ConnectingMessageBuffer(connection, drainCallback) {
        var that = this,
            buffer = [];

        that.tryBuffer = function (message) {
            if (connection.state === $.signalR.connectionState.connecting) {
                buffer.push(message);

                return true;
            }

            return false;
        };

        that.drain = function () {
            // Ensure that the connection is connected when we drain (do not want to drain while a connection is not active)
            if (connection.state === $.signalR.connectionState.connected) {
                while (buffer.length > 0) {
                    drainCallback(buffer.shift());
                }
            }
        };

        that.clear = function () {
            buffer = [];
        };
    }

    signalR.fn = signalR.prototype = {
        init: function (url, qs, logging) {
            var $connection = $(this);

            this.url = url;
            this.qs = qs;
            this.lastError = null;
            this._ = {
                keepAliveData: {},
                connectingMessageBuffer: new ConnectingMessageBuffer(this, function (message) {
                    $connection.triggerHandler(events.onReceived, [message]);
                }),
                lastMessageAt: new Date().getTime(),
                lastActiveAt: new Date().getTime(),
                beatInterval: 5000, // Default value, will only be overridden if keep alive is enabled,
                beatHandle: null,
                totalTransportConnectTimeout: 0, // This will be the sum of the TransportConnectTimeout sent in response to negotiate and connection.transportConnectTimeout
                redirectQs: null
            };
            if (typeof (logging) === "boolean") {
                this.logging = logging;
            }
        },

        _parseResponse: function (response) {
            var that = this;

            if (!response) {
                return response;
            } else if (typeof response === "string") {
                return that.json.parse(response);
            } else {
                return response;
            }
        },

        _originalJson: window.JSON,

        json: window.JSON,

        isCrossDomain: function (url, against) {
            /// <summary>Checks if url is cross domain</summary>
            /// <param name="url" type="String">The base URL</param>
            /// <param name="against" type="Object">
            ///     An optional argument to compare the URL against, if not specified it will be set to window.location.
            ///     If specified it must contain a protocol and a host property.
            /// </param>
            var link;

            url = $.trim(url);

            against = against || window.location;

            if (url.indexOf("http") !== 0) {
                return false;
            }

            // Create an anchor tag.
            link = window.document.createElement("a");
            link.href = url;

            // When checking for cross domain we have to special case port 80 because the window.location will remove the
            return link.protocol + addDefaultPort(link.protocol, link.host) !== against.protocol + addDefaultPort(against.protocol, against.host);
        },

        ajaxDataType: "text",

        contentType: "application/json; charset=UTF-8",

        logging: false,

        state: signalR.connectionState.disconnected,

        clientProtocol: "2.1",

        // We want to support older servers since the 2.0 change is to support redirection results, which isn't
        // really breaking in the protocol. So if a user updates their client to 2.0 protocol version there's
        // no reason they can't still connect to a 1.5 server. The 2.1 protocol is sent by the client so the SignalR
        // service knows the client will use they query string returned via the RedirectUrl for subsequent requests.
        // It doesn't matter whether the server reflects back 2.1 or continues using 2.0 as the protocol version.
        supportedProtocols: ["1.5", "2.0", "2.1"],

        negotiateRedirectSupportedProtocols: ["2.0", "2.1"],

        reconnectDelay: 2000,

        transportConnectTimeout: 0,

        disconnectTimeout: 30000, // This should be set by the server in response to the negotiate request (30s default)

        reconnectWindow: 30000, // This should be set by the server in response to the negotiate request

        keepAliveWarnAt: 2 / 3, // Warn user of slow connection if we breach the X% mark of the keep alive timeout

        start: function (options, callback) {
            /// <summary>Starts the connection</summary>
            /// <param name="options" type="Object">Options map</param>
            /// <param name="callback" type="Function">A callback function to execute when the connection has started</param>
            var connection = this,
                config = {
                    pingInterval: 300000,
                    waitForPageLoad: true,
                    transport: "auto",
                    jsonp: false
                },
                initialize,
                deferred = connection._deferral || $.Deferred(), // Check to see if there is a pre-existing deferral that's being built on, if so we want to keep using it
                parser = window.document.createElement("a"),
                setConnectionUrl = function (connection, url) {
                    if (connection.url === url && connection.baseUrl) {
                        // when the url related properties are already set
                        return;
                    }

                    connection.url = url;

                    // Resolve the full url
                    parser.href = connection.url;
                    if (!parser.protocol || parser.protocol === ":") {
                        connection.protocol = window.document.location.protocol;
                        connection.host = parser.host || window.document.location.host;
                    } else {
                        connection.protocol = parser.protocol;
                        connection.host = parser.host;
                    }

                    connection.baseUrl = connection.protocol + "//" + connection.host;

                    // Set the websocket protocol
                    connection.wsProtocol = connection.protocol === "https:" ? "wss://" : "ws://";

                    // If the url is protocol relative, prepend the current windows protocol to the url.
                    if (connection.url.indexOf("//") === 0) {
                        connection.url = window.location.protocol + connection.url;
                        connection.log("Protocol relative URL detected, normalizing it to '" + connection.url + "'.");
                    }

                    if (connection.isCrossDomain(connection.url)) {
                        connection.log("Auto detected cross domain url.");

                        if (config.transport === "auto") {
                            // Cross-domain does not support foreverFrame
                            config.transport = ["webSockets", "serverSentEvents", "longPolling"];
                        }

                        if (typeof connection.withCredentials === "undefined") {
                            connection.withCredentials = true;
                        }

                        // Determine if jsonp is the only choice for negotiation, ajaxSend and ajaxAbort.
                        // i.e. if the browser doesn't supports CORS
                        // If it is, ignore any preference to the contrary, and switch to jsonp.
                        if (!$.support.cors) {
                            connection.ajaxDataType = "jsonp";
                            connection.log("Using jsonp because this browser doesn't support CORS.");
                        }

                        connection.contentType = signalR._.defaultContentType;
                    }
                };

            connection.lastError = null;

            // Persist the deferral so that if start is called multiple times the same deferral is used.
            connection._deferral = deferred;

            if (!connection.json) {
                // no JSON!
                throw new Error("SignalR: No JSON parser found. Please ensure json2.js is referenced before the SignalR.js file if you need to support clients without native JSON parsing support, e.g. IE<8.");
            }

            if ($.type(options) === "function") {
                // Support calling with single callback parameter
                callback = options;
            } else if ($.type(options) === "object") {
                $.extend(config, options);
                if ($.type(config.callback) === "function") {
                    callback = config.callback;
                }
            }

            config.transport = validateTransport(config.transport, connection);

            // If the transport is invalid throw an error and abort start
            if (!config.transport) {
                throw new Error("SignalR: Invalid transport(s) specified, aborting start.");
            }

            connection._.config = config;

            // Check to see if start is being called prior to page load
            // If waitForPageLoad is true we then want to re-direct function call to the window load event
            if (!_pageLoaded && config.waitForPageLoad === true) {
                connection._.deferredStartHandler = function () {
                    connection.start(options, callback);
                };
                _pageWindow.bind("load", connection._.deferredStartHandler);

                return deferred.promise();
            }

            // If we're already connecting just return the same deferral as the original connection start
            if (connection.state === signalR.connectionState.connecting) {
                return deferred.promise();
            } else if (changeState(connection,
                signalR.connectionState.disconnected,
                signalR.connectionState.connecting) === false) {
                // We're not connecting so try and transition into connecting.
                // If we fail to transition then we're either in connected or reconnecting.

                deferred.resolve(connection);
                return deferred.promise();
            }

            configureStopReconnectingTimeout(connection);

            // If jsonp with no/auto transport is specified, then set the transport to long polling
            // since that is the only transport for which jsonp really makes sense.
            // Some developers might actually choose to specify jsonp for same origin requests
            // as demonstrated by Issue #623.
            if (config.transport === "auto" && config.jsonp === true) {
                config.transport = "longPolling";
            }

            connection.withCredentials = config.withCredentials;

            // Save the original url so that we can reset it when we stop and restart the connection
            connection._originalUrl = connection.url;

            connection.ajaxDataType = config.jsonp ? "jsonp" : "text";

            setConnectionUrl(connection, connection.url);

            $(connection).bind(events.onStart, function (e, data) {
                if ($.type(callback) === "function") {
                    callback.call(connection);
                }
                deferred.resolve(connection);
            });

            connection._.initHandler = signalR.transports._logic.initHandler(connection);

            initialize = function (transports, index) {
                var noTransportError = signalR._.error(resources.noTransportOnInit);

                index = index || 0;
                if (index >= transports.length) {
                    if (index === 0) {
                        connection.log("No transports supported by the server were selected.");
                    } else if (index === 1) {
                        connection.log("No fallback transports were selected.");
                    } else {
                        connection.log("Fallback transports exhausted.");
                    }

                    // No transport initialized successfully
                    $(connection).triggerHandler(events.onError, [noTransportError]);
                    deferred.reject(noTransportError);
                    // Stop the connection if it has connected and move it into the disconnected state
                    connection.stop();
                    return;
                }

                // The connection was aborted
                if (connection.state === signalR.connectionState.disconnected) {
                    return;
                }

                var transportName = transports[index],
                    transport = signalR.transports[transportName],
                    onFallback = function () {
                        initialize(transports, index + 1);
                    };

                connection.transport = transport;

                try {
                    connection._.initHandler.start(transport, function () { // success
                        // Firefox 11+ doesn't allow sync XHR withCredentials: https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest#withCredentials
                        var isFirefox11OrGreater = signalR._.firefoxMajorVersion(window.navigator.userAgent) >= 11,
                            asyncAbort = true;

                        connection.log("The start request succeeded. Transitioning to the connected state.");

                        if (supportsKeepAlive(connection)) {
                            signalR.transports._logic.monitorKeepAlive(connection);
                        }

                        signalR.transports._logic.startHeartbeat(connection);

                        // Used to ensure low activity clients maintain their authentication.
                        // Must be configured once a transport has been decided to perform valid ping requests.
                        signalR._.configurePingInterval(connection);

                        if (!changeState(connection,
                            signalR.connectionState.connecting,
                            signalR.connectionState.connected)) {
                            connection.log("WARNING! The connection was not in the connecting state.");
                        }

                        // Drain any incoming buffered messages (messages that came in prior to connect)
                        connection._.connectingMessageBuffer.drain();

                        $(connection).triggerHandler(events.onStart);

                        // wire the stop handler for when the user leaves the page
                        _pageWindow.bind("unload", function () {
                            connection.log("Window unloading, stopping the connection.");

                            connection.stop(asyncAbort);
                        });

                        if (isFirefox11OrGreater) {
                            // Firefox does not fire cross-domain XHRs in the normal unload handler on tab close.
                            // #2400
                            _pageWindow.bind("beforeunload", function () {
                                // If connection.stop() runs runs in beforeunload and fails, it will also fail
                                // in unload unless connection.stop() runs after a timeout.
                                window.setTimeout(function () {
                                    connection.stop(asyncAbort);
                                }, 0);
                            });
                        }
                    }, onFallback);
                }
                catch (error) {
                    connection.log(transport.name + " transport threw '" + error.message + "' when attempting to start.");
                    onFallback();
                }
            };

            var url = connection.url + "/negotiate",
                onFailed = function (error, connection) {
                    var err = signalR._.error(resources.errorOnNegotiate, error, connection._.negotiateRequest);

                    $(connection).triggerHandler(events.onError, err);
                    deferred.reject(err);
                    // Stop the connection if negotiate failed
                    connection.stop();
                };

            $(connection).triggerHandler(events.onStarting);

            url = signalR.transports._logic.prepareQueryString(connection, url);

            connection.log("Negotiating with '" + url + "'.");

            // Save the ajax negotiate request object so we can abort it if stop is called while the request is in flight.
            connection._.negotiateRequest = function () {
                var res,
                    redirects = 0,
                    MAX_REDIRECTS = 100,
                    keepAliveData,
                    protocolError,
                    transports = [],
                    supportedTransports = [],
                    negotiate = function (connection, onSuccess) {
                        var url = signalR.transports._logic.prepareQueryString(connection, connection.url + "/negotiate");
                        connection.log("Negotiating with '" + url + "'.");
                        var options = {
                            url: url,
                            error: function (error, statusText) {
                                // We don't want to cause any errors if we're aborting our own negotiate request.
                                if (statusText !== _negotiateAbortText) {
                                    onFailed(error, connection);
                                } else {
                                    // This rejection will noop if the deferred has already been resolved or rejected.
                                    deferred.reject(signalR._.error(resources.stoppedWhileNegotiating, null /* error */, connection._.negotiateRequest));
                                }
                            },
                            success: onSuccess
                        };

                        if (connection.accessToken) {
                            options.headers = { "Authorization": "Bearer " + connection.accessToken };
                        }

                        return signalR.transports._logic.ajax(connection, options);
                    },
                    callback = function (result) {
                        try {
                            res = connection._parseResponse(result);
                        } catch (error) {
                            onFailed(signalR._.error(resources.errorParsingNegotiateResponse, error), connection);
                            return;
                        }

                        // Check if the server is an ASP.NET Core app
                        if (res.availableTransports) {
                            protocolError = signalR._.error(resources.aspnetCoreSignalrServer);
                            $(connection).triggerHandler(events.onError, [protocolError]);
                            deferred.reject(protocolError);
                            return;
                        }

                        if (!res.ProtocolVersion || (connection.supportedProtocols.indexOf(res.ProtocolVersion) === -1)) {
                            protocolError = signalR._.error(signalR._.format(resources.protocolIncompatible, connection.clientProtocol, res.ProtocolVersion));
                            $(connection).triggerHandler(events.onError, [protocolError]);
                            deferred.reject(protocolError);

                            return;
                        }

                        // Check for a redirect response (which must have a ProtocolVersion of 2.0 or greater)
                        // ProtocolVersion 2.1 is the highest supported by the client, so we can just check for 2.0 or 2.1 for now
                        // instead of trying to do proper version string comparison in JavaScript.
                        if (connection.negotiateRedirectSupportedProtocols.indexOf(res.ProtocolVersion) !== -1) {
                            if (res.Error) {
                                protocolError = signalR._.error(signalR._.format(resources.errorFromServer, res.Error));
                                $(connection).triggerHandler(events.onError, [protocolError]);
                                deferred.reject(protocolError);
                                return;
                            }
                            else if (res.RedirectUrl) {
                                if (redirects === MAX_REDIRECTS) {
                                    onFailed(signalR._.error(resources.errorRedirectionExceedsLimit), connection);
                                    return;
                                }

                                if (config.transport === "auto") {
                                    // Redirected connections do not support foreverFrame
                                    config.transport = ["webSockets", "serverSentEvents", "longPolling"];
                                }

                                connection.log("Received redirect to: " + res.RedirectUrl);
                                connection.accessToken = res.AccessToken;

                                var splitUrlAndQs = res.RedirectUrl.split("?", 2);
                                setConnectionUrl(connection, splitUrlAndQs[0]);

                                // Update redirectQs with query string from only the most recent RedirectUrl.
                                connection._.redirectQs = splitUrlAndQs.length === 2 ? splitUrlAndQs[1] : null;

                                if (connection.ajaxDataType === "jsonp" && connection.accessToken) {
                                    onFailed(signalR._.error(resources.jsonpNotSupportedWithAccessToken), connection);
                                    return;
                                }

                                redirects++;
                                negotiate(connection, callback);
                                return;
                            }
                        }

                        keepAliveData = connection._.keepAliveData;
                        connection.appRelativeUrl = res.Url;
                        connection.id = res.ConnectionId;
                        connection.token = res.ConnectionToken;
                        connection.webSocketServerUrl = res.WebSocketServerUrl;

                        // The long poll timeout is the ConnectionTimeout plus 10 seconds
                        connection._.pollTimeout = res.ConnectionTimeout * 1000 + 10000; // in ms

                        // Once the server has labeled the PersistentConnection as Disconnected, we should stop attempting to reconnect
                        // after res.DisconnectTimeout seconds.
                        connection.disconnectTimeout = res.DisconnectTimeout * 1000; // in ms

                        // Add the TransportConnectTimeout from the response to the transportConnectTimeout from the client to calculate the total timeout
                        connection._.totalTransportConnectTimeout = connection.transportConnectTimeout + res.TransportConnectTimeout * 1000;

                        // If we have a keep alive
                        if (res.KeepAliveTimeout) {
                            // Register the keep alive data as activated
                            keepAliveData.activated = true;

                            // Timeout to designate when to force the connection into reconnecting converted to milliseconds
                            keepAliveData.timeout = res.KeepAliveTimeout * 1000;

                            // Timeout to designate when to warn the developer that the connection may be dead or is not responding.
                            keepAliveData.timeoutWarning = keepAliveData.timeout * connection.keepAliveWarnAt;

                            // Instantiate the frequency in which we check the keep alive.  It must be short in order to not miss/pick up any changes
                            connection._.beatInterval = (keepAliveData.timeout - keepAliveData.timeoutWarning) / 3;
                        } else {
                            keepAliveData.activated = false;
                        }

                        connection.reconnectWindow = connection.disconnectTimeout + (keepAliveData.timeout || 0);

                        $.each(signalR.transports, function (key) {
                            if ((key.indexOf("_") === 0) || (key === "webSockets" && !res.TryWebSockets)) {
                                return true;
                            }
                            supportedTransports.push(key);
                        });

                        if ($.isArray(config.transport)) {
                            $.each(config.transport, function (_, transport) {
                                if ($.inArray(transport, supportedTransports) >= 0) {
                                    transports.push(transport);
                                }
                            });
                        } else if (config.transport === "auto") {
                            transports = supportedTransports;
                        } else if ($.inArray(config.transport, supportedTransports) >= 0) {
                            transports.push(config.transport);
                        }

                        initialize(transports);
                    };

                return negotiate(connection, callback);
            }();

            return deferred.promise();
        },

        starting: function (callback) {
            /// <summary>Adds a callback that will be invoked before anything is sent over the connection</summary>
            /// <param name="callback" type="Function">A callback function to execute before the connection is fully instantiated.</param>
            /// <returns type="signalR" />
            var connection = this;
            $(connection).bind(events.onStarting, function (e, data) {
                callback.call(connection);
            });
            return connection;
        },

        send: function (data) {
            /// <summary>Sends data over the connection</summary>
            /// <param name="data" type="String">The data to send over the connection</param>
            /// <returns type="signalR" />
            var connection = this;

            if (connection.state === signalR.connectionState.disconnected) {
                // Connection hasn't been started yet
                throw new Error("SignalR: Connection must be started before data can be sent. Call .start() before .send()");
            }

            if (connection.state === signalR.connectionState.connecting) {
                // Connection hasn't been started yet
                throw new Error("SignalR: Connection has not been fully initialized. Use .start().done() or .start().fail() to run logic after the connection has started.");
            }

            connection.transport.send(connection, data);
            // REVIEW: Should we return deferred here?
            return connection;
        },

        received: function (callback) {
            /// <summary>Adds a callback that will be invoked after anything is received over the connection</summary>
            /// <param name="callback" type="Function">A callback function to execute when any data is received on the connection</param>
            /// <returns type="signalR" />
            var connection = this;
            $(connection).bind(events.onReceived, function (e, data) {
                callback.call(connection, data);
            });
            return connection;
        },

        stateChanged: function (callback) {
            /// <summary>Adds a callback that will be invoked when the connection state changes</summary>
            /// <param name="callback" type="Function">A callback function to execute when the connection state changes</param>
            /// <returns type="signalR" />
            var connection = this;
            $(connection).bind(events.onStateChanged, function (e, data) {
                callback.call(connection, data);
            });
            return connection;
        },

        error: function (callback) {
            /// <summary>Adds a callback that will be invoked after an error occurs with the connection</summary>
            /// <param name="callback" type="Function">A callback function to execute when an error occurs on the connection</param>
            /// <returns type="signalR" />
            var connection = this;
            $(connection).bind(events.onError, function (e, errorData, sendData) {
                connection.lastError = errorData;
                // In practice 'errorData' is the SignalR built error object.
                // In practice 'sendData' is undefined for all error events except those triggered by
                // 'ajaxSend' and 'webSockets.send'.'sendData' is the original send payload.
                callback.call(connection, errorData, sendData);
            });
            return connection;
        },

        disconnected: function (callback) {
            /// <summary>Adds a callback that will be invoked when the client disconnects</summary>
            /// <param name="callback" type="Function">A callback function to execute when the connection is broken</param>
            /// <returns type="signalR" />
            var connection = this;
            $(connection).bind(events.onDisconnect, function (e, data) {
                callback.call(connection);
            });
            return connection;
        },

        connectionSlow: function (callback) {
            /// <summary>Adds a callback that will be invoked when the client detects a slow connection</summary>
            /// <param name="callback" type="Function">A callback function to execute when the connection is slow</param>
            /// <returns type="signalR" />
            var connection = this;
            $(connection).bind(events.onConnectionSlow, function (e, data) {
                callback.call(connection);
            });

            return connection;
        },

        reconnecting: function (callback) {
            /// <summary>Adds a callback that will be invoked when the underlying transport begins reconnecting</summary>
            /// <param name="callback" type="Function">A callback function to execute when the connection enters a reconnecting state</param>
            /// <returns type="signalR" />
            var connection = this;
            $(connection).bind(events.onReconnecting, function (e, data) {
                callback.call(connection);
            });
            return connection;
        },

        reconnected: function (callback) {
            /// <summary>Adds a callback that will be invoked when the underlying transport reconnects</summary>
            /// <param name="callback" type="Function">A callback function to execute when the connection is restored</param>
            /// <returns type="signalR" />
            var connection = this;
            $(connection).bind(events.onReconnect, function (e, data) {
                callback.call(connection);
            });
            return connection;
        },

        stop: function (async, notifyServer) {
            /// <summary>Stops listening</summary>
            /// <param name="async" type="Boolean">Whether or not to asynchronously abort the connection</param>
            /// <param name="notifyServer" type="Boolean">Whether we want to notify the server that we are aborting the connection</param>
            /// <returns type="signalR" />
            var connection = this,
                // Save deferral because this is always cleaned up
                deferral = connection._deferral;

            // Verify that we've bound a load event.
            if (connection._.deferredStartHandler) {
                // Unbind the event.
                _pageWindow.unbind("load", connection._.deferredStartHandler);
            }

            // Always clean up private non-timeout based state.
            delete connection._.config;
            delete connection._.deferredStartHandler;

            // This needs to be checked despite the connection state because a connection start can be deferred until page load.
            // If we've deferred the start due to a page load we need to unbind the "onLoad" -> start event.
            if (!_pageLoaded && (!connection._.config || connection._.config.waitForPageLoad === true)) {
                connection.log("Stopping connection prior to negotiate.");

                // If we have a deferral we should reject it
                if (deferral) {
                    deferral.reject(signalR._.error(resources.stoppedWhileLoading));
                }

                // Short-circuit because the start has not been fully started.
                return;
            }

            if (connection.state === signalR.connectionState.disconnected) {
                return;
            }

            connection.log("Stopping connection.");

            // Clear this no matter what
            window.clearTimeout(connection._.beatHandle);
            window.clearInterval(connection._.pingIntervalId);

            if (connection.transport) {
                connection.transport.stop(connection);

                if (notifyServer !== false) {
                    connection.transport.abort(connection, async);
                }

                if (supportsKeepAlive(connection)) {
                    signalR.transports._logic.stopMonitoringKeepAlive(connection);
                }

                connection.transport = null;
            }

            if (connection._.negotiateRequest) {
                // If the negotiation request has already completed this will noop.
                connection._.negotiateRequest.abort(_negotiateAbortText);
                delete connection._.negotiateRequest;
            }

            // Ensure that initHandler.stop() is called before connection._deferral is deleted
            if (connection._.initHandler) {
                connection._.initHandler.stop();
            }

            delete connection._deferral;
            delete connection.messageId;
            delete connection.groupsToken;
            delete connection.id;
            delete connection._.pingIntervalId;
            delete connection._.lastMessageAt;
            delete connection._.lastActiveAt;

            // Clear out our message buffer
            connection._.connectingMessageBuffer.clear();

            // Clean up this event
            $(connection).unbind(events.onStart);

            // Reset the URL and clear the access token
            delete connection.accessToken;
            delete connection.protocol;
            delete connection.host;
            delete connection.baseUrl;
            delete connection.wsProtocol;
            delete connection.contentType;
            connection.url = connection._originalUrl;
            connection._.redirectQs = null;

            // Trigger the disconnect event
            changeState(connection, connection.state, signalR.connectionState.disconnected);
            $(connection).triggerHandler(events.onDisconnect);

            return connection;
        },

        log: function (msg) {
            log(msg, this.logging);
        }
    };

    signalR.fn.init.prototype = signalR.fn;

    signalR.noConflict = function () {
        /// <summary>Reinstates the original value of $.connection and returns the signalR object for manual assignment</summary>
        /// <returns type="signalR" />
        if ($.connection === signalR) {
            $.connection = _connection;
        }
        return signalR;
    };

    if ($.connection) {
        _connection = $.connection;
    }

    $.connection = $.signalR = signalR;

}(window.jQuery, window));
/* jquery.signalR.transports.common.js */
// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

/*global window:false */
/// <reference path="jquery.signalR.core.js" />

(function ($, window, undefined) {

    var signalR = $.signalR,
        events = $.signalR.events,
        changeState = $.signalR.changeState,
        startAbortText = "__Start Aborted__",
        transportLogic;

    signalR.transports = {};

    function beat(connection) {
        if (connection._.keepAliveData.monitoring) {
            checkIfAlive(connection);
        }

        // Ensure that we successfully marked active before continuing the heartbeat.
        if (transportLogic.markActive(connection)) {
            connection._.beatHandle = window.setTimeout(function () {
                beat(connection);
            }, connection._.beatInterval);
        }
    }

    function checkIfAlive(connection) {
        var keepAliveData = connection._.keepAliveData,
            timeElapsed;

        // Only check if we're connected
        if (connection.state === signalR.connectionState.connected) {
            timeElapsed = new Date().getTime() - connection._.lastMessageAt;

            // Check if the keep alive has completely timed out
            if (timeElapsed >= keepAliveData.timeout) {
                connection.log("Keep alive timed out.  Notifying transport that connection has been lost.");

                // Notify transport that the connection has been lost
                connection.transport.lostConnection(connection);
            } else if (timeElapsed >= keepAliveData.timeoutWarning) {
                // This is to assure that the user only gets a single warning
                if (!keepAliveData.userNotified) {
                    connection.log("Keep alive has been missed, connection may be dead/slow.");
                    $(connection).triggerHandler(events.onConnectionSlow);
                    keepAliveData.userNotified = true;
                }
            } else {
                keepAliveData.userNotified = false;
            }
        }
    }

    function getAjaxUrl(connection, path) {
        var url = connection.url + path;

        if (connection.transport) {
            url += "?transport=" + connection.transport.name;
        }

        return transportLogic.prepareQueryString(connection, url);
    }

    function InitHandler(connection) {
        this.connection = connection;

        this.startRequested = false;
        this.startCompleted = false;
        this.connectionStopped = false;
    }

    InitHandler.prototype = {
        start: function (transport, onSuccess, onFallback) {
            var that = this,
                connection = that.connection,
                failCalled = false;

            if (that.startRequested || that.connectionStopped) {
                connection.log("WARNING! " + transport.name + " transport cannot be started. Initialization ongoing or completed.");
                return;
            }

            connection.log(transport.name + " transport starting.");

            transport.start(connection, function () {
                if (!failCalled) {
                    that.initReceived(transport, onSuccess);
                }
            }, function (error) {
                // Don't allow the same transport to cause onFallback to be called twice
                if (!failCalled) {
                    failCalled = true;
                    that.transportFailed(transport, error, onFallback);
                }

                // Returns true if the transport should stop;
                // false if it should attempt to reconnect
                return !that.startCompleted || that.connectionStopped;
            });

            that.transportTimeoutHandle = window.setTimeout(function () {
                if (!failCalled) {
                    failCalled = true;
                    connection.log(transport.name + " transport timed out when trying to connect.");
                    that.transportFailed(transport, undefined, onFallback);
                }
            }, connection._.totalTransportConnectTimeout);
        },

        stop: function () {
            this.connectionStopped = true;
            window.clearTimeout(this.transportTimeoutHandle);
            signalR.transports._logic.tryAbortStartRequest(this.connection);
        },

        initReceived: function (transport, onSuccess) {
            var that = this,
                connection = that.connection;

            if (that.startRequested) {
                connection.log("WARNING! The client received multiple init messages.");
                return;
            }

            if (that.connectionStopped) {
                return;
            }

            that.startRequested = true;
            window.clearTimeout(that.transportTimeoutHandle);

            connection.log(transport.name + " transport connected. Initiating start request.");
            signalR.transports._logic.ajaxStart(connection, function () {
                that.startCompleted = true;
                onSuccess();
            });
        },

        transportFailed: function (transport, error, onFallback) {
            var connection = this.connection,
                deferred = connection._deferral,
                wrappedError;

            if (this.connectionStopped) {
                return;
            }

            window.clearTimeout(this.transportTimeoutHandle);

            if (!this.startRequested) {
                transport.stop(connection);

                connection.log(transport.name + " transport failed to connect. Attempting to fall back.");
                onFallback();
            } else if (!this.startCompleted) {
                // Do not attempt to fall back if a start request is ongoing during a transport failure.
                // Instead, trigger an error and stop the connection.
                wrappedError = signalR._.error(signalR.resources.errorDuringStartRequest, error);

                connection.log(transport.name + " transport failed during the start request. Stopping the connection.");
                $(connection).triggerHandler(events.onError, [wrappedError]);
                if (deferred) {
                    deferred.reject(wrappedError);
                }

                connection.stop();
            } else {
                // The start request has completed, but the connection has not stopped.
                // No need to do anything here. The transport should attempt its normal reconnect logic.
            }
        }
    };

    transportLogic = signalR.transports._logic = {
        ajax: function (connection, options) {
            return $.ajax(
                $.extend(/*deep copy*/ true, {}, $.signalR.ajaxDefaults, {
                    type: "GET",
                    data: {},
                    xhrFields: { withCredentials: connection.withCredentials },
                    contentType: connection.contentType,
                    dataType: connection.ajaxDataType
                }, options));
        },

        pingServer: function (connection) {
            /// <summary>Pings the server</summary>
            /// <param name="connection" type="signalr">Connection associated with the server ping</param>
            /// <returns type="signalR" />
            var url,
                xhr,
                deferral = $.Deferred();

            if (connection.transport) {
                url = connection.url + "/ping";

                url = transportLogic.addQs(url, connection.qs);

                xhr = transportLogic.ajax(connection, {
                    url: url,
                    headers: connection.accessToken ? { "Authorization": "Bearer " + connection.accessToken } : {},
                    success: function (result) {
                        var data;

                        try {
                            data = connection._parseResponse(result);
                        }
                        catch (error) {
                            deferral.reject(
                                signalR._.transportError(
                                    signalR.resources.pingServerFailedParse,
                                    connection.transport,
                                    error,
                                    xhr
                                )
                            );
                            connection.stop();
                            return;
                        }

                        if (data.Response === "pong") {
                            deferral.resolve();
                        }
                        else {
                            deferral.reject(
                                signalR._.transportError(
                                    signalR._.format(signalR.resources.pingServerFailedInvalidResponse, result),
                                    connection.transport,
                                    null /* error */,
                                    xhr
                                )
                            );
                        }
                    },
                    error: function (error) {
                        if (error.status === 401 || error.status === 403) {
                            deferral.reject(
                                signalR._.transportError(
                                    signalR._.format(signalR.resources.pingServerFailedStatusCode, error.status),
                                    connection.transport,
                                    error,
                                    xhr
                                )
                            );
                            connection.stop();
                        }
                        else {
                            deferral.reject(
                                signalR._.transportError(
                                    signalR.resources.pingServerFailed,
                                    connection.transport,
                                    error,
                                    xhr
                                )
                            );
                        }
                    }
                });
            }
            else {
                deferral.reject(
                    signalR._.transportError(
                        signalR.resources.noConnectionTransport,
                        connection.transport
                    )
                );
            }

            return deferral.promise();
        },

        prepareQueryString: function (connection, url) {
            var preparedUrl;

            // Use addQs to start since it handles the ?/& prefix for us
            preparedUrl = transportLogic.addQs(url, "clientProtocol=" + connection.clientProtocol);

            if (typeof (connection._.redirectQs) === "string") {
                // Add the redirect-specified query string params if any
                preparedUrl = transportLogic.addQs(preparedUrl, connection._.redirectQs);
            } else {
                // Otherwise, add the user-specified query string params if any
                preparedUrl = transportLogic.addQs(preparedUrl, connection.qs);
            }

            if (connection.token) {
                preparedUrl += "&connectionToken=" + window.encodeURIComponent(connection.token);
            }

            if (connection.data) {
                preparedUrl += "&connectionData=" + window.encodeURIComponent(connection.data);
            }

            return preparedUrl;
        },

        addQs: function (url, qs) {
            var appender = url.indexOf("?") !== -1 ? "&" : "?",
                firstChar;

            if (!qs) {
                return url;
            }

            if (typeof (qs) === "object") {
                return url + appender + $.param(qs);
            }

            if (typeof (qs) === "string") {
                firstChar = qs.charAt(0);

                if (firstChar === "?" || firstChar === "&") {
                    appender = "";
                }

                return url + appender + qs;
            }

            throw new Error("Query string property must be either a string or object.");
        },

        // BUG #2953: The url needs to be same otherwise it will cause a memory leak
        getUrl: function (connection, transport, reconnecting, poll, ajaxPost) {
            /// <summary>Gets the url for making a GET based connect request</summary>
            var baseUrl = transport === "webSockets" ? "" : connection.baseUrl,
                url = baseUrl + connection.appRelativeUrl,
                qs = "transport=" + transport;

            if (!ajaxPost && connection.groupsToken) {
                qs += "&groupsToken=" + window.encodeURIComponent(connection.groupsToken);
            }

            if (!reconnecting) {
                url += "/connect";
            } else {
                if (poll) {
                    // longPolling transport specific
                    url += "/poll";
                } else {
                    url += "/reconnect";
                }

                if (!ajaxPost && connection.messageId) {
                    qs += "&messageId=" + window.encodeURIComponent(connection.messageId);
                }
            }
            url += "?" + qs;
            url = transportLogic.prepareQueryString(connection, url);

            // With sse or ws, access_token in request header is not supported
            if (connection.transport && connection.accessToken) {
                if (connection.transport.name === "serverSentEvents" || connection.transport.name === "webSockets") {
                    url += "&access_token=" + window.encodeURIComponent(connection.accessToken);
                }
            }

            if (!ajaxPost) {
                url += "&tid=" + Math.floor(Math.random() * 11);
            }

            return url;
        },

        maximizePersistentResponse: function (minPersistentResponse) {
            return {
                MessageId: minPersistentResponse.C,
                Messages: minPersistentResponse.M,
                Initialized: typeof (minPersistentResponse.S) !== "undefined" ? true : false,
                ShouldReconnect: typeof (minPersistentResponse.T) !== "undefined" ? true : false,
                LongPollDelay: minPersistentResponse.L,
                GroupsToken: minPersistentResponse.G,
                Error: minPersistentResponse.E
            };
        },

        updateGroups: function (connection, groupsToken) {
            if (groupsToken) {
                connection.groupsToken = groupsToken;
            }
        },

        stringifySend: function (connection, message) {
            if (typeof (message) === "string" || typeof (message) === "undefined" || message === null) {
                return message;
            }
            return connection.json.stringify(message);
        },

        ajaxSend: function (connection, data) {
            var payload = transportLogic.stringifySend(connection, data),
                url = getAjaxUrl(connection, "/send"),
                xhr,
                onFail = function (error, connection) {
                    $(connection).triggerHandler(events.onError, [signalR._.transportError(signalR.resources.sendFailed, connection.transport, error, xhr), data]);
                };


            xhr = transportLogic.ajax(connection, {
                url: url,
                type: connection.ajaxDataType === "jsonp" ? "GET" : "POST",
                contentType: signalR._.defaultContentType,
                headers: connection.accessToken ? { "Authorization": "Bearer " + connection.accessToken } : {},
                data: {
                    data: payload
                },
                success: function (result) {
                    var res;

                    if (result) {
                        try {
                            res = connection._parseResponse(result);
                        }
                        catch (error) {
                            onFail(error, connection);
                            connection.stop();
                            return;
                        }

                        transportLogic.triggerReceived(connection, res);
                    }
                },
                error: function (error, textStatus) {
                    if (textStatus === "abort" || textStatus === "parsererror") {
                        // The parsererror happens for sends that don't return any data, and hence
                        // don't write the jsonp callback to the response. This is harder to fix on the server
                        // so just hack around it on the client for now.
                        return;
                    }

                    onFail(error, connection);
                }
            });

            return xhr;
        },

        ajaxAbort: function (connection, async) {
            if (typeof (connection.transport) === "undefined") {
                return;
            }

            // Async by default unless explicitly overidden
            async = typeof async === "undefined" ? true : async;

            var url = getAjaxUrl(connection, "/abort");

            transportLogic.ajax(connection, {
                url: url,
                async: async,
                timeout: 1000,
                type: "POST",
                headers: connection.accessToken ? { "Authorization": "Bearer " + connection.accessToken } : {},
                dataType: "text" // We don't want to use JSONP here even when JSONP is enabled
            });

            connection.log("Fired ajax abort async = " + async + ".");
        },

        ajaxStart: function (connection, onSuccess) {
            var rejectDeferred = function (error) {
                    var deferred = connection._deferral;
                    if (deferred) {
                        deferred.reject(error);
                    }
                },
                triggerStartError = function (error) {
                    connection.log("The start request failed. Stopping the connection.");
                    $(connection).triggerHandler(events.onError, [error]);
                    rejectDeferred(error);
                    connection.stop();
                };

            connection._.startRequest = transportLogic.ajax(connection, {
                url: getAjaxUrl(connection, "/start"),
                headers: connection.accessToken ? { "Authorization": "Bearer " + connection.accessToken } : {},
                success: function (result, statusText, xhr) {
                    var data;

                    try {
                        data = connection._parseResponse(result);
                    } catch (error) {
                        triggerStartError(signalR._.error(
                            signalR._.format(signalR.resources.errorParsingStartResponse, result),
                            error, xhr));
                        return;
                    }

                    if (data.Response === "started") {
                        onSuccess();
                    } else {
                        triggerStartError(signalR._.error(
                            signalR._.format(signalR.resources.invalidStartResponse, result),
                            null /* error */, xhr));
                    }
                },
                error: function (xhr, statusText, error) {
                    if (statusText !== startAbortText) {
                        triggerStartError(signalR._.error(
                            signalR.resources.errorDuringStartRequest,
                            error, xhr));
                    } else {
                        // Stop has been called, no need to trigger the error handler
                        // or stop the connection again with onStartError
                        connection.log("The start request aborted because connection.stop() was called.");
                        rejectDeferred(signalR._.error(
                            signalR.resources.stoppedDuringStartRequest,
                            null /* error */, xhr));
                    }
                }
            });
        },

        tryAbortStartRequest: function (connection) {
            if (connection._.startRequest) {
                // If the start request has already completed this will noop.
                connection._.startRequest.abort(startAbortText);
                delete connection._.startRequest;
            }
        },

        tryInitialize: function (connection, persistentResponse, onInitialized) {
            if (persistentResponse.Initialized && onInitialized) {
                onInitialized();
            } else if (persistentResponse.Initialized) {
                connection.log("WARNING! The client received an init message after reconnecting.");
            }

        },

        triggerReceived: function (connection, data) {
            if (!connection._.connectingMessageBuffer.tryBuffer(data)) {
                $(connection).triggerHandler(events.onReceived, [data]);
            }
        },

        processMessages: function (connection, minData, onInitialized) {
            var data;

            if(minData && (typeof minData.I !== "undefined")) {
                // This is a response to a message the client sent
                transportLogic.triggerReceived(connection, minData);
                return;
            }

            // Update the last message time stamp
            transportLogic.markLastMessage(connection);

            if (minData) {
                // This is a message send directly to the client
                data = transportLogic.maximizePersistentResponse(minData);

                if (data.Error) {
                    // This is a global error, stop the connection.
                    connection.log("Received an error message from the server: " + minData.E);
                    $(connection).triggerHandler(signalR.events.onError, [signalR._.error(minData.E, /* source */ "ServerError")]);
                    connection.stop(/* async */ false, /* notifyServer */ false);
                    return;
                }

                transportLogic.updateGroups(connection, data.GroupsToken);

                if (data.MessageId) {
                    connection.messageId = data.MessageId;
                }

                if (data.Messages) {
                    $.each(data.Messages, function (index, message) {
                        transportLogic.triggerReceived(connection, message);
                    });

                    transportLogic.tryInitialize(connection, data, onInitialized);
                }
            }
        },

        monitorKeepAlive: function (connection) {
            var keepAliveData = connection._.keepAliveData;

            // If we haven't initiated the keep alive timeouts then we need to
            if (!keepAliveData.monitoring) {
                keepAliveData.monitoring = true;

                transportLogic.markLastMessage(connection);

                // Save the function so we can unbind it on stop
                connection._.keepAliveData.reconnectKeepAliveUpdate = function () {
                    // Mark a new message so that keep alive doesn't time out connections
                    transportLogic.markLastMessage(connection);
                };

                // Update Keep alive on reconnect
                $(connection).bind(events.onReconnect, connection._.keepAliveData.reconnectKeepAliveUpdate);

                connection.log("Now monitoring keep alive with a warning timeout of " + keepAliveData.timeoutWarning + ", keep alive timeout of " + keepAliveData.timeout + " and disconnecting timeout of " + connection.disconnectTimeout);
            } else {
                connection.log("Tried to monitor keep alive but it's already being monitored.");
            }
        },

        stopMonitoringKeepAlive: function (connection) {
            var keepAliveData = connection._.keepAliveData;

            // Only attempt to stop the keep alive monitoring if its being monitored
            if (keepAliveData.monitoring) {
                // Stop monitoring
                keepAliveData.monitoring = false;

                // Remove the updateKeepAlive function from the reconnect event
                $(connection).unbind(events.onReconnect, connection._.keepAliveData.reconnectKeepAliveUpdate);

                // Clear all the keep alive data
                connection._.keepAliveData = {};
                connection.log("Stopping the monitoring of the keep alive.");
            }
        },

        startHeartbeat: function (connection) {
            connection._.lastActiveAt = new Date().getTime();
            beat(connection);
        },

        markLastMessage: function (connection) {
            connection._.lastMessageAt = new Date().getTime();
        },

        markActive: function (connection) {
            if (transportLogic.verifyLastActive(connection)) {
                connection._.lastActiveAt = new Date().getTime();
                return true;
            }

            return false;
        },

        isConnectedOrReconnecting: function (connection) {
            return connection.state === signalR.connectionState.connected ||
                   connection.state === signalR.connectionState.reconnecting;
        },

        ensureReconnectingState: function (connection) {
            if (changeState(connection,
                        signalR.connectionState.connected,
                        signalR.connectionState.reconnecting) === true) {
                $(connection).triggerHandler(events.onReconnecting);
            }
            return connection.state === signalR.connectionState.reconnecting;
        },

        clearReconnectTimeout: function (connection) {
            if (connection && connection._.reconnectTimeout) {
                window.clearTimeout(connection._.reconnectTimeout);
                delete connection._.reconnectTimeout;
            }
        },

        verifyLastActive: function (connection) {
            if (new Date().getTime() - connection._.lastActiveAt >= connection.reconnectWindow) {
                var message = signalR._.format(signalR.resources.reconnectWindowTimeout, new Date(connection._.lastActiveAt), connection.reconnectWindow);
                connection.log(message);
                $(connection).triggerHandler(events.onError, [signalR._.error(message, /* source */ "TimeoutException")]);
                connection.stop(/* async */ false, /* notifyServer */ false);
                return false;
            }

            return true;
        },

        reconnect: function (connection, transportName) {
            var transport = signalR.transports[transportName];

            // We should only set a reconnectTimeout if we are currently connected
            // and a reconnectTimeout isn't already set.
            if (transportLogic.isConnectedOrReconnecting(connection) && !connection._.reconnectTimeout) {
                // Need to verify before the setTimeout occurs because an application sleep could occur during the setTimeout duration.
                if (!transportLogic.verifyLastActive(connection)) {
                    return;
                }

                connection._.reconnectTimeout = window.setTimeout(function () {
                    if (!transportLogic.verifyLastActive(connection)) {
                        return;
                    }

                    transport.stop(connection);

                    if (transportLogic.ensureReconnectingState(connection)) {
                        connection.log(transportName + " reconnecting.");
                        transport.start(connection);
                    }
                }, connection.reconnectDelay);
            }
        },

        handleParseFailure: function (connection, result, error, onFailed, context) {
            var wrappedError = signalR._.transportError(
                signalR._.format(signalR.resources.parseFailed, result),
                connection.transport,
                error,
                context);

            // If we're in the initialization phase trigger onFailed, otherwise stop the connection.
            if (onFailed && onFailed(wrappedError)) {
                connection.log("Failed to parse server response while attempting to connect.");
            } else {
                $(connection).triggerHandler(events.onError, [wrappedError]);
                connection.stop();
            }
        },

        initHandler: function (connection) {
            return new InitHandler(connection);
        },

        foreverFrame: {
            count: 0,
            connections: {}
        }
    };

}(window.jQuery, window));
/* jquery.signalR.transports.webSockets.js */
// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.


/*global window:false */
/// <reference path="jquery.signalR.transports.common.js" />

(function ($, window, undefined) {

    var signalR = $.signalR,
        events = $.signalR.events,
        changeState = $.signalR.changeState,
        transportLogic = signalR.transports._logic;

    signalR.transports.webSockets = {
        name: "webSockets",

        supportsKeepAlive: function () {
            return true;
        },

        send: function (connection, data) {
            var payload = transportLogic.stringifySend(connection, data);

            try {
                connection.socket.send(payload);
            } catch (ex) {
                $(connection).triggerHandler(events.onError,
                    [signalR._.transportError(
                        signalR.resources.webSocketsInvalidState,
                        connection.transport,
                        ex,
                        connection.socket
                    ),
                    data]);
            }
        },

        start: function (connection, onSuccess, onFailed) {
            var url,
                opened = false,
                that = this,
                reconnecting = !onSuccess,
                $connection = $(connection);

            if (!window.WebSocket) {
                onFailed();
                return;
            }

            if (!connection.socket) {
                if (connection.webSocketServerUrl) {
                    url = connection.webSocketServerUrl;
                } else {
                    url = connection.wsProtocol + connection.host;
                }

                url += transportLogic.getUrl(connection, this.name, reconnecting);

                connection.log("Connecting to websocket endpoint '" + url + "'.");
                connection.socket = new window.WebSocket(url);

                connection.socket.onopen = function () {
                    opened = true;
                    connection.log("Websocket opened.");

                    transportLogic.clearReconnectTimeout(connection);

                    if (changeState(connection,
                                    signalR.connectionState.reconnecting,
                                    signalR.connectionState.connected) === true) {
                        $connection.triggerHandler(events.onReconnect);
                    }
                };

                connection.socket.onclose = function (event) {
                    var error;

                    // Only handle a socket close if the close is from the current socket.
                    // Sometimes on disconnect the server will push down an onclose event
                    // to an expired socket.

                    if (this === connection.socket) {
                        if (opened && typeof event.wasClean !== "undefined" && event.wasClean === false) {
                            // Ideally this would use the websocket.onerror handler (rather than checking wasClean in onclose) but
                            // I found in some circumstances Chrome won't call onerror. This implementation seems to work on all browsers.
                            error = signalR._.transportError(
                                signalR.resources.webSocketClosed,
                                connection.transport,
                                event);

                            connection.log("Unclean disconnect from websocket: " + (event.reason || "[no reason given]."));
                        } else {
                            connection.log("Websocket closed.");
                        }

                        if (!onFailed || !onFailed(error)) {
                            if (error) {
                                $(connection).triggerHandler(events.onError, [error]);
                            }

                            that.reconnect(connection);
                        }
                    }
                };

                connection.socket.onmessage = function (event) {
                    var data;

                    try {
                        data = connection._parseResponse(event.data);
                    }
                    catch (error) {
                        transportLogic.handleParseFailure(connection, event.data, error, onFailed, event);
                        return;
                    }

                    if (data) {
                        transportLogic.processMessages(connection, data, onSuccess);
                    }
                };
            }
        },

        reconnect: function (connection) {
            transportLogic.reconnect(connection, this.name);
        },

        lostConnection: function (connection) {
            this.reconnect(connection);
        },

        stop: function (connection) {
            // Don't trigger a reconnect after stopping
            transportLogic.clearReconnectTimeout(connection);

            if (connection.socket) {
                connection.log("Closing the Websocket.");
                connection.socket.close();
                connection.socket = null;
            }
        },

        abort: function (connection, async) {
            transportLogic.ajaxAbort(connection, async);
        }
    };

}(window.jQuery, window));
/* jquery.signalR.transports.serverSentEvents.js */
// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.


/*global window:false */
/// <reference path="jquery.signalR.transports.common.js" />

(function ($, window, undefined) {

    var signalR = $.signalR,
        events = $.signalR.events,
        changeState = $.signalR.changeState,
        transportLogic = signalR.transports._logic,
        clearReconnectAttemptTimeout = function (connection) {
            window.clearTimeout(connection._.reconnectAttemptTimeoutHandle);
            delete connection._.reconnectAttemptTimeoutHandle;
        };

    signalR.transports.serverSentEvents = {
        name: "serverSentEvents",

        supportsKeepAlive: function () {
            return true;
        },

        timeOut: 3000,

        start: function (connection, onSuccess, onFailed) {
            var that = this,
                opened = false,
                $connection = $(connection),
                reconnecting = !onSuccess,
                url;

            if (connection.eventSource) {
                connection.log("The connection already has an event source. Stopping it.");
                connection.stop();
            }

            if (!window.EventSource) {
                if (onFailed) {
                    connection.log("This browser doesn't support SSE.");
                    onFailed();
                }
                return;
            }

            url = transportLogic.getUrl(connection, this.name, reconnecting);

            try {
                connection.log("Attempting to connect to SSE endpoint '" + url + "'.");
                connection.eventSource = new window.EventSource(url, { withCredentials: connection.withCredentials });
            }
            catch (e) {
                connection.log("EventSource failed trying to connect with error " + e.Message + ".");
                if (onFailed) {
                    // The connection failed, call the failed callback
                    onFailed();
                } else {
                    $connection.triggerHandler(events.onError, [signalR._.transportError(signalR.resources.eventSourceFailedToConnect, connection.transport, e)]);
                    if (reconnecting) {
                        // If we were reconnecting, rather than doing initial connect, then try reconnect again
                        that.reconnect(connection);
                    }
                }
                return;
            }

            if (reconnecting) {
                connection._.reconnectAttemptTimeoutHandle = window.setTimeout(function () {
                    if (opened === false) {
                        // If we're reconnecting and the event source is attempting to connect,
                        // don't keep retrying. This causes duplicate connections to spawn.
                        if (connection.eventSource.readyState !== window.EventSource.OPEN) {
                            // If we were reconnecting, rather than doing initial connect, then try reconnect again
                            that.reconnect(connection);
                        }
                    }
                },
                that.timeOut);
            }

            connection.eventSource.addEventListener("open", function (e) {
                connection.log("EventSource connected.");

                clearReconnectAttemptTimeout(connection);
                transportLogic.clearReconnectTimeout(connection);

                if (opened === false) {
                    opened = true;

                    if (changeState(connection,
                                         signalR.connectionState.reconnecting,
                                         signalR.connectionState.connected) === true) {
                        $connection.triggerHandler(events.onReconnect);
                    }
                }
            }, false);

            connection.eventSource.addEventListener("message", function (e) {
                var res;

                // process messages
                if (e.data === "initialized") {
                    return;
                }

                try {
                    res = connection._parseResponse(e.data);
                }
                catch (error) {
                    transportLogic.handleParseFailure(connection, e.data, error, onFailed, e);
                    return;
                }

                transportLogic.processMessages(connection, res, onSuccess);
            }, false);

            connection.eventSource.addEventListener("error", function (e) {
                var error = signalR._.transportError(
                    signalR.resources.eventSourceError,
                    connection.transport,
                    e);

                // Only handle an error if the error is from the current Event Source.
                // Sometimes on disconnect the server will push down an error event
                // to an expired Event Source.
                if (this !== connection.eventSource) {
                    return;
                }

                if (onFailed && onFailed(error)) {
                    return;
                }

                connection.log("EventSource readyState: " + connection.eventSource.readyState + ".");

                if (e.eventPhase === window.EventSource.CLOSED) {
                    // We don't use the EventSource's native reconnect function as it
                    // doesn't allow us to change the URL when reconnecting. We need
                    // to change the URL to not include the /connect suffix, and pass
                    // the last message id we received.
                    connection.log("EventSource reconnecting due to the server connection ending.");
                    that.reconnect(connection);
                } else {
                    // connection error
                    connection.log("EventSource error.");
                    $connection.triggerHandler(events.onError, [error]);
                }
            }, false);
        },

        reconnect: function (connection) {
            transportLogic.reconnect(connection, this.name);
        },

        lostConnection: function (connection) {
            this.reconnect(connection);
        },

        send: function (connection, data) {
            transportLogic.ajaxSend(connection, data);
        },

        stop: function (connection) {
            // Don't trigger a reconnect after stopping
            clearReconnectAttemptTimeout(connection);
            transportLogic.clearReconnectTimeout(connection);

            if (connection && connection.eventSource) {
                connection.log("EventSource calling close().");
                connection.eventSource.close();
                connection.eventSource = null;
                delete connection.eventSource;
            }
        },

        abort: function (connection, async) {
            transportLogic.ajaxAbort(connection, async);
        }
    };

}(window.jQuery, window));
/* jquery.signalR.transports.foreverFrame.js */
// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.


/*global window:false */
/// <reference path="jquery.signalR.transports.common.js" />

(function ($, window, undefined) {

    var signalR = $.signalR,
        events = $.signalR.events,
        changeState = $.signalR.changeState,
        transportLogic = signalR.transports._logic,
        createFrame = function () {
            var frame = window.document.createElement("iframe");
            frame.setAttribute("style", "position:absolute;top:0;left:0;width:0;height:0;visibility:hidden;");
            return frame;
        },
        // Used to prevent infinite loading icon spins in older versions of ie
        // We build this object inside a closure so we don't pollute the rest of
        // the foreverFrame transport with unnecessary functions/utilities.
        loadPreventer = (function () {
            var loadingFixIntervalId = null,
                loadingFixInterval = 1000,
                attachedTo = 0;

            return {
                prevent: function () {
                    // Prevent additional iframe removal procedures from newer browsers
                    if (signalR._.ieVersion <= 8) {
                        // We only ever want to set the interval one time, so on the first attachedTo
                        if (attachedTo === 0) {
                            // Create and destroy iframe every 3 seconds to prevent loading icon, super hacky
                            loadingFixIntervalId = window.setInterval(function () {
                                var tempFrame = createFrame();

                                window.document.body.appendChild(tempFrame);
                                window.document.body.removeChild(tempFrame);

                                tempFrame = null;
                            }, loadingFixInterval);
                        }

                        attachedTo++;
                    }
                },
                cancel: function () {
                    // Only clear the interval if there's only one more object that the loadPreventer is attachedTo
                    if (attachedTo === 1) {
                        window.clearInterval(loadingFixIntervalId);
                    }

                    if (attachedTo > 0) {
                        attachedTo--;
                    }
                }
            };
        })();

    signalR.transports.foreverFrame = {
        name: "foreverFrame",

        supportsKeepAlive: function () {
            return true;
        },

        // Added as a value here so we can create tests to verify functionality
        iframeClearThreshold: 50,

        start: function (connection, onSuccess, onFailed) {
            if (connection.accessToken) {
                if (onFailed) {
                    connection.log("Forever Frame does not support connections that require a Bearer token to connect, such as the Azure SignalR Service.");
                    onFailed();
                }
                return;
            }

            var that = this,
                frameId = (transportLogic.foreverFrame.count += 1),
                url,
                frame = createFrame(),
                frameLoadHandler = function () {
                    connection.log("Forever frame iframe finished loading and is no longer receiving messages.");
                    if (!onFailed || !onFailed()) {
                        that.reconnect(connection);
                    }
                };

            if (window.EventSource) {
                // If the browser supports SSE, don't use Forever Frame
                if (onFailed) {
                    connection.log("Forever Frame is not supported by SignalR on browsers with SSE support.");
                    onFailed();
                }
                return;
            }

            frame.setAttribute("data-signalr-connection-id", connection.id);

            // Start preventing loading icon
            // This will only perform work if the loadPreventer is not attached to another connection.
            loadPreventer.prevent();

            // Build the url
            url = transportLogic.getUrl(connection, this.name);
            url += "&frameId=" + frameId;

            // add frame to the document prior to setting URL to avoid caching issues.
            window.document.documentElement.appendChild(frame);

            connection.log("Binding to iframe's load event.");

            if (frame.addEventListener) {
                frame.addEventListener("load", frameLoadHandler, false);
            } else if (frame.attachEvent) {
                frame.attachEvent("onload", frameLoadHandler);
            }

            frame.src = url;
            transportLogic.foreverFrame.connections[frameId] = connection;

            connection.frame = frame;
            connection.frameId = frameId;

            if (onSuccess) {
                connection.onSuccess = function () {
                    connection.log("Iframe transport started.");
                    onSuccess();
                };
            }
        },

        reconnect: function (connection) {
            var that = this;

            // Need to verify connection state and verify before the setTimeout occurs because an application sleep could occur during the setTimeout duration.
            if (transportLogic.isConnectedOrReconnecting(connection) && transportLogic.verifyLastActive(connection)) {
                window.setTimeout(function () {
                    // Verify that we're ok to reconnect.
                    if (!transportLogic.verifyLastActive(connection)) {
                        return;
                    }

                    if (connection.frame && transportLogic.ensureReconnectingState(connection)) {
                        var frame = connection.frame,
                            src = transportLogic.getUrl(connection, that.name, true) + "&frameId=" + connection.frameId;
                        connection.log("Updating iframe src to '" + src + "'.");
                        frame.src = src;
                    }
                }, connection.reconnectDelay);
            }
        },

        lostConnection: function (connection) {
            this.reconnect(connection);
        },

        send: function (connection, data) {
            transportLogic.ajaxSend(connection, data);
        },

        receive: function (connection, data) {
            var cw,
                body,
                response;

            if (connection.json !== connection._originalJson) {
                // If there's a custom JSON parser configured then serialize the object
                // using the original (browser) JSON parser and then deserialize it using
                // the custom parser (connection._parseResponse does that). This is so we
                // can easily send the response from the server as "raw" JSON but still
                // support custom JSON deserialization in the browser.
                data = connection._originalJson.stringify(data);
            }

            response = connection._parseResponse(data);

            transportLogic.processMessages(connection, response, connection.onSuccess);

            // Protect against connection stopping from a callback trigger within the processMessages above.
            if (connection.state === $.signalR.connectionState.connected) {
                // Delete the script & div elements
                connection.frameMessageCount = (connection.frameMessageCount || 0) + 1;
                if (connection.frameMessageCount > signalR.transports.foreverFrame.iframeClearThreshold) {
                    connection.frameMessageCount = 0;
                    cw = connection.frame.contentWindow || connection.frame.contentDocument;
                    if (cw && cw.document && cw.document.body) {
                        body = cw.document.body;

                        // Remove all the child elements from the iframe's body to conserver memory
                        while (body.firstChild) {
                            body.removeChild(body.firstChild);
                        }
                    }
                }
            }
        },

        stop: function (connection) {
            var cw = null;

            // Stop attempting to prevent loading icon
            loadPreventer.cancel();

            if (connection.frame) {
                if (connection.frame.stop) {
                    connection.frame.stop();
                } else {
                    try {
                        cw = connection.frame.contentWindow || connection.frame.contentDocument;
                        if (cw.document && cw.document.execCommand) {
                            cw.document.execCommand("Stop");
                        }
                    }
                    catch (e) {
                        connection.log("Error occurred when stopping foreverFrame transport. Message = " + e.message + ".");
                    }
                }

                // Ensure the iframe is where we left it
                if (connection.frame.parentNode === window.document.documentElement) {
                    window.document.documentElement.removeChild(connection.frame);
                }

                delete transportLogic.foreverFrame.connections[connection.frameId];
                connection.frame = null;
                connection.frameId = null;
                delete connection.frame;
                delete connection.frameId;
                delete connection.onSuccess;
                delete connection.frameMessageCount;
                connection.log("Stopping forever frame.");
            }
        },

        abort: function (connection, async) {
            transportLogic.ajaxAbort(connection, async);
        },

        getConnection: function (id) {
            return transportLogic.foreverFrame.connections[id];
        },

        started: function (connection) {
            if (changeState(connection,
                signalR.connectionState.reconnecting,
                signalR.connectionState.connected) === true) {

                $(connection).triggerHandler(events.onReconnect);
            }
        }
    };

}(window.jQuery, window));
/* jquery.signalR.transports.longPolling.js */
// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.


/*global window:false */
/// <reference path="jquery.signalR.transports.common.js" />

(function ($, window, undefined) {

    var signalR = $.signalR,
        events = $.signalR.events,
        changeState = $.signalR.changeState,
        isDisconnecting = $.signalR.isDisconnecting,
        transportLogic = signalR.transports._logic;

    signalR.transports.longPolling = {
        name: "longPolling",

        supportsKeepAlive: function () {
            return false;
        },

        reconnectDelay: 3000,

        start: function (connection, onSuccess, onFailed) {
            /// <summary>Starts the long polling connection</summary>
            /// <param name="connection" type="signalR">The SignalR connection to start</param>
            var that = this,
                fireConnect = function () {
                    fireConnect = $.noop;

                    connection.log("LongPolling connected.");

                    if (onSuccess) {
                        onSuccess();
                    } else {
                        connection.log("WARNING! The client received an init message after reconnecting.");
                    }
                },
                tryFailConnect = function (error) {
                    if (onFailed(error)) {
                        connection.log("LongPolling failed to connect.");
                        return true;
                    }

                    return false;
                },
                privateData = connection._,
                reconnectErrors = 0,
                fireReconnected = function (instance) {
                    window.clearTimeout(privateData.reconnectTimeoutId);
                    privateData.reconnectTimeoutId = null;

                    if (changeState(instance,
                                    signalR.connectionState.reconnecting,
                                    signalR.connectionState.connected) === true) {
                        // Successfully reconnected!
                        instance.log("Raising the reconnect event");
                        $(instance).triggerHandler(events.onReconnect);
                    }
                },
                // 1 hour
                maxFireReconnectedTimeout = 3600000;

            if (connection.pollXhr) {
                connection.log("Polling xhr requests already exists, aborting.");
                connection.stop();
            }

            connection.messageId = null;

            privateData.reconnectTimeoutId = null;

            privateData.pollTimeoutId = window.setTimeout(function () {
                (function poll(instance, raiseReconnect) {
                    var messageId = instance.messageId,
                        connect = (messageId === null),
                        reconnecting = !connect,
                        polling = !raiseReconnect,
                        url = transportLogic.getUrl(instance, that.name, reconnecting, polling, true /* use Post for longPolling */),
                        postData = {};

                    if (instance.messageId) {
                        postData.messageId = instance.messageId;
                    }

                    if (instance.groupsToken) {
                        postData.groupsToken = instance.groupsToken;
                    }

                    // If we've disconnected during the time we've tried to re-instantiate the poll then stop.
                    if (isDisconnecting(instance) === true) {
                        return;
                    }

                    connection.log("Opening long polling request to '" + url + "'.");
                    instance.pollXhr = transportLogic.ajax(connection, {
                        xhrFields: {
                            onprogress: function () {
                                transportLogic.markLastMessage(connection);
                            }
                        },
                        url: url,
                        type: "POST",
                        contentType: signalR._.defaultContentType,
                        data: postData,
                        timeout: connection._.pollTimeout,
                        headers: connection.accessToken ? { "Authorization": "Bearer " + connection.accessToken } : {},
                        success: function (result) {
                            var minData,
                                delay = 0,
                                data,
                                shouldReconnect;

                            connection.log("Long poll complete.");

                            // Reset our reconnect errors so if we transition into a reconnecting state again we trigger
                            // reconnected quickly
                            reconnectErrors = 0;

                            try {
                                // Remove any keep-alives from the beginning of the result
                                minData = connection._parseResponse(result);
                            }
                            catch (error) {
                                transportLogic.handleParseFailure(instance, result, error, tryFailConnect, instance.pollXhr);
                                return;
                            }

                            // If there's currently a timeout to trigger reconnect, fire it now before processing messages
                            if (privateData.reconnectTimeoutId !== null) {
                                fireReconnected(instance);
                            }

                            if (minData) {
                                data = transportLogic.maximizePersistentResponse(minData);
                            }

                            transportLogic.processMessages(instance, minData, fireConnect);

                            if (data &&
                                $.type(data.LongPollDelay) === "number") {
                                delay = data.LongPollDelay;
                            }

                            if (isDisconnecting(instance) === true) {
                                return;
                            }

                            shouldReconnect = data && data.ShouldReconnect;
                            if (shouldReconnect) {
                                // Transition into the reconnecting state
                                // If this fails then that means that the user transitioned the connection into a invalid state in processMessages.
                                if (!transportLogic.ensureReconnectingState(instance)) {
                                    return;
                                }
                            }

                            // We never want to pass a raiseReconnect flag after a successful poll.  This is handled via the error function
                            if (delay > 0) {
                                privateData.pollTimeoutId = window.setTimeout(function () {
                                    poll(instance, shouldReconnect);
                                }, delay);
                            } else {
                                poll(instance, shouldReconnect);
                            }
                        },

                        error: function (data, textStatus) {
                            var error = signalR._.transportError(signalR.resources.longPollFailed, connection.transport, data, instance.pollXhr);

                            // Stop trying to trigger reconnect, connection is in an error state
                            // If we're not in the reconnect state this will noop
                            window.clearTimeout(privateData.reconnectTimeoutId);
                            privateData.reconnectTimeoutId = null;

                            if (textStatus === "abort") {
                                connection.log("Aborted xhr request.");
                                return;
                            }

                            if (!tryFailConnect(error)) {

                                // Increment our reconnect errors, we assume all errors to be reconnect errors
                                // In the case that it's our first error this will cause Reconnect to be fired
                                // after 1 second due to reconnectErrors being = 1.
                                reconnectErrors++;

                                if (connection.state !== signalR.connectionState.reconnecting) {
                                    connection.log("An error occurred using longPolling. Status = " + textStatus + ".  Response = " + data.responseText + ".");
                                    $(instance).triggerHandler(events.onError, [error]);
                                }

                                // We check the state here to verify that we're not in an invalid state prior to verifying Reconnect.
                                // If we're not in connected or reconnecting then the next ensureReconnectingState check will fail and will return.
                                // Therefore we don't want to change that failure code path.
                                if ((connection.state === signalR.connectionState.connected ||
                                    connection.state === signalR.connectionState.reconnecting) &&
                                    !transportLogic.verifyLastActive(connection)) {
                                    return;
                                }

                                // Transition into the reconnecting state
                                // If this fails then that means that the user transitioned the connection into the disconnected or connecting state within the above error handler trigger.
                                if (!transportLogic.ensureReconnectingState(instance)) {
                                    return;
                                }

                                // Call poll with the raiseReconnect flag as true after the reconnect delay
                                privateData.pollTimeoutId = window.setTimeout(function () {
                                    poll(instance, true);
                                }, that.reconnectDelay);
                            }
                        }
                    });

                    // This will only ever pass after an error has occurred via the poll ajax procedure.
                    if (reconnecting && raiseReconnect === true) {
                        // We wait to reconnect depending on how many times we've failed to reconnect.
                        // This is essentially a heuristic that will exponentially increase in wait time before
                        // triggering reconnected.  This depends on the "error" handler of Poll to cancel this
                        // timeout if it triggers before the Reconnected event fires.
                        // The Math.min at the end is to ensure that the reconnect timeout does not overflow.
                        privateData.reconnectTimeoutId = window.setTimeout(function () { fireReconnected(instance); }, Math.min(1000 * (Math.pow(2, reconnectErrors) - 1), maxFireReconnectedTimeout));
                    }
                }(connection));
            }, 250); // Have to delay initial poll so Chrome doesn't show loader spinner in tab
        },

        lostConnection: function (connection) {
            if (connection.pollXhr) {
                connection.pollXhr.abort("lostConnection");
            }
        },

        send: function (connection, data) {
            transportLogic.ajaxSend(connection, data);
        },

        stop: function (connection) {
            /// <summary>Stops the long polling connection</summary>
            /// <param name="connection" type="signalR">The SignalR connection to stop</param>

            window.clearTimeout(connection._.pollTimeoutId);
            window.clearTimeout(connection._.reconnectTimeoutId);

            delete connection._.pollTimeoutId;
            delete connection._.reconnectTimeoutId;

            if (connection.pollXhr) {
                connection.pollXhr.abort();
                connection.pollXhr = null;
                delete connection.pollXhr;
            }
        },

        abort: function (connection, async) {
            transportLogic.ajaxAbort(connection, async);
        }
    };

}(window.jQuery, window));
/* jquery.signalR.hubs.js */
// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.

/*global window:false */
/// <reference path="jquery.signalR.core.js" />

(function ($, window, undefined) {

    var nextGuid = 0;
    var eventNamespace = ".hubProxy",
        signalR = $.signalR;

    function makeEventName(event) {
        return event + eventNamespace;
    }

    // Equivalent to Array.prototype.map
    function map(arr, fun, thisp) {
        var i,
            length = arr.length,
            result = [];
        for (i = 0; i < length; i += 1) {
            if (arr.hasOwnProperty(i)) {
                result[i] = fun.call(thisp, arr[i], i, arr);
            }
        }
        return result;
    }

    function getArgValue(a) {
        return $.isFunction(a) ? null : ($.type(a) === "undefined" ? null : a);
    }

    function hasMembers(obj) {
        for (var key in obj) {
            // If we have any properties in our callback map then we have callbacks and can exit the loop via return
            if (obj.hasOwnProperty(key)) {
                return true;
            }
        }

        return false;
    }

    function clearInvocationCallbacks(connection, error) {
        /// <param name="connection" type="hubConnection" />
        var callbacks = connection._.invocationCallbacks,
            callback;

        if (hasMembers(callbacks)) {
            connection.log("Clearing hub invocation callbacks with error: " + error + ".");
        }

        // Reset the callback cache now as we have a local var referencing it
        connection._.invocationCallbackId = 0;
        delete connection._.invocationCallbacks;
        connection._.invocationCallbacks = {};

        // Loop over the callbacks and invoke them.
        // We do this using a local var reference and *after* we've cleared the cache
        // so that if a fail callback itself tries to invoke another method we don't
        // end up with its callback in the list we're looping over.
        for (var callbackId in callbacks) {
            callback = callbacks[callbackId];
            callback.method.call(callback.scope, { E: error });
        }
    }

    function isCallbackFromGeneratedHubProxy(callback) {
        // https://github.com/SignalR/SignalR/issues/4310
        // The stringified callback from the old generated hub proxy is 137 characters in Edge, Firefox and Chrome.
        // We slice to avoid wasting too many cycles searching through the text of a long large function.
        return $.isFunction(callback) && callback.toString().slice(0, 256).indexOf("// Call the client hub method") >= 0;
    }

    // hubProxy
    function hubProxy(hubConnection, hubName) {
        /// <summary>
        ///     Creates a new proxy object for the given hub connection that can be used to invoke
        ///     methods on server hubs and handle client method invocation requests from the server.
        /// </summary>
        return new hubProxy.fn.init(hubConnection, hubName);
    }

    hubProxy.fn = hubProxy.prototype = {
        init: function (connection, hubName) {
            this.state = {};
            this.connection = connection;
            this.hubName = hubName;
            this._ = {
                callbackMap: {}
            };
        },

        constructor: hubProxy,

        hasSubscriptions: function () {
            return hasMembers(this._.callbackMap);
        },

        on: function (eventName, callback, callbackIdentity) {
            /// <summary>Wires up a callback to be invoked when a invocation request is received from the server hub.</summary>
            /// <param name="eventName" type="String">The name of the hub event to register the callback for.</param>
            /// <param name="callback" type="Function">The callback to be invoked.</param>
            /// <param name="callbackIdentity" type="Object">An optional object to use as the "identity" for the callback when checking if the handler has already been registered. Defaults to the value of 'callback' if not provided.</param>
            var that = this,
                callbackMap = that._.callbackMap,
                isFromOldGeneratedHubProxy = !callbackIdentity && isCallbackFromGeneratedHubProxy(callback);

            // We need the third "identity" argument because the registerHubProxies call made by signalr/js wraps the user-provided callback in a custom wrapper which breaks the identity comparison.
            // callbackIdentity allows the caller of `on` to provide a separate object to use as the "identity". `registerHubProxies` uses the original user callback as this identity object.
            callbackIdentity = callbackIdentity || callback;

            // Assign a global ID to the identity object. This tags the object so we can detect the same object when it comes back.
            if(!callbackIdentity._signalRGuid) {
                callbackIdentity._signalRGuid = nextGuid++;
            }

            // Normalize the event name to lowercase
            eventName = eventName.toLowerCase();

            // If there is not an event registered for this callback yet we want to create its event space in the callback map.
            var callbackSpace = callbackMap[eventName];
            if (!callbackSpace) {
                callbackSpace = [];
                callbackMap[eventName] = callbackSpace;
            }

            // Check if there's already a registration
            var registration;
            for (var i = 0; i < callbackSpace.length; i++) {
                if (callbackSpace[i].guid === callbackIdentity._signalRGuid || (isFromOldGeneratedHubProxy && callbackSpace[i].isFromOldGeneratedHubProxy)) {
                    registration = callbackSpace[i];
                }
            }

            // Create a registration if there isn't one already
            if (!registration) {
                registration = {
                    guid: callbackIdentity._signalRGuid,
                    eventHandlers: [],
                    isFromOldGeneratedHubProxy: isFromOldGeneratedHubProxy
                };
                callbackMap[eventName].push(registration);
            }

            var handler = function (e, data) {
                callback.apply(that, data);
            };
            registration.eventHandlers.push(handler);

            $(that).bind(makeEventName(eventName), handler);

            return that;
        },

        off: function (eventName, callback, callbackIdentity) {
            /// <summary>Removes the callback invocation request from the server hub for the given event name.</summary>
            /// <param name="eventName" type="String">The name of the hub event to unregister the callback for.</param>
            /// <param name="callback" type="Function">The callback to be removed.</param>
            /// <param name="callbackIdentity" type="Object">An optional object to use as the "identity" when looking up the callback. Corresponds to the same parameter provided to 'on'. Defaults to the value of 'callback' if not provided.</param>
            var that = this,
                callbackMap = that._.callbackMap,
                callbackSpace,
                isFromOldGeneratedHubProxy = !callbackIdentity && isCallbackFromGeneratedHubProxy(callback);

            callbackIdentity = callbackIdentity || callback;

            // Normalize the event name to lowercase
            eventName = eventName.toLowerCase();

            callbackSpace = callbackMap[eventName];

            // Verify that there is an event space to unbind
            if (callbackSpace) {

                if (callback) {
                    // Find the callback registration
                    var callbackRegistration;
                    var callbackIndex;
                    for (var i = 0; i < callbackSpace.length; i++) {
                        if (callbackSpace[i].guid === callbackIdentity._signalRGuid || (isFromOldGeneratedHubProxy && callbackSpace[i].isFromOldGeneratedHubProxy)) {
                            callbackIndex = i;
                            callbackRegistration = callbackSpace[i];
                        }
                    }

                    // Only unbind if there's an event bound with eventName and a callback with the specified callback
                    if (callbackRegistration) {
                        // Unbind all event handlers associated with the registration.
                        for (var j = 0; j < callbackRegistration.eventHandlers.length; j++) {
                            $(that).unbind(makeEventName(eventName), callbackRegistration.eventHandlers[j]);
                        }

                        // Remove the registration from the list
                        callbackSpace.splice(i, 1);

                        // Check if there are any registrations left, if not we need to destroy it.
                        if (callbackSpace.length === 0) {
                            delete callbackMap[eventName];
                        }
                    }
                } else if (!callback) { // Check if we're removing the whole event and we didn't error because of an invalid callback
                    $(that).unbind(makeEventName(eventName));

                    delete callbackMap[eventName];
                }
            }

            return that;
        },

        invoke: function (methodName) {
            /// <summary>Invokes a server hub method with the given arguments.</summary>
            /// <param name="methodName" type="String">The name of the server hub method.</param>

            var that = this,
                connection = that.connection,
                args = $.makeArray(arguments).slice(1),
                argValues = map(args, getArgValue),
                data = { H: that.hubName, M: methodName, A: argValues, I: connection._.invocationCallbackId },
                d = $.Deferred(),
                callback = function (minResult) {
                    var result = that._maximizeHubResponse(minResult),
                        source,
                        error;

                    // Update the hub state
                    $.extend(that.state, result.State);

                    if (result.Progress) {
                        if (d.notifyWith) {
                            // Progress is only supported in jQuery 1.7+
                            d.notifyWith(that, [result.Progress.Data]);
                        } else if (!connection._.progressjQueryVersionLogged) {
                            connection.log("A hub method invocation progress update was received but the version of jQuery in use (" + $.prototype.jquery + ") does not support progress updates. Upgrade to jQuery 1.7+ to receive progress notifications.");
                            connection._.progressjQueryVersionLogged = true;
                        }
                    } else if (result.Error) {
                        // Server hub method threw an exception, log it & reject the deferred
                        if (result.StackTrace) {
                            connection.log(result.Error + "\n" + result.StackTrace + ".");
                        }

                        // result.ErrorData is only set if a HubException was thrown
                        source = result.IsHubException ? "HubException" : "Exception";
                        error = signalR._.error(result.Error, source);
                        error.data = result.ErrorData;

                        connection.log(that.hubName + "." + methodName + " failed to execute. Error: " + error.message);
                        d.rejectWith(that, [error]);
                    } else {
                        // Server invocation succeeded, resolve the deferred
                        connection.log("Invoked " + that.hubName + "." + methodName);
                        d.resolveWith(that, [result.Result]);
                    }
                };

            connection._.invocationCallbacks[connection._.invocationCallbackId.toString()] = { scope: that, method: callback };
            connection._.invocationCallbackId += 1;

            if (!$.isEmptyObject(that.state)) {
                data.S = that.state;
            }

            connection.log("Invoking " + that.hubName + "." + methodName);
            connection.send(data);

            return d.promise();
        },

        _maximizeHubResponse: function (minHubResponse) {
            return {
                State: minHubResponse.S,
                Result: minHubResponse.R,
                Progress: minHubResponse.P ? {
                    Id: minHubResponse.P.I,
                    Data: minHubResponse.P.D
                } : null,
                Id: minHubResponse.I,
                IsHubException: minHubResponse.H,
                Error: minHubResponse.E,
                StackTrace: minHubResponse.T,
                ErrorData: minHubResponse.D
            };
        }
    };

    hubProxy.fn.init.prototype = hubProxy.fn;

    // hubConnection
    function hubConnection(url, options) {
        /// <summary>Creates a new hub connection.</summary>
        /// <param name="url" type="String">[Optional] The hub route url, defaults to "/signalr".</param>
        /// <param name="options" type="Object">[Optional] Settings to use when creating the hubConnection.</param>
        var settings = {
            qs: null,
            logging: false,
            useDefaultPath: true
        };

        $.extend(settings, options);

        if (!url || settings.useDefaultPath) {
            url = (url || "") + "/signalr";
        }
        return new hubConnection.fn.init(url, settings);
    }

    hubConnection.fn = hubConnection.prototype = $.connection();

    hubConnection.fn.init = function (url, options) {
        var settings = {
            qs: null,
            logging: false,
            useDefaultPath: true
        },
            connection = this;

        $.extend(settings, options);

        // Call the base constructor
        $.signalR.fn.init.call(connection, url, settings.qs, settings.logging);

        // Object to store hub proxies for this connection
        connection.proxies = {};

        connection._.invocationCallbackId = 0;
        connection._.invocationCallbacks = {};

        // Wire up the received handler
        connection.received(function (minData) {
            var data, proxy, dataCallbackId, callback, hubName, eventName;
            if (!minData) {
                return;
            }

            // We have to handle progress updates first in order to ensure old clients that receive
            // progress updates enter the return value branch and then no-op when they can't find
            // the callback in the map (because the minData.I value will not be a valid callback ID)
            // Process progress notification
            if (typeof (minData.P) !== "undefined") {
                dataCallbackId = minData.P.I.toString();
                callback = connection._.invocationCallbacks[dataCallbackId];
                if (callback) {
                    callback.method.call(callback.scope, minData);
                }
            } else if (typeof (minData.I) !== "undefined") {
                // We received the return value from a server method invocation, look up callback by id and call it
                dataCallbackId = minData.I.toString();
                callback = connection._.invocationCallbacks[dataCallbackId];
                if (callback) {
                    // Delete the callback from the proxy
                    connection._.invocationCallbacks[dataCallbackId] = null;
                    delete connection._.invocationCallbacks[dataCallbackId];

                    // Invoke the callback
                    callback.method.call(callback.scope, minData);
                }
            } else {
                data = this._maximizeClientHubInvocation(minData);

                // We received a client invocation request, i.e. broadcast from server hub
                connection.log("Triggering client hub event '" + data.Method + "' on hub '" + data.Hub + "'.");

                // Normalize the names to lowercase
                hubName = data.Hub.toLowerCase();
                eventName = data.Method.toLowerCase();

                // Trigger the local invocation event
                proxy = this.proxies[hubName];

                // Update the hub state
                $.extend(proxy.state, data.State);
                $(proxy).triggerHandler(makeEventName(eventName), [data.Args]);
            }
        });

        connection.error(function (errData, origData) {
            var callbackId, callback;

            if (!origData) {
                // No original data passed so this is not a send error
                return;
            }

            callbackId = origData.I;
            callback = connection._.invocationCallbacks[callbackId];

            // Verify that there is a callback bound (could have been cleared)
            if (callback) {
                // Delete the callback
                connection._.invocationCallbacks[callbackId] = null;
                delete connection._.invocationCallbacks[callbackId];

                // Invoke the callback with an error to reject the promise
                callback.method.call(callback.scope, { E: errData });
            }
        });

        connection.reconnecting(function () {
            if (connection.transport && connection.transport.name === "webSockets") {
                clearInvocationCallbacks(connection, "Connection started reconnecting before invocation result was received.");
            }
        });

        connection.disconnected(function () {
            clearInvocationCallbacks(connection, "Connection was disconnected before invocation result was received.");
        });
    };

    hubConnection.fn._maximizeClientHubInvocation = function (minClientHubInvocation) {
        return {
            Hub: minClientHubInvocation.H,
            Method: minClientHubInvocation.M,
            Args: minClientHubInvocation.A,
            State: minClientHubInvocation.S
        };
    };

    hubConnection.fn._registerSubscribedHubs = function () {
        /// <summary>
        ///     Sets the starting event to loop through the known hubs and register any new hubs
        ///     that have been added to the proxy.
        /// </summary>
        var connection = this;

        if (!connection._subscribedToHubs) {
            connection._subscribedToHubs = true;
            connection.starting(function () {
                // Set the connection's data object with all the hub proxies with active subscriptions.
                // These proxies will receive notifications from the server.
                var subscribedHubs = [];

                $.each(connection.proxies, function (key) {
                    if (this.hasSubscriptions()) {
                        subscribedHubs.push({ name: key });
                        connection.log("Client subscribed to hub '" + key + "'.");
                    }
                });

                if (subscribedHubs.length === 0) {
                    connection.log("No hubs have been subscribed to.  The client will not receive data from hubs.  To fix, declare at least one client side function prior to connection start for each hub you wish to subscribe to.");
                }

                connection.data = connection.json.stringify(subscribedHubs);
            });
        }
    };

    hubConnection.fn.createHubProxy = function (hubName) {
        /// <summary>
        ///     Creates a new proxy object for the given hub connection that can be used to invoke
        ///     methods on server hubs and handle client method invocation requests from the server.
        /// </summary>
        /// <param name="hubName" type="String">
        ///     The name of the hub on the server to create the proxy for.
        /// </param>

        // Normalize the name to lowercase
        hubName = hubName.toLowerCase();

        var proxy = this.proxies[hubName];
        if (!proxy) {
            proxy = hubProxy(this, hubName);
            this.proxies[hubName] = proxy;
        }

        this._registerSubscribedHubs();

        return proxy;
    };

    hubConnection.fn.init.prototype = hubConnection.fn;

    $.hubConnection = hubConnection;

}(window.jQuery, window));
/* jquery.signalR.version.js */
// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.


/*global window:false */
/// <reference path="jquery.signalR.core.js" />
(function ($, undefined) {
    // This will be modified by the build script
    $.signalR.version = "2.4.1";
}(window.jQuery));

// Unobtrusive Ajax support library for jQuery
// Copyright (c) .NET Foundation. All rights reserved.
// Licensed under the Apache License, Version 2.0. See License.txt in the project root for license information.
// @version v3.2.6
// 
// Microsoft grants you the right to use these script files for the sole
// purpose of either: (i) interacting through your browser with the Microsoft
// website or online service, subject to the applicable licensing or use
// terms; or (ii) using the files as included with a Microsoft product subject
// to that product's license terms. Microsoft reserves all other rights to the
// files not expressly granted by Microsoft, whether by implication, estoppel
// or otherwise. Insofar as a script file is dual licensed under GPL,
// Microsoft neither took the code under GPL nor distributes it thereunder but
// under the terms set out in this paragraph. All notices and licenses
// below are for informational purposes only.

/*jslint white: true, browser: true, onevar: true, undef: true, nomen: true, eqeqeq: true, plusplus: true, bitwise: true, regexp: true, newcap: true, immed: true, strict: false */
/*global window: false, jQuery: false */

(function ($) {
	var data_click = "unobtrusiveAjaxClick",
		data_target = "unobtrusiveAjaxClickTarget",
		data_validation = "unobtrusiveValidation";

	function getFunction(code, argNames) {
		var fn = window, parts = (code || "").split(".");
		while (fn && parts.length) {
			fn = fn[parts.shift()];
		}
		if (typeof (fn) === "function") {
			return fn;
		}
		argNames.push(code);
		return Function.constructor.apply(null, argNames);
	}

	function isMethodProxySafe(method) {
		return method === "GET" || method === "POST";
	}

	function asyncOnBeforeSend(xhr, method) {
		if (!isMethodProxySafe(method)) {
			xhr.setRequestHeader("X-HTTP-Method-Override", method);
		}
	}

	function asyncOnSuccess(element, data, contentType) {
		var mode;

		if (contentType.indexOf("application/x-javascript") !== -1) {  // jQuery already executes JavaScript for us
			return;
		}

		mode = (element.getAttribute("data-ajax-mode") || "").toUpperCase();
		$(element.getAttribute("data-ajax-update")).each(function (i, update) {
			var top;

			switch (mode) {
				case "BEFORE":
					$(update).prepend(data);
					break;
				case "AFTER":
					$(update).append(data);
					break;
				case "REPLACE-WITH":
					$(update).replaceWith(data);
					break;
				default:
					$(update).html(data);
					break;
			}
		});
	}

	function asyncRequest(element, options) {
		var confirm, loading, method, duration;

		confirm = element.getAttribute("data-ajax-confirm");
		if (confirm && !window.confirm(confirm)) {
			return;
		}

		loading = $(element.getAttribute("data-ajax-loading"));
		duration = parseInt(element.getAttribute("data-ajax-loading-duration"), 10) || 0;

		$.extend(options, {
			type: element.getAttribute("data-ajax-method") || undefined,
			url: element.getAttribute("data-ajax-url") || undefined,
			cache: (element.getAttribute("data-ajax-cache") || "").toLowerCase() === "true",
			beforeSend: function (xhr) {
				var result;
				asyncOnBeforeSend(xhr, method);
				result = getFunction(element.getAttribute("data-ajax-begin"), ["xhr"]).apply(element, arguments);
				if (result !== false) {
					loading.show(duration);
				}
				return result;
			},
			complete: function () {
				loading.hide(duration);
				getFunction(element.getAttribute("data-ajax-complete"), ["xhr", "status"]).apply(element, arguments);
			},
			success: function (data, status, xhr) {
				asyncOnSuccess(element, data, xhr.getResponseHeader("Content-Type") || "text/html");
				getFunction(element.getAttribute("data-ajax-success"), ["data", "status", "xhr"]).apply(element, arguments);
			},
			error: function () {
				getFunction(element.getAttribute("data-ajax-failure"), ["xhr", "status", "error"]).apply(element, arguments);
			}
		});

		options.data.push({ name: "X-Requested-With", value: "XMLHttpRequest" });

		method = options.type.toUpperCase();
		if (!isMethodProxySafe(method)) {
			options.type = "POST";
			options.data.push({ name: "X-HTTP-Method-Override", value: method });
		}

		// change here:
		// Check for a Form POST with enctype=multipart/form-data
		// add the input file that were not previously included in the serializeArray()
		// set processData and contentType to false
		var $element = $(element);
		if ($element.is("form") && $element.attr("enctype") == "multipart/form-data") {
			var formdata = new FormData();
			$.each(options.data, function (i, v) {
				formdata.append(v.name, v.value);
			});
			$("input[type=file]", $element).each(function () {
				var file = this;
				$.each(file.files, function (n, v) {
					formdata.append(file.name, v);
				});
			});
			$.extend(options, {
				processData: false,
				contentType: false,
				data: formdata
			});
		}
		// end change

		$.ajax(options);
	}

	function validate(form) {
		var validationInfo = $(form).data(data_validation);
		return !validationInfo || !validationInfo.validate || validationInfo.validate();
	}

	$(document).on("click", "a[data-ajax=true]", function (evt) {
		evt.preventDefault();
		asyncRequest(this, {
			url: this.href,
			type: "GET",
			data: []
		});
	});

	$(document).on("click", "form[data-ajax=true] input[type=image]", function (evt) {
		var name = evt.target.name,
			target = $(evt.target),
			form = $(target.parents("form")[0]),
			offset = target.offset();

		form.data(data_click, [
			{ name: name + ".x", value: Math.round(evt.pageX - offset.left) },
			{ name: name + ".y", value: Math.round(evt.pageY - offset.top) }
		]);

		setTimeout(function () {
			form.removeData(data_click);
		}, 0);
	});

	$(document).on("click", "form[data-ajax=true] :submit", function (evt) {
		var name = evt.currentTarget.name,
			target = $(evt.target),
			form = $(target.parents("form")[0]);

		form.data(data_click, name ? [{ name: name, value: evt.currentTarget.value }] : []);
		form.data(data_target, target);

		setTimeout(function () {
			form.removeData(data_click);
			form.removeData(data_target);
		}, 0);
	});

	$(document).on("submit", "form[data-ajax=true]", function (evt) {
		var clickInfo = $(this).data(data_click) || [],
			clickTarget = $(this).data(data_target),
			isCancel = clickTarget && (clickTarget.hasClass("cancel") || clickTarget.attr('formnovalidate') !== undefined);
		evt.preventDefault();
		if (!isCancel && !validate(this)) {
			return;
		}
		asyncRequest(this, {
			url: this.action,
			type: this.method || "GET",
			data: clickInfo.concat($(this).serializeArray())
		});
	});
}(jQuery));

//! moment.js

; (function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
		typeof define === 'function' && define.amd ? define(factory) :
			global.moment = factory()
}(this, (function () {
	'use strict';

	var hookCallback;

	function hooks() {
		return hookCallback.apply(null, arguments);
	}

	// This is done to register the method called with moment()
	// without creating circular dependencies.
	function setHookCallback(callback) {
		hookCallback = callback;
	}

	function isArray(input) {
		return input instanceof Array || Object.prototype.toString.call(input) === '[object Array]';
	}

	function isObject(input) {
		// IE8 will treat undefined and null as object if it wasn't for
		// input != null
		return input != null && Object.prototype.toString.call(input) === '[object Object]';
	}

	function isObjectEmpty(obj) {
		if (Object.getOwnPropertyNames) {
			return (Object.getOwnPropertyNames(obj).length === 0);
		} else {
			var k;
			for (k in obj) {
				if (obj.hasOwnProperty(k)) {
					return false;
				}
			}
			return true;
		}
	}

	function isUndefined(input) {
		return input === void 0;
	}

	function isNumber(input) {
		return typeof input === 'number' || Object.prototype.toString.call(input) === '[object Number]';
	}

	function isDate(input) {
		return input instanceof Date || Object.prototype.toString.call(input) === '[object Date]';
	}

	function map(arr, fn) {
		var res = [], i;
		for (i = 0; i < arr.length; ++i) {
			res.push(fn(arr[i], i));
		}
		return res;
	}

	function hasOwnProp(a, b) {
		return Object.prototype.hasOwnProperty.call(a, b);
	}

	function extend(a, b) {
		for (var i in b) {
			if (hasOwnProp(b, i)) {
				a[i] = b[i];
			}
		}

		if (hasOwnProp(b, 'toString')) {
			a.toString = b.toString;
		}

		if (hasOwnProp(b, 'valueOf')) {
			a.valueOf = b.valueOf;
		}

		return a;
	}

	function createUTC(input, format, locale, strict) {
		return createLocalOrUTC(input, format, locale, strict, true).utc();
	}

	function defaultParsingFlags() {
		// We need to deep clone this object.
		return {
			empty: false,
			unusedTokens: [],
			unusedInput: [],
			overflow: -2,
			charsLeftOver: 0,
			nullInput: false,
			invalidMonth: null,
			invalidFormat: false,
			userInvalidated: false,
			iso: false,
			parsedDateParts: [],
			meridiem: null,
			rfc2822: false,
			weekdayMismatch: false
		};
	}

	function getParsingFlags(m) {
		if (m._pf == null) {
			m._pf = defaultParsingFlags();
		}
		return m._pf;
	}

	var some;
	if (Array.prototype.some) {
		some = Array.prototype.some;
	} else {
		some = function (fun) {
			var t = Object(this);
			var len = t.length >>> 0;

			for (var i = 0; i < len; i++) {
				if (i in t && fun.call(this, t[i], i, t)) {
					return true;
				}
			}

			return false;
		};
	}

	function isValid(m) {
		if (m._isValid == null) {
			var flags = getParsingFlags(m);
			var parsedParts = some.call(flags.parsedDateParts, function (i) {
				return i != null;
			});
			var isNowValid = !isNaN(m._d.getTime()) &&
				flags.overflow < 0 &&
				!flags.empty &&
				!flags.invalidMonth &&
				!flags.invalidWeekday &&
				!flags.weekdayMismatch &&
				!flags.nullInput &&
				!flags.invalidFormat &&
				!flags.userInvalidated &&
				(!flags.meridiem || (flags.meridiem && parsedParts));

			if (m._strict) {
				isNowValid = isNowValid &&
					flags.charsLeftOver === 0 &&
					flags.unusedTokens.length === 0 &&
					flags.bigHour === undefined;
			}

			if (Object.isFrozen == null || !Object.isFrozen(m)) {
				m._isValid = isNowValid;
			}
			else {
				return isNowValid;
			}
		}
		return m._isValid;
	}

	function createInvalid(flags) {
		var m = createUTC(NaN);
		if (flags != null) {
			extend(getParsingFlags(m), flags);
		}
		else {
			getParsingFlags(m).userInvalidated = true;
		}

		return m;
	}

	// Plugins that add properties should also add the key here (null value),
	// so we can properly clone ourselves.
	var momentProperties = hooks.momentProperties = [];

	function copyConfig(to, from) {
		var i, prop, val;

		if (!isUndefined(from._isAMomentObject)) {
			to._isAMomentObject = from._isAMomentObject;
		}
		if (!isUndefined(from._i)) {
			to._i = from._i;
		}
		if (!isUndefined(from._f)) {
			to._f = from._f;
		}
		if (!isUndefined(from._l)) {
			to._l = from._l;
		}
		if (!isUndefined(from._strict)) {
			to._strict = from._strict;
		}
		if (!isUndefined(from._tzm)) {
			to._tzm = from._tzm;
		}
		if (!isUndefined(from._isUTC)) {
			to._isUTC = from._isUTC;
		}
		if (!isUndefined(from._offset)) {
			to._offset = from._offset;
		}
		if (!isUndefined(from._pf)) {
			to._pf = getParsingFlags(from);
		}
		if (!isUndefined(from._locale)) {
			to._locale = from._locale;
		}

		if (momentProperties.length > 0) {
			for (i = 0; i < momentProperties.length; i++) {
				prop = momentProperties[i];
				val = from[prop];
				if (!isUndefined(val)) {
					to[prop] = val;
				}
			}
		}

		return to;
	}

	var updateInProgress = false;

	// Moment prototype object
	function Moment(config) {
		copyConfig(this, config);
		this._d = new Date(config._d != null ? config._d.getTime() : NaN);
		if (!this.isValid()) {
			this._d = new Date(NaN);
		}
		// Prevent infinite loop in case updateOffset creates new moment
		// objects.
		if (updateInProgress === false) {
			updateInProgress = true;
			hooks.updateOffset(this);
			updateInProgress = false;
		}
	}

	function isMoment(obj) {
		return obj instanceof Moment || (obj != null && obj._isAMomentObject != null);
	}

	function absFloor(number) {
		if (number < 0) {
			// -0 -> 0
			return Math.ceil(number) || 0;
		} else {
			return Math.floor(number);
		}
	}

	function toInt(argumentForCoercion) {
		var coercedNumber = +argumentForCoercion,
			value = 0;

		if (coercedNumber !== 0 && isFinite(coercedNumber)) {
			value = absFloor(coercedNumber);
		}

		return value;
	}

	// compare two arrays, return the number of differences
	function compareArrays(array1, array2, dontConvert) {
		var len = Math.min(array1.length, array2.length),
			lengthDiff = Math.abs(array1.length - array2.length),
			diffs = 0,
			i;
		for (i = 0; i < len; i++) {
			if ((dontConvert && array1[i] !== array2[i]) ||
				(!dontConvert && toInt(array1[i]) !== toInt(array2[i]))) {
				diffs++;
			}
		}
		return diffs + lengthDiff;
	}

	function warn(msg) {
		if (hooks.suppressDeprecationWarnings === false &&
			(typeof console !== 'undefined') && console.warn) {
			console.warn('Deprecation warning: ' + msg);
		}
	}

	function deprecate(msg, fn) {
		var firstTime = true;

		return extend(function () {
			if (hooks.deprecationHandler != null) {
				hooks.deprecationHandler(null, msg);
			}
			if (firstTime) {
				var args = [];
				var arg;
				for (var i = 0; i < arguments.length; i++) {
					arg = '';
					if (typeof arguments[i] === 'object') {
						arg += '\n[' + i + '] ';
						for (var key in arguments[0]) {
							arg += key + ': ' + arguments[0][key] + ', ';
						}
						arg = arg.slice(0, -2); // Remove trailing comma and space
					} else {
						arg = arguments[i];
					}
					args.push(arg);
				}
				warn(msg + '\nArguments: ' + Array.prototype.slice.call(args).join('') + '\n' + (new Error()).stack);
				firstTime = false;
			}
			return fn.apply(this, arguments);
		}, fn);
	}

	var deprecations = {};

	function deprecateSimple(name, msg) {
		if (hooks.deprecationHandler != null) {
			hooks.deprecationHandler(name, msg);
		}
		if (!deprecations[name]) {
			warn(msg);
			deprecations[name] = true;
		}
	}

	hooks.suppressDeprecationWarnings = false;
	hooks.deprecationHandler = null;

	function isFunction(input) {
		return input instanceof Function || Object.prototype.toString.call(input) === '[object Function]';
	}

	function set(config) {
		var prop, i;
		for (i in config) {
			prop = config[i];
			if (isFunction(prop)) {
				this[i] = prop;
			} else {
				this['_' + i] = prop;
			}
		}
		this._config = config;
		// Lenient ordinal parsing accepts just a number in addition to
		// number + (possibly) stuff coming from _dayOfMonthOrdinalParse.
		// TODO: Remove "ordinalParse" fallback in next major release.
		this._dayOfMonthOrdinalParseLenient = new RegExp(
			(this._dayOfMonthOrdinalParse.source || this._ordinalParse.source) +
			'|' + (/\d{1,2}/).source);
	}

	function mergeConfigs(parentConfig, childConfig) {
		var res = extend({}, parentConfig), prop;
		for (prop in childConfig) {
			if (hasOwnProp(childConfig, prop)) {
				if (isObject(parentConfig[prop]) && isObject(childConfig[prop])) {
					res[prop] = {};
					extend(res[prop], parentConfig[prop]);
					extend(res[prop], childConfig[prop]);
				} else if (childConfig[prop] != null) {
					res[prop] = childConfig[prop];
				} else {
					delete res[prop];
				}
			}
		}
		for (prop in parentConfig) {
			if (hasOwnProp(parentConfig, prop) &&
				!hasOwnProp(childConfig, prop) &&
				isObject(parentConfig[prop])) {
				// make sure changes to properties don't modify parent config
				res[prop] = extend({}, res[prop]);
			}
		}
		return res;
	}

	function Locale(config) {
		if (config != null) {
			this.set(config);
		}
	}

	var keys;

	if (Object.keys) {
		keys = Object.keys;
	} else {
		keys = function (obj) {
			var i, res = [];
			for (i in obj) {
				if (hasOwnProp(obj, i)) {
					res.push(i);
				}
			}
			return res;
		};
	}

	var defaultCalendar = {
		sameDay: '[Today at] LT',
		nextDay: '[Tomorrow at] LT',
		nextWeek: 'dddd [at] LT',
		lastDay: '[Yesterday at] LT',
		lastWeek: '[Last] dddd [at] LT',
		sameElse: 'L'
	};

	function calendar(key, mom, now) {
		var output = this._calendar[key] || this._calendar['sameElse'];
		return isFunction(output) ? output.call(mom, now) : output;
	}

	var defaultLongDateFormat = {
		LTS: 'h:mm:ss A',
		LT: 'h:mm A',
		L: 'MM/DD/YYYY',
		LL: 'MMMM D, YYYY',
		LLL: 'MMMM D, YYYY h:mm A',
		LLLL: 'dddd, MMMM D, YYYY h:mm A'
	};

	function longDateFormat(key) {
		var format = this._longDateFormat[key],
			formatUpper = this._longDateFormat[key.toUpperCase()];

		if (format || !formatUpper) {
			return format;
		}

		this._longDateFormat[key] = formatUpper.replace(/MMMM|MM|DD|dddd/g, function (val) {
			return val.slice(1);
		});

		return this._longDateFormat[key];
	}

	var defaultInvalidDate = 'Invalid date';

	function invalidDate() {
		return this._invalidDate;
	}

	var defaultOrdinal = '%d';
	var defaultDayOfMonthOrdinalParse = /\d{1,2}/;

	function ordinal(number) {
		return this._ordinal.replace('%d', number);
	}

	var defaultRelativeTime = {
		future: 'in %s',
		past: '%s ago',
		s: 'a few seconds',
		ss: '%d seconds',
		m: 'a minute',
		mm: '%d minutes',
		h: 'an hour',
		hh: '%d hours',
		d: 'a day',
		dd: '%d days',
		M: 'a month',
		MM: '%d months',
		y: 'a year',
		yy: '%d years'
	};

	function relativeTime(number, withoutSuffix, string, isFuture) {
		var output = this._relativeTime[string];
		return (isFunction(output)) ?
			output(number, withoutSuffix, string, isFuture) :
			output.replace(/%d/i, number);
	}

	function pastFuture(diff, output) {
		var format = this._relativeTime[diff > 0 ? 'future' : 'past'];
		return isFunction(format) ? format(output) : format.replace(/%s/i, output);
	}

	var aliases = {};

	function addUnitAlias(unit, shorthand) {
		var lowerCase = unit.toLowerCase();
		aliases[lowerCase] = aliases[lowerCase + 's'] = aliases[shorthand] = unit;
	}

	function normalizeUnits(units) {
		return typeof units === 'string' ? aliases[units] || aliases[units.toLowerCase()] : undefined;
	}

	function normalizeObjectUnits(inputObject) {
		var normalizedInput = {},
			normalizedProp,
			prop;

		for (prop in inputObject) {
			if (hasOwnProp(inputObject, prop)) {
				normalizedProp = normalizeUnits(prop);
				if (normalizedProp) {
					normalizedInput[normalizedProp] = inputObject[prop];
				}
			}
		}

		return normalizedInput;
	}

	var priorities = {};

	function addUnitPriority(unit, priority) {
		priorities[unit] = priority;
	}

	function getPrioritizedUnits(unitsObj) {
		var units = [];
		for (var u in unitsObj) {
			units.push({ unit: u, priority: priorities[u] });
		}
		units.sort(function (a, b) {
			return a.priority - b.priority;
		});
		return units;
	}

	function zeroFill(number, targetLength, forceSign) {
		var absNumber = '' + Math.abs(number),
			zerosToFill = targetLength - absNumber.length,
			sign = number >= 0;
		return (sign ? (forceSign ? '+' : '') : '-') +
			Math.pow(10, Math.max(0, zerosToFill)).toString().substr(1) + absNumber;
	}

	var formattingTokens = /(\[[^\[]*\])|(\\)?([Hh]mm(ss)?|Mo|MM?M?M?|Do|DDDo|DD?D?D?|ddd?d?|do?|w[o|w]?|W[o|W]?|Qo?|YYYYYY|YYYYY|YYYY|YY|gg(ggg?)?|GG(GGG?)?|e|E|a|A|hh?|HH?|kk?|mm?|ss?|S{1,9}|x|X|zz?|ZZ?|.)/g;

	var localFormattingTokens = /(\[[^\[]*\])|(\\)?(LTS|LT|LL?L?L?|l{1,4})/g;

	var formatFunctions = {};

	var formatTokenFunctions = {};

	// token:    'M'
	// padded:   ['MM', 2]
	// ordinal:  'Mo'
	// callback: function () { this.month() + 1 }
	function addFormatToken(token, padded, ordinal, callback) {
		var func = callback;
		if (typeof callback === 'string') {
			func = function () {
				return this[callback]();
			};
		}
		if (token) {
			formatTokenFunctions[token] = func;
		}
		if (padded) {
			formatTokenFunctions[padded[0]] = function () {
				return zeroFill(func.apply(this, arguments), padded[1], padded[2]);
			};
		}
		if (ordinal) {
			formatTokenFunctions[ordinal] = function () {
				return this.localeData().ordinal(func.apply(this, arguments), token);
			};
		}
	}

	function removeFormattingTokens(input) {
		if (input.match(/\[[\s\S]/)) {
			return input.replace(/^\[|\]$/g, '');
		}
		return input.replace(/\\/g, '');
	}

	function makeFormatFunction(format) {
		var array = format.match(formattingTokens), i, length;

		for (i = 0, length = array.length; i < length; i++) {
			if (formatTokenFunctions[array[i]]) {
				array[i] = formatTokenFunctions[array[i]];
			} else {
				array[i] = removeFormattingTokens(array[i]);
			}
		}

		return function (mom) {
			var output = '', i;
			for (i = 0; i < length; i++) {
				output += isFunction(array[i]) ? array[i].call(mom, format) : array[i];
			}
			return output;
		};
	}

	// format date using native date object
	function formatMoment(m, format) {
		if (!m.isValid()) {
			return m.localeData().invalidDate();
		}

		format = expandFormat(format, m.localeData());
		formatFunctions[format] = formatFunctions[format] || makeFormatFunction(format);

		return formatFunctions[format](m);
	}

	function expandFormat(format, locale) {
		var i = 5;

		function replaceLongDateFormatTokens(input) {
			return locale.longDateFormat(input) || input;
		}

		localFormattingTokens.lastIndex = 0;
		while (i >= 0 && localFormattingTokens.test(format)) {
			format = format.replace(localFormattingTokens, replaceLongDateFormatTokens);
			localFormattingTokens.lastIndex = 0;
			i -= 1;
		}

		return format;
	}

	var match1 = /\d/;            //       0 - 9
	var match2 = /\d\d/;          //      00 - 99
	var match3 = /\d{3}/;         //     000 - 999
	var match4 = /\d{4}/;         //    0000 - 9999
	var match6 = /[+-]?\d{6}/;    // -999999 - 999999
	var match1to2 = /\d\d?/;         //       0 - 99
	var match3to4 = /\d\d\d\d?/;     //     999 - 9999
	var match5to6 = /\d\d\d\d\d\d?/; //   99999 - 999999
	var match1to3 = /\d{1,3}/;       //       0 - 999
	var match1to4 = /\d{1,4}/;       //       0 - 9999
	var match1to6 = /[+-]?\d{1,6}/;  // -999999 - 999999

	var matchUnsigned = /\d+/;           //       0 - inf
	var matchSigned = /[+-]?\d+/;      //    -inf - inf

	var matchOffset = /Z|[+-]\d\d:?\d\d/gi; // +00:00 -00:00 +0000 -0000 or Z
	var matchShortOffset = /Z|[+-]\d\d(?::?\d\d)?/gi; // +00 -00 +00:00 -00:00 +0000 -0000 or Z

	var matchTimestamp = /[+-]?\d+(\.\d{1,3})?/; // 123456789 123456789.123

	// any word (or two) characters or numbers including two/three word month in arabic.
	// includes scottish gaelic two word and hyphenated months
	var matchWord = /[0-9]{0,256}['a-z\u00A0-\u05FF\u0700-\uD7FF\uF900-\uFDCF\uFDF0-\uFF07\uFF10-\uFFEF]{1,256}|[\u0600-\u06FF\/]{1,256}(\s*?[\u0600-\u06FF]{1,256}){1,2}/i;

	var regexes = {};

	function addRegexToken(token, regex, strictRegex) {
		regexes[token] = isFunction(regex) ? regex : function (isStrict, localeData) {
			return (isStrict && strictRegex) ? strictRegex : regex;
		};
	}

	function getParseRegexForToken(token, config) {
		if (!hasOwnProp(regexes, token)) {
			return new RegExp(unescapeFormat(token));
		}

		return regexes[token](config._strict, config._locale);
	}

	// Code from http://stackoverflow.com/questions/3561493/is-there-a-regexp-escape-function-in-javascript
	function unescapeFormat(s) {
		return regexEscape(s.replace('\\', '').replace(/\\(\[)|\\(\])|\[([^\]\[]*)\]|\\(.)/g, function (matched, p1, p2, p3, p4) {
			return p1 || p2 || p3 || p4;
		}));
	}

	function regexEscape(s) {
		return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
	}

	var tokens = {};

	function addParseToken(token, callback) {
		var i, func = callback;
		if (typeof token === 'string') {
			token = [token];
		}
		if (isNumber(callback)) {
			func = function (input, array) {
				array[callback] = toInt(input);
			};
		}
		for (i = 0; i < token.length; i++) {
			tokens[token[i]] = func;
		}
	}

	function addWeekParseToken(token, callback) {
		addParseToken(token, function (input, array, config, token) {
			config._w = config._w || {};
			callback(input, config._w, config, token);
		});
	}

	function addTimeToArrayFromToken(token, input, config) {
		if (input != null && hasOwnProp(tokens, token)) {
			tokens[token](input, config._a, config, token);
		}
	}

	var YEAR = 0;
	var MONTH = 1;
	var DATE = 2;
	var HOUR = 3;
	var MINUTE = 4;
	var SECOND = 5;
	var MILLISECOND = 6;
	var WEEK = 7;
	var WEEKDAY = 8;

	// FORMATTING

	addFormatToken('Y', 0, 0, function () {
		var y = this.year();
		return y <= 9999 ? '' + y : '+' + y;
	});

	addFormatToken(0, ['YY', 2], 0, function () {
		return this.year() % 100;
	});

	addFormatToken(0, ['YYYY', 4], 0, 'year');
	addFormatToken(0, ['YYYYY', 5], 0, 'year');
	addFormatToken(0, ['YYYYYY', 6, true], 0, 'year');

	// ALIASES

	addUnitAlias('year', 'y');

	// PRIORITIES

	addUnitPriority('year', 1);

	// PARSING

	addRegexToken('Y', matchSigned);
	addRegexToken('YY', match1to2, match2);
	addRegexToken('YYYY', match1to4, match4);
	addRegexToken('YYYYY', match1to6, match6);
	addRegexToken('YYYYYY', match1to6, match6);

	addParseToken(['YYYYY', 'YYYYYY'], YEAR);
	addParseToken('YYYY', function (input, array) {
		array[YEAR] = input.length === 2 ? hooks.parseTwoDigitYear(input) : toInt(input);
	});
	addParseToken('YY', function (input, array) {
		array[YEAR] = hooks.parseTwoDigitYear(input);
	});
	addParseToken('Y', function (input, array) {
		array[YEAR] = parseInt(input, 10);
	});

	// HELPERS

	function daysInYear(year) {
		return isLeapYear(year) ? 366 : 365;
	}

	function isLeapYear(year) {
		return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
	}

	// HOOKS

	hooks.parseTwoDigitYear = function (input) {
		return toInt(input) + (toInt(input) > 68 ? 1900 : 2000);
	};

	// MOMENTS

	var getSetYear = makeGetSet('FullYear', true);

	function getIsLeapYear() {
		return isLeapYear(this.year());
	}

	function makeGetSet(unit, keepTime) {
		return function (value) {
			if (value != null) {
				set$1(this, unit, value);
				hooks.updateOffset(this, keepTime);
				return this;
			} else {
				return get(this, unit);
			}
		};
	}

	function get(mom, unit) {
		return mom.isValid() ?
			mom._d['get' + (mom._isUTC ? 'UTC' : '') + unit]() : NaN;
	}

	function set$1(mom, unit, value) {
		if (mom.isValid() && !isNaN(value)) {
			if (unit === 'FullYear' && isLeapYear(mom.year()) && mom.month() === 1 && mom.date() === 29) {
				mom._d['set' + (mom._isUTC ? 'UTC' : '') + unit](value, mom.month(), daysInMonth(value, mom.month()));
			}
			else {
				mom._d['set' + (mom._isUTC ? 'UTC' : '') + unit](value);
			}
		}
	}

	// MOMENTS

	function stringGet(units) {
		units = normalizeUnits(units);
		if (isFunction(this[units])) {
			return this[units]();
		}
		return this;
	}


	function stringSet(units, value) {
		if (typeof units === 'object') {
			units = normalizeObjectUnits(units);
			var prioritized = getPrioritizedUnits(units);
			for (var i = 0; i < prioritized.length; i++) {
				this[prioritized[i].unit](units[prioritized[i].unit]);
			}
		} else {
			units = normalizeUnits(units);
			if (isFunction(this[units])) {
				return this[units](value);
			}
		}
		return this;
	}

	function mod(n, x) {
		return ((n % x) + x) % x;
	}

	var indexOf;

	if (Array.prototype.indexOf) {
		indexOf = Array.prototype.indexOf;
	} else {
		indexOf = function (o) {
			// I know
			var i;
			for (i = 0; i < this.length; ++i) {
				if (this[i] === o) {
					return i;
				}
			}
			return -1;
		};
	}

	function daysInMonth(year, month) {
		if (isNaN(year) || isNaN(month)) {
			return NaN;
		}
		var modMonth = mod(month, 12);
		year += (month - modMonth) / 12;
		return modMonth === 1 ? (isLeapYear(year) ? 29 : 28) : (31 - modMonth % 7 % 2);
	}

	// FORMATTING

	addFormatToken('M', ['MM', 2], 'Mo', function () {
		return this.month() + 1;
	});

	addFormatToken('MMM', 0, 0, function (format) {
		return this.localeData().monthsShort(this, format);
	});

	addFormatToken('MMMM', 0, 0, function (format) {
		return this.localeData().months(this, format);
	});

	// ALIASES

	addUnitAlias('month', 'M');

	// PRIORITY

	addUnitPriority('month', 8);

	// PARSING

	addRegexToken('M', match1to2);
	addRegexToken('MM', match1to2, match2);
	addRegexToken('MMM', function (isStrict, locale) {
		return locale.monthsShortRegex(isStrict);
	});
	addRegexToken('MMMM', function (isStrict, locale) {
		return locale.monthsRegex(isStrict);
	});

	addParseToken(['M', 'MM'], function (input, array) {
		array[MONTH] = toInt(input) - 1;
	});

	addParseToken(['MMM', 'MMMM'], function (input, array, config, token) {
		var month = config._locale.monthsParse(input, token, config._strict);
		// if we didn't find a month name, mark the date as invalid.
		if (month != null) {
			array[MONTH] = month;
		} else {
			getParsingFlags(config).invalidMonth = input;
		}
	});

	// LOCALES

	var MONTHS_IN_FORMAT = /D[oD]?(\[[^\[\]]*\]|\s)+MMMM?/;
	var defaultLocaleMonths = 'January_February_March_April_May_June_July_August_September_October_November_December'.split('_');
	function localeMonths(m, format) {
		if (!m) {
			return isArray(this._months) ? this._months :
				this._months['standalone'];
		}
		return isArray(this._months) ? this._months[m.month()] :
			this._months[(this._months.isFormat || MONTHS_IN_FORMAT).test(format) ? 'format' : 'standalone'][m.month()];
	}

	var defaultLocaleMonthsShort = 'Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec'.split('_');
	function localeMonthsShort(m, format) {
		if (!m) {
			return isArray(this._monthsShort) ? this._monthsShort :
				this._monthsShort['standalone'];
		}
		return isArray(this._monthsShort) ? this._monthsShort[m.month()] :
			this._monthsShort[MONTHS_IN_FORMAT.test(format) ? 'format' : 'standalone'][m.month()];
	}

	function handleStrictParse(monthName, format, strict) {
		var i, ii, mom, llc = monthName.toLocaleLowerCase();
		if (!this._monthsParse) {
			// this is not used
			this._monthsParse = [];
			this._longMonthsParse = [];
			this._shortMonthsParse = [];
			for (i = 0; i < 12; ++i) {
				mom = createUTC([2000, i]);
				this._shortMonthsParse[i] = this.monthsShort(mom, '').toLocaleLowerCase();
				this._longMonthsParse[i] = this.months(mom, '').toLocaleLowerCase();
			}
		}

		if (strict) {
			if (format === 'MMM') {
				ii = indexOf.call(this._shortMonthsParse, llc);
				return ii !== -1 ? ii : null;
			} else {
				ii = indexOf.call(this._longMonthsParse, llc);
				return ii !== -1 ? ii : null;
			}
		} else {
			if (format === 'MMM') {
				ii = indexOf.call(this._shortMonthsParse, llc);
				if (ii !== -1) {
					return ii;
				}
				ii = indexOf.call(this._longMonthsParse, llc);
				return ii !== -1 ? ii : null;
			} else {
				ii = indexOf.call(this._longMonthsParse, llc);
				if (ii !== -1) {
					return ii;
				}
				ii = indexOf.call(this._shortMonthsParse, llc);
				return ii !== -1 ? ii : null;
			}
		}
	}

	function localeMonthsParse(monthName, format, strict) {
		var i, mom, regex;

		if (this._monthsParseExact) {
			return handleStrictParse.call(this, monthName, format, strict);
		}

		if (!this._monthsParse) {
			this._monthsParse = [];
			this._longMonthsParse = [];
			this._shortMonthsParse = [];
		}

		// TODO: add sorting
		// Sorting makes sure if one month (or abbr) is a prefix of another
		// see sorting in computeMonthsParse
		for (i = 0; i < 12; i++) {
			// make the regex if we don't have it already
			mom = createUTC([2000, i]);
			if (strict && !this._longMonthsParse[i]) {
				this._longMonthsParse[i] = new RegExp('^' + this.months(mom, '').replace('.', '') + '$', 'i');
				this._shortMonthsParse[i] = new RegExp('^' + this.monthsShort(mom, '').replace('.', '') + '$', 'i');
			}
			if (!strict && !this._monthsParse[i]) {
				regex = '^' + this.months(mom, '') + '|^' + this.monthsShort(mom, '');
				this._monthsParse[i] = new RegExp(regex.replace('.', ''), 'i');
			}
			// test the regex
			if (strict && format === 'MMMM' && this._longMonthsParse[i].test(monthName)) {
				return i;
			} else if (strict && format === 'MMM' && this._shortMonthsParse[i].test(monthName)) {
				return i;
			} else if (!strict && this._monthsParse[i].test(monthName)) {
				return i;
			}
		}
	}

	// MOMENTS

	function setMonth(mom, value) {
		var dayOfMonth;

		if (!mom.isValid()) {
			// No op
			return mom;
		}

		if (typeof value === 'string') {
			if (/^\d+$/.test(value)) {
				value = toInt(value);
			} else {
				value = mom.localeData().monthsParse(value);
				// TODO: Another silent failure?
				if (!isNumber(value)) {
					return mom;
				}
			}
		}

		dayOfMonth = Math.min(mom.date(), daysInMonth(mom.year(), value));
		mom._d['set' + (mom._isUTC ? 'UTC' : '') + 'Month'](value, dayOfMonth);
		return mom;
	}

	function getSetMonth(value) {
		if (value != null) {
			setMonth(this, value);
			hooks.updateOffset(this, true);
			return this;
		} else {
			return get(this, 'Month');
		}
	}

	function getDaysInMonth() {
		return daysInMonth(this.year(), this.month());
	}

	var defaultMonthsShortRegex = matchWord;
	function monthsShortRegex(isStrict) {
		if (this._monthsParseExact) {
			if (!hasOwnProp(this, '_monthsRegex')) {
				computeMonthsParse.call(this);
			}
			if (isStrict) {
				return this._monthsShortStrictRegex;
			} else {
				return this._monthsShortRegex;
			}
		} else {
			if (!hasOwnProp(this, '_monthsShortRegex')) {
				this._monthsShortRegex = defaultMonthsShortRegex;
			}
			return this._monthsShortStrictRegex && isStrict ?
				this._monthsShortStrictRegex : this._monthsShortRegex;
		}
	}

	var defaultMonthsRegex = matchWord;
	function monthsRegex(isStrict) {
		if (this._monthsParseExact) {
			if (!hasOwnProp(this, '_monthsRegex')) {
				computeMonthsParse.call(this);
			}
			if (isStrict) {
				return this._monthsStrictRegex;
			} else {
				return this._monthsRegex;
			}
		} else {
			if (!hasOwnProp(this, '_monthsRegex')) {
				this._monthsRegex = defaultMonthsRegex;
			}
			return this._monthsStrictRegex && isStrict ?
				this._monthsStrictRegex : this._monthsRegex;
		}
	}

	function computeMonthsParse() {
		function cmpLenRev(a, b) {
			return b.length - a.length;
		}

		var shortPieces = [], longPieces = [], mixedPieces = [],
			i, mom;
		for (i = 0; i < 12; i++) {
			// make the regex if we don't have it already
			mom = createUTC([2000, i]);
			shortPieces.push(this.monthsShort(mom, ''));
			longPieces.push(this.months(mom, ''));
			mixedPieces.push(this.months(mom, ''));
			mixedPieces.push(this.monthsShort(mom, ''));
		}
		// Sorting makes sure if one month (or abbr) is a prefix of another it
		// will match the longer piece.
		shortPieces.sort(cmpLenRev);
		longPieces.sort(cmpLenRev);
		mixedPieces.sort(cmpLenRev);
		for (i = 0; i < 12; i++) {
			shortPieces[i] = regexEscape(shortPieces[i]);
			longPieces[i] = regexEscape(longPieces[i]);
		}
		for (i = 0; i < 24; i++) {
			mixedPieces[i] = regexEscape(mixedPieces[i]);
		}

		this._monthsRegex = new RegExp('^(' + mixedPieces.join('|') + ')', 'i');
		this._monthsShortRegex = this._monthsRegex;
		this._monthsStrictRegex = new RegExp('^(' + longPieces.join('|') + ')', 'i');
		this._monthsShortStrictRegex = new RegExp('^(' + shortPieces.join('|') + ')', 'i');
	}

	function createDate(y, m, d, h, M, s, ms) {
		// can't just apply() to create a date:
		// https://stackoverflow.com/q/181348
		var date;
		// the date constructor remaps years 0-99 to 1900-1999
		if (y < 100 && y >= 0) {
			// preserve leap years using a full 400 year cycle, then reset
			date = new Date(y + 400, m, d, h, M, s, ms);
			if (isFinite(date.getFullYear())) {
				date.setFullYear(y);
			}
		} else {
			date = new Date(y, m, d, h, M, s, ms);
		}

		return date;
	}

	function createUTCDate(y) {
		var date;
		// the Date.UTC function remaps years 0-99 to 1900-1999
		if (y < 100 && y >= 0) {
			var args = Array.prototype.slice.call(arguments);
			// preserve leap years using a full 400 year cycle, then reset
			args[0] = y + 400;
			date = new Date(Date.UTC.apply(null, args));
			if (isFinite(date.getUTCFullYear())) {
				date.setUTCFullYear(y);
			}
		} else {
			date = new Date(Date.UTC.apply(null, arguments));
		}

		return date;
	}

	// start-of-first-week - start-of-year
	function firstWeekOffset(year, dow, doy) {
		var // first-week day -- which january is always in the first week (4 for iso, 1 for other)
			fwd = 7 + dow - doy,
			// first-week day local weekday -- which local weekday is fwd
			fwdlw = (7 + createUTCDate(year, 0, fwd).getUTCDay() - dow) % 7;

		return -fwdlw + fwd - 1;
	}

	// https://en.wikipedia.org/wiki/ISO_week_date#Calculating_a_date_given_the_year.2C_week_number_and_weekday
	function dayOfYearFromWeeks(year, week, weekday, dow, doy) {
		var localWeekday = (7 + weekday - dow) % 7,
			weekOffset = firstWeekOffset(year, dow, doy),
			dayOfYear = 1 + 7 * (week - 1) + localWeekday + weekOffset,
			resYear, resDayOfYear;

		if (dayOfYear <= 0) {
			resYear = year - 1;
			resDayOfYear = daysInYear(resYear) + dayOfYear;
		} else if (dayOfYear > daysInYear(year)) {
			resYear = year + 1;
			resDayOfYear = dayOfYear - daysInYear(year);
		} else {
			resYear = year;
			resDayOfYear = dayOfYear;
		}

		return {
			year: resYear,
			dayOfYear: resDayOfYear
		};
	}

	function weekOfYear(mom, dow, doy) {
		var weekOffset = firstWeekOffset(mom.year(), dow, doy),
			week = Math.floor((mom.dayOfYear() - weekOffset - 1) / 7) + 1,
			resWeek, resYear;

		if (week < 1) {
			resYear = mom.year() - 1;
			resWeek = week + weeksInYear(resYear, dow, doy);
		} else if (week > weeksInYear(mom.year(), dow, doy)) {
			resWeek = week - weeksInYear(mom.year(), dow, doy);
			resYear = mom.year() + 1;
		} else {
			resYear = mom.year();
			resWeek = week;
		}

		return {
			week: resWeek,
			year: resYear
		};
	}

	function weeksInYear(year, dow, doy) {
		var weekOffset = firstWeekOffset(year, dow, doy),
			weekOffsetNext = firstWeekOffset(year + 1, dow, doy);
		return (daysInYear(year) - weekOffset + weekOffsetNext) / 7;
	}

	// FORMATTING

	addFormatToken('w', ['ww', 2], 'wo', 'week');
	addFormatToken('W', ['WW', 2], 'Wo', 'isoWeek');

	// ALIASES

	addUnitAlias('week', 'w');
	addUnitAlias('isoWeek', 'W');

	// PRIORITIES

	addUnitPriority('week', 5);
	addUnitPriority('isoWeek', 5);

	// PARSING

	addRegexToken('w', match1to2);
	addRegexToken('ww', match1to2, match2);
	addRegexToken('W', match1to2);
	addRegexToken('WW', match1to2, match2);

	addWeekParseToken(['w', 'ww', 'W', 'WW'], function (input, week, config, token) {
		week[token.substr(0, 1)] = toInt(input);
	});

	// HELPERS

	// LOCALES

	function localeWeek(mom) {
		return weekOfYear(mom, this._week.dow, this._week.doy).week;
	}

	var defaultLocaleWeek = {
		dow: 0, // Sunday is the first day of the week.
		doy: 6  // The week that contains Jan 6th is the first week of the year.
	};

	function localeFirstDayOfWeek() {
		return this._week.dow;
	}

	function localeFirstDayOfYear() {
		return this._week.doy;
	}

	// MOMENTS

	function getSetWeek(input) {
		var week = this.localeData().week(this);
		return input == null ? week : this.add((input - week) * 7, 'd');
	}

	function getSetISOWeek(input) {
		var week = weekOfYear(this, 1, 4).week;
		return input == null ? week : this.add((input - week) * 7, 'd');
	}

	// FORMATTING

	addFormatToken('d', 0, 'do', 'day');

	addFormatToken('dd', 0, 0, function (format) {
		return this.localeData().weekdaysMin(this, format);
	});

	addFormatToken('ddd', 0, 0, function (format) {
		return this.localeData().weekdaysShort(this, format);
	});

	addFormatToken('dddd', 0, 0, function (format) {
		return this.localeData().weekdays(this, format);
	});

	addFormatToken('e', 0, 0, 'weekday');
	addFormatToken('E', 0, 0, 'isoWeekday');

	// ALIASES

	addUnitAlias('day', 'd');
	addUnitAlias('weekday', 'e');
	addUnitAlias('isoWeekday', 'E');

	// PRIORITY
	addUnitPriority('day', 11);
	addUnitPriority('weekday', 11);
	addUnitPriority('isoWeekday', 11);

	// PARSING

	addRegexToken('d', match1to2);
	addRegexToken('e', match1to2);
	addRegexToken('E', match1to2);
	addRegexToken('dd', function (isStrict, locale) {
		return locale.weekdaysMinRegex(isStrict);
	});
	addRegexToken('ddd', function (isStrict, locale) {
		return locale.weekdaysShortRegex(isStrict);
	});
	addRegexToken('dddd', function (isStrict, locale) {
		return locale.weekdaysRegex(isStrict);
	});

	addWeekParseToken(['dd', 'ddd', 'dddd'], function (input, week, config, token) {
		var weekday = config._locale.weekdaysParse(input, token, config._strict);
		// if we didn't get a weekday name, mark the date as invalid
		if (weekday != null) {
			week.d = weekday;
		} else {
			getParsingFlags(config).invalidWeekday = input;
		}
	});

	addWeekParseToken(['d', 'e', 'E'], function (input, week, config, token) {
		week[token] = toInt(input);
	});

	// HELPERS

	function parseWeekday(input, locale) {
		if (typeof input !== 'string') {
			return input;
		}

		if (!isNaN(input)) {
			return parseInt(input, 10);
		}

		input = locale.weekdaysParse(input);
		if (typeof input === 'number') {
			return input;
		}

		return null;
	}

	function parseIsoWeekday(input, locale) {
		if (typeof input === 'string') {
			return locale.weekdaysParse(input) % 7 || 7;
		}
		return isNaN(input) ? null : input;
	}

	// LOCALES
	function shiftWeekdays(ws, n) {
		return ws.slice(n, 7).concat(ws.slice(0, n));
	}

	var defaultLocaleWeekdays = 'Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday'.split('_');
	function localeWeekdays(m, format) {
		var weekdays = isArray(this._weekdays) ? this._weekdays :
			this._weekdays[(m && m !== true && this._weekdays.isFormat.test(format)) ? 'format' : 'standalone'];
		return (m === true) ? shiftWeekdays(weekdays, this._week.dow)
			: (m) ? weekdays[m.day()] : weekdays;
	}

	var defaultLocaleWeekdaysShort = 'Sun_Mon_Tue_Wed_Thu_Fri_Sat'.split('_');
	function localeWeekdaysShort(m) {
		return (m === true) ? shiftWeekdays(this._weekdaysShort, this._week.dow)
			: (m) ? this._weekdaysShort[m.day()] : this._weekdaysShort;
	}

	var defaultLocaleWeekdaysMin = 'Su_Mo_Tu_We_Th_Fr_Sa'.split('_');
	function localeWeekdaysMin(m) {
		return (m === true) ? shiftWeekdays(this._weekdaysMin, this._week.dow)
			: (m) ? this._weekdaysMin[m.day()] : this._weekdaysMin;
	}

	function handleStrictParse$1(weekdayName, format, strict) {
		var i, ii, mom, llc = weekdayName.toLocaleLowerCase();
		if (!this._weekdaysParse) {
			this._weekdaysParse = [];
			this._shortWeekdaysParse = [];
			this._minWeekdaysParse = [];

			for (i = 0; i < 7; ++i) {
				mom = createUTC([2000, 1]).day(i);
				this._minWeekdaysParse[i] = this.weekdaysMin(mom, '').toLocaleLowerCase();
				this._shortWeekdaysParse[i] = this.weekdaysShort(mom, '').toLocaleLowerCase();
				this._weekdaysParse[i] = this.weekdays(mom, '').toLocaleLowerCase();
			}
		}

		if (strict) {
			if (format === 'dddd') {
				ii = indexOf.call(this._weekdaysParse, llc);
				return ii !== -1 ? ii : null;
			} else if (format === 'ddd') {
				ii = indexOf.call(this._shortWeekdaysParse, llc);
				return ii !== -1 ? ii : null;
			} else {
				ii = indexOf.call(this._minWeekdaysParse, llc);
				return ii !== -1 ? ii : null;
			}
		} else {
			if (format === 'dddd') {
				ii = indexOf.call(this._weekdaysParse, llc);
				if (ii !== -1) {
					return ii;
				}
				ii = indexOf.call(this._shortWeekdaysParse, llc);
				if (ii !== -1) {
					return ii;
				}
				ii = indexOf.call(this._minWeekdaysParse, llc);
				return ii !== -1 ? ii : null;
			} else if (format === 'ddd') {
				ii = indexOf.call(this._shortWeekdaysParse, llc);
				if (ii !== -1) {
					return ii;
				}
				ii = indexOf.call(this._weekdaysParse, llc);
				if (ii !== -1) {
					return ii;
				}
				ii = indexOf.call(this._minWeekdaysParse, llc);
				return ii !== -1 ? ii : null;
			} else {
				ii = indexOf.call(this._minWeekdaysParse, llc);
				if (ii !== -1) {
					return ii;
				}
				ii = indexOf.call(this._weekdaysParse, llc);
				if (ii !== -1) {
					return ii;
				}
				ii = indexOf.call(this._shortWeekdaysParse, llc);
				return ii !== -1 ? ii : null;
			}
		}
	}

	function localeWeekdaysParse(weekdayName, format, strict) {
		var i, mom, regex;

		if (this._weekdaysParseExact) {
			return handleStrictParse$1.call(this, weekdayName, format, strict);
		}

		if (!this._weekdaysParse) {
			this._weekdaysParse = [];
			this._minWeekdaysParse = [];
			this._shortWeekdaysParse = [];
			this._fullWeekdaysParse = [];
		}

		for (i = 0; i < 7; i++) {
			// make the regex if we don't have it already

			mom = createUTC([2000, 1]).day(i);
			if (strict && !this._fullWeekdaysParse[i]) {
				this._fullWeekdaysParse[i] = new RegExp('^' + this.weekdays(mom, '').replace('.', '\\.?') + '$', 'i');
				this._shortWeekdaysParse[i] = new RegExp('^' + this.weekdaysShort(mom, '').replace('.', '\\.?') + '$', 'i');
				this._minWeekdaysParse[i] = new RegExp('^' + this.weekdaysMin(mom, '').replace('.', '\\.?') + '$', 'i');
			}
			if (!this._weekdaysParse[i]) {
				regex = '^' + this.weekdays(mom, '') + '|^' + this.weekdaysShort(mom, '') + '|^' + this.weekdaysMin(mom, '');
				this._weekdaysParse[i] = new RegExp(regex.replace('.', ''), 'i');
			}
			// test the regex
			if (strict && format === 'dddd' && this._fullWeekdaysParse[i].test(weekdayName)) {
				return i;
			} else if (strict && format === 'ddd' && this._shortWeekdaysParse[i].test(weekdayName)) {
				return i;
			} else if (strict && format === 'dd' && this._minWeekdaysParse[i].test(weekdayName)) {
				return i;
			} else if (!strict && this._weekdaysParse[i].test(weekdayName)) {
				return i;
			}
		}
	}

	// MOMENTS

	function getSetDayOfWeek(input) {
		if (!this.isValid()) {
			return input != null ? this : NaN;
		}
		var day = this._isUTC ? this._d.getUTCDay() : this._d.getDay();
		if (input != null) {
			input = parseWeekday(input, this.localeData());
			return this.add(input - day, 'd');
		} else {
			return day;
		}
	}

	function getSetLocaleDayOfWeek(input) {
		if (!this.isValid()) {
			return input != null ? this : NaN;
		}
		var weekday = (this.day() + 7 - this.localeData()._week.dow) % 7;
		return input == null ? weekday : this.add(input - weekday, 'd');
	}

	function getSetISODayOfWeek(input) {
		if (!this.isValid()) {
			return input != null ? this : NaN;
		}

		// behaves the same as moment#day except
		// as a getter, returns 7 instead of 0 (1-7 range instead of 0-6)
		// as a setter, sunday should belong to the previous week.

		if (input != null) {
			var weekday = parseIsoWeekday(input, this.localeData());
			return this.day(this.day() % 7 ? weekday : weekday - 7);
		} else {
			return this.day() || 7;
		}
	}

	var defaultWeekdaysRegex = matchWord;
	function weekdaysRegex(isStrict) {
		if (this._weekdaysParseExact) {
			if (!hasOwnProp(this, '_weekdaysRegex')) {
				computeWeekdaysParse.call(this);
			}
			if (isStrict) {
				return this._weekdaysStrictRegex;
			} else {
				return this._weekdaysRegex;
			}
		} else {
			if (!hasOwnProp(this, '_weekdaysRegex')) {
				this._weekdaysRegex = defaultWeekdaysRegex;
			}
			return this._weekdaysStrictRegex && isStrict ?
				this._weekdaysStrictRegex : this._weekdaysRegex;
		}
	}

	var defaultWeekdaysShortRegex = matchWord;
	function weekdaysShortRegex(isStrict) {
		if (this._weekdaysParseExact) {
			if (!hasOwnProp(this, '_weekdaysRegex')) {
				computeWeekdaysParse.call(this);
			}
			if (isStrict) {
				return this._weekdaysShortStrictRegex;
			} else {
				return this._weekdaysShortRegex;
			}
		} else {
			if (!hasOwnProp(this, '_weekdaysShortRegex')) {
				this._weekdaysShortRegex = defaultWeekdaysShortRegex;
			}
			return this._weekdaysShortStrictRegex && isStrict ?
				this._weekdaysShortStrictRegex : this._weekdaysShortRegex;
		}
	}

	var defaultWeekdaysMinRegex = matchWord;
	function weekdaysMinRegex(isStrict) {
		if (this._weekdaysParseExact) {
			if (!hasOwnProp(this, '_weekdaysRegex')) {
				computeWeekdaysParse.call(this);
			}
			if (isStrict) {
				return this._weekdaysMinStrictRegex;
			} else {
				return this._weekdaysMinRegex;
			}
		} else {
			if (!hasOwnProp(this, '_weekdaysMinRegex')) {
				this._weekdaysMinRegex = defaultWeekdaysMinRegex;
			}
			return this._weekdaysMinStrictRegex && isStrict ?
				this._weekdaysMinStrictRegex : this._weekdaysMinRegex;
		}
	}


	function computeWeekdaysParse() {
		function cmpLenRev(a, b) {
			return b.length - a.length;
		}

		var minPieces = [], shortPieces = [], longPieces = [], mixedPieces = [],
			i, mom, minp, shortp, longp;
		for (i = 0; i < 7; i++) {
			// make the regex if we don't have it already
			mom = createUTC([2000, 1]).day(i);
			minp = this.weekdaysMin(mom, '');
			shortp = this.weekdaysShort(mom, '');
			longp = this.weekdays(mom, '');
			minPieces.push(minp);
			shortPieces.push(shortp);
			longPieces.push(longp);
			mixedPieces.push(minp);
			mixedPieces.push(shortp);
			mixedPieces.push(longp);
		}
		// Sorting makes sure if one weekday (or abbr) is a prefix of another it
		// will match the longer piece.
		minPieces.sort(cmpLenRev);
		shortPieces.sort(cmpLenRev);
		longPieces.sort(cmpLenRev);
		mixedPieces.sort(cmpLenRev);
		for (i = 0; i < 7; i++) {
			shortPieces[i] = regexEscape(shortPieces[i]);
			longPieces[i] = regexEscape(longPieces[i]);
			mixedPieces[i] = regexEscape(mixedPieces[i]);
		}

		this._weekdaysRegex = new RegExp('^(' + mixedPieces.join('|') + ')', 'i');
		this._weekdaysShortRegex = this._weekdaysRegex;
		this._weekdaysMinRegex = this._weekdaysRegex;

		this._weekdaysStrictRegex = new RegExp('^(' + longPieces.join('|') + ')', 'i');
		this._weekdaysShortStrictRegex = new RegExp('^(' + shortPieces.join('|') + ')', 'i');
		this._weekdaysMinStrictRegex = new RegExp('^(' + minPieces.join('|') + ')', 'i');
	}

	// FORMATTING

	function hFormat() {
		return this.hours() % 12 || 12;
	}

	function kFormat() {
		return this.hours() || 24;
	}

	addFormatToken('H', ['HH', 2], 0, 'hour');
	addFormatToken('h', ['hh', 2], 0, hFormat);
	addFormatToken('k', ['kk', 2], 0, kFormat);

	addFormatToken('hmm', 0, 0, function () {
		return '' + hFormat.apply(this) + zeroFill(this.minutes(), 2);
	});

	addFormatToken('hmmss', 0, 0, function () {
		return '' + hFormat.apply(this) + zeroFill(this.minutes(), 2) +
			zeroFill(this.seconds(), 2);
	});

	addFormatToken('Hmm', 0, 0, function () {
		return '' + this.hours() + zeroFill(this.minutes(), 2);
	});

	addFormatToken('Hmmss', 0, 0, function () {
		return '' + this.hours() + zeroFill(this.minutes(), 2) +
			zeroFill(this.seconds(), 2);
	});

	function meridiem(token, lowercase) {
		addFormatToken(token, 0, 0, function () {
			return this.localeData().meridiem(this.hours(), this.minutes(), lowercase);
		});
	}

	meridiem('a', true);
	meridiem('A', false);

	// ALIASES

	addUnitAlias('hour', 'h');

	// PRIORITY
	addUnitPriority('hour', 13);

	// PARSING

	function matchMeridiem(isStrict, locale) {
		return locale._meridiemParse;
	}

	addRegexToken('a', matchMeridiem);
	addRegexToken('A', matchMeridiem);
	addRegexToken('H', match1to2);
	addRegexToken('h', match1to2);
	addRegexToken('k', match1to2);
	addRegexToken('HH', match1to2, match2);
	addRegexToken('hh', match1to2, match2);
	addRegexToken('kk', match1to2, match2);

	addRegexToken('hmm', match3to4);
	addRegexToken('hmmss', match5to6);
	addRegexToken('Hmm', match3to4);
	addRegexToken('Hmmss', match5to6);

	addParseToken(['H', 'HH'], HOUR);
	addParseToken(['k', 'kk'], function (input, array, config) {
		var kInput = toInt(input);
		array[HOUR] = kInput === 24 ? 0 : kInput;
	});
	addParseToken(['a', 'A'], function (input, array, config) {
		config._isPm = config._locale.isPM(input);
		config._meridiem = input;
	});
	addParseToken(['h', 'hh'], function (input, array, config) {
		array[HOUR] = toInt(input);
		getParsingFlags(config).bigHour = true;
	});
	addParseToken('hmm', function (input, array, config) {
		var pos = input.length - 2;
		array[HOUR] = toInt(input.substr(0, pos));
		array[MINUTE] = toInt(input.substr(pos));
		getParsingFlags(config).bigHour = true;
	});
	addParseToken('hmmss', function (input, array, config) {
		var pos1 = input.length - 4;
		var pos2 = input.length - 2;
		array[HOUR] = toInt(input.substr(0, pos1));
		array[MINUTE] = toInt(input.substr(pos1, 2));
		array[SECOND] = toInt(input.substr(pos2));
		getParsingFlags(config).bigHour = true;
	});
	addParseToken('Hmm', function (input, array, config) {
		var pos = input.length - 2;
		array[HOUR] = toInt(input.substr(0, pos));
		array[MINUTE] = toInt(input.substr(pos));
	});
	addParseToken('Hmmss', function (input, array, config) {
		var pos1 = input.length - 4;
		var pos2 = input.length - 2;
		array[HOUR] = toInt(input.substr(0, pos1));
		array[MINUTE] = toInt(input.substr(pos1, 2));
		array[SECOND] = toInt(input.substr(pos2));
	});

	// LOCALES

	function localeIsPM(input) {
		// IE8 Quirks Mode & IE7 Standards Mode do not allow accessing strings like arrays
		// Using charAt should be more compatible.
		return ((input + '').toLowerCase().charAt(0) === 'p');
	}

	var defaultLocaleMeridiemParse = /[ap]\.?m?\.?/i;
	function localeMeridiem(hours, minutes, isLower) {
		if (hours > 11) {
			return isLower ? 'pm' : 'PM';
		} else {
			return isLower ? 'am' : 'AM';
		}
	}


	// MOMENTS

	// Setting the hour should keep the time, because the user explicitly
	// specified which hour they want. So trying to maintain the same hour (in
	// a new timezone) makes sense. Adding/subtracting hours does not follow
	// this rule.
	var getSetHour = makeGetSet('Hours', true);

	var baseConfig = {
		calendar: defaultCalendar,
		longDateFormat: defaultLongDateFormat,
		invalidDate: defaultInvalidDate,
		ordinal: defaultOrdinal,
		dayOfMonthOrdinalParse: defaultDayOfMonthOrdinalParse,
		relativeTime: defaultRelativeTime,

		months: defaultLocaleMonths,
		monthsShort: defaultLocaleMonthsShort,

		week: defaultLocaleWeek,

		weekdays: defaultLocaleWeekdays,
		weekdaysMin: defaultLocaleWeekdaysMin,
		weekdaysShort: defaultLocaleWeekdaysShort,

		meridiemParse: defaultLocaleMeridiemParse
	};

	// internal storage for locale config files
	var locales = {};
	var localeFamilies = {};
	var globalLocale;

	function normalizeLocale(key) {
		return key ? key.toLowerCase().replace('_', '-') : key;
	}

	// pick the locale from the array
	// try ['en-au', 'en-gb'] as 'en-au', 'en-gb', 'en', as in move through the list trying each
	// substring from most specific to least, but move to the next array item if it's a more specific variant than the current root
	function chooseLocale(names) {
		var i = 0, j, next, locale, split;

		while (i < names.length) {
			split = normalizeLocale(names[i]).split('-');
			j = split.length;
			next = normalizeLocale(names[i + 1]);
			next = next ? next.split('-') : null;
			while (j > 0) {
				locale = loadLocale(split.slice(0, j).join('-'));
				if (locale) {
					return locale;
				}
				if (next && next.length >= j && compareArrays(split, next, true) >= j - 1) {
					//the next array item is better than a shallower substring of this one
					break;
				}
				j--;
			}
			i++;
		}
		return globalLocale;
	}

	function loadLocale(name) {
		var oldLocale = null;
		// TODO: Find a better way to register and load all the locales in Node
		if (!locales[name] && (typeof module !== 'undefined') &&
			module && module.exports) {
			try {
				oldLocale = globalLocale._abbr;
				var aliasedRequire = require;
				aliasedRequire('./locale/' + name);
				getSetGlobalLocale(oldLocale);
			} catch (e) { }
		}
		return locales[name];
	}

	// This function will load locale and then set the global locale.  If
	// no arguments are passed in, it will simply return the current global
	// locale key.
	function getSetGlobalLocale(key, values) {
		var data;
		if (key) {
			if (isUndefined(values)) {
				data = getLocale(key);
			}
			else {
				data = defineLocale(key, values);
			}

			if (data) {
				// moment.duration._locale = moment._locale = data;
				globalLocale = data;
			}
			else {
				if ((typeof console !== 'undefined') && console.warn) {
					//warn user if arguments are passed but the locale could not be set
					console.warn('Locale ' + key + ' not found. Did you forget to load it?');
				}
			}
		}

		return globalLocale._abbr;
	}

	function defineLocale(name, config) {
		if (config !== null) {
			var locale, parentConfig = baseConfig;
			config.abbr = name;
			if (locales[name] != null) {
				deprecateSimple('defineLocaleOverride',
					'use moment.updateLocale(localeName, config) to change ' +
					'an existing locale. moment.defineLocale(localeName, ' +
					'config) should only be used for creating a new locale ' +
					'See http://momentjs.com/guides/#/warnings/define-locale/ for more info.');
				parentConfig = locales[name]._config;
			} else if (config.parentLocale != null) {
				if (locales[config.parentLocale] != null) {
					parentConfig = locales[config.parentLocale]._config;
				} else {
					locale = loadLocale(config.parentLocale);
					if (locale != null) {
						parentConfig = locale._config;
					} else {
						if (!localeFamilies[config.parentLocale]) {
							localeFamilies[config.parentLocale] = [];
						}
						localeFamilies[config.parentLocale].push({
							name: name,
							config: config
						});
						return null;
					}
				}
			}
			locales[name] = new Locale(mergeConfigs(parentConfig, config));

			if (localeFamilies[name]) {
				localeFamilies[name].forEach(function (x) {
					defineLocale(x.name, x.config);
				});
			}

			// backwards compat for now: also set the locale
			// make sure we set the locale AFTER all child locales have been
			// created, so we won't end up with the child locale set.
			getSetGlobalLocale(name);


			return locales[name];
		} else {
			// useful for testing
			delete locales[name];
			return null;
		}
	}

	function updateLocale(name, config) {
		if (config != null) {
			var locale, tmpLocale, parentConfig = baseConfig;
			// MERGE
			tmpLocale = loadLocale(name);
			if (tmpLocale != null) {
				parentConfig = tmpLocale._config;
			}
			config = mergeConfigs(parentConfig, config);
			locale = new Locale(config);
			locale.parentLocale = locales[name];
			locales[name] = locale;

			// backwards compat for now: also set the locale
			getSetGlobalLocale(name);
		} else {
			// pass null for config to unupdate, useful for tests
			if (locales[name] != null) {
				if (locales[name].parentLocale != null) {
					locales[name] = locales[name].parentLocale;
				} else if (locales[name] != null) {
					delete locales[name];
				}
			}
		}
		return locales[name];
	}

	// returns locale data
	function getLocale(key) {
		var locale;

		if (key && key._locale && key._locale._abbr) {
			key = key._locale._abbr;
		}

		if (!key) {
			return globalLocale;
		}

		if (!isArray(key)) {
			//short-circuit everything else
			locale = loadLocale(key);
			if (locale) {
				return locale;
			}
			key = [key];
		}

		return chooseLocale(key);
	}

	function listLocales() {
		return keys(locales);
	}

	function checkOverflow(m) {
		var overflow;
		var a = m._a;

		if (a && getParsingFlags(m).overflow === -2) {
			overflow =
				a[MONTH] < 0 || a[MONTH] > 11 ? MONTH :
					a[DATE] < 1 || a[DATE] > daysInMonth(a[YEAR], a[MONTH]) ? DATE :
						a[HOUR] < 0 || a[HOUR] > 24 || (a[HOUR] === 24 && (a[MINUTE] !== 0 || a[SECOND] !== 0 || a[MILLISECOND] !== 0)) ? HOUR :
							a[MINUTE] < 0 || a[MINUTE] > 59 ? MINUTE :
								a[SECOND] < 0 || a[SECOND] > 59 ? SECOND :
									a[MILLISECOND] < 0 || a[MILLISECOND] > 999 ? MILLISECOND :
										-1;

			if (getParsingFlags(m)._overflowDayOfYear && (overflow < YEAR || overflow > DATE)) {
				overflow = DATE;
			}
			if (getParsingFlags(m)._overflowWeeks && overflow === -1) {
				overflow = WEEK;
			}
			if (getParsingFlags(m)._overflowWeekday && overflow === -1) {
				overflow = WEEKDAY;
			}

			getParsingFlags(m).overflow = overflow;
		}

		return m;
	}

	// Pick the first defined of two or three arguments.
	function defaults(a, b, c) {
		if (a != null) {
			return a;
		}
		if (b != null) {
			return b;
		}
		return c;
	}

	function currentDateArray(config) {
		// hooks is actually the exported moment object
		var nowValue = new Date(hooks.now());
		if (config._useUTC) {
			return [nowValue.getUTCFullYear(), nowValue.getUTCMonth(), nowValue.getUTCDate()];
		}
		return [nowValue.getFullYear(), nowValue.getMonth(), nowValue.getDate()];
	}

	// convert an array to a date.
	// the array should mirror the parameters below
	// note: all values past the year are optional and will default to the lowest possible value.
	// [year, month, day , hour, minute, second, millisecond]
	function configFromArray(config) {
		var i, date, input = [], currentDate, expectedWeekday, yearToUse;

		if (config._d) {
			return;
		}

		currentDate = currentDateArray(config);

		//compute day of the year from weeks and weekdays
		if (config._w && config._a[DATE] == null && config._a[MONTH] == null) {
			dayOfYearFromWeekInfo(config);
		}

		//if the day of the year is set, figure out what it is
		if (config._dayOfYear != null) {
			yearToUse = defaults(config._a[YEAR], currentDate[YEAR]);

			if (config._dayOfYear > daysInYear(yearToUse) || config._dayOfYear === 0) {
				getParsingFlags(config)._overflowDayOfYear = true;
			}

			date = createUTCDate(yearToUse, 0, config._dayOfYear);
			config._a[MONTH] = date.getUTCMonth();
			config._a[DATE] = date.getUTCDate();
		}

		// Default to current date.
		// * if no year, month, day of month are given, default to today
		// * if day of month is given, default month and year
		// * if month is given, default only year
		// * if year is given, don't default anything
		for (i = 0; i < 3 && config._a[i] == null; ++i) {
			config._a[i] = input[i] = currentDate[i];
		}

		// Zero out whatever was not defaulted, including time
		for (; i < 7; i++) {
			config._a[i] = input[i] = (config._a[i] == null) ? (i === 2 ? 1 : 0) : config._a[i];
		}

		// Check for 24:00:00.000
		if (config._a[HOUR] === 24 &&
			config._a[MINUTE] === 0 &&
			config._a[SECOND] === 0 &&
			config._a[MILLISECOND] === 0) {
			config._nextDay = true;
			config._a[HOUR] = 0;
		}

		config._d = (config._useUTC ? createUTCDate : createDate).apply(null, input);
		expectedWeekday = config._useUTC ? config._d.getUTCDay() : config._d.getDay();

		// Apply timezone offset from input. The actual utcOffset can be changed
		// with parseZone.
		if (config._tzm != null) {
			config._d.setUTCMinutes(config._d.getUTCMinutes() - config._tzm);
		}

		if (config._nextDay) {
			config._a[HOUR] = 24;
		}

		// check for mismatching day of week
		if (config._w && typeof config._w.d !== 'undefined' && config._w.d !== expectedWeekday) {
			getParsingFlags(config).weekdayMismatch = true;
		}
	}

	function dayOfYearFromWeekInfo(config) {
		var w, weekYear, week, weekday, dow, doy, temp, weekdayOverflow;

		w = config._w;
		if (w.GG != null || w.W != null || w.E != null) {
			dow = 1;
			doy = 4;

			// TODO: We need to take the current isoWeekYear, but that depends on
			// how we interpret now (local, utc, fixed offset). So create
			// a now version of current config (take local/utc/offset flags, and
			// create now).
			weekYear = defaults(w.GG, config._a[YEAR], weekOfYear(createLocal(), 1, 4).year);
			week = defaults(w.W, 1);
			weekday = defaults(w.E, 1);
			if (weekday < 1 || weekday > 7) {
				weekdayOverflow = true;
			}
		} else {
			dow = config._locale._week.dow;
			doy = config._locale._week.doy;

			var curWeek = weekOfYear(createLocal(), dow, doy);

			weekYear = defaults(w.gg, config._a[YEAR], curWeek.year);

			// Default to current week.
			week = defaults(w.w, curWeek.week);

			if (w.d != null) {
				// weekday -- low day numbers are considered next week
				weekday = w.d;
				if (weekday < 0 || weekday > 6) {
					weekdayOverflow = true;
				}
			} else if (w.e != null) {
				// local weekday -- counting starts from beginning of week
				weekday = w.e + dow;
				if (w.e < 0 || w.e > 6) {
					weekdayOverflow = true;
				}
			} else {
				// default to beginning of week
				weekday = dow;
			}
		}
		if (week < 1 || week > weeksInYear(weekYear, dow, doy)) {
			getParsingFlags(config)._overflowWeeks = true;
		} else if (weekdayOverflow != null) {
			getParsingFlags(config)._overflowWeekday = true;
		} else {
			temp = dayOfYearFromWeeks(weekYear, week, weekday, dow, doy);
			config._a[YEAR] = temp.year;
			config._dayOfYear = temp.dayOfYear;
		}
	}

	// iso 8601 regex
	// 0000-00-00 0000-W00 or 0000-W00-0 + T + 00 or 00:00 or 00:00:00 or 00:00:00.000 + +00:00 or +0000 or +00)
	var extendedIsoRegex = /^\s*((?:[+-]\d{6}|\d{4})-(?:\d\d-\d\d|W\d\d-\d|W\d\d|\d\d\d|\d\d))(?:(T| )(\d\d(?::\d\d(?::\d\d(?:[.,]\d+)?)?)?)([\+\-]\d\d(?::?\d\d)?|\s*Z)?)?$/;
	var basicIsoRegex = /^\s*((?:[+-]\d{6}|\d{4})(?:\d\d\d\d|W\d\d\d|W\d\d|\d\d\d|\d\d))(?:(T| )(\d\d(?:\d\d(?:\d\d(?:[.,]\d+)?)?)?)([\+\-]\d\d(?::?\d\d)?|\s*Z)?)?$/;

	var tzRegex = /Z|[+-]\d\d(?::?\d\d)?/;

	var isoDates = [
		['YYYYYY-MM-DD', /[+-]\d{6}-\d\d-\d\d/],
		['YYYY-MM-DD', /\d{4}-\d\d-\d\d/],
		['GGGG-[W]WW-E', /\d{4}-W\d\d-\d/],
		['GGGG-[W]WW', /\d{4}-W\d\d/, false],
		['YYYY-DDD', /\d{4}-\d{3}/],
		['YYYY-MM', /\d{4}-\d\d/, false],
		['YYYYYYMMDD', /[+-]\d{10}/],
		['YYYYMMDD', /\d{8}/],
		// YYYYMM is NOT allowed by the standard
		['GGGG[W]WWE', /\d{4}W\d{3}/],
		['GGGG[W]WW', /\d{4}W\d{2}/, false],
		['YYYYDDD', /\d{7}/]
	];

	// iso time formats and regexes
	var isoTimes = [
		['HH:mm:ss.SSSS', /\d\d:\d\d:\d\d\.\d+/],
		['HH:mm:ss,SSSS', /\d\d:\d\d:\d\d,\d+/],
		['HH:mm:ss', /\d\d:\d\d:\d\d/],
		['HH:mm', /\d\d:\d\d/],
		['HHmmss.SSSS', /\d\d\d\d\d\d\.\d+/],
		['HHmmss,SSSS', /\d\d\d\d\d\d,\d+/],
		['HHmmss', /\d\d\d\d\d\d/],
		['HHmm', /\d\d\d\d/],
		['HH', /\d\d/]
	];

	var aspNetJsonRegex = /^\/?Date\((\-?\d+)/i;

	// date from iso format
	function configFromISO(config) {
		var i, l,
			string = config._i,
			match = extendedIsoRegex.exec(string) || basicIsoRegex.exec(string),
			allowTime, dateFormat, timeFormat, tzFormat;

		if (match) {
			getParsingFlags(config).iso = true;

			for (i = 0, l = isoDates.length; i < l; i++) {
				if (isoDates[i][1].exec(match[1])) {
					dateFormat = isoDates[i][0];
					allowTime = isoDates[i][2] !== false;
					break;
				}
			}
			if (dateFormat == null) {
				config._isValid = false;
				return;
			}
			if (match[3]) {
				for (i = 0, l = isoTimes.length; i < l; i++) {
					if (isoTimes[i][1].exec(match[3])) {
						// match[2] should be 'T' or space
						timeFormat = (match[2] || ' ') + isoTimes[i][0];
						break;
					}
				}
				if (timeFormat == null) {
					config._isValid = false;
					return;
				}
			}
			if (!allowTime && timeFormat != null) {
				config._isValid = false;
				return;
			}
			if (match[4]) {
				if (tzRegex.exec(match[4])) {
					tzFormat = 'Z';
				} else {
					config._isValid = false;
					return;
				}
			}
			config._f = dateFormat + (timeFormat || '') + (tzFormat || '');
			configFromStringAndFormat(config);
		} else {
			config._isValid = false;
		}
	}

	// RFC 2822 regex: For details see https://tools.ietf.org/html/rfc2822#section-3.3
	var rfc2822 = /^(?:(Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s)?(\d{1,2})\s(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s(\d{2,4})\s(\d\d):(\d\d)(?::(\d\d))?\s(?:(UT|GMT|[ECMP][SD]T)|([Zz])|([+-]\d{4}))$/;

	function extractFromRFC2822Strings(yearStr, monthStr, dayStr, hourStr, minuteStr, secondStr) {
		var result = [
			untruncateYear(yearStr),
			defaultLocaleMonthsShort.indexOf(monthStr),
			parseInt(dayStr, 10),
			parseInt(hourStr, 10),
			parseInt(minuteStr, 10)
		];

		if (secondStr) {
			result.push(parseInt(secondStr, 10));
		}

		return result;
	}

	function untruncateYear(yearStr) {
		var year = parseInt(yearStr, 10);
		if (year <= 49) {
			return 2000 + year;
		} else if (year <= 999) {
			return 1900 + year;
		}
		return year;
	}

	function preprocessRFC2822(s) {
		// Remove comments and folding whitespace and replace multiple-spaces with a single space
		return s.replace(/\([^)]*\)|[\n\t]/g, ' ').replace(/(\s\s+)/g, ' ').replace(/^\s\s*/, '').replace(/\s\s*$/, '');
	}

	function checkWeekday(weekdayStr, parsedInput, config) {
		if (weekdayStr) {
			// TODO: Replace the vanilla JS Date object with an indepentent day-of-week check.
			var weekdayProvided = defaultLocaleWeekdaysShort.indexOf(weekdayStr),
				weekdayActual = new Date(parsedInput[0], parsedInput[1], parsedInput[2]).getDay();
			if (weekdayProvided !== weekdayActual) {
				getParsingFlags(config).weekdayMismatch = true;
				config._isValid = false;
				return false;
			}
		}
		return true;
	}

	var obsOffsets = {
		UT: 0,
		GMT: 0,
		EDT: -4 * 60,
		EST: -5 * 60,
		CDT: -5 * 60,
		CST: -6 * 60,
		MDT: -6 * 60,
		MST: -7 * 60,
		PDT: -7 * 60,
		PST: -8 * 60
	};

	function calculateOffset(obsOffset, militaryOffset, numOffset) {
		if (obsOffset) {
			return obsOffsets[obsOffset];
		} else if (militaryOffset) {
			// the only allowed military tz is Z
			return 0;
		} else {
			var hm = parseInt(numOffset, 10);
			var m = hm % 100, h = (hm - m) / 100;
			return h * 60 + m;
		}
	}

	// date and time from ref 2822 format
	function configFromRFC2822(config) {
		var match = rfc2822.exec(preprocessRFC2822(config._i));
		if (match) {
			var parsedArray = extractFromRFC2822Strings(match[4], match[3], match[2], match[5], match[6], match[7]);
			if (!checkWeekday(match[1], parsedArray, config)) {
				return;
			}

			config._a = parsedArray;
			config._tzm = calculateOffset(match[8], match[9], match[10]);

			config._d = createUTCDate.apply(null, config._a);
			config._d.setUTCMinutes(config._d.getUTCMinutes() - config._tzm);

			getParsingFlags(config).rfc2822 = true;
		} else {
			config._isValid = false;
		}
	}

	// date from iso format or fallback
	function configFromString(config) {
		var matched = aspNetJsonRegex.exec(config._i);

		if (matched !== null) {
			config._d = new Date(+matched[1]);
			return;
		}

		configFromISO(config);
		if (config._isValid === false) {
			delete config._isValid;
		} else {
			return;
		}

		configFromRFC2822(config);
		if (config._isValid === false) {
			delete config._isValid;
		} else {
			return;
		}

		// Final attempt, use Input Fallback
		hooks.createFromInputFallback(config);
	}

	hooks.createFromInputFallback = deprecate(
		'value provided is not in a recognized RFC2822 or ISO format. moment construction falls back to js Date(), ' +
		'which is not reliable across all browsers and versions. Non RFC2822/ISO date formats are ' +
		'discouraged and will be removed in an upcoming major release. Please refer to ' +
		'http://momentjs.com/guides/#/warnings/js-date/ for more info.',
		function (config) {
			config._d = new Date(config._i + (config._useUTC ? ' UTC' : ''));
		}
	);

	// constant that refers to the ISO standard
	hooks.ISO_8601 = function () { };

	// constant that refers to the RFC 2822 form
	hooks.RFC_2822 = function () { };

	// date from string and format string
	function configFromStringAndFormat(config) {
		// TODO: Move this to another part of the creation flow to prevent circular deps
		if (config._f === hooks.ISO_8601) {
			configFromISO(config);
			return;
		}
		if (config._f === hooks.RFC_2822) {
			configFromRFC2822(config);
			return;
		}
		config._a = [];
		getParsingFlags(config).empty = true;

		// This array is used to make a Date, either with `new Date` or `Date.UTC`
		var string = '' + config._i,
			i, parsedInput, tokens, token, skipped,
			stringLength = string.length,
			totalParsedInputLength = 0;

		tokens = expandFormat(config._f, config._locale).match(formattingTokens) || [];

		for (i = 0; i < tokens.length; i++) {
			token = tokens[i];
			parsedInput = (string.match(getParseRegexForToken(token, config)) || [])[0];
			// console.log('token', token, 'parsedInput', parsedInput,
			//         'regex', getParseRegexForToken(token, config));
			if (parsedInput) {
				skipped = string.substr(0, string.indexOf(parsedInput));
				if (skipped.length > 0) {
					getParsingFlags(config).unusedInput.push(skipped);
				}
				string = string.slice(string.indexOf(parsedInput) + parsedInput.length);
				totalParsedInputLength += parsedInput.length;
			}
			// don't parse if it's not a known token
			if (formatTokenFunctions[token]) {
				if (parsedInput) {
					getParsingFlags(config).empty = false;
				}
				else {
					getParsingFlags(config).unusedTokens.push(token);
				}
				addTimeToArrayFromToken(token, parsedInput, config);
			}
			else if (config._strict && !parsedInput) {
				getParsingFlags(config).unusedTokens.push(token);
			}
		}

		// add remaining unparsed input length to the string
		getParsingFlags(config).charsLeftOver = stringLength - totalParsedInputLength;
		if (string.length > 0) {
			getParsingFlags(config).unusedInput.push(string);
		}

		// clear _12h flag if hour is <= 12
		if (config._a[HOUR] <= 12 &&
			getParsingFlags(config).bigHour === true &&
			config._a[HOUR] > 0) {
			getParsingFlags(config).bigHour = undefined;
		}

		getParsingFlags(config).parsedDateParts = config._a.slice(0);
		getParsingFlags(config).meridiem = config._meridiem;
		// handle meridiem
		config._a[HOUR] = meridiemFixWrap(config._locale, config._a[HOUR], config._meridiem);

		configFromArray(config);
		checkOverflow(config);
	}


	function meridiemFixWrap(locale, hour, meridiem) {
		var isPm;

		if (meridiem == null) {
			// nothing to do
			return hour;
		}
		if (locale.meridiemHour != null) {
			return locale.meridiemHour(hour, meridiem);
		} else if (locale.isPM != null) {
			// Fallback
			isPm = locale.isPM(meridiem);
			if (isPm && hour < 12) {
				hour += 12;
			}
			if (!isPm && hour === 12) {
				hour = 0;
			}
			return hour;
		} else {
			// this is not supposed to happen
			return hour;
		}
	}

	// date from string and array of format strings
	function configFromStringAndArray(config) {
		var tempConfig,
			bestMoment,

			scoreToBeat,
			i,
			currentScore;

		if (config._f.length === 0) {
			getParsingFlags(config).invalidFormat = true;
			config._d = new Date(NaN);
			return;
		}

		for (i = 0; i < config._f.length; i++) {
			currentScore = 0;
			tempConfig = copyConfig({}, config);
			if (config._useUTC != null) {
				tempConfig._useUTC = config._useUTC;
			}
			tempConfig._f = config._f[i];
			configFromStringAndFormat(tempConfig);

			if (!isValid(tempConfig)) {
				continue;
			}

			// if there is any input that was not parsed add a penalty for that format
			currentScore += getParsingFlags(tempConfig).charsLeftOver;

			//or tokens
			currentScore += getParsingFlags(tempConfig).unusedTokens.length * 10;

			getParsingFlags(tempConfig).score = currentScore;

			if (scoreToBeat == null || currentScore < scoreToBeat) {
				scoreToBeat = currentScore;
				bestMoment = tempConfig;
			}
		}

		extend(config, bestMoment || tempConfig);
	}

	function configFromObject(config) {
		if (config._d) {
			return;
		}

		var i = normalizeObjectUnits(config._i);
		config._a = map([i.year, i.month, i.day || i.date, i.hour, i.minute, i.second, i.millisecond], function (obj) {
			return obj && parseInt(obj, 10);
		});

		configFromArray(config);
	}

	function createFromConfig(config) {
		var res = new Moment(checkOverflow(prepareConfig(config)));
		if (res._nextDay) {
			// Adding is smart enough around DST
			res.add(1, 'd');
			res._nextDay = undefined;
		}

		return res;
	}

	function prepareConfig(config) {
		var input = config._i,
			format = config._f;

		config._locale = config._locale || getLocale(config._l);

		if (input === null || (format === undefined && input === '')) {
			return createInvalid({ nullInput: true });
		}

		if (typeof input === 'string') {
			config._i = input = config._locale.preparse(input);
		}

		if (isMoment(input)) {
			return new Moment(checkOverflow(input));
		} else if (isDate(input)) {
			config._d = input;
		} else if (isArray(format)) {
			configFromStringAndArray(config);
		} else if (format) {
			configFromStringAndFormat(config);
		} else {
			configFromInput(config);
		}

		if (!isValid(config)) {
			config._d = null;
		}

		return config;
	}

	function configFromInput(config) {
		var input = config._i;
		if (isUndefined(input)) {
			config._d = new Date(hooks.now());
		} else if (isDate(input)) {
			config._d = new Date(input.valueOf());
		} else if (typeof input === 'string') {
			configFromString(config);
		} else if (isArray(input)) {
			config._a = map(input.slice(0), function (obj) {
				return parseInt(obj, 10);
			});
			configFromArray(config);
		} else if (isObject(input)) {
			configFromObject(config);
		} else if (isNumber(input)) {
			// from milliseconds
			config._d = new Date(input);
		} else {
			hooks.createFromInputFallback(config);
		}
	}

	function createLocalOrUTC(input, format, locale, strict, isUTC) {
		var c = {};

		if (locale === true || locale === false) {
			strict = locale;
			locale = undefined;
		}

		if ((isObject(input) && isObjectEmpty(input)) ||
			(isArray(input) && input.length === 0)) {
			input = undefined;
		}
		// object construction must be done this way.
		// https://github.com/moment/moment/issues/1423
		c._isAMomentObject = true;
		c._useUTC = c._isUTC = isUTC;
		c._l = locale;
		c._i = input;
		c._f = format;
		c._strict = strict;

		return createFromConfig(c);
	}

	function createLocal(input, format, locale, strict) {
		return createLocalOrUTC(input, format, locale, strict, false);
	}

	var prototypeMin = deprecate(
		'moment().min is deprecated, use moment.max instead. http://momentjs.com/guides/#/warnings/min-max/',
		function () {
			var other = createLocal.apply(null, arguments);
			if (this.isValid() && other.isValid()) {
				return other < this ? this : other;
			} else {
				return createInvalid();
			}
		}
	);

	var prototypeMax = deprecate(
		'moment().max is deprecated, use moment.min instead. http://momentjs.com/guides/#/warnings/min-max/',
		function () {
			var other = createLocal.apply(null, arguments);
			if (this.isValid() && other.isValid()) {
				return other > this ? this : other;
			} else {
				return createInvalid();
			}
		}
	);

	// Pick a moment m from moments so that m[fn](other) is true for all
	// other. This relies on the function fn to be transitive.
	//
	// moments should either be an array of moment objects or an array, whose
	// first element is an array of moment objects.
	function pickBy(fn, moments) {
		var res, i;
		if (moments.length === 1 && isArray(moments[0])) {
			moments = moments[0];
		}
		if (!moments.length) {
			return createLocal();
		}
		res = moments[0];
		for (i = 1; i < moments.length; ++i) {
			if (!moments[i].isValid() || moments[i][fn](res)) {
				res = moments[i];
			}
		}
		return res;
	}

	// TODO: Use [].sort instead?
	function min() {
		var args = [].slice.call(arguments, 0);

		return pickBy('isBefore', args);
	}

	function max() {
		var args = [].slice.call(arguments, 0);

		return pickBy('isAfter', args);
	}

	var now = function () {
		return Date.now ? Date.now() : +(new Date());
	};

	var ordering = ['year', 'quarter', 'month', 'week', 'day', 'hour', 'minute', 'second', 'millisecond'];

	function isDurationValid(m) {
		for (var key in m) {
			if (!(indexOf.call(ordering, key) !== -1 && (m[key] == null || !isNaN(m[key])))) {
				return false;
			}
		}

		var unitHasDecimal = false;
		for (var i = 0; i < ordering.length; ++i) {
			if (m[ordering[i]]) {
				if (unitHasDecimal) {
					return false; // only allow non-integers for smallest unit
				}
				if (parseFloat(m[ordering[i]]) !== toInt(m[ordering[i]])) {
					unitHasDecimal = true;
				}
			}
		}

		return true;
	}

	function isValid$1() {
		return this._isValid;
	}

	function createInvalid$1() {
		return createDuration(NaN);
	}

	function Duration(duration) {
		var normalizedInput = normalizeObjectUnits(duration),
			years = normalizedInput.year || 0,
			quarters = normalizedInput.quarter || 0,
			months = normalizedInput.month || 0,
			weeks = normalizedInput.week || normalizedInput.isoWeek || 0,
			days = normalizedInput.day || 0,
			hours = normalizedInput.hour || 0,
			minutes = normalizedInput.minute || 0,
			seconds = normalizedInput.second || 0,
			milliseconds = normalizedInput.millisecond || 0;

		this._isValid = isDurationValid(normalizedInput);

		// representation for dateAddRemove
		this._milliseconds = +milliseconds +
			seconds * 1e3 + // 1000
			minutes * 6e4 + // 1000 * 60
			hours * 1000 * 60 * 60; //using 1000 * 60 * 60 instead of 36e5 to avoid floating point rounding errors https://github.com/moment/moment/issues/2978
		// Because of dateAddRemove treats 24 hours as different from a
		// day when working around DST, we need to store them separately
		this._days = +days +
			weeks * 7;
		// It is impossible to translate months into days without knowing
		// which months you are are talking about, so we have to store
		// it separately.
		this._months = +months +
			quarters * 3 +
			years * 12;

		this._data = {};

		this._locale = getLocale();

		this._bubble();
	}

	function isDuration(obj) {
		return obj instanceof Duration;
	}

	function absRound(number) {
		if (number < 0) {
			return Math.round(-1 * number) * -1;
		} else {
			return Math.round(number);
		}
	}

	// FORMATTING

	function offset(token, separator) {
		addFormatToken(token, 0, 0, function () {
			var offset = this.utcOffset();
			var sign = '+';
			if (offset < 0) {
				offset = -offset;
				sign = '-';
			}
			return sign + zeroFill(~~(offset / 60), 2) + separator + zeroFill(~~(offset) % 60, 2);
		});
	}

	offset('Z', ':');
	offset('ZZ', '');

	// PARSING

	addRegexToken('Z', matchShortOffset);
	addRegexToken('ZZ', matchShortOffset);
	addParseToken(['Z', 'ZZ'], function (input, array, config) {
		config._useUTC = true;
		config._tzm = offsetFromString(matchShortOffset, input);
	});

	// HELPERS

	// timezone chunker
	// '+10:00' > ['10',  '00']
	// '-1530'  > ['-15', '30']
	var chunkOffset = /([\+\-]|\d\d)/gi;

	function offsetFromString(matcher, string) {
		var matches = (string || '').match(matcher);

		if (matches === null) {
			return null;
		}

		var chunk = matches[matches.length - 1] || [];
		var parts = (chunk + '').match(chunkOffset) || ['-', 0, 0];
		var minutes = +(parts[1] * 60) + toInt(parts[2]);

		return minutes === 0 ?
			0 :
			parts[0] === '+' ? minutes : -minutes;
	}

	// Return a moment from input, that is local/utc/zone equivalent to model.
	function cloneWithOffset(input, model) {
		var res, diff;
		if (model._isUTC) {
			res = model.clone();
			diff = (isMoment(input) || isDate(input) ? input.valueOf() : createLocal(input).valueOf()) - res.valueOf();
			// Use low-level api, because this fn is low-level api.
			res._d.setTime(res._d.valueOf() + diff);
			hooks.updateOffset(res, false);
			return res;
		} else {
			return createLocal(input).local();
		}
	}

	function getDateOffset(m) {
		// On Firefox.24 Date#getTimezoneOffset returns a floating point.
		// https://github.com/moment/moment/pull/1871
		return -Math.round(m._d.getTimezoneOffset() / 15) * 15;
	}

	// HOOKS

	// This function will be called whenever a moment is mutated.
	// It is intended to keep the offset in sync with the timezone.
	hooks.updateOffset = function () { };

	// MOMENTS

	// keepLocalTime = true means only change the timezone, without
	// affecting the local hour. So 5:31:26 +0300 --[utcOffset(2, true)]-->
	// 5:31:26 +0200 It is possible that 5:31:26 doesn't exist with offset
	// +0200, so we adjust the time as needed, to be valid.
	//
	// Keeping the time actually adds/subtracts (one hour)
	// from the actual represented time. That is why we call updateOffset
	// a second time. In case it wants us to change the offset again
	// _changeInProgress == true case, then we have to adjust, because
	// there is no such time in the given timezone.
	function getSetOffset(input, keepLocalTime, keepMinutes) {
		var offset = this._offset || 0,
			localAdjust;
		if (!this.isValid()) {
			return input != null ? this : NaN;
		}
		if (input != null) {
			if (typeof input === 'string') {
				input = offsetFromString(matchShortOffset, input);
				if (input === null) {
					return this;
				}
			} else if (Math.abs(input) < 16 && !keepMinutes) {
				input = input * 60;
			}
			if (!this._isUTC && keepLocalTime) {
				localAdjust = getDateOffset(this);
			}
			this._offset = input;
			this._isUTC = true;
			if (localAdjust != null) {
				this.add(localAdjust, 'm');
			}
			if (offset !== input) {
				if (!keepLocalTime || this._changeInProgress) {
					addSubtract(this, createDuration(input - offset, 'm'), 1, false);
				} else if (!this._changeInProgress) {
					this._changeInProgress = true;
					hooks.updateOffset(this, true);
					this._changeInProgress = null;
				}
			}
			return this;
		} else {
			return this._isUTC ? offset : getDateOffset(this);
		}
	}

	function getSetZone(input, keepLocalTime) {
		if (input != null) {
			if (typeof input !== 'string') {
				input = -input;
			}

			this.utcOffset(input, keepLocalTime);

			return this;
		} else {
			return -this.utcOffset();
		}
	}

	function setOffsetToUTC(keepLocalTime) {
		return this.utcOffset(0, keepLocalTime);
	}

	function setOffsetToLocal(keepLocalTime) {
		if (this._isUTC) {
			this.utcOffset(0, keepLocalTime);
			this._isUTC = false;

			if (keepLocalTime) {
				this.subtract(getDateOffset(this), 'm');
			}
		}
		return this;
	}

	function setOffsetToParsedOffset() {
		if (this._tzm != null) {
			this.utcOffset(this._tzm, false, true);
		} else if (typeof this._i === 'string') {
			var tZone = offsetFromString(matchOffset, this._i);
			if (tZone != null) {
				this.utcOffset(tZone);
			}
			else {
				this.utcOffset(0, true);
			}
		}
		return this;
	}

	function hasAlignedHourOffset(input) {
		if (!this.isValid()) {
			return false;
		}
		input = input ? createLocal(input).utcOffset() : 0;

		return (this.utcOffset() - input) % 60 === 0;
	}

	function isDaylightSavingTime() {
		return (
			this.utcOffset() > this.clone().month(0).utcOffset() ||
			this.utcOffset() > this.clone().month(5).utcOffset()
		);
	}

	function isDaylightSavingTimeShifted() {
		if (!isUndefined(this._isDSTShifted)) {
			return this._isDSTShifted;
		}

		var c = {};

		copyConfig(c, this);
		c = prepareConfig(c);

		if (c._a) {
			var other = c._isUTC ? createUTC(c._a) : createLocal(c._a);
			this._isDSTShifted = this.isValid() &&
				compareArrays(c._a, other.toArray()) > 0;
		} else {
			this._isDSTShifted = false;
		}

		return this._isDSTShifted;
	}

	function isLocal() {
		return this.isValid() ? !this._isUTC : false;
	}

	function isUtcOffset() {
		return this.isValid() ? this._isUTC : false;
	}

	function isUtc() {
		return this.isValid() ? this._isUTC && this._offset === 0 : false;
	}

	// ASP.NET json date format regex
	var aspNetRegex = /^(\-|\+)?(?:(\d*)[. ])?(\d+)\:(\d+)(?:\:(\d+)(\.\d*)?)?$/;

	// from http://docs.closure-library.googlecode.com/git/closure_goog_date_date.js.source.html
	// somewhat more in line with 4.4.3.2 2004 spec, but allows decimal anywhere
	// and further modified to allow for strings containing both week and day
	var isoRegex = /^(-|\+)?P(?:([-+]?[0-9,.]*)Y)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)W)?(?:([-+]?[0-9,.]*)D)?(?:T(?:([-+]?[0-9,.]*)H)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)S)?)?$/;

	function createDuration(input, key) {
		var duration = input,
			// matching against regexp is expensive, do it on demand
			match = null,
			sign,
			ret,
			diffRes;

		if (isDuration(input)) {
			duration = {
				ms: input._milliseconds,
				d: input._days,
				M: input._months
			};
		} else if (isNumber(input)) {
			duration = {};
			if (key) {
				duration[key] = input;
			} else {
				duration.milliseconds = input;
			}
		} else if (!!(match = aspNetRegex.exec(input))) {
			sign = (match[1] === '-') ? -1 : 1;
			duration = {
				y: 0,
				d: toInt(match[DATE]) * sign,
				h: toInt(match[HOUR]) * sign,
				m: toInt(match[MINUTE]) * sign,
				s: toInt(match[SECOND]) * sign,
				ms: toInt(absRound(match[MILLISECOND] * 1000)) * sign // the millisecond decimal point is included in the match
			};
		} else if (!!(match = isoRegex.exec(input))) {
			sign = (match[1] === '-') ? -1 : 1;
			duration = {
				y: parseIso(match[2], sign),
				M: parseIso(match[3], sign),
				w: parseIso(match[4], sign),
				d: parseIso(match[5], sign),
				h: parseIso(match[6], sign),
				m: parseIso(match[7], sign),
				s: parseIso(match[8], sign)
			};
		} else if (duration == null) {// checks for null or undefined
			duration = {};
		} else if (typeof duration === 'object' && ('from' in duration || 'to' in duration)) {
			diffRes = momentsDifference(createLocal(duration.from), createLocal(duration.to));

			duration = {};
			duration.ms = diffRes.milliseconds;
			duration.M = diffRes.months;
		}

		ret = new Duration(duration);

		if (isDuration(input) && hasOwnProp(input, '_locale')) {
			ret._locale = input._locale;
		}

		return ret;
	}

	createDuration.fn = Duration.prototype;
	createDuration.invalid = createInvalid$1;

	function parseIso(inp, sign) {
		// We'd normally use ~~inp for this, but unfortunately it also
		// converts floats to ints.
		// inp may be undefined, so careful calling replace on it.
		var res = inp && parseFloat(inp.replace(',', '.'));
		// apply sign while we're at it
		return (isNaN(res) ? 0 : res) * sign;
	}

	function positiveMomentsDifference(base, other) {
		var res = {};

		res.months = other.month() - base.month() +
			(other.year() - base.year()) * 12;
		if (base.clone().add(res.months, 'M').isAfter(other)) {
			--res.months;
		}

		res.milliseconds = +other - +(base.clone().add(res.months, 'M'));

		return res;
	}

	function momentsDifference(base, other) {
		var res;
		if (!(base.isValid() && other.isValid())) {
			return { milliseconds: 0, months: 0 };
		}

		other = cloneWithOffset(other, base);
		if (base.isBefore(other)) {
			res = positiveMomentsDifference(base, other);
		} else {
			res = positiveMomentsDifference(other, base);
			res.milliseconds = -res.milliseconds;
			res.months = -res.months;
		}

		return res;
	}

	// TODO: remove 'name' arg after deprecation is removed
	function createAdder(direction, name) {
		return function (val, period) {
			var dur, tmp;
			//invert the arguments, but complain about it
			if (period !== null && !isNaN(+period)) {
				deprecateSimple(name, 'moment().' + name + '(period, number) is deprecated. Please use moment().' + name + '(number, period). ' +
					'See http://momentjs.com/guides/#/warnings/add-inverted-param/ for more info.');
				tmp = val; val = period; period = tmp;
			}

			val = typeof val === 'string' ? +val : val;
			dur = createDuration(val, period);
			addSubtract(this, dur, direction);
			return this;
		};
	}

	function addSubtract(mom, duration, isAdding, updateOffset) {
		var milliseconds = duration._milliseconds,
			days = absRound(duration._days),
			months = absRound(duration._months);

		if (!mom.isValid()) {
			// No op
			return;
		}

		updateOffset = updateOffset == null ? true : updateOffset;

		if (months) {
			setMonth(mom, get(mom, 'Month') + months * isAdding);
		}
		if (days) {
			set$1(mom, 'Date', get(mom, 'Date') + days * isAdding);
		}
		if (milliseconds) {
			mom._d.setTime(mom._d.valueOf() + milliseconds * isAdding);
		}
		if (updateOffset) {
			hooks.updateOffset(mom, days || months);
		}
	}

	var add = createAdder(1, 'add');
	var subtract = createAdder(-1, 'subtract');

	function getCalendarFormat(myMoment, now) {
		var diff = myMoment.diff(now, 'days', true);
		return diff < -6 ? 'sameElse' :
			diff < -1 ? 'lastWeek' :
				diff < 0 ? 'lastDay' :
					diff < 1 ? 'sameDay' :
						diff < 2 ? 'nextDay' :
							diff < 7 ? 'nextWeek' : 'sameElse';
	}

	function calendar$1(time, formats) {
		// We want to compare the start of today, vs this.
		// Getting start-of-today depends on whether we're local/utc/offset or not.
		var now = time || createLocal(),
			sod = cloneWithOffset(now, this).startOf('day'),
			format = hooks.calendarFormat(this, sod) || 'sameElse';

		var output = formats && (isFunction(formats[format]) ? formats[format].call(this, now) : formats[format]);

		return this.format(output || this.localeData().calendar(format, this, createLocal(now)));
	}

	function clone() {
		return new Moment(this);
	}

	function isAfter(input, units) {
		var localInput = isMoment(input) ? input : createLocal(input);
		if (!(this.isValid() && localInput.isValid())) {
			return false;
		}
		units = normalizeUnits(units) || 'millisecond';
		if (units === 'millisecond') {
			return this.valueOf() > localInput.valueOf();
		} else {
			return localInput.valueOf() < this.clone().startOf(units).valueOf();
		}
	}

	function isBefore(input, units) {
		var localInput = isMoment(input) ? input : createLocal(input);
		if (!(this.isValid() && localInput.isValid())) {
			return false;
		}
		units = normalizeUnits(units) || 'millisecond';
		if (units === 'millisecond') {
			return this.valueOf() < localInput.valueOf();
		} else {
			return this.clone().endOf(units).valueOf() < localInput.valueOf();
		}
	}

	function isBetween(from, to, units, inclusivity) {
		var localFrom = isMoment(from) ? from : createLocal(from),
			localTo = isMoment(to) ? to : createLocal(to);
		if (!(this.isValid() && localFrom.isValid() && localTo.isValid())) {
			return false;
		}
		inclusivity = inclusivity || '()';
		return (inclusivity[0] === '(' ? this.isAfter(localFrom, units) : !this.isBefore(localFrom, units)) &&
			(inclusivity[1] === ')' ? this.isBefore(localTo, units) : !this.isAfter(localTo, units));
	}

	function isSame(input, units) {
		var localInput = isMoment(input) ? input : createLocal(input),
			inputMs;
		if (!(this.isValid() && localInput.isValid())) {
			return false;
		}
		units = normalizeUnits(units) || 'millisecond';
		if (units === 'millisecond') {
			return this.valueOf() === localInput.valueOf();
		} else {
			inputMs = localInput.valueOf();
			return this.clone().startOf(units).valueOf() <= inputMs && inputMs <= this.clone().endOf(units).valueOf();
		}
	}

	function isSameOrAfter(input, units) {
		return this.isSame(input, units) || this.isAfter(input, units);
	}

	function isSameOrBefore(input, units) {
		return this.isSame(input, units) || this.isBefore(input, units);
	}

	function diff(input, units, asFloat) {
		var that,
			zoneDelta,
			output;

		if (!this.isValid()) {
			return NaN;
		}

		that = cloneWithOffset(input, this);

		if (!that.isValid()) {
			return NaN;
		}

		zoneDelta = (that.utcOffset() - this.utcOffset()) * 6e4;

		units = normalizeUnits(units);

		switch (units) {
			case 'year': output = monthDiff(this, that) / 12; break;
			case 'month': output = monthDiff(this, that); break;
			case 'quarter': output = monthDiff(this, that) / 3; break;
			case 'second': output = (this - that) / 1e3; break; // 1000
			case 'minute': output = (this - that) / 6e4; break; // 1000 * 60
			case 'hour': output = (this - that) / 36e5; break; // 1000 * 60 * 60
			case 'day': output = (this - that - zoneDelta) / 864e5; break; // 1000 * 60 * 60 * 24, negate dst
			case 'week': output = (this - that - zoneDelta) / 6048e5; break; // 1000 * 60 * 60 * 24 * 7, negate dst
			default: output = this - that;
		}

		return asFloat ? output : absFloor(output);
	}

	function monthDiff(a, b) {
		// difference in months
		var wholeMonthDiff = ((b.year() - a.year()) * 12) + (b.month() - a.month()),
			// b is in (anchor - 1 month, anchor + 1 month)
			anchor = a.clone().add(wholeMonthDiff, 'months'),
			anchor2, adjust;

		if (b - anchor < 0) {
			anchor2 = a.clone().add(wholeMonthDiff - 1, 'months');
			// linear across the month
			adjust = (b - anchor) / (anchor - anchor2);
		} else {
			anchor2 = a.clone().add(wholeMonthDiff + 1, 'months');
			// linear across the month
			adjust = (b - anchor) / (anchor2 - anchor);
		}

		//check for negative zero, return zero if negative zero
		return -(wholeMonthDiff + adjust) || 0;
	}

	hooks.defaultFormat = 'YYYY-MM-DDTHH:mm:ssZ';
	hooks.defaultFormatUtc = 'YYYY-MM-DDTHH:mm:ss[Z]';

	function toString() {
		return this.clone().locale('en').format('ddd MMM DD YYYY HH:mm:ss [GMT]ZZ');
	}

	function toISOString(keepOffset) {
		if (!this.isValid()) {
			return null;
		}
		var utc = keepOffset !== true;
		var m = utc ? this.clone().utc() : this;
		if (m.year() < 0 || m.year() > 9999) {
			return formatMoment(m, utc ? 'YYYYYY-MM-DD[T]HH:mm:ss.SSS[Z]' : 'YYYYYY-MM-DD[T]HH:mm:ss.SSSZ');
		}
		if (isFunction(Date.prototype.toISOString)) {
			// native implementation is ~50x faster, use it when we can
			if (utc) {
				return this.toDate().toISOString();
			} else {
				return new Date(this.valueOf() + this.utcOffset() * 60 * 1000).toISOString().replace('Z', formatMoment(m, 'Z'));
			}
		}
		return formatMoment(m, utc ? 'YYYY-MM-DD[T]HH:mm:ss.SSS[Z]' : 'YYYY-MM-DD[T]HH:mm:ss.SSSZ');
	}

	/**
	 * Return a human readable representation of a moment that can
	 * also be evaluated to get a new moment which is the same
	 *
	 * @link https://nodejs.org/dist/latest/docs/api/util.html#util_custom_inspect_function_on_objects
	 */
	function inspect() {
		if (!this.isValid()) {
			return 'moment.invalid(/* ' + this._i + ' */)';
		}
		var func = 'moment';
		var zone = '';
		if (!this.isLocal()) {
			func = this.utcOffset() === 0 ? 'moment.utc' : 'moment.parseZone';
			zone = 'Z';
		}
		var prefix = '[' + func + '("]';
		var year = (0 <= this.year() && this.year() <= 9999) ? 'YYYY' : 'YYYYYY';
		var datetime = '-MM-DD[T]HH:mm:ss.SSS';
		var suffix = zone + '[")]';

		return this.format(prefix + year + datetime + suffix);
	}

	function format(inputString) {
		if (!inputString) {
			inputString = this.isUtc() ? hooks.defaultFormatUtc : hooks.defaultFormat;
		}
		var output = formatMoment(this, inputString);
		return this.localeData().postformat(output);
	}

	function from(time, withoutSuffix) {
		if (this.isValid() &&
			((isMoment(time) && time.isValid()) ||
				createLocal(time).isValid())) {
			return createDuration({ to: this, from: time }).locale(this.locale()).humanize(!withoutSuffix);
		} else {
			return this.localeData().invalidDate();
		}
	}

	function fromNow(withoutSuffix) {
		return this.from(createLocal(), withoutSuffix);
	}

	function to(time, withoutSuffix) {
		if (this.isValid() &&
			((isMoment(time) && time.isValid()) ||
				createLocal(time).isValid())) {
			return createDuration({ from: this, to: time }).locale(this.locale()).humanize(!withoutSuffix);
		} else {
			return this.localeData().invalidDate();
		}
	}

	function toNow(withoutSuffix) {
		return this.to(createLocal(), withoutSuffix);
	}

	// If passed a locale key, it will set the locale for this
	// instance.  Otherwise, it will return the locale configuration
	// variables for this instance.
	function locale(key) {
		var newLocaleData;

		if (key === undefined) {
			return this._locale._abbr;
		} else {
			newLocaleData = getLocale(key);
			if (newLocaleData != null) {
				this._locale = newLocaleData;
			}
			return this;
		}
	}

	var lang = deprecate(
		'moment().lang() is deprecated. Instead, use moment().localeData() to get the language configuration. Use moment().locale() to change languages.',
		function (key) {
			if (key === undefined) {
				return this.localeData();
			} else {
				return this.locale(key);
			}
		}
	);

	function localeData() {
		return this._locale;
	}

	var MS_PER_SECOND = 1000;
	var MS_PER_MINUTE = 60 * MS_PER_SECOND;
	var MS_PER_HOUR = 60 * MS_PER_MINUTE;
	var MS_PER_400_YEARS = (365 * 400 + 97) * 24 * MS_PER_HOUR;

	// actual modulo - handles negative numbers (for dates before 1970):
	function mod$1(dividend, divisor) {
		return (dividend % divisor + divisor) % divisor;
	}

	function localStartOfDate(y, m, d) {
		// the date constructor remaps years 0-99 to 1900-1999
		if (y < 100 && y >= 0) {
			// preserve leap years using a full 400 year cycle, then reset
			return new Date(y + 400, m, d) - MS_PER_400_YEARS;
		} else {
			return new Date(y, m, d).valueOf();
		}
	}

	function utcStartOfDate(y, m, d) {
		// Date.UTC remaps years 0-99 to 1900-1999
		if (y < 100 && y >= 0) {
			// preserve leap years using a full 400 year cycle, then reset
			return Date.UTC(y + 400, m, d) - MS_PER_400_YEARS;
		} else {
			return Date.UTC(y, m, d);
		}
	}

	function startOf(units) {
		var time;
		units = normalizeUnits(units);
		if (units === undefined || units === 'millisecond' || !this.isValid()) {
			return this;
		}

		var startOfDate = this._isUTC ? utcStartOfDate : localStartOfDate;

		switch (units) {
			case 'year':
				time = startOfDate(this.year(), 0, 1);
				break;
			case 'quarter':
				time = startOfDate(this.year(), this.month() - this.month() % 3, 1);
				break;
			case 'month':
				time = startOfDate(this.year(), this.month(), 1);
				break;
			case 'week':
				time = startOfDate(this.year(), this.month(), this.date() - this.weekday());
				break;
			case 'isoWeek':
				time = startOfDate(this.year(), this.month(), this.date() - (this.isoWeekday() - 1));
				break;
			case 'day':
			case 'date':
				time = startOfDate(this.year(), this.month(), this.date());
				break;
			case 'hour':
				time = this._d.valueOf();
				time -= mod$1(time + (this._isUTC ? 0 : this.utcOffset() * MS_PER_MINUTE), MS_PER_HOUR);
				break;
			case 'minute':
				time = this._d.valueOf();
				time -= mod$1(time, MS_PER_MINUTE);
				break;
			case 'second':
				time = this._d.valueOf();
				time -= mod$1(time, MS_PER_SECOND);
				break;
		}

		this._d.setTime(time);
		hooks.updateOffset(this, true);
		return this;
	}

	function endOf(units) {
		var time;
		units = normalizeUnits(units);
		if (units === undefined || units === 'millisecond' || !this.isValid()) {
			return this;
		}

		var startOfDate = this._isUTC ? utcStartOfDate : localStartOfDate;

		switch (units) {
			case 'year':
				time = startOfDate(this.year() + 1, 0, 1) - 1;
				break;
			case 'quarter':
				time = startOfDate(this.year(), this.month() - this.month() % 3 + 3, 1) - 1;
				break;
			case 'month':
				time = startOfDate(this.year(), this.month() + 1, 1) - 1;
				break;
			case 'week':
				time = startOfDate(this.year(), this.month(), this.date() - this.weekday() + 7) - 1;
				break;
			case 'isoWeek':
				time = startOfDate(this.year(), this.month(), this.date() - (this.isoWeekday() - 1) + 7) - 1;
				break;
			case 'day':
			case 'date':
				time = startOfDate(this.year(), this.month(), this.date() + 1) - 1;
				break;
			case 'hour':
				time = this._d.valueOf();
				time += MS_PER_HOUR - mod$1(time + (this._isUTC ? 0 : this.utcOffset() * MS_PER_MINUTE), MS_PER_HOUR) - 1;
				break;
			case 'minute':
				time = this._d.valueOf();
				time += MS_PER_MINUTE - mod$1(time, MS_PER_MINUTE) - 1;
				break;
			case 'second':
				time = this._d.valueOf();
				time += MS_PER_SECOND - mod$1(time, MS_PER_SECOND) - 1;
				break;
		}

		this._d.setTime(time);
		hooks.updateOffset(this, true);
		return this;
	}

	function valueOf() {
		return this._d.valueOf() - ((this._offset || 0) * 60000);
	}

	function unix() {
		return Math.floor(this.valueOf() / 1000);
	}

	function toDate() {
		return new Date(this.valueOf());
	}

	function toArray() {
		var m = this;
		return [m.year(), m.month(), m.date(), m.hour(), m.minute(), m.second(), m.millisecond()];
	}

	function toObject() {
		var m = this;
		return {
			years: m.year(),
			months: m.month(),
			date: m.date(),
			hours: m.hours(),
			minutes: m.minutes(),
			seconds: m.seconds(),
			milliseconds: m.milliseconds()
		};
	}

	function toJSON() {
		// new Date(NaN).toJSON() === null
		return this.isValid() ? this.toISOString() : null;
	}

	function isValid$2() {
		return isValid(this);
	}

	function parsingFlags() {
		return extend({}, getParsingFlags(this));
	}

	function invalidAt() {
		return getParsingFlags(this).overflow;
	}

	function creationData() {
		return {
			input: this._i,
			format: this._f,
			locale: this._locale,
			isUTC: this._isUTC,
			strict: this._strict
		};
	}

	// FORMATTING

	addFormatToken(0, ['gg', 2], 0, function () {
		return this.weekYear() % 100;
	});

	addFormatToken(0, ['GG', 2], 0, function () {
		return this.isoWeekYear() % 100;
	});

	function addWeekYearFormatToken(token, getter) {
		addFormatToken(0, [token, token.length], 0, getter);
	}

	addWeekYearFormatToken('gggg', 'weekYear');
	addWeekYearFormatToken('ggggg', 'weekYear');
	addWeekYearFormatToken('GGGG', 'isoWeekYear');
	addWeekYearFormatToken('GGGGG', 'isoWeekYear');

	// ALIASES

	addUnitAlias('weekYear', 'gg');
	addUnitAlias('isoWeekYear', 'GG');

	// PRIORITY

	addUnitPriority('weekYear', 1);
	addUnitPriority('isoWeekYear', 1);


	// PARSING

	addRegexToken('G', matchSigned);
	addRegexToken('g', matchSigned);
	addRegexToken('GG', match1to2, match2);
	addRegexToken('gg', match1to2, match2);
	addRegexToken('GGGG', match1to4, match4);
	addRegexToken('gggg', match1to4, match4);
	addRegexToken('GGGGG', match1to6, match6);
	addRegexToken('ggggg', match1to6, match6);

	addWeekParseToken(['gggg', 'ggggg', 'GGGG', 'GGGGG'], function (input, week, config, token) {
		week[token.substr(0, 2)] = toInt(input);
	});

	addWeekParseToken(['gg', 'GG'], function (input, week, config, token) {
		week[token] = hooks.parseTwoDigitYear(input);
	});

	// MOMENTS

	function getSetWeekYear(input) {
		return getSetWeekYearHelper.call(this,
			input,
			this.week(),
			this.weekday(),
			this.localeData()._week.dow,
			this.localeData()._week.doy);
	}

	function getSetISOWeekYear(input) {
		return getSetWeekYearHelper.call(this,
			input, this.isoWeek(), this.isoWeekday(), 1, 4);
	}

	function getISOWeeksInYear() {
		return weeksInYear(this.year(), 1, 4);
	}

	function getWeeksInYear() {
		var weekInfo = this.localeData()._week;
		return weeksInYear(this.year(), weekInfo.dow, weekInfo.doy);
	}

	function getSetWeekYearHelper(input, week, weekday, dow, doy) {
		var weeksTarget;
		if (input == null) {
			return weekOfYear(this, dow, doy).year;
		} else {
			weeksTarget = weeksInYear(input, dow, doy);
			if (week > weeksTarget) {
				week = weeksTarget;
			}
			return setWeekAll.call(this, input, week, weekday, dow, doy);
		}
	}

	function setWeekAll(weekYear, week, weekday, dow, doy) {
		var dayOfYearData = dayOfYearFromWeeks(weekYear, week, weekday, dow, doy),
			date = createUTCDate(dayOfYearData.year, 0, dayOfYearData.dayOfYear);

		this.year(date.getUTCFullYear());
		this.month(date.getUTCMonth());
		this.date(date.getUTCDate());
		return this;
	}

	// FORMATTING

	addFormatToken('Q', 0, 'Qo', 'quarter');

	// ALIASES

	addUnitAlias('quarter', 'Q');

	// PRIORITY

	addUnitPriority('quarter', 7);

	// PARSING

	addRegexToken('Q', match1);
	addParseToken('Q', function (input, array) {
		array[MONTH] = (toInt(input) - 1) * 3;
	});

	// MOMENTS

	function getSetQuarter(input) {
		return input == null ? Math.ceil((this.month() + 1) / 3) : this.month((input - 1) * 3 + this.month() % 3);
	}

	// FORMATTING

	addFormatToken('D', ['DD', 2], 'Do', 'date');

	// ALIASES

	addUnitAlias('date', 'D');

	// PRIORITY
	addUnitPriority('date', 9);

	// PARSING

	addRegexToken('D', match1to2);
	addRegexToken('DD', match1to2, match2);
	addRegexToken('Do', function (isStrict, locale) {
		// TODO: Remove "ordinalParse" fallback in next major release.
		return isStrict ?
			(locale._dayOfMonthOrdinalParse || locale._ordinalParse) :
			locale._dayOfMonthOrdinalParseLenient;
	});

	addParseToken(['D', 'DD'], DATE);
	addParseToken('Do', function (input, array) {
		array[DATE] = toInt(input.match(match1to2)[0]);
	});

	// MOMENTS

	var getSetDayOfMonth = makeGetSet('Date', true);

	// FORMATTING

	addFormatToken('DDD', ['DDDD', 3], 'DDDo', 'dayOfYear');

	// ALIASES

	addUnitAlias('dayOfYear', 'DDD');

	// PRIORITY
	addUnitPriority('dayOfYear', 4);

	// PARSING

	addRegexToken('DDD', match1to3);
	addRegexToken('DDDD', match3);
	addParseToken(['DDD', 'DDDD'], function (input, array, config) {
		config._dayOfYear = toInt(input);
	});

	// HELPERS

	// MOMENTS

	function getSetDayOfYear(input) {
		var dayOfYear = Math.round((this.clone().startOf('day') - this.clone().startOf('year')) / 864e5) + 1;
		return input == null ? dayOfYear : this.add((input - dayOfYear), 'd');
	}

	// FORMATTING

	addFormatToken('m', ['mm', 2], 0, 'minute');

	// ALIASES

	addUnitAlias('minute', 'm');

	// PRIORITY

	addUnitPriority('minute', 14);

	// PARSING

	addRegexToken('m', match1to2);
	addRegexToken('mm', match1to2, match2);
	addParseToken(['m', 'mm'], MINUTE);

	// MOMENTS

	var getSetMinute = makeGetSet('Minutes', false);

	// FORMATTING

	addFormatToken('s', ['ss', 2], 0, 'second');

	// ALIASES

	addUnitAlias('second', 's');

	// PRIORITY

	addUnitPriority('second', 15);

	// PARSING

	addRegexToken('s', match1to2);
	addRegexToken('ss', match1to2, match2);
	addParseToken(['s', 'ss'], SECOND);

	// MOMENTS

	var getSetSecond = makeGetSet('Seconds', false);

	// FORMATTING

	addFormatToken('S', 0, 0, function () {
		return ~~(this.millisecond() / 100);
	});

	addFormatToken(0, ['SS', 2], 0, function () {
		return ~~(this.millisecond() / 10);
	});

	addFormatToken(0, ['SSS', 3], 0, 'millisecond');
	addFormatToken(0, ['SSSS', 4], 0, function () {
		return this.millisecond() * 10;
	});
	addFormatToken(0, ['SSSSS', 5], 0, function () {
		return this.millisecond() * 100;
	});
	addFormatToken(0, ['SSSSSS', 6], 0, function () {
		return this.millisecond() * 1000;
	});
	addFormatToken(0, ['SSSSSSS', 7], 0, function () {
		return this.millisecond() * 10000;
	});
	addFormatToken(0, ['SSSSSSSS', 8], 0, function () {
		return this.millisecond() * 100000;
	});
	addFormatToken(0, ['SSSSSSSSS', 9], 0, function () {
		return this.millisecond() * 1000000;
	});


	// ALIASES

	addUnitAlias('millisecond', 'ms');

	// PRIORITY

	addUnitPriority('millisecond', 16);

	// PARSING

	addRegexToken('S', match1to3, match1);
	addRegexToken('SS', match1to3, match2);
	addRegexToken('SSS', match1to3, match3);

	var token;
	for (token = 'SSSS'; token.length <= 9; token += 'S') {
		addRegexToken(token, matchUnsigned);
	}

	function parseMs(input, array) {
		array[MILLISECOND] = toInt(('0.' + input) * 1000);
	}

	for (token = 'S'; token.length <= 9; token += 'S') {
		addParseToken(token, parseMs);
	}
	// MOMENTS

	var getSetMillisecond = makeGetSet('Milliseconds', false);

	// FORMATTING

	addFormatToken('z', 0, 0, 'zoneAbbr');
	addFormatToken('zz', 0, 0, 'zoneName');

	// MOMENTS

	function getZoneAbbr() {
		return this._isUTC ? 'UTC' : '';
	}

	function getZoneName() {
		return this._isUTC ? 'Coordinated Universal Time' : '';
	}

	var proto = Moment.prototype;

	proto.add = add;
	proto.calendar = calendar$1;
	proto.clone = clone;
	proto.diff = diff;
	proto.endOf = endOf;
	proto.format = format;
	proto.from = from;
	proto.fromNow = fromNow;
	proto.to = to;
	proto.toNow = toNow;
	proto.get = stringGet;
	proto.invalidAt = invalidAt;
	proto.isAfter = isAfter;
	proto.isBefore = isBefore;
	proto.isBetween = isBetween;
	proto.isSame = isSame;
	proto.isSameOrAfter = isSameOrAfter;
	proto.isSameOrBefore = isSameOrBefore;
	proto.isValid = isValid$2;
	proto.lang = lang;
	proto.locale = locale;
	proto.localeData = localeData;
	proto.max = prototypeMax;
	proto.min = prototypeMin;
	proto.parsingFlags = parsingFlags;
	proto.set = stringSet;
	proto.startOf = startOf;
	proto.subtract = subtract;
	proto.toArray = toArray;
	proto.toObject = toObject;
	proto.toDate = toDate;
	proto.toISOString = toISOString;
	proto.inspect = inspect;
	proto.toJSON = toJSON;
	proto.toString = toString;
	proto.unix = unix;
	proto.valueOf = valueOf;
	proto.creationData = creationData;
	proto.year = getSetYear;
	proto.isLeapYear = getIsLeapYear;
	proto.weekYear = getSetWeekYear;
	proto.isoWeekYear = getSetISOWeekYear;
	proto.quarter = proto.quarters = getSetQuarter;
	proto.month = getSetMonth;
	proto.daysInMonth = getDaysInMonth;
	proto.week = proto.weeks = getSetWeek;
	proto.isoWeek = proto.isoWeeks = getSetISOWeek;
	proto.weeksInYear = getWeeksInYear;
	proto.isoWeeksInYear = getISOWeeksInYear;
	proto.date = getSetDayOfMonth;
	proto.day = proto.days = getSetDayOfWeek;
	proto.weekday = getSetLocaleDayOfWeek;
	proto.isoWeekday = getSetISODayOfWeek;
	proto.dayOfYear = getSetDayOfYear;
	proto.hour = proto.hours = getSetHour;
	proto.minute = proto.minutes = getSetMinute;
	proto.second = proto.seconds = getSetSecond;
	proto.millisecond = proto.milliseconds = getSetMillisecond;
	proto.utcOffset = getSetOffset;
	proto.utc = setOffsetToUTC;
	proto.local = setOffsetToLocal;
	proto.parseZone = setOffsetToParsedOffset;
	proto.hasAlignedHourOffset = hasAlignedHourOffset;
	proto.isDST = isDaylightSavingTime;
	proto.isLocal = isLocal;
	proto.isUtcOffset = isUtcOffset;
	proto.isUtc = isUtc;
	proto.isUTC = isUtc;
	proto.zoneAbbr = getZoneAbbr;
	proto.zoneName = getZoneName;
	proto.dates = deprecate('dates accessor is deprecated. Use date instead.', getSetDayOfMonth);
	proto.months = deprecate('months accessor is deprecated. Use month instead', getSetMonth);
	proto.years = deprecate('years accessor is deprecated. Use year instead', getSetYear);
	proto.zone = deprecate('moment().zone is deprecated, use moment().utcOffset instead. http://momentjs.com/guides/#/warnings/zone/', getSetZone);
	proto.isDSTShifted = deprecate('isDSTShifted is deprecated. See http://momentjs.com/guides/#/warnings/dst-shifted/ for more information', isDaylightSavingTimeShifted);

	function createUnix(input) {
		return createLocal(input * 1000);
	}

	function createInZone() {
		return createLocal.apply(null, arguments).parseZone();
	}

	function preParsePostFormat(string) {
		return string;
	}

	var proto$1 = Locale.prototype;

	proto$1.calendar = calendar;
	proto$1.longDateFormat = longDateFormat;
	proto$1.invalidDate = invalidDate;
	proto$1.ordinal = ordinal;
	proto$1.preparse = preParsePostFormat;
	proto$1.postformat = preParsePostFormat;
	proto$1.relativeTime = relativeTime;
	proto$1.pastFuture = pastFuture;
	proto$1.set = set;

	proto$1.months = localeMonths;
	proto$1.monthsShort = localeMonthsShort;
	proto$1.monthsParse = localeMonthsParse;
	proto$1.monthsRegex = monthsRegex;
	proto$1.monthsShortRegex = monthsShortRegex;
	proto$1.week = localeWeek;
	proto$1.firstDayOfYear = localeFirstDayOfYear;
	proto$1.firstDayOfWeek = localeFirstDayOfWeek;

	proto$1.weekdays = localeWeekdays;
	proto$1.weekdaysMin = localeWeekdaysMin;
	proto$1.weekdaysShort = localeWeekdaysShort;
	proto$1.weekdaysParse = localeWeekdaysParse;

	proto$1.weekdaysRegex = weekdaysRegex;
	proto$1.weekdaysShortRegex = weekdaysShortRegex;
	proto$1.weekdaysMinRegex = weekdaysMinRegex;

	proto$1.isPM = localeIsPM;
	proto$1.meridiem = localeMeridiem;

	function get$1(format, index, field, setter) {
		var locale = getLocale();
		var utc = createUTC().set(setter, index);
		return locale[field](utc, format);
	}

	function listMonthsImpl(format, index, field) {
		if (isNumber(format)) {
			index = format;
			format = undefined;
		}

		format = format || '';

		if (index != null) {
			return get$1(format, index, field, 'month');
		}

		var i;
		var out = [];
		for (i = 0; i < 12; i++) {
			out[i] = get$1(format, i, field, 'month');
		}
		return out;
	}

	// ()
	// (5)
	// (fmt, 5)
	// (fmt)
	// (true)
	// (true, 5)
	// (true, fmt, 5)
	// (true, fmt)
	function listWeekdaysImpl(localeSorted, format, index, field) {
		if (typeof localeSorted === 'boolean') {
			if (isNumber(format)) {
				index = format;
				format = undefined;
			}

			format = format || '';
		} else {
			format = localeSorted;
			index = format;
			localeSorted = false;

			if (isNumber(format)) {
				index = format;
				format = undefined;
			}

			format = format || '';
		}

		var locale = getLocale(),
			shift = localeSorted ? locale._week.dow : 0;

		if (index != null) {
			return get$1(format, (index + shift) % 7, field, 'day');
		}

		var i;
		var out = [];
		for (i = 0; i < 7; i++) {
			out[i] = get$1(format, (i + shift) % 7, field, 'day');
		}
		return out;
	}

	function listMonths(format, index) {
		return listMonthsImpl(format, index, 'months');
	}

	function listMonthsShort(format, index) {
		return listMonthsImpl(format, index, 'monthsShort');
	}

	function listWeekdays(localeSorted, format, index) {
		return listWeekdaysImpl(localeSorted, format, index, 'weekdays');
	}

	function listWeekdaysShort(localeSorted, format, index) {
		return listWeekdaysImpl(localeSorted, format, index, 'weekdaysShort');
	}

	function listWeekdaysMin(localeSorted, format, index) {
		return listWeekdaysImpl(localeSorted, format, index, 'weekdaysMin');
	}

	getSetGlobalLocale('en', {
		dayOfMonthOrdinalParse: /\d{1,2}(th|st|nd|rd)/,
		ordinal: function (number) {
			var b = number % 10,
				output = (toInt(number % 100 / 10) === 1) ? 'th' :
					(b === 1) ? 'st' :
						(b === 2) ? 'nd' :
							(b === 3) ? 'rd' : 'th';
			return number + output;
		}
	});

	// Side effect imports

	hooks.lang = deprecate('moment.lang is deprecated. Use moment.locale instead.', getSetGlobalLocale);
	hooks.langData = deprecate('moment.langData is deprecated. Use moment.localeData instead.', getLocale);

	var mathAbs = Math.abs;

	function abs() {
		var data = this._data;

		this._milliseconds = mathAbs(this._milliseconds);
		this._days = mathAbs(this._days);
		this._months = mathAbs(this._months);

		data.milliseconds = mathAbs(data.milliseconds);
		data.seconds = mathAbs(data.seconds);
		data.minutes = mathAbs(data.minutes);
		data.hours = mathAbs(data.hours);
		data.months = mathAbs(data.months);
		data.years = mathAbs(data.years);

		return this;
	}

	function addSubtract$1(duration, input, value, direction) {
		var other = createDuration(input, value);

		duration._milliseconds += direction * other._milliseconds;
		duration._days += direction * other._days;
		duration._months += direction * other._months;

		return duration._bubble();
	}

	// supports only 2.0-style add(1, 's') or add(duration)
	function add$1(input, value) {
		return addSubtract$1(this, input, value, 1);
	}

	// supports only 2.0-style subtract(1, 's') or subtract(duration)
	function subtract$1(input, value) {
		return addSubtract$1(this, input, value, -1);
	}

	function absCeil(number) {
		if (number < 0) {
			return Math.floor(number);
		} else {
			return Math.ceil(number);
		}
	}

	function bubble() {
		var milliseconds = this._milliseconds;
		var days = this._days;
		var months = this._months;
		var data = this._data;
		var seconds, minutes, hours, years, monthsFromDays;

		// if we have a mix of positive and negative values, bubble down first
		// check: https://github.com/moment/moment/issues/2166
		if (!((milliseconds >= 0 && days >= 0 && months >= 0) ||
			(milliseconds <= 0 && days <= 0 && months <= 0))) {
			milliseconds += absCeil(monthsToDays(months) + days) * 864e5;
			days = 0;
			months = 0;
		}

		// The following code bubbles up values, see the tests for
		// examples of what that means.
		data.milliseconds = milliseconds % 1000;

		seconds = absFloor(milliseconds / 1000);
		data.seconds = seconds % 60;

		minutes = absFloor(seconds / 60);
		data.minutes = minutes % 60;

		hours = absFloor(minutes / 60);
		data.hours = hours % 24;

		days += absFloor(hours / 24);

		// convert days to months
		monthsFromDays = absFloor(daysToMonths(days));
		months += monthsFromDays;
		days -= absCeil(monthsToDays(monthsFromDays));

		// 12 months -> 1 year
		years = absFloor(months / 12);
		months %= 12;

		data.days = days;
		data.months = months;
		data.years = years;

		return this;
	}

	function daysToMonths(days) {
		// 400 years have 146097 days (taking into account leap year rules)
		// 400 years have 12 months === 4800
		return days * 4800 / 146097;
	}

	function monthsToDays(months) {
		// the reverse of daysToMonths
		return months * 146097 / 4800;
	}

	function as(units) {
		if (!this.isValid()) {
			return NaN;
		}
		var days;
		var months;
		var milliseconds = this._milliseconds;

		units = normalizeUnits(units);

		if (units === 'month' || units === 'quarter' || units === 'year') {
			days = this._days + milliseconds / 864e5;
			months = this._months + daysToMonths(days);
			switch (units) {
				case 'month': return months;
				case 'quarter': return months / 3;
				case 'year': return months / 12;
			}
		} else {
			// handle milliseconds separately because of floating point math errors (issue #1867)
			days = this._days + Math.round(monthsToDays(this._months));
			switch (units) {
				case 'week': return days / 7 + milliseconds / 6048e5;
				case 'day': return days + milliseconds / 864e5;
				case 'hour': return days * 24 + milliseconds / 36e5;
				case 'minute': return days * 1440 + milliseconds / 6e4;
				case 'second': return days * 86400 + milliseconds / 1000;
				// Math.floor prevents floating point math errors here
				case 'millisecond': return Math.floor(days * 864e5) + milliseconds;
				default: throw new Error('Unknown unit ' + units);
			}
		}
	}

	// TODO: Use this.as('ms')?
	function valueOf$1() {
		if (!this.isValid()) {
			return NaN;
		}
		return (
			this._milliseconds +
			this._days * 864e5 +
			(this._months % 12) * 2592e6 +
			toInt(this._months / 12) * 31536e6
		);
	}

	function makeAs(alias) {
		return function () {
			return this.as(alias);
		};
	}

	var asMilliseconds = makeAs('ms');
	var asSeconds = makeAs('s');
	var asMinutes = makeAs('m');
	var asHours = makeAs('h');
	var asDays = makeAs('d');
	var asWeeks = makeAs('w');
	var asMonths = makeAs('M');
	var asQuarters = makeAs('Q');
	var asYears = makeAs('y');

	function clone$1() {
		return createDuration(this);
	}

	function get$2(units) {
		units = normalizeUnits(units);
		return this.isValid() ? this[units + 's']() : NaN;
	}

	function makeGetter(name) {
		return function () {
			return this.isValid() ? this._data[name] : NaN;
		};
	}

	var milliseconds = makeGetter('milliseconds');
	var seconds = makeGetter('seconds');
	var minutes = makeGetter('minutes');
	var hours = makeGetter('hours');
	var days = makeGetter('days');
	var months = makeGetter('months');
	var years = makeGetter('years');

	function weeks() {
		return absFloor(this.days() / 7);
	}

	var round = Math.round;
	var thresholds = {
		ss: 44,         // a few seconds to seconds
		s: 45,         // seconds to minute
		m: 45,         // minutes to hour
		h: 22,         // hours to day
		d: 26,         // days to month
		M: 11          // months to year
	};

	// helper function for moment.fn.from, moment.fn.fromNow, and moment.duration.fn.humanize
	function substituteTimeAgo(string, number, withoutSuffix, isFuture, locale) {
		return locale.relativeTime(number || 1, !!withoutSuffix, string, isFuture);
	}

	function relativeTime$1(posNegDuration, withoutSuffix, locale) {
		var duration = createDuration(posNegDuration).abs();
		var seconds = round(duration.as('s'));
		var minutes = round(duration.as('m'));
		var hours = round(duration.as('h'));
		var days = round(duration.as('d'));
		var months = round(duration.as('M'));
		var years = round(duration.as('y'));

		var a = seconds <= thresholds.ss && ['s', seconds] ||
			seconds < thresholds.s && ['ss', seconds] ||
			minutes <= 1 && ['m'] ||
			minutes < thresholds.m && ['mm', minutes] ||
			hours <= 1 && ['h'] ||
			hours < thresholds.h && ['hh', hours] ||
			days <= 1 && ['d'] ||
			days < thresholds.d && ['dd', days] ||
			months <= 1 && ['M'] ||
			months < thresholds.M && ['MM', months] ||
			years <= 1 && ['y'] || ['yy', years];

		a[2] = withoutSuffix;
		a[3] = +posNegDuration > 0;
		a[4] = locale;
		return substituteTimeAgo.apply(null, a);
	}

	// This function allows you to set the rounding function for relative time strings
	function getSetRelativeTimeRounding(roundingFunction) {
		if (roundingFunction === undefined) {
			return round;
		}
		if (typeof (roundingFunction) === 'function') {
			round = roundingFunction;
			return true;
		}
		return false;
	}

	// This function allows you to set a threshold for relative time strings
	function getSetRelativeTimeThreshold(threshold, limit) {
		if (thresholds[threshold] === undefined) {
			return false;
		}
		if (limit === undefined) {
			return thresholds[threshold];
		}
		thresholds[threshold] = limit;
		if (threshold === 's') {
			thresholds.ss = limit - 1;
		}
		return true;
	}

	function humanize(withSuffix) {
		if (!this.isValid()) {
			return this.localeData().invalidDate();
		}

		var locale = this.localeData();
		var output = relativeTime$1(this, !withSuffix, locale);

		if (withSuffix) {
			output = locale.pastFuture(+this, output);
		}

		return locale.postformat(output);
	}

	var abs$1 = Math.abs;

	function sign(x) {
		return ((x > 0) - (x < 0)) || +x;
	}

	function toISOString$1() {
		// for ISO strings we do not use the normal bubbling rules:
		//  * milliseconds bubble up until they become hours
		//  * days do not bubble at all
		//  * months bubble up until they become years
		// This is because there is no context-free conversion between hours and days
		// (think of clock changes)
		// and also not between days and months (28-31 days per month)
		if (!this.isValid()) {
			return this.localeData().invalidDate();
		}

		var seconds = abs$1(this._milliseconds) / 1000;
		var days = abs$1(this._days);
		var months = abs$1(this._months);
		var minutes, hours, years;

		// 3600 seconds -> 60 minutes -> 1 hour
		minutes = absFloor(seconds / 60);
		hours = absFloor(minutes / 60);
		seconds %= 60;
		minutes %= 60;

		// 12 months -> 1 year
		years = absFloor(months / 12);
		months %= 12;


		// inspired by https://github.com/dordille/moment-isoduration/blob/master/moment.isoduration.js
		var Y = years;
		var M = months;
		var D = days;
		var h = hours;
		var m = minutes;
		var s = seconds ? seconds.toFixed(3).replace(/\.?0+$/, '') : '';
		var total = this.asSeconds();

		if (!total) {
			// this is the same as C#'s (Noda) and python (isodate)...
			// but not other JS (goog.date)
			return 'P0D';
		}

		var totalSign = total < 0 ? '-' : '';
		var ymSign = sign(this._months) !== sign(total) ? '-' : '';
		var daysSign = sign(this._days) !== sign(total) ? '-' : '';
		var hmsSign = sign(this._milliseconds) !== sign(total) ? '-' : '';

		return totalSign + 'P' +
			(Y ? ymSign + Y + 'Y' : '') +
			(M ? ymSign + M + 'M' : '') +
			(D ? daysSign + D + 'D' : '') +
			((h || m || s) ? 'T' : '') +
			(h ? hmsSign + h + 'H' : '') +
			(m ? hmsSign + m + 'M' : '') +
			(s ? hmsSign + s + 'S' : '');
	}

	var proto$2 = Duration.prototype;

	proto$2.isValid = isValid$1;
	proto$2.abs = abs;
	proto$2.add = add$1;
	proto$2.subtract = subtract$1;
	proto$2.as = as;
	proto$2.asMilliseconds = asMilliseconds;
	proto$2.asSeconds = asSeconds;
	proto$2.asMinutes = asMinutes;
	proto$2.asHours = asHours;
	proto$2.asDays = asDays;
	proto$2.asWeeks = asWeeks;
	proto$2.asMonths = asMonths;
	proto$2.asQuarters = asQuarters;
	proto$2.asYears = asYears;
	proto$2.valueOf = valueOf$1;
	proto$2._bubble = bubble;
	proto$2.clone = clone$1;
	proto$2.get = get$2;
	proto$2.milliseconds = milliseconds;
	proto$2.seconds = seconds;
	proto$2.minutes = minutes;
	proto$2.hours = hours;
	proto$2.days = days;
	proto$2.weeks = weeks;
	proto$2.months = months;
	proto$2.years = years;
	proto$2.humanize = humanize;
	proto$2.toISOString = toISOString$1;
	proto$2.toString = toISOString$1;
	proto$2.toJSON = toISOString$1;
	proto$2.locale = locale;
	proto$2.localeData = localeData;

	proto$2.toIsoString = deprecate('toIsoString() is deprecated. Please use toISOString() instead (notice the capitals)', toISOString$1);
	proto$2.lang = lang;

	// Side effect imports

	// FORMATTING

	addFormatToken('X', 0, 0, 'unix');
	addFormatToken('x', 0, 0, 'valueOf');

	// PARSING

	addRegexToken('x', matchSigned);
	addRegexToken('X', matchTimestamp);
	addParseToken('X', function (input, array, config) {
		config._d = new Date(parseFloat(input, 10) * 1000);
	});
	addParseToken('x', function (input, array, config) {
		config._d = new Date(toInt(input));
	});

	// Side effect imports


	hooks.version = '2.24.0';

	setHookCallback(createLocal);

	hooks.fn = proto;
	hooks.min = min;
	hooks.max = max;
	hooks.now = now;
	hooks.utc = createUTC;
	hooks.unix = createUnix;
	hooks.months = listMonths;
	hooks.isDate = isDate;
	hooks.locale = getSetGlobalLocale;
	hooks.invalid = createInvalid;
	hooks.duration = createDuration;
	hooks.isMoment = isMoment;
	hooks.weekdays = listWeekdays;
	hooks.parseZone = createInZone;
	hooks.localeData = getLocale;
	hooks.isDuration = isDuration;
	hooks.monthsShort = listMonthsShort;
	hooks.weekdaysMin = listWeekdaysMin;
	hooks.defineLocale = defineLocale;
	hooks.updateLocale = updateLocale;
	hooks.locales = listLocales;
	hooks.weekdaysShort = listWeekdaysShort;
	hooks.normalizeUnits = normalizeUnits;
	hooks.relativeTimeRounding = getSetRelativeTimeRounding;
	hooks.relativeTimeThreshold = getSetRelativeTimeThreshold;
	hooks.calendarFormat = getCalendarFormat;
	hooks.prototype = proto;

	// currently HTML5 input type only supports 24-hour formats
	hooks.HTML5_FMT = {
		DATETIME_LOCAL: 'YYYY-MM-DDTHH:mm',             // <input type="datetime-local" />
		DATETIME_LOCAL_SECONDS: 'YYYY-MM-DDTHH:mm:ss',  // <input type="datetime-local" step="1" />
		DATETIME_LOCAL_MS: 'YYYY-MM-DDTHH:mm:ss.SSS',   // <input type="datetime-local" step="0.001" />
		DATE: 'YYYY-MM-DD',                             // <input type="date" />
		TIME: 'HH:mm',                                  // <input type="time" />
		TIME_SECONDS: 'HH:mm:ss',                       // <input type="time" step="1" />
		TIME_MS: 'HH:mm:ss.SSS',                        // <input type="time" step="0.001" />
		WEEK: 'GGGG-[W]WW',                             // <input type="week" />
		MONTH: 'YYYY-MM'                                // <input type="month" />
	};

	return hooks;

})));

/*!
 * mustache.js - Logic-less {{mustache}} templates with JavaScript
 * http://github.com/janl/mustache.js
 */

/*global define: false Mustache: true*/

(function defineMustache(global, factory) {
	if (typeof exports === 'object' && exports && typeof exports.nodeName !== 'string') {
		factory(exports); // CommonJS
	} else if (typeof define === 'function' && define.amd) {
		define(['exports'], factory); // AMD
	} else {
		global.Mustache = {};
		factory(global.Mustache); // script, wsh, asp
	}
}(this, function mustacheFactory(mustache) {

	var objectToString = Object.prototype.toString;
	var isArray = Array.isArray || function isArrayPolyfill(object) {
		return objectToString.call(object) === '[object Array]';
	};

	function isFunction(object) {
		return typeof object === 'function';
	}

	/**
	 * More correct typeof string handling array
	 * which normally returns typeof 'object'
	 */
	function typeStr(obj) {
		return isArray(obj) ? 'array' : typeof obj;
	}

	function escapeRegExp(string) {
		return string.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, '\\$&');
	}

	/**
	 * Null safe way of checking whether or not an object,
	 * including its prototype, has a given property
	 */
	function hasProperty(obj, propName) {
		return obj != null && typeof obj === 'object' && (propName in obj);
	}

	// Workaround for https://issues.apache.org/jira/browse/COUCHDB-577
	// See https://github.com/janl/mustache.js/issues/189
	var regExpTest = RegExp.prototype.test;

	function testRegExp(re, string) {
		return regExpTest.call(re, string);
	}

	var nonSpaceRe = /\S/;

	function isWhitespace(string) {
		return !testRegExp(nonSpaceRe, string);
	}

	var entityMap = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#39;',
		'/': '&#x2F;',
		'`': '&#x60;',
		'=': '&#x3D;'
	};

	function escapeHtml(string) {
		return String(string).replace(/[&<>"'`=\/]/g, function fromEntityMap(s) {
			return entityMap[s];
		});
	}

	var whiteRe = /\s*/;
	var spaceRe = /\s+/;
	var equalsRe = /\s*=/;
	var curlyRe = /\s*\}/;
	var tagRe = /#|\^|\/|>|\{|&|=|!/;

	/**
	 * Breaks up the given `template` string into a tree of tokens. If the `tags`
	 * argument is given here it must be an array with two string values: the
	 * opening and closing tags used in the template (e.g. [ "<%", "%>" ]). Of
	 * course, the default is to use mustaches (i.e. mustache.tags).
	 *
	 * A token is an array with at least 4 elements. The first element is the
	 * mustache symbol that was used inside the tag, e.g. "#" or "&". If the tag
	 * did not contain a symbol (i.e. {{myValue}}) this element is "name". For
	 * all text that appears outside a symbol this element is "text".
	 *
	 * The second element of a token is its "value". For mustache tags this is
	 * whatever else was inside the tag besides the opening symbol. For text tokens
	 * this is the text itself.
	 *
	 * The third and fourth elements of the token are the start and end indices,
	 * respectively, of the token in the original template.
	 *
	 * Tokens that are the root node of a subtree contain two more elements: 1) an
	 * array of tokens in the subtree and 2) the index in the original template at
	 * which the closing tag for that section begins.
	 */
	function parseTemplate(template, tags) {
		if (!template)
			return [];

		var sections = []; // Stack to hold section tokens
		var tokens = []; // Buffer to hold the tokens
		var spaces = []; // Indices of whitespace tokens on the current line
		var hasTag = false; // Is there a {{tag}} on the current line?
		var nonSpace = false; // Is there a non-space char on the current line?

		// Strips all whitespace tokens array for the current line
		// if there was a {{#tag}} on it and otherwise only space.
		function stripSpace() {
			if (hasTag && !nonSpace) {
				while (spaces.length)
					delete tokens[spaces.pop()];
			} else {
				spaces = [];
			}

			hasTag = false;
			nonSpace = false;
		}

		var openingTagRe, closingTagRe, closingCurlyRe;

		function compileTags(tagsToCompile) {
			if (typeof tagsToCompile === 'string')
				tagsToCompile = tagsToCompile.split(spaceRe, 2);

			if (!isArray(tagsToCompile) || tagsToCompile.length !== 2)
				throw new Error('Invalid tags: ' + tagsToCompile);

			openingTagRe = new RegExp(escapeRegExp(tagsToCompile[0]) + '\\s*');
			closingTagRe = new RegExp('\\s*' + escapeRegExp(tagsToCompile[1]));
			closingCurlyRe = new RegExp('\\s*' + escapeRegExp('}' + tagsToCompile[1]));
		}

		compileTags(tags || mustache.tags);

		var scanner = new Scanner(template);

		var start, type, value, chr, token, openSection;
		while (!scanner.eos()) {
			start = scanner.pos;

			// Match any text between tags.
			value = scanner.scanUntil(openingTagRe);

			if (value) {
				for (var i = 0, valueLength = value.length; i < valueLength; ++i) {
					chr = value.charAt(i);

					if (isWhitespace(chr)) {
						spaces.push(tokens.length);
					} else {
						nonSpace = true;
					}

					tokens.push(['text', chr, start, start + 1]);
					start += 1;

					// Check for whitespace on the current line.
					if (chr === '\n')
						stripSpace();
				}
			}

			// Match the opening tag.
			if (!scanner.scan(openingTagRe))
				break;

			hasTag = true;

			// Get the tag type.
			type = scanner.scan(tagRe) || 'name';
			scanner.scan(whiteRe);

			// Get the tag value.
			if (type === '=') {
				value = scanner.scanUntil(equalsRe);
				scanner.scan(equalsRe);
				scanner.scanUntil(closingTagRe);
			} else if (type === '{') {
				value = scanner.scanUntil(closingCurlyRe);
				scanner.scan(curlyRe);
				scanner.scanUntil(closingTagRe);
				type = '&';
			} else {
				value = scanner.scanUntil(closingTagRe);
			}

			// Match the closing tag.
			if (!scanner.scan(closingTagRe))
				throw new Error('Unclosed tag at ' + scanner.pos);

			token = [type, value, start, scanner.pos];
			tokens.push(token);

			if (type === '#' || type === '^') {
				sections.push(token);
			} else if (type === '/') {
				// Check section nesting.
				openSection = sections.pop();

				if (!openSection)
					throw new Error('Unopened section "' + value + '" at ' + start);

				if (openSection[1] !== value)
					throw new Error('Unclosed section "' + openSection[1] + '" at ' + start);
			} else if (type === 'name' || type === '{' || type === '&') {
				nonSpace = true;
			} else if (type === '=') {
				// Set the tags for the next time around.
				compileTags(value);
			}
		}

		// Make sure there are no open sections when we're done.
		openSection = sections.pop();

		if (openSection)
			throw new Error('Unclosed section "' + openSection[1] + '" at ' + scanner.pos);

		return nestTokens(squashTokens(tokens));
	}

	/**
	 * Combines the values of consecutive text tokens in the given `tokens` array
	 * to a single token.
	 */
	function squashTokens(tokens) {
		var squashedTokens = [];

		var token, lastToken;
		for (var i = 0, numTokens = tokens.length; i < numTokens; ++i) {
			token = tokens[i];

			if (token) {
				if (token[0] === 'text' && lastToken && lastToken[0] === 'text') {
					lastToken[1] += token[1];
					lastToken[3] = token[3];
				} else {
					squashedTokens.push(token);
					lastToken = token;
				}
			}
		}

		return squashedTokens;
	}

	/**
	 * Forms the given array of `tokens` into a nested tree structure where
	 * tokens that represent a section have two additional items: 1) an array of
	 * all tokens that appear in that section and 2) the index in the original
	 * template that represents the end of that section.
	 */
	function nestTokens(tokens) {
		var nestedTokens = [];
		var collector = nestedTokens;
		var sections = [];

		var token, section;
		for (var i = 0, numTokens = tokens.length; i < numTokens; ++i) {
			token = tokens[i];

			switch (token[0]) {
				case '#':
				case '^':
					collector.push(token);
					sections.push(token);
					collector = token[4] = [];
					break;
				case '/':
					section = sections.pop();
					section[5] = token[2];
					collector = sections.length > 0 ? sections[sections.length - 1][4] : nestedTokens;
					break;
				default:
					collector.push(token);
			}
		}

		return nestedTokens;
	}

	/**
	 * A simple string scanner that is used by the template parser to find
	 * tokens in template strings.
	 */
	function Scanner(string) {
		this.string = string;
		this.tail = string;
		this.pos = 0;
	}

	/**
	 * Returns `true` if the tail is empty (end of string).
	 */
	Scanner.prototype.eos = function eos() {
		return this.tail === '';
	};

	/**
	 * Tries to match the given regular expression at the current position.
	 * Returns the matched text if it can match, the empty string otherwise.
	 */
	Scanner.prototype.scan = function scan(re) {
		var match = this.tail.match(re);

		if (!match || match.index !== 0)
			return '';

		var string = match[0];

		this.tail = this.tail.substring(string.length);
		this.pos += string.length;

		return string;
	};

	/**
	 * Skips all text until the given regular expression can be matched. Returns
	 * the skipped string, which is the entire tail if no match can be made.
	 */
	Scanner.prototype.scanUntil = function scanUntil(re) {
		var index = this.tail.search(re), match;

		switch (index) {
			case -1:
				match = this.tail;
				this.tail = '';
				break;
			case 0:
				match = '';
				break;
			default:
				match = this.tail.substring(0, index);
				this.tail = this.tail.substring(index);
		}

		this.pos += match.length;

		return match;
	};

	/**
	 * Represents a rendering context by wrapping a view object and
	 * maintaining a reference to the parent context.
	 */
	function Context(view, parentContext) {
		this.view = view;
		this.cache = { '.': this.view };
		this.parent = parentContext;
	}

	/**
	 * Creates a new context using the given view with this context
	 * as the parent.
	 */
	Context.prototype.push = function push(view) {
		return new Context(view, this);
	};

	/**
	 * Returns the value of the given name in this context, traversing
	 * up the context hierarchy if the value is absent in this context's view.
	 */
	Context.prototype.lookup = function lookup(name) {
		var cache = this.cache;

		var value;
		if (cache.hasOwnProperty(name)) {
			value = cache[name];
		} else {
			var context = this, names, index, lookupHit = false;

			while (context) {
				if (name.indexOf('.') > 0) {
					value = context.view;
					names = name.split('.');
					index = 0;

					/**
					 * Using the dot notion path in `name`, we descend through the
					 * nested objects.
					 *
					 * To be certain that the lookup has been successful, we have to
					 * check if the last object in the path actually has the property
					 * we are looking for. We store the result in `lookupHit`.
					 *
					 * This is specially necessary for when the value has been set to
					 * `undefined` and we want to avoid looking up parent contexts.
					 **/
					while (value != null && index < names.length) {
						if (index === names.length - 1)
							lookupHit = hasProperty(value, names[index]);

						value = value[names[index++]];
					}
				} else {
					value = context.view[name];
					lookupHit = hasProperty(context.view, name);
				}

				if (lookupHit)
					break;

				context = context.parent;
			}

			cache[name] = value;
		}

		if (isFunction(value))
			value = value.call(this.view);

		return value;
	};

	/**
	 * A Writer knows how to take a stream of tokens and render them to a
	 * string, given a context. It also maintains a cache of templates to
	 * avoid the need to parse the same template twice.
	 */
	function Writer() {
		this.cache = {};
	}

	/**
	 * Clears all cached templates in this writer.
	 */
	Writer.prototype.clearCache = function clearCache() {
		this.cache = {};
	};

	/**
	 * Parses and caches the given `template` and returns the array of tokens
	 * that is generated from the parse.
	 */
	Writer.prototype.parse = function parse(template, tags) {
		var cache = this.cache;
		var tokens = cache[template];

		if (tokens == null)
			tokens = cache[template] = parseTemplate(template, tags);

		return tokens;
	};

	/**
	 * High-level method that is used to render the given `template` with
	 * the given `view`.
	 *
	 * The optional `partials` argument may be an object that contains the
	 * names and templates of partials that are used in the template. It may
	 * also be a function that is used to load partial templates on the fly
	 * that takes a single argument: the name of the partial.
	 */
	Writer.prototype.render = function render(template, view, partials) {
		var tokens = this.parse(template);
		var context = (view instanceof Context) ? view : new Context(view);
		return this.renderTokens(tokens, context, partials, template);
	};

	/**
	 * Low-level method that renders the given array of `tokens` using
	 * the given `context` and `partials`.
	 *
	 * Note: The `originalTemplate` is only ever used to extract the portion
	 * of the original template that was contained in a higher-order section.
	 * If the template doesn't use higher-order sections, this argument may
	 * be omitted.
	 */
	Writer.prototype.renderTokens = function renderTokens(tokens, context, partials, originalTemplate) {
		var buffer = '';

		var token, symbol, value;
		for (var i = 0, numTokens = tokens.length; i < numTokens; ++i) {
			value = undefined;
			token = tokens[i];
			symbol = token[0];

			if (symbol === '#') value = this.renderSection(token, context, partials, originalTemplate);
			else if (symbol === '^') value = this.renderInverted(token, context, partials, originalTemplate);
			else if (symbol === '>') value = this.renderPartial(token, context, partials, originalTemplate);
			else if (symbol === '&') value = this.unescapedValue(token, context);
			else if (symbol === 'name') value = this.escapedValue(token, context);
			else if (symbol === 'text') value = this.rawValue(token);

			if (value !== undefined)
				buffer += value;
		}

		return buffer;
	};

	Writer.prototype.renderSection = function renderSection(token, context, partials, originalTemplate) {
		var self = this;
		var buffer = '';
		var value = context.lookup(token[1]);

		// This function is used to render an arbitrary template
		// in the current context by higher-order sections.
		function subRender(template) {
			return self.render(template, context, partials);
		}

		if (!value) return;

		if (isArray(value)) {
			for (var j = 0, valueLength = value.length; j < valueLength; ++j) {
				buffer += this.renderTokens(token[4], context.push(value[j]), partials, originalTemplate);
			}
		} else if (typeof value === 'object' || typeof value === 'string' || typeof value === 'number') {
			buffer += this.renderTokens(token[4], context.push(value), partials, originalTemplate);
		} else if (isFunction(value)) {
			if (typeof originalTemplate !== 'string')
				throw new Error('Cannot use higher-order sections without the original template');

			// Extract the portion of the original template that the section contains.
			value = value.call(context.view, originalTemplate.slice(token[3], token[5]), subRender);

			if (value != null)
				buffer += value;
		} else {
			buffer += this.renderTokens(token[4], context, partials, originalTemplate);
		}
		return buffer;
	};

	Writer.prototype.renderInverted = function renderInverted(token, context, partials, originalTemplate) {
		var value = context.lookup(token[1]);

		// Use JavaScript's definition of falsy. Include empty arrays.
		// See https://github.com/janl/mustache.js/issues/186
		if (!value || (isArray(value) && value.length === 0))
			return this.renderTokens(token[4], context, partials, originalTemplate);
	};

	Writer.prototype.renderPartial = function renderPartial(token, context, partials) {
		if (!partials) return;

		var value = isFunction(partials) ? partials(token[1]) : partials[token[1]];
		if (value != null)
			return this.renderTokens(this.parse(value), context, partials, value);
	};

	Writer.prototype.unescapedValue = function unescapedValue(token, context) {
		var value = context.lookup(token[1]);
		if (value != null)
			return value;
	};

	Writer.prototype.escapedValue = function escapedValue(token, context) {
		var value = context.lookup(token[1]);
		if (value != null)
			return mustache.escape(value);
	};

	Writer.prototype.rawValue = function rawValue(token) {
		return token[1];
	};

	mustache.name = 'mustache.js';
	mustache.version = '2.2.1';
	mustache.tags = ['{{', '}}'];

	// All high-level mustache.* functions use this writer.
	var defaultWriter = new Writer();

	/**
	 * Clears all cached templates in the default writer.
	 */
	mustache.clearCache = function clearCache() {
		return defaultWriter.clearCache();
	};

	/**
	 * Parses and caches the given template in the default writer and returns the
	 * array of tokens it contains. Doing this ahead of time avoids the need to
	 * parse templates on the fly as they are rendered.
	 */
	mustache.parse = function parse(template, tags) {
		return defaultWriter.parse(template, tags);
	};

	/**
	 * Renders the `template` with the given `view` and `partials` using the
	 * default writer.
	 */
	mustache.render = function render(template, view, partials) {
		if (typeof template !== 'string') {
			throw new TypeError('Invalid template! Template should be a "string" ' +
				'but "' + typeStr(template) + '" was given as the first ' +
				'argument for mustache#render(template, view, partials)');
		}

		return defaultWriter.render(template, view, partials);
	};

	// This is here for backwards compatibility with 0.4.x.,
	/*eslint-disable */ // eslint wants camel cased function name
	mustache.to_html = function to_html(template, view, partials, send) {
		/*eslint-enable*/

		var result = mustache.render(template, view, partials);

		if (isFunction(send)) {
			send(result);
		} else {
			return result;
		}
	};

	// Export the escaping function so that the user may override it.
	// See https://github.com/janl/mustache.js/issues/244
	mustache.escape = escapeHtml;

	// Export these mainly for testing, but also for advanced usage.
	mustache.Scanner = Scanner;
	mustache.Context = Context;
	mustache.Writer = Writer;

}));
/*!
 * Select2 4.0.3
 * https://select2.github.io
 *
 * Released under the MIT license
 * https://github.com/select2/select2/blob/master/LICENSE.md
 */
(function (factory) {
	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['jquery'], factory);
	} else if (typeof module === 'object' && module.exports) {
		// Node/CommonJS
		module.exports = function (root, jQuery) {
			if (jQuery === undefined) {
				// require('jQuery') returns a factory that requires window to
				// build a jQuery instance, we normalize how we use modules
				// that require this pattern but the window provided is a noop
				// if it's defined (how jquery works)
				if (typeof window !== 'undefined') {
					jQuery = require('jquery');
				}
				else {
					jQuery = require('jquery')(root);
				}
			}
			factory(jQuery);
			return jQuery;
		};
	} else {
		// Browser globals
		factory(jQuery);
	}
}(function (jQuery) {
	// This is needed so we can catch the AMD loader configuration and use it
	// The inner file should be wrapped (by `banner.start.js`) in a function that
	// returns the AMD loader references.
	var S2 = (function () {
		// Restore the Select2 AMD loader so it can be used
		// Needed mostly in the language files, where the loader is not inserted
		if (jQuery && jQuery.fn && jQuery.fn.select2 && jQuery.fn.select2.amd) {
			var S2 = jQuery.fn.select2.amd;
		}
		var S2; (function () {
			if (!S2 || !S2.requirejs) {
				if (!S2) { S2 = {}; } else { require = S2; }
				/**
				 * @license almond 0.3.1 Copyright (c) 2011-2014, The Dojo Foundation All Rights Reserved.
				 * Available via the MIT or new BSD license.
				 * see: http://github.com/jrburke/almond for details
				 */
				//Going sloppy to avoid 'use strict' string cost, but strict practices should
				//be followed.
				/*jslint sloppy: true */
				/*global setTimeout: false */

				var requirejs, require, define;
				(function (undef) {
					var main, req, makeMap, handlers,
						defined = {},
						waiting = {},
						config = {},
						defining = {},
						hasOwn = Object.prototype.hasOwnProperty,
						aps = [].slice,
						jsSuffixRegExp = /\.js$/;

					function hasProp(obj, prop) {
						return hasOwn.call(obj, prop);
					}

					/**
					 * Given a relative module name, like ./something, normalize it to
					 * a real name that can be mapped to a path.
					 * @param {String} name the relative name
					 * @param {String} baseName a real name that the name arg is relative
					 * to.
					 * @returns {String} normalized name
					 */
					function normalize(name, baseName) {
						var nameParts, nameSegment, mapValue, foundMap, lastIndex,
							foundI, foundStarMap, starI, i, j, part,
							baseParts = baseName && baseName.split("/"),
							map = config.map,
							starMap = (map && map['*']) || {};

						//Adjust any relative paths.
						if (name && name.charAt(0) === ".") {
							//If have a base name, try to normalize against it,
							//otherwise, assume it is a top-level require that will
							//be relative to baseUrl in the end.
							if (baseName) {
								name = name.split('/');
								lastIndex = name.length - 1;

								// Node .js allowance:
								if (config.nodeIdCompat && jsSuffixRegExp.test(name[lastIndex])) {
									name[lastIndex] = name[lastIndex].replace(jsSuffixRegExp, '');
								}

								//Lop off the last part of baseParts, so that . matches the
								//"directory" and not name of the baseName's module. For instance,
								//baseName of "one/two/three", maps to "one/two/three.js", but we
								//want the directory, "one/two" for this normalization.
								name = baseParts.slice(0, baseParts.length - 1).concat(name);

								//start trimDots
								for (i = 0; i < name.length; i += 1) {
									part = name[i];
									if (part === ".") {
										name.splice(i, 1);
										i -= 1;
									} else if (part === "..") {
										if (i === 1 && (name[2] === '..' || name[0] === '..')) {
											//End of the line. Keep at least one non-dot
											//path segment at the front so it can be mapped
											//correctly to disk. Otherwise, there is likely
											//no path mapping for a path starting with '..'.
											//This can still fail, but catches the most reasonable
											//uses of ..
											break;
										} else if (i > 0) {
											name.splice(i - 1, 2);
											i -= 2;
										}
									}
								}
								//end trimDots

								name = name.join("/");
							} else if (name.indexOf('./') === 0) {
								// No baseName, so this is ID is resolved relative
								// to baseUrl, pull off the leading dot.
								name = name.substring(2);
							}
						}

						//Apply map config if available.
						if ((baseParts || starMap) && map) {
							nameParts = name.split('/');

							for (i = nameParts.length; i > 0; i -= 1) {
								nameSegment = nameParts.slice(0, i).join("/");

								if (baseParts) {
									//Find the longest baseName segment match in the config.
									//So, do joins on the biggest to smallest lengths of baseParts.
									for (j = baseParts.length; j > 0; j -= 1) {
										mapValue = map[baseParts.slice(0, j).join('/')];

										//baseName segment has  config, find if it has one for
										//this name.
										if (mapValue) {
											mapValue = mapValue[nameSegment];
											if (mapValue) {
												//Match, update name to the new value.
												foundMap = mapValue;
												foundI = i;
												break;
											}
										}
									}
								}

								if (foundMap) {
									break;
								}

								//Check for a star map match, but just hold on to it,
								//if there is a shorter segment match later in a matching
								//config, then favor over this star map.
								if (!foundStarMap && starMap && starMap[nameSegment]) {
									foundStarMap = starMap[nameSegment];
									starI = i;
								}
							}

							if (!foundMap && foundStarMap) {
								foundMap = foundStarMap;
								foundI = starI;
							}

							if (foundMap) {
								nameParts.splice(0, foundI, foundMap);
								name = nameParts.join('/');
							}
						}

						return name;
					}

					function makeRequire(relName, forceSync) {
						return function () {
							//A version of a require function that passes a moduleName
							//value for items that may need to
							//look up paths relative to the moduleName
							var args = aps.call(arguments, 0);

							//If first arg is not require('string'), and there is only
							//one arg, it is the array form without a callback. Insert
							//a null so that the following concat is correct.
							if (typeof args[0] !== 'string' && args.length === 1) {
								args.push(null);
							}
							return req.apply(undef, args.concat([relName, forceSync]));
						};
					}

					function makeNormalize(relName) {
						return function (name) {
							return normalize(name, relName);
						};
					}

					function makeLoad(depName) {
						return function (value) {
							defined[depName] = value;
						};
					}

					function callDep(name) {
						if (hasProp(waiting, name)) {
							var args = waiting[name];
							delete waiting[name];
							defining[name] = true;
							main.apply(undef, args);
						}

						if (!hasProp(defined, name) && !hasProp(defining, name)) {
							throw new Error('No ' + name);
						}
						return defined[name];
					}

					//Turns a plugin!resource to [plugin, resource]
					//with the plugin being undefined if the name
					//did not have a plugin prefix.
					function splitPrefix(name) {
						var prefix,
							index = name ? name.indexOf('!') : -1;
						if (index > -1) {
							prefix = name.substring(0, index);
							name = name.substring(index + 1, name.length);
						}
						return [prefix, name];
					}

					/**
					 * Makes a name map, normalizing the name, and using a plugin
					 * for normalization if necessary. Grabs a ref to plugin
					 * too, as an optimization.
					 */
					makeMap = function (name, relName) {
						var plugin,
							parts = splitPrefix(name),
							prefix = parts[0];

						name = parts[1];

						if (prefix) {
							prefix = normalize(prefix, relName);
							plugin = callDep(prefix);
						}

						//Normalize according
						if (prefix) {
							if (plugin && plugin.normalize) {
								name = plugin.normalize(name, makeNormalize(relName));
							} else {
								name = normalize(name, relName);
							}
						} else {
							name = normalize(name, relName);
							parts = splitPrefix(name);
							prefix = parts[0];
							name = parts[1];
							if (prefix) {
								plugin = callDep(prefix);
							}
						}

						//Using ridiculous property names for space reasons
						return {
							f: prefix ? prefix + '!' + name : name, //fullName
							n: name,
							pr: prefix,
							p: plugin
						};
					};

					function makeConfig(name) {
						return function () {
							return (config && config.config && config.config[name]) || {};
						};
					}

					handlers = {
						require: function (name) {
							return makeRequire(name);
						},
						exports: function (name) {
							var e = defined[name];
							if (typeof e !== 'undefined') {
								return e;
							} else {
								return (defined[name] = {});
							}
						},
						module: function (name) {
							return {
								id: name,
								uri: '',
								exports: defined[name],
								config: makeConfig(name)
							};
						}
					};

					main = function (name, deps, callback, relName) {
						var cjsModule, depName, ret, map, i,
							args = [],
							callbackType = typeof callback,
							usingExports;

						//Use name if no relName
						relName = relName || name;

						//Call the callback to define the module, if necessary.
						if (callbackType === 'undefined' || callbackType === 'function') {
							//Pull out the defined dependencies and pass the ordered
							//values to the callback.
							//Default to [require, exports, module] if no deps
							deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
							for (i = 0; i < deps.length; i += 1) {
								map = makeMap(deps[i], relName);
								depName = map.f;

								//Fast path CommonJS standard dependencies.
								if (depName === "require") {
									args[i] = handlers.require(name);
								} else if (depName === "exports") {
									//CommonJS module spec 1.1
									args[i] = handlers.exports(name);
									usingExports = true;
								} else if (depName === "module") {
									//CommonJS module spec 1.1
									cjsModule = args[i] = handlers.module(name);
								} else if (hasProp(defined, depName) ||
									hasProp(waiting, depName) ||
									hasProp(defining, depName)) {
									args[i] = callDep(depName);
								} else if (map.p) {
									map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
									args[i] = defined[depName];
								} else {
									throw new Error(name + ' missing ' + depName);
								}
							}

							ret = callback ? callback.apply(defined[name], args) : undefined;

							if (name) {
								//If setting exports via "module" is in play,
								//favor that over return value and exports. After that,
								//favor a non-undefined return value over exports use.
								if (cjsModule && cjsModule.exports !== undef &&
									cjsModule.exports !== defined[name]) {
									defined[name] = cjsModule.exports;
								} else if (ret !== undef || !usingExports) {
									//Use the return value from the function.
									defined[name] = ret;
								}
							}
						} else if (name) {
							//May just be an object definition for the module. Only
							//worry about defining if have a module name.
							defined[name] = callback;
						}
					};

					requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
						if (typeof deps === "string") {
							if (handlers[deps]) {
								//callback in this case is really relName
								return handlers[deps](callback);
							}
							//Just return the module wanted. In this scenario, the
							//deps arg is the module name, and second arg (if passed)
							//is just the relName.
							//Normalize module name, if it contains . or ..
							return callDep(makeMap(deps, callback).f);
						} else if (!deps.splice) {
							//deps is a config object, not an array.
							config = deps;
							if (config.deps) {
								req(config.deps, config.callback);
							}
							if (!callback) {
								return;
							}

							if (callback.splice) {
								//callback is an array, which means it is a dependency list.
								//Adjust args if there are dependencies
								deps = callback;
								callback = relName;
								relName = null;
							} else {
								deps = undef;
							}
						}

						//Support require(['a'])
						callback = callback || function () { };

						//If relName is a function, it is an errback handler,
						//so remove it.
						if (typeof relName === 'function') {
							relName = forceSync;
							forceSync = alt;
						}

						//Simulate async callback;
						if (forceSync) {
							main(undef, deps, callback, relName);
						} else {
							//Using a non-zero value because of concern for what old browsers
							//do, and latest browsers "upgrade" to 4 if lower value is used:
							//http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
							//If want a value immediately, use require('id') instead -- something
							//that works in almond on the global level, but not guaranteed and
							//unlikely to work in other AMD implementations.
							setTimeout(function () {
								main(undef, deps, callback, relName);
							}, 4);
						}

						return req;
					};

					/**
					 * Just drops the config on the floor, but returns req in case
					 * the config return value is used.
					 */
					req.config = function (cfg) {
						return req(cfg);
					};

					/**
					 * Expose module registry for debugging and tooling
					 */
					requirejs._defined = defined;

					define = function (name, deps, callback) {
						if (typeof name !== 'string') {
							throw new Error('See almond README: incorrect module build, no module name');
						}

						//This module may not have dependencies
						if (!deps.splice) {
							//deps is not an array, so probably means
							//an object literal or factory function for
							//the value. Adjust args.
							callback = deps;
							deps = [];
						}

						if (!hasProp(defined, name) && !hasProp(waiting, name)) {
							waiting[name] = [name, deps, callback];
						}
					};

					define.amd = {
						jQuery: true
					};
				}());

				S2.requirejs = requirejs; S2.require = require; S2.define = define;
			}
		}());
		S2.define("almond", function () { });

		/* global jQuery:false, $:false */
		S2.define('jquery', [], function () {
			var _$ = jQuery || $;

			if (_$ == null && console && console.error) {
				console.error(
					'Select2: An instance of jQuery or a jQuery-compatible library was not ' +
					'found. Make sure that you are including jQuery before Select2 on your ' +
					'web page.'
				);
			}

			return _$;
		});

		S2.define('select2/utils', [
			'jquery'
		], function ($) {
			var Utils = {};

			Utils.Extend = function (ChildClass, SuperClass) {
				var __hasProp = {}.hasOwnProperty;

				function BaseConstructor() {
					this.constructor = ChildClass;
				}

				for (var key in SuperClass) {
					if (__hasProp.call(SuperClass, key)) {
						ChildClass[key] = SuperClass[key];
					}
				}

				BaseConstructor.prototype = SuperClass.prototype;
				ChildClass.prototype = new BaseConstructor();
				ChildClass.__super__ = SuperClass.prototype;

				return ChildClass;
			};

			function getMethods(theClass) {
				var proto = theClass.prototype;

				var methods = [];

				for (var methodName in proto) {
					var m = proto[methodName];

					if (typeof m !== 'function') {
						continue;
					}

					if (methodName === 'constructor') {
						continue;
					}

					methods.push(methodName);
				}

				return methods;
			}

			Utils.Decorate = function (SuperClass, DecoratorClass) {
				var decoratedMethods = getMethods(DecoratorClass);
				var superMethods = getMethods(SuperClass);

				function DecoratedClass() {
					var unshift = Array.prototype.unshift;

					var argCount = DecoratorClass.prototype.constructor.length;

					var calledConstructor = SuperClass.prototype.constructor;

					if (argCount > 0) {
						unshift.call(arguments, SuperClass.prototype.constructor);

						calledConstructor = DecoratorClass.prototype.constructor;
					}

					calledConstructor.apply(this, arguments);
				}

				DecoratorClass.displayName = SuperClass.displayName;

				function ctr() {
					this.constructor = DecoratedClass;
				}

				DecoratedClass.prototype = new ctr();

				for (var m = 0; m < superMethods.length; m++) {
					var superMethod = superMethods[m];

					DecoratedClass.prototype[superMethod] =
						SuperClass.prototype[superMethod];
				}

				var calledMethod = function (methodName) {
					// Stub out the original method if it's not decorating an actual method
					var originalMethod = function () { };

					if (methodName in DecoratedClass.prototype) {
						originalMethod = DecoratedClass.prototype[methodName];
					}

					var decoratedMethod = DecoratorClass.prototype[methodName];

					return function () {
						var unshift = Array.prototype.unshift;

						unshift.call(arguments, originalMethod);

						return decoratedMethod.apply(this, arguments);
					};
				};

				for (var d = 0; d < decoratedMethods.length; d++) {
					var decoratedMethod = decoratedMethods[d];

					DecoratedClass.prototype[decoratedMethod] = calledMethod(decoratedMethod);
				}

				return DecoratedClass;
			};

			var Observable = function () {
				this.listeners = {};
			};

			Observable.prototype.on = function (event, callback) {
				this.listeners = this.listeners || {};

				if (event in this.listeners) {
					this.listeners[event].push(callback);
				} else {
					this.listeners[event] = [callback];
				}
			};

			Observable.prototype.trigger = function (event) {
				var slice = Array.prototype.slice;
				var params = slice.call(arguments, 1);

				this.listeners = this.listeners || {};

				// Params should always come in as an array
				if (params == null) {
					params = [];
				}

				// If there are no arguments to the event, use a temporary object
				if (params.length === 0) {
					params.push({});
				}

				// Set the `_type` of the first object to the event
				params[0]._type = event;

				if (event in this.listeners) {
					this.invoke(this.listeners[event], slice.call(arguments, 1));
				}

				if ('*' in this.listeners) {
					this.invoke(this.listeners['*'], arguments);
				}
			};

			Observable.prototype.invoke = function (listeners, params) {
				for (var i = 0, len = listeners.length; i < len; i++) {
					listeners[i].apply(this, params);
				}
			};

			Utils.Observable = Observable;

			Utils.generateChars = function (length) {
				var chars = '';

				for (var i = 0; i < length; i++) {
					var randomChar = Math.floor(Math.random() * 36);
					chars += randomChar.toString(36);
				}

				return chars;
			};

			Utils.bind = function (func, context) {
				return function () {
					func.apply(context, arguments);
				};
			};

			Utils._convertData = function (data) {
				for (var originalKey in data) {
					var keys = originalKey.split('-');

					var dataLevel = data;

					if (keys.length === 1) {
						continue;
					}

					for (var k = 0; k < keys.length; k++) {
						var key = keys[k];

						// Lowercase the first letter
						// By default, dash-separated becomes camelCase
						key = key.substring(0, 1).toLowerCase() + key.substring(1);

						if (!(key in dataLevel)) {
							dataLevel[key] = {};
						}

						if (k == keys.length - 1) {
							dataLevel[key] = data[originalKey];
						}

						dataLevel = dataLevel[key];
					}

					delete data[originalKey];
				}

				return data;
			};

			Utils.hasScroll = function (index, el) {
				// Adapted from the function created by @ShadowScripter
				// and adapted by @BillBarry on the Stack Exchange Code Review website.
				// The original code can be found at
				// http://codereview.stackexchange.com/q/13338
				// and was designed to be used with the Sizzle selector engine.

				var $el = $(el);
				var overflowX = el.style.overflowX;
				var overflowY = el.style.overflowY;

				//Check both x and y declarations
				if (overflowX === overflowY &&
					(overflowY === 'hidden' || overflowY === 'visible')) {
					return false;
				}

				if (overflowX === 'scroll' || overflowY === 'scroll') {
					return true;
				}

				return ($el.innerHeight() < el.scrollHeight ||
					$el.innerWidth() < el.scrollWidth);
			};

			Utils.escapeMarkup = function (markup) {
				var replaceMap = {
					'\\': '&#92;',
					'&': '&amp;',
					'<': '&lt;',
					'>': '&gt;',
					'"': '&quot;',
					'\'': '&#39;',
					'/': '&#47;'
				};

				// Do not try to escape the markup if it's not a string
				if (typeof markup !== 'string') {
					return markup;
				}

				return String(markup).replace(/[&<>"'\/\\]/g, function (match) {
					return replaceMap[match];
				});
			};

			// Append an array of jQuery nodes to a given element.
			Utils.appendMany = function ($element, $nodes) {
				// jQuery 1.7.x does not support $.fn.append() with an array
				// Fall back to a jQuery object collection using $.fn.add()
				if ($.fn.jquery.substr(0, 3) === '1.7') {
					var $jqNodes = $();

					$.map($nodes, function (node) {
						$jqNodes = $jqNodes.add(node);
					});

					$nodes = $jqNodes;
				}

				$element.append($nodes);
			};

			return Utils;
		});

		S2.define('select2/results', [
			'jquery',
			'./utils'
		], function ($, Utils) {
			function Results($element, options, dataAdapter) {
				this.$element = $element;
				this.data = dataAdapter;
				this.options = options;

				Results.__super__.constructor.call(this);
			}

			Utils.Extend(Results, Utils.Observable);

			Results.prototype.render = function () {
				var $results = $(
					'<ul class="select2-results__options" role="tree"></ul>'
				);

				if (this.options.get('multiple')) {
					$results.attr('aria-multiselectable', 'true');
				}

				this.$results = $results;

				return $results;
			};

			Results.prototype.clear = function () {
				this.$results.empty();
			};

			Results.prototype.displayMessage = function (params) {
				var escapeMarkup = this.options.get('escapeMarkup');

				this.clear();
				this.hideLoading();

				var $message = $(
					'<li role="treeitem" aria-live="assertive"' +
					' class="select2-results__option"></li>'
				);

				var message = this.options.get('translations').get(params.message);

				$message.append(
					escapeMarkup(
						message(params.args)
					)
				);

				$message[0].className += ' select2-results__message';

				this.$results.append($message);
			};

			Results.prototype.hideMessages = function () {
				this.$results.find('.select2-results__message').remove();
			};

			Results.prototype.append = function (data) {
				this.hideLoading();

				var $options = [];

				if (data.results == null || data.results.length === 0) {
					if (this.$results.children().length === 0) {
						this.trigger('results:message', {
							message: 'noResults'
						});
					}

					return;
				}

				data.results = this.sort(data.results);

				for (var d = 0; d < data.results.length; d++) {
					var item = data.results[d];

					var $option = this.option(item);

					$options.push($option);
				}

				this.$results.append($options);
			};

			Results.prototype.position = function ($results, $dropdown) {
				var $resultsContainer = $dropdown.find('.select2-results');
				$resultsContainer.append($results);
			};

			Results.prototype.sort = function (data) {
				var sorter = this.options.get('sorter');

				return sorter(data);
			};

			Results.prototype.highlightFirstItem = function () {
				var $options = this.$results
					.find('.select2-results__option[aria-selected]');

				var $selected = $options.filter('[aria-selected=true]');

				// Check if there are any selected options
				if ($selected.length > 0) {
					// If there are selected options, highlight the first
					$selected.first().trigger('mouseenter');
				} else {
					// If there are no selected options, highlight the first option
					// in the dropdown
					$options.first().trigger('mouseenter');
				}

				this.ensureHighlightVisible();
			};

			Results.prototype.setClasses = function () {
				var self = this;

				this.data.current(function (selected) {
					var selectedIds = $.map(selected, function (s) {
						return s.id.toString();
					});

					var $options = self.$results
						.find('.select2-results__option[aria-selected]');

					$options.each(function () {
						var $option = $(this);

						var item = $.data(this, 'data');

						// id needs to be converted to a string when comparing
						var id = '' + item.id;

						if ((item.element != null && item.element.selected) ||
							(item.element == null && $.inArray(id, selectedIds) > -1)) {
							$option.attr('aria-selected', 'true');
						} else {
							$option.attr('aria-selected', 'false');
						}
					});

				});
			};

			Results.prototype.showLoading = function (params) {
				this.hideLoading();

				var loadingMore = this.options.get('translations').get('searching');

				var loading = {
					disabled: true,
					loading: true,
					text: loadingMore(params)
				};
				var $loading = this.option(loading);
				$loading.className += ' loading-results';

				this.$results.prepend($loading);
			};

			Results.prototype.hideLoading = function () {
				this.$results.find('.loading-results').remove();
			};

			Results.prototype.option = function (data) {
				var option = document.createElement('li');
				option.className = 'select2-results__option';

				var attrs = {
					'role': 'treeitem',
					'aria-selected': 'false'
				};

				if (data.disabled) {
					delete attrs['aria-selected'];
					attrs['aria-disabled'] = 'true';
				}

				if (data.id == null) {
					delete attrs['aria-selected'];
				}

				if (data._resultId != null) {
					option.id = data._resultId;
				}

				if (data.title) {
					option.title = data.title;
				}

				if (data.children) {
					attrs.role = 'group';
					attrs['aria-label'] = data.text;
					delete attrs['aria-selected'];
				}

				for (var attr in attrs) {
					var val = attrs[attr];

					option.setAttribute(attr, val);
				}

				if (data.children) {
					var $option = $(option);

					var label = document.createElement('strong');
					label.className = 'select2-results__group';

					var $label = $(label);
					this.template(data, label);

					var $children = [];

					for (var c = 0; c < data.children.length; c++) {
						var child = data.children[c];

						var $child = this.option(child);

						$children.push($child);
					}

					var $childrenContainer = $('<ul></ul>', {
						'class': 'select2-results__options select2-results__options--nested'
					});

					$childrenContainer.append($children);

					$option.append(label);
					$option.append($childrenContainer);
				} else {
					this.template(data, option);
				}

				$.data(option, 'data', data);

				return option;
			};

			Results.prototype.bind = function (container, $container) {
				var self = this;

				var id = container.id + '-results';

				this.$results.attr('id', id);

				container.on('results:all', function (params) {
					self.clear();
					self.append(params.data);

					if (container.isOpen()) {
						self.setClasses();
						self.highlightFirstItem();
					}
				});

				container.on('results:append', function (params) {
					self.append(params.data);

					if (container.isOpen()) {
						self.setClasses();
					}
				});

				container.on('query', function (params) {
					self.hideMessages();
					self.showLoading(params);
				});

				container.on('select', function () {
					if (!container.isOpen()) {
						return;
					}

					self.setClasses();
					self.highlightFirstItem();
				});

				container.on('unselect', function () {
					if (!container.isOpen()) {
						return;
					}

					self.setClasses();
					self.highlightFirstItem();
				});

				container.on('open', function () {
					// When the dropdown is open, aria-expended="true"
					self.$results.attr('aria-expanded', 'true');
					self.$results.attr('aria-hidden', 'false');

					self.setClasses();
					self.ensureHighlightVisible();
				});

				container.on('close', function () {
					// When the dropdown is closed, aria-expended="false"
					self.$results.attr('aria-expanded', 'false');
					self.$results.attr('aria-hidden', 'true');
					self.$results.removeAttr('aria-activedescendant');
				});

				container.on('results:toggle', function () {
					var $highlighted = self.getHighlightedResults();

					if ($highlighted.length === 0) {
						return;
					}

					$highlighted.trigger('mouseup');
				});

				container.on('results:select', function () {
					var $highlighted = self.getHighlightedResults();

					if ($highlighted.length === 0) {
						return;
					}

					var data = $highlighted.data('data');

					if ($highlighted.attr('aria-selected') == 'true') {
						self.trigger('close', {});
					} else {
						self.trigger('select', {
							data: data
						});
					}
				});

				container.on('results:previous', function () {
					var $highlighted = self.getHighlightedResults();

					var $options = self.$results.find('[aria-selected]');

					var currentIndex = $options.index($highlighted);

					// If we are already at te top, don't move further
					if (currentIndex === 0) {
						return;
					}

					var nextIndex = currentIndex - 1;

					// If none are highlighted, highlight the first
					if ($highlighted.length === 0) {
						nextIndex = 0;
					}

					var $next = $options.eq(nextIndex);

					$next.trigger('mouseenter');

					var currentOffset = self.$results.offset().top;
					var nextTop = $next.offset().top;
					var nextOffset = self.$results.scrollTop() + (nextTop - currentOffset);

					if (nextIndex === 0) {
						self.$results.scrollTop(0);
					} else if (nextTop - currentOffset < 0) {
						self.$results.scrollTop(nextOffset);
					}
				});

				container.on('results:next', function () {
					var $highlighted = self.getHighlightedResults();

					var $options = self.$results.find('[aria-selected]');

					var currentIndex = $options.index($highlighted);

					var nextIndex = currentIndex + 1;

					// If we are at the last option, stay there
					if (nextIndex >= $options.length) {
						return;
					}

					var $next = $options.eq(nextIndex);

					$next.trigger('mouseenter');

					var currentOffset = self.$results.offset().top +
						self.$results.outerHeight(false);
					var nextBottom = $next.offset().top + $next.outerHeight(false);
					var nextOffset = self.$results.scrollTop() + nextBottom - currentOffset;

					if (nextIndex === 0) {
						self.$results.scrollTop(0);
					} else if (nextBottom > currentOffset) {
						self.$results.scrollTop(nextOffset);
					}
				});

				container.on('results:focus', function (params) {
					params.element.addClass('select2-results__option--highlighted');
				});

				container.on('results:message', function (params) {
					self.displayMessage(params);
				});

				if ($.fn.mousewheel) {
					this.$results.on('mousewheel', function (e) {
						var top = self.$results.scrollTop();

						var bottom = self.$results.get(0).scrollHeight - top + e.deltaY;

						var isAtTop = e.deltaY > 0 && top - e.deltaY <= 0;
						var isAtBottom = e.deltaY < 0 && bottom <= self.$results.height();

						if (isAtTop) {
							self.$results.scrollTop(0);

							e.preventDefault();
							e.stopPropagation();
						} else if (isAtBottom) {
							self.$results.scrollTop(
								self.$results.get(0).scrollHeight - self.$results.height()
							);

							e.preventDefault();
							e.stopPropagation();
						}
					});
				}

				this.$results.on('mouseup', '.select2-results__option[aria-selected]',
					function (evt) {
						var $this = $(this);

						var data = $this.data('data');

						if ($this.attr('aria-selected') === 'true') {
							if (self.options.get('multiple')) {
								self.trigger('unselect', {
									originalEvent: evt,
									data: data
								});
							} else {
								self.trigger('close', {});
							}

							return;
						}

						self.trigger('select', {
							originalEvent: evt,
							data: data
						});
					});

				this.$results.on('mouseenter', '.select2-results__option[aria-selected]',
					function (evt) {
						var data = $(this).data('data');

						self.getHighlightedResults()
							.removeClass('select2-results__option--highlighted');

						self.trigger('results:focus', {
							data: data,
							element: $(this)
						});
					});
			};

			Results.prototype.getHighlightedResults = function () {
				var $highlighted = this.$results
					.find('.select2-results__option--highlighted');

				return $highlighted;
			};

			Results.prototype.destroy = function () {
				this.$results.remove();
			};

			Results.prototype.ensureHighlightVisible = function () {
				var $highlighted = this.getHighlightedResults();

				if ($highlighted.length === 0) {
					return;
				}

				var $options = this.$results.find('[aria-selected]');

				var currentIndex = $options.index($highlighted);

				var currentOffset = this.$results.offset().top;
				var nextTop = $highlighted.offset().top;
				var nextOffset = this.$results.scrollTop() + (nextTop - currentOffset);

				var offsetDelta = nextTop - currentOffset;
				nextOffset -= $highlighted.outerHeight(false) * 2;

				if (currentIndex <= 2) {
					this.$results.scrollTop(0);
				} else if (offsetDelta > this.$results.outerHeight() || offsetDelta < 0) {
					this.$results.scrollTop(nextOffset);
				}
			};

			Results.prototype.template = function (result, container) {
				var template = this.options.get('templateResult');
				var escapeMarkup = this.options.get('escapeMarkup');

				var content = template(result, container);

				if (content == null) {
					container.style.display = 'none';
				} else if (typeof content === 'string') {
					container.innerHTML = escapeMarkup(content);
				} else {
					$(container).append(content);
				}
			};

			return Results;
		});

		S2.define('select2/keys', [

		], function () {
			var KEYS = {
				BACKSPACE: 8,
				TAB: 9,
				ENTER: 13,
				SHIFT: 16,
				CTRL: 17,
				ALT: 18,
				ESC: 27,
				SPACE: 32,
				PAGE_UP: 33,
				PAGE_DOWN: 34,
				END: 35,
				HOME: 36,
				LEFT: 37,
				UP: 38,
				RIGHT: 39,
				DOWN: 40,
				DELETE: 46
			};

			return KEYS;
		});

		S2.define('select2/selection/base', [
			'jquery',
			'../utils',
			'../keys'
		], function ($, Utils, KEYS) {
			function BaseSelection($element, options) {
				this.$element = $element;
				this.options = options;

				BaseSelection.__super__.constructor.call(this);
			}

			Utils.Extend(BaseSelection, Utils.Observable);

			BaseSelection.prototype.render = function () {
				var $selection = $(
					'<span class="select2-selection" role="combobox" ' +
					' aria-haspopup="true" aria-expanded="false">' +
					'</span>'
				);

				this._tabindex = 0;

				if (this.$element.data('old-tabindex') != null) {
					this._tabindex = this.$element.data('old-tabindex');
				} else if (this.$element.attr('tabindex') != null) {
					this._tabindex = this.$element.attr('tabindex');
				}

				$selection.attr('title', this.$element.attr('title'));
				$selection.attr('tabindex', this._tabindex);

				this.$selection = $selection;

				return $selection;
			};

			BaseSelection.prototype.bind = function (container, $container) {
				var self = this;

				var id = container.id + '-container';
				var resultsId = container.id + '-results';

				this.container = container;

				this.$selection.on('focus', function (evt) {
					self.trigger('focus', evt);
				});

				this.$selection.on('blur', function (evt) {
					self._handleBlur(evt);
				});

				this.$selection.on('keydown', function (evt) {
					self.trigger('keypress', evt);

					if (evt.which === KEYS.SPACE) {
						evt.preventDefault();
					}
				});

				container.on('results:focus', function (params) {
					self.$selection.attr('aria-activedescendant', params.data._resultId);
				});

				container.on('selection:update', function (params) {
					self.update(params.data);
				});

				container.on('open', function () {
					// When the dropdown is open, aria-expanded="true"
					self.$selection.attr('aria-expanded', 'true');
					self.$selection.attr('aria-owns', resultsId);

					self._attachCloseHandler(container);
				});

				container.on('close', function () {
					// When the dropdown is closed, aria-expanded="false"
					self.$selection.attr('aria-expanded', 'false');
					self.$selection.removeAttr('aria-activedescendant');
					self.$selection.removeAttr('aria-owns');

					self.$selection.focus();

					self._detachCloseHandler(container);
				});

				container.on('enable', function () {
					self.$selection.attr('tabindex', self._tabindex);
				});

				container.on('disable', function () {
					self.$selection.attr('tabindex', '-1');
				});
			};

			BaseSelection.prototype._handleBlur = function (evt) {
				var self = this;

				// This needs to be delayed as the active element is the body when the tab
				// key is pressed, possibly along with others.
				window.setTimeout(function () {
					// Don't trigger `blur` if the focus is still in the selection
					if (
						(document.activeElement == self.$selection[0]) ||
						($.contains(self.$selection[0], document.activeElement))
					) {
						return;
					}

					self.trigger('blur', evt);
				}, 1);
			};

			BaseSelection.prototype._attachCloseHandler = function (container) {
				var self = this;

				$(document.body).on('mousedown.select2.' + container.id, function (e) {
					var $target = $(e.target);

					var $select = $target.closest('.select2');

					var $all = $('.select2.select2-container--open');

					$all.each(function () {
						var $this = $(this);

						if (this == $select[0]) {
							return;
						}

						var $element = $this.data('element');

						$element.select2('close');
					});
				});
			};

			BaseSelection.prototype._detachCloseHandler = function (container) {
				$(document.body).off('mousedown.select2.' + container.id);
			};

			BaseSelection.prototype.position = function ($selection, $container) {
				var $selectionContainer = $container.find('.selection');
				$selectionContainer.append($selection);
			};

			BaseSelection.prototype.destroy = function () {
				this._detachCloseHandler(this.container);
			};

			BaseSelection.prototype.update = function (data) {
				throw new Error('The `update` method must be defined in child classes.');
			};

			return BaseSelection;
		});

		S2.define('select2/selection/single', [
			'jquery',
			'./base',
			'../utils',
			'../keys'
		], function ($, BaseSelection, Utils, KEYS) {
			function SingleSelection() {
				SingleSelection.__super__.constructor.apply(this, arguments);
			}

			Utils.Extend(SingleSelection, BaseSelection);

			SingleSelection.prototype.render = function () {
				var $selection = SingleSelection.__super__.render.call(this);

				$selection.addClass('select2-selection--single');

				$selection.html(
					'<span class="select2-selection__rendered"></span>' +
					'<span class="select2-selection__arrow" role="presentation">' +
					'<b role="presentation"></b>' +
					'</span>'
				);

				return $selection;
			};

			SingleSelection.prototype.bind = function (container, $container) {
				var self = this;

				SingleSelection.__super__.bind.apply(this, arguments);

				var id = container.id + '-container';

				this.$selection.find('.select2-selection__rendered').attr('id', id);
				this.$selection.attr('aria-labelledby', id);

				this.$selection.on('mousedown', function (evt) {
					// Only respond to left clicks
					if (evt.which !== 1) {
						return;
					}

					self.trigger('toggle', {
						originalEvent: evt
					});
				});

				this.$selection.on('focus', function (evt) {
					// User focuses on the container
				});

				this.$selection.on('blur', function (evt) {
					// User exits the container
				});

				container.on('focus', function (evt) {
					if (!container.isOpen()) {
						self.$selection.focus();
					}
				});

				container.on('selection:update', function (params) {
					self.update(params.data);
				});
			};

			SingleSelection.prototype.clear = function () {
				this.$selection.find('.select2-selection__rendered').empty();
			};

			SingleSelection.prototype.display = function (data, container) {
				var template = this.options.get('templateSelection');
				var escapeMarkup = this.options.get('escapeMarkup');

				return escapeMarkup(template(data, container));
			};

			SingleSelection.prototype.selectionContainer = function () {
				return $('<span></span>');
			};

			SingleSelection.prototype.update = function (data) {
				if (data.length === 0) {
					this.clear();
					return;
				}

				var selection = data[0];

				var $rendered = this.$selection.find('.select2-selection__rendered');
				var formatted = this.display(selection, $rendered);

				$rendered.empty().append(formatted);
				$rendered.prop('title', selection.title || selection.text);
			};

			return SingleSelection;
		});

		S2.define('select2/selection/multiple', [
			'jquery',
			'./base',
			'../utils'
		], function ($, BaseSelection, Utils) {
			function MultipleSelection($element, options) {
				MultipleSelection.__super__.constructor.apply(this, arguments);
			}

			Utils.Extend(MultipleSelection, BaseSelection);

			MultipleSelection.prototype.render = function () {
				var $selection = MultipleSelection.__super__.render.call(this);

				$selection.addClass('select2-selection--multiple');

				$selection.html(
					'<ul class="select2-selection__rendered"></ul>'
				);

				return $selection;
			};

			MultipleSelection.prototype.bind = function (container, $container) {
				var self = this;

				MultipleSelection.__super__.bind.apply(this, arguments);

				this.$selection.on('click', function (evt) {
					self.trigger('toggle', {
						originalEvent: evt
					});
				});

				this.$selection.on(
					'click',
					'.select2-selection__choice__remove',
					function (evt) {
						// Ignore the event if it is disabled
						if (self.options.get('disabled')) {
							return;
						}

						var $remove = $(this);
						var $selection = $remove.parent();

						var data = $selection.data('data');

						self.trigger('unselect', {
							originalEvent: evt,
							data: data
						});
					}
				);
			};

			MultipleSelection.prototype.clear = function () {
				this.$selection.find('.select2-selection__rendered').empty();
			};

			MultipleSelection.prototype.display = function (data, container) {
				var template = this.options.get('templateSelection');
				var escapeMarkup = this.options.get('escapeMarkup');

				return escapeMarkup(template(data, container));
			};

			MultipleSelection.prototype.selectionContainer = function () {
				var $container = $(
					'<li class="select2-selection__choice">' +
					'<span class="select2-selection__choice__remove" role="presentation">' +
					'&times;' +
					'</span>' +
					'</li>'
				);

				return $container;
			};

			MultipleSelection.prototype.update = function (data) {
				this.clear();

				if (data.length === 0) {
					return;
				}

				var $selections = [];

				for (var d = 0; d < data.length; d++) {
					var selection = data[d];

					var $selection = this.selectionContainer();
					var formatted = this.display(selection, $selection);

					$selection.append(formatted);
					$selection.prop('title', selection.title || selection.text);

					$selection.data('data', selection);

					$selections.push($selection);
				}

				var $rendered = this.$selection.find('.select2-selection__rendered');

				Utils.appendMany($rendered, $selections);
			};

			return MultipleSelection;
		});

		S2.define('select2/selection/placeholder', [
			'../utils'
		], function (Utils) {
			function Placeholder(decorated, $element, options) {
				this.placeholder = this.normalizePlaceholder(options.get('placeholder'));

				decorated.call(this, $element, options);
			}

			Placeholder.prototype.normalizePlaceholder = function (_, placeholder) {
				if (typeof placeholder === 'string') {
					placeholder = {
						id: '',
						text: placeholder
					};
				}

				return placeholder;
			};

			Placeholder.prototype.createPlaceholder = function (decorated, placeholder) {
				var $placeholder = this.selectionContainer();

				$placeholder.html(this.display(placeholder));
				$placeholder.addClass('select2-selection__placeholder')
					.removeClass('select2-selection__choice');

				return $placeholder;
			};

			Placeholder.prototype.update = function (decorated, data) {
				var singlePlaceholder = (
					data.length == 1 && data[0].id != this.placeholder.id
				);
				var multipleSelections = data.length > 1;

				if (multipleSelections || singlePlaceholder) {
					return decorated.call(this, data);
				}

				this.clear();

				var $placeholder = this.createPlaceholder(this.placeholder);

				this.$selection.find('.select2-selection__rendered').append($placeholder);
			};

			return Placeholder;
		});

		S2.define('select2/selection/allowClear', [
			'jquery',
			'../keys'
		], function ($, KEYS) {
			function AllowClear() { }

			AllowClear.prototype.bind = function (decorated, container, $container) {
				var self = this;

				decorated.call(this, container, $container);

				if (this.placeholder == null) {
					if (this.options.get('debug') && window.console && console.error) {
						console.error(
							'Select2: The `allowClear` option should be used in combination ' +
							'with the `placeholder` option.'
						);
					}
				}

				this.$selection.on('mousedown', '.select2-selection__clear',
					function (evt) {
						self._handleClear(evt);
					});

				container.on('keypress', function (evt) {
					self._handleKeyboardClear(evt, container);
				});
			};

			AllowClear.prototype._handleClear = function (_, evt) {
				// Ignore the event if it is disabled
				if (this.options.get('disabled')) {
					return;
				}

				var $clear = this.$selection.find('.select2-selection__clear');

				// Ignore the event if nothing has been selected
				if ($clear.length === 0) {
					return;
				}

				evt.stopPropagation();

				var data = $clear.data('data');

				for (var d = 0; d < data.length; d++) {
					var unselectData = {
						data: data[d]
					};

					// Trigger the `unselect` event, so people can prevent it from being
					// cleared.
					this.trigger('unselect', unselectData);

					// If the event was prevented, don't clear it out.
					if (unselectData.prevented) {
						return;
					}
				}

				this.$element.val(this.placeholder.id).trigger('change');

				this.trigger('toggle', {});
			};

			AllowClear.prototype._handleKeyboardClear = function (_, evt, container) {
				if (container.isOpen()) {
					return;
				}

				if (evt.which == KEYS.DELETE || evt.which == KEYS.BACKSPACE) {
					this._handleClear(evt);
				}
			};

			AllowClear.prototype.update = function (decorated, data) {
				decorated.call(this, data);

				if (this.$selection.find('.select2-selection__placeholder').length > 0 ||
					data.length === 0) {
					return;
				}

				var $remove = $(
					'<span class="select2-selection__clear">' +
					'&times;' +
					'</span>'
				);
				$remove.data('data', data);

				this.$selection.find('.select2-selection__rendered').prepend($remove);
			};

			return AllowClear;
		});

		S2.define('select2/selection/search', [
			'jquery',
			'../utils',
			'../keys'
		], function ($, Utils, KEYS) {
			function Search(decorated, $element, options) {
				decorated.call(this, $element, options);
			}

			Search.prototype.render = function (decorated) {
				var $search = $(
					'<li class="select2-search select2-search--inline">' +
					'<input class="select2-search__field" type="search" tabindex="-1"' +
					' autocomplete="off" autocorrect="off" autocapitalize="off"' +
					' spellcheck="false" role="textbox" aria-autocomplete="list" />' +
					'</li>'
				);

				this.$searchContainer = $search;
				this.$search = $search.find('input');

				var $rendered = decorated.call(this);

				this._transferTabIndex();

				return $rendered;
			};

			Search.prototype.bind = function (decorated, container, $container) {
				var self = this;

				decorated.call(this, container, $container);

				container.on('open', function () {
					self.$search.trigger('focus');
				});

				container.on('close', function () {
					self.$search.val('');
					self.$search.removeAttr('aria-activedescendant');
					self.$search.trigger('focus');
				});

				container.on('enable', function () {
					self.$search.prop('disabled', false);

					self._transferTabIndex();
				});

				container.on('disable', function () {
					self.$search.prop('disabled', true);
				});

				container.on('focus', function (evt) {
					self.$search.trigger('focus');
				});

				container.on('results:focus', function (params) {
					self.$search.attr('aria-activedescendant', params.id);
				});

				this.$selection.on('focusin', '.select2-search--inline', function (evt) {
					self.trigger('focus', evt);
				});

				this.$selection.on('focusout', '.select2-search--inline', function (evt) {
					self._handleBlur(evt);
				});

				this.$selection.on('keydown', '.select2-search--inline', function (evt) {
					evt.stopPropagation();

					self.trigger('keypress', evt);

					self._keyUpPrevented = evt.isDefaultPrevented();

					var key = evt.which;

					if (key === KEYS.BACKSPACE && self.$search.val() === '') {
						var $previousChoice = self.$searchContainer
							.prev('.select2-selection__choice');

						if ($previousChoice.length > 0) {
							var item = $previousChoice.data('data');

							self.searchRemoveChoice(item);

							evt.preventDefault();
						}
					}
				});

				// Try to detect the IE version should the `documentMode` property that
				// is stored on the document. This is only implemented in IE and is
				// slightly cleaner than doing a user agent check.
				// This property is not available in Edge, but Edge also doesn't have
				// this bug.
				var msie = document.documentMode;
				var disableInputEvents = msie && msie <= 11;

				// Workaround for browsers which do not support the `input` event
				// This will prevent double-triggering of events for browsers which support
				// both the `keyup` and `input` events.
				this.$selection.on(
					'input.searchcheck',
					'.select2-search--inline',
					function (evt) {
						// IE will trigger the `input` event when a placeholder is used on a
						// search box. To get around this issue, we are forced to ignore all
						// `input` events in IE and keep using `keyup`.
						if (disableInputEvents) {
							self.$selection.off('input.search input.searchcheck');
							return;
						}

						// Unbind the duplicated `keyup` event
						self.$selection.off('keyup.search');
					}
				);

				this.$selection.on(
					'keyup.search input.search',
					'.select2-search--inline',
					function (evt) {
						// IE will trigger the `input` event when a placeholder is used on a
						// search box. To get around this issue, we are forced to ignore all
						// `input` events in IE and keep using `keyup`.
						if (disableInputEvents && evt.type === 'input') {
							self.$selection.off('input.search input.searchcheck');
							return;
						}

						var key = evt.which;

						// We can freely ignore events from modifier keys
						if (key == KEYS.SHIFT || key == KEYS.CTRL || key == KEYS.ALT) {
							return;
						}

						// Tabbing will be handled during the `keydown` phase
						if (key == KEYS.TAB) {
							return;
						}

						self.handleSearch(evt);
					}
				);
			};

			/**
			 * This method will transfer the tabindex attribute from the rendered
			 * selection to the search box. This allows for the search box to be used as
			 * the primary focus instead of the selection container.
			 *
			 * @private
			 */
			Search.prototype._transferTabIndex = function (decorated) {
				this.$search.attr('tabindex', this.$selection.attr('tabindex'));
				this.$selection.attr('tabindex', '-1');
			};

			Search.prototype.createPlaceholder = function (decorated, placeholder) {
				this.$search.attr('placeholder', placeholder.text);
			};

			Search.prototype.update = function (decorated, data) {
				var searchHadFocus = this.$search[0] == document.activeElement;

				this.$search.attr('placeholder', '');

				decorated.call(this, data);

				this.$selection.find('.select2-selection__rendered')
					.append(this.$searchContainer);

				this.resizeSearch();
				if (searchHadFocus) {
					this.$search.focus();
				}
			};

			Search.prototype.handleSearch = function () {
				this.resizeSearch();

				if (!this._keyUpPrevented) {
					var input = this.$search.val();

					this.trigger('query', {
						term: input
					});
				}

				this._keyUpPrevented = false;
			};

			Search.prototype.searchRemoveChoice = function (decorated, item) {
				this.trigger('unselect', {
					data: item
				});

				this.$search.val(item.text);
				this.handleSearch();
			};

			Search.prototype.resizeSearch = function () {
				this.$search.css('width', '25px');

				var width = '';

				if (this.$search.attr('placeholder') !== '') {
					width = this.$selection.find('.select2-selection__rendered').innerWidth();
				} else {
					var minimumWidth = this.$search.val().length + 1;

					width = (minimumWidth * 0.75) + 'em';
				}

				this.$search.css('width', width);
			};

			return Search;
		});

		S2.define('select2/selection/eventRelay', [
			'jquery'
		], function ($) {
			function EventRelay() { }

			EventRelay.prototype.bind = function (decorated, container, $container) {
				var self = this;
				var relayEvents = [
					'open', 'opening',
					'close', 'closing',
					'select', 'selecting',
					'unselect', 'unselecting'
				];

				var preventableEvents = ['opening', 'closing', 'selecting', 'unselecting'];

				decorated.call(this, container, $container);

				container.on('*', function (name, params) {
					// Ignore events that should not be relayed
					if ($.inArray(name, relayEvents) === -1) {
						return;
					}

					// The parameters should always be an object
					params = params || {};

					// Generate the jQuery event for the Select2 event
					var evt = $.Event('select2:' + name, {
						params: params
					});

					self.$element.trigger(evt);

					// Only handle preventable events if it was one
					if ($.inArray(name, preventableEvents) === -1) {
						return;
					}

					params.prevented = evt.isDefaultPrevented();
				});
			};

			return EventRelay;
		});

		S2.define('select2/translation', [
			'jquery',
			'require'
		], function ($, require) {
			function Translation(dict) {
				this.dict = dict || {};
			}

			Translation.prototype.all = function () {
				return this.dict;
			};

			Translation.prototype.get = function (key) {
				return this.dict[key];
			};

			Translation.prototype.extend = function (translation) {
				this.dict = $.extend({}, translation.all(), this.dict);
			};

			// Static functions

			Translation._cache = {};

			Translation.loadPath = function (path) {
				if (!(path in Translation._cache)) {
					var translations = require(path);

					Translation._cache[path] = translations;
				}

				return new Translation(Translation._cache[path]);
			};

			return Translation;
		});

		S2.define('select2/diacritics', [

		], function () {
			var diacritics = {
				'\u24B6': 'A',
				'\uFF21': 'A',
				'\u00C0': 'A',
				'\u00C1': 'A',
				'\u00C2': 'A',
				'\u1EA6': 'A',
				'\u1EA4': 'A',
				'\u1EAA': 'A',
				'\u1EA8': 'A',
				'\u00C3': 'A',
				'\u0100': 'A',
				'\u0102': 'A',
				'\u1EB0': 'A',
				'\u1EAE': 'A',
				'\u1EB4': 'A',
				'\u1EB2': 'A',
				'\u0226': 'A',
				'\u01E0': 'A',
				'\u00C4': 'A',
				'\u01DE': 'A',
				'\u1EA2': 'A',
				'\u00C5': 'A',
				'\u01FA': 'A',
				'\u01CD': 'A',
				'\u0200': 'A',
				'\u0202': 'A',
				'\u1EA0': 'A',
				'\u1EAC': 'A',
				'\u1EB6': 'A',
				'\u1E00': 'A',
				'\u0104': 'A',
				'\u023A': 'A',
				'\u2C6F': 'A',
				'\uA732': 'AA',
				'\u00C6': 'AE',
				'\u01FC': 'AE',
				'\u01E2': 'AE',
				'\uA734': 'AO',
				'\uA736': 'AU',
				'\uA738': 'AV',
				'\uA73A': 'AV',
				'\uA73C': 'AY',
				'\u24B7': 'B',
				'\uFF22': 'B',
				'\u1E02': 'B',
				'\u1E04': 'B',
				'\u1E06': 'B',
				'\u0243': 'B',
				'\u0182': 'B',
				'\u0181': 'B',
				'\u24B8': 'C',
				'\uFF23': 'C',
				'\u0106': 'C',
				'\u0108': 'C',
				'\u010A': 'C',
				'\u010C': 'C',
				'\u00C7': 'C',
				'\u1E08': 'C',
				'\u0187': 'C',
				'\u023B': 'C',
				'\uA73E': 'C',
				'\u24B9': 'D',
				'\uFF24': 'D',
				'\u1E0A': 'D',
				'\u010E': 'D',
				'\u1E0C': 'D',
				'\u1E10': 'D',
				'\u1E12': 'D',
				'\u1E0E': 'D',
				'\u0110': 'D',
				'\u018B': 'D',
				'\u018A': 'D',
				'\u0189': 'D',
				'\uA779': 'D',
				'\u01F1': 'DZ',
				'\u01C4': 'DZ',
				'\u01F2': 'Dz',
				'\u01C5': 'Dz',
				'\u24BA': 'E',
				'\uFF25': 'E',
				'\u00C8': 'E',
				'\u00C9': 'E',
				'\u00CA': 'E',
				'\u1EC0': 'E',
				'\u1EBE': 'E',
				'\u1EC4': 'E',
				'\u1EC2': 'E',
				'\u1EBC': 'E',
				'\u0112': 'E',
				'\u1E14': 'E',
				'\u1E16': 'E',
				'\u0114': 'E',
				'\u0116': 'E',
				'\u00CB': 'E',
				'\u1EBA': 'E',
				'\u011A': 'E',
				'\u0204': 'E',
				'\u0206': 'E',
				'\u1EB8': 'E',
				'\u1EC6': 'E',
				'\u0228': 'E',
				'\u1E1C': 'E',
				'\u0118': 'E',
				'\u1E18': 'E',
				'\u1E1A': 'E',
				'\u0190': 'E',
				'\u018E': 'E',
				'\u24BB': 'F',
				'\uFF26': 'F',
				'\u1E1E': 'F',
				'\u0191': 'F',
				'\uA77B': 'F',
				'\u24BC': 'G',
				'\uFF27': 'G',
				'\u01F4': 'G',
				'\u011C': 'G',
				'\u1E20': 'G',
				'\u011E': 'G',
				'\u0120': 'G',
				'\u01E6': 'G',
				'\u0122': 'G',
				'\u01E4': 'G',
				'\u0193': 'G',
				'\uA7A0': 'G',
				'\uA77D': 'G',
				'\uA77E': 'G',
				'\u24BD': 'H',
				'\uFF28': 'H',
				'\u0124': 'H',
				'\u1E22': 'H',
				'\u1E26': 'H',
				'\u021E': 'H',
				'\u1E24': 'H',
				'\u1E28': 'H',
				'\u1E2A': 'H',
				'\u0126': 'H',
				'\u2C67': 'H',
				'\u2C75': 'H',
				'\uA78D': 'H',
				'\u24BE': 'I',
				'\uFF29': 'I',
				'\u00CC': 'I',
				'\u00CD': 'I',
				'\u00CE': 'I',
				'\u0128': 'I',
				'\u012A': 'I',
				'\u012C': 'I',
				'\u0130': 'I',
				'\u00CF': 'I',
				'\u1E2E': 'I',
				'\u1EC8': 'I',
				'\u01CF': 'I',
				'\u0208': 'I',
				'\u020A': 'I',
				'\u1ECA': 'I',
				'\u012E': 'I',
				'\u1E2C': 'I',
				'\u0197': 'I',
				'\u24BF': 'J',
				'\uFF2A': 'J',
				'\u0134': 'J',
				'\u0248': 'J',
				'\u24C0': 'K',
				'\uFF2B': 'K',
				'\u1E30': 'K',
				'\u01E8': 'K',
				'\u1E32': 'K',
				'\u0136': 'K',
				'\u1E34': 'K',
				'\u0198': 'K',
				'\u2C69': 'K',
				'\uA740': 'K',
				'\uA742': 'K',
				'\uA744': 'K',
				'\uA7A2': 'K',
				'\u24C1': 'L',
				'\uFF2C': 'L',
				'\u013F': 'L',
				'\u0139': 'L',
				'\u013D': 'L',
				'\u1E36': 'L',
				'\u1E38': 'L',
				'\u013B': 'L',
				'\u1E3C': 'L',
				'\u1E3A': 'L',
				'\u0141': 'L',
				'\u023D': 'L',
				'\u2C62': 'L',
				'\u2C60': 'L',
				'\uA748': 'L',
				'\uA746': 'L',
				'\uA780': 'L',
				'\u01C7': 'LJ',
				'\u01C8': 'Lj',
				'\u24C2': 'M',
				'\uFF2D': 'M',
				'\u1E3E': 'M',
				'\u1E40': 'M',
				'\u1E42': 'M',
				'\u2C6E': 'M',
				'\u019C': 'M',
				'\u24C3': 'N',
				'\uFF2E': 'N',
				'\u01F8': 'N',
				'\u0143': 'N',
				'\u00D1': 'N',
				'\u1E44': 'N',
				'\u0147': 'N',
				'\u1E46': 'N',
				'\u0145': 'N',
				'\u1E4A': 'N',
				'\u1E48': 'N',
				'\u0220': 'N',
				'\u019D': 'N',
				'\uA790': 'N',
				'\uA7A4': 'N',
				'\u01CA': 'NJ',
				'\u01CB': 'Nj',
				'\u24C4': 'O',
				'\uFF2F': 'O',
				'\u00D2': 'O',
				'\u00D3': 'O',
				'\u00D4': 'O',
				'\u1ED2': 'O',
				'\u1ED0': 'O',
				'\u1ED6': 'O',
				'\u1ED4': 'O',
				'\u00D5': 'O',
				'\u1E4C': 'O',
				'\u022C': 'O',
				'\u1E4E': 'O',
				'\u014C': 'O',
				'\u1E50': 'O',
				'\u1E52': 'O',
				'\u014E': 'O',
				'\u022E': 'O',
				'\u0230': 'O',
				'\u00D6': 'O',
				'\u022A': 'O',
				'\u1ECE': 'O',
				'\u0150': 'O',
				'\u01D1': 'O',
				'\u020C': 'O',
				'\u020E': 'O',
				'\u01A0': 'O',
				'\u1EDC': 'O',
				'\u1EDA': 'O',
				'\u1EE0': 'O',
				'\u1EDE': 'O',
				'\u1EE2': 'O',
				'\u1ECC': 'O',
				'\u1ED8': 'O',
				'\u01EA': 'O',
				'\u01EC': 'O',
				'\u00D8': 'O',
				'\u01FE': 'O',
				'\u0186': 'O',
				'\u019F': 'O',
				'\uA74A': 'O',
				'\uA74C': 'O',
				'\u01A2': 'OI',
				'\uA74E': 'OO',
				'\u0222': 'OU',
				'\u24C5': 'P',
				'\uFF30': 'P',
				'\u1E54': 'P',
				'\u1E56': 'P',
				'\u01A4': 'P',
				'\u2C63': 'P',
				'\uA750': 'P',
				'\uA752': 'P',
				'\uA754': 'P',
				'\u24C6': 'Q',
				'\uFF31': 'Q',
				'\uA756': 'Q',
				'\uA758': 'Q',
				'\u024A': 'Q',
				'\u24C7': 'R',
				'\uFF32': 'R',
				'\u0154': 'R',
				'\u1E58': 'R',
				'\u0158': 'R',
				'\u0210': 'R',
				'\u0212': 'R',
				'\u1E5A': 'R',
				'\u1E5C': 'R',
				'\u0156': 'R',
				'\u1E5E': 'R',
				'\u024C': 'R',
				'\u2C64': 'R',
				'\uA75A': 'R',
				'\uA7A6': 'R',
				'\uA782': 'R',
				'\u24C8': 'S',
				'\uFF33': 'S',
				'\u1E9E': 'S',
				'\u015A': 'S',
				'\u1E64': 'S',
				'\u015C': 'S',
				'\u1E60': 'S',
				'\u0160': 'S',
				'\u1E66': 'S',
				'\u1E62': 'S',
				'\u1E68': 'S',
				'\u0218': 'S',
				'\u015E': 'S',
				'\u2C7E': 'S',
				'\uA7A8': 'S',
				'\uA784': 'S',
				'\u24C9': 'T',
				'\uFF34': 'T',
				'\u1E6A': 'T',
				'\u0164': 'T',
				'\u1E6C': 'T',
				'\u021A': 'T',
				'\u0162': 'T',
				'\u1E70': 'T',
				'\u1E6E': 'T',
				'\u0166': 'T',
				'\u01AC': 'T',
				'\u01AE': 'T',
				'\u023E': 'T',
				'\uA786': 'T',
				'\uA728': 'TZ',
				'\u24CA': 'U',
				'\uFF35': 'U',
				'\u00D9': 'U',
				'\u00DA': 'U',
				'\u00DB': 'U',
				'\u0168': 'U',
				'\u1E78': 'U',
				'\u016A': 'U',
				'\u1E7A': 'U',
				'\u016C': 'U',
				'\u00DC': 'U',
				'\u01DB': 'U',
				'\u01D7': 'U',
				'\u01D5': 'U',
				'\u01D9': 'U',
				'\u1EE6': 'U',
				'\u016E': 'U',
				'\u0170': 'U',
				'\u01D3': 'U',
				'\u0214': 'U',
				'\u0216': 'U',
				'\u01AF': 'U',
				'\u1EEA': 'U',
				'\u1EE8': 'U',
				'\u1EEE': 'U',
				'\u1EEC': 'U',
				'\u1EF0': 'U',
				'\u1EE4': 'U',
				'\u1E72': 'U',
				'\u0172': 'U',
				'\u1E76': 'U',
				'\u1E74': 'U',
				'\u0244': 'U',
				'\u24CB': 'V',
				'\uFF36': 'V',
				'\u1E7C': 'V',
				'\u1E7E': 'V',
				'\u01B2': 'V',
				'\uA75E': 'V',
				'\u0245': 'V',
				'\uA760': 'VY',
				'\u24CC': 'W',
				'\uFF37': 'W',
				'\u1E80': 'W',
				'\u1E82': 'W',
				'\u0174': 'W',
				'\u1E86': 'W',
				'\u1E84': 'W',
				'\u1E88': 'W',
				'\u2C72': 'W',
				'\u24CD': 'X',
				'\uFF38': 'X',
				'\u1E8A': 'X',
				'\u1E8C': 'X',
				'\u24CE': 'Y',
				'\uFF39': 'Y',
				'\u1EF2': 'Y',
				'\u00DD': 'Y',
				'\u0176': 'Y',
				'\u1EF8': 'Y',
				'\u0232': 'Y',
				'\u1E8E': 'Y',
				'\u0178': 'Y',
				'\u1EF6': 'Y',
				'\u1EF4': 'Y',
				'\u01B3': 'Y',
				'\u024E': 'Y',
				'\u1EFE': 'Y',
				'\u24CF': 'Z',
				'\uFF3A': 'Z',
				'\u0179': 'Z',
				'\u1E90': 'Z',
				'\u017B': 'Z',
				'\u017D': 'Z',
				'\u1E92': 'Z',
				'\u1E94': 'Z',
				'\u01B5': 'Z',
				'\u0224': 'Z',
				'\u2C7F': 'Z',
				'\u2C6B': 'Z',
				'\uA762': 'Z',
				'\u24D0': 'a',
				'\uFF41': 'a',
				'\u1E9A': 'a',
				'\u00E0': 'a',
				'\u00E1': 'a',
				'\u00E2': 'a',
				'\u1EA7': 'a',
				'\u1EA5': 'a',
				'\u1EAB': 'a',
				'\u1EA9': 'a',
				'\u00E3': 'a',
				'\u0101': 'a',
				'\u0103': 'a',
				'\u1EB1': 'a',
				'\u1EAF': 'a',
				'\u1EB5': 'a',
				'\u1EB3': 'a',
				'\u0227': 'a',
				'\u01E1': 'a',
				'\u00E4': 'a',
				'\u01DF': 'a',
				'\u1EA3': 'a',
				'\u00E5': 'a',
				'\u01FB': 'a',
				'\u01CE': 'a',
				'\u0201': 'a',
				'\u0203': 'a',
				'\u1EA1': 'a',
				'\u1EAD': 'a',
				'\u1EB7': 'a',
				'\u1E01': 'a',
				'\u0105': 'a',
				'\u2C65': 'a',
				'\u0250': 'a',
				'\uA733': 'aa',
				'\u00E6': 'ae',
				'\u01FD': 'ae',
				'\u01E3': 'ae',
				'\uA735': 'ao',
				'\uA737': 'au',
				'\uA739': 'av',
				'\uA73B': 'av',
				'\uA73D': 'ay',
				'\u24D1': 'b',
				'\uFF42': 'b',
				'\u1E03': 'b',
				'\u1E05': 'b',
				'\u1E07': 'b',
				'\u0180': 'b',
				'\u0183': 'b',
				'\u0253': 'b',
				'\u24D2': 'c',
				'\uFF43': 'c',
				'\u0107': 'c',
				'\u0109': 'c',
				'\u010B': 'c',
				'\u010D': 'c',
				'\u00E7': 'c',
				'\u1E09': 'c',
				'\u0188': 'c',
				'\u023C': 'c',
				'\uA73F': 'c',
				'\u2184': 'c',
				'\u24D3': 'd',
				'\uFF44': 'd',
				'\u1E0B': 'd',
				'\u010F': 'd',
				'\u1E0D': 'd',
				'\u1E11': 'd',
				'\u1E13': 'd',
				'\u1E0F': 'd',
				'\u0111': 'd',
				'\u018C': 'd',
				'\u0256': 'd',
				'\u0257': 'd',
				'\uA77A': 'd',
				'\u01F3': 'dz',
				'\u01C6': 'dz',
				'\u24D4': 'e',
				'\uFF45': 'e',
				'\u00E8': 'e',
				'\u00E9': 'e',
				'\u00EA': 'e',
				'\u1EC1': 'e',
				'\u1EBF': 'e',
				'\u1EC5': 'e',
				'\u1EC3': 'e',
				'\u1EBD': 'e',
				'\u0113': 'e',
				'\u1E15': 'e',
				'\u1E17': 'e',
				'\u0115': 'e',
				'\u0117': 'e',
				'\u00EB': 'e',
				'\u1EBB': 'e',
				'\u011B': 'e',
				'\u0205': 'e',
				'\u0207': 'e',
				'\u1EB9': 'e',
				'\u1EC7': 'e',
				'\u0229': 'e',
				'\u1E1D': 'e',
				'\u0119': 'e',
				'\u1E19': 'e',
				'\u1E1B': 'e',
				'\u0247': 'e',
				'\u025B': 'e',
				'\u01DD': 'e',
				'\u24D5': 'f',
				'\uFF46': 'f',
				'\u1E1F': 'f',
				'\u0192': 'f',
				'\uA77C': 'f',
				'\u24D6': 'g',
				'\uFF47': 'g',
				'\u01F5': 'g',
				'\u011D': 'g',
				'\u1E21': 'g',
				'\u011F': 'g',
				'\u0121': 'g',
				'\u01E7': 'g',
				'\u0123': 'g',
				'\u01E5': 'g',
				'\u0260': 'g',
				'\uA7A1': 'g',
				'\u1D79': 'g',
				'\uA77F': 'g',
				'\u24D7': 'h',
				'\uFF48': 'h',
				'\u0125': 'h',
				'\u1E23': 'h',
				'\u1E27': 'h',
				'\u021F': 'h',
				'\u1E25': 'h',
				'\u1E29': 'h',
				'\u1E2B': 'h',
				'\u1E96': 'h',
				'\u0127': 'h',
				'\u2C68': 'h',
				'\u2C76': 'h',
				'\u0265': 'h',
				'\u0195': 'hv',
				'\u24D8': 'i',
				'\uFF49': 'i',
				'\u00EC': 'i',
				'\u00ED': 'i',
				'\u00EE': 'i',
				'\u0129': 'i',
				'\u012B': 'i',
				'\u012D': 'i',
				'\u00EF': 'i',
				'\u1E2F': 'i',
				'\u1EC9': 'i',
				'\u01D0': 'i',
				'\u0209': 'i',
				'\u020B': 'i',
				'\u1ECB': 'i',
				'\u012F': 'i',
				'\u1E2D': 'i',
				'\u0268': 'i',
				'\u0131': 'i',
				'\u24D9': 'j',
				'\uFF4A': 'j',
				'\u0135': 'j',
				'\u01F0': 'j',
				'\u0249': 'j',
				'\u24DA': 'k',
				'\uFF4B': 'k',
				'\u1E31': 'k',
				'\u01E9': 'k',
				'\u1E33': 'k',
				'\u0137': 'k',
				'\u1E35': 'k',
				'\u0199': 'k',
				'\u2C6A': 'k',
				'\uA741': 'k',
				'\uA743': 'k',
				'\uA745': 'k',
				'\uA7A3': 'k',
				'\u24DB': 'l',
				'\uFF4C': 'l',
				'\u0140': 'l',
				'\u013A': 'l',
				'\u013E': 'l',
				'\u1E37': 'l',
				'\u1E39': 'l',
				'\u013C': 'l',
				'\u1E3D': 'l',
				'\u1E3B': 'l',
				'\u017F': 'l',
				'\u0142': 'l',
				'\u019A': 'l',
				'\u026B': 'l',
				'\u2C61': 'l',
				'\uA749': 'l',
				'\uA781': 'l',
				'\uA747': 'l',
				'\u01C9': 'lj',
				'\u24DC': 'm',
				'\uFF4D': 'm',
				'\u1E3F': 'm',
				'\u1E41': 'm',
				'\u1E43': 'm',
				'\u0271': 'm',
				'\u026F': 'm',
				'\u24DD': 'n',
				'\uFF4E': 'n',
				'\u01F9': 'n',
				'\u0144': 'n',
				'\u00F1': 'n',
				'\u1E45': 'n',
				'\u0148': 'n',
				'\u1E47': 'n',
				'\u0146': 'n',
				'\u1E4B': 'n',
				'\u1E49': 'n',
				'\u019E': 'n',
				'\u0272': 'n',
				'\u0149': 'n',
				'\uA791': 'n',
				'\uA7A5': 'n',
				'\u01CC': 'nj',
				'\u24DE': 'o',
				'\uFF4F': 'o',
				'\u00F2': 'o',
				'\u00F3': 'o',
				'\u00F4': 'o',
				'\u1ED3': 'o',
				'\u1ED1': 'o',
				'\u1ED7': 'o',
				'\u1ED5': 'o',
				'\u00F5': 'o',
				'\u1E4D': 'o',
				'\u022D': 'o',
				'\u1E4F': 'o',
				'\u014D': 'o',
				'\u1E51': 'o',
				'\u1E53': 'o',
				'\u014F': 'o',
				'\u022F': 'o',
				'\u0231': 'o',
				'\u00F6': 'o',
				'\u022B': 'o',
				'\u1ECF': 'o',
				'\u0151': 'o',
				'\u01D2': 'o',
				'\u020D': 'o',
				'\u020F': 'o',
				'\u01A1': 'o',
				'\u1EDD': 'o',
				'\u1EDB': 'o',
				'\u1EE1': 'o',
				'\u1EDF': 'o',
				'\u1EE3': 'o',
				'\u1ECD': 'o',
				'\u1ED9': 'o',
				'\u01EB': 'o',
				'\u01ED': 'o',
				'\u00F8': 'o',
				'\u01FF': 'o',
				'\u0254': 'o',
				'\uA74B': 'o',
				'\uA74D': 'o',
				'\u0275': 'o',
				'\u01A3': 'oi',
				'\u0223': 'ou',
				'\uA74F': 'oo',
				'\u24DF': 'p',
				'\uFF50': 'p',
				'\u1E55': 'p',
				'\u1E57': 'p',
				'\u01A5': 'p',
				'\u1D7D': 'p',
				'\uA751': 'p',
				'\uA753': 'p',
				'\uA755': 'p',
				'\u24E0': 'q',
				'\uFF51': 'q',
				'\u024B': 'q',
				'\uA757': 'q',
				'\uA759': 'q',
				'\u24E1': 'r',
				'\uFF52': 'r',
				'\u0155': 'r',
				'\u1E59': 'r',
				'\u0159': 'r',
				'\u0211': 'r',
				'\u0213': 'r',
				'\u1E5B': 'r',
				'\u1E5D': 'r',
				'\u0157': 'r',
				'\u1E5F': 'r',
				'\u024D': 'r',
				'\u027D': 'r',
				'\uA75B': 'r',
				'\uA7A7': 'r',
				'\uA783': 'r',
				'\u24E2': 's',
				'\uFF53': 's',
				'\u00DF': 's',
				'\u015B': 's',
				'\u1E65': 's',
				'\u015D': 's',
				'\u1E61': 's',
				'\u0161': 's',
				'\u1E67': 's',
				'\u1E63': 's',
				'\u1E69': 's',
				'\u0219': 's',
				'\u015F': 's',
				'\u023F': 's',
				'\uA7A9': 's',
				'\uA785': 's',
				'\u1E9B': 's',
				'\u24E3': 't',
				'\uFF54': 't',
				'\u1E6B': 't',
				'\u1E97': 't',
				'\u0165': 't',
				'\u1E6D': 't',
				'\u021B': 't',
				'\u0163': 't',
				'\u1E71': 't',
				'\u1E6F': 't',
				'\u0167': 't',
				'\u01AD': 't',
				'\u0288': 't',
				'\u2C66': 't',
				'\uA787': 't',
				'\uA729': 'tz',
				'\u24E4': 'u',
				'\uFF55': 'u',
				'\u00F9': 'u',
				'\u00FA': 'u',
				'\u00FB': 'u',
				'\u0169': 'u',
				'\u1E79': 'u',
				'\u016B': 'u',
				'\u1E7B': 'u',
				'\u016D': 'u',
				'\u00FC': 'u',
				'\u01DC': 'u',
				'\u01D8': 'u',
				'\u01D6': 'u',
				'\u01DA': 'u',
				'\u1EE7': 'u',
				'\u016F': 'u',
				'\u0171': 'u',
				'\u01D4': 'u',
				'\u0215': 'u',
				'\u0217': 'u',
				'\u01B0': 'u',
				'\u1EEB': 'u',
				'\u1EE9': 'u',
				'\u1EEF': 'u',
				'\u1EED': 'u',
				'\u1EF1': 'u',
				'\u1EE5': 'u',
				'\u1E73': 'u',
				'\u0173': 'u',
				'\u1E77': 'u',
				'\u1E75': 'u',
				'\u0289': 'u',
				'\u24E5': 'v',
				'\uFF56': 'v',
				'\u1E7D': 'v',
				'\u1E7F': 'v',
				'\u028B': 'v',
				'\uA75F': 'v',
				'\u028C': 'v',
				'\uA761': 'vy',
				'\u24E6': 'w',
				'\uFF57': 'w',
				'\u1E81': 'w',
				'\u1E83': 'w',
				'\u0175': 'w',
				'\u1E87': 'w',
				'\u1E85': 'w',
				'\u1E98': 'w',
				'\u1E89': 'w',
				'\u2C73': 'w',
				'\u24E7': 'x',
				'\uFF58': 'x',
				'\u1E8B': 'x',
				'\u1E8D': 'x',
				'\u24E8': 'y',
				'\uFF59': 'y',
				'\u1EF3': 'y',
				'\u00FD': 'y',
				'\u0177': 'y',
				'\u1EF9': 'y',
				'\u0233': 'y',
				'\u1E8F': 'y',
				'\u00FF': 'y',
				'\u1EF7': 'y',
				'\u1E99': 'y',
				'\u1EF5': 'y',
				'\u01B4': 'y',
				'\u024F': 'y',
				'\u1EFF': 'y',
				'\u24E9': 'z',
				'\uFF5A': 'z',
				'\u017A': 'z',
				'\u1E91': 'z',
				'\u017C': 'z',
				'\u017E': 'z',
				'\u1E93': 'z',
				'\u1E95': 'z',
				'\u01B6': 'z',
				'\u0225': 'z',
				'\u0240': 'z',
				'\u2C6C': 'z',
				'\uA763': 'z',
				'\u0386': '\u0391',
				'\u0388': '\u0395',
				'\u0389': '\u0397',
				'\u038A': '\u0399',
				'\u03AA': '\u0399',
				'\u038C': '\u039F',
				'\u038E': '\u03A5',
				'\u03AB': '\u03A5',
				'\u038F': '\u03A9',
				'\u03AC': '\u03B1',
				'\u03AD': '\u03B5',
				'\u03AE': '\u03B7',
				'\u03AF': '\u03B9',
				'\u03CA': '\u03B9',
				'\u0390': '\u03B9',
				'\u03CC': '\u03BF',
				'\u03CD': '\u03C5',
				'\u03CB': '\u03C5',
				'\u03B0': '\u03C5',
				'\u03C9': '\u03C9',
				'\u03C2': '\u03C3'
			};

			return diacritics;
		});

		S2.define('select2/data/base', [
			'../utils'
		], function (Utils) {
			function BaseAdapter($element, options) {
				BaseAdapter.__super__.constructor.call(this);
			}

			Utils.Extend(BaseAdapter, Utils.Observable);

			BaseAdapter.prototype.current = function (callback) {
				throw new Error('The `current` method must be defined in child classes.');
			};

			BaseAdapter.prototype.query = function (params, callback) {
				throw new Error('The `query` method must be defined in child classes.');
			};

			BaseAdapter.prototype.bind = function (container, $container) {
				// Can be implemented in subclasses
			};

			BaseAdapter.prototype.destroy = function () {
				// Can be implemented in subclasses
			};

			BaseAdapter.prototype.generateResultId = function (container, data) {
				var id = container.id + '-result-';

				id += Utils.generateChars(4);

				if (data.id != null) {
					id += '-' + data.id.toString();
				} else {
					id += '-' + Utils.generateChars(4);
				}
				return id;
			};

			return BaseAdapter;
		});

		S2.define('select2/data/select', [
			'./base',
			'../utils',
			'jquery'
		], function (BaseAdapter, Utils, $) {
			function SelectAdapter($element, options) {
				this.$element = $element;
				this.options = options;

				SelectAdapter.__super__.constructor.call(this);
			}

			Utils.Extend(SelectAdapter, BaseAdapter);

			SelectAdapter.prototype.current = function (callback) {
				var data = [];
				var self = this;

				this.$element.find(':selected').each(function () {
					var $option = $(this);

					var option = self.item($option);

					data.push(option);
				});

				callback(data);
			};

			SelectAdapter.prototype.select = function (data) {
				var self = this;

				data.selected = true;

				// If data.element is a DOM node, use it instead
				if ($(data.element).is('option')) {
					data.element.selected = true;

					this.$element.trigger('change');

					return;
				}

				if (this.$element.prop('multiple')) {
					this.current(function (currentData) {
						var val = [];

						data = [data];
						data.push.apply(data, currentData);

						for (var d = 0; d < data.length; d++) {
							var id = data[d].id;

							if ($.inArray(id, val) === -1) {
								val.push(id);
							}
						}

						self.$element.val(val);
						self.$element.trigger('change');
					});
				} else {
					var val = data.id;

					this.$element.val(val);
					this.$element.trigger('change');
				}
			};

			SelectAdapter.prototype.unselect = function (data) {
				var self = this;

				if (!this.$element.prop('multiple')) {
					return;
				}

				data.selected = false;

				if ($(data.element).is('option')) {
					data.element.selected = false;

					this.$element.trigger('change');

					return;
				}

				this.current(function (currentData) {
					var val = [];

					for (var d = 0; d < currentData.length; d++) {
						var id = currentData[d].id;

						if (id !== data.id && $.inArray(id, val) === -1) {
							val.push(id);
						}
					}

					self.$element.val(val);

					self.$element.trigger('change');
				});
			};

			SelectAdapter.prototype.bind = function (container, $container) {
				var self = this;

				this.container = container;

				container.on('select', function (params) {
					self.select(params.data);
				});

				container.on('unselect', function (params) {
					self.unselect(params.data);
				});
			};

			SelectAdapter.prototype.destroy = function () {
				// Remove anything added to child elements
				this.$element.find('*').each(function () {
					// Remove any custom data set by Select2
					$.removeData(this, 'data');
				});
			};

			SelectAdapter.prototype.query = function (params, callback) {
				var data = [];
				var self = this;

				var $options = this.$element.children();

				$options.each(function () {
					var $option = $(this);

					if (!$option.is('option') && !$option.is('optgroup')) {
						return;
					}

					var option = self.item($option);

					var matches = self.matches(params, option);

					if (matches !== null) {
						data.push(matches);
					}
				});

				callback({
					results: data
				});
			};

			SelectAdapter.prototype.addOptions = function ($options) {
				Utils.appendMany(this.$element, $options);
			};

			SelectAdapter.prototype.option = function (data) {
				var option;

				if (data.children) {
					option = document.createElement('optgroup');
					option.label = data.text;
				} else {
					option = document.createElement('option');

					if (option.textContent !== undefined) {
						option.textContent = data.text;
					} else {
						option.innerText = data.text;
					}
				}

				if (data.id !== undefined) {
					option.value = data.id;
				}

				if (data.disabled) {
					option.disabled = true;
				}

				if (data.selected) {
					option.selected = true;
				}

				if (data.title) {
					option.title = data.title;
				}

				var $option = $(option);

				var normalizedData = this._normalizeItem(data);
				normalizedData.element = option;

				// Override the option's data with the combined data
				$.data(option, 'data', normalizedData);

				return $option;
			};

			SelectAdapter.prototype.item = function ($option) {
				var data = {};

				data = $.data($option[0], 'data');

				if (data != null) {
					return data;
				}

				if ($option.is('option')) {
					data = {
						id: $option.val(),
						text: $option.text(),
						disabled: $option.prop('disabled'),
						selected: $option.prop('selected'),
						title: $option.prop('title')
					};
				} else if ($option.is('optgroup')) {
					data = {
						text: $option.prop('label'),
						children: [],
						title: $option.prop('title')
					};

					var $children = $option.children('option');
					var children = [];

					for (var c = 0; c < $children.length; c++) {
						var $child = $($children[c]);

						var child = this.item($child);

						children.push(child);
					}

					data.children = children;
				}

				data = this._normalizeItem(data);
				data.element = $option[0];

				$.data($option[0], 'data', data);

				return data;
			};

			SelectAdapter.prototype._normalizeItem = function (item) {
				if (!$.isPlainObject(item)) {
					item = {
						id: item,
						text: item
					};
				}

				item = $.extend({}, {
					text: ''
				}, item);

				var defaults = {
					selected: false,
					disabled: false
				};

				if (item.id != null) {
					item.id = item.id.toString();
				}

				if (item.text != null) {
					item.text = item.text.toString();
				}

				if (item._resultId == null && item.id && this.container != null) {
					item._resultId = this.generateResultId(this.container, item);
				}

				return $.extend({}, defaults, item);
			};

			SelectAdapter.prototype.matches = function (params, data) {
				var matcher = this.options.get('matcher');

				return matcher(params, data);
			};

			return SelectAdapter;
		});

		S2.define('select2/data/array', [
			'./select',
			'../utils',
			'jquery'
		], function (SelectAdapter, Utils, $) {
			function ArrayAdapter($element, options) {
				var data = options.get('data') || [];

				ArrayAdapter.__super__.constructor.call(this, $element, options);

				this.addOptions(this.convertToOptions(data));
			}

			Utils.Extend(ArrayAdapter, SelectAdapter);

			ArrayAdapter.prototype.select = function (data) {
				var $option = this.$element.find('option').filter(function (i, elm) {
					return elm.value == data.id.toString();
				});

				if ($option.length === 0) {
					$option = this.option(data);

					this.addOptions($option);
				}

				ArrayAdapter.__super__.select.call(this, data);
			};

			ArrayAdapter.prototype.convertToOptions = function (data) {
				var self = this;

				var $existing = this.$element.find('option');
				var existingIds = $existing.map(function () {
					return self.item($(this)).id;
				}).get();

				var $options = [];

				// Filter out all items except for the one passed in the argument
				function onlyItem(item) {
					return function () {
						return $(this).val() == item.id;
					};
				}

				for (var d = 0; d < data.length; d++) {
					var item = this._normalizeItem(data[d]);

					// Skip items which were pre-loaded, only merge the data
					if ($.inArray(item.id, existingIds) >= 0) {
						var $existingOption = $existing.filter(onlyItem(item));

						var existingData = this.item($existingOption);
						var newData = $.extend(true, {}, item, existingData);

						var $newOption = this.option(newData);

						$existingOption.replaceWith($newOption);

						continue;
					}

					var $option = this.option(item);

					if (item.children) {
						var $children = this.convertToOptions(item.children);

						Utils.appendMany($option, $children);
					}

					$options.push($option);
				}

				return $options;
			};

			return ArrayAdapter;
		});

		S2.define('select2/data/ajax', [
			'./array',
			'../utils',
			'jquery'
		], function (ArrayAdapter, Utils, $) {
			function AjaxAdapter($element, options) {
				this.ajaxOptions = this._applyDefaults(options.get('ajax'));

				if (this.ajaxOptions.processResults != null) {
					this.processResults = this.ajaxOptions.processResults;
				}

				AjaxAdapter.__super__.constructor.call(this, $element, options);
			}

			Utils.Extend(AjaxAdapter, ArrayAdapter);

			AjaxAdapter.prototype._applyDefaults = function (options) {
				var defaults = {
					data: function (params) {
						return $.extend({}, params, {
							q: params.term
						});
					},
					transport: function (params, success, failure) {
						var $request = $.ajax(params);

						$request.then(success);
						$request.fail(failure);

						return $request;
					}
				};

				return $.extend({}, defaults, options, true);
			};

			AjaxAdapter.prototype.processResults = function (results) {
				return results;
			};

			AjaxAdapter.prototype.query = function (params, callback) {
				var matches = [];
				var self = this;

				if (this._request != null) {
					// JSONP requests cannot always be aborted
					if ($.isFunction(this._request.abort)) {
						this._request.abort();
					}

					this._request = null;
				}

				var options = $.extend({
					type: 'GET'
				}, this.ajaxOptions);

				if (typeof options.url === 'function') {
					options.url = options.url.call(this.$element, params);
				}

				if (typeof options.data === 'function') {
					options.data = options.data.call(this.$element, params);
				}

				function request() {
					var $request = options.transport(options, function (data) {
						var results = self.processResults(data, params);

						if (self.options.get('debug') && window.console && console.error) {
							// Check to make sure that the response included a `results` key.
							if (!results || !results.results || !$.isArray(results.results)) {
								console.error(
									'Select2: The AJAX results did not return an array in the ' +
									'`results` key of the response.'
								);
							}
						}

						callback(results);
					}, function () {
						// Attempt to detect if a request was aborted
						// Only works if the transport exposes a status property
						if ($request.status && $request.status === '0') {
							return;
						}

						self.trigger('results:message', {
							message: 'errorLoading'
						});
					});

					self._request = $request;
				}

				if (this.ajaxOptions.delay && params.term != null) {
					if (this._queryTimeout) {
						window.clearTimeout(this._queryTimeout);
					}

					this._queryTimeout = window.setTimeout(request, this.ajaxOptions.delay);
				} else {
					request();
				}
			};

			return AjaxAdapter;
		});

		S2.define('select2/data/tags', [
			'jquery'
		], function ($) {
			function Tags(decorated, $element, options) {
				var tags = options.get('tags');

				var createTag = options.get('createTag');

				if (createTag !== undefined) {
					this.createTag = createTag;
				}

				var insertTag = options.get('insertTag');

				if (insertTag !== undefined) {
					this.insertTag = insertTag;
				}

				decorated.call(this, $element, options);

				if ($.isArray(tags)) {
					for (var t = 0; t < tags.length; t++) {
						var tag = tags[t];
						var item = this._normalizeItem(tag);

						var $option = this.option(item);

						this.$element.append($option);
					}
				}
			}

			Tags.prototype.query = function (decorated, params, callback) {
				var self = this;

				this._removeOldTags();

				if (params.term == null || params.page != null) {
					decorated.call(this, params, callback);
					return;
				}

				function wrapper(obj, child) {
					var data = obj.results;

					for (var i = 0; i < data.length; i++) {
						var option = data[i];

						var checkChildren = (
							option.children != null &&
							!wrapper({
								results: option.children
							}, true)
						);

						var optionText = (option.text || '').toUpperCase();
						var paramsTerm = (params.term || '').toUpperCase();

						var checkText = optionText === paramsTerm;

						if (checkText || checkChildren) {
							if (child) {
								return false;
							}

							obj.data = data;
							callback(obj);

							return;
						}
					}

					if (child) {
						return true;
					}

					var tag = self.createTag(params);

					if (tag != null) {
						var $option = self.option(tag);
						$option.attr('data-select2-tag', true);

						self.addOptions([$option]);

						self.insertTag(data, tag);
					}

					obj.results = data;

					callback(obj);
				}

				decorated.call(this, params, wrapper);
			};

			Tags.prototype.createTag = function (decorated, params) {
				var term = $.trim(params.term);

				if (term === '') {
					return null;
				}

				return {
					id: term,
					text: term
				};
			};

			Tags.prototype.insertTag = function (_, data, tag) {
				data.unshift(tag);
			};

			Tags.prototype._removeOldTags = function (_) {
				var tag = this._lastTag;

				var $options = this.$element.find('option[data-select2-tag]');

				$options.each(function () {
					if (this.selected) {
						return;
					}

					$(this).remove();
				});
			};

			return Tags;
		});

		S2.define('select2/data/tokenizer', [
			'jquery'
		], function ($) {
			function Tokenizer(decorated, $element, options) {
				var tokenizer = options.get('tokenizer');

				if (tokenizer !== undefined) {
					this.tokenizer = tokenizer;
				}

				decorated.call(this, $element, options);
			}

			Tokenizer.prototype.bind = function (decorated, container, $container) {
				decorated.call(this, container, $container);

				this.$search = container.dropdown.$search || container.selection.$search ||
					$container.find('.select2-search__field');
			};

			Tokenizer.prototype.query = function (decorated, params, callback) {
				var self = this;

				function createAndSelect(data) {
					// Normalize the data object so we can use it for checks
					var item = self._normalizeItem(data);

					// Check if the data object already exists as a tag
					// Select it if it doesn't
					var $existingOptions = self.$element.find('option').filter(function () {
						return $(this).val() === item.id;
					});

					// If an existing option wasn't found for it, create the option
					if (!$existingOptions.length) {
						var $option = self.option(item);
						$option.attr('data-select2-tag', true);

						self._removeOldTags();
						self.addOptions([$option]);
					}

					// Select the item, now that we know there is an option for it
					select(item);
				}

				function select(data) {
					self.trigger('select', {
						data: data
					});
				}

				params.term = params.term || '';

				var tokenData = this.tokenizer(params, this.options, createAndSelect);

				if (tokenData.term !== params.term) {
					// Replace the search term if we have the search box
					if (this.$search.length) {
						this.$search.val(tokenData.term);
						this.$search.focus();
					}

					params.term = tokenData.term;
				}

				decorated.call(this, params, callback);
			};

			Tokenizer.prototype.tokenizer = function (_, params, options, callback) {
				var separators = options.get('tokenSeparators') || [];
				var term = params.term;
				var i = 0;

				var createTag = this.createTag || function (params) {
					return {
						id: params.term,
						text: params.term
					};
				};

				while (i < term.length) {
					var termChar = term[i];

					if ($.inArray(termChar, separators) === -1) {
						i++;

						continue;
					}

					var part = term.substr(0, i);
					var partParams = $.extend({}, params, {
						term: part
					});

					var data = createTag(partParams);

					if (data == null) {
						i++;
						continue;
					}

					callback(data);

					// Reset the term to not include the tokenized portion
					term = term.substr(i + 1) || '';
					i = 0;
				}

				return {
					term: term
				};
			};

			return Tokenizer;
		});

		S2.define('select2/data/minimumInputLength', [

		], function () {
			function MinimumInputLength(decorated, $e, options) {
				this.minimumInputLength = options.get('minimumInputLength');

				decorated.call(this, $e, options);
			}

			MinimumInputLength.prototype.query = function (decorated, params, callback) {
				params.term = params.term || '';

				if (params.term.length < this.minimumInputLength) {
					this.trigger('results:message', {
						message: 'inputTooShort',
						args: {
							minimum: this.minimumInputLength,
							input: params.term,
							params: params
						}
					});

					return;
				}

				decorated.call(this, params, callback);
			};

			return MinimumInputLength;
		});

		S2.define('select2/data/maximumInputLength', [

		], function () {
			function MaximumInputLength(decorated, $e, options) {
				this.maximumInputLength = options.get('maximumInputLength');

				decorated.call(this, $e, options);
			}

			MaximumInputLength.prototype.query = function (decorated, params, callback) {
				params.term = params.term || '';

				if (this.maximumInputLength > 0 &&
					params.term.length > this.maximumInputLength) {
					this.trigger('results:message', {
						message: 'inputTooLong',
						args: {
							maximum: this.maximumInputLength,
							input: params.term,
							params: params
						}
					});

					return;
				}

				decorated.call(this, params, callback);
			};

			return MaximumInputLength;
		});

		S2.define('select2/data/maximumSelectionLength', [

		], function () {
			function MaximumSelectionLength(decorated, $e, options) {
				this.maximumSelectionLength = options.get('maximumSelectionLength');

				decorated.call(this, $e, options);
			}

			MaximumSelectionLength.prototype.query =
				function (decorated, params, callback) {
					var self = this;

					this.current(function (currentData) {
						var count = currentData != null ? currentData.length : 0;
						if (self.maximumSelectionLength > 0 &&
							count >= self.maximumSelectionLength) {
							self.trigger('results:message', {
								message: 'maximumSelected',
								args: {
									maximum: self.maximumSelectionLength
								}
							});
							return;
						}
						decorated.call(self, params, callback);
					});
				};

			return MaximumSelectionLength;
		});

		S2.define('select2/dropdown', [
			'jquery',
			'./utils'
		], function ($, Utils) {
			function Dropdown($element, options) {
				this.$element = $element;
				this.options = options;

				Dropdown.__super__.constructor.call(this);
			}

			Utils.Extend(Dropdown, Utils.Observable);

			Dropdown.prototype.render = function () {
				var $dropdown = $(
					'<span class="select2-dropdown">' +
					'<span class="select2-results"></span>' +
					'</span>'
				);

				$dropdown.attr('dir', this.options.get('dir'));

				this.$dropdown = $dropdown;

				return $dropdown;
			};

			Dropdown.prototype.bind = function () {
				// Should be implemented in subclasses
			};

			Dropdown.prototype.position = function ($dropdown, $container) {
				// Should be implmented in subclasses
			};

			Dropdown.prototype.destroy = function () {
				// Remove the dropdown from the DOM
				this.$dropdown.remove();
			};

			return Dropdown;
		});

		S2.define('select2/dropdown/search', [
			'jquery',
			'../utils'
		], function ($, Utils) {
			function Search() { }

			Search.prototype.render = function (decorated) {
				var $rendered = decorated.call(this);

				var $search = $(
					'<span class="select2-search select2-search--dropdown">' +
					'<input class="select2-search__field" type="search" tabindex="-1"' +
					' autocomplete="off" autocorrect="off" autocapitalize="off"' +
					' spellcheck="false" role="textbox" />' +
					'</span>'
				);

				this.$searchContainer = $search;
				this.$search = $search.find('input');

				$rendered.prepend($search);

				return $rendered;
			};

			Search.prototype.bind = function (decorated, container, $container) {
				var self = this;

				decorated.call(this, container, $container);

				this.$search.on('keydown', function (evt) {
					self.trigger('keypress', evt);

					self._keyUpPrevented = evt.isDefaultPrevented();
				});

				// Workaround for browsers which do not support the `input` event
				// This will prevent double-triggering of events for browsers which support
				// both the `keyup` and `input` events.
				this.$search.on('input', function (evt) {
					// Unbind the duplicated `keyup` event
					$(this).off('keyup');
				});

				this.$search.on('keyup input', function (evt) {
					self.handleSearch(evt);
				});

				container.on('open', function () {
					self.$search.attr('tabindex', 0);

					self.$search.focus();

					window.setTimeout(function () {
						self.$search.focus();
					}, 0);
				});

				container.on('close', function () {
					self.$search.attr('tabindex', -1);

					self.$search.val('');
				});

				container.on('focus', function () {
					if (container.isOpen()) {
						self.$search.focus();
					}
				});

				container.on('results:all', function (params) {
					if (params.query.term == null || params.query.term === '') {
						var showSearch = self.showSearch(params);

						if (showSearch) {
							self.$searchContainer.removeClass('select2-search--hide');
						} else {
							self.$searchContainer.addClass('select2-search--hide');
						}
					}
				});
			};

			Search.prototype.handleSearch = function (evt) {
				if (!this._keyUpPrevented) {
					var input = this.$search.val();

					this.trigger('query', {
						term: input
					});
				}

				this._keyUpPrevented = false;
			};

			Search.prototype.showSearch = function (_, params) {
				return true;
			};

			return Search;
		});

		S2.define('select2/dropdown/hidePlaceholder', [

		], function () {
			function HidePlaceholder(decorated, $element, options, dataAdapter) {
				this.placeholder = this.normalizePlaceholder(options.get('placeholder'));

				decorated.call(this, $element, options, dataAdapter);
			}

			HidePlaceholder.prototype.append = function (decorated, data) {
				data.results = this.removePlaceholder(data.results);

				decorated.call(this, data);
			};

			HidePlaceholder.prototype.normalizePlaceholder = function (_, placeholder) {
				if (typeof placeholder === 'string') {
					placeholder = {
						id: '',
						text: placeholder
					};
				}

				return placeholder;
			};

			HidePlaceholder.prototype.removePlaceholder = function (_, data) {
				var modifiedData = data.slice(0);

				for (var d = data.length - 1; d >= 0; d--) {
					var item = data[d];

					if (this.placeholder.id === item.id) {
						modifiedData.splice(d, 1);
					}
				}

				return modifiedData;
			};

			return HidePlaceholder;
		});

		S2.define('select2/dropdown/infiniteScroll', [
			'jquery'
		], function ($) {
			function InfiniteScroll(decorated, $element, options, dataAdapter) {
				this.lastParams = {};

				decorated.call(this, $element, options, dataAdapter);

				this.$loadingMore = this.createLoadingMore();
				this.loading = false;
			}

			InfiniteScroll.prototype.append = function (decorated, data) {
				this.$loadingMore.remove();
				this.loading = false;

				decorated.call(this, data);

				if (this.showLoadingMore(data)) {
					this.$results.append(this.$loadingMore);
				}
			};

			InfiniteScroll.prototype.bind = function (decorated, container, $container) {
				var self = this;

				decorated.call(this, container, $container);

				container.on('query', function (params) {
					self.lastParams = params;
					self.loading = true;
				});

				container.on('query:append', function (params) {
					self.lastParams = params;
					self.loading = true;
				});

				this.$results.on('scroll', function () {
					var isLoadMoreVisible = $.contains(
						document.documentElement,
						self.$loadingMore[0]
					);

					if (self.loading || !isLoadMoreVisible) {
						return;
					}

					var currentOffset = self.$results.offset().top +
						self.$results.outerHeight(false);
					var loadingMoreOffset = self.$loadingMore.offset().top +
						self.$loadingMore.outerHeight(false);

					if (currentOffset + 50 >= loadingMoreOffset) {
						self.loadMore();
					}
				});
			};

			InfiniteScroll.prototype.loadMore = function () {
				this.loading = true;

				var params = $.extend({}, { page: 1 }, this.lastParams);

				params.page++;

				this.trigger('query:append', params);
			};

			InfiniteScroll.prototype.showLoadingMore = function (_, data) {
				return data.pagination && data.pagination.more;
			};

			InfiniteScroll.prototype.createLoadingMore = function () {
				var $option = $(
					'<li ' +
					'class="select2-results__option select2-results__option--load-more"' +
					'role="treeitem" aria-disabled="true"></li>'
				);

				var message = this.options.get('translations').get('loadingMore');

				$option.html(message(this.lastParams));

				return $option;
			};

			return InfiniteScroll;
		});

		S2.define('select2/dropdown/attachBody', [
			'jquery',
			'../utils'
		], function ($, Utils) {
			function AttachBody(decorated, $element, options) {
				this.$dropdownParent = options.get('dropdownParent') || $(document.body);

				decorated.call(this, $element, options);
			}

			AttachBody.prototype.bind = function (decorated, container, $container) {
				var self = this;

				var setupResultsEvents = false;

				decorated.call(this, container, $container);

				container.on('open', function () {
					self._showDropdown();
					self._attachPositioningHandler(container);

					if (!setupResultsEvents) {
						setupResultsEvents = true;

						container.on('results:all', function () {
							self._positionDropdown();
							self._resizeDropdown();
						});

						container.on('results:append', function () {
							self._positionDropdown();
							self._resizeDropdown();
						});
					}
				});

				container.on('close', function () {
					self._hideDropdown();
					self._detachPositioningHandler(container);
				});

				this.$dropdownContainer.on('mousedown', function (evt) {
					evt.stopPropagation();
				});
			};

			AttachBody.prototype.destroy = function (decorated) {
				decorated.call(this);

				this.$dropdownContainer.remove();
			};

			AttachBody.prototype.position = function (decorated, $dropdown, $container) {
				// Clone all of the container classes
				$dropdown.attr('class', $container.attr('class'));

				$dropdown.removeClass('select2');
				$dropdown.addClass('select2-container--open');

				$dropdown.css({
					position: 'absolute',
					top: -999999
				});

				this.$container = $container;
			};

			AttachBody.prototype.render = function (decorated) {
				var $container = $('<span></span>');

				var $dropdown = decorated.call(this);
				$container.append($dropdown);

				this.$dropdownContainer = $container;

				return $container;
			};

			AttachBody.prototype._hideDropdown = function (decorated) {
				this.$dropdownContainer.detach();
			};

			AttachBody.prototype._attachPositioningHandler =
				function (decorated, container) {
					var self = this;

					var scrollEvent = 'scroll.select2.' + container.id;
					var resizeEvent = 'resize.select2.' + container.id;
					var orientationEvent = 'orientationchange.select2.' + container.id;

					var $watchers = this.$container.parents().filter(Utils.hasScroll);
					$watchers.each(function () {
						$(this).data('select2-scroll-position', {
							x: $(this).scrollLeft(),
							y: $(this).scrollTop()
						});
					});

					$watchers.on(scrollEvent, function (ev) {
						var position = $(this).data('select2-scroll-position');
						$(this).scrollTop(position.y);
					});

					$(window).on(scrollEvent + ' ' + resizeEvent + ' ' + orientationEvent,
						function (e) {
							self._positionDropdown();
							self._resizeDropdown();
						});
				};

			AttachBody.prototype._detachPositioningHandler =
				function (decorated, container) {
					var scrollEvent = 'scroll.select2.' + container.id;
					var resizeEvent = 'resize.select2.' + container.id;
					var orientationEvent = 'orientationchange.select2.' + container.id;

					var $watchers = this.$container.parents().filter(Utils.hasScroll);
					$watchers.off(scrollEvent);

					$(window).off(scrollEvent + ' ' + resizeEvent + ' ' + orientationEvent);
				};

			AttachBody.prototype._positionDropdown = function () {
				var $window = $(window);

				var isCurrentlyAbove = this.$dropdown.hasClass('select2-dropdown--above');
				var isCurrentlyBelow = this.$dropdown.hasClass('select2-dropdown--below');

				var newDirection = null;

				var offset = this.$container.offset();

				offset.bottom = offset.top + this.$container.outerHeight(false);

				var container = {
					height: this.$container.outerHeight(false)
				};

				container.top = offset.top;
				container.bottom = offset.top + container.height;

				var dropdown = {
					height: this.$dropdown.outerHeight(false)
				};

				var viewport = {
					top: $window.scrollTop(),
					bottom: $window.scrollTop() + $window.height()
				};

				var enoughRoomAbove = viewport.top < (offset.top - dropdown.height);
				var enoughRoomBelow = viewport.bottom > (offset.bottom + dropdown.height);

				var css = {
					left: offset.left,
					top: container.bottom
				};

				// Determine what the parent element is to use for calciulating the offset
				var $offsetParent = this.$dropdownParent;

				// For statically positoned elements, we need to get the element
				// that is determining the offset
				if ($offsetParent.css('position') === 'static') {
					$offsetParent = $offsetParent.offsetParent();
				}

				var parentOffset = $offsetParent.offset();

				css.top -= parentOffset.top;
				css.left -= parentOffset.left;

				if (!isCurrentlyAbove && !isCurrentlyBelow) {
					newDirection = 'below';
				}

				if (!enoughRoomBelow && enoughRoomAbove && !isCurrentlyAbove) {
					newDirection = 'above';
				} else if (!enoughRoomAbove && enoughRoomBelow && isCurrentlyAbove) {
					newDirection = 'below';
				}

				if (newDirection == 'above' ||
					(isCurrentlyAbove && newDirection !== 'below')) {
					css.top = container.top - parentOffset.top - dropdown.height;
				}

				if (newDirection != null) {
					this.$dropdown
						.removeClass('select2-dropdown--below select2-dropdown--above')
						.addClass('select2-dropdown--' + newDirection);
					this.$container
						.removeClass('select2-container--below select2-container--above')
						.addClass('select2-container--' + newDirection);
				}

				this.$dropdownContainer.css(css);
			};

			AttachBody.prototype._resizeDropdown = function () {
				var css = {
					width: this.$container.outerWidth(false) + 'px'
				};

				if (this.options.get('dropdownAutoWidth')) {
					css.minWidth = css.width;
					css.position = 'relative';
					css.width = 'auto';
				}

				this.$dropdown.css(css);
			};

			AttachBody.prototype._showDropdown = function (decorated) {
				this.$dropdownContainer.appendTo(this.$dropdownParent);

				this._positionDropdown();
				this._resizeDropdown();
			};

			return AttachBody;
		});

		S2.define('select2/dropdown/minimumResultsForSearch', [

		], function () {
			function countResults(data) {
				var count = 0;

				for (var d = 0; d < data.length; d++) {
					var item = data[d];

					if (item.children) {
						count += countResults(item.children);
					} else {
						count++;
					}
				}

				return count;
			}

			function MinimumResultsForSearch(decorated, $element, options, dataAdapter) {
				this.minimumResultsForSearch = options.get('minimumResultsForSearch');

				if (this.minimumResultsForSearch < 0) {
					this.minimumResultsForSearch = Infinity;
				}

				decorated.call(this, $element, options, dataAdapter);
			}

			MinimumResultsForSearch.prototype.showSearch = function (decorated, params) {
				if (countResults(params.data.results) < this.minimumResultsForSearch) {
					return false;
				}

				return decorated.call(this, params);
			};

			return MinimumResultsForSearch;
		});

		S2.define('select2/dropdown/selectOnClose', [

		], function () {
			function SelectOnClose() { }

			SelectOnClose.prototype.bind = function (decorated, container, $container) {
				var self = this;

				decorated.call(this, container, $container);

				container.on('close', function (params) {
					self._handleSelectOnClose(params);
				});
			};

			SelectOnClose.prototype._handleSelectOnClose = function (_, params) {
				if (params && params.originalSelect2Event != null) {
					var event = params.originalSelect2Event;

					// Don't select an item if the close event was triggered from a select or
					// unselect event
					if (event._type === 'select' || event._type === 'unselect') {
						return;
					}
				}

				var $highlightedResults = this.getHighlightedResults();

				// Only select highlighted results
				if ($highlightedResults.length < 1) {
					return;
				}

				var data = $highlightedResults.data('data');

				// Don't re-select already selected resulte
				if (
					(data.element != null && data.element.selected) ||
					(data.element == null && data.selected)
				) {
					return;
				}

				this.trigger('select', {
					data: data
				});
			};

			return SelectOnClose;
		});

		S2.define('select2/dropdown/closeOnSelect', [

		], function () {
			function CloseOnSelect() { }

			CloseOnSelect.prototype.bind = function (decorated, container, $container) {
				var self = this;

				decorated.call(this, container, $container);

				container.on('select', function (evt) {
					self._selectTriggered(evt);
				});

				container.on('unselect', function (evt) {
					self._selectTriggered(evt);
				});
			};

			CloseOnSelect.prototype._selectTriggered = function (_, evt) {
				var originalEvent = evt.originalEvent;

				// Don't close if the control key is being held
				if (originalEvent && originalEvent.ctrlKey) {
					return;
				}

				this.trigger('close', {
					originalEvent: originalEvent,
					originalSelect2Event: evt
				});
			};

			return CloseOnSelect;
		});

		S2.define('select2/i18n/en', [], function () {
			// English
			return {
				errorLoading: function () {
					return 'The results could not be loaded.';
				},
				inputTooLong: function (args) {
					var overChars = args.input.length - args.maximum;

					var message = 'Please delete ' + overChars + ' character';

					if (overChars != 1) {
						message += 's';
					}

					return message;
				},
				inputTooShort: function (args) {
					var remainingChars = args.minimum - args.input.length;

					var message = 'Please enter ' + remainingChars + ' or more characters';

					return message;
				},
				loadingMore: function () {
					return 'Loading more results…';
				},
				maximumSelected: function (args) {
					var message = 'You can only select ' + args.maximum + ' item';

					if (args.maximum != 1) {
						message += 's';
					}

					return message;
				},
				noResults: function () {
					return 'No results found';
				},
				searching: function () {
					return 'Searching…';
				}
			};
		});

		S2.define('select2/defaults', [
			'jquery',
			'require',

			'./results',

			'./selection/single',
			'./selection/multiple',
			'./selection/placeholder',
			'./selection/allowClear',
			'./selection/search',
			'./selection/eventRelay',

			'./utils',
			'./translation',
			'./diacritics',

			'./data/select',
			'./data/array',
			'./data/ajax',
			'./data/tags',
			'./data/tokenizer',
			'./data/minimumInputLength',
			'./data/maximumInputLength',
			'./data/maximumSelectionLength',

			'./dropdown',
			'./dropdown/search',
			'./dropdown/hidePlaceholder',
			'./dropdown/infiniteScroll',
			'./dropdown/attachBody',
			'./dropdown/minimumResultsForSearch',
			'./dropdown/selectOnClose',
			'./dropdown/closeOnSelect',

			'./i18n/en'
		], function ($, require,

			ResultsList,

			SingleSelection, MultipleSelection, Placeholder, AllowClear,
			SelectionSearch, EventRelay,

			Utils, Translation, DIACRITICS,

			SelectData, ArrayData, AjaxData, Tags, Tokenizer,
			MinimumInputLength, MaximumInputLength, MaximumSelectionLength,

			Dropdown, DropdownSearch, HidePlaceholder, InfiniteScroll,
			AttachBody, MinimumResultsForSearch, SelectOnClose, CloseOnSelect,

			EnglishTranslation) {
				function Defaults() {
					this.reset();
				}

				Defaults.prototype.apply = function (options) {
					options = $.extend(true, {}, this.defaults, options);

					if (options.dataAdapter == null) {
						if (options.ajax != null) {
							options.dataAdapter = AjaxData;
						} else if (options.data != null) {
							options.dataAdapter = ArrayData;
						} else {
							options.dataAdapter = SelectData;
						}

						if (options.minimumInputLength > 0) {
							options.dataAdapter = Utils.Decorate(
								options.dataAdapter,
								MinimumInputLength
							);
						}

						if (options.maximumInputLength > 0) {
							options.dataAdapter = Utils.Decorate(
								options.dataAdapter,
								MaximumInputLength
							);
						}

						if (options.maximumSelectionLength > 0) {
							options.dataAdapter = Utils.Decorate(
								options.dataAdapter,
								MaximumSelectionLength
							);
						}

						if (options.tags) {
							options.dataAdapter = Utils.Decorate(options.dataAdapter, Tags);
						}

						if (options.tokenSeparators != null || options.tokenizer != null) {
							options.dataAdapter = Utils.Decorate(
								options.dataAdapter,
								Tokenizer
							);
						}

						if (options.query != null) {
							var Query = require(options.amdBase + 'compat/query');

							options.dataAdapter = Utils.Decorate(
								options.dataAdapter,
								Query
							);
						}

						if (options.initSelection != null) {
							var InitSelection = require(options.amdBase + 'compat/initSelection');

							options.dataAdapter = Utils.Decorate(
								options.dataAdapter,
								InitSelection
							);
						}
					}

					if (options.resultsAdapter == null) {
						options.resultsAdapter = ResultsList;

						if (options.ajax != null) {
							options.resultsAdapter = Utils.Decorate(
								options.resultsAdapter,
								InfiniteScroll
							);
						}

						if (options.placeholder != null) {
							options.resultsAdapter = Utils.Decorate(
								options.resultsAdapter,
								HidePlaceholder
							);
						}

						if (options.selectOnClose) {
							options.resultsAdapter = Utils.Decorate(
								options.resultsAdapter,
								SelectOnClose
							);
						}
					}

					if (options.dropdownAdapter == null) {
						if (options.multiple) {
							options.dropdownAdapter = Dropdown;
						} else {
							var SearchableDropdown = Utils.Decorate(Dropdown, DropdownSearch);

							options.dropdownAdapter = SearchableDropdown;
						}

						if (options.minimumResultsForSearch !== 0) {
							options.dropdownAdapter = Utils.Decorate(
								options.dropdownAdapter,
								MinimumResultsForSearch
							);
						}

						if (options.closeOnSelect) {
							options.dropdownAdapter = Utils.Decorate(
								options.dropdownAdapter,
								CloseOnSelect
							);
						}

						if (
							options.dropdownCssClass != null ||
							options.dropdownCss != null ||
							options.adaptDropdownCssClass != null
						) {
							var DropdownCSS = require(options.amdBase + 'compat/dropdownCss');

							options.dropdownAdapter = Utils.Decorate(
								options.dropdownAdapter,
								DropdownCSS
							);
						}

						options.dropdownAdapter = Utils.Decorate(
							options.dropdownAdapter,
							AttachBody
						);
					}

					if (options.selectionAdapter == null) {
						if (options.multiple) {
							options.selectionAdapter = MultipleSelection;
						} else {
							options.selectionAdapter = SingleSelection;
						}

						// Add the placeholder mixin if a placeholder was specified
						if (options.placeholder != null) {
							options.selectionAdapter = Utils.Decorate(
								options.selectionAdapter,
								Placeholder
							);
						}

						if (options.allowClear) {
							options.selectionAdapter = Utils.Decorate(
								options.selectionAdapter,
								AllowClear
							);
						}

						if (options.multiple) {
							options.selectionAdapter = Utils.Decorate(
								options.selectionAdapter,
								SelectionSearch
							);
						}

						if (
							options.containerCssClass != null ||
							options.containerCss != null ||
							options.adaptContainerCssClass != null
						) {
							var ContainerCSS = require(options.amdBase + 'compat/containerCss');

							options.selectionAdapter = Utils.Decorate(
								options.selectionAdapter,
								ContainerCSS
							);
						}

						options.selectionAdapter = Utils.Decorate(
							options.selectionAdapter,
							EventRelay
						);
					}

					if (typeof options.language === 'string') {
						// Check if the language is specified with a region
						if (options.language.indexOf('-') > 0) {
							// Extract the region information if it is included
							var languageParts = options.language.split('-');
							var baseLanguage = languageParts[0];

							options.language = [options.language, baseLanguage];
						} else {
							options.language = [options.language];
						}
					}

					if ($.isArray(options.language)) {
						var languages = new Translation();
						options.language.push('en');

						var languageNames = options.language;

						for (var l = 0; l < languageNames.length; l++) {
							var name = languageNames[l];
							var language = {};

							try {
								// Try to load it with the original name
								language = Translation.loadPath(name);
							} catch (e) {
								try {
									// If we couldn't load it, check if it wasn't the full path
									name = this.defaults.amdLanguageBase + name;
									language = Translation.loadPath(name);
								} catch (ex) {
									// The translation could not be loaded at all. Sometimes this is
									// because of a configuration problem, other times this can be
									// because of how Select2 helps load all possible translation files.
									if (options.debug && window.console && console.warn) {
										console.warn(
											'Select2: The language file for "' + name + '" could not be ' +
											'automatically loaded. A fallback will be used instead.'
										);
									}

									continue;
								}
							}

							languages.extend(language);
						}

						options.translations = languages;
					} else {
						var baseTranslation = Translation.loadPath(
							this.defaults.amdLanguageBase + 'en'
						);
						var customTranslation = new Translation(options.language);

						customTranslation.extend(baseTranslation);

						options.translations = customTranslation;
					}

					return options;
				};

				Defaults.prototype.reset = function () {
					function stripDiacritics(text) {
						// Used 'uni range + named function' from http://jsperf.com/diacritics/18
						function match(a) {
							return DIACRITICS[a] || a;
						}

						return text.replace(/[^\u0000-\u007E]/g, match);
					}

					function matcher(params, data) {
						// Always return the object if there is nothing to compare
						if ($.trim(params.term) === '') {
							return data;
						}

						// Do a recursive check for options with children
						if (data.children && data.children.length > 0) {
							// Clone the data object if there are children
							// This is required as we modify the object to remove any non-matches
							var match = $.extend(true, {}, data);

							// Check each child of the option
							for (var c = data.children.length - 1; c >= 0; c--) {
								var child = data.children[c];

								var matches = matcher(params, child);

								// If there wasn't a match, remove the object in the array
								if (matches == null) {
									match.children.splice(c, 1);
								}
							}

							// If any children matched, return the new object
							if (match.children.length > 0) {
								return match;
							}

							// If there were no matching children, check just the plain object
							return matcher(params, match);
						}

						var original = stripDiacritics(data.text).toUpperCase();
						var term = stripDiacritics(params.term).toUpperCase();

						// Check if the text contains the term
						if (original.indexOf(term) > -1) {
							return data;
						}

						// If it doesn't contain the term, don't return anything
						return null;
					}

					this.defaults = {
						amdBase: './',
						amdLanguageBase: './i18n/',
						closeOnSelect: true,
						debug: false,
						dropdownAutoWidth: false,
						escapeMarkup: Utils.escapeMarkup,
						language: EnglishTranslation,
						matcher: matcher,
						minimumInputLength: 0,
						maximumInputLength: 0,
						maximumSelectionLength: 0,
						minimumResultsForSearch: 0,
						selectOnClose: false,
						sorter: function (data) {
							return data;
						},
						templateResult: function (result) {
							return result.text;
						},
						templateSelection: function (selection) {
							return selection.text;
						},
						theme: 'default',
						width: 'resolve'
					};
				};

				Defaults.prototype.set = function (key, value) {
					var camelKey = $.camelCase(key);

					var data = {};
					data[camelKey] = value;

					var convertedData = Utils._convertData(data);

					$.extend(this.defaults, convertedData);
				};

				var defaults = new Defaults();

				return defaults;
			});

		S2.define('select2/options', [
			'require',
			'jquery',
			'./defaults',
			'./utils'
		], function (require, $, Defaults, Utils) {
			function Options(options, $element) {
				this.options = options;

				if ($element != null) {
					this.fromElement($element);
				}

				this.options = Defaults.apply(this.options);

				if ($element && $element.is('input')) {
					var InputCompat = require(this.get('amdBase') + 'compat/inputData');

					this.options.dataAdapter = Utils.Decorate(
						this.options.dataAdapter,
						InputCompat
					);
				}
			}

			Options.prototype.fromElement = function ($e) {
				var excludedData = ['select2'];

				if (this.options.multiple == null) {
					this.options.multiple = $e.prop('multiple');
				}

				if (this.options.disabled == null) {
					this.options.disabled = $e.prop('disabled');
				}

				if (this.options.language == null) {
					if ($e.prop('lang')) {
						this.options.language = $e.prop('lang').toLowerCase();
					} else if ($e.closest('[lang]').prop('lang')) {
						this.options.language = $e.closest('[lang]').prop('lang');
					}
				}

				if (this.options.dir == null) {
					if ($e.prop('dir')) {
						this.options.dir = $e.prop('dir');
					} else if ($e.closest('[dir]').prop('dir')) {
						this.options.dir = $e.closest('[dir]').prop('dir');
					} else {
						this.options.dir = 'ltr';
					}
				}

				$e.prop('disabled', this.options.disabled);
				$e.prop('multiple', this.options.multiple);

				if ($e.data('select2Tags')) {
					if (this.options.debug && window.console && console.warn) {
						console.warn(
							'Select2: The `data-select2-tags` attribute has been changed to ' +
							'use the `data-data` and `data-tags="true"` attributes and will be ' +
							'removed in future versions of Select2.'
						);
					}

					$e.data('data', $e.data('select2Tags'));
					$e.data('tags', true);
				}

				if ($e.data('ajaxUrl')) {
					if (this.options.debug && window.console && console.warn) {
						console.warn(
							'Select2: The `data-ajax-url` attribute has been changed to ' +
							'`data-ajax--url` and support for the old attribute will be removed' +
							' in future versions of Select2.'
						);
					}

					$e.attr('ajax--url', $e.data('ajaxUrl'));
					$e.data('ajax--url', $e.data('ajaxUrl'));
				}

				var dataset = {};

				// Prefer the element's `dataset` attribute if it exists
				// jQuery 1.x does not correctly handle data attributes with multiple dashes
				if ($.fn.jquery && $.fn.jquery.substr(0, 2) == '1.' && $e[0].dataset) {
					dataset = $.extend(true, {}, $e[0].dataset, $e.data());
				} else {
					dataset = $e.data();
				}

				var data = $.extend(true, {}, dataset);

				data = Utils._convertData(data);

				for (var key in data) {
					if ($.inArray(key, excludedData) > -1) {
						continue;
					}

					if ($.isPlainObject(this.options[key])) {
						$.extend(this.options[key], data[key]);
					} else {
						this.options[key] = data[key];
					}
				}

				return this;
			};

			Options.prototype.get = function (key) {
				return this.options[key];
			};

			Options.prototype.set = function (key, val) {
				this.options[key] = val;
			};

			return Options;
		});

		S2.define('select2/core', [
			'jquery',
			'./options',
			'./utils',
			'./keys'
		], function ($, Options, Utils, KEYS) {
			var Select2 = function ($element, options) {
				if ($element.data('select2') != null) {
					$element.data('select2').destroy();
				}

				this.$element = $element;

				this.id = this._generateId($element);

				options = options || {};

				this.options = new Options(options, $element);

				Select2.__super__.constructor.call(this);

				// Set up the tabindex

				var tabindex = $element.attr('tabindex') || 0;
				$element.data('old-tabindex', tabindex);
				$element.attr('tabindex', '-1');

				// Set up containers and adapters

				var DataAdapter = this.options.get('dataAdapter');
				this.dataAdapter = new DataAdapter($element, this.options);

				var $container = this.render();

				this._placeContainer($container);

				var SelectionAdapter = this.options.get('selectionAdapter');
				this.selection = new SelectionAdapter($element, this.options);
				this.$selection = this.selection.render();

				this.selection.position(this.$selection, $container);

				var DropdownAdapter = this.options.get('dropdownAdapter');
				this.dropdown = new DropdownAdapter($element, this.options);
				this.$dropdown = this.dropdown.render();

				this.dropdown.position(this.$dropdown, $container);

				var ResultsAdapter = this.options.get('resultsAdapter');
				this.results = new ResultsAdapter($element, this.options, this.dataAdapter);
				this.$results = this.results.render();

				this.results.position(this.$results, this.$dropdown);

				// Bind events

				var self = this;

				// Bind the container to all of the adapters
				this._bindAdapters();

				// Register any DOM event handlers
				this._registerDomEvents();

				// Register any internal event handlers
				this._registerDataEvents();
				this._registerSelectionEvents();
				this._registerDropdownEvents();
				this._registerResultsEvents();
				this._registerEvents();

				// Set the initial state
				this.dataAdapter.current(function (initialData) {
					self.trigger('selection:update', {
						data: initialData
					});
				});

				// Hide the original select
				$element.addClass('select2-hidden-accessible');
				$element.attr('aria-hidden', 'true');

				// Synchronize any monitored attributes
				this._syncAttributes();

				$element.data('select2', this);
			};

			Utils.Extend(Select2, Utils.Observable);

			Select2.prototype._generateId = function ($element) {
				var id = '';

				if ($element.attr('id') != null) {
					id = $element.attr('id');
				} else if ($element.attr('name') != null) {
					id = $element.attr('name') + '-' + Utils.generateChars(2);
				} else {
					id = Utils.generateChars(4);
				}

				id = id.replace(/(:|\.|\[|\]|,)/g, '');
				id = 'select2-' + id;

				return id;
			};

			Select2.prototype._placeContainer = function ($container) {
				$container.insertAfter(this.$element);

				var width = this._resolveWidth(this.$element, this.options.get('width'));

				if (width != null) {
					$container.css('width', width);
				}
			};

			Select2.prototype._resolveWidth = function ($element, method) {
				var WIDTH = /^width:(([-+]?([0-9]*\.)?[0-9]+)(px|em|ex|%|in|cm|mm|pt|pc))/i;

				if (method == 'resolve') {
					var styleWidth = this._resolveWidth($element, 'style');

					if (styleWidth != null) {
						return styleWidth;
					}

					return this._resolveWidth($element, 'element');
				}

				if (method == 'element') {
					var elementWidth = $element.outerWidth(false);

					if (elementWidth <= 0) {
						return 'auto';
					}

					return elementWidth + 'px';
				}

				if (method == 'style') {
					var style = $element.attr('style');

					if (typeof (style) !== 'string') {
						return null;
					}

					var attrs = style.split(';');

					for (var i = 0, l = attrs.length; i < l; i = i + 1) {
						var attr = attrs[i].replace(/\s/g, '');
						var matches = attr.match(WIDTH);

						if (matches !== null && matches.length >= 1) {
							return matches[1];
						}
					}

					return null;
				}

				return method;
			};

			Select2.prototype._bindAdapters = function () {
				this.dataAdapter.bind(this, this.$container);
				this.selection.bind(this, this.$container);

				this.dropdown.bind(this, this.$container);
				this.results.bind(this, this.$container);
			};

			Select2.prototype._registerDomEvents = function () {
				var self = this;

				this.$element.on('change.select2', function () {
					self.dataAdapter.current(function (data) {
						self.trigger('selection:update', {
							data: data
						});
					});
				});

				this.$element.on('focus.select2', function (evt) {
					self.trigger('focus', evt);
				});

				this._syncA = Utils.bind(this._syncAttributes, this);
				this._syncS = Utils.bind(this._syncSubtree, this);

				if (this.$element[0].attachEvent) {
					this.$element[0].attachEvent('onpropertychange', this._syncA);
				}

				var observer = window.MutationObserver ||
					window.WebKitMutationObserver ||
					window.MozMutationObserver
					;

				if (observer != null) {
					this._observer = new observer(function (mutations) {
						$.each(mutations, self._syncA);
						$.each(mutations, self._syncS);
					});
					this._observer.observe(this.$element[0], {
						attributes: true,
						childList: true,
						subtree: false
					});
				} else if (this.$element[0].addEventListener) {
					this.$element[0].addEventListener(
						'DOMAttrModified',
						self._syncA,
						false
					);
					this.$element[0].addEventListener(
						'DOMNodeInserted',
						self._syncS,
						false
					);
					this.$element[0].addEventListener(
						'DOMNodeRemoved',
						self._syncS,
						false
					);
				}
			};

			Select2.prototype._registerDataEvents = function () {
				var self = this;

				this.dataAdapter.on('*', function (name, params) {
					self.trigger(name, params);
				});
			};

			Select2.prototype._registerSelectionEvents = function () {
				var self = this;
				var nonRelayEvents = ['toggle', 'focus'];

				this.selection.on('toggle', function () {
					self.toggleDropdown();
				});

				this.selection.on('focus', function (params) {
					self.focus(params);
				});

				this.selection.on('*', function (name, params) {
					if ($.inArray(name, nonRelayEvents) !== -1) {
						return;
					}

					self.trigger(name, params);
				});
			};

			Select2.prototype._registerDropdownEvents = function () {
				var self = this;

				this.dropdown.on('*', function (name, params) {
					self.trigger(name, params);
				});
			};

			Select2.prototype._registerResultsEvents = function () {
				var self = this;

				this.results.on('*', function (name, params) {
					self.trigger(name, params);
				});
			};

			Select2.prototype._registerEvents = function () {
				var self = this;

				this.on('open', function () {
					self.$container.addClass('select2-container--open');
				});

				this.on('close', function () {
					self.$container.removeClass('select2-container--open');
				});

				this.on('enable', function () {
					self.$container.removeClass('select2-container--disabled');
				});

				this.on('disable', function () {
					self.$container.addClass('select2-container--disabled');
				});

				this.on('blur', function () {
					self.$container.removeClass('select2-container--focus');
				});

				this.on('query', function (params) {
					if (!self.isOpen()) {
						self.trigger('open', {});
					}

					this.dataAdapter.query(params, function (data) {
						self.trigger('results:all', {
							data: data,
							query: params
						});
					});
				});

				this.on('query:append', function (params) {
					this.dataAdapter.query(params, function (data) {
						self.trigger('results:append', {
							data: data,
							query: params
						});
					});
				});

				this.on('keypress', function (evt) {
					var key = evt.which;

					if (self.isOpen()) {
						if (key === KEYS.ESC || key === KEYS.TAB ||
							(key === KEYS.UP && evt.altKey)) {
							self.close();

							evt.preventDefault();
						} else if (key === KEYS.ENTER) {
							self.trigger('results:select', {});

							evt.preventDefault();
						} else if ((key === KEYS.SPACE && evt.ctrlKey)) {
							self.trigger('results:toggle', {});

							evt.preventDefault();
						} else if (key === KEYS.UP) {
							self.trigger('results:previous', {});

							evt.preventDefault();
						} else if (key === KEYS.DOWN) {
							self.trigger('results:next', {});

							evt.preventDefault();
						}
					} else {
						if (key === KEYS.ENTER || key === KEYS.SPACE ||
							(key === KEYS.DOWN && evt.altKey)) {
							self.open();

							evt.preventDefault();
						}
					}
				});
			};

			Select2.prototype._syncAttributes = function () {
				this.options.set('disabled', this.$element.prop('disabled'));

				if (this.options.get('disabled')) {
					if (this.isOpen()) {
						this.close();
					}

					this.trigger('disable', {});
				} else {
					this.trigger('enable', {});
				}
			};

			Select2.prototype._syncSubtree = function (evt, mutations) {
				var changed = false;
				var self = this;

				// Ignore any mutation events raised for elements that aren't options or
				// optgroups. This handles the case when the select element is destroyed
				if (
					evt && evt.target && (
						evt.target.nodeName !== 'OPTION' && evt.target.nodeName !== 'OPTGROUP'
					)
				) {
					return;
				}

				if (!mutations) {
					// If mutation events aren't supported, then we can only assume that the
					// change affected the selections
					changed = true;
				} else if (mutations.addedNodes && mutations.addedNodes.length > 0) {
					for (var n = 0; n < mutations.addedNodes.length; n++) {
						var node = mutations.addedNodes[n];

						if (node.selected) {
							changed = true;
						}
					}
				} else if (mutations.removedNodes && mutations.removedNodes.length > 0) {
					changed = true;
				}

				// Only re-pull the data if we think there is a change
				if (changed) {
					this.dataAdapter.current(function (currentData) {
						self.trigger('selection:update', {
							data: currentData
						});
					});
				}
			};

			/**
			 * Override the trigger method to automatically trigger pre-events when
			 * there are events that can be prevented.
			 */
			Select2.prototype.trigger = function (name, args) {
				var actualTrigger = Select2.__super__.trigger;
				var preTriggerMap = {
					'open': 'opening',
					'close': 'closing',
					'select': 'selecting',
					'unselect': 'unselecting'
				};

				if (args === undefined) {
					args = {};
				}

				if (name in preTriggerMap) {
					var preTriggerName = preTriggerMap[name];
					var preTriggerArgs = {
						prevented: false,
						name: name,
						args: args
					};

					actualTrigger.call(this, preTriggerName, preTriggerArgs);

					if (preTriggerArgs.prevented) {
						args.prevented = true;

						return;
					}
				}

				actualTrigger.call(this, name, args);
			};

			Select2.prototype.toggleDropdown = function () {
				if (this.options.get('disabled')) {
					return;
				}

				if (this.isOpen()) {
					this.close();
				} else {
					this.open();
				}
			};

			Select2.prototype.open = function () {
				if (this.isOpen()) {
					return;
				}

				this.trigger('query', {});
			};

			Select2.prototype.close = function () {
				if (!this.isOpen()) {
					return;
				}

				this.trigger('close', {});
			};

			Select2.prototype.isOpen = function () {
				return this.$container.hasClass('select2-container--open');
			};

			Select2.prototype.hasFocus = function () {
				return this.$container.hasClass('select2-container--focus');
			};

			Select2.prototype.focus = function (data) {
				// No need to re-trigger focus events if we are already focused
				if (this.hasFocus()) {
					return;
				}

				this.$container.addClass('select2-container--focus');
				this.trigger('focus', {});
			};

			Select2.prototype.enable = function (args) {
				if (this.options.get('debug') && window.console && console.warn) {
					console.warn(
						'Select2: The `select2("enable")` method has been deprecated and will' +
						' be removed in later Select2 versions. Use $element.prop("disabled")' +
						' instead.'
					);
				}

				if (args == null || args.length === 0) {
					args = [true];
				}

				var disabled = !args[0];

				this.$element.prop('disabled', disabled);
			};

			Select2.prototype.data = function () {
				if (this.options.get('debug') &&
					arguments.length > 0 && window.console && console.warn) {
					console.warn(
						'Select2: Data can no longer be set using `select2("data")`. You ' +
						'should consider setting the value instead using `$element.val()`.'
					);
				}

				var data = [];

				this.dataAdapter.current(function (currentData) {
					data = currentData;
				});

				return data;
			};

			Select2.prototype.val = function (args) {
				if (this.options.get('debug') && window.console && console.warn) {
					console.warn(
						'Select2: The `select2("val")` method has been deprecated and will be' +
						' removed in later Select2 versions. Use $element.val() instead.'
					);
				}

				if (args == null || args.length === 0) {
					return this.$element.val();
				}

				var newVal = args[0];

				if ($.isArray(newVal)) {
					newVal = $.map(newVal, function (obj) {
						return obj.toString();
					});
				}

				this.$element.val(newVal).trigger('change');
			};

			Select2.prototype.destroy = function () {
				this.$container.remove();

				if (this.$element[0].detachEvent) {
					this.$element[0].detachEvent('onpropertychange', this._syncA);
				}

				if (this._observer != null) {
					this._observer.disconnect();
					this._observer = null;
				} else if (this.$element[0].removeEventListener) {
					this.$element[0]
						.removeEventListener('DOMAttrModified', this._syncA, false);
					this.$element[0]
						.removeEventListener('DOMNodeInserted', this._syncS, false);
					this.$element[0]
						.removeEventListener('DOMNodeRemoved', this._syncS, false);
				}

				this._syncA = null;
				this._syncS = null;

				this.$element.off('.select2');
				this.$element.attr('tabindex', this.$element.data('old-tabindex'));

				this.$element.removeClass('select2-hidden-accessible');
				this.$element.attr('aria-hidden', 'false');
				this.$element.removeData('select2');

				this.dataAdapter.destroy();
				this.selection.destroy();
				this.dropdown.destroy();
				this.results.destroy();

				this.dataAdapter = null;
				this.selection = null;
				this.dropdown = null;
				this.results = null;
			};

			Select2.prototype.render = function () {
				var $container = $(
					'<span class="select2 select2-container">' +
					'<span class="selection"></span>' +
					'<span class="dropdown-wrapper" aria-hidden="true"></span>' +
					'</span>'
				);

				$container.attr('dir', this.options.get('dir'));

				this.$container = $container;

				this.$container.addClass('select2-container--' + this.options.get('theme'));

				$container.data('element', this.$element);

				return $container;
			};

			return Select2;
		});

		S2.define('jquery-mousewheel', [
			'jquery'
		], function ($) {
			// Used to shim jQuery.mousewheel for non-full builds.
			return $;
		});

		S2.define('jquery.select2', [
			'jquery',
			'jquery-mousewheel',

			'./select2/core',
			'./select2/defaults'
		], function ($, _, Select2, Defaults) {
			if ($.fn.select2 == null) {
				// All methods that should return the element
				var thisMethods = ['open', 'close', 'destroy'];

				$.fn.select2 = function (options) {
					options = options || {};

					if (typeof options === 'object') {
						this.each(function () {
							var instanceOptions = $.extend(true, {}, options);

							var instance = new Select2($(this), instanceOptions);
						});

						return this;
					} else if (typeof options === 'string') {
						var ret;
						var args = Array.prototype.slice.call(arguments, 1);

						this.each(function () {
							var instance = $(this).data('select2');

							if (instance == null && window.console && console.error) {
								console.error(
									'The select2(\'' + options + '\') method was called on an ' +
									'element that is not using Select2.'
								);
							}

							ret = instance[options].apply(instance, args);
						});

						// Check if we should be returning `this`
						if ($.inArray(options, thisMethods) > -1) {
							return this;
						}

						return ret;
					} else {
						throw new Error('Invalid arguments for Select2: ' + options);
					}
				};
			}

			if ($.fn.select2.defaults == null) {
				$.fn.select2.defaults = Defaults;
			}

			return Select2;
		});

		// Return the AMD loader configuration so it can be used outside of this file
		return {
			define: S2.define,
			require: S2.require
		};
	}());

	// Autoload the jQuery bindings
	// We know that all of the modules exist above this, so we're safe
	var select2 = S2.require('jquery.select2');

	// Hold the AMD module references on the jQuery function that was just loaded
	// This allows Select2 to use the internal loader outside of this file, such
	// as in the language files.
	jQuery.fn.select2.amd = S2;

	// Return the Select2 instance for anyone who is importing it.
	return select2;
}));


let token = $('input[name="__RequestVerificationToken"]').val();
$.ajaxPrefilter(function (options, originalOptions) {
	options.async = true;
	if (options.type.toUpperCase() == "POST") {
		options.data = $.param($.extend(originalOptions.data, { __RequestVerificationToken: token }));
	}
});
$.ajaxSetup({ cache: false });

const postJson = (url, vars) => {
	return $.ajax({
		url: url,
		cache: false,
		async: true,
		type: "POST",
		dataType: 'json',
		data: vars
	});
}


const getJson = (url, vars) => {
	return $.ajax({
		url: url,
		cache: false,
		async: true,
		type: "GET",
		dataType: 'json',
		data: vars
	});
}