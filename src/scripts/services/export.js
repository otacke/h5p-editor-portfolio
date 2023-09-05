import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import {
  Document, Paragraph, TextRun, Packer, ImageRun, HeadingLevel,
  convertMillimetersToTwip, PageOrientation
} from 'docx';

export default class Export {

  /**
   * Export PDF.
   * @param {object} [params] Parameters.
   * @param {object[]} params.imageBlobs Imageblob data.
   * @param {string} params.filename Filename for export.
   */
  static exportPDF(params = {}) {
    if (!Array.isArray(params.imageBlobs)) {
      return;
    }

    params.filename = params.filename ||
      `${H5P.createUUID()}-${Date.now()}.pdf`;

    const pdf = new jsPDF();

    let remainingHeightMM = Export.PAGE_HEIGHT_MAX_MM;
    let hasPageImage = false;

    params.imageBlobs.forEach((entry, index) => {
      if (index > 0 && (entry.title || remainingHeightMM <= 0)) {
        pdf.addPage();
        remainingHeightMM = Export.PAGE_HEIGHT_MAX_MM;
      }

      if (entry.title) {
        pdf.text(
          entry.title || entry.name,
          Export.PAGE_MARGIN_MM,
          1.5 * Export.PAGE_MARGIN_MM
        );
        // Assuming text height = marginMM
        remainingHeightMM -= Export.PAGE_MARGIN_MM;
      }

      const image = document.createElement('img');
      image.src = URL.createObjectURL(entry.blob);

      const imageSize = pdf.getImageProperties(image);
      const imageRatio = imageSize.width / imageSize.height;

      if (imageSize.height === 1 && imageSize.width === 1) {
        return; // Empty image, e.g. no content set
      }

      // Determine image size at full width
      let imageSizeScaled = {
        width: Export.PAGE_WIDTH_MAX_MM,
        height: Export.PAGE_WIDTH_MAX_MM / imageRatio
      };

      // Handle not enough space for image
      if (imageSizeScaled.height > remainingHeightMM) {

        // Not first image, so use new page
        if (hasPageImage) {
          pdf.addPage();
          remainingHeightMM = Export.PAGE_HEIGHT_MAX_MM;
          hasPageImage = false;

          if (imageSizeScaled.height > remainingHeightMM) {
            imageSizeScaled = {
              width: remainingHeightMM * imageRatio,
              height: remainingHeightMM
            };
          }
        }
        else {
          imageSizeScaled = {
            width: remainingHeightMM * imageRatio,
            height: remainingHeightMM
          };
        }
      }

      pdf.addImage(
        image, 'JPEG',
        Export.PAGE_MARGIN_MM,
        Export.PAGE_MARGIN_MM + Export.PAGE_HEIGHT_MAX_MM - remainingHeightMM,
        imageSizeScaled.width,
        imageSizeScaled.height
      );
      hasPageImage = true;

      remainingHeightMM -= imageSizeScaled.height;
      remainingHeightMM -= 10; // gap between images
    });

    pdf.save(params.filename);
  }

