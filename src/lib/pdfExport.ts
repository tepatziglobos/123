import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { SavedRecord } from '../types';

export async function generatePDF(records: SavedRecord[]) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let cursorY = 20;

  // We'll create a hidden container to render the content for high-quality capture
  const container = document.createElement('div');
  container.style.width = '800px';
  container.style.padding = '40px';
  container.style.background = 'white';
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.className = 'pdf-export-container';
  document.body.appendChild(container);

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    
    const section = document.createElement('div');
    section.style.marginBottom = '40px';
    section.style.borderBottom = '1px solid #eee';
    section.style.paddingBottom = '20px';
    
    section.innerHTML = `
      <h1 style="font-size: 24px; color: #333; margin-bottom: 10px;">${record.ocrResult.subject} - ${record.ocrResult.knowledgePoint}</h1>
      <p style="color: #666; font-size: 14px; margin-bottom: 20px;">保存时间: ${new Date(record.timestamp).toLocaleString()}</p>
      
      <div style="margin-bottom: 30px;">
        <h2 style="font-size: 18px; color: #2563eb; margin-bottom: 10px;">【原错题】</h2>
        <div style="font-size: 16px; line-height: 1.6; color: #374151;">${record.ocrResult.content}</div>
        ${record.ocrResult.options ? `<ul style="margin-top: 10px; list-style: none; padding: 0;">${record.ocrResult.options.map(opt => `<li style="margin-bottom: 5px;">${opt}</li>`).join('')}</ul>` : ''}
        <div style="margin-top: 10px; padding: 10px; background: #f9fafb; border-radius: 4px;">
          <p><strong>标准答案:</strong> ${record.ocrResult.standardAnswer || '未提供'}</p>
        </div>
      </div>

      <div style="margin-bottom: 20px;">
        <h2 style="font-size: 18px; color: #059669; margin-bottom: 15px;">【举一反三练习】</h2>
        ${record.similarQuestions.map((q, idx) => `
          <div style="margin-bottom: 25px; padding: 15px; border: 1px dashed #d1d5db; border-radius: 8px;">
            <p style="font-weight: bold; margin-bottom: 10px;">题目 ${idx + 1}:</p>
            <div style="font-size: 15px; margin-bottom: 15px;">${q.content}</div>
            <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #f3f4f6;">
              <p style="color: #4b5563; font-size: 14px;"><strong>答案:</strong> ${q.answer}</p>
              <p style="color: #4b5563; font-size: 14px; margin-top: 5px;"><strong>解析:</strong> ${q.explanation}</p>
              <p style="color: #dc2626; font-size: 14px; margin-top: 5px;"><strong>易错点:</strong> ${q.commonMistakes}</p>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    
    container.innerHTML = '';
    container.appendChild(section);
    
    const canvas = await html2canvas(container, { scale: 2 });
    const imgData = canvas.toDataURL('image/jpeg', 1.0);
    const imgWidth = pageWidth - (margin * 2);
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    if (cursorY + imgHeight > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      cursorY = margin;
    }

    doc.addImage(imgData, 'JPEG', margin, cursorY, imgWidth, imgHeight);
    cursorY += imgHeight + 10;
  }

  document.body.removeChild(container);
  doc.save(`错题集_${new Date().getTime()}.pdf`);
}
