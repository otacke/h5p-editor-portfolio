// Import required classes
import './toolbar-button.scss';
import Util from './../../h5peditor-portfolio-util';

/** Class representing the content */
export default class ToolbarButton {
  /**
   * @class
   * @param {object} params Parameter from editor.
   * @param {object} [callbacks] Callbacks.
   */
  constructor(params, callbacks) {
    // Set missing params
    this.params = Util.extend({
      a11y: {
        active: '',
        disabled: '',
        inactive: ''
      },
      active: false,
      classes: [],
      disabled: false,
      type: 'pulse'
    }, params || {});

    if (!Array.isArray(this.params.classes)) {
      this.params.classes = [this.params.classes];
    }

    if (this.params.type === 'pulse') {
      if (!this.params.a11y.inactive) {
        this.params.a11y.inactive = this.params.a11y.active || '';
      }
      if (!this.params.a11y.active) {
        this.params.a11y.active = this.params.a11y.inactive || '';
      }
    }

    this.active = this.params.active;
    this.disabled = this.params.disabled;

    // Sanitize callbacks
    this.callbacks = callbacks || {};
    this.callbacks.onClick = this.callbacks.onClick || (() => {});

    // Button
    this.button = document.createElement('button');

    if (this.params.classes) {
      this.params.classes.forEach((className) => {
        this.button.classList.add(className);
      });
    }
    this.button.setAttribute('aria-pressed', this.params.active);
    this.button.setAttribute('tabindex', '0');

    if (this.params.active === true) {
      this.activate();
    }
    else {
      this.deactivate();
    }

    if (this.params.disabled === true) {
      this.disable();
    }
    else {
      this.enable();
    }

    this.button.addEventListener('click', (event) => {
      if (this.disabled) {
        return;
      }

      if (this.params.type === 'toggle') {
        this.toggle();
      }

      this.callbacks.onClick(event, { active: this.active });
    });
  }

  /**
   * Return the DOM for this class.
   *
   * @returns {HTMLElement} DOM for this class.
   */
  getDOM() {
    return this.button;
  }

  /**
   * Show button.
   */
  show() {
    this.button.classList.remove('toolbar-button-display-none');
  }

  /**
   * Hide button.
   */
  hide() {
    this.button.classList.add('toolbar-button-display-none');
  }

  /**
   * Decloak button.
   */
  decloak() {
    this.button.classList.remove('toolbar-button-cloak');
  }

  /**
   * Cloak button.
   */
  cloak() {
    this.button.classList.add('toolbar-button-cloak');
  }

  /**
   * Focus button.
   */
  focus() {
    this.button.focus();
  }

  /**
   * Enable button.
   */
  enable() {
    this.disabled = false;

    this.button.classList.remove('toolbar-button-disabled');

    if (this.active) {
      this.activate();
    }
    else {
      this.deactivate();
    }
  }

  /**
   * Disable button.
   */
  disable() {
    this.button.classList.add('toolbar-button-disabled');
    this.button.setAttribute('aria-label', this.params.a11y.disabled);

    this.disabled = true;
  }

  /**
   * Activate button.
   */
  activate() {
    if (this.disabled) {
      return;
    }

    if (this.params.type === 'toggle') {
      this.button.classList.add('toolbar-button-active');
      this.button.setAttribute('aria-pressed', true);
    }

    this.button.setAttribute('aria-label', this.params.a11y.active);

    this.active = true;
  }

  /**
   * Force button click.
   *
   * @param {boolean} [active] If set to boolean, activate accordingly.
   */
  force(active) {
    if (this.params.type === 'toggle') {
      if (active === true) {
        this.activate();
      }
      else if (active === false) {
        this.deactivate();
      }
      else {
        this.toggle();
      }
    }

    this.callbacks.onClick(event, { active: this.active });
  }

  /**
   * Deactivate button.
   */
  deactivate() {
    if (this.disabled) {
      return;
    }

    this.active = false;

    if (this.params.type === 'toggle') {
      this.button.classList.remove('toolbar-button-active');
      this.button.setAttribute('aria-pressed', false);
    }

    this.button.setAttribute('aria-label', this.params.a11y.inactive);
  }

  /**
   * Toggle active state.
   */
  toggle() {
    if (this.disabled) {
      return;
    }

    if (this.active) {
      this.deactivate();
    }
    else {
      this.activate();
    }
  }

  /**
   * Set attribute.
   *
   * @param {string} attribute Attribute key.
   * @param {string} value Attribute value.
   */
  setAttribute(attribute, value) {
    this.button.setAttribute(attribute, value);
  }

  /**
   * Determine whether button is active.
   *
   * @returns {boolean} True, if button is active, else false.
   */
  isActive() {
    return this.active;
  }

  /**
   * Determine whether button is disabled.
   *
   * @returns {boolean} True, if button is disabled, else false.
   */
  isDisabled() {
    return this.disabled;
  }

  /**
   * Determine whether button is cloaked.
   *
   * @returns {boolean} True, if button is cloaked, else false.
   */
  isCloaked() {
    return this.button.classList.contains('toolbar-button-cloak');
  }
}
