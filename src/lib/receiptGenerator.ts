// Receipt Generation Utility
// Generates downloadable receipt for transactions

export interface ReceiptData {
  transactionId: string;
  amount: number;
  paymentMethod: string;
  purpose: string;
  date: string;
  userName: string;
  userEmail?: string;
  vendorUpiId?: string;
  deliveryDate?: string;
  productName?: string;
  quantity?: number;
}

export function generateReceiptHTML(data: ReceiptData): string {
  const {
    transactionId,
    amount,
    paymentMethod,
    purpose,
    date,
    userName,
    userEmail,
    vendorUpiId,
    deliveryDate,
    productName,
    quantity,
  } = data;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Payment Receipt - ${transactionId}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .receipt {
      background-color: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #4CAF50;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #4CAF50;
      margin: 0;
      font-size: 32px;
    }
    .header p {
      color: #666;
      margin: 5px 0;
    }
    .status {
      background-color: #4CAF50;
      color: white;
      padding: 10px 20px;
      border-radius: 20px;
      display: inline-block;
      margin: 10px 0;
    }
    .details {
      margin: 30px 0;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #eee;
    }
    .detail-label {
      color: #666;
      font-weight: 500;
    }
    .detail-value {
      color: #333;
      font-weight: 600;
    }
    .amount {
      font-size: 24px;
      color: #4CAF50;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #eee;
      text-align: center;
      color: #999;
      font-size: 12px;
    }
    .thank-you {
      text-align: center;
      margin: 30px 0;
      font-size: 18px;
      color: #4CAF50;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <h1>Delight Milk</h1>
      <p>Milk Delivery Service</p>
      <div class="status">✓ Payment Successful</div>
    </div>

    <div class="details">
      <div class="detail-row">
        <span class="detail-label">Transaction ID</span>
        <span class="detail-value">${transactionId}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Date & Time</span>
        <span class="detail-value">${new Date(date).toLocaleString()}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Customer Name</span>
        <span class="detail-value">${userName}</span>
      </div>
      ${userEmail ? `
      <div class="detail-row">
        <span class="detail-label">Email</span>
        <span class="detail-value">${userEmail}</span>
      </div>
      ` : ''}
      <div class="detail-row">
        <span class="detail-label">Payment Method</span>
        <span class="detail-value">${paymentMethod}</span>
      </div>
      ${vendorUpiId ? `
      <div class="detail-row">
        <span class="detail-label">Paid To (UPI ID)</span>
        <span class="detail-value">${vendorUpiId}</span>
      </div>
      ` : ''}
      <div class="detail-row">
        <span class="detail-label">Purpose</span>
        <span class="detail-value">${purpose.replace('_', ' ').toUpperCase()}</span>
      </div>
      ${productName ? `
      <div class="detail-row">
        <span class="detail-label">Product</span>
        <span class="detail-value">${productName} ${quantity ? `(${quantity}L)` : ''}</span>
      </div>
      ` : ''}
      ${deliveryDate ? `
      <div class="detail-row">
        <span class="detail-label">Delivery Date</span>
        <span class="detail-value">${new Date(deliveryDate).toLocaleDateString()}</span>
      </div>
      ` : ''}
      <div class="detail-row" style="border-bottom: 2px solid #4CAF50; margin-top: 20px; padding-top: 20px;">
        <span class="detail-label" style="font-size: 18px;">Total Amount Paid</span>
        <span class="detail-value amount">₹${amount.toFixed(2)}</span>
      </div>
    </div>

    <div class="thank-you">
      Thank you for your payment!
    </div>

    <div class="footer">
      <p>This is a computer-generated receipt and does not require a signature.</p>
      <p>For any queries, please contact support@delightmilk.com</p>
      <p>© ${new Date().getFullYear()} Delight Milk. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

export function downloadReceipt(data: ReceiptData): void {
  const html = generateReceiptHTML(data);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `receipt-${data.transactionId}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
