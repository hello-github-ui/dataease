<script setup lang="ts">
import { dvMainStoreWithOut } from '@/store/modules/data-visualization/dvMain'
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import DePreview from '@/components/data-visualization/canvas/DePreview.vue'
import router from '@/router'
import { useEmitt } from '@/hooks/web/useEmitt'
import { initCanvasData, onInitReady } from '@/utils/canvasUtils'
import { queryTargetVisualizationJumpInfo } from '@/api/visualization/linkJump'
import { Base64 } from 'js-base64'
import { getOuterParamsInfo } from '@/api/visualization/outerParams'
import { ElMessage } from 'element-plus-secondary'
import { useEmbedded } from '@/store/modules/embedded'
import { useI18n } from '@/hooks/web/useI18n'
import { XpackComponent } from '@/components/plugin'
import { propTypes } from '@/utils/propTypes'
import { downloadCanvas2 } from '@/utils/imgUtils'
import { isLink, setTitle } from '@/utils/utils'
import EmptyBackground from '../../components/empty-background/src/EmptyBackground.vue'
import { useRoute } from 'vue-router'
import { filterEnumMapSync } from '@/utils/componentUtils'
const routeWatch = useRoute()

const dvMainStore = dvMainStoreWithOut()
const { t } = useI18n()
const embeddedStore = useEmbedded()
const previewCanvasContainer = ref(null)
const downloadStatus = ref(false)
const state = reactive({
  canvasDataPreview: null,
  canvasStylePreview: null,
  canvasViewInfoPreview: null,
  dvInfo: null,
  curPreviewGap: 0,
  initState: true,
  showPosition: null
})

const props = defineProps({
  publicLinkStatus: {
    type: Boolean,
    required: false,
    default: false
  },
  isSelector: {
    type: Boolean,
    default: false
  },
  ticketArgs: propTypes.string.def(null)
})

const loadCanvasDataAsync = async (dvId, dvType, ignoreParams = false) => {
  const jumpInfoParam = embeddedStore.jumpInfoParam || router.currentRoute.value.query.jumpInfoParam
  let jumpParam
  // 获取外部跳转参数
  if (jumpInfoParam) {
    jumpParam = JSON.parse(Base64.decode(decodeURIComponent(jumpInfoParam)))
    const jumpRequestParam = {
      sourceDvId: jumpParam.sourceDvId,
      sourceViewId: jumpParam.sourceViewId,
      sourceFieldId: null,
      targetDvId: dvId
    }
    try {
      // 刷新跳转目标仪表板联动信息
      await queryTargetVisualizationJumpInfo(jumpRequestParam).then(rsp => {
        dvMainStore.setNowTargetPanelJumpInfo(rsp.data)
      })
    } catch (e) {
      console.error(e)
    }
  }

  let argsObject = null
  try {
    argsObject = JSON.parse(props.ticketArgs)
  } catch (error) {
    console.error(error)
  }
  const hasTicketArgs = argsObject && Object.keys(argsObject)

  // 添加外部参数
  let attachParam
  await getOuterParamsInfo(dvId).then(rsp => {
    dvMainStore.setNowPanelOuterParamsInfoV2(rsp.data, dvId)
  })

  // 外部参数（iframe 或者 iframe嵌入）
  const attachParamsEncode = router.currentRoute.value.query.attachParams
  if (attachParamsEncode || hasTicketArgs) {
    try {
      if (!!attachParamsEncode) {
        attachParam = JSON.parse(Base64.decode(decodeURIComponent(attachParamsEncode)))
      }
      if (hasTicketArgs) {
        attachParam = Object.assign({}, attachParam, argsObject)
      }
    } catch (e) {
      console.error(e)
      ElMessage.error(t('visualization.outer_param_decode_error'))
    }
  }

  const initBrowserTimer = () => {
    if (state.canvasStylePreview.refreshBrowserEnable && isLink()) {
      const gap = state.canvasStylePreview.refreshBrowserUnit === 'minute' ? 60 : 1
      const browserRefreshTime = state.canvasStylePreview.refreshBrowserTime * gap * 1000
      setTimeout(() => {
        window.location.reload()
      }, browserRefreshTime)
    }
  }

  await initCanvasData(
    dvId,
    dvType,
    async function ({
      canvasDataResult,
      canvasStyleResult,
      dvInfo,
      canvasViewInfoPreview,
      curPreviewGap
    }) {
      if (jumpParam) {
        await filterEnumMapSync(canvasDataResult)
        dvMainStore.addViewTrackFilter(jumpParam)
      }
      state.canvasDataPreview = canvasDataResult
      state.canvasStylePreview = canvasStyleResult
      state.canvasViewInfoPreview = canvasViewInfoPreview
      state.dvInfo = dvInfo
      state.curPreviewGap = curPreviewGap
      if (!ignoreParams) {
        state.initState = false
        dvMainStore.addOuterParamsFilter(attachParam)
        state.initState = true
      }
      if (props.publicLinkStatus) {
        // 设置浏览器title为当前仪表板名称
        document.title = dvInfo.name
        setTitle(dvInfo.name)
      }
      initBrowserTimer()
      await nextTick(() => {
        onInitReady({ resourceId: dvId })
      })
    }
  )
}

