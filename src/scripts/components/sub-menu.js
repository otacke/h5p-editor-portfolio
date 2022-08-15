import './sub-menu.scss';
import Util from './../h5peditor-portfolio-util';
import Dictionary from './../services/dictionary';

export default class SubMenu extends H5P.EventDispatcher {
  constructor(params = {}, callbacks = {}) {
    super();

    this.params = Util.extend({
      options: []
    }, params);

    this.callbacks = Util.extend({
    }, callbacks);

    this.options = {};
    this.parent = null;

    this.options = {};

    this.baseClass = 'submenu-popup';

    this.handleClosed = this.handleClosed.bind(this);

    this.dom = document.createElement('div');
    this.dom.classList.add(this.baseClass);
    this.dom.classList.add('display-none');

    const title = document.createElement('div');
    title.classList.add(`${this.baseClass}-title`);
    title.innerText = Dictionary.get('l10n.options');
    this.dom.appendChild(title);

    const optionsWrapper = document.createElement('ul');
    optionsWrapper.classList.add(`${this.baseClass}-options`);

    this.params.options.forEach(option => {
      const subMenuOption = document.createElement('li');
      subMenuOption.classList.add(`${this.baseClass}-option`);
      subMenuOption.classList.add(`${this.baseClass}-option-${option.id}`);
      subMenuOption.innerText = option.label;
      subMenuOption.addEventListener('click', () => {
        option.onClick(this.parent);
        this.hide();
      });
      optionsWrapper.appendChild(subMenuOption);
      this.options[option.id] = (subMenuOption);
    });

    this.dom.appendChild(optionsWrapper);
  }

  /**
   * Get DOM for sub menu.
   *
   * @returns {HTMLElement} DOM for sub menu.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Set parent.
   *
   * @param {HTMLElement} parent Parent element.
   */
  setParent(parent) {
    this.parent = parent;
  }

  /**
   * Toggle options.
   *
   * @param {object} [capabilities = {}] Capabilities.
   */
  toggleOptions(capabilities = {}) {
    for (const capability in capabilities) {
      this.toggleOption(capability, capabilities[capability]);
    }
  }

  /**
   * Toggle option.
   *
   * @param {string} id Option id.
   * @param {boolean} state State. False to show.
   */
  toggleOption(id, state) {
    if (!this.options[id] || typeof state !== 'boolean') {
      return;
    }

    this.options[id].classList.toggle('display-none', !state);
  }

  /**
   * Show.
   *
   * @param {object} [params = {}] Parameters.
   * @param {object} [params.css] CSS parameters.
   */
  show(params = {}) {
    for (const attribute in (params.css || {})) {
      this.dom.style[attribute] = params.css[attribute];
    }

    this.dom.classList.remove('display-none');
    document.body.addEventListener('click', this.handleClosed);

    this.trigger('shown');
  }

  /**
   * Hide.
   */
  hide() {
    this.dom.classList.add('display-none');
    document.body.removeEventListener('click', this.handleClosed);

    this.trigger('hidden');
  }

  /**
   * Handle closed.
   */
  handleClosed() {
    this.hide();
  }
}
