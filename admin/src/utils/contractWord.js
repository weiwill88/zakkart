import {
  Document, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, ImageRun
} from 'docx'

const border = { style: BorderStyle.SINGLE, size: 1, color: '999999' }
const cellBorders = { top: border, bottom: border, left: border, right: border }

/**
 * Build a Word Document from contract preview data (same shape as OrderGenerate's contract object)
 */
export function buildContractWord(c) {
  const sections = []
  const buyerInfo = c.buyerInfo || {}
  const clauseSections = c.clauseSections || {}
  const productItems = c.productItems || []
  const deliverableItems = productItems.filter(item => item.item_type !== 'fee')
  const deliveryRows = c.deliveryRows || []

  // Header
  sections.push(p(AlignmentType.RIGHT, [t(`合同编号：${c.contractNo}`, 20)]))
  sections.push(p(AlignmentType.CENTER, [t('采 购 合 同', 32, true)], { before: 200, after: 200 }))

  // Parties
  const partyLines = [
    `采购方（甲方）：${buyerInfo.name || '上海掇骁贸易有限公司'}`,
    `法定代表人：${buyerInfo.legal_person || '闵一'}`,
    `统一社会信用代码：${buyerInfo.credit_code || '91310109MACHK7GN2R'}`,
    `地址：${buyerInfo.address || '上海市虹口区同心路723号13幢5321室'}`,
    `联系方式：${buyerInfo.phone || '13262515903'}`, '',
    `供货方（乙方）：${c.supplierName}`,
    `法定代表人：${c.legalPerson}`,
    `统一社会信用代码：${c.creditCode}`,
    `地址：${c.address || '________'}`,
    `联系方式：${c.phone || '________'}`
  ]
  partyLines.forEach(line => sections.push(p(AlignmentType.LEFT, [t(line, 22)], { after: 60 })))

  // Preamble
  sections.push(p(AlignmentType.JUSTIFIED, [t(clauseSections.preamble || `经甲乙双方充分协商，根据《中华人民共和国合同法》及相关法律法规的有关规定，秉承公平、自愿、诚信的合作原则，就甲方向乙方采购${c.productDesc}产品用以生产组装宠物吊床产品的事宜，双方订立本采购合同，并承诺共同遵守。`, 22)], { before: 100 }))

  // Section 1: Product details
  sections.push(heading(`一、采购货物说明：${c.productDesc}`))

  sections.push(p(AlignmentType.LEFT, [t('1. 采购结算主表', 22, true)], { before: 80, after: 80 }))
  const settlementHeader = tableRow(['产品型号', '采购数量', '采购单价（含税）', '采购金额（含税）'], true)
  const settlementRows = productItems.map(item => {
    const price = parseFloat(item.unit_price ?? item.unitPrice)
    const totalQty = item.item_type === 'fee' ? 1 : Number((item.total_qty ?? item.totalQty) || 0)
    const amount = !Number.isNaN(price) ? (price * totalQty).toLocaleString() + '元' : '____元'
    return tableRow([
      item.model || item.part_name || item.partName || '',
      item.item_type === 'fee' ? '一次性费用' : formatQtyText(item),
      price || price === 0 ? `${price}元/${item.item_type === 'fee' ? '项' : '件'}` : `____元/${item.item_type === 'fee' ? '项' : '件'}`,
      amount
    ])
  })
  const grandTotal = calcTotal(c)
  settlementRows.push(summaryRow('合计采购总金额（含税）', grandTotal, 3))
  sections.push(new Table({ rows: [settlementHeader, ...settlementRows], width: { size: 100, type: WidthType.PERCENTAGE } }))

  sections.push(p(AlignmentType.LEFT, [t('2. 规格说明表', 22, true)], { before: 120, after: 80 }))
  const specHeader = tableRow(['产品型号', '规格或尺寸', '材质', '重量', '颜色'], true)
  const specRows = deliverableItems.map(item => tableRow([
    item.model || item.part_name || item.partName || '',
    item.size || '以产前样品为准',
    item.material || '',
    item.weight || '',
    item.color || ''
  ]))
  sections.push(new Table({ rows: [specHeader, ...specRows], width: { size: 100, type: WidthType.PERCENTAGE } }))

  // Requirements
  sections.push(p(AlignmentType.JUSTIFIED, [t(`3. 成品货物要求：${clauseSections.quality_clause || ''}`, 22)], { before: 100 }))
  sections.push(p(AlignmentType.JUSTIFIED, [t(`4. 乙方负责本合同产品生产的原材料有：${c.rawMaterials || '________'}`, 22)]))
  sections.push(p(AlignmentType.JUSTIFIED, [t(`5. ${clauseSections.variation_clause || '货物实际生产时，上述产品尺寸、规格、重量、颜色发生调整改动的以双方认同的产品产前样为准。'}`, 22)]))

  // Section 2: Delivery plan
  sections.push(heading('二、产品采购下单方式及产品交付时间：'))
  sections.push(p(AlignmentType.JUSTIFIED, [t(clauseSections.delivery_clause || '本合同约定的采购产品，乙方承诺按下面的交付计划表完成全部产品的生产和包装工序并可交付甲方提货；', 22)]))

  // Delivery table
  if (deliveryRows.length > 0 && deliverableItems.length > 0) {
    const dHeader = tableRow(['交付提货时间', ...deliverableItems.map(item => item.model || item.part_name || item.partName || '配件'), '总数量'], true)
    const dDataRows = deliveryRows.map(row => {
      const rowTotal = deliverableItems.reduce((s, item) => s + (Number(row.qtys?.[item.row_id] || 0)), 0)
      return tableRow([row.date || '____', ...deliverableItems.map(item => String(row.qtys?.[item.row_id] || 0)), String(rowTotal)])
    })
    // Totals row
    const colTotals = deliverableItems.map(item => String(deliveryRows.reduce((s, row) => s + (Number(row.qtys?.[item.row_id] || 0)), 0)))
    const grandDeliveryTotal = String(deliveryRows.reduce((s, row) => {
      return s + deliverableItems.reduce((rs, item) => rs + (Number(row.qtys?.[item.row_id] || 0)), 0)
    }, 0))
    dDataRows.push(tableRow(['总数', ...colTotals, grandDeliveryTotal], false))

    sections.push(new Table({ rows: [dHeader, ...dDataRows], width: { size: 100, type: WidthType.PERCENTAGE } }))
  } else {
    sections.push(p(AlignmentType.CENTER, [t('（交付计划表：待填写）', 22)], { before: 100, after: 100 }))
  }

  // Section 3-9
  const clauses = [
    { title: '三、产品合格率与产品返工要求：', body: clauseSections.quality_guarantee_clause || '' },
    { title: '四、支付方式：', body: clauseSections.payment_clause || '' },
    { title: '五、增值税专用发票开票信息：', body: clauseSections.invoice_clause || buyerInfo.invoice_info || '' },
    { title: '六、甲方的权利与责任：', body: clauseSections.section6_text || '' },
    { title: '七、乙方的权利与责任：', body: clauseSections.section7_text || '' },
    { title: '八、法律适用与争议的解决', body: clauseSections.section8_text || '' },
    { title: '九、合同生效、变更及终止', body: clauseSections.section9_text || '' }
  ]
  clauses.forEach(cl => {
    sections.push(heading(cl.title))
    cl.body.split('\n').forEach(line => {
      sections.push(p(AlignmentType.LEFT, [t(line, 22)], { after: 40 }))
    })
  })

  const appendixImages = Array.isArray(c.appendixImages) ? c.appendixImages : []
  if (appendixImages.length > 0) {
    sections.push(heading('附录一：产品规格和尺寸说明'))
    appendixImages.forEach((image, index) => {
      sections.push(p(AlignmentType.CENTER, [t(image.note || image.name || `规格图纸 ${index + 1}`, 20, true)], { before: 100, after: 80 }))
      if (image.data) {
        sections.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new ImageRun({
              data: image.data,
              transformation: { width: 480, height: 320 }
            })
          ]
        }))
      } else {
        sections.push(p(AlignmentType.CENTER, [t(image.file_id || image.url || '图纸文件已上传', 18, false, '666666')]))
      }
    })
  }

  // Signature
  sections.push(p(AlignmentType.LEFT, [t('甲方（盖章）：                              乙方（盖章）：', 22)], { before: 300 }))
  sections.push(p(AlignmentType.LEFT, [t('日期：                                      日期：', 22)], { before: 100 }))
  sections.push(p(AlignmentType.CENTER, [t(buyerInfo.name || '上海掇骁贸易有限公司', 18, false, '999999')], { before: 200 }))

  return new Document({ sections: [{ children: sections }] })
}

