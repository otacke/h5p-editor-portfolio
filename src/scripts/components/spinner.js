import './spinner.scss';

/** Class for an activity indicator aka spinner */
export default class Spinner {
  /**
   * @class
   */
  constructor() {
    this.container = document.createElement('div');
    this.container.classList.add('spinner-container');
    this.container.classList.add('spinner-none');

    this.spinnerElement = document.createElement('div');
    this.spinnerElement.classList.add('spinner');

    // Circle parts with different delays for the grow/shrink animation
    const circleHead = document.createElement('div');
    circleHead.classList.add('spinner-circle-head');
    this.spinnerElement.appendChild(circleHead);

    const circleNeckUpper = document.createElement('div');
    circleNeckUpper.classList.add('spinner-circle-neck-upper');
    this.spinnerElement.appendChild(circleNeckUpper);

    const circleNeckLower = document.createElement('div');
    circleNeckLower.classList.add('spinner-circle-neck-lower');
    this.spinnerElement.appendChild(circleNeckLower);

    const circleBody = document.createElement('div');
    circleBody.classList.add('spinner-circle-body');
    this.spinnerElement.appendChild(circleBody);

    this.container.appendChild(this.spinnerElement);

    this.message = document.createElement('div');
    this.message.classList.add('spinner-message');
    this.container.appendChild(this.message);

    this.progress = document.createElement('div');
    this.progress.classList.add('spinner-progress');
    this.container.appendChild(this.progress);
  }

  /**
   * Get the DOM.
   *
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
   *
   * @param {string} text Message text.
   */
  setMessage(text) {
    this.message.innerText = text;
  }

  /**
   * Set progress text.
   *
   * @param {string} text Progress text.
   */
  setProgress(text) {
    this.progress.innerText = text;
  }
}
