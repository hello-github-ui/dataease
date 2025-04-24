<template>
    <div
        v-if="isComposeSelected"
        :class="{ 'shadow-border': props.showBorder }"
        class="compose-shadow"
        @mousedown="handleMouseDown"
    ></div>
</template>

<script lang="ts" setup>
import {composeStoreWithOut} from '@/store/modules/data-visualization/compose'
import {storeToRefs} from 'pinia'
import {computed} from 'vue'

const composeStore = composeStoreWithOut()
const {areaData} = storeToRefs(composeStore)

const props = defineProps({
    element: {
        required: true,
        type: Object
    },
    elementIndex: {
        required: false
    },
    showBorder: {
        required: false,
        type: Boolean,
        default: true
    }
})

const isComposeSelected = computed(() => areaData.value.components.includes(props.element))

const handleMouseDown = e => {
    // 右键返回
    if (e.buttons === 2) {
        return
    }
    const index = areaData.value.components.findIndex(component => component === props.element)
    if (index != -1 && props.element.component !== 'GroupArea') {
        areaData.value.components.splice(index, 1)
        e.stopPropagation()
    }
}
</script>

<style lang="less" scoped>
.compose-shadow {
    position: absolute;
    width: 100%;
    height: 100%;
    top: 0;
    left: 0;
    z-index: 10;
}

.shadow-border {
    border: 1px solid var(--ed-color-primary);
}
</style>
