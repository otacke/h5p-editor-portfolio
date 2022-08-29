import ChapterNavigation from './components/navigation/chapter-navigation';
import PreviewOverlay from './components/preview/preview-overlay';
import Util from './h5peditor-portfolio-util';
import Dictionary from './services/dictionary';
import Readspeaker from './services/readspeaker';
import Toolbar from './components/toolbar/toolbar';

/** Class for Portfolio H5P widget */
export default class Portfolio {

  /**
   * @class
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

    this.fillDictionary();

    this.params.chapters = this.sanitize(this.params.chapters || []);

    // Keeps track of chapter DOMs of H5P core list widget
    this.chapterDOMsOrder = [... Array(this.params.chapters.length).keys()];

    // Callbacks to call when parameters change
    this.changes = [];

    // Let parent handle ready callbacks of children
    this.passReadies = true;

    // jQuery and $container required by H5P
    this.$container = H5P.jQuery('<div>', { class: 'h5peditor-portfolio' });

    // Build DOM
    this.chaptersDOM = document.createElement('div');
    this.chaptersDOM.classList.add('h5peditor-portfolio-chapters');

    // Instantiate original field (or create your own and call setValue)
    this.fieldInstance = new H5PEditor.widgets[this.field.type](
      this.parent, this.field, this.params, this.setValue
    );
    this.fieldInstance.appendTo(H5P.jQuery(this.chaptersDOM));

    // List widget holding the chapters
    this.chapterList = this.fieldInstance.children.find(child => {
      return child?.getName() === 'chapters';
    });

    const mainDOM = document.createElement('div');
    mainDOM.classList.add('h5peditor-portfolio-main');

    const toolbarDOM = document.createElement('div');
    toolbarDOM.classList.add('h5peditor-portfolio-toolbar');

    this.toolBar = new Toolbar(
      {},
      {
        onClickButtonPreview: (active) => {
          this.togglePreview(active);
        },
        onClickButtonExport: () => {
          //this.showExportDialog();
        }
      }
    );
    this.toolBar.enableButton('preview');
    this.toolBar.enableButton('export');
    toolbarDOM.appendChild(this.toolBar.getDOM());
    mainDOM.appendChild(toolbarDOM);

    const contentDOM = document.createElement('div');
    contentDOM.classList.add('h5peditor-portfolio-content');

    this.chapterNavigation = new ChapterNavigation(
      {
        title: this.parent?.metadata?.title || 'Portfolio',
        chapterList: this.chapterList,
        hierarchyLevelMax: Portfolio.MAX_LEVEL
      },
      {
        onGetChapterTitle: (id) => {
          return this.getChapterTitle(id);
        },
        onGetButtonCapabilities: (id => {
          return this.getButtonCapabilities(id);
        }),
        onAddChapter: (id) => {
          this.addChapter(id);
        },
        onShowChapter: (id) => {
          this.showChapter(id);
        },
        onMoveChapter: (id, offset) => {
          const success = this.moveChapter(id, offset);
          if (success) {
            this.chapterNavigation.setSelectedButton(id + offset);
          }
          return success;
        },
        onChangeHierarchy: (id, offset) => {
          this.changeHierarchy(id, offset);
        },
        onDeleteChapter: (id) => {
          this.deleteChapter(id);
        }
      }
    );
    contentDOM.appendChild(this.chapterNavigation.getDOM());
    contentDOM.appendChild(this.chaptersDOM);

    this.previewOverlay = new PreviewOverlay();
    contentDOM.appendChild(this.previewOverlay.getDOM());

    Readspeaker.attach(contentDOM);

    mainDOM.appendChild(contentDOM);

    this.$container.get(0).appendChild(mainDOM);

    // Relay changes
    if (this.fieldInstance.changes) {
      this.fieldInstance.changes.push(() => {
        this.handleFieldChange();
      });
    }

    // Errors (or add your own)
    this.$errors = this.$container.find('.h5p-errors');

    // Show first chapter
    this.showChapter(0);
    this.chapterNavigation.updateButtons();

    // Store values that may have been created as default
    this.setValue(this.field, this.params);
  }

  /**
   * Append field to wrapper. Invoked by H5P core.
   *
   * @param {H5P.jQuery} $wrapper Wrapper.
   */
  appendTo($wrapper) {
    this.$container.appendTo($wrapper);
  }

