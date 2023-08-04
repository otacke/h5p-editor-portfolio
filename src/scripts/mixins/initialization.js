/**
 * Mixin containing methods for initialization related stuff.
 */
export default class Initialization {
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
}
