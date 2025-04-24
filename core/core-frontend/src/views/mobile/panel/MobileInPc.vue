<script lang="ts" setup>
import {reactive} from 'vue'
import {dvMainStoreWithOut} from '@/store/modules/data-visualization/dvMain'
import {storeToRefs} from 'pinia'
import DeCanvas from '@/views/canvas/DeCanvas.vue'

const dvMainStore = dvMainStoreWithOut()

const {componentData, canvasStyleData, canvasViewInfo} = storeToRefs(dvMainStore)

const state = reactive({
    canvasId: 'canvas-main'
})
</script>

<template>
    <div class="dv-common-layout-mobile">
        <de-canvas
            :canvas-id="state.canvasId"
            :canvas-style-data="canvasStyleData"
            :canvas-view-info="canvasViewInfo"
            :component-data="componentData"
            :font-family="canvasStyleData.fontFamily"
            style="overflow-x: hidden"
        ></de-canvas>
    </div>
</template>

<style lang="less">
.dv-common-layout-mobile {
    height: 100vh;
    width: 100vw;
    overflow-y: auto;
}
</style>
