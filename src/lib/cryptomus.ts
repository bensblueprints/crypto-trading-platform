import axios from 'axios';
import CryptoJS from 'crypto-js';

const CRYPTOMUS_API_URL = 'https://api.cryptomus.com/v1';

interface CryptomusConfig {
  merchantId: string;
  paymentApiKey: string;
  payoutApiKey: string;
}

const config: CryptomusConfig = {
  merchantId: process.env.CRYPTOMUS_MERCHANT_ID || '',
  paymentApiKey: process.env.CRYPTOMUS_PAYMENT_API_KEY || '',
  payoutApiKey: process.env.CRYPTOMUS_PAYOUT_API_KEY || '',
};

function generateSign(data: object, apiKey: string): string {
  const jsonData = JSON.stringify(data);
  const base64Data = Buffer.from(jsonData).toString('base64');
  return CryptoJS.MD5(base64Data + apiKey).toString();
}

function verifyWebhookSign(body: string, sign: string): boolean {
  const base64Body = Buffer.from(body).toString('base64');
  const expectedSign = CryptoJS.MD5(base64Body + config.paymentApiKey).toString();
  return expectedSign === sign;
}

async function makeRequest(endpoint: string, data: object, isPayout = false) {
  const apiKey = isPayout ? config.payoutApiKey : config.paymentApiKey;
  const sign = generateSign(data, apiKey);

  const response = await axios.post(`${CRYPTOMUS_API_URL}${endpoint}`, data, {
    headers: {
      'merchant': config.merchantId,
      'sign': sign,
      'Content-Type': 'application/json',
    },
  });

  return response.data;
}

export interface CreateInvoiceParams {
  amount: string;
  currency: string;
  orderId: string;
  urlCallback: string;
  urlReturn?: string;
  urlSuccess?: string;
  lifetime?: number;
  toCurrency?: string;
}

export interface CreatePayoutParams {
  amount: string;
  currency: string;
  orderId: string;
  address: string;
  network: string;
  urlCallback?: string;
  toCurrency?: string;
}

export interface CreateStaticWalletParams {
  currency: string;
  network: string;
  orderId: string;
  urlCallback: string;
}

export const cryptomus = {
  async createInvoice(params: CreateInvoiceParams) {
    return makeRequest('/payment', {
      amount: params.amount,
      currency: params.currency,
      order_id: params.orderId,
      url_callback: params.urlCallback,
      url_return: params.urlReturn,
      url_success: params.urlSuccess,
      lifetime: params.lifetime || 3600,
      to_currency: params.toCurrency,
    });
  },

  async createStaticWallet(params: CreateStaticWalletParams) {
    return makeRequest('/wallet', {
      currency: params.currency,
      network: params.network,
      order_id: params.orderId,
      url_callback: params.urlCallback,
    });
  },

  async createPayout(params: CreatePayoutParams) {
    return makeRequest('/payout', {
      amount: params.amount,
      currency: params.currency,
      order_id: params.orderId,
      address: params.address,
      network: params.network,
      url_callback: params.urlCallback,
      to_currency: params.toCurrency,
    }, true);
  },

  async getPaymentInfo(uuid: string) {
    return makeRequest('/payment/info', { uuid });
  },

  async getPayoutInfo(uuid: string) {
    return makeRequest('/payout/info', { uuid }, true);
  },

  async getServices() {
    return makeRequest('/payment/services', {});
  },

  async getBalance() {
    return makeRequest('/balance', {});
  },

  verifyWebhook: verifyWebhookSign,
};

export default cryptomus;
