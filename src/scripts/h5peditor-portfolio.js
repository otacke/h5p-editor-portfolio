import ChapterNavigation from '@components/navigation/chapter-navigation';
import PreviewOverlay from '@components/preview/preview-overlay';
import Util from '@services/util';
import Dictionary from '@services/dictionary';
import Readspeaker from '@services/readspeaker';
import Export from '@mixins/export';
import Preview from '@mixins/preview';
import Toolbar from '@components/toolbar/toolbar';
import Spinner from '@components/spinner/spinner';
import ChapterChooser from '@components/export/chapterchooser';
import H5PLibrary from '@root/library.json';

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
    Util.addMixins(
      Portfolio, [Export, Preview]
    );

    this.parent = parent;
    this.field = field;
    this.params = Util.extend({
      chapters: []
    }, params);
    this.setValue = setValue;

    this.dictionary = new Dictionary();
    this.fillDictionary();

    this.params.chapters = this.sanitize(this.params.chapters || []);

    // Keeps track of chapter DOMs of H5P core list widget
    this.chapterDOMsOrder = [... Array(this.params.chapters.length).keys()];

    // Callbacks to call when parameters change
    this.changes = [];

    // Let parent handle ready callbacks of children
    this.passReadies = true;

    // Keep track of placeholders that have been instantiated
    this.chaptersDone = [];
    this.chaptersPending = this.params?.chapters?.length;
    this.allChildrenDone = false;

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
    this.chapterList = this.fieldInstance.children.find((child) => {
      return child?.getName() === 'chapters';
    });

    this.mainDOM = document.createElement('div');
    this.mainDOM.classList.add('h5peditor-portfolio-main');

    const toolbarDOM = document.createElement('div');
    toolbarDOM.classList.add('h5peditor-portfolio-toolbar');

    this.toolBar = new Toolbar(
      {
        dictionary: this.dictionary
      },
      {
        onClickButtonPreview: (active) => {
          this.togglePreview({ active: active });
        },
        onClickButtonExport: (active) => {
          this.toggleExportDialog(active);
        },
        onClickButtonDeleteHidden: () => {
          this.handleDeleteHiddenDialog();
        }
      }
    );

    this.toolBar.enableButton('preview');
    this.toolBar.enableButton('export');

    toolbarDOM.appendChild(this.toolBar.getDOM());
    this.mainDOM.appendChild(toolbarDOM);

    const contentDOM = document.createElement('div');
    contentDOM.classList.add('h5peditor-portfolio-content');

    this.chapterNavigation = new ChapterNavigation(
      {
        dictionary: this.dictionary,
        title: this.parent?.metadata?.title || 'Portfolio',
        chapterList: this.chapterList,
        hierarchyLevelMax: Portfolio.MAX_LEVEL
      },
      {
        onGetChapterTitle: (id) => {
          return this.getChapterTitle(id);
        },
        onGetButtonCapabilities: ((id) => {
          return this.getButtonCapabilities(id);
        }),
        onAddChapter: (id, options) => {
          this.addChapter(id, options);
        },
        onShowChapter: (id) => {
          this.showChapter(id);
        },
        onMoveChapter: (id, offset, options = {}) => {
          return this.moveChapter(id, offset, options);
        },
        onChangeHierarchy: (id, offset) => {
          this.changeHierarchy(id, offset);
        },
        onCloneChapter: (id, options) => {
          this.cloneChapter(id, options);
        },
        onDeleteChapter: (id) => {
          this.deleteChapter(id);
        }
      }
    );
    contentDOM.appendChild(this.chapterNavigation.getDOM());
    contentDOM.appendChild(this.chaptersDOM);

    this.previewOverlay = new PreviewOverlay({
      dictionary: this.dictionary
    });
    this.mainDOM.appendChild(this.previewOverlay.getDOM());

    this.chapterChooser = new ChapterChooser(
      {
        dictionary: this.dictionary
      }, {
        onExportStarted: () => {
          this.showExportSpinner();
        },
        onExportProgress: (params) => {
          this.setSpinnerProgress(params);
        },
        onExportEnded: () => {
          this.toolBar.forceButton('export', false); // Will close dialog
        }
      }
    );
    this.mainDOM.appendChild(this.chapterChooser.getDOM());

    Readspeaker.attach(contentDOM);

    this.mainDOM.appendChild(contentDOM);

    this.spinner = new Spinner();
    this.mainDOM.appendChild(this.spinner.getDOM());

    // Dialog to ask whether to delete all hidden contents
    this.deleteHiddenDialog = new H5P.ConfirmationDialog({
      headerText: this.dictionary.get('l10n.deleteHiddenDialogHeader'),
      dialogText: this.dictionary.get('l10n.deleteHiddenDialogText'),
      cancelText: this.dictionary.get('l10n.deleteDialogCancel'),
      confirmText: this.dictionary.get('l10n.deleteDialogConfirm')
    });
    this.deleteHiddenDialog.appendTo(document.body);

    this.$container.get(0).appendChild(this.mainDOM);

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

    this.parent.ready(() => {
      this.passReadies = false;

      this.listenToHeaderFooter();
      this.overrideH5PCoreTitleField();
      this.overrideHeaderFooter();
      this.overrideCoverTitle();
    });
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
   * @returns {HTMLElement[]} DOMs of chapters in list widget.
   */
  getChapterDOMs() {
    return this.fieldInstance.$content.get(0)
      .querySelectorAll('.h5p-li > .field-name-chapter > .content') || [];
  }

  /**
   * Get new hierarchy level.
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
    this.changes.forEach((change) => {
      change(this.params);
    });
  }

  /**
   * Handle adding new chapter.
   * @param {number} id Id of item that was added.
   * @param {object} [options] Options.
   * @param {boolean} [options.doNotShow] If true, don't show after adding.
   */
  addChapter(id, options = {}) {
    const hierarchy = this.getNewHierarchy();
    if (!hierarchy) {
      return;
    }

    this.params.chapters[id].chapterHierarchy = hierarchy;
    this.chapterDOMsOrder.push(id);

    if (!options.doNotShow) {
      this.showChapter(id);
    }

    // Store values
    this.setValue(this.field, this.params);
  }

  /**
   * Get current number of copies of a label.
   * @param {string} baseLabel Base label.
   * @returns {number} Number of copies of a label
   */
  getCurrentNumberOfCopyLabels(baseLabel) {
    const allLabels = this.chapterNavigation.getButtonLabels();

    const copyString = Util.escapeForRegularExpression(
      this.dictionary.get('l10n.labelCopy')
    );

    const regexp = new RegExp(`${baseLabel} ${copyString}((d+))?`);

    return allLabels
      .map((label) => regexp.test(label))
      .filter((state) => state === true)
      .length;
  }

  /**
   * Handle cloning chapter.
   * @param {number} id Id of chapter to clone.
   * @param {object} [options] Options.
   * @param {boolean} [options.subchapters] If true, also clone subchapters.
   */
  cloneChapter(id, options = {}) {
    if (typeof id !== 'number') {
      return;
    }

    this.showCopySpinner();

    // Timeout required, because otherwise spinner will not show
    window.setTimeout(() => {
      const chapterParams = this.chapterList.getValue();

      const startHierarchy = chapterParams[id].chapterHierarchy;

      // Determine all chapters that potentially need cloning
      const cloneParams = chapterParams.reduce((toClone, currentParams, index) => {
        const currentHierarchy = currentParams.chapterHierarchy;
        const isSubChapter = currentHierarchy.indexOf(`${startHierarchy}-`) === 0;

        if (currentHierarchy === startHierarchy || isSubChapter
        ) {
          return [...toClone, {
            index: index,
            level: currentHierarchy.split('-').length,
            isSubchapter: isSubChapter
          }];
        }

        return toClone;
      }, []);

      const moveOffset = -chapterParams.length + id + cloneParams.length;

      let clonedChapterId;

      cloneParams.forEach((cloneParam) => {
        if (!options.subchapters && cloneParam.isSubchapter) {
          return;
        }

        /*
         * Determine current number of copies (presumably) of a label and add
         * counter to label. // TODO: move to some util class
         */
        const copyString = Util.escapeForRegularExpression(
          this.dictionary.get('l10n.labelCopy')
        );
        const regexp = new RegExp(`(.+) ${copyString}()((d+))?`);
        const matches = this.chapterNavigation.getButtonLabel(cloneParam.index).match(
          regexp
        );
        const baseName = matches?.[1] ??
          this.chapterNavigation.getButtonLabel(cloneParam.index);

        const currentCopyCount = this.getCurrentNumberOfCopyLabels(baseName);

        const copyCounter = (currentCopyCount === 0) ?
          '' :
          ` (${currentCopyCount + 1})`;

        const newLabel = `${baseName} ${this.dictionary.get('l10n.labelCopy')}${copyCounter}`;

        // Replace subcontent ids in instance params
        const newInstanceParams = Util.replaceSubContentIDs(
          { ...chapterParams[cloneParam.index] }
        );

        // Create copy of chapter
        const newId = this.chapterNavigation.handleAddChapter(
          {
            instanceParams: newInstanceParams,
            doNotShow: true
          }
        );

        if (!newId) {
          return;
        }

        // Set correct hierarchy
        for (let i = 0; i < cloneParam.level - 1; i++) {
          this.changeHierarchy(this.chapterList.getValue().length - 1, 1);
        }

        this.chapterNavigation.handleLabelEdited(newId, newLabel);

        if (typeof clonedChapterId === 'undefined') {
          clonedChapterId = newId + moveOffset;
        }

        // Move to appropriate position
        // TODO: Clean up, so moveChapter works with abs(moveOffset) > 1
        for (let count = 0; count < Math.abs(moveOffset); count++) {
          this.moveChapter(
            newId + count * Math.sign(moveOffset),
            Math.sign(moveOffset),
            { doNotShow: true, silent: true, doNotSave: true }
          );
        }
      });

      if (typeof clonedChapterId === 'number') {
        // Store values
        this.setValue(this.field, this.params);

        // Go to cloned chapter
        this.showChapter(clonedChapterId);
      }

      this.spinner.hide();
    }, 0);
  }

  /**
   * Handle adding new chapter.
   * @param {number} id Id of chapter to delete.
   */
  deleteChapter(id) {
    if (typeof id !== 'number') {
      return;
    }
    else if (this.params.chapters.length === 1) {
      Readspeaker.read([
        this.dictionary.get('a11y.notPossible'),
        this.dictionary.get('a11y.cannotDeleteOnlyItem')
      ]);
      return; // Can't delete the one and only chapter
    }
    else if (
      id === 0 &&
      this.params.chapters[1].chapterHierarchy.split('-').length !== 1
    ) {
      Readspeaker.read([
        this.dictionary.get('a11y.notPossible'),
        this.dictionary.get('a11y.firstChapterHierarchyFixed')
      ]);
      return; // Position 0 must keep hierarchy 1
    }

    this.chapterDOMsOrder.splice(id, 1);
    this.chapterDOMsOrder = this.chapterDOMsOrder.map((index) => {
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
   * @param {string} indexSource Button id of button to be moved.
   * @param {number} offset Offset of where to move chapter to.
   * @param {object} [options] Options.
   * @param {boolean} [options.doNotShow] If true, don't show moved button.
   * @param {boolean} [options.silent] If true, don't announce via screenreader.
   * @param {boolean} [options.doNotSave] If true, don't save.
   * @returns {boolean} True if could be moved, else false.
   */
  moveChapter(indexSource, offset, options = {}) {
    if (
      typeof indexSource !== 'number' ||
      indexSource < 0 || indexSource > this.params.chapters.length - 1 ||
      typeof offset !== 'number'
    ) {
      return false; // No valid input
    }

    const indexTarget = indexSource + offset;

    if (indexTarget < 0) {
      if (!options.silent) {
        Readspeaker.read([
          this.dictionary.get('a11y.notPossible'),
          this.dictionary.get('a11y.positionMinReached')
        ]);
      }

      return false; // Out of bounds
    }

    if (indexTarget > this.params.chapters.length - 1) {
      if (!options.silent) {
        Readspeaker.read([
          this.dictionary.get('a11y.notPossible'),
          this.dictionary.get('a11y.positionMaxReached')
        ]);
      }

      return false; // Out of bounds
    }

    if (
      indexSource === 0 &&
      (
        this.params.chapters[1].chapterHierarchy.split('-').length !== 1 ||
        this.params.chapters[indexSource].chapterHierarchy.split('-').length
          !== 1
      )
    ) {
      if (!options.silent) {
        Readspeaker.read([
          this.dictionary.get('a11y.notPossible'),
          this.dictionary.get('a11y.firstChapterHierarchyFixed')
        ]);
      }
      return false; // Position 0 must keep hierarchy 1
    }

    // Move item parameters in list widget
    this.chapterList.moveItem(indexSource, indexTarget);

    // TODO: Beware, this only works for an offset of -1 or 1!!!
    if (options.updateNavigationButtons !== false) {
      this.chapterNavigation.swapButtons({
        button1: this.chapterNavigation.getButton(indexSource),
        button2: this.chapterNavigation.getButton(indexTarget),
        skipPlaceholder: true
      });
    }

    const item = this.chapterDOMsOrder.splice(indexSource, 1);
    this.chapterDOMsOrder.splice(indexTarget, 0, item[0]);

    // Rebuild hierarchies
    this.updateHierarchies();

    // Update button titles and hierarchies
    this.chapterNavigation.updateButtons();

    if (!options.doNotShow) {
      this.showChapter(indexTarget);
    }

    // Store values
    if (!options.doNotSave) {
      this.setValue(this.field, this.params);
    }

    return true;
  }

  /**
   * Handle hierarchy changed.
   * @param {number} index Index of item that was changed.
   * @param {number} offset Diff in hierarchy.
   * @param {object} [options] Options.
   * @param {boolean} [options.silent] If true, don't announce via screenreader.
   * @param {boolean} [options.doNotSave] If true, don't save.
   */
  changeHierarchy(index, offset, options = {}) {
    if (index === 0) {
      if (!options.silent) {
        Readspeaker.read([
          this.dictionary.get('a11y.notPossible'),
          this.dictionary.get('a11y.firstChapterHierarchyFixed')
        ]);
      }

      return; // Position 0 must keep hierarchy 1
    }

    const oldLength = this.params.chapters[index].chapterHierarchy.split('-')
      .length;

    if (oldLength + offset < 1) {
      if (!options.silent) {
        Readspeaker.read([
          this.dictionary.get('a11y.notPossible'),
          this.dictionary.get('a11y.hierarchyMinReached').replace(/@level/g, 1)
        ]);
      }

      return;
    }
    else if (oldLength + offset > Portfolio.MAX_LEVEL) {
      if (!options.silent) {
        Readspeaker.read([
          this.dictionary.get('a11y.notPossible'),
          this.dictionary.get('a11y.hierarchyMaxReached').replace(/@level/g, 1)
        ]);
      }

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

    if (!options.silent) {
      Readspeaker.read(
        this.dictionary.get('a11y.hierarchyChangedTo').replace(/@level/g, newLength)
      );
    }

    // Store values
    if (!options.doNotSave) {
      this.setValue(this.field, this.params);
    }
  }

  /**
   * Handle request to show particular chapter.
   * @param {number} id Id of chapter to show.
   */
  showChapter(id) {
    const chapterDOMs = this.getChapterDOMs();

    for (let i = 0; i < chapterDOMs.length; i++) {
      chapterDOMs[i].classList.toggle(
        'active', i === this.chapterDOMsOrder[id]
      );

      /*
       * Workaround for Firefox that on some platforms will give the list item
       * some height even though it should be 0.
       */
      const listItem = chapterDOMs[i].closest('li');
      if (listItem) {
        listItem.classList.toggle(
          'display-none', i !== this.chapterDOMsOrder[id]
        );
      }
    }

    this.chapterNavigation.setCurrentButton(id);
  }

  /**
   * Get chapter title.
   * @param {number} id Chapter id.
   * @returns {string} Chapter title.
   */
  getChapterTitle(id) {
    let title = this.params.chapters[id]?.content?.metadata?.title;
    if (!title) {
      title = `${this.dictionary.get('l10n.chapter')} ${id}`; // Fallback
    }

    return title;
  }

  /**
   * Get button capabilities in submenu.
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

    // Can only clone with subchapters if there are subchapters
    capabilities['clone-plus-subchapters'] = (
      this.params.chapters[id]?.chapterHierarchy?.split('-')?.length < Portfolio.MAX_LEVEL
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

    this.params.chapters.forEach((chapter) => {
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
   * @param {object[]} params Semantics parameters for chapters.
   * @returns {object} Sanitized parameters for chapters.
   */
  sanitize(params = []) {
    // Filter out invalid chapters
    params = params.filter((chapter) => {
      const validHierarchy = (new RegExp('^[1-9][0-9]*(-[1-9][0-9]*)*$'))
        .test(chapter.chapterHierarchy);

      return validHierarchy;
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
   * Delete hidden placeholders throughout the portfolio
   */
  handleDeleteHiddenDialog() {
    this.deleteHiddenDialog.once('confirmed', () => {
      this.deleteHiddenDialog.off('canceled');

      this.deleteHidden();
    });

    this.deleteHiddenDialog.once('canceled', () => {
      this.deleteHiddenDialog.off('confirmed');
    });

    this.deleteHiddenDialog.show();
  }

  /**
   * Delete hidden contents.
   */
  deleteHidden() {
    H5P.externalDispatcher.trigger(
      'H5PEditor.PortfolioPlaceholder:deleteHidden',
      { contentId: H5PEditor.contentId || 1 }
    );
  }

  /**
   * Handle placeholders done instantiating.
   * @param {string} id Subcontent id.
   */
  handleChapterDone(id) {
    if (!this.chaptersDone.includes(id)) {
      this.chaptersDone.push(id);

      this.chaptersPending--;
      if (this.chaptersPending === 0) {
        this.handleAllChildrenDone();
      }
    }
  }

  /**
   * Handle all children instantiated.
   */
  handleAllChildrenDone() {
    this.allChildrenDone = true;
    this.toolBar.enableButton('deleteHidden');
  }

  /**
   * Show copy spinner.
   */
  showCopySpinner() {
    this.spinner.setMessage(this.dictionary.get('l10n.cloning'));
    this.spinner.setProgress('');
    this.spinner.show();
  }

  /**
   * Set spinner progress.
   * @param {object} [params] Parameters.
   * @param {number} params.number Current progress.
   * @param {number} params.of Maximum progress.
   * @param {number} params.text custom text.
   */
  setSpinnerProgress(params = {}) {
    if (!params.text && (
      typeof params.number !== 'number' ||
      typeof params.of !== 'number'
    )) {
      return;
    }

    const message = params.text || this.dictionary.get('l10n.processingChapter')
      .replace(/@number/g, params.number)
      .replace(/@of/g, params.of);

    this.spinner.setProgress(message);
  }

  /**
   * Handle header/footer was toggled on/off.
   * @param {string} type One of header|footer.
   * @param {boolean} state If true, turned on, else off.
   */
  handleTogglingHeaderFooter(type, state) {
    if (
      type !== 'header' && type !== 'footer' ||
      typeof state !== 'boolean'
    ) {
      return;
    }

    this.fieldInstance.children.find((child) => {
      if (child.getName?.() !== 'chapters') {
        return;
      }

      child.forEachChild((listChild) => {
        if (!listChild.children) {
          return;
        }

        const fieldName = type === 'header' ?
          'displayHeader' :
          'displayFooter';

        const toggle = listChild.children.find((groupChild) => {
          return groupChild?.field?.name === fieldName;
        });
        if (toggle?.$input && toggle.$input.get(0).checked !== state) {
          toggle.$input.get(0).click();
        }
      });

    });
  }

  /**
   * Listen to activating/deactiveting header/footer.
   */
  listenToHeaderFooter() {
    const headerSwitchInstance = this.parent.children.find((child) => {
      return child?.field?.name === 'showHeader';
    });
    headerSwitchInstance?.changes.push((state) => {
      this.handleTogglingHeaderFooter('header', state);
    });

    const footerSwitchInstance = this.parent.children.find((child) => {
      return child?.field?.name === 'showFooter';
    });
    footerSwitchInstance?.changes.push((state) => {
      this.handleTogglingHeaderFooter('footer', state);
    });
  }

  /**
   * Override H5P Core title field.
   */
  overrideH5PCoreTitleField() {
    const editorContainer = this.$container.get(0)
      .closest('.h5p-portfolio-editor');

    if (editorContainer) {
      const titleField = editorContainer
        .querySelector('.field-name-extraTitle .h5peditor-label');

      if (titleField) {
        titleField.innerHTML = this.dictionary.get('l10n.portfolioTitle');
      }

      const titleInput = editorContainer
        .querySelector('.field-name-extraTitle .h5peditor-text');

      if (titleInput) {
        this.contentTitle = titleInput.value;

        titleInput.addEventListener('keydown', (event) => {
          if (event.code === 'Enter' || event.code === 'Tab') {
            this.contentTitle = titleInput.value;
            this.setChapterNavigationTitle(titleInput.value);
          }
        });
      }
    }
  }

  /**
   * Set chapter navigation title.
   * @param {string} title Title to set.
   */
  setChapterNavigationTitle(title) {
    if (typeof title !== 'string') {
      return;
    }

    this.chapterNavigation.setTitle(title);
  }

  /**
   * Override H5P Core title field.
   */
  overrideHeaderFooter() {
    const editorContainer = this.$container.get(0)
      .closest('.h5p-portfolio-editor');

    if (!editorContainer) {
      return;
    }

    const header = editorContainer.querySelector('.field-name-headerPlaceholderGroup .title');
    if (header) {
      header.innerText = this.dictionary.get('l10n.header');
    }

    const footer = editorContainer.querySelector('.field-name-footerPlaceholderGroup .title');
    if (footer) {
      footer.innerText = this.dictionary.get('l10n.footer');
    }
  }

  /**
   * Override H5P cover title field.
   */
  overrideCoverTitle() {
    const editorContainer = this.$container.get(0)
      .closest('.h5p-portfolio-editor');

    if (!editorContainer) {
      return;
    }

    const group = editorContainer.querySelector('.field-name-bookCover');
    if (!group) {
      return;
    }

    /*
     * There's no way to get hold of the group instance. Copying the same
     * functionality here, but we cannot trigger 'expanded'/'collapsed'
     */
    const title = group.querySelector('.title');
    if (title) {
      const titleClone = title.cloneNode(true);
      titleClone.innerText = this.dictionary.get('l10n.cover');
      title.parentNode.insertBefore(titleClone, title);
      title.remove();

      const toggle = () => {
        if (group.classList.contains('expanded')) {
          title.setAttribute('aria-expanded', 'false');
          window.setTimeout(() => {
            group.classList.remove('expanded');
          }, 100);
        }
        else {
          title.setAttribute('aria-expanded', 'true');
          window.setTimeout(() => {
            group.classList.add('expanded');
          }, 100);
        }
      };

      titleClone.addEventListener('click', toggle);
    }
  }

  /**
   * Fill this.dictionary.
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
      splits.forEach((split) => {
        if (!current[split]) {
          current[split] = {};
        }
        current = current[split];
      });

      // Add translation string
      current[lastSplit] = plainTranslations[key];
    }

    this.dictionary.fill(translations);
  }

  /**
   * Get machineName.
   * @returns {string} Machine name.
   */
  getMachineName() {
    return H5PLibrary.machineName;
  }
}

/** @constant {number} Maximum depth of chapters */
Portfolio.MAX_LEVEL = 4;