  /**
   * Create ZIP blob.
   * @param {object} [params] Parameters.
   * @param {object[]} params.imageBlobs Imageblob data.
   * @returns {Blob} ZIP file blob.
   */
  static async createDOCX(params = {}) {
    const sectionChildren = [];

    for (let i = 0; i < params.imageBlobs.length; i++) {
      if (params.imageBlobs[i].title) {
        sectionChildren.push(new Paragraph({
          children: [new TextRun(params.imageBlobs[i].title)],
          heading: HeadingLevel.HEADING_1,
          pageBreakBefore: true,
          spacing: { after: convertMillimetersToTwip(Export.PAGE_MARGIN_MM) }
        }));
      }

      const image = await Export.getImage(params.imageBlobs[i].blob);
      const imageRatio = image.naturalWidth / image.naturalHeight;

      if (image.naturalWidth === 1 && image.naturalHeight === 1) {
        continue; // Empty image, e.g. no content set
      }

      // Determine image size at full width
      let imageSizeScaled = {
        width: Export.PAGE_WIDTH_MAX_MM * Export.MM_EQUALS_PX,
        height: Export.PAGE_WIDTH_MAX_MM * Export.MM_EQUALS_PX / imageRatio
      };

      // Handle not enough space for image
      if (
        imageSizeScaled.height > Export.PAGE_HEIGHT_MAX_MM * Export.MM_EQUALS_PX
      ) {
        imageSizeScaled = {
          width: Export.PAGE_HEIGHT_MAX_MM * Export.MM_EQUALS_PX * imageRatio,
          height: Export.PAGE_HEIGHT_MAX_MM * Export.MM_EQUALS_PX
        };
      }

      sectionChildren.push(new Paragraph({
        children: [new ImageRun({
          data: params.imageBlobs[i].blob,
          transformation: {
            width: imageSizeScaled.width,
            height: imageSizeScaled.height
          }
        })],
        spacing: { after: convertMillimetersToTwip(Export.PAGE_MARGIN_MM) }
      }));
    }

    // Create document
    const doc = new Document({
      sections: [{
        properties: {
          page: {
            size: {
              orientation: PageOrientation.PORTRAIT,
              height: convertMillimetersToTwip(Export.PAGE_HEIGHT_MM),
              width: convertMillimetersToTwip(Export.PAGE_WIDTH_MM)
            },
            margin: {
              top: convertMillimetersToTwip(Export.PAGE_MARGIN_MM),
              right: convertMillimetersToTwip(Export.PAGE_MARGIN_MM),
              bottom: convertMillimetersToTwip(Export.PAGE_MARGIN_MM),
              left: convertMillimetersToTwip(Export.PAGE_MARGIN_MM)
            },
          },
        },
        children: sectionChildren
      }]
    });

    return await Packer.toBlob(doc).then((blob) => {
      return blob;
    });
  }

  /**
   * Create ZIP blob.
   * @param {object[]} data File data.
   * @returns {Blob} ZIP file blob.
   */
  static async createZip(data = []) {
    return await new Promise((resolve) => {
      if (!Array.isArray(data)) {
        resolve(null);
      }

      // Sanitize data
      data = data
        .filter((entry) => entry.blob instanceof Blob)
        .map((entry) => {
          if (typeof entry.name !== 'string') {
            entry.name = `${H5P.createUUID()}.${entry.blob.type.split('/')[1]}`;
          }
          return entry;
        });

      if (!data.length) {
        resolve(null);
      }

      const zip = new JSZip();
      data.forEach((data) => {
        zip.file(data.name, data.blob);
      });

      zip.generateAsync({ type: 'blob' }).then((content) => {
        resolve(content);
      });
    });
  }

  /**
   * Get image from blob.
   * @param {Blob} imageBlob Image blob.
   * @returns {HTMLElement|null} Image element or null if error.
   */
  static async getImage(imageBlob) {
    return await new Promise((resolve, reject) => {
      const image = document.createElement('img');
      image.addEventListener('load', () => {
        resolve(image);
      });
      image.addEventListener('error', () => {
        reject(null);
      });
      image.src = URL.createObjectURL(imageBlob);
    });
  }

  /**
   * Offer blob for download.
   * @param {object} [params] Parameters.
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

/** @constant {number} Page width in mm. */
Export.PAGE_WIDTH_MM = 210; // 210 is DinA4 width in mm

/** @constant {number} Page height in mm. */
Export.PAGE_HEIGHT_MM = 297; // 297 is DinA4 height in mm

/** @constant {number} Default gap between elements in mm. */
Export.PAGE_MARGIN_MM = 10; // Default gap between elements in mm

/** @constant {number} Max width in mm. */
Export.PAGE_WIDTH_MAX_MM = Export.PAGE_WIDTH_MM - 2 * Export.PAGE_MARGIN_MM;

/** @constant {number} Max width in mm. */
Export.PAGE_HEIGHT_MAX_MM = Export.PAGE_HEIGHT_MM - 2 * Export.PAGE_MARGIN_MM;

/** @constant {number} Pixels that equal one mm */
Export.MM_EQUALS_PX = 3.7795275591;
