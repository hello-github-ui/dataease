<script lang="ts" setup>
import {toRefs} from 'vue'
import CanvasCore from '@/components/data-visualization/canvas/CanvasCore.vue'
import GroupPreview from '@/custom-component/group/GroupPreview.vue'

const props = defineProps({
    canvasStyleData: {
        type: Object,
        required: true
    },
    componentData: {
        type: Array,
        required: true
    },
    canvasViewInfo: {
        type: Object,
        required: true
    },
    dvInfo: {
        type: Object,
        required: true
    },
    element: {
        type: Object,
        default() {
            return {
                propValue: []
            }
        }
    },
    isEdit: {
        type: Boolean,
        default: false
    },
    showPosition: {
        type: String,
        required: false,
        default: 'canvas'
    },
    canvasId: {
        type: String,
        required: true
    },
    // 仪表板刷新计时器
    searchCount: {
        type: Number,
        required: false,
        default: 0
    },
    scale: {
        type: Number,
        required: false,
        default: 1
    },
    // 字体
    fontFamily: {
        type: String,
        required: false,
        default: 'inherit'
    }
})
const {element, isEdit, showPosition, canvasStyleData, canvasViewInfo, dvInfo, componentData} =
    toRefs(props)
</script>

<template>
    <canvas-core
        v-if="isEdit"
        ref="canvasGroup"
        :canvas-active="element['canvasActive']"
        :canvas-id="canvasId"
        :canvas-style-data="canvasStyleData"
        :canvas-view-info="canvasViewInfo"
        :component-data="componentData"
        :font-family="fontFamily"
        class="canvas-area-shadow"
    ></canvas-core>
    <group-preview
        v-else
        :ref="'dashboardPreview'"
        :canvas-view-info="canvasViewInfo"
        :dv-info="dvInfo"
        :element="element"
        :font-family="fontFamily"
        :prop-value="element.propValue"
        :scale="scale * 100"
        :search-count="searchCount"
        :show-position="showPosition"
    ></group-preview>
</template>

<style lang="less" scoped></style>
