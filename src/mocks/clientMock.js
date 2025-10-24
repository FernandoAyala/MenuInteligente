// Mock para apiClient en tests
export const apiClient = {
  async get(url) {
    return { 
      data: {},
      status: 200,
      statusText: 'OK'
    };
  },
  async post(url, data) {
    return { 
      data: { success: true, data },
      status: 200,
      statusText: 'OK'
    };
  },
  async put(url, data) {
    return { 
      data: { success: true, data },
      status: 200,
      statusText: 'OK'
    };
  },
  async delete(url) {
    return { 
      data: { success: true },
      status: 200,
      statusText: 'OK'
    };
  }
};