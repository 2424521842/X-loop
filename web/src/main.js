import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './styles/element-overrides.scss'
import './styles/global.scss'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import { useUserStore } from './store/user'

const app = createApp(App)
const pinia = createPinia()

app.use(ElementPlus)
app.use(pinia)
app.use(router)

const userStore = useUserStore()

async function bootstrap() {
  await userStore.boot()
  await router.isReady()
  app.mount('#app')
}

bootstrap()