  /**
   * Validate current values. Invoked by H5P core.
   *
   * @returns {boolean} True, if current value is valid, else false.
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
    const newHierarchy = this.params.chapters
      .reduce((newHierarchy, chapter) => {
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
  addChapter(id) {
    const hierarchy = this.getNewHierarchy();
    if (!hierarchy) {
      return;
    }

    this.params.chapters[id].chapterHierarchy = hierarchy;
    this.chapterDOMsOrder.push(id);

    this.showChapter(id);

    // Store values
    this.setValue(this.field, this.params);
  }

  /**
   * Handle adding new chapter.
   *
   * @param {number} id Id of chater to delete.
   */
  deleteChapter(id) {
    if (typeof id !== 'number') {
      return;
    }
    else if (this.params.chapters.length === 1) {
      Readspeaker.read([
        Dictionary.get('a11y.notPossible'),
        Dictionary.get('a11y.cannotDeleteOnlyItem')
      ]);
      return; // Can't delete the one and only chapter
    }
    else if (
      id === 0 &&
      this.params.chapters[1].chapterHierarchy.split('-').length !== 1
    ) {
      Readspeaker.read([
        Dictionary.get('a11y.notPossible'),
        Dictionary.get('a11y.firstChapterHierarchyFixed')
      ]);
      return; // Position 0 must keep hierarchy 1
    }

    this.chapterDOMsOrder.splice(id, 1);
    this.chapterDOMsOrder = this.chapterDOMsOrder.map(index => {
      return (index < id) ? index : index - 1;
    });

    // Show previous chapter
    const nextIndex = (id === 0) ? 1 : id - 1;
    this.showChapter(nextIndex);

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
   * @returns {boolean} True if could be moved, else false.
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

    if (indexTarget < 0) {
      Readspeaker.read([
        Dictionary.get('a11y.notPossible'),
        Dictionary.get('a11y.positionMinReached')
      ]);
      return false; // Out of bounds
    }

    if (indexTarget > this.params.chapters.length - 1) {
      Readspeaker.read([
        Dictionary.get('a11y.notPossible'),
        Dictionary.get('a11y.positionMaxReached')
      ]);
      return false; // Out of bounds
    }

    if (
      indexSource === 0 &&
      this.params.chapters[1].chapterHierarchy.split('-').length !== 1
    ) {
      Readspeaker.read([
        Dictionary.get('a11y.notPossible'),
        Dictionary.get('a11y.firstChapterHierarchyFixed')
      ]);
      return false; // Position 0 must keep hierarchy 1
    }

    if (
      indexTarget === 0 &&
      this.params.chapters[indexSource].chapterHierarchy.split('-').length !== 1
    ) {
      Readspeaker.read([
        Dictionary.get('a11y.notPossible'),
        Dictionary.get('a11y.firstChapterHierarchyFixed')
      ]);
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

    this.showChapter(indexTarget);

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
  changeHierarchy(index, offset) {
    if (index === 0) {
      Readspeaker.read([
        Dictionary.get('a11y.notPossible'),
        Dictionary.get('a11y.firstChapterHierarchyFixed')
      ]);
      return; // Position 0 must keep hierarchy 1
    }

    const oldLength = this.params.chapters[index].chapterHierarchy.split('-')
      .length;

    if (oldLength + offset < 1) {
      Readspeaker.read([
        Dictionary.get('a11y.notPossible'),
        Dictionary.get('a11y.hierarchyMinReached').replace(/@level/g, 1)
      ]);
      return;
    }
    else if (oldLength + offset > Portfolio.MAX_LEVEL) {
      Readspeaker.read([
        Dictionary.get('a11y.notPossible'),
        Dictionary.get('a11y.hierarchyMaxReached').replace(/@level/g, 1)
      ]);
      return;
    }

    const newLength = Math.min(Math.max(1, oldLength + offset), Portfolio.MAX_LEVEL);

    if (oldLength === newLength) {
      return; // Just to be sure ...
    }

    // Compute placeholder with 0s. Turned into hierarchy by updateHierarchies()
    let hierarchyPlaceholder;
    if (oldLength < newLength) {
      hierarchyPlaceholder = [
        ...this.params.chapters[index].chapterHierarchy.split('-'),
        Array(newLength - oldLength).fill('0')
      ];
    }
    else {
      hierarchyPlaceholder = Array(newLength).fill('0');
    }
    hierarchyPlaceholder = hierarchyPlaceholder.join('-');

    this.params.chapters[index].chapterHierarchy = hierarchyPlaceholder;

    this.updateHierarchies();

    this.chapterNavigation.updateButtons();

    Readspeaker.read(
      Dictionary.get('a11y.hierarchyChangedTo').replace(/@level/g, newLength)
    );

    // Store values
    this.setValue(this.field, this.params);
  }

  /**
   * Handle request to show particular chapter.
   *
   * @param {number} id Id of chapter to show.
   */
  showChapter(id) {
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
   * @returns {object} Key and boolean indicating capabilities.
   */
  getButtonCapabilities(id) {
    const capabilities = {};

    capabilities['edit-label'] = true;

    // Can't move up if first item or the new first one isn't on top level
    capabilities['move-up'] = (
      id !== 0 &&
      (
        id !== 1 ||
        this.params.chapters[1]?.chapterHierarchy?.split('-')?.length === 1
      )
    );

    // Can't move down if last item or the new first one isn't on top level
    capabilities['move-down'] = (
      (id !== this.params.chapters.length - 1) &&
      (
        id !== 0 ||
        this.params.chapters[1]?.chapterHierarchy?.split('-')?.length === 1
      )
    );

    // Can't move up in hierarchy if already on top level or first item
    capabilities['hierarchy-up'] = (
      id !== 0 &&
      this.params.chapters[id]?.chapterHierarchy?.split('-')?.length > 1
    );

    // Can't move down in hierarchy if already on lowest level or first item
    capabilities['hierarchy-down'] = (
      this.params.chapters[id]?.chapterHierarchy?.split('-')?.length < Portfolio.MAX_LEVEL &&
      id !== 0
    );

    // Can only delete if the (new) first item remains on top level
    capabilities['delete'] = (
      id !== 0 ||
      this.params.chapters[1]?.chapterHierarchy?.split('-')?.length === 1
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

    // Add dummy chapter.
    if (!params.length) {
      params = [{
        id: 0,
        chapterHierarchy: '1'
      }];
    }

    return params;
  }

  /**
   * Toggle preview.
   *
   * @param {boolean} active If active, show preview, else hide.
   */
  togglePreview(active) {
    if (typeof active !== 'boolean') {
      return;
    }

    if (active) {
      const libraryUberName = Object.keys(H5PEditor.libraryLoaded)
        .find((library) => library.split(' ')[0] === 'H5P.Portfolio');

      const instance = H5P.newRunnable(
        {
          library: libraryUberName,
          params: this.parent.params
        },
        H5PEditor.contentId || 1
      );

      if (!instance) {
        return;
      }

      instance.isPreview = true;

      this.chapterNavigation.hide();
      this.chaptersDOM.classList.add('display-none');
      this.previewOverlay.show();
      this.previewOverlay.attachInstance(instance);

      Readspeaker.read(Dictionary.get('a11y.previewOpened'));
    }
    else {
      this.previewOverlay.hide();
      this.chapterNavigation.show();
      this.chaptersDOM.classList.remove('display-none');

      Readspeaker.read(Dictionary.get('a11y.previewClosed'));
    }

  }

  /**
   * Fill Dictionary.
   */
  fillDictionary() {
    // Convert H5PEditor language strings into object.
    const plainTranslations = H5PEditor.language['H5PEditor.Portfolio'].libraryStrings || {};
    const translations = {};

    for (const key in plainTranslations) {
      let current = translations;
      // Assume string keys separated by . or / for defining path
      const splits = key.split(/[./]+/);
      const lastSplit = splits.pop();

      // Create nested object structure if necessary
      splits.forEach(split => {
        if (!current[split]) {
          current[split] = {};
        }
        current = current[split];
      });

      // Add translation string
      current[lastSplit] = plainTranslations[key];
    }

    Dictionary.fill(translations);
  }
}

/** @constant {number} Maximum depth of chapters */
Portfolio.MAX_LEVEL = 3;
