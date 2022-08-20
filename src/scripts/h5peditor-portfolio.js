import ChapterNavigation from './components/chapter-navigation';
import Util from './h5peditor-portfolio-util';
import Dictionary from './services/dictionary';

/** Class for Portfolio H5P widget */
export default class Portfolio {

  /**
   * @constructor
   * @param {object} parent Parent element in semantics.
   * @param {object} field Semantics field properties.
   * @param {object} params Parameters entered in editor form.
   * @param {function} setValue Callback to set parameters.
   */
  constructor(parent, field, params, setValue) {
    this.parent = parent;
    this.field = field;
    this.params = Util.extend({
      chapters: []
    }, params);
    this.setValue = setValue;

    // Fill dictionary
    Dictionary.fill({
      l10n: {
        options: H5PEditor.t('H5PEditor.Portfolio', 'options'),
        hierarchyUp: H5PEditor.t('H5PEditor.Portfolio', 'hierarchyUp'),
        hierarchyDown: H5PEditor.t('H5PEditor.Portfolio', 'hierarchyDown'),
        moveUp: H5PEditor.t('H5PEditor.Portfolio', 'moveUp'),
        moveDown: H5PEditor.t('H5PEditor.Portfolio', 'moveDown'),
        delete: H5PEditor.t('H5PEditor.Portfolio', 'delete'),
        editLabel: H5PEditor.t('H5PEditor.Portfolio', 'editLabel'),
        deleteDialogHeader: H5PEditor.t('H5PEditor.Portfolio', 'deleteDialogHeader'),
        deleteDialogText: H5PEditor.t('H5PEditor.Portfolio', 'deleteDialogText'),
        deleteDialogCancel: H5PEditor.t('H5PEditor.Portfolio', 'deleteDialogCancel'),
        deleteDialogConfirm: H5PEditor.t('H5PEditor.Portfolio', 'deleteDialogConfirm'),
        chapter: H5PEditor.t('H5PEditor.Portfolio', 'chapter'),
        addChapter: H5PEditor.t('H5PEditor.Portfolio', 'addChapter')
      }
    });

    this.params.chapters = this.sanitize(this.params.chapters || []);

    this.chapterDOMsOrder = [... Array(this.params.chapters.length).keys()];

    // Callbacks to call when parameters change
    this.changes = [];

    // Let parent handle ready callbacks of children
    this.passReadies = true;

    // DOM
    this.$container = H5P.jQuery('<div>', {
      class: 'h5peditor-portfolio'
    });

    const chaptersDOM = document.createElement('div');
    chaptersDOM.classList.add('h5peditor-portfolio-chapters');

    // Instantiate original field (or create your own and call setValue)
    this.fieldInstance = new H5PEditor.widgets[this.field.type](this.parent, this.field, this.params, this.setValue);
    this.fieldInstance.appendTo(H5P.jQuery(chaptersDOM));

    this.chapterList = this.fieldInstance.children.find(child => {
      return child?.getName() === 'chapters';
    });

    const mainDOM = document.createElement('div');
    mainDOM.classList.add('h5peditor-portfolio-main');

    this.chapterNavigation = new ChapterNavigation(
      {
        title: this.parent?.metadata?.title || 'Portfolio',
        chapterList: this.chapterList
      },
      {
        onGetTitle: (id) => {
          return this.getChapterTitle(id);
        },
        onGetButtonCapabilities: (id => {
          return this.getButtonCapabilities(id);
        }),
        onAddChapter: (id) => {
          this.handleAddChapter(id);
        },
        onShowChapter: (id) => {
          this.handleShowChapter(id);
        },
        onSubMenuEditLabel: (id) => {
          this.handleEditLabel(id);
        },
        onSubMenuMoved: (id, offset) => {
          return this.moveChapter(id, offset);
        },
        onSubMenuHierarchyChanged: (id, offset) => {
          this.handleChangeHierarchy(id, offset);
        },
        onSubMenuDeleted: (id) => {
          this.handleDeleteChapter(id);
        },
        onChaptersReordered: (newOrder) => {
          this.handleChaptersReordered(newOrder);
        }
      }
    );
    mainDOM.appendChild(this.chapterNavigation.getDOM());
    mainDOM.appendChild(chaptersDOM);

    this.$container.get(0).appendChild(mainDOM);

    // Relay changes
    if (this.fieldInstance.changes) {
      this.fieldInstance.changes.push(() => {
        this.handleFieldChange();
      });
    }

    // Errors (or add your own)
    this.$errors = this.$container.find('.h5p-errors');

    // Use H5PEditor.t('H5PEditor.Boilerplate', 'foo'); to output translatable strings

    this.handleShowChapter(0);

    this.chapterNavigation.updateButtons();

    // Store values that may have been created as default
    this.setValue(this.field, this.params);
  }

