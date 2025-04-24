<template>
    <svg class="grid" height="100%" width="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <pattern id="grid" :height="gridH" :width="gridW" patternUnits="userSpaceOnUse">
                <rect :height="gridH" :width="gridW" fill="url(#middleGrid)"/>
                <path :d="pathD" fill="none" stroke="rgba(207, 207, 207, 0.4)" stroke-width="0.7"/>
            </pattern>
            <pattern
                id="middleGrid"
                :height="middleGridH"
                :width="middleGridW"
                patternUnits="userSpaceOnUse"
            >
                <rect :height="middleGridH" :width="middleGridW" fill="url(#smallGrid)"/>
                <path
                    :d="middleGridPathD"
                    fill="none"
                    stroke="rgba(207, 207, 207, 0.4)"
                    stroke-width="0.3"
                />
            </pattern>
        </defs>
        <rect fill="url(#grid)" height="100%" width="100%"/>
    </svg>
</template>

<script lang="ts" setup>
import {computed} from 'vue'

const props = defineProps({
    matrixStyle: {
        type: Object
    },
    themes: {
        type: String,
        default: 'dark'
    }
})

const pathD = computed(() => {
    return 'M ' + gridW.value + ' 0 L 0 0 0 ' + gridH.value
})

const gridW = computed(() => {
    return props.matrixStyle.width * 5
})

const gridH = computed(() => {
    return props.matrixStyle.height * 5
})

const middleGridPathD = computed(() => {
    return 'M ' + middleGridW.value + ' 0 L 0 0 0 ' + middleGridH.value
})

const middleGridW = computed(() => {
    return props.matrixStyle.width
})

const middleGridH = computed(() => {
    return props.matrixStyle.height
})
</script>

<style lang="less" scoped>
.grid {
    position: absolute;
    top: -1px;
    left: -1px;
}
</style>
