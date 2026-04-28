import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './styles/element-overrides.scss'
import './styles/global.scss'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import { useUserStore } from './store/user'
import { useLocaleStore } from './store/locale'

const app = createApp(App)
const pinia = createPinia()

app.use(ElementPlus)
app.use(pinia)
app.use(router)

const userStore = useUserStore()
const localeStore = useLocaleStore()
localeStore.syncDocumentLanguage()

async function bootstrap() {
  await userStore.boot()
  await router.isReady()
  app.mount('#app')
}

bootstrap()
