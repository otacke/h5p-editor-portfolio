import './chapter-navigation-button.scss';
import Util from '@services/util';
import Dictionary from '@services/dictionary';
import SubMenu from './sub-menu.js';

export default class ChapterNavigationButton {
  constructor(params = {}, callbacks = {}) {
    this.params = Util.extend({
      hierarchyLevel: 1,
      hierarchyLevelMax: 3
    }, params);

    this.callbacks = Util.extend({
      onShowChapter: (() => {}),
      onShowMenu: (() => {}),
      onLabelEdited: (() => {}),
      onFocusOut: (() => {}), // Button lost focus
      onMouseDown: (() => {}), // Select with mouse
      onMouseUp: (() => {}), // Select with mouse
      onDragStart: (() => {}), // Drag start
      onDragEnter: (() => {}), // Drag entered other paragraph
      onDragLeave: (() => {}), // Drag left other paragraph
      onDragEnd: (() => {}), // Drag end
      onMovedUp: (() => {}),
      onMovedDown: (() => {}),
      onMovedRight: (() => {}),
      onMovedLeft: (() => {}),
      onDelete: (() => {}),
      onEdit: (() => {}),
      onTabNext: (() => {}),
      onTabPrevious: (() => {})
    }, callbacks);

    this.handleLabelEdited = this.handleLabelEdited.bind(this);

    // Shown state
    this.shown = true;

    // Build DOM
    this.dom = document.createElement('button');
    this.dom.classList.add('h5peditor-portfolio-chapter-button');
    this.dom.classList.add(`h5peditor-portfolio-chapter-button-level-${this.params.hierarchyLevel}`);
    this.dom.setAttribute('draggable', true);
    this.dom.setAttribute('role', 'menuitem');
    this.dom.setAttribute('tabindex', '-1');
    this.dom.addEventListener('click', (event) => {
      if (event.target === this.menu) {
        return; // Is sub menu button
      }

      Util.doubleClick(
        event,
        () => {
          this.handleSingleClick(event);
        },
        () => {
          this.handleDoubleClick(event);
        }
      );
    });

    // Label
    this.label = document.createElement('div');
    this.label.classList.add('h5peditor-portfolio-chapter-button-label');
    this.label.innerText = this.params.title;
    this.dom.appendChild(this.label);

    // Menu
    this.menu = document.createElement('button');
    this.menu.classList.add('h5peditor-portfolio-chapter-button-menu');
    this.menu.setAttribute('aria-label', Dictionary.get('a11y.openSubmenu'));
    this.menu.addEventListener('click', (event) => {
      this.handleClickMenu(event);
    });

    this.dom.appendChild(this.menu);

    // Placeholder to show when dragging
    this.dragPlaceholder = document.createElement('div');
    this.dragPlaceholder.classList.add('h5peditor-portfolio-chapter-button-placeholder');

    // These listeners prevent Firefox from showing draggable animation
    this.dragPlaceholder.addEventListener('dragover', (event) => {
      event.preventDefault();
    });
    this.dragPlaceholder.addEventListener('drop', (event) => {
      event.preventDefault();
    });

    // Add move listeners
    this.addMoveHandlers(this.dom);

    if (this.params.chapterGroup) {
      this.params.chapterGroup.on('summary', (event) => {
        this.label.innerText = event.data;
      });
    }

    this.updateARIA();
  }

  /**
   * Get DOM.
   * @returns {HTMLElement} The DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Update ARIA.
   */
  updateARIA() {
    const selectedText = this.isSelected() ?
      Dictionary.get('a11y.selected') :
      Dictionary.get('a11y.notSelected');

    let hierarchyText = '';
    hierarchyText = Dictionary.get('a11y.hierarchyLevel')
      .replace(/@level/g, parseInt(this.params.hierarchyLevel));

    const label = [this.label.innerText, hierarchyText, selectedText]
      .filter((label) => label.trim() !== '')
      .join('. ');

    this.dom.setAttribute('aria-label', label);
  }

