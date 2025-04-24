<template>
    <div class="hang-main" @keydown.stop @keyup.stop>
        <div v-for="(config, index) in hangComponentData" :key="index">
            <component
                :is="findComponent(config['component'])"
                ref="component"
                :element="config"
                :scale="deepScale"
                :view="canvasViewInfo[config['id']]"
                class="component"
            />
        </div>
    </div>
</template>

<script lang="ts" setup>
import {computed, toRefs} from 'vue'
import findComponent from '@/utils/components'

const props = defineProps({
    hangComponentData: {
        type: Object,
        required: true
    },
    canvasViewInfo: {
        type: Object,
        required: true
    },
    scale: {
        type: Number,
        required: false,
        default: 100
    }
})

const {hangComponentData, scale} = toRefs(props)
const deepScale = computed(() => scale.value / 100)
</script>

<style lang="less" scoped>
.hang-main {
    overflow: auto;
    width: 100%;
    height: 300px;
}
</style>
