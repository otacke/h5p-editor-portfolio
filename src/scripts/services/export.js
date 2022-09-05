import JSZip from 'jszip';

export default class Export {

  /**
   * Create ZIP blob.
   *
   * @param {object[]} data File data.
   * @returns {Blob} ZIP file blob.
   */
  static async createZip(data = []) {
    return await new Promise(resolve => {
      if (!Array.isArray(data)) {
        resolve(null);
      }

      // Sanitize data
      data = data
        .filter(entry => entry.blob instanceof Blob)
        .map(entry => {
          if (typeof entry.name !== 'string') {
            entry.name = `${H5P.createUUID()}.${entry.blob.type.split('/')[1]}`;
          }
          return entry;
        });

      if (!data.length) {
        resolve(null);
      }

      const zip = new JSZip();
      data.forEach(data => {
        zip.file(data.name, data.blob);
      });

      zip.generateAsync({ type: 'blob' }).then(content => {
        resolve(content);
      });
    });
  }

  /**
   * Offer blob for download.
   *
   * @param {object} [params={}] Parameters.
   * @param {Blob} params.blob Blob.
   * @param {string} [params.filename] Filename.
   */
  static offerDownload(params = {}) {
    if (!params.blob) {
      return;
    }

    if (!params.filename) {
      params.filename = Date.now().toString();
    }

    const url = URL.createObjectURL(params.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = params.filename;

    const clickHandler = () => {
      setTimeout(() => {
        URL.revokeObjectURL(url);
        a.removeEventListener('click', clickHandler);
      }, 150);
    };
    a.addEventListener('click', clickHandler, false);

    a.click();
  }
}
