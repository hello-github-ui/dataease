<template>
    <Icon v-if="element.innerType.includes('board')" v-once class-name="de-svg-main"
    >
        <component :is="iconBoardMap[element.innerType]" class="svg-icon de-svg-main"></component
        >
    </Icon>
    <component :is="element.innerType" v-else v-once></component>
</template>

<script lang="ts" setup>
import Icon from '@/components/icon-custom/src/Icon.vue'
import {iconBoardMap} from '@/components/icon-group/board-list'
import {toRefs} from 'vue'

const props = defineProps({
    propValue: {
        type: String,
        required: true,
        default: ''
    },
    element: {
        type: Object,
        default() {
            return {
                innerType: null
            }
        }
    }
})

const {element} = toRefs(props)
</script>

<style lang="less" scoped>
.de-svg-main {
    width: 100%;
    height: 100%;
}
</style>
