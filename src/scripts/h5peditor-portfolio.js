import ChapterNavigation from '@components/navigation/chapter-navigation';
import PreviewOverlay from '@components/preview/preview-overlay';
import Util from '@services/util';
import Dictionary from '@services/dictionary';
import Readspeaker from '@services/readspeaker';
import Chapter from '@mixins/chapter';
import Export from '@mixins/export';
import Initialization from '@mixins/initialization';
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
      Portfolio, [Chapter, Export, Initialization, Preview]
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
        hierarchyLevelMax: Chapter.MAX_LEVEL
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
   * Get machineName.
   * @returns {string} Machine name.
   */
  getMachineName() {
    return H5PLibrary.machineName;
  }
}
