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
      onGetButtonCapabilities: (() => {}),
      onAddChapter: (() => {}),
      onShowChapter: (() => {}),
      onSubMenuMoved: (() => {}),
      onSubMenuHierarchyChanged: (() => {}),
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
    this.buttonAdd.setAttribute('aria-label', Dictionary.get('l10n.addChapter'));
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
            id: 'edit-label',
            label: Dictionary.get('l10n.editLabel'),
            onClick: (target => {
              this.editButtonLabel(this.getButtonId(target));
            })
          },
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
            id: 'hierarchy-up',
            label: Dictionary.get('l10n.hierarchyUp'),
            onClick: (target => {
              this.callbacks.onSubMenuHierarchyChanged(this.getButtonId(target), -1);
            })
          },
          {
            id: 'hierarchy-down',
            label: Dictionary.get('l10n.hierarchyDown'),
            onClick: (target => {
              this.callbacks.onSubMenuHierarchyChanged(this.getButtonId(target), 1);
            })
          },
          {
            id: 'delete',
            label: Dictionary.get('l10n.delete'),
            onClick: (target => {
              this.handleSubMenuDeleted(target);
            })
          }
        ]
      }
    );
    this.dom.appendChild(this.subMenu.getDOM());

    this.deleteDialog = new H5P.ConfirmationDialog({
      headerText: Dictionary.get('l10n.deleteDialogHeader'),
      dialogText: Dictionary.get('l10n.deleteDialogText'),
      cancelText: Dictionary.get('l10n.deleteDialogCancel'),
      confirmText: Dictionary.get('l10n.deleteDialogConfirm')
    });
    this.deleteDialog.appendTo(document.body);
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
        title: this.callbacks.onGetTitle(id),
        chapterGroup: this.getChapterGroup(id)
      },
      {
        onShowChapter: ((target) => {
          this.callbacks.onShowChapter(this.getButtonId(target));
        }),
        onShowMenu: ((target) => {
          this.handleShowMenu(target);
        }),
        onLabelEdited: ((target, label) => {
          this.handleLabelEdited(target, label);
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

  editButtonLabel(id) {
    this.buttons[id].editLabel();
  }

  /**
   * Update buttons.
   */
  updateButtons() {
    this.buttons.forEach((button, index) => {
      button.update({
        title: this.callbacks.onGetTitle(index),
        hierarchyLevel: (this.params.chapterList.getValue())[index]
          .chapterHierarchy.split('-').length
      });
    });
  }

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
   * Handle label deleted.
   *
   * @param {ChapterNavigationButton} target Calling button.
   */
  handleSubMenuDeleted(target) {
    this.deleteDialog.once('confirmed', () => {
      this.deleteDialog.off('canceled');
      this.callbacks.onSubMenuDeleted(this.getButtonId(target));
    });

    this.deleteDialog.once('canceled', () => {
      this.deleteDialog.off('confirmed');
    });

    this.deleteDialog.show();
  }

  /**
   * Handle label edited.
   *
   * @param {ChapterNavigationButton} target Calling button.
   * @param {string} label Label text.
   */
  handleLabelEdited(target, label) {
    const id = this.buttons.findIndex(button => button === target);
    if (id === -1) {
      return;
    }

    let listFoo;

    this.params.chapterList.forEachChild((child, index) => {
      if (index === id) {
        listFoo = child;
      }
    });

    // TODO: Find better way to detect field
    const inputField = listFoo.$content.get(0).querySelectorAll('input.h5peditor-text')[1];

    // Will update title field and metadata title and store value
    inputField.value = label;
    inputField.dispatchEvent(new InputEvent('change', { data: label }));
  }

  /**
   * Handle show sub menu.
   *
   * @param {ChapterNavigationButton} target Calling button.
   */
  handleShowMenu(target) {
    const id = this.buttons.findIndex(button => button === target);
    if (id === -1) {
      return;
    }

    // Show/hide submenu items based on capability of button
    this.subMenu.toggleOptions(this.callbacks.onGetButtonCapabilities(id));

    this.buttons[id].showSubMenu(this.subMenu);
  }

  handleAddChapter() {
    if (this.params.chapterList.addItem()) {
      const idAdded = this.buttons.length;
      this.addButton(idAdded);

      this.callbacks.onAddChapter(idAdded);
    }
  }
}
