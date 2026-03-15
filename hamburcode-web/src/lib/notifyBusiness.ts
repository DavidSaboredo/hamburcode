import crypto from "crypto";

export async function notifyBusiness(params: {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  total: number;
  addressLine1: string;
  addressLine2?: string | null;
  city?: string | null;
  urlToAdminOrder: string;
}) {
  const url = process.env.BUSINESS_WEBHOOK_URL;
  const secret = process.env.BUSINESS_WEBHOOK_SECRET;

  if (!url || !secret) return;

  const payload = {
    orderNumber: params.orderNumber,
    customerName: params.customerName,
    customerPhone: params.customerPhone,
    total: params.total,
    addressLine1: params.addressLine1,
    addressLine2: params.addressLine2 ?? undefined,
    city: params.city ?? undefined,
    urlToAdminOrder: params.urlToAdminOrder,
    timestamp: new Date().toISOString(),
  };

  const body = JSON.stringify(payload);
  const signature = crypto.createHmac("sha256", secret).update(body).digest("hex");

  await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-hamburcode-signature": signature,
    },
    body,
  });
}