// === Helpers ===
function t(text, size = 22, bold = false, color) {
  const opts = { text, size, font: '宋体' }
  if (bold) opts.bold = true
  if (color) opts.color = color
  return new TextRun(opts)
}

function p(alignment, children, spacing) {
  const opts = { alignment, children }
  if (spacing) opts.spacing = spacing
  return new Paragraph(opts)
}

function heading(text) {
  return new Paragraph({
    spacing: { before: 160 },
    children: [new TextRun({ text, bold: true, size: 24, font: '宋体' })]
  })
}

function tableRow(cells, isHeader = false) {
  return new TableRow({
    tableHeader: isHeader,
    children: cells.map(text =>
      new TableCell({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: String(text), bold: isHeader, size: 18, font: '宋体' })]
        })],
        borders: cellBorders
      })
    )
  })
}

function summaryRow(label, value, labelSpan = 1) {
  return new TableRow({
    children: [
      new TableCell({
        columnSpan: labelSpan,
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: label, bold: true, size: 18, font: '宋体' })]
        })],
        borders: cellBorders
      }),
      new TableCell({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: String(value), bold: true, size: 18, font: '宋体' })]
        })],
        borders: cellBorders
      })
    ]
  })
}

function formatQtyText(item = {}) {
  const totalQty = Number((item.total_qty ?? item.totalQty) || 0)
  return totalQty.toLocaleString()
}

function calcTotal(c) {
  let total = 0
  let hasPrice = false
  for (const item of (c.productItems || [])) {
    const price = parseFloat(item.unit_price ?? item.unitPrice)
    const qty = Number((item.total_qty ?? item.totalQty) || 0)
    if (!Number.isNaN(price)) {
      total += price * qty
      hasPrice = true
    }
  }
  return hasPrice ? total.toLocaleString() + ' 元' : '____元'
}