const downloadH2 = type => {
  downloadStatus.value = true
  nextTick(() => {
    const vueDom = previewCanvasContainer.value.querySelector('.canvas-container')
    downloadCanvas2(type, vueDom, state.dvInfo.name, () => {
      downloadStatus.value = false
    })
  })
}
// 监听路由变化
// 监听路由变化
watch(
  () => ({ path: routeWatch.path, params: routeWatch.params }),
  () => {
    location.reload() // 重新加载浏览器页面
  },
  { deep: true }
)

let p = null
let p1 = null
const XpackLoaded = () => p(true)
const initIframe = () => p1(true)
onMounted(async () => {
  useEmitt({
    name: 'canvasDownload',
    callback: function (type = 'img') {
      downloadH2(type)
    }
  })
  await Promise.all([new Promise(r => (p = r)), new Promise(r => (p1 = r))])
  let dvId = embeddedStore.dvId || router.currentRoute.value.query.dvId
  if (router.currentRoute.value.query.jumpInfoParam && router.currentRoute.value.query.dvId) {
    dvId = router.currentRoute.value.query.dvId
  }
  // 检查外部参数
  const ignoreParams = router.currentRoute.value.query.ignoreParams === 'true'
  const isPopWindow = router.currentRoute.value.query.popWindow === 'true'
  const isFrameFlag = window.self !== window.top
  dvMainStore.setIframeFlag(isFrameFlag)
  dvMainStore.setIsPopWindow(isPopWindow)
  const { dvType, callBackFlag, taskId, showWatermark } = router.currentRoute.value.query
  if (!!taskId) {
    dvMainStore.setCanvasAttachInfo({ taskId, showWatermark })
  }
  if (dvId) {
    await loadCanvasDataAsync(dvId, dvType, ignoreParams)
    return
  }
  dvMainStore.setEmbeddedCallBack(callBackFlag || 'no')
  dvMainStore.setPublicLinkStatus(props.publicLinkStatus)
})

const dataVKeepSize = computed(() => {
  return state.canvasStylePreview?.screenAdaptor === 'keep'
})

defineExpose({
  loadCanvasDataAsync
})
</script>

<template>
  <div
    class="content"
    v-loading="!state.initState"
    :class="{ 'canvas_keep-size': dataVKeepSize }"
    ref="previewCanvasContainer"
  >
    <de-preview
      ref="dvPreview"
      v-if="state.canvasStylePreview && state.initState"
      :component-data="state.canvasDataPreview"
      :canvas-style-data="state.canvasStylePreview"
      :canvas-view-info="state.canvasViewInfoPreview"
      :dv-info="state.dvInfo"
      :cur-gap="state.curPreviewGap"
      :is-selector="props.isSelector"
      :download-status="downloadStatus"
      :show-pop-bar="true"
    ></de-preview>
    <empty-background
      v-if="!state.initState"
      :description="t('visualization.no_params_tips')"
      img-type="noneWhite"
    />
  </div>
  <XpackComponent
    jsname="L2NvbXBvbmVudC9lbWJlZGRlZC1pZnJhbWUvTmV3V2luZG93SGFuZGxlcg=="
    @loaded="XpackLoaded"
    @load-fail="XpackLoaded"
  />

  <XpackComponent
    jsname="L2NvbXBvbmVudC9lbWJlZGRlZC1pZnJhbWUvRW50cmFuY2Vz"
    @init-iframe="initIframe"
    @load-fail="initIframe"
  />
</template>

<style lang="less" scoped>
::-webkit-scrollbar {
  display: none;
}
.content {
  background-color: #ffffff;
  width: 100%;
  height: 100vh;
  align-items: center;
  overflow-x: hidden;
  overflow-y: auto;
}
</style>
