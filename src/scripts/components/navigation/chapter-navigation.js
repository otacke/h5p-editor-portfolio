import './chapter-navigation.scss';
import Util from '@services/util';
import ChapterNavigationButton from './chapter-navigation-button.js';
import SubMenu from './sub-menu.js';
import Readspeaker from '@services/readspeaker';

export default class ChapterNavigation {
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      title: '',
      hierarchyLevelMax: 4
    }, params);

    this.callbacks = Util.extend({
      onGetChapterTitle: (() => {}),
      onGetButtonCapabilities: (() => {}),
      onAddChapter: (() => {}),
      onShowChapter: (() => {}),
      onMoveChapter: (() => {}),
      onChangeHierarchy: (() => {}),
      onCloneChapter: (() => {}),
      onDeleteChapter: (() => {})
    }, callbacks);

    this.buttons = [];

    // Build DOM
    this.dom = document.createElement('ol');
    this.dom.classList.add('h5peditor-portfolio-chapter-navigation');
    this.dom.setAttribute('role', 'menu');
    this.dom.setAttribute('tabindex', '-1');

    const title = document.createElement('div');
    title.classList.add('h5peditor-portfolio-chapter-navigation-maintitle');
    this.titleText = document.createElement('h2');
    this.titleText.classList.add('navigation-title');
    title.appendChild(this.titleText);
    this.setTitle(this.params.title);
    this.dom.appendChild(title);

    this.buttonSeparator = document.createElement('div');
    this.buttonSeparator.classList
      .add('h5peditor-portfolio-chapter-button-separator');
    this.dom.appendChild(this.buttonSeparator);

    this.buttonAdd = document.createElement('button');
    this.buttonAdd.classList.add('h5peditor-portfolio-chapter-button-add');
    this.buttonAdd.setAttribute(
      'aria-label', this.params.dictionary.get('l10n.addChapter')
    );
    this.buttonAdd.innerText = '+';
    this.buttonAdd.addEventListener('click', () => {
      this.handleAddChapter();
    });

    this.dom.appendChild(this.buttonAdd);

    for (let id = 0; id < this.params.chapterList.getValue().length; id++) {
      this.addButton(id);
      this.buttons[id].disableSubMenu();
    }

    // Track content form being loaded
    this.params.chapterList.forEachChild((group, index) => {
      const libraryFieldIndex = group.field?.fields?.findIndex((field) => {
        return field.name === 'content';
      });

      // Only allow subment actions once loaded
      if (libraryFieldIndex !== -1) {
        group.children?.[libraryFieldIndex]?.changes?.push(() => {
          this.buttons[index].enableSubMenu();
        });
      }
    });

    this.subMenu = new SubMenu(
      {
        dictionary: this.params.dictionary,
        options: [
          {
            id: 'edit-label',
            label: this.params.dictionary.get('l10n.editLabel'),
            onClick: ((target) => {
              this.editButtonLabel(this.getButtonId(target));
            }),
            keepFocus: true
          },
          {
            id: 'move-up',
            label: this.params.dictionary.get('l10n.moveUp'),
            onClick: ((target) => {
              this.callbacks.onMoveChapter(this.getButtonId(target), -1);
            }),
            keepFocus: true
          },
          {
            id: 'move-down',
            label: this.params.dictionary.get('l10n.moveDown'),
            onClick: ((target) => {
              this.callbacks.onMoveChapter(this.getButtonId(target), +1);
            }),
            keepFocus: true
          },
          {
            id: 'hierarchy-up',
            label: this.params.dictionary.get('l10n.hierarchyUp'),
            onClick: ((target) => {
              this.callbacks.onChangeHierarchy(this.getButtonId(target), -1);
            })
          },
          {
            id: 'hierarchy-down',
            label: this.params.dictionary.get('l10n.hierarchyDown'),
            onClick: ((target) => {
              this.callbacks.onChangeHierarchy(this.getButtonId(target), 1);
            })
          },
          {
            id: 'clone',
            label: this.params.dictionary.get('l10n.clone'),
            onClick: ((target) => {
              this.callbacks.onCloneChapter(this.getButtonId(target));
            })
          },
          {
            id: 'clone-plus-subchapters',
            label: this.params.dictionary.get('l10n.cloneWithSubchapters'),
            onClick: ((target) => {
              this.callbacks.onCloneChapter(
                this.getButtonId(target), { subchapters: true }
              );
            })
          },
          {
            id: 'delete',
            label: this.params.dictionary.get('l10n.delete'),
            onClick: ((target) => {
              this.handleSubMenuDeleted(target);
            }),
            keepFocus: true
          }
        ]
      }
    );
    this.dom.appendChild(this.subMenu.getDOM());

    this.deleteDialog = new H5P.ConfirmationDialog({
      headerText: this.params.dictionary.get('l10n.deleteDialogHeader'),
      dialogText: this.params.dictionary.get('l10n.deleteDialogText'),
      cancelText: this.params.dictionary.get('l10n.deleteDialogCancel'),
      confirmText: this.params.dictionary.get('l10n.deleteDialogConfirm')
    });
    this.deleteDialog.appendTo(document.body);
  }

  /**
   * Get DOM.
   * @returns {HTMLElement} DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Get id of button.
   * @param {HTMLElement} button Button to get id for.
   * @returns {number} Id of button or -1 if not found.
   */
  getButtonId(button) {
    return this.buttons.findIndex((but) => but === button);
  }

  /**
   * Get button.
   * @param {number} index Index of button.
   * @returns {HTMLElement|null} Button.
   */
  getButton(index) {
    return this.buttons?.[index] || null;
  }

  /**
   * Get chapter group from list widget.
   * @param {number} id Id of chapter.
   * @returns {object} Chapter group object.
   */
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
   * Toggle dragging state.
   * @param {boolean} state If true/false, set dragging state to true/false.
   */
  toggleDragging(state) {
    if (typeof state !== 'boolean') {
      return;
    }

    this.buttons.forEach((button) => {
      button.toggleDragging(state);
    });
  }

  /**
   * Add button.
   * @param {number} id Id of button to add.
   */
  addButton(id) {
    const chapters = this.params.chapterList.getValue();

    this.buttons[id] = new ChapterNavigationButton(
      {
        dictionary: this.params.dictionary,
        title: this.callbacks.onGetChapterTitle(id),
        chapterGroup: this.getChapterGroup(id),
        hierarchyLevel: chapters[id]?.chapterHierarchy?.split('-').length || 1,
        hierarchyLevelMax: this.params.hierarchyLevelMax
      },
      {
        onShowChapter: ((target) => {
          this.callbacks.onShowChapter(this.getButtonId(target));
        }),
        onShowMenu: ((target, keyboardUsed) => {
          this.handleShowMenu(target, keyboardUsed);
        }),
        onLabelEdited: ((target, label) => {
          this.handleLabelEdited(target, label);
        }),
        onMouseUp: (() => {
          this.handleMouseUp();
        }),
        onMouseDown: (() => {
          this.handleMouseDown();
        }),
        onDragStart: ((button) => {
          this.handleDragStart(button);
        }),
        onDragEnter: ((button) => {
          this.handleDragEnter(button);
        }),
        onDragLeave: (() => {
          this.handleDragLeave();
        }),
        onDragEnd: ((button) => {
          this.handleDragEnd(button);
        }),
        onMovedUp: ((button) => {
          this.callbacks.onMoveChapter(this.getButtonId(button), -1);
        }),
        onMovedDown: ((button) => {
          this.callbacks.onMoveChapter(this.getButtonId(button), 1);
        }),
        onMovedLeft: ((button) => {
          this.callbacks.onChangeHierarchy(this.getButtonId(button), -1);
        }),
        onMovedRight: ((button) => {
          this.callbacks.onChangeHierarchy(this.getButtonId(button), 1);
        }),
        onDelete: ((button) => {
          this.handleSubMenuDeleted(button);
        }),
        onEdit: ((button) => {
          this.editButtonLabel(this.getButtonId(button));
        }),
        onTabNext: ((button) => {
          this.tabTo(button, 1, { loop: true });
        }),
        onTabPrevious: ((button) => {
          this.tabTo(button, -1, { loop: true });
        })
      }
    );

    const buttonWrapper = document.createElement('li');
    buttonWrapper.classList.add('h5peditor-portfolio-chapter-button-wrapper');
    buttonWrapper.appendChild(this.buttons[id].getDOM());

    this.dom.insertBefore(
      buttonWrapper,
      this.buttonSeparator
    );
  }

  /**
   * Remove button.
   * @param {number} id Id of button to remove.
   */
  removeButton(id) {
    if (!this.buttons[id]) {
      return;
    }

    this.buttons[id].remove();

    this.buttons.splice(id, 1);
  }

  /**
   * Edit button label.
   * @param {number} id Id of button to re-label.
   */
  editButtonLabel(id) {
    this.buttons[id].editLabel();
  }

  /**
   * Get button label.
   * @param {number} index Index of button.
   * @returns {string} Button label.
   */
  getButtonLabel(index) {
    return this.buttons?.[index].getLabel() ?? '';
  }

  /**
   * Get button labels.
   * @param {number} [level] Optional level to retrieve only.
   * @returns {string[]} Button labels.
   */
  getButtonLabels(level) {
    return this.buttons
      .filter((button) => {
        return typeof level !== 'number' ?
          true :
          button.getHierarchieLevel() === level;
      })
      .map((button) => button.getLabel() ?? '');
  }

  /**
   * Update buttons.
   */
  updateButtons() {
    const chapters = this.params.chapterList.getValue();
    this.buttons.forEach((button, index) => {
      button.update({
        title: this.callbacks.onGetChapterTitle(index),
        hierarchyLevel: chapters[index]
          .chapterHierarchy.split('-').length
      });
    });
  }

  /**
   * Set current button.
   * @param {number} targetId Id of button to set active.
   */
  setCurrentButton(targetId) {
    this.buttons.forEach((button, id) => {
      button.setActive(id === targetId);
      if (id === targetId) {
        button.focus();
      }
    });
  }

  /**
   * Set button selected.
   * @param {number} targetId Id of button to set selected.
   */
  setSelectedButton(targetId) {
    this.buttons.forEach((button, id) => {
      button.setSelected(id === targetId);
    });
  }

  /**
   * Set chapter navigation title.
   * @param {string} title Title to set.
   */
  setTitle(title) {
    if (typeof title !== 'string') {
      return;
    }

    this.titleText.innerHTML = Util.purifyHTML(title);
  }

  /**
   * Handle label deleted.
   * @param {ChapterNavigationButton} target Calling button.
   */
  handleSubMenuDeleted(target) {
    if (this.buttons.length === 1) {
      Readspeaker.read([
        this.params.dictionary.get('a11y.notPossible'),
        this.params.dictionary.get('a11y.cannotDeleteOnlyItem')
      ]);
      return;
    }
    else if (
      this.getButtonId(target) === 0 &&
      this.params.chapterList.getValue()[1]
        .chapterHierarchy.split('-').length !== 1
    ) {
      Readspeaker.read([
        this.params.dictionary.get('a11y.notPossible'),
        this.params.dictionary.get('a11y.firstChapterHierarchyFixed')
      ]);
      return; // Position 0 must keep hierarchy 1
    }

    this.deleteDialog.once('confirmed', () => {
      this.deleteDialog.off('canceled');
      this.callbacks.onDeleteChapter(this.getButtonId(target));
    });

    this.deleteDialog.once('canceled', () => {
      this.deleteDialog.off('confirmed');
    });

    this.deleteDialog.show();
  }

  /**
   * Handle label edited.
   * @param {ChapterNavigationButton|number} target Calling button or its index.
   * @param {string} label Label text.
   */
  handleLabelEdited(target, label) {
    let id = -1;

    if (typeof target === 'number') {
      id = target;
      target = this.buttons[id];
    }
    else {
      id = this.getButtonId(target);
    }

    if (id === -1) {
      return;
    }

    const group = this.getChapterGroup(id);
    if (!group) {
      return;
    }

    const inputField = group.$content.get(0)
      .querySelectorAll('input.h5peditor-text')[1];

    // Will update title field and metadata title and store value
    inputField.value = label;
    inputField.dispatchEvent(new InputEvent('change', { data: label }));

    // Make new label known to ARIA
    target.updateARIA();
  }

  /**
   * Handle show sub menu.
   * @param {ChapterNavigationButton} target Calling button.
   * @param {boolean} keyboardUsed True, if non-pointer device used.
   */
  handleShowMenu(target, keyboardUsed) {
    const id = this.getButtonId(target);
    if (id === -1) {
      return;
    }

    // Show/hide submenu items based on capability of button
    this.subMenu.toggleOptions(this.callbacks.onGetButtonCapabilities(id));

    this.buttons[id].showSubMenu(this.subMenu, keyboardUsed);
  }

  /**
   * Handle chapter added.
   * @param {object} [params] Parameters.
   * @param {object} [params.instanceParams] Instance parameters.
   * @param {boolean} [params.doNotShow] If true, don't show chapter.
   * @returns {number|null} Id of added button or null;
   */
  handleAddChapter(params = {}) {
    let idAdded = null;

    if (this.params.chapterList.addItem(params?.instanceParams)) {
      idAdded = this.buttons.length;
      this.addButton(idAdded);

      this.callbacks.onAddChapter(idAdded, { doNotShow: params.doNotShow });
    }

    return idAdded;
  }

  /**
   * Handle mouse down.
   */
  handleMouseDown() {
    this.isMouseDownOnDraggable = true;
  }

  /**
   * Handle mouse up.
   */
  handleMouseUp() {
    this.isMouseDownOnDraggable = false;
  }

  /**
   * Handle drag start.
   * @param {ChapterNavigationButton} button Button dragged.
   */
  handleDragStart(button) {
    this.draggedElement = button;
    this.dragIndexSource = this.getButtonId(this.draggedElement);

    this.draggedChildrenIndices =
      this.getChildButtonIndices(this.dragIndexSource);

    if (this.draggedChildrenIndices.length) {
      this.draggedElement.setChildCounter(`+${this.draggedChildrenIndices.length}`);
    }

    this.draggedChildrenIndices.forEach((index) => {
      this.buttons[index].hide();
    });

    this.toggleDragging(true);
  }

  /**
   * Handle drag enter.
   * @param {ChapterNavigationButton} button Button dragged on.
   */
  handleDragEnter(button) {
    if (this.dropzoneElement && this.dropzoneElement === button) {
      return; // Prevent jumping when paragraph is smaller than others
    }

    this.dropzoneElement = button;
    this.dragIndexTarget = this.getButtonId(button);

    if (this.draggedElement && this.dropzoneElement && this.draggedElement !== this.dropzoneElement) {
      const id1 = this.getButtonId(this.draggedElement);
      const id2 = this.getButtonId(this.dropzoneElement);
      if (id1 < 0 || id2 < 0) {
        return;
      }

      // Swap dragged draggable and draggable that's dragged to if not identical
      if (this.dropzoneElement && this.draggedElement && this.draggedElement !== this.dropzoneElement) {
        this.swapButtons({
          button1: this.draggedElement,
          button2: this.dropzoneElement
        });
      }
    }
  }

  /**
   * Swap buttons.
   * @param {object} params Parameters.
   * @param {HTMLElement} params.button1 Button #1.
   * @param {HTMLElement} params.button2 Button #2.
   * @param {boolean} [params.skipPlaceholder] If false, no placeholder.
   */
  swapButtons(params = {}) {
    // Swap visuals
    Util.swapDOMElements(
      params.button1.getDOM(),
      params.button2.getDOM()
    );

    const id1 = this.getButtonId(params.button1);
    const id2 = this.getButtonId(params.button2);

    [this.buttons[id1], this.buttons[id2]] =
      [this.buttons[id2], this.buttons[id1]];

    if (!params.skipPlaceholder) {
      params.button1.attachDragPlaceholder();
    }
  }

  /**
   * Handle drag leave.
   */
  handleDragLeave() {
    this.dropzoneElement = null;
  }

  /**
   * Handle drag end.
   */
  handleDragEnd() {
    this.toggleDragging(false);

    let newFocusButton = this.draggedElement;

    if (
      typeof this.dragIndexTarget === 'number' &&
      this.dragIndexTarget !== -1 &&
      this.dragIndexTarget !== this.dragIndexSource
    ) {
      const moveOffset = this.dragIndexTarget - this.dragIndexSource;

      const wasMoved = this.callbacks.onMoveChapter(
        this.dragIndexSource,
        moveOffset,
        { updateNavigationButtons: false }
      );

      if (!wasMoved) {
        // Revert changes
        const button1 = this.buttons[this.dragIndexSource].getDOM();
        const button2 = this.buttons[this.dragIndexTarget].getDOM();

        if (this.dragIndexSource < this.dragIndexTarget) {
          button1.parentNode.insertBefore(button2, button1);
        }
        else {
          button1.parentNode.insertBefore(button2, button1.nextSibling);
        }

        const button = this.buttons.splice(this.dragIndexTarget, 1)[0];
        this.buttons.splice(this.dragIndexSource, 0, button);
      }
      else {
        for (let index = 0; index < this.draggedChildrenIndices.length; index++) {
          const position = this.dragIndexSource +
            ((moveOffset > 0) ? 0 : index + 1);

          this.callbacks.onMoveChapter(
            position,
            moveOffset,
            { updateNavigationButtons: false }
          );
        }

        const newParentPosition = this.dragIndexSource + moveOffset -
          ((moveOffset < 0) ? 0 : this.draggedChildrenIndices.length);
        newFocusButton = this.buttons[newParentPosition];

        this.setSelectedButton(newParentPosition);
        this.setCurrentButton(newParentPosition);

        this.buttons[this.dragIndexSource].setActive(false);
      }
    }

    this.buttons.forEach((button) => {
      button.show();
      button.setChildCounter('');
    });

    newFocusButton.focus();

    this.draggedElement = null;
    this.dropzoneElement = null;
    this.dragIndexSource = null;
    this.dragIndexTarget = null;
    this.draggedChildrenIndices = [];
  }

  /**
   * Tab to previous/next button.
   * @param {HTMLElement} button Button.
   * @param {number} offset Offset for tabbing.
   * @param {object} [options] Options.
   * @param {boolean} [options.loop] If true, will loop back.
   */
  tabTo(button, offset, options = {}) {
    let target = this.getButtonId(button) + offset;

    if (!options.loop && (target < 0 || target > this.buttons.length - 1)) {
      return;
    }
    else {
      target = target % this.buttons.length;
      if (target < 0) {
        target += this.buttons.length;
      }
    }

    button.setActive(false);
    this.buttons[target].setActive(true);
    this.buttons[target].focus();
  }

  /**
   * Show chapter navigation.
   */
  show() {
    this.dom.classList.remove('display-none');
  }

  /**
   * Hide chapter navigation.
   */
  hide() {
    this.dom.classList.add('display-none');
  }

  /**
   * Get child buttons of a button.
   * @param {index} parentIndex Index of button to get children of.
   * @returns {index[]} Children button indices.
   */
  getChildButtonIndices(parentIndex) {
    const hierarchyLevel = this.buttons[parentIndex].getHierarchieLevel();

    let done = false;
    return this.buttons
      .reduce((indices, currentButton, index) => {
        if (done || index <= parentIndex) {
          return indices;
        }

        if (currentButton.getHierarchieLevel() <= hierarchyLevel) {
          done = true;
          return indices;
        }

        return [...indices, index];
      }, []);
  }
}
