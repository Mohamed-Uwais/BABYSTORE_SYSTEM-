export function previewReceipt(content, settings, copy = false, win = window.open('', '_blank', 'width=320,height=600')) {
    if (!win) return false;
    const paper = settings?.receipt_paper;
    const width = paper === '58mm' ? '58mm' : paper === 'A4' ? '100%' : '80mm';
    const pageStyle = paper === 'A4' ? 'size:A4; margin:12mm' : 'size:auto; margin:0';
    win.document.write(`<!DOCTYPE html><html><head><title>Receipt</title><style>${printCSS}
      body { width:${width}; max-width:min(100%, ${Number(settings?.receipt_width_mm) || 210}mm); overflow-wrap:anywhere;
        padding:${Number(settings?.receipt_margin_mm ?? 4)}mm; font-size:${Number(settings?.receipt_font_px ?? 11)}px }
      .text-sm {font-size:1.15em}
      .receipt-logo { display:${Number(settings?.receipt_show_logo ?? 1) ? 'block' : 'none'} }
      .flex > * { min-width:0 }
      @page { ${pageStyle} }
    </style></head><body>`);
    if (copy) win.document.write('<p class="text-center font-bold">COPY</p>');
    win.document.body.append(...Array.from(content.childNodes, node => node.cloneNode(true)));

    win.document.close();
    const button = win.document.createElement('button');
    button.textContent = 'Print';
    button.onclick = () => win.print();
    win.document.body.prepend(button);
    return true;
}

const printCSS = `
  @media print { button { display:none } }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 11px;
    line-height: 1.5;
    color: #000;
    width: 72mm;
    padding: 4mm;
  }
  .text-center { text-align: center; }
  .text-right { text-align: right; }
  .font-bold, .font-medium { font-weight: bold; }
  .text-sm { font-size: 13px; }
  .text-slate-500, .text-slate-400 { color: #555; }
  .text-red-600 { color: #c00; }
  .my-1, .my-2 { margin-top: 4px; margin-bottom: 4px; }
  .mt-1 { margin-top: 4px; }
  .mb-2 { margin-bottom: 4px; }
  .border-t { border-top: 1px dashed #000; }
  .border-dotted { border-style: dotted; }
  .border-dashed { border-style: dashed; }
  .flex { display: flex; }
  .justify-between { justify-content: space-between; }
  .w-1\\/4 { width: 25%; }
  .w-1\\/6 { width: 16.6667%; }
  .w-\\[30\\%\\] { width: 30%; }
  .mx-auto { margin-left: auto; margin-right: auto; }
  p { margin: 0; }
  .receipt-logo img {
    display: block;
    margin: 0 auto 4px;
    max-width: 200px;
    max-height: 50px;
    filter: grayscale(100%);
  }
`;
