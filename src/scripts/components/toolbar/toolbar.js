import ToolbarButton from './toolbar-button.js';
import Util from '@services/util.js';
import './toolbar.scss';

/** Class representing the button bar */
export default class Toolbar {

  /**
   * @class
   * @param {object} [params] Parameters.
   * @param {object} [callbacks] Callbacks.
   * @param {function} [callbacks.onClickButtonPreview] Callback preview button.
   * @param {function} [callbacks.onClickButtonExport] Callback export button.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({}, params);

    this.callbacks = Util.extend({
      onClickButtonPreview: (() => {}),
      onClickButtonExport: (() => {}),
      onClickButtonDeleteHidden: (() => {}),
    }, callbacks);

    this.buttons = {};

    // Build DOM
    this.dom = document.createElement('div');
    this.dom.classList.add('toolbar-tool-bar');
    this.dom.setAttribute('role', 'toolbar');
    this.dom.setAttribute(
      'aria-label', this.params.dictionary.get('a11y.toolbarLabel'),
    );

    this.dom.addEventListener('keydown', (event) => {
      this.handleKeydown(event);
    });

    // Preview button
    this.buttons.preview = new ToolbarButton(
      {
        a11y: {
          active: this.params.dictionary.get('a11y.previewActive'),
          disabled: this.params.dictionary.get('a11y.previewDisabled'),
          inactive: this.params.dictionary.get('a11y.previewInactive'),
        },
        classes: [
          'toolbar-button',
          'toolbar-button-preview',
        ],
        disabled: true,
        type: 'toggle',
      },
      {
        onClick: (event, params = {}) => {
          this.callbacks.onClickButtonPreview(params.active);
        },
      },
    );
    this.dom.appendChild(this.buttons.preview.getDOM());

    // Export button
    this.buttons.export = new ToolbarButton(
      {
        a11y: {
          active: this.params.dictionary.get('a11y.exportActive'),
          disabled: this.params.dictionary.get('a11y.exportDisabled'),
          inactive: this.params.dictionary.get('a11y.exportInactive'),
        },
        classes: [
          'toolbar-button',
          'toolbar-button-export',
        ],
        disabled: true,
        type: 'toggle',
      },
      {
        onClick: (event, params = {}) => {
          this.callbacks.onClickButtonExport(params.active);
        },
      },
    );
    this.dom.appendChild(this.buttons.export.getDOM());

    // Delete hidden button
    this.buttons.deleteHidden = new ToolbarButton(
      {
        a11y: {
          active: this.params.dictionary.get('a11y.deleteHiddenActive'),
          disabled: this.params.dictionary.get('a11y.deleteHiddenDisabled'),
          inactive: this.params.dictionary.get('a11y.deleteHiddenInactive'),
        },
        classes: [
          'toolbar-button',
          'toolbar-button-delete-hidden',
        ],
        disabled: true,
        type: 'pulse',
      },
      {
        onClick: () => {
          this.callbacks.onClickButtonDeleteHidden();
        },
      },
    );
    this.dom.appendChild(this.buttons.deleteHidden.getDOM());

    // Make first button active one
    Object.values(this.buttons).forEach((button, index) => {
      button.setAttribute('tabindex', index === 0 ? '0' : '-1');
    });
    this.currentButtonIndex = 0;
  }

  /**
   * Return the DOM for this class.
   * @returns {HTMLElement} DOM for this class.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Set button attributes.
   * @param {string} id Button id.
   * @param {object} attributes HTML attributes to set.
   */
  setButtonAttributes(id = '', attributes = {}) {
    if (!this.buttons[id]) {
      return; // Button not available
    }

    for (let attribute in attributes) {
      this.buttons[id].setAttribute(attribute, attributes[attribute]);
    }
  }

  /**
   * Determine whether button is active.
   * @param {string} id Button id.
   * @returns {boolean} True, if button is active. False, if inactive.
   */
  isButtonActive(id = '') {
    if (!this.buttons[id]) {
      return false; // Button not available
    }

    return this.buttons[id].isActive();
  }

  /**
   * Enable button.
   * @param {string} id Button id.
   * @param {boolean} active If true, toggle active, else inactive.
   */
  forceButton(id = '', active) {
    if (!this.buttons[id]) {
      return; // Button not available
    }

    this.buttons[id].force(active);
  }

  /**
   * Enable button.
   * @param {string} id Button id.
   */
  enableButton(id = '') {
    if (!this.buttons[id]) {
      return; // Button not available
    }

    this.buttons[id].enable();
  }

  /**
   * Disable button.
   * @param {string} id Button id.
   */
  disableButton(id = '') {
    if (!this.buttons[id]) {
      return; // Button not available
    }

    this.buttons[id].disable();
  }

  /**
   * Focus a button.
   * @param {string} id Button id.
   */
  focusButton(id = '') {
    if (!this.buttons[id]) {
      return; // Button not available
    }

    this.buttons[id].focus();
  }

  /**
   * Focus whatever should get focus.
   */
  focus() {
    Object.values(this.buttons)[this.currentButtonIndex]?.focus();
  }

  /**
   * Move button focus.
   * @param {number} offset Offset to move position by.
   */
  moveButtonFocus(offset) {
    if (typeof offset !== 'number') {
      return;
    }
    if (
      this.currentButtonIndex + offset < 0 ||
      this.currentButtonIndex + offset > Object.keys(this.buttons).length - 1
    ) {
      return; // Don't cycle
    }
    Object.values(this.buttons)[this.currentButtonIndex]
      .setAttribute('tabindex', '-1');
    this.currentButtonIndex = this.currentButtonIndex + offset;
    const focusButton = Object.values(this.buttons)[this.currentButtonIndex];
    focusButton.setAttribute('tabindex', '0');
    focusButton.focus();
  }

  /**
   * Handle key down.
   * @param {KeyboardEvent} event Keyboard event.
   */
  handleKeydown(event) {
    if (event.code === 'ArrowLeft' || event.code === 'ArrowUp') {
      this.moveButtonFocus(-1);
    }
    else if (event.code === 'ArrowRight' || event.code === 'ArrowDown') {
      this.moveButtonFocus(1);
    }
    else if (event.code === 'Home') {
      this.moveButtonFocus(0 - this.currentButtonIndex);
    }
    else if (event.code === 'End') {
      this.moveButtonFocus(
        Object.keys(this.buttons).length - 1 - this.currentButtonIndex,
      );
    }
    else {
      return;
    }
    event.preventDefault();
  }
}
