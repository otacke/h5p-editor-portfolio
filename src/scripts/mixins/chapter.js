import Util from '@services/util.js';

/**
 * Mixin containing methods for chapter related stuff.
 */
export default class Chapter {
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
   * Get next free copy label number.
   * @param {string} baseName Base name of label.
   * @param {number} [level] Hierarchy level to count labels for or all labels.
   * @returns {number} Next number for a copy label.
   */
  getNextCopyLabelNumber(baseName, level) {
    const chosenLabels = this.chapterNavigation.getButtonLabels(level);
    baseName = Util.escapeForRegularExpression(baseName);

    const copyString = Util.escapeForRegularExpression(
      this.dictionary.get('l10n.labelCopy')
    );

    /*
     * Expected schema is "Any chapter label (Copy) (x)"
     * Matching group 1 is "(Copy)"
     * Matching group 3 is "x"
     */
    const regexp = new RegExp(
      `^${baseName} (${copyString})( \\(((\\d+))\\))?$`
    );

    return chosenLabels
      .map((label) => {
        const parsed = regexp.exec(label);
        return parseInt(
          parsed?.[3] ?? // With number
            (parsed?.[1] ? '1' : '0') // With copystring or only baseName
        );
      })
      .reduce((result, number) => Math.max(result, number + 1), 1);
  }

  /**
   * Get chapter base name (for copying).
   * @param {string} label Chapter label.
   * @returns {string} Chapter base name.
   */
  getChapterBaseName(label) {
    const copyString = Util.escapeForRegularExpression(
      this.dictionary.get('l10n.labelCopy')
    );

    /*
     * "Any chapter label" => "Any chapter label"
     * "Any chapter label (Copy)" => "Any chapter label"
     * "Any chapter label (Copy) (x)" => "Any chapter label"
     */
    const regexp = new RegExp(`^(.+) ${copyString}( \\(\\d+\\))?$`);

    return label.match(regexp)?.[1] ?? label;
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
      this.params.chapters[id]?.chapterHierarchy?.split('-')?.length <
        MAX_LEVEL &&
        id !== 0
    );

    // Can only delete if the (new) first item remains on top level
    capabilities['delete'] = (
      id !== 0 ||
      this.params.chapters[1]?.chapterHierarchy?.split('-')?.length === 1
    );

    // Can only clone with subchapters if there are subchapters
    capabilities['clone-plus-subchapters'] = (
      this.params.chapters[id]?.chapterHierarchy?.split('-')?.length <
        MAX_LEVEL
    );

    return capabilities;
  }
}

/** @constant {number} Maximum depth of chapters */
export const MAX_LEVEL = 4;
