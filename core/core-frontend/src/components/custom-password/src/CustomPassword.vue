<script lang="ts" setup>
import {computed, useAttrs} from 'vue'
import icon_visible_outlined from '@/assets/svg/icon_visible_outlined.svg'
import icon_invisible_outlined from '@/assets/svg/icon_invisible_outlined.svg'

const attrs = useAttrs()
const props = defineProps(['modelValue'])
const emits = defineEmits(['update:modelValue'])
const value = computed({
    get() {
        return props.modelValue
    },
    set(value) {
        emits('update:modelValue', value)
    }
})
</script>

<template>
    <el-input
        v-model="value"
        :icon-hide-custom="icon_invisible_outlined"
        :icon-view-custom="icon_visible_outlined"
        v-bind="attrs"
    />
</template>
