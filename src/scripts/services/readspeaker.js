import './readspeaker.scss';

/**
 * Allow to read vie readspeaker.
 */
export default class Readspeaker {

  /**
   * Initialize.
   *
   * @param {HTMLElement} wrapper Wrapper to append to.
   */
  static init(wrapper) {
    if (!wrapper || Readspeaker.container) {
      return;
    }

    const read = document.createElement('div');
    read.classList.add('h5p-hidden-read');
    read.setAttribute('aria-live', 'polite');
    wrapper.appendChild(read);

    Readspeaker.container = read;
  }

  /**
   * Force readspeaker to read text.
   *
   * @param {string} text Text to read.
   */
  static read(text) {
    if (!Readspeaker.container || typeof text === 'undefined') {
      return;
    }

    if (Readspeaker.textRead) {
      const delimiter = Readspeaker.textRead.substr(-1, 1) === '.' ? ' ' : '. ';
      Readspeaker.textRead = `${Readspeaker.textRead}${delimiter}${text}`;
    }
    else {
      Readspeaker.textRead = text;
    }

    Readspeaker.container.innerText = Readspeaker.textRead;

    setTimeout(() => {
      Readspeaker.textRead = null;
      Readspeaker.container.innerText = '';
    }, 100);
  }
}

Readspeaker.container = null;
Readspeaker.textRead = null;
