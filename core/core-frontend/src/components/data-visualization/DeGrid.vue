<template>
    <svg class="grid" height="100%" width="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <pattern
                id="smallGrid"
                :height="smallGridH"
                :width="smallGridW"
                patternUnits="userSpaceOnUse"
            >
                <path
                    :d="smallGridPathD"
                    fill="none"
                    stroke="rgba(207, 207, 207, 0.4)"
                    stroke-width="0.8"
                />
            </pattern>
            <pattern
                id="middleGrid"
                :height="middleGridH"
                :width="middleGridW"
                patternUnits="userSpaceOnUse"
            >
                <rect :height="middleGridH" :width="middleGridW" fill="url(#smallGrid)"/>
                <path :d="middleGridPathD" fill="none" stroke="rgba(207, 207, 207, 0.4)" stroke-width="1"/>
            </pattern>
            <pattern id="grid" :height="gridH" :width="gridW" patternUnits="userSpaceOnUse">
                <rect :height="gridH" :width="gridW" fill="url(#middleGrid)"/>
                <path :d="pathD" fill="none" stroke="rgba(207, 207, 207, 0.4)" stroke-width="1.2"/>
            </pattern>
        </defs>
        <rect fill="url(#grid)" height="100%" width="100%"/>
    </svg>
</template>

<script lang="ts" setup>
import {computed} from 'vue'

const matrixBase = 2

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

const middleGridPathD = computed(() => {
    return 'M ' + middleGridW.value + ' 0 L 0 0 0 ' + middleGridH.value
})

const smallGridPathD = computed(() => {
    return 'M ' + smallGridW.value + ' 0 L 0 0 0 ' + smallGridH.value
})

const gridW = computed(() => {
    return props.matrixStyle.width * 2 * matrixBase
})

const gridH = computed(() => {
    return props.matrixStyle.height * 2 * matrixBase
})

const middleGridW = computed(() => {
    return props.matrixStyle.width * matrixBase
})

const middleGridH = computed(() => {
    return props.matrixStyle.height * matrixBase
})

const smallGridW = computed(() => {
    return props.matrixStyle.width
})

const smallGridH = computed(() => {
    return props.matrixStyle.height
})
</script>

<style lang="less" scoped>
.grid {
    position: absolute;
    top: 0;
    left: 0;
}
</style>
