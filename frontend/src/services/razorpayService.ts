import apiService from './api';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export interface RazorpayOrderData {
  amount: number;
  currency?: string;
  receipt?: string;
  notes?: Record<string, any>;
}

export interface RazorpayPaymentData {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  bookingId?: string;
  amount: number;
  paymentMethod: string;
  currency?: string;
}

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: any) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, any>;
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
}

class RazorpayService {
  private apiBaseUrl: string;

  constructor() {
    const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
    this.apiBaseUrl = envUrl || (import.meta.env.DEV ? 'http://localhost:5000/api' : '/api');
  }

  /**
   * Load Razorpay script
   */
  private async loadRazorpayScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.Razorpay) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Razorpay script'));
      document.head.appendChild(script);
    });
  }

  // Both calls go through apiService so an expired access token is refreshed (a 401 here used to strand a paid user)
  async createOrder(orderData: RazorpayOrderData): Promise<any> {
    const res = await apiService.request('/payments/create-order', { method: 'POST', body: JSON.stringify(orderData) }, 'user');
    return res.data;
  }

  // Retried on network errors: verify is idempotent server-side (one record per Razorpay payment)
  async verifyPayment(paymentData: RazorpayPaymentData): Promise<any> {
    const body = JSON.stringify({
      razorpayOrderId: paymentData.razorpayOrderId,
      razorpayPaymentId: paymentData.razorpayPaymentId,
      razorpaySignature: paymentData.razorpaySignature,
      bookingId: paymentData.bookingId,
      paymentMethod: paymentData.paymentMethod,
      currency: paymentData.currency
    });
    for (let attempt = 0; ; attempt++) {
      try {
        const res = await apiService.request('/payments/verify', { method: 'POST', body }, 'user');
        return res.data;
      } catch (error) {
        if ((error as { status?: number }).status || attempt >= 2) throw error;
        await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
      }
    }
  }

  /**
   * Initialize Razorpay payment
   */
  async initializePayment(
    orderData: RazorpayOrderData,
    userData: { name: string; email: string; phone: string },
    onSuccess: (response: any, order: any) => void, // Add order parameter
    onFailure: (error: any) => void,
    onClose: () => void
  ): Promise<void> {
    try {
      // Load Razorpay script
      await this.loadRazorpayScript();

      // Create order
      const order = await this.createOrder(orderData);
      if (!order?.keyId) {
        throw new Error('Payment service not configured. Please try again later.');
      }

      // Configure Razorpay options (key comes from the backend env with the order)
      const options: RazorpayOptions = {
        key: order.keyId,
        amount: order.amount, // Amount in paise
        currency: order.currency,
        name: 'Chalo Sawari',
        description: orderData.notes?.description || 'Vehicle Booking Payment',
        order_id: order.orderId,
        handler: (response) => onSuccess(response, order), // Pass order to handler
        prefill: {
          name: userData.name,
          email: userData.email,
          contact: userData.phone
        },
        notes: orderData.notes,
        theme: {
          color: '#3B82F6'
        },
        modal: {
          ondismiss: onClose
        }
      };

      // Initialize Razorpay
      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('Failed to initialize payment:', error);
      onFailure(error);
    }
  }

  /**
   * Process payment for booking
   */
  async processBookingPayment(
    bookingData: {
      amount: number;
      bookingId: string;
      description: string;
    },
    userData: { name: string; email: string; phone: string },
    onSuccess: (response: any, order: any) => void, // Add order parameter
    onFailure: (error: any) => void,
    onClose: () => void
  ): Promise<void> {
    try {
      const orderData: RazorpayOrderData = {
        amount: bookingData.amount,
        currency: 'INR',
        receipt: `booking_${bookingData.bookingId}`,
        notes: {
          description: bookingData.description,
          bookingId: bookingData.bookingId,
          type: 'booking'
        }
      };

      await this.initializePayment(
        orderData,
        userData,
        async (response, order) => { // Add order parameter
          try {
            // Verify payment
            // Razorpay response structure: https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/
            const paymentData: RazorpayPaymentData = {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              bookingId: bookingData.bookingId,
              // Use the order amount which is already in paise from Razorpay
              amount: order.amount, // This is already in paise from the order
              paymentMethod: 'razorpay',
              currency: 'INR'
            };

            console.log('=== PAYMENT VERIFICATION DATA ===');
            console.log('Payment data:', paymentData);
            console.log('Razorpay response:', response);
            console.log('Order data:', order);
            console.log('Booking data:', bookingData);
            console.log('Amount breakdown:', {
              orderAmountInPaise: order.amount,
              orderAmountInRupees: order.amount / 100,
              bookingAmount: bookingData.amount,
              finalAmount: paymentData.amount,
              finalAmountInRupees: paymentData.amount / 100
            });
            
            const verificationResult = await this.verifyPayment(paymentData);

            // Caller creates the booking and shows the final confirmation
            onSuccess(verificationResult, orderData); // Pass both response and order data
          } catch (error) {
            console.error('Payment verification failed:', error);
            onFailure(error); // caller shows the error
          }
        },
        onFailure,
        onClose
      );
    } catch (error) {
      console.error('Failed to process booking payment:', error);
      onFailure(error);
    }
  }

  /**
   * Get available payment methods
   */
  getPaymentMethods() {
    return [
      {
        id: 'upi',
        name: 'UPI',
        description: 'Pay using UPI ID',
        icon: '📱',
        popular: true
      },
      {
        id: 'card',
        name: 'Credit/Debit Card',
        description: 'Pay using credit or debit card',
        icon: '💳'
      },
      {
        id: 'netbanking',
        name: 'Net Banking',
        description: 'Pay using net banking',
        icon: '🏦'
      },
      {
        id: 'wallet',
        name: 'Digital Wallet',
        description: 'Pay using digital wallets',
        icon: '👛'
      },
      {
        id: 'emi',
        name: 'EMI',
        description: 'Pay in easy installments',
        icon: '📅'
      }
    ];
  }
}

export default RazorpayService;
