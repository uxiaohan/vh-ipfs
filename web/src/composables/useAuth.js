import { ref, computed } from 'vue';
import { authApi } from '../api';

export function useAuth() {
  const isLoggedIn = ref(Boolean(localStorage.getItem('admin_token')));
  const loginPassword = ref('');
  const loginLoading = ref(false);
  const hasPassword = ref(true);
  const setPasswordLoading = ref(false);
  const setupPassword = ref('');

  const canLogin = computed(() => {
    if (hasPassword.value) {
      return loginPassword.value.length > 0;
    }
    return setupPassword.value.length >= 6;
  });

  async function checkHasPassword() {
    try {
      const result = await authApi.checkHasPassword();
      hasPassword.value = result.has_password;
    } catch (error) {
      console.error('Failed to check password status:', error);
    }
  }

  async function login() {
    if (!canLogin.value) return;

    loginLoading.value = true;
    try {
      const result = await authApi.login(loginPassword.value);
      localStorage.setItem('admin_token', result.token);
      isLoggedIn.value = true;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      loginLoading.value = false;
    }
  }

  async function handleSetupPassword() {
    if (setupPassword.value.length < 6) return;

    setPasswordLoading.value = true;
    try {
      await authApi.setupPassword(setupPassword.value);
      hasPassword.value = true;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      setPasswordLoading.value = false;
    }
  }

  function logout() {
    localStorage.removeItem('admin_token');
    isLoggedIn.value = false;
  }

  return {
    isLoggedIn,
    loginPassword,
    loginLoading,
    hasPassword,
    setPasswordLoading,
    setupPassword,
    canLogin,
    checkHasPassword,
    login,
    handleSetupPassword,
    logout
  };
}