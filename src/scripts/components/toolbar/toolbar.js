import './toolbar.scss';
import ToolbarButton from './toolbar-button';
import Util from '@services/util';

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
      onClickButtonDeleteHidden: (() => {})
    }, callbacks);

    this.buttons = {};

    // Build DOM
    this.toolBar = document.createElement('div');
    this.toolBar.classList.add('toolbar-tool-bar');

    this.buttons.preview = new ToolbarButton(
      {
        a11y: {
          active: this.params.dictionary.get('a11y.previewActive'),
          disabled: this.params.dictionary.get('a11y.previewDisabled'),
          inactive: this.params.dictionary.get('a11y.previewInactive'),
        },
        classes: [
          'toolbar-button',
          'toolbar-button-preview'
        ],
        disabled: true,
        type: 'toggle'
      },
      {
        onClick: (event, params = {}) => {
          this.callbacks.onClickButtonPreview(params.active);
        }
      }
    );
    this.toolBar.appendChild(this.buttons.preview.getDOM());

    this.buttons.export = new ToolbarButton(
      {
        a11y: {
          active: this.params.dictionary.get('a11y.exportActive'),
          disabled: this.params.dictionary.get('a11y.exportDisabled'),
          inactive: this.params.dictionary.get('a11y.exportInactive'),
        },
        classes: [
          'toolbar-button',
          'toolbar-button-export'
        ],
        disabled: true,
        type: 'toggle'
      },
      {
        onClick: (event, params = {}) => {
          this.callbacks.onClickButtonExport(params.active);
        }
      }
    );
    this.toolBar.appendChild(this.buttons.export.getDOM());

    this.buttons.deleteHidden = new ToolbarButton(
      {
        a11y: {
          active: this.params.dictionary.get('a11y.deleteHiddenActive'),
          disabled: this.params.dictionary.get('a11y.deleteHiddenDisabled'),
          inactive: this.params.dictionary.get('a11y.deleteHiddenInactive'),
        },
        classes: [
          'toolbar-button',
          'toolbar-button-delete-hidden'
        ],
        disabled: true,
        type: 'pulse'
      },
      {
        onClick: () => {
          this.callbacks.onClickButtonDeleteHidden();
        }
      }
    );
    this.toolBar.appendChild(this.buttons.deleteHidden.getDOM());
  }

  /**
   * Return the DOM for this class.
   * @returns {HTMLElement} DOM for this class.
   */
  getDOM() {
    return this.toolBar;
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
   * Show button.
   * @param {string} id Button id.
   */
  showButton(id = '') {
    if (!this.buttons[id]) {
      return; // Button not available
    }

    this.buttons[id].show();
  }

  /**
   * Hide button.
   * @param {string} id Button id.
   */
  hideButton(id = '') {
    if (!this.buttons[id]) {
      return; // Button not available
    }

    this.buttons[id].hide();
  }

  /**
   * Decloak button.
   * @param {string} id Button id.
   */
  decloakButton(id = '') {
    if (!this.buttons[id]) {
      return; // Button not available
    }

    this.buttons[id].decloak();
  }

  /**
   * Cloak button.
   * @param {string} id Button id.
   */
  cloakButton(id = '') {
    if (!this.buttons[id]) {
      return; // Button not available
    }

    this.buttons[id].cloak();
  }

  /**
   * Focus a button.
   * @param {string} id Button id.
   */
  focus(id = '') {
    if (!this.buttons[id] || this.buttons[id].isCloaked()) {
      return; // Button not available
    }

    this.buttons[id].focus();
  }
}
