import { decode } from 'he';

/** Class for utility functions */
export default class Util {
  /**
   * Extend an array just like JQuery's extend.
   * @param {...object} var_args Objects to be merged.
   * @returns {object} Merged objects.
   */
  static extend(var_args) {
    for (let i = 1; i < var_args.length; i++) {
      for (let key in var_args[i]) {
        if (Object.prototype.hasOwnProperty.call(var_args[i], key)) {
          if (
            typeof var_args[0][key] === 'object' &&
            typeof var_args[i][key] === 'object'
          ) {
            this.extend(var_args[0][key], var_args[i][key]);
          }
          else {
            var_args[0][key] = var_args[i][key];
          }
        }
      }
    }
    return var_args[0];
  }

  /**
   * Add mixins to a class, useful for splitting files.
   * @param {object} [master] Master class to add mixins to.
   * @param {object[]|object} [mixins] Mixins to be added to master.
   */
  static addMixins(master = {}, mixins = []) {
    if (!master.prototype) {
      return;
    }

    if (!Array.isArray(mixins)) {
      mixins = [mixins];
    }

    const masterPrototype = master.prototype;

    mixins.forEach((mixin) => {
      const mixinPrototype = mixin.prototype;
      Object.getOwnPropertyNames(mixinPrototype).forEach((property) => {
        if (property === 'constructor') {
          return; // Don't need constructor
        }

        if (Object.getOwnPropertyNames(masterPrototype).includes(property)) {
          return; // property already present, do not override
        }

        masterPrototype[property] = mixinPrototype[property];
      });
    });
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

  /**
   * Escape text for regular expression.
   * @param {string} text Text to escape symbols in.
   * @returns {string} Text with escaped symbols.
   */
  static escapeForRegularExpression(text) {
    if (typeof text !== 'string') {
      return '';
    }

    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
  }

  /**
   * Replace all subcontent ids in H5P parameters object.
   * @param {object} params Parameters.
   * @returns {object} Parameters with fresh subcontent ids.
   */
  static replaceSubContentIDs(params) {
    if (Array.isArray(params)) {
      params = params.map((param) => {
        return Util.replaceSubContentIDs(param);
      });
    }
    else if (typeof params === 'object' && params !== null) {
      if (params.library && params.subContentId) {
        params.subContentId = H5P.createUUID();
      }

      for (let param in params) {
        param = Util.replaceSubContentIDs(params[param]);
      }
    }

    return params;
  }

  /**
   * HTML decode and strip HTML.
   * @param {string|object} html html.
   * @returns {string} html value.
   */
  static purifyHTML(html) {
    if (typeof html !== 'string') {
      return '';
    }

    let text = decode(html);
    const div = document.createElement('div');
    div.innerHTML = text;
    text = div.textContent || div.innerText || '';

    return text;
  }

  /**
   * Wait for a number of milliseconds.
   * @param {number} ms Milliseconds to wait.
   * @returns {Promise} Promise that resolves after ms milliseconds.
   */
  static async wait(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}

/** @constant {number} Double click time */
Util.DOUBLE_CLICK_TIME = 300;
