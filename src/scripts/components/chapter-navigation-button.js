import './chapter-navigation-button.scss';
import Util from './../h5peditor-portfolio-util';

export default class ChapterNavigationButton {
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
    }, params);

    this.callbacks = Util.extend({
      onShowChapter: (() => {}),
      onShowMenu: (() => {}),
      onGetTitle: (() => {}),
    }, callbacks);

    this.dom = document.createElement('button');
    this.dom.classList.add('h5peditor-portfolio-chapter-button');
    this.dom.addEventListener('click', () => {
      this.callbacks.onShowChapter(this);
    });

    this.label = document.createElement('div');
    this.label.classList.add('h5peditor-portfolio-chapter-button-label');
    this.label.innerText = this.callbacks.onGetTitle(this);
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

  update() {
    this.label.innerText = this.callbacks.onGetTitle(this);
  }

  remove() {
    this.dom.remove();
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
