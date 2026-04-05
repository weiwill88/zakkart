import {
  Document, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, HeadingLevel
} from 'docx'

const border = { style: BorderStyle.SINGLE, size: 1, color: '999999' }
const cellBorders = { top: border, bottom: border, left: border, right: border }

/**
 * Build a Word Document from contract preview data (same shape as OrderGenerate's contract object)
 */
export function buildContractWord(c) {
  const sections = []

  // Header
  sections.push(p(AlignmentType.RIGHT, [t(`合同编号：${c.contractNo}`, 20)]))
  sections.push(p(AlignmentType.CENTER, [t('采 购 合 同', 32, true)], { before: 200, after: 200 }))

  // Parties
  const partyLines = [
    '采购方（甲方）：上海掇骁贸易有限公司',
    '法定代表人：闵一',
    '统一社会信用代码：91310109MACHK7GN2R',
    '地址：上海市虹口区同心路723号13幢5321室',
    '联系方式：13262515903', '',
    `供货方（乙方）：${c.supplierName}`,
    `法定代表人：${c.legalPerson}`,
    `统一社会信用代码：${c.creditCode}`,
    `地址：${c.address || '________'}`,
    `联系方式：${c.phone || '________'}`
  ]
  partyLines.forEach(line => sections.push(p(AlignmentType.LEFT, [t(line, 22)], { after: 60 })))

  // Preamble
  sections.push(p(AlignmentType.JUSTIFIED, [t(`经甲乙双方充分协商，根据《中华人民共和国合同法》及相关法律法规的有关规定，秉承公平、自愿、诚信的合作原则，就甲方向乙方采购${c.productDesc}产品用以生产组装宠物吊床产品的事宜，双方订立本采购合同，并承诺共同遵守。`, 22)], { before: 100 }))

  // Section 1: Product details
  sections.push(heading(`一、采购货物说明：${c.productDesc}`))

  // Product table
  const prodHeader = tableRow(['产品规格和尺寸标准', '产品型号', '产品重量', '产品颜色', '采购数量', '采购单价（含税）', '采购金额（含税）'], true)
  const prodRows = (c.productItems || []).map(item => {
    const price = parseFloat(item.unitPrice)
    const amount = price && !isNaN(price) ? (price * item.totalQty).toLocaleString() + '元' : '____元'
    return tableRow([
      '以产前样品为准',
      item.partName,
      item.weight ? `${item.weight}克/件` : '____克/件',
      item.colors,
      item.qtyDetail.replace(/\n/g, '；'),
      item.unitPrice ? `${item.unitPrice}元/件` : '____元/件',
      amount
    ])
  })
  // Total row
  const grandTotal = calcTotal(c)
  prodRows.push(tableRow(['', '', '', '', '', '合计采购总金额（含税）', grandTotal], false))

  sections.push(new Table({ rows: [prodHeader, ...prodRows], width: { size: 100, type: WidthType.PERCENTAGE } }))

  // Requirements
  sections.push(p(AlignmentType.JUSTIFIED, [t('1. 成品货物要求：乙方生产货物的各项尺寸需要同附录一的产品规格和尺寸说明相符且产品颜色需要同甲乙双方确认的产品的产前样色卡相符，同时成品货物不能出现缝合线开线、布料缝合处有毛边、产品本身不整洁、棉花填充不均匀不足量、布料克重材质不达标等明显的质量问题。', 22)], { before: 100 }))
  sections.push(p(AlignmentType.JUSTIFIED, [t(`2. 乙方负责本合同产品生产的原材料有：${c.rawMaterials || '________'}`, 22)]))
  sections.push(p(AlignmentType.JUSTIFIED, [t('3. 货物实际生产时，上述产品尺寸、规格、重量、颜色发生调整改动的以双方认同的产品产前样为准。', 22)]))

  // Section 2: Delivery plan
  sections.push(heading('二、产品采购下单方式及产品交付时间：'))
  sections.push(p(AlignmentType.JUSTIFIED, [t('本合同约定的采购产品，乙方承诺按下面的交付计划表完成全部产品的生产和包装工序并可交付甲方提货；', 22)]))

  // Delivery table
  if (c.deliveryRows && c.deliveryRows.length > 0 && c.deliveryCols && c.deliveryCols.length > 0) {
    const dCols = c.deliveryCols
    const dHeader = tableRow(['交付提货时间', ...dCols, '总数量'], true)
    const dDataRows = c.deliveryRows.map(row => {
      const rowTotal = dCols.reduce((s, col) => s + (Number(row.qtys[col]) || 0), 0)
      return tableRow([row.date || '____', ...dCols.map(col => String(row.qtys[col] || 0)), String(rowTotal)])
    })
    // Totals row
    const colTotals = dCols.map(col => String(c.deliveryRows.reduce((s, row) => s + (Number(row.qtys[col]) || 0), 0)))
    const grandDeliveryTotal = String(c.deliveryRows.reduce((s, row) => {
      return s + dCols.reduce((rs, col) => rs + (Number(row.qtys[col]) || 0), 0)
    }, 0))
    dDataRows.push(tableRow(['总数', ...colTotals, grandDeliveryTotal], false))

    sections.push(new Table({ rows: [dHeader, ...dDataRows], width: { size: 100, type: WidthType.PERCENTAGE } }))
  } else {
    sections.push(p(AlignmentType.CENTER, [t('（交付计划表：待填写）', 22)], { before: 100, after: 100 }))
  }

  // Section 3-9
  const clauses = [
    { title: '三、产品合格率与产品返工要求：', body: '如乙方生产的货品中，有不合格品，则乙方保证在3个自然日内对不合格品进行返工重做并承担返工所需的成本费用。且乙方保证不合格品率在1%以下。' },
    { title: '四、支付方式：', body: `甲方承诺在合同签署后，将货物采购订金（采购总金额的${c.depositRate || 30}%）支付至乙方指定银行账户。乙方完成全部货物的生产后，甲方验收并支付剩余${c.balanceRate || 70}%尾款。\n\n乙方收款账户：\n户名：${c.bankName || '________'}\n账户号：${c.bankAccount || '________'}\n开户行：${c.bankBranch || '________'}` },
    { title: '五、增值税专用发票开票信息：', body: '名称：上海掇骁贸易有限公司\n税号：91310109MACHK7GN2R\n开户行：中信银行黄浦支行 8110201012001655475\n联系地址：上海市虹口区同心路723号13幢5321室 13917000290' },
    { title: '六、甲方的权利与责任：', body: '1) 合同签署后及时支付采购订金和尾款。\n2) 及时对货物进行验收。' },
    { title: '七、乙方的权利与责任：', body: '1) 确保货物质量符合产前样品标准。\n2) 按约定时间完成生产与包装。\n3) 如未遵守约定，甲方有权要求退换货。' },
    { title: '八、法律适用与争议的解决', body: '适用中华人民共和国法律，争议协商解决，协商不成提交原告方住所地人民法院。' },
    { title: '九、合同生效、变更及终止', body: '本合同一式两份，甲乙双方各执一份，具有同等法律效力。' }
  ]
  clauses.forEach(cl => {
    sections.push(heading(cl.title))
    cl.body.split('\n').forEach(line => {
      sections.push(p(AlignmentType.LEFT, [t(line, 22)], { after: 40 }))
    })
  })

  // Signature
  sections.push(p(AlignmentType.LEFT, [t('甲方（盖章）：                              乙方（盖章）：', 22)], { before: 300 }))
  sections.push(p(AlignmentType.LEFT, [t('日期：                                      日期：', 22)], { before: 100 }))
  sections.push(p(AlignmentType.CENTER, [t('上海掇骁贸易有限公司', 18, false, '999999')], { before: 200 }))

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

function calcTotal(c) {
  let total = 0
  let hasPrice = false
  for (const item of (c.productItems || [])) {
    const price = parseFloat(item.unitPrice)
    if (price && !isNaN(price)) {
      total += price * item.totalQty
      hasPrice = true
    }
  }
  return hasPrice ? total.toLocaleString() + ' 元' : '____元'
}
