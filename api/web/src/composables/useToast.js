import { reactive, readonly } from 'vue'

const state = reactive({
  message: '',
  type: 'info'
})

let timer = null

const showToast = (message, type = 'info', duration = 3000) => {
  if (timer) clearTimeout(timer)
  
  Object.assign(state, { message, type })
  
  timer = setTimeout(() => {
    state.message = ''
  }, duration)
}

const closeToast = () => {
  if (timer) clearTimeout(timer)
  state.message = ''
}

const createHandler = (type) => (message, duration = 3000) => 
  showToast(message, type, duration)

export const useToast = () => ({
  state: readonly(state),
  showToast,
  success: createHandler('success'),
  error: createHandler('error'),
  warning: createHandler('warning'),
  info: createHandler('info'),
  close: closeToast
})
