export function getEmptyInventoryForm() {
  return {
    id: '',
    orgId: '',
    itemType: 'product',
    partTypeId: '',
    skuId: '',
    wipQty: 0,
    semiQty: 0,
    finishedQty: 0,
    reason: ''
  }
}
