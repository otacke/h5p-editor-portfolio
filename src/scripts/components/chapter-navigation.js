import './chapter-navigation.scss';
import Util from './../h5peditor-portfolio-util';

export default class ChapterNavigation {
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      title: '',
      chapterHierarchies: []
    }, params);

    this.callbacks = Util.extend({
      onAddChapter: (() => {}),
      onShowChapter: (() => {})
    }, callbacks);

    this.buttons = {};

    // TODO: popup menu as in Branching Scenario Editor
    //       - edit title
    //       - move up
    //       - move down
    //       - make top chapter (if sub chapter)
    //       - make sub chapter
    //       - make sub sub chapter (if sub chapter)
    //       - delete (including dialog)

    this.dom = document.createElement('div');
    this.dom.classList.add('h5peditor-portfolio-chapter-navigation');

    const title = document.createElement('div');
    title.classList.add('h5peditor-portfolio-chapter-navigation-maintitle');
    const titleText = document.createElement('h2');
    titleText.classList.add('navigation-title');
    titleText.innerHTML = this.params.title; // TODO: Sync with title field
    title.appendChild(titleText);
    this.dom.appendChild(title);

    this.buttonSeparator = document.createElement('div');
    this.buttonSeparator.classList.add('h5peditor-portfolio-chapter-button-separator');
    this.dom.appendChild(this.buttonSeparator);

    this.buttonAdd = document.createElement('button');
    this.buttonAdd.classList.add('h5peditor-portfolio-chapter-button-add');
    this.buttonAdd.innerText = '+';
    this.buttonAdd.addEventListener('click', () => {
      this.callbacks.onAddChapter();
    });
    this.dom.appendChild(this.buttonAdd);

    this.params.chapterHierarchies.forEach(hierarchy => {
      this.addButton(hierarchy);
    });
  }

  /**
   * Get DOM.
   *
   * @returns {HTMLElement} DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Add button.
   *
   * @param {string} hierarchy Hierarchy of button to add.
   */
  addButton(hierarchy) {
    const button = document.createElement('button');
    button.classList.add('h5peditor-portfolio-chapter-button');
    button.innerText = hierarchy; // TODO: Sync with chapter title field, then hide title field?
    button.addEventListener('click', () => {
      this.callbacks.onShowChapter(hierarchy);
    });

    this.dom.insertBefore(button, this.buttonSeparator);

    this.buttons[hierarchy] = button;
  }

  /**
   * Set current button.
   *
   * @param {string} targetHierarchy Hierarchy of button to set active.
   */
  setCurrentButton(targetHierarchy) {
    for (const hierarchy in this.buttons) {
      this.buttons[hierarchy].classList.toggle('current', hierarchy === targetHierarchy);
    }
  }
}
