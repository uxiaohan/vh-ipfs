import { ref } from 'vue';
import { gatewayApi } from '../api';

export function useGateways() {
  const gateways = ref([]);
  const loading = ref(false);

  async function loadPublicGateway() {
    loading.value = true;
    try {
      const result = await gatewayApi.getPublicGateways();
      gateways.value = result.gateways;
    } catch (error) {
      console.error('Failed to load gateways:', error);
      gateways.value = [];
    } finally {
      loading.value = false;
    }
  }

  async function saveGateways(newGateways) {
    loading.value = true;
    try {
      const result = await gatewayApi.setPublicGateways(newGateways);
      gateways.value = result.gateways;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      loading.value = false;
    }
  }

  function addGateway(gateway) {
    gateways.value = [...gateways.value, { ...gateway }];
  }

  function removeGateway(index) {
    gateways.value = gateways.value.filter((_, i) => i !== index);
  }

  function updateGateway(index, gateway) {
    gateways.value = gateways.value.map((g, i) => 
      i === index ? { ...gateway } : g
    );
  }

  return {
    gateways,
    loading,
    loadPublicGateway,
    saveGateways,
    addGateway,
    removeGateway,
    updateGateway
  };
}