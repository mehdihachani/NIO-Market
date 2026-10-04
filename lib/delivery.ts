import { db } from './db';
import { WILAYAS } from './data/algeria';
export async function initializeDeliveryRates(storeId: string, homeFee = 600, stopDeskFee = 400) {
  await db.deliveryRate.createMany({ data: WILAYAS.map(w => ({ storeId, wilayaCode:w.code, wilayaName:w.name, homeFee, stopDeskFee })) });
}
