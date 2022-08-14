import './chapter-navigation.scss';
import Util from './../h5peditor-portfolio-util';
import ChapterNavigationButton from './chapter-navigation-button.js';
import SubMenu from './sub-menu.js';
import Dictionary from './../services/dictionary';

export default class ChapterNavigation {
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      title: ''
    }, params);

    this.callbacks = Util.extend({
      onGetTitle: (() => {}),
      onAddChapter: (() => {}),
      onShowChapter: (() => {}),
      onSubMenuMoved: (() => {}),
      onSubMenuDeleted: (() => {})
    }, callbacks);

    this.buttons = [];

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
      this.handleAddChapter();
    });
    this.dom.appendChild(this.buttonAdd);

    for (let id = 0; id < this.params.chapterList.getValue().length; id++) {
      this.addButton(id);
    }

    this.subMenu = new SubMenu(
      {
        options: [
          {
            id: 'move-up',
            label: Dictionary.get('l10n.moveUp'),
            onClick: (target => {
              this.callbacks.onSubMenuMoved(this.getButtonId(target), -1);
            })
          },
          {
            id: 'move-down',
            label: Dictionary.get('l10n.moveDown'),
            onClick: (target => {
              this.callbacks.onSubMenuMoved(this.getButtonId(target), +1);
            })
          },
          {
            id: 'delete',
            label: Dictionary.get('l10n.delete'),
            onClick: (target => {
              this.callbacks.onSubMenuDeleted(this.getButtonId(target));
            })
          }
        ]
      }
    );
    this.dom.appendChild(this.subMenu.getDOM());
  }

  /**
   * Get DOM.
   *
   * @returns {HTMLElement} DOM.
   */
  getDOM() {
    return this.dom;
  }

  getButtonId(target) {
    return this.buttons.findIndex(button => button === target);
  }

  getChapterGroup(id) {
    let result = null;

    this.params.chapterList.forEachChild((child, index) => {
      if (index === id) {
        result = child;
      }
    });

    return result;
  }

  /**
   * Add button.
   *
   * @param {number} id Id of button to add.
   */
  addButton(id) {
    this.buttons[id] = new ChapterNavigationButton(
      {
        chapterGroup: this.getChapterGroup(id)
      },
      {
        onGetTitle: ((target) => {
          const buttonId = this.getButtonId(target);
          return this.callbacks.onGetTitle((buttonId === -1) ? id : buttonId);
        }),
        onShowChapter: ((target) => {
          this.callbacks.onShowChapter(this.getButtonId(target));
        }),
        onShowMenu: ((target) => {
          this.handleShowMenu(target);
        })
      }
    );

    this.dom.insertBefore(
      this.buttons[id].getDOM(),
      this.buttonSeparator
    );
  }

  /**
   * Remove button.
   *
   * @param {number} id Id of button to remove.
   */
  removeButton(id) {
    if (!this.buttons[id]) {
      return;
    }

    this.buttons[id].remove();

    this.buttons.splice(id, 1);
  }

  updateButtons() {
    this.buttons.forEach(button => {
      button.update();
    });
  }

  /**
   * Swap button hierarchies.
   *
   * @param {string} hierarchySource Hierarchy of button #1 to swap.
   * @param {string} hierarchyTarget Hierarchy of button #2 to swap.
   */
  // swapButtonHierarchies(hierarchySource, hierarchyTarget) {
  //   const button1 = this.buttons[hierarchySource];
  //   const button2 = this.buttons[hierarchyTarget];
  //
  //   if (!button1 || !button2) {
  //     return;
  //   }
  //
  //   const tmp = this.buttons[hierarchyTarget].getHierarchy();
  //   this.buttons[hierarchyTarget].setHierachy(this.buttons[hierarchySource].getHierarchy());
  //   this.buttons[hierarchySource].setHierachy(tmp);
  // }

  /**
   * Set current button.
   *
   * @param {number} targetId Id of button to set active.
   */
  setCurrentButton(targetId) {
    this.buttons.forEach((button, id) => {
      button.setActive(id === targetId);
    });
  }

  /**
   * Handle show sub menu.
   *
   * @param {ChapterNavigationButton} target Calling button.
   */
  handleShowMenu(target) {
    const button = this.buttons.find(button => button === target);
    if (!button) {
      return;
    }

    button.attachMenu(this.subMenu);
  }

  handleAddChapter() {
    if (this.params.chapterList.addItem()) {
      const idAdded = this.buttons.length;
      this.addButton(idAdded);

      this.callbacks.onAddChapter(idAdded);
    }
  }
}