  /**
   * Append field to wrapper. Invoked by H5P core.
   * @param {H5P.jQuery} $wrapper Wrapper.
   */
  appendTo($wrapper) {
    this.$container.appendTo($wrapper);
  }

  /**
   * Validate current values. Invoked by H5P core.
   * @return {boolean} True, if current value is valid, else false.
   */
  validate() {
    return this.fieldInstance.validate();
  }

  /**
   * Remove self. Invoked by H5P core.
   */
  remove() {
    this.$container.remove();
  }

  /**
   * Get chapter DOMs.
   *
   * @returns {HTMLElement[]} DOMs of chapters in list widget.
   */
  getChapterDOMs() {
    return this.fieldInstance.$content.get(0)
      .querySelectorAll('.h5p-li > .field-name-chapter > .content') || [];
  }

  /**
   * Get new hierarchy level.
   *
   * @returns {string|null} New hierarchy level.
   */
  getNewHierarchy() {
    const newHierarchy = this.params.chapters.reduce((newHierarchy, chapter) => {
      const topLevel = (chapter.chapterHierarchy || '0').split('-')[0];
      return Math.max(parseInt(topLevel), newHierarchy);
    }, 0);

    return newHierarchy ? (newHierarchy + 1).toString() : null;
  }

  /**
   * Handle change of field.
   */
  handleFieldChange() {
    this.params = this.fieldInstance.params;
    this.changes.forEach(change => {
      change(this.params);
    });
  }

  /**
   * Handle adding new chapter.
   *
   * @param {number} id Id of item that was added.
   */
  handleAddChapter(id) {
    const hierarchy = this.getNewHierarchy();
    if (!hierarchy) {
      return; // TODO: This should be handled with a warning?
    }

    this.params.chapters[id].chapterHierarchy = hierarchy;
    this.chapterDOMsOrder.push(id);

    this.handleShowChapter(id);

    // Store values
    this.setValue(this.field, this.params);
  }

  /**
   * Handle adding new chapter.
   */
  handleDeleteChapter(id) {
    if (typeof id !== 'number' || this.params.chapters.length === 1) {
      return;
    }

    this.chapterDOMsOrder.splice(id, 1);
    this.chapterDOMsOrder = this.chapterDOMsOrder.map(index => {
      return (index < id) ? index : index - 1;
    });

    // Show previous chapter
    const nextIndex = (id === 0) ? 1 : id - 1;

    this.handleShowChapter(nextIndex);

    // Remove item from list
    this.chapterList.removeItem(id);

    // Handle buttons in navigation
    this.chapterNavigation.removeButton(id);

    // Store values
    this.setValue(this.field, this.params);
  }

  /**
   * Handler for moving a chapter.
   *
   * @param {string} indexSource Button id of button to be moved.
   * @param {number} offset Offset of where to move chapter to.
   * @return {boolean} True if could be moved, else false.
   */
  moveChapter(indexSource, offset) {
    if (
      typeof indexSource !== 'number' ||
      indexSource < 0 || indexSource > this.params.chapters.length - 1 ||
      typeof offset !== 'number'
    ) {
      return false; // No valid input
    }

    const indexTarget = indexSource + offset;
    if (indexTarget < 0 || indexTarget > this.params.chapters.length - 1) {
      return false; // Out of bounds
    }

    if (
      indexSource === 0 &&
      this.params.chapters[1].chapterHierarchy.split('-').length !== 1
    ) {
      return false; // Position 0 must keep hierarchy 1
    }

    if (
      indexTarget === 0 &&
      this.params.chapters[indexSource].chapterHierarchy.split('-').length !== 1
    ) {
      return false; // Position 0 must keep hierarchy 1
    }

    // Move item parameters in list widget
    this.chapterList.moveItem(indexSource, indexTarget);

    // List widget doesn't resort DOM elemens, need to move in tracking array
    const item = this.chapterDOMsOrder.splice(indexSource, 1);
    this.chapterDOMsOrder.splice(indexTarget, 0, item[0]);

    // Rebuild hierarchies
    this.updateHierarchies();

    // Update button titles and hierarchies
    this.chapterNavigation.updateButtons();

    this.handleShowChapter(indexTarget);

    // Store values
    this.setValue(this.field, this.params);

    return true;
  }

  /**
   * Handle hierarchy changed.
   *
   * @param {number} index Index of item that was changed.
   * @param {number} offset Diff in hierarchy.
   */
  handleChangeHierarchy(index, offset) {
    if (index === 0) {
      return; // Position 0 must keep hierarchy 1
    }

    const oldLength = this.params.chapters[index].chapterHierarchy.split('-')
      .length;

    const newLength = Math.min(Math.max(1, oldLength + offset), 3);

    if (oldLength === newLength) {
      return;
    }

    // Compute placeholder with 0s. Turned into hierarchy by updateHierarchies()
    let hierachyPlaceholder;
    if (oldLength < newLength) {
      hierachyPlaceholder = [
        ...this.params.chapters[index].chapterHierarchy.split('-'),
        Array(newLength - oldLength).fill('0')
      ];
    }
    else {
      hierachyPlaceholder = Array(newLength).fill('0');
    }
    hierachyPlaceholder = hierachyPlaceholder.join('-');

    this.params.chapters[index].chapterHierarchy = hierachyPlaceholder;

    this.updateHierarchies();

    this.chapterNavigation.updateButtons();

    // Store values
    this.setValue(this.field, this.params);
  }

