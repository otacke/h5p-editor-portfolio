import ChapterNavigation from './components/chapter-navigation';
import Util from './h5peditor-portfolio-util';

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

    this.params.chapters = this.sanitize(this.params.chapters || []);

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
        chapterHierarchies: this.params.chapters
          .map(chapter => chapter.chapterHierarchy)
      },
      {
        onAddChapter: () => {
          this.handleAddChapter();
        },
        onShowChapter: (hierarchy) => {
          this.handleShowChapter(hierarchy);
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

    this.handleShowChapter(this.params.chapters[0]?.chapterHierarchy || '0');

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
   * @returns {HTMLElement[]} DOMs of chapters in list widget.
   */
  getChapterDOMs() {
    return this.fieldInstance.$content.get(0)
      .querySelectorAll('.h5p-li > .field-name-chapter > .content') || [];
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
   */
  handleAddChapter() {
    const newHierarchy = this.getNewHierarchy();
    if (!newHierarchy) {
      return; // TODO: This should be handled with a warning?
    }

    if (this.chapterList.addItem()) {
      this.params.chapters.slice(-1)[0].chapterHierarchy = newHierarchy;
      this.chapterNavigation.addButton(newHierarchy);
      this.chapterNavigation.setCurrentButton(newHierarchy);

      // Store values
      this.setValue(this.field, this.params);
    }
  }

  /**
   * Handle request to show particular chapter.
   * @param {string} hierarchy Hierarchy of chapter to show.
   */
  handleShowChapter(hierarchy) {
    const chapterParams = this.chapterList.getValue();

    const index = chapterParams
      .reduce((result, current, index) => {
        if (result !== null) {
          return result;
        }

        if (current.chapterHierarchy === hierarchy) {
          return index;
        }

        return null;
      }, null);

    if (index === null) {
      return;
    }

    const chapterDOMs = this.getChapterDOMs();
    if (!chapterDOMs) {
      return;
    }

    for (let i = 0; i < chapterDOMs.length; i++) {
      chapterDOMs[i].classList.toggle('active', i === index);
    }

    this.chapterNavigation.setCurrentButton(hierarchy);
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
        if (levelsA[i] < levelsB[i]) {
          result = -1;
          break;
        }
        else if (levelsA[i] > levelsB[i]) {
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
