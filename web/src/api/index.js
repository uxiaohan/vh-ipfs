const API_BASE = '/api';

export const api = {
  async get(url, options = {}) {
    const response = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    return this.handleResponse(response);
  },

  async post(url, data, options = {}) {
    const response = await fetch(`${API_BASE}${url}`, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: JSON.stringify(data)
    });
    return this.handleResponse(response);
  },

  async delete(url, options = {}) {
    const response = await fetch(`${API_BASE}${url}`, {
      ...options,
      method: 'DELETE',
      headers: {
        ...options.headers
      }
    });
    return this.handleResponse(response);
  },

  async handleResponse(response) {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      
      if (response.status === 401) {
        localStorage.removeItem('admin_token');
        window.location.reload();
      }
      
      throw new Error(error.error || 'Request failed');
    }
    return response.json();
  }
};

export const authApi = {
  getAuthHeaders() {
    const token = localStorage.getItem('admin_token');
    return token ? { authorization: `Bearer ${token}` } : {};
  },

  async checkHasPassword() {
    return api.get('/admin/has-password');
  },

  async login(password) {
    return api.post('/login', { password });
  },

  async setupPassword(password) {
    return api.post('/admin/password', { password });
  },

  async changePassword(oldPassword, newPassword) {
    return api.post('/admin/change-password', { old_password: oldPassword, new_password: newPassword }, {
      headers: this.getAuthHeaders()
    });
  },

  async getSitePasswordEnabled() {
    return api.get('/site-password-enabled');
  },

  async setSitePasswordEnabled(enabled) {
    return api.post('/admin/site-password-enabled', { enabled }, {
      headers: this.getAuthHeaders()
    });
  },

  async changeSitePassword(adminPassword, newPassword) {
    return api.post('/admin/change-site-password', { admin_password: adminPassword, new_password: newPassword }, {
      headers: this.getAuthHeaders()
    });
  }
};

export const imageApi = {
  getAuthHeaders() {
    const token = localStorage.getItem('admin_token');
    return token ? { authorization: `Bearer ${token}` } : {};
  },

  async getImages(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/admin/images?${queryString}`, {
      headers: this.getAuthHeaders()
    });
  },

  async deleteImage(id) {
    return api.delete(`/admin/images/${id}`, {
      headers: this.getAuthHeaders()
    });
  },

  async getRecentImages(limit = 10) {
    return api.get(`/images?limit=${limit}`);
  }
};

export const storageApi = {
  getAuthHeaders() {
    const token = localStorage.getItem('admin_token');
    return token ? { authorization: `Bearer ${token}` } : {};
  },

  async getStorageInfo() {
    return api.get('/admin/storage', {
      headers: this.getAuthHeaders()
    });
  },

  async setStorageLimit(maxBytes) {
    return api.post('/admin/storage', { max_bytes: maxBytes }, {
      headers: this.getAuthHeaders()
    });
  }
};

export const gatewayApi = {
  getAuthHeaders() {
    const token = localStorage.getItem('admin_token');
    return token ? { authorization: `Bearer ${token}` } : {};
  },

  async getPublicGateways() {
    return api.get('/public-gateway');
  },

  async getAdminGateways() {
    return api.get('/admin/public-gateway', {
      headers: this.getAuthHeaders()
    });
  },

  async setPublicGateways(gateways) {
    return api.post('/admin/public-gateway', { gateways }, {
      headers: this.getAuthHeaders()
    });
  }
};