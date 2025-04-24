<script lang="ts" setup>
import {computed, type CSSProperties, effectScope, onBeforeUnmount, onMounted, ref, toRefs} from 'vue'
import {throttle} from 'lodash-es'
import {useEventListener} from '@vueuse/core'

const props = defineProps({
    modelValue: Boolean,
    imageUrl: String
})

type ImageViewerAction = 'zoomIn' | 'zoomOut' | 'clockwise' | 'anticlockwise'

const transform = ref({
    scale: 1
})
const scopeEventListener = effectScope()
const {modelValue, imageUrl} = toRefs(props)
const imgStyle = computed(() => {
    const {scale} = transform.value
    const style: CSSProperties = {
        transform: `scale(${scale})`
    }
    return style
})

const handleActions = (action: ImageViewerAction, options = {}) => {
    const {zoomRate} = {
        zoomRate: 1.4,
        ...options
    }
    switch (action) {
        case 'zoomOut':
            if (transform.value.scale > 0.2) {
                transform.value.scale = Number.parseFloat((transform.value.scale / zoomRate).toFixed(3))
            }
            break
        case 'zoomIn':
            if (transform.value.scale < 7) {
                transform.value.scale = Number.parseFloat((transform.value.scale * zoomRate).toFixed(3))
            }
            break
    }
}

const mousewheelHandler = throttle((e: WheelEvent | any /* TODO: wheelDelta is deprecated */) => {
    const delta = e.wheelDelta ? e.wheelDelta : -e.detail
    if (delta > 0) {
        handleActions('zoomIn', {
            zoomRate: 1.2,
            enableTransition: false
        })
    } else {
        handleActions('zoomOut', {
            zoomRate: 1.2,
            enableTransition: false
        })
    }
})

onMounted(() => {
    scopeEventListener.run(() => {
        useEventListener(document, 'mousewheel', mousewheelHandler)
    })
})
onBeforeUnmount(() => {
    scopeEventListener.stop()
})
const emits = defineEmits(['update:modelValue'])
const HandleBeforeClose = () => {
    transform.value.scale = 1
    modelValue.value = false
    emits('update:modelValue', false)
}
</script>

<template>
    <el-dialog
        v-model="modelValue"
        :before-close="HandleBeforeClose"
        append-to-body
        class="img-enlarge-dialog"
        close-on-click-modal
        destroy-on-close
    >
        <div class="img-content 13">
            <img :src="imageUrl" :style="imgStyle" alt="Preview Image"/>
        </div>
    </el-dialog>
</template>

<style lang="less" scoped>
.img-content {
    width: 100vw;
    height: 100vh;
    overflow-y: auto;
    padding: 60px 120px;

    img {
        width: 100%;
        height: 100%;
        object-fit: contain;
    }
}
</style>
