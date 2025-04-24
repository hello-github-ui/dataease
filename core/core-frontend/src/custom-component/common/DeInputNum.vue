<script lang="ts" setup>
import {PropType, toRefs} from 'vue'

const props = defineProps({
    value: Number,
    name: String,
    min: Number,
    max: Number,
    step: Number,
    disabled: Boolean,
    themes: {
        type: String as PropType<'light' | 'dark'>,
        default: 'light'
    }
})

const {value, min, max, step, themes, disabled} = toRefs(props)
</script>

<template>
    <el-input-number
        v-model="value"
        :class="themes + '-custom-input-number'"
        :disabled="disabled"
        :effect="themes"
        :max="max"
        :min="min"
        :step="step"
        class="de-input-number"
        controls-position="right"
        size="small"
    />
</template>

<style lang="less" scoped>
.de-input-number {
    margin-left: 5px;
    width: 80px;
}

.dark-custom-input-number :deep(.ed-input__wrapper) {
    background-color: rgba(0, 0, 0, 0) !important;
    padding-left: 5px !important;
    padding-right: 30px !important;
}

.dark-custom-input-number :deep(.ed-input__inner) {
    color: #ffffff;
}

.dark-custom-input-number :deep(.ed-input-number__decrease) {
    background-color: rgba(0, 0, 0, 0) !important;
    color: #ffffff;
}

.dark-custom-input-number :deep(.ed-input-number__increase) {
    background-color: rgba(0, 0, 0, 0) !important;
    color: #ffffff;
}
</style>
