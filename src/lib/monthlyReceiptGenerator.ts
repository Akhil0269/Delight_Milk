// Monthly Receipt Generator
// Generates comprehensive monthly receipts with all deliveries and payments

import { ReceiptData } from "./receiptGenerator";

export interface MonthlyReceiptData {
  month: string; // e.g., "January 2026"
  userName: string;
  userEmail?: string;
  deliveries: Array<{
    date: string;
    productName: string;
    quantity: number;
    pricePerUnit: number;
    total: number;
    paymentMethod: string;
    status: string;
  }>;
  summary: {
    totalDeliveries: number;
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
    onlinePayments: number;
    codPayments: number;
    walletPayments: number;
  };
}

export function generateMonthlyReceiptHTML(data: MonthlyReceiptData): string {
  const { month, userName, userEmail, deliveries, summary } = data;

  const deliveryRows = deliveries.map((delivery, index) => `
    <tr style="${index % 2 === 0 ? 'background-color: #f9f9f9;' : ''}">
      <td style="padding: 12px; border-bottom: 1px solid #eee;">${new Date(delivery.date).toLocaleDateString()}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">${delivery.productName}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${delivery.quantity}L</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">₹${delivery.pricePerUnit.toFixed(2)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">₹${delivery.total.toFixed(2)}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">
        <span style="padding: 4px 8px; border-radius: 4px; font-size: 11px; ${delivery.paymentMethod === 'UPI' || delivery.paymentMethod === 'Prepaid'
      ? 'background-color: #4CAF50; color: white;'
      : 'background-color: #FF9800; color: white;'
    }">
          ${delivery.paymentMethod}
        </span>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">
        <span style="padding: 4px 8px; border-radius: 4px; font-size: 11px; ${delivery.status === 'Delivered'
      ? 'background-color: #4CAF50; color: white;'
      : 'background-color: #2196F3; color: white;'
    }">
          ${delivery.status}
        </span>
      </td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Monthly Receipt - ${month}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 1000px;
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
      border-bottom: 3px solid #4CAF50;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #4CAF50;
      margin: 0;
      font-size: 36px;
    }
    .header p {
      color: #666;
      margin: 5px 0;
    }
    .month-badge {
      background-color: #4CAF50;
      color: white;
      padding: 10px 20px;
      border-radius: 20px;
      display: inline-block;
      margin: 10px 0;
      font-size: 18px;
    }
    .customer-info {
      background-color: #f9f9f9;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    .customer-info h3 {
      margin-top: 0;
      color: #333;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th {
      background-color: #4CAF50;
      color: white;
      padding: 12px;
      text-align: left;
      font-weight: 600;
    }
    .summary-box {
      background-color: #f0f8ff;
      border: 2px solid #4CAF50;
      border-radius: 8px;
      padding: 20px;
      margin: 30px 0;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #ddd;
    }
    .summary-row:last-child {
      border-bottom: none;
      font-size: 20px;
      font-weight: bold;
      color: #4CAF50;
      padding-top: 15px;
      margin-top: 10px;
      border-top: 2px solid #4CAF50;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #eee;
      text-align: center;
      color: #999;
      font-size: 12px;
    }
    .payment-breakdown {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      margin: 20px 0;
    }
    .payment-card {
      background: white;
      border: 2px solid #eee;
      border-radius: 8px;
      padding: 15px;
      text-align: center;
    }
    .payment-card h4 {
      margin: 0 0 10px 0;
      color: #666;
      font-size: 14px;
    }
    .payment-card .amount {
      font-size: 24px;
      font-weight: bold;
      color: #4CAF50;
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <h1>Delight Milk</h1>
      <p>Milk Delivery Service</p>
      <div class="month-badge">Monthly Receipt - ${month}</div>
    </div>

    <div class="customer-info">
      <h3>Customer Information</h3>
      <p><strong>Name:</strong> ${userName}</p>
      ${userEmail ? `<p><strong>Email:</strong> ${userEmail}</p>` : ''}
      <p><strong>Period:</strong> ${month}</p>
      <p><strong>Generated:</strong> ${new Date().toLocaleDateString()}</p>
    </div>

    <h3 style="color: #333; margin-top: 30px;">Delivery Details</h3>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Product</th>
          <th style="text-align: center;">Quantity</th>
          <th style="text-align: right;">Price/Unit</th>
          <th style="text-align: right;">Total</th>
          <th style="text-align: center;">Payment</th>
          <th style="text-align: center;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${deliveryRows}
      </tbody>
    </table>

    <h3 style="color: #333; margin-top: 30px;">Payment Breakdown</h3>
    <div class="payment-breakdown">
      <div class="payment-card">
        <h4>Online Payments</h4>
        <div class="amount">₹${summary.onlinePayments.toFixed(2)}</div>
      </div>
      <div class="payment-card">
        <h4>Wallet Payments</h4>
        <div class="amount">₹${summary.walletPayments.toFixed(2)}</div>
      </div>
      <div class="payment-card">
        <h4>Cash on Delivery</h4>
        <div class="amount">₹${summary.codPayments.toFixed(2)}</div>
      </div>
    </div>

    <div class="summary-box">
      <h3 style="margin-top: 0; color: #333;">Monthly Summary</h3>
      <div class="summary-row">
        <span>Total Deliveries:</span>
        <span><strong>${summary.totalDeliveries}</strong></span>
      </div>
      <div class="summary-row">
        <span>Total Amount:</span>
        <span><strong>₹${summary.totalAmount.toFixed(2)}</strong></span>
      </div>
      <div class="summary-row">
        <span>Amount Paid:</span>
        <span style="color: #4CAF50;"><strong>₹${summary.paidAmount.toFixed(2)}</strong></span>
      </div>
      ${summary.pendingAmount > 0 ? `
      <div class="summary-row">
        <span>Pending Amount (COD):</span>
        <span style="color: #FF9800;"><strong>₹${summary.pendingAmount.toFixed(2)}</strong></span>
      </div>
      ` : ''}
      <div class="summary-row">
        <span>Net Total:</span>
        <span>₹${summary.totalAmount.toFixed(2)}</span>
      </div>
    </div>

    <div class="footer">
      <p>This is a computer-generated monthly receipt.</p>
      <p>For any queries, please contact support@delightmilk.com</p>
      <p>© ${new Date().getFullYear()} Delight Milk. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

export function downloadMonthlyReceipt(data: MonthlyReceiptData): void {
  const html = generateMonthlyReceiptHTML(data);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `monthly-receipt-${data.month.replace(' ', '-')}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
