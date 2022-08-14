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
        moveUp: H5PEditor.t('H5PEditor.Portfolio', 'moveUp'),
        moveDown: H5PEditor.t('H5PEditor.Portfolio', 'moveDown'),
        delete: H5PEditor.t('H5PEditor.Portfolio', 'delete'),
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
          let title = this.params.chapters[id]?.content?.metadata?.title;
          if (!title) {
            title = `Chapter ${id}`;
          }

          return title; // TODO Get title from chapter
        },
        onAddChapter: (id) => {
          this.handleAddChapter(id);
        },
        onShowChapter: (id) => {
          this.handleShowChapter(id);
        },
        onSubMenuMoved: (hierarchy, offset) => {
          this.handleMoveChapter(hierarchy, offset);
        },
        onSubMenuDeleted: (id) => {
          this.handleDeleteChapter(id);
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
   */
  handleMoveChapter(indexSource, offset) {
    if (
      typeof indexSource !== 'number' ||
      indexSource < 0 || indexSource > this.params.chapters.length - 1 ||
      typeof offset !== 'number'
    ) {
      return; // No valid input
    }

    const indexTarget = indexSource + offset;
    if (indexTarget < 0 || indexTarget > this.params.chapters.length - 1) {
      return; // Out of bounds
    }

    // Move item parameters in list widget
    this.chapterList.moveItem(indexSource, indexTarget);

    // List widget doesn't resort DOM elemens, need to swap in tracking array
    [this.chapterDOMsOrder[indexSource], this.chapterDOMsOrder[indexTarget]] =
      [this.chapterDOMsOrder[indexTarget], this.chapterDOMsOrder[indexSource]];

    // Rebuild hierarchies
    this.updateHierarchies();

    this.chapterNavigation.updateButtons();

    this.handleShowChapter(indexTarget);

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

  /**
   * Update hierarchies.
   */
  updateHierarchies() {
    // Determine hierarchy depth
    const hierarchyDepth = this.params.chapters.reduce((length, chapter) => {
      return Math.max(length, chapter.chapterHierarchy.split('-').length);
    }, 1);

    const counter = new Array(hierarchyDepth).fill(1);
    let lastDepth = 0;

    this.params.chapters.forEach(chapter => {
      const depth = chapter.chapterHierarchy.split('-').length;
      if (depth === lastDepth) {
        counter[depth - 1]++;
      }
      else if (depth < lastDepth) {
        counter[depth - 1]++;
        for (let i = depth; i < counter.length; i++) {
          counter[i] = 1;
        }
      }

      lastDepth = depth;

      chapter.chapterHierarchy = counter.slice(0, depth).join('-');
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
