<script lang="ts" setup>
import {computed, nextTick, onMounted, toRefs, watch} from 'vue'
import {dvMainStoreWithOut} from '@/store/modules/data-visualization/dvMain'
import {storeToRefs} from 'pinia'
import CanvasGroup from '@/custom-component/common/CanvasGroup.vue'
import {deepCopy} from '@/utils/utils'
import {DEFAULT_CANVAS_STYLE_DATA_DARK} from '@/views/chart/components/editor/util/dataVisualization'
import {groupSizeStyleAdaptor} from '@/utils/style'

const dvMainStore = dvMainStoreWithOut()
const {canvasStyleData, curComponent} = storeToRefs(dvMainStore)
const sourceCanvasStyle = deepCopy(DEFAULT_CANVAS_STYLE_DATA_DARK)
const props = defineProps({
    propValue: {
        type: Array,
        default: () => []
    },
    element: {
        type: Object,
        required: true,
        default() {
            return {
                propValue: null
            }
        }
    },
    showPosition: {
        type: String,
        required: false,
        default: 'canvas'
    },
    dvInfo: {
        type: Object,
        required: true
    },
    // 仪表板刷新计时器
    searchCount: {
        type: Number,
        required: false,
        default: 0
    },
    isEdit: {
        type: Boolean,
        required: false,
        default: false
    },
    scale: {
        type: Number,
        required: false,
        default: 1
    },
    active: {
        type: Boolean,
        default: false
    },
    canvasViewInfo: {
        type: Object,
        required: true
    },
    // 字体
    fontFamily: {
        type: String,
        required: false,
        default: 'inherit'
    }
})

const {propValue, dvInfo, element, scale, canvasViewInfo, searchCount} = toRefs(props)
const customCanvasStyle = computed(() => {
    const result = sourceCanvasStyle
    result.scale = canvasStyleData.value.scale
    result.width = (element.value.style.width * 100) / result.scale
    result.height = (element.value.style.height * 100) / result.scale
    return result
})

const setCanvasActive = () => {
    element.value['canvasActive'] = true
}

watch(
    () => props.active,
    () => {
        // canvasActive失活 满足的条件 1.当前组件未激活 2.当前没有激活组件或者有激活组件时，该组件的canvasId不属于当前分组
        nextTick(() => {
            if (
                !props.active &&
                (!curComponent.value ||
                    (curComponent.value && !curComponent.value.canvasId.includes(element.value.id)))
            ) {
                element.value['canvasActive'] = false
            }
        })
    },
    {deep: true}
)

onMounted(() => {
    nextTick(() => {
        groupSizeStyleAdaptor(element.value)
    })
})
</script>

<template>
    <div
        :class="{ 'canvas-active-custom': element['canvasActive'] }"
        class="group"
        @dblclick="setCanvasActive"
    >
        <canvas-group
            :canvas-id="'Group-' + element.id"
            :canvas-style-data="customCanvasStyle"
            :canvas-view-info="canvasViewInfo"
            :component-data="propValue"
            :dv-info="dvInfo"
            :element="element"
            :font-family="fontFamily"
            :is-edit="isEdit"
            :scale="scale"
            :search-count="searchCount"
            :show-position="showPosition"
        >
        </canvas-group>
    </div>
</template>

<style lang="less" scoped>
.group {
    & > div {
        position: relative;
        width: 100%;
        height: 100%;

        .component {
            position: absolute;
        }
    }
}

.canvas-active-custom {
    outline: 2px solid var(--ed-color-primary) !important;
}
</style>
