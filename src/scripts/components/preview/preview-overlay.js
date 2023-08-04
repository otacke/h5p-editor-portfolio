import './preview-overlay.scss';
import Preview from './preview.js';

/** Class representing the preview overlay */
export default class PreviewOverlay {

  /**
   * @class
   * @param {object} [params] Parameters.
   */
  constructor(params) {
    this.params = params || {};

    this.dom = document.createElement('div');
    this.dom.classList.add('preview-overlay');

    this.hide();

    const previewContent = document.createElement('div');
    previewContent.classList.add('preview-content');
    this.dom.appendChild(previewContent);

    const previewLabel = document.createElement('div');
    previewLabel.classList.add('preview-label');
    previewLabel.innerHTML = this.params.dictionary.get('l10n.preview');
    previewContent.appendChild(previewLabel);

    const previewExplanation = document.createElement('div');
    previewExplanation.classList.add('preview-explanation');
    previewExplanation.innerHTML = this.params.dictionary.get('l10n.previewExplanation');
    previewContent.appendChild(previewExplanation);

    this.previewWrapper = document.createElement('div');
    this.previewWrapper.classList.add('preview-wrapper');
    previewContent.appendChild(this.previewWrapper);

    this.preview = new Preview();
    this.previewWrapper.appendChild(this.preview.getDOM());
  }

  /**
   * Return the DOM for this class.
   * @returns {HTMLElement} DOM for this class.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Attach instance to preview.
   * @param {H5P.ContentType} instance Instance to attach.
   */
  attachInstance(instance) {
    if (typeof instance?.attach !== 'function') {
      return;
    }

    this.preview.attachInstance(instance);
  }

  /**
   * Show preview overlay.
   */
  show() {
    this.dom.classList.remove('display-none');
  }

  /**
   * Hide preview overlay.
   */
  hide() {
    this.dom.classList.add('display-none');
  }

  /**
   * Cloak preview.
   */
  cloak() {
    this.dom.classList.add('display-invisible');
  }

  /**
   * Decloak preview.
   */
  decloak() {
    this.dom.classList.remove('display-invisible');
  }
}
