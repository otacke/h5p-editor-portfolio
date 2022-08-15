import './chapter-navigation-button.scss';
import Util from './../h5peditor-portfolio-util';

export default class ChapterNavigationButton {
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
    }, params);

    this.callbacks = Util.extend({
      onShowChapter: (() => {}),
      onShowMenu: (() => {}),
      onLabelEdited: (() => {}),
    }, callbacks);

    this.handleLabelEdited = this.handleLabelEdited.bind(this);

    this.dom = document.createElement('button');
    this.dom.classList.add('h5peditor-portfolio-chapter-button');
    this.dom.classList.add('h5peditor-portfolio-chapter-button-level-1');
    this.dom.addEventListener('click', () => {
      this.callbacks.onShowChapter(this);
    });

    this.label = document.createElement('div');
    this.label.classList.add('h5peditor-portfolio-chapter-button-label');
    this.label.innerText = this.params.title;
    this.dom.appendChild(this.label);

    this.menu = document.createElement('button');
    this.menu.classList.add('h5peditor-portfolio-chapter-button-menu');
    this.menu.addEventListener('click', () => {
      this.handleClickMenu();
    });
    this.dom.appendChild(this.menu);

    if (this.params.chapterGroup) {
      this.params.chapterGroup.on('summary', (event) => {
        this.label.innerText = event.data;
      });
    }
  }

  getDOM() {
    return this.dom;
  }

  setActive(state) {
    this.dom.classList.toggle('current', state);
  }

  /**
   * Update button values.
   *
   * @param {object} params Parameters.
   * @param {string} [params.title] Button label.
   * @param {number} [params.hierarchyLevel] Hierarchy level.
   */
  update(params = {}) {
    if (typeof params.title === 'string') {
      this.label.innerText = params.title;
    }

    if (typeof params.hierarchyLevel === 'number') {
      for (let i = 1; i <= 3; i++) { // Support for hierarchy levels 1-3
        const levelClass = `h5peditor-portfolio-chapter-button-level-${i}`;
        this.dom.classList.toggle(levelClass, i === params.hierarchyLevel);
      }
    }
  }

  remove() {
    this.dom.remove();
  }

  /**
   * Edit label.
   */
  editLabel() {
    this.label.setAttribute('contentEditable', true);

    const range = document.createRange();
    range.selectNodeContents(this.label);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);

    this.label.focus();

    this.label.addEventListener('focusout', this.handleLabelEdited);
    this.label.addEventListener('keydown', this.handleLabelEdited);
  }

  /**
   * Handle label was edited.
   *
   * @param {KeyboardEvent|FocusEvent} event Event.
   */
  handleLabelEdited(event) {
    if (event instanceof KeyboardEvent) {
      if (event.key !== 'Enter') {
        return;
      }
    }

    event.preventDefault();

    this.label.removeEventListener('focusout', this.handleLabelEdited);
    this.label.removeEventListener('keyup', this.handleLabelEdited);

    this.label.setAttribute('contentEditable', false);
    this.label.scrollLeft = 0;

    this.dom.focus();

    this.callbacks.onLabelEdited(this, this.label.innerText);
  }

  attachMenu(subMenu) {
    // Register button with subMenu
    subMenu.setParent(this);

    // Move subMenu below this button
    this.dom.after(subMenu.getDOM());

    setTimeout(() => {
      const rect = this.dom.getBoundingClientRect();

      this.menu.classList.add('active');
      subMenu.show({
        css: {
          width: `${rect.width}px`,
          left: `calc(${rect.left}px + ${rect.width}px - 1.5rem)`,
          top: `calc(${this.dom.offsetTop}px + ${rect.height}px - 1.5rem)`,
        }
      });

      subMenu.once('hidden', () => {
        this.menu.classList.remove('active');
      });
    }, 0);
  }

  handleClickMenu() {
    if (this.menu.classList.contains('active')) {
      return;
    }

    this.callbacks.onShowMenu(this);
  }
}