  /**
   * Set active.
   * @param {boolean} state If true, set active.
   */
  setActive(state) {
    this.dom.classList.toggle('current', state);
    this.dom.setAttribute('tabindex', state ? '0' : '-1');
  }

  /**
   * Set selected.
   * @param {boolean} state If true, set selected.
   */
  setSelected(state) {
    this.selected = state;
    this.dom.classList.toggle('selected', state);
    this.updateARIA();
  }

  /**
   * Update button values.
   * @param {object} params Parameters.
   * @param {string} [params.title] Button label.
   * @param {number} [params.hierarchyLevel] Hierarchy level.
   */
  update(params = {}) {
    if (typeof params.title === 'string') {
      this.label.innerText = params.title;
    }

    if (typeof params.hierarchyLevel === 'number') {
      for (let i = 1; i <= this.params.hierarchyLevelMax; i++) {
        const levelClass = `h5peditor-portfolio-chapter-button-level-${i}`;
        this.dom.classList.toggle(levelClass, i === params.hierarchyLevel);
      }
      this.params.hierarchyLevel = params.hierarchyLevel;
    }

    this.updateARIA();
  }

  /**
   * Determine whether paragraph is shown.
   * @returns {boolean} True, if paragraph is shown.
   */
  isShown() {
    return this.shown;
  }

  /**
   * Focus button.
   */
  focus() {
    this.dom.focus();
  }

  /**
   * Show button.
   */
  show() {
    this.dom.classList.remove('no-display');
    this.shown = true;
  }

  /**
   * Hide button.
   */
  hide() {
    this.dom.classList.add('no-display');
    this.shown = false;
  }

  /**
   * Remove DOM.
   */
  remove() {
    this.dom.remove();
  }

  /**
   * Toggle dragging state.
   * @param {boolean} state If true/false, set dragging state to true/false.
   */
  toggleDragging(state) {
    if (typeof state !== 'boolean') {
      return;
    }

    this.dom.classList.toggle('is-dragging', state);
  }

