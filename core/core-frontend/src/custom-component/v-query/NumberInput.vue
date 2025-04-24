<script lang="ts" setup>
import {computed, inject, nextTick, onBeforeMount, type PropType, type Ref, toRefs} from 'vue'

interface SelectConfig {
    id: string
    defaultValueCheck: boolean
    defaultNumValueEnd: number
    numValueEnd: number
    queryConditionWidth: number
    numValueStart: number
    defaultNumValueStart: number
    placeholder: string
}

const placeholder: Ref = inject('placeholder')

const placeholderText = computed(() => {
    if (placeholder?.value?.placeholderShow) {
        return props.config.placeholder
    }
    return ' '
})

const props = defineProps({
    config: {
        type: Object as PropType<SelectConfig>,
        default: () => {
            return {
                id: '',
                queryConditionWidth: 0,
                defaultNumValueEnd: '',
                defaultNumValueStart: '',
                numValueEnd: '',
                numValueStart: '',
                defaultValueCheck: false
            }
        }
    },
    isConfig: {
        type: Boolean,
        default: false
    }
})

const {config} = toRefs(props)
const setParams = () => {
    if (!config.value.defaultValueCheck) {
        config.value.numValueEnd = undefined
        config.value.numValueStart = undefined
        return
    }
    const {defaultNumValueEnd, defaultNumValueStart} = config.value
    config.value.numValueEnd = defaultNumValueEnd
    config.value.numValueStart = defaultNumValueStart
}
onBeforeMount(() => {
    setParams()
})
const queryConditionWidth = inject('com-width', Function, true)
const customStyle = inject<{ background: string; border: string }>('$custom-style-filter')
const isConfirmSearch = inject('is-confirm-search', Function, true)

const getCustomWidth = () => {
    if (placeholder?.value?.placeholderShow) {
        if (props.config.queryConditionWidth === undefined) {
            return queryConditionWidth()
        }
        return props.config.queryConditionWidth
    }
    return 227
}
const selectStyle = computed(() => {
    return {width: getCustomWidth() + 'px'}
})
const handleValueChange = () => {
    if (!props.isConfig) {
        nextTick(() => {
            isConfirmSearch(config.value.id)
        })
        return
    }
}

const color = computed(() => {
    return customStyle.border
})
</script>

<template>
    <div :style="{ background: customStyle.background }" class="num-search-select">
        <el-input-number
            v-model="config.numValueStart"
            :placeholder="placeholderText"
            :style="selectStyle"
            controls-position="right"
            @change="handleValueChange"
        />
        <div class="num-value_line"></div>
        <el-input-number
            v-model="config.numValueEnd"
            :placeholder="placeholderText"
            :style="selectStyle"
            controls-position="right"
            @change="handleValueChange"
        />
    </div>
</template>

<style lang="less" scoped>
.num-search-select {
    display: flex;
    align-items: center;
    border-radius: 4px;

    .num-value_line {
        background: #1f2329;
        width: 12px;
        height: 1px;
        margin: 0 8px;
    }

    :deep(.ed-input-number__increase),
    :deep(.ed-input-number__decrease) {
        background-color: transparent !important;
        border-color: v-bind(color) !important;
    }
}
</style>
