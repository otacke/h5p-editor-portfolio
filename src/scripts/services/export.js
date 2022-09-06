import JSZip from 'jszip';
import { jsPDF } from 'jspdf';

export default class Export {

  /**
   * Export PDF.
   *
   * @param {object} [params={}] Parameters.
   * @param {object[]} params.imageBlobs Imageblob data.
   * @param {string} params.filename Filename for export.
   */
  static exportPDF(params = {}) {
    if (!Array.isArray(params.imageBlobs)) {
      return;
    }

    params.filename = params.filename ||
      `${H5P.createUUID()}-${Date.now()}.pdf`;

    const widthMax = 190;
    const heightMax = 267;
    const ratio = widthMax / heightMax;

    const pdf = new jsPDF();

    params.imageBlobs.forEach((entry, index) => {
      if (index > 0) {
        pdf.addPage();
      }

      pdf.text(entry.title || entry.name || '', 10, 10);

      const image = document.createElement('img');
      image.src = URL.createObjectURL(entry.blob);

      const imageSize = pdf.getImageProperties(image);
      const imageRatio = imageSize.width / imageSize.height;

      const scaled = imageRatio < ratio ?
        { height: heightMax, width: heightMax * imageRatio } :
        { height: widthMax / imageRatio, width: widthMax };

      pdf.addImage(image, 'JPEG', 10, 20, scaled.width, scaled.height);
    });

    pdf.save(params.filename);
  }

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
