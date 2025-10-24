// Mock para ordersService en tests
export const ordersService = {
  async createOrder(orderData) {
    return { 
      success: true, 
      data: { 
        id: 'mock-order-id', 
        ...orderData 
      } 
    };
  },
  async getOrder(orderId) {
    return { 
      success: true, 
      data: { 
        id: orderId,
        status: 'pending'
      } 
    };
  },
  async updateOrderStatus(orderId, status) {
    return { 
      success: true, 
      data: { 
        id: orderId,
        status 
      } 
    };
  }
};