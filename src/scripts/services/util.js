/** Class for utility functions */
export default class Util {
  /**
   * Extend an array just like JQuery's extend.
   * @returns {object} Merged objects.
   */
  static extend() {
    for (let i = 1; i < arguments.length; i++) {
      for (let key in arguments[i]) {
        if (Object.prototype.hasOwnProperty.call(arguments[i], key)) {
          if (
            typeof arguments[0][key] === 'object' &&
            typeof arguments[i][key] === 'object'
          ) {
            this.extend(arguments[0][key], arguments[i][key]);
          }
          else {
            arguments[0][key] = arguments[i][key];
          }
        }
      }
    }
    return arguments[0];
  }

  /**
   * Swap two DOM elements.
   * @param {HTMLElement} element1 Element 1.
   * @param {HTMLElement} element2 Element 2.
   */
  static swapDOMElements(element1, element2) {
    const parent1 = element1.parentNode;
    const parent2 = element2.parentNode;

    if (!parent1 || !parent2) {
      return;
    }

    const replacement1 = document.createElement('div');
    const replacement2 = document.createElement('div');

    parent1.replaceChild(replacement1, element1);
    parent2.replaceChild(replacement2, element2);
    parent1.replaceChild(element2, replacement1);
    parent2.replaceChild(element1, replacement2);
  }

  /**
   * Double click handler.
   * @param {Event} event Regular click event.
   * @param {function} callbackSingle Function to execute on single click.
   * @param {function} callbackDouble Function to execute on double click.
   */
  static doubleClick(event, callbackSingle, callbackDouble) {
    if (
      !event ||
      (
        typeof callbackSingle !== 'function' &&
        typeof callbackDouble !== 'function'
      )
    ) {
      return;
    }

    if (isNaN(event.target.count)) {
      event.target.count = 1;
    }
    else {
      event.target.count++;
    }

    setTimeout(() => {
      if (event.target.count === 1) {
        callbackSingle?.();
      }
      if (event.target.count === 2) {
        callbackDouble?.();
      }
      event.target.count = 0;
    }, Util.DOUBLE_CLICK_TIME);
  }
}

/** @constant {number} Double click time */
Util.DOUBLE_CLICK_TIME = 300;
