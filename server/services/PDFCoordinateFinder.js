const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb } = require('pdf-lib');

class PDFCoordinateFinder {
  /**
   * Generate a coordinate grid PDF to help find exact positions
   */
  static async generateCoordinateGrid(outputPath) {
    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([612, 792]); // Letter size
      
      // Draw grid lines every 50 points
      for (let x = 0; x <= 612; x += 50) {
        page.drawLine({
          start: { x, y: 0 },
          end: { x, y: 792 },
          thickness: 0.5,
          color: rgb(0.8, 0.8, 0.8)
        });
      }
      
      for (let y = 0; y <= 792; y += 50) {
        page.drawLine({
          start: { x: 0, y },
          end: { x: 612, y },
          thickness: 0.5,
          color: rgb(0.8, 0.8, 0.8)
        });
      }
      
      // Add coordinate labels
      for (let x = 0; x <= 612; x += 50) {
        for (let y = 0; y <= 792; y += 50) {
          page.drawText(`${x},${y}`, {
            x: x + 2,
            y: y + 2,
            size: 8,
            color: rgb(0.5, 0.5, 0.5)
          });
        }
      }
      
      // Save the coordinate grid
      const pdfBytes = await pdfDoc.save();
      fs.writeFileSync(outputPath, pdfBytes);
      
      console.log(`Coordinate grid generated: ${outputPath}`);
      return outputPath;
    } catch (error) {
      console.error('Error generating coordinate grid:', error);
      throw error;
    }
  }
  
  /**
   * Generate a test PDF with sample text at different positions
   */
  static async generateTestPositions(outputPath) {
    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([612, 792]); // Letter size
      
      // Test positions for common fields
      const testPositions = [
        { text: 'PROJECT NUMBER HERE', x: 150, y: 700, size: 12 },
        { text: 'CUSTOMER NAME HERE', x: 150, y: 650, size: 12 },
        { text: 'ADDRESS HERE', x: 150, y: 600, size: 10 },
        { text: 'DATE HERE', x: 150, y: 550, size: 12 },
        { text: 'SIGNATURE HERE', x: 150, y: 200, size: 12 },
        { text: 'WARRANTY START', x: 150, y: 500, size: 12 },
        { text: 'WARRANTY END', x: 300, y: 500, size: 12 },
        { text: 'PREMIUM AMOUNT', x: 150, y: 450, size: 12 },
        { text: 'COVERAGE LIMITS', x: 150, y: 400, size: 12 },
        { text: 'DEDUCTIBLE', x: 150, y: 350, size: 12 }
      ];
      
      // Add test text at each position
      testPositions.forEach(pos => {
        page.drawText(pos.text, {
          x: pos.x,
          y: pos.y,
          size: pos.size,
          color: rgb(1, 0, 0) // Red text for visibility
        });
        
        // Add coordinate label below
        page.drawText(`(${pos.x}, ${pos.y})`, {
          x: pos.x,
          y: pos.y - 15,
          size: 8,
          color: rgb(0, 0, 1) // Blue coordinates
        });
      });
      
      // Save the test PDF
      const pdfBytes = await pdfDoc.save();
      fs.writeFileSync(outputPath, pdfBytes);
      
      console.log(`Test positions PDF generated: ${outputPath}`);
      return outputPath;
    } catch (error) {
      console.error('Error generating test positions PDF:', error);
      throw error;
    }
  }

  /**
   * Generate a test PDF specifically for 5-Year Warranty field positions
   */
  static async generate5YearWarrantyTest(outputPath) {
    try {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([612, 792]); // Letter size
      
      // Test positions for 5-Year Warranty fields
      const testPositions = [
        { text: 'DATE OF INSTALLATION HERE', x: 200, y: 720, size: 12 },
        { text: 'OWNER NAME HERE', x: 200, y: 670, size: 12 },
        { text: 'TODAY\'S DATE HERE', x: 200, y: 620, size: 12 },
        { text: 'ADDRESS HERE', x: 200, y: 570, size: 10 },
        { text: 'PROJECT NUMBER HERE', x: 200, y: 520, size: 12 }
      ];
      
      // Add test text at each position
      testPositions.forEach(pos => {
        page.drawText(pos.text, {
          x: pos.x,
          y: pos.y,
          size: pos.size,
          color: rgb(1, 0, 0) // Red text for visibility
        });
        
        // Add coordinate label below
        page.drawText(`(${pos.x}, ${pos.y})`, {
          x: pos.x,
          y: pos.y - 15,
          size: 8,
          color: rgb(0, 0, 1) // Blue coordinates
        });
      });
      
      // Save the test PDF
      const pdfBytes = await pdfDoc.save();
      fs.writeFileSync(outputPath, pdfBytes);
      
      console.log(`5-Year Warranty test PDF generated: ${outputPath}`);
      return outputPath;
    } catch (error) {
      console.error('Error generating 5-Year Warranty test PDF:', error);
      throw error;
    }
  }
}

module.exports = PDFCoordinateFinder;
