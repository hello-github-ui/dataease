import App from './App.vue'
import Router from './router'
import './permission'
import { setupI18n } from './locales'
import directive from './directive'
import Svg from '@/assets/svg'
import ResetView from '@/utils/reset-view'

// 初始化 Pinia Store
setupStore(app) 