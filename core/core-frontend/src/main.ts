import App from './App.vue'
import Router from './router'
import './permission'
import { setupI18n } from './locales'
import directive from './directive'
import Svg from '@/assets/svg'
import ResetView from '@/utils/reset-view'

// 导入 S2 补丁
import './views/chart/components/js/antv_s2_patch.js'

// 初始化 Pinia Store
setupStore(app) 