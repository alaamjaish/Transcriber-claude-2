import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { marked } from 'marked';

let browserInstance: any = null;

async function getBrowser() {
  if (!browserInstance) {
    browserInstance = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });
  }
  return browserInstance;
}

export async function POST(request: NextRequest) {
  try {
    const { content, filename } = await request.json();

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // Convert markdown to HTML
    const htmlContent = marked(content);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: system-ui, -apple-system, sans-serif;
            padding: 40px;
            color: #000;
            background: white;
            font-size: 14px;
            line-height: 1.6;
          }
          h1 { font-size: 32px; margin: 24px 0 16px; font-weight: bold; }
          h2 { font-size: 24px; margin: 20px 0 12px; font-weight: bold; }
          h3 { font-size: 20px; margin: 16px 0 8px; font-weight: bold; }
          p { margin-bottom: 12px; }
          ul, ol { margin-left: 24px; margin-bottom: 12px; }
          li { margin-bottom: 4px; }
          code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-size: 13px; }
          pre { background: #f5f5f5; padding: 12px; border-radius: 6px; overflow: auto; margin-bottom: 12px; }
          pre code { background: none; padding: 0; }
          blockquote { border-left: 4px solid #ddd; padding-left: 16px; color: #666; margin-bottom: 12px; }
          table { border-collapse: collapse; width: 100%; margin-bottom: 12px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f5f5f5; font-weight: bold; }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
      </html>
    `;

    const browser = await getBrowser();
    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'Letter',
      printBackground: true,
      margin: {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in',
      },
    });

    await page.close();

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename || 'document.pdf'}"`,
      },
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to generate PDF', details: errorMessage },
      { status: 500 }
    );
  }
}
