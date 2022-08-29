import './preview.scss';
import Util from './../../h5peditor-portfolio-util';

/** Class representing preview */
export default class Preview {

  /**
   * @class
   * @param {object} [params={}] Parameters.
   * @param {object} [callbacks={}] Callbacks.
   */
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({}, params);
    this.callbacks = Util.extend({}, callbacks);

    this.dom = document.createElement('div');
    this.dom.classList.add('preview');
  }

  /**
   * Return the DOM for this class.
   *
   * @returns {HTMLElement} DOM for this class.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Attach instance to preview.
   *
   * @param {H5P.ContentType} instance Instance to attach.
   */
  attachInstance(instance) {
    if (typeof instance?.attach !== 'function') {
      return;
    }

    this.dom.innerHTML = '';
    instance.attach(H5P.jQuery(this.dom));
  }
}
