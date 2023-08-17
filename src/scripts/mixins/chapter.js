import Readspeaker from '@services/readspeaker';
import Util from '@services/util';

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
   * Get next free copy label number.
   * @param {string} baseName Base name of label.
   * @returns {number} Next number for a copy label.
   */
  getNextCopyLabelNumber(baseName) {
    const allLabels = this.chapterNavigation.getButtonLabels();

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

    return allLabels
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
         * Add "(Copy)" and potentially "(x)" for multiple copies to label name.
         * "(x)" will be omitted for x === 1, otherwise largest current x + 1
         */
        const baseName = this.getChapterBaseName(
          this.chapterNavigation.getButtonLabel(cloneParam.index)
        );

        const nextCopyLabelNumber = this.getNextCopyLabelNumber(baseName);
        const copyCounter = (nextCopyLabelNumber < 2) ?
          '' :
          ` (${nextCopyLabelNumber})`;

        const newLabel = `${baseName} ${this.dictionary.get('l10n.labelCopy')} ${copyCounter}`;

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

    // Moving an element of hierarchy !== 1 to the top is not allowed
    if (
      indexTarget === 0 &&
      this.params.chapters[indexSource].chapterHierarchy.split('-').length !== 1
    ) {
      if (!options.silent) {
        Readspeaker.read([
          this.dictionary.get('a11y.notPossible'),
          this.dictionary.get('a11y.firstChapterHierarchyFixed')
        ]);
      }
      return false; // Cannot put hierarchy !== 1 to the top
    }

    /*
     * We do not need to cover indexSource === 0, because all children will
     * be collapsed and moved with the source, so the target will always be
     * of the same hierarchy as the source (=1)
     */

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
    else if (oldLength + offset > Chapter.MAX_LEVEL) {
      if (!options.silent) {
        Readspeaker.read([
          this.dictionary.get('a11y.notPossible'),
          this.dictionary.get('a11y.hierarchyMaxReached').replace(/@level/g, 1)
        ]);
      }

      return;
    }

    const newLength = Math.min(Math.max(1, oldLength + offset), Chapter.MAX_LEVEL);

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
      this.params.chapters[id]?.chapterHierarchy?.split('-')?.length < Chapter.MAX_LEVEL &&
      id !== 0
    );

    // Can only delete if the (new) first item remains on top level
    capabilities['delete'] = (
      id !== 0 ||
      this.params.chapters[1]?.chapterHierarchy?.split('-')?.length === 1
    );

    // Can only clone with subchapters if there are subchapters
    capabilities['clone-plus-subchapters'] = (
      this.params.chapters[id]?.chapterHierarchy?.split('-')?.length < Chapter.MAX_LEVEL
    );

    return capabilities;
  }
}

/** @constant {number} Maximum depth of chapters */
Chapter.MAX_LEVEL = 4;