  /**
   * Edit label.
   */
  editLabel() {
    this.label.setAttribute('contentEditable', true);
    this.editingLabel = true;

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
   * Get label.
   * @returns {string} Current label.
   */
  getLabel() {
    return this.label.innerText;
  }

  /**
   * Handle label was edited.
   * @param {KeyboardEvent|FocusEvent} event Event.
   */
  handleLabelEdited(event) {
    if (event instanceof KeyboardEvent) {
      if (event.key !== 'Enter') {
        return;
      }
    }

    if (event.type === 'focusout' && event.relatedTarget === this.dom) {
      return; // Still on label
    }

    this.editingLabel = false;

    event.preventDefault();

    this.label.removeEventListener('focusout', this.handleLabelEdited);
    this.label.removeEventListener('keyup', this.handleLabelEdited);

    this.label.setAttribute('contentEditable', false);
    this.label.scrollLeft = 0;

    this.dom.focus();
    this.setActive(true);

    this.callbacks.onLabelEdited(this, this.label.innerText);
  }

  /**
   * Show sub menu.
   * @param {SubMenu} subMenu Sub menu.
   * @param {boolean} keyboardUsed True, if was called using keyboard.
   */
  showSubMenu(subMenu, keyboardUsed = false) {
    // Register button with subMenu
    subMenu.setParent(this);

    // Move subMenu below this button
    this.dom.after(subMenu.getDOM());

    setTimeout(() => {
      const rect = this.dom.getBoundingClientRect();

      this.menu.setAttribute('aria-label', Dictionary.get('a11y.closeSubmenu'));
      this.menu.classList.add('active');
      subMenu.show({
        keyboardUsed: keyboardUsed,
        css: {
          width: `${rect.width}px`,
          left: `calc(${rect.left}px + ${rect.width}px - 1.5rem)`,
          top: `calc(${this.dom.offsetTop}px + ${rect.height}px - 1.5rem)`,
        }
      });

      subMenu.once('hidden', (event) => {
        this.menu.classList.remove('active');
        this.menu.setAttribute('aria-label', Dictionary.get('a11y.openSubmenu'));
        if (!event?.data?.keepFocus) {
          this.dom.focus();
        }
      });
    }, 0);
  }

  /**
   * Handle click on menu button.
   * @param {PointerEvent} event Event.
   */
  handleClickMenu(event) {
    if (this.menu.classList.contains('active')) {
      return;
    }

    if (this.editingLabel) {
      this.handleLabelEdited(event);
    }

    this.callbacks.onShowMenu(this, event.pointerType === '');
  }

  /**
   * Attach drag placeholder.
   */
  attachDragPlaceholder() {
    this.dom.parentNode.insertBefore(this.dragPlaceholder, this.dom.nextSibling);
  }

  /**
   * Show drag placeholder. Draggable must be visible, or width/height = 0
   */
  showDragPlaceholder() {
    if (!this.isShown()) {
      return;
    }

    this.updateDragPlaceholderSize();
    this.attachDragPlaceholder();
  }

  /**
   * Hide drag placeholder.
   */
  hideDragPlaceholder() {
    if (!this.dragPlaceholder.parentNode) {
      return;
    }

    this.dragPlaceholder.parentNode.removeChild(this.dragPlaceholder);
  }

  /**
   * Update drag placeholder size.
   * @param {object} [params={}] Parameters.
   * @param {number} [params.width] Optional explicit width.
   * @param {number} [params.height] Optional explicit height.
   */
  updateDragPlaceholderSize(params = {}) {
    this.buttonStyle = this.buttonStyle || window.getComputedStyle(this.dom);
    const borderSize = {
      top: this.buttonStyle.getPropertyValue('border-top').split(' ')[0],
      right: this.buttonStyle.getPropertyValue('border-right').split(' ')[0],
      bottom: this.buttonStyle.getPropertyValue('border-bottom').split(' ')[0],
      left: this.buttonStyle.getPropertyValue('border-left').split(' ')[0]
    };

    if (typeof params.width === 'number') {
      params.width = `${params.width}px`;
    }
    else if (typeof params.width !== 'string') {
      params.width = null;
    }
    params.width = params.width ||
      `calc(${this.dom.offsetWidth}px - ${borderSize.left} - ${borderSize.right})`;

    if (typeof params.height === 'number') {
      params.height = `${params.height}px`;
    }
    else if (typeof params.height !== 'string') {
      params.height = null;
    }

    params.height = params.height ||
      `calc(${this.dom.offsetHeight}px - ${borderSize.top} - ${borderSize.bottom} - 2px)`;

    this.dragPlaceholder.style.width = params.width;
    this.dragPlaceholder.style.height = params.height;
  }

  /**
   * Add drag handlers to button.
   * @param {HTMLElement} button Button.
   */
  addMoveHandlers(button) {
    // Mouse down. Prevent dragging when using buttons.
    button.addEventListener('mousedown', (event) => {
      this.callbacks.onShowChapter(this);
      this.handleMouseUpDown(event, 'onMouseDown');
    });

    // Mouse up. Allow dragging after using buttons.
    button.addEventListener('mouseup', (event) => {
      this.handleMouseUpDown(event, 'onMouseUp');
    });

    // Focus out
    button.addEventListener('focusout', (event) => {
      this.handleFocusOut(event);
    });

    // Drag start
    button.addEventListener('dragstart', (event) => {
      this.handleDragStart(event);
    });

    // Drag over
    button.addEventListener('dragover', (event) => {
      this.handleDragOver(event);
    });

    // Drag enter
    button.addEventListener('dragenter', (event) => {
      this.handleDragEnter(event);
    });

    // Drag leave
    button.addEventListener('dragleave', (event) => {
      this.handleDragLeave(event);
    });

    // Drag end
    button.addEventListener('dragend', (event) => {
      this.handleDragEnd(event);
    });

    // Key down
    button.addEventListener('keydown', (event) => {
      this.handleKeyDown(event);
    });
  }

  /**
   * Handle mouse button up or down.
   * @param {Event} event Mouse event.
   * @param {string} callbackName Callback name.
   */
  handleMouseUpDown(event, callbackName) {
    if (callbackName === 'onMouseDown') {
      // Used in dragstart for Firefox workaround
      this.pointerPosition = {
        x: event.clientX,
        y: event.clientY
      };
    }

    this.callbacks[callbackName]();
  }

  /**
   * Handle focus out.
   */
  handleFocusOut() {
    this.callbacks.onFocusOut(this);
  }

  /**
   * Handle drag start.
   * @param {Event} event Event.
   */
  handleDragStart(event) {
    this.dom.classList.add(`over`);
    event.dataTransfer.effectAllowed = 'move';

    // Workaround for Firefox that may scale the draggable down otherwise
    event.dataTransfer.setDragImage(
      this.dom,
      this.pointerPosition.x - this.dom.getBoundingClientRect().left,
      this.pointerPosition.y - this.dom.getBoundingClientRect().top
    );

    // Will hide browser's draggable copy as well without timeout
    clearTimeout(this.placeholderTimeout);
    this.placeholderTimeout = setTimeout(() => {
      this.showDragPlaceholder();
      this.hide();
    }, 0);

    this.callbacks.onDragStart(this);
  }

  /**
   * Handle drag over.
   * @param {Event} event Event.
   */
  handleDragOver(event) {
    event.preventDefault();
  }

  /**
   * Handle drag enter.
   */
  handleDragEnter() {
    this.callbacks.onDragEnter(this);
  }

  /**
   * Handle drag leave.
   * @param {Event} event Event.
   */
  handleDragLeave(event) {
    if (this.dom !== event.target || this.dom.contains(event.fromElement)) {
      return;
    }

    this.callbacks.onDragLeave(this);
  }

  /**
   * Handle drag end.
   */
  handleDragEnd() {
    clearTimeout(this.placeholderTimeout);
    this.hideDragPlaceholder();
    this.show();
    this.dom.classList.remove(`over`);

    this.callbacks.onDragEnd(this);
  }

  /**
   * Handle keydown.
   * @param {Event} event Event.
   */
  handleKeyDown(event) {
    if (this.editingLabel) {
      return;
    }

    if (event.code === 'ArrowUp') {
      event.preventDefault();
      if (this.isSelected()) {
        this.callbacks.onMovedUp(this);
      }
      else {
        this.callbacks.onTabPrevious(this);
      }
    }
    else if (event.code === 'ArrowDown') {
      event.preventDefault();
      if (this.isSelected()) {
        this.callbacks.onMovedDown(this);
      }
      else {
        this.callbacks.onTabNext(this);
      }
    }
    else if (!this.isSelected()) {
      return;
    }
    else if (event.code === 'ArrowRight') {
      event.preventDefault();
      this.callbacks.onMovedRight(this);
    }
    else if (event.code === 'ArrowLeft') {
      event.preventDefault();
      this.callbacks.onMovedLeft(this);
    }
    else if (event.code === 'Delete') {
      event.preventDefault();
      this.callbacks.onDelete(this);
    }
    else if (event.code === 'KeyE') {
      event.preventDefault();
      this.callbacks.onEdit(this);
    }
  }

  /**
   * Handle single click.
   * @param {MouseEvent|TouchEvent} event Event.
   */
  handleSingleClick(event) {
    if (this.editingLabel && event.pointerType === '') {
      return; // Editing label, ignore 'space'
    }

    if (this.editingLabel && event.target === this.label) {
      return; // Only trying to set cursor with mouse
    }

    if (this.editingLabel) {
      this.handleLabelEdited(event);
    }

    if (!this.isSelected()) {
      this.callbacks.onShowChapter(this);
    }

    if (event.pointerType === 'mouse') {
      return;
    }

    this.setSelected(!this.isSelected());
  }

  /**
   * Handle single click.
   */
  handleDoubleClick() {
    this.editLabel();
  }

  /**
   * Determine whether button is selected.
   * @returns {boolean} True, if button is selected.
   */
  isSelected() {
    return this.selected;
  }
}
