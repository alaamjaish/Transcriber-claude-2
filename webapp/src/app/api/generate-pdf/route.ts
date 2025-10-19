import { NextRequest, NextResponse } from 'next/server';
import { marked } from 'marked';

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
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600;700&family=Noto+Sans:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Noto Sans', 'Noto Sans Arabic', system-ui, -apple-system, sans-serif;
            padding: 40px;
            color: #000;
            background: white;
            font-size: 14px;
            line-height: 1.6;
            direction: ltr;
          }
          /* Support for Arabic text */
          [lang="ar"], .arabic {
            font-family: 'Noto Sans Arabic', 'Noto Sans', system-ui, sans-serif;
            direction: rtl;
            text-align: right;
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

    let browser;

    // Use different configuration for local vs production
    if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
      // Production: Use puppeteer-core + @sparticuz/chromium for serverless
      const puppeteerCore = (await import('puppeteer-core')).default;
      const chromium = (await import('@sparticuz/chromium')).default;

      browser = await puppeteerCore.launch({
        args: [
          ...chromium.args,
          '--font-render-hinting=none',
          '--disable-font-subpixel-positioning',
        ],
        defaultViewport: {
          deviceScaleFactor: 1,
          hasTouch: false,
          height: 1080,
          isLandscape: true,
          isMobile: false,
          width: 1920,
        },
        executablePath: await chromium.executablePath(),
        headless: true,
      });
    } else {
      // Development: Use regular puppeteer (includes bundled Chrome)
      const puppeteer = (await import('puppeteer')).default;

      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });
    }

    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Wait for fonts to load completely
    await page.evaluateHandle('document.fonts.ready');

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
    await browser.close();

    return new NextResponse(Buffer.from(pdfBuffer), {
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
