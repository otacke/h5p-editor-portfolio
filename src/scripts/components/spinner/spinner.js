import Util from '@services/util.js';
import './spinner.scss';

/** Class for an activity indicator aka spinner */
export default class Spinner {
  /**
   * @class
   * @param {object} [params] Parameters.
   * @param {object} [callbacks] Callbacks.
   * @param {function} [callbacks.onAborted] Callback for when the spinner is aborted.
   */
  constructor(params = {}, callbacks = {}) {
    params = Util.extend({
      hasAbortButton: false
    }, params);
    callbacks = Util.extend({
      onAborted: () => {}
    }, callbacks);

    this.container = document.createElement('div');
    this.container.classList.add('spinner-container');
    this.container.classList.add('spinner-none');

    this.spinnerElement = document.createElement('div');
    this.spinnerElement.classList.add('spinner');

    // Circle parts with different delays for the grow/shrink animation
    const circleHead = document.createElement('div');
    circleHead.classList.add('spinner-circle-head');
    this.spinnerElement.append(circleHead);

    const circleNeckUpper = document.createElement('div');
    circleNeckUpper.classList.add('spinner-circle-neck-upper');
    this.spinnerElement.append(circleNeckUpper);

    const circleNeckLower = document.createElement('div');
    circleNeckLower.classList.add('spinner-circle-neck-lower');
    this.spinnerElement.append(circleNeckLower);

    const circleBody = document.createElement('div');
    circleBody.classList.add('spinner-circle-body');
    this.spinnerElement.append(circleBody);

    this.container.append(this.spinnerElement);

    this.message = document.createElement('div');
    this.message.classList.add('spinner-message');
    this.container.append(this.message);

    this.progress = document.createElement('div');
    this.progress.classList.add('spinner-progress');
    this.container.append(this.progress);

    if (params.hasAbortButton) {
      this.abortButton = document.createElement('button');
      this.abortButton.classList.add('h5p-joubelui-button');
      this.abortButton.classList.add('spinner-button-abort');
      this.abortButton.innerText = params.dictionary.get('l10n.abort');
      this.abortButton.addEventListener('click', () => {
        callbacks.onAborted();
      });
      this.container.append(this.abortButton);
    }
  }

  /**
   * Get the DOM.
   * @returns {HTMLElement} Spinner container.
   */
  getDOM() {
    return this.container;
  }

  /**
   * Show spinner.
   */
  show() {
    this.container.classList.remove('spinner-none');
  }

  /**
   * Hide spinner.
   */
  hide() {
    this.container.classList.add('spinner-none');
  }

  /**
   * Set message text.
   * @param {string} text Message text.
   */
  setMessage(text) {
    this.message.innerText = text;
  }

  /**
   * Set progress text.
   * @param {string} text Progress text.
   */
  setProgress(text) {
    this.progress.innerText = text;
  }
}