  /**
   * Handle request to show particular chapter.
   *
   * @param {number} id Id of chapter to show.
   */
  handleShowChapter(id) {
    const chapterDOMs = this.getChapterDOMs();

    for (let i = 0; i < chapterDOMs.length; i++) {
      chapterDOMs[i].classList.toggle(
        'active', i === this.chapterDOMsOrder[id]
      );
    }

    this.chapterNavigation.setCurrentButton(id);
  }

  getChapterTitle(id) {
    let title = this.params.chapters[id]?.content?.metadata?.title;
    if (!title) {
      title = `${Dictionary.get('l10n.chapter')} ${id}`; // Fallback
    }

    return title;
  }

  /**
   * Get button capabilities in submenu.
   *
   * @param {number} id Id of button.
   * @return {object} Key and boolean indicating capabilities.
   */
  getButtonCapabilities(id) {
    const capabilities = {};

    capabilities['edit-label'] = true;

    capabilities['move-up'] = (
      id !== 0 &&
      (
        id !== 1 ||
        this.params.chapters[1].chapterHierarchy.split('-').length === 1
      )
    );

    capabilities['move-down'] = (
      id !== this.params.chapters.length - 1
    );

    capabilities['hierarchy-up'] = (
      id !== 0 &&
      this.params.chapters[id].chapterHierarchy.split('-').length > 1
    );

    capabilities['hierarchy-down'] = (
      this.params.chapters[id].chapterHierarchy.split('-').length < 3
    );

    capabilities['delete'] = (
      id !== 0 ||
      this.params.chapters[1].chapterHierarchy.split('-').length === 1
    );

    return capabilities;
  }

  /**
   * Update hierarchies.
   */
  updateHierarchies() {
    /*
     * Computes hierarchy based on position and hierarchy which is used as a
     * placeholder only, so only its length is relevant.
     */
    const hierarchyDepth = this.params.chapters.reduce((length, chapter) => {
      return Math.max(length, chapter.chapterHierarchy.split('-').length);
    }, 1);

    const currentHierarchy = new Array(hierarchyDepth).fill(1);
    let previousDepth = 0;

    this.params.chapters.forEach(chapter => {
      const depth = chapter.chapterHierarchy.split('-').length;
      if (depth === previousDepth) {
        currentHierarchy[depth - 1]++;
      }
      else if (depth < previousDepth) {
        currentHierarchy[depth - 1]++;
        for (let i = depth; i < currentHierarchy.length; i++) {
          currentHierarchy[i] = 1;
        }
      }

      previousDepth = depth;

      chapter.chapterHierarchy = currentHierarchy.slice(0, depth).join('-');
    });
  }

  /**
   * Sanitize chapters.
   *
   * @param {object[]} params Semantics parameters for chapters.
   * @returns {object} Sanitized parameters for chapters.
   */
  sanitize(params = []) {

    // Filter out invalid chapters
    params = params.filter(chapter => {
      const validHierarchy = (new RegExp('^[1-9][0-9]*(-[1-9][0-9]*)*$'))
        .test(chapter.chapterHierarchy);

      const hasPlaceholder = chapter?.content?.params?.chapter?.contents?.length > 0;

      return validHierarchy && hasPlaceholder;
    });

    // Determine hierarchy depth
    const hierarchyDepth = params.reduce((length, chapter) => {
      return Math.max(length, chapter.chapterHierarchy.split('-').length);
    }, 1);

    // Sort by chapter hierarchy
    params = params.sort((chapterA, chapterB) => {
      // Fill hierarchy up with 0s for comparison
      const levelsA = chapterA.chapterHierarchy.split('-');
      while (levelsA.length < hierarchyDepth) {
        levelsA.push(0);
      }
      const levelsB = chapterB.chapterHierarchy.split('-');
      while (levelsB.length < hierarchyDepth) {
        levelsB.push(0);
      }

      // Compare level by level
      let result = 0;
      for (let i = 0; i < levelsA.length; i++) {
        if (parseInt(levelsA[i]) < parseInt(levelsB[i])) {
          result = -1;
          break;
        }
        else if (parseInt(levelsA[i]) > parseInt(levelsB[i])) {
          result = 1;
          break;
        }
      }

      return result;
    });

    // Add dummy chapter. TODO: parameters for Advanced Text
    if (!params.length) {
      params = [{
        id: 0,
        chapterHierarchy: '1'
      }];
    }

    return params;
  }
}
