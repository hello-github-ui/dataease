<script lang="tsx" setup>
import {PropType, reactive, watch} from 'vue'
import {useI18n} from '@/hooks/web/useI18n'

const {t} = useI18n()

const props = defineProps({
    chart: {
        type: Object,
        required: true
    },
    themes: {
        type: String as PropType<EditorTheme>,
        default: 'dark'
    },
    propertyInner: {
        type: Array<string>
    }
})

const emit = defineEmits(['onScrollCfgChange'])

watch(
    () => props.chart.senior.scrollCfg,
    () => {
        init()
    },
    {deep: true}
)

const state = reactive({
    scrollForm: {} as ScrollCfg,
    isAutoBreakLine: false
})

const changeScrollCfg = () => {
    emit('onScrollCfgChange', state.scrollForm)
}

const init = () => {
    const chart = JSON.parse(JSON.stringify(props.chart))
    if (chart.senior) {
        let senior = null
        if (Object.prototype.toString.call(chart.senior) === '[object Object]') {
            senior = JSON.parse(JSON.stringify(chart.senior))
        } else {
            senior = JSON.parse(chart.senior)
        }
        if (senior.scrollCfg) {
            state.scrollForm = senior.scrollCfg
        }
    }
}

init()
</script>

<template>
    <div :style="{ width: '100%', display: 'block' }" @keydown.stop @keyup.stop>
        <el-form
            ref="scrollForm"
            :disabled="!state.scrollForm.open"
            :model="state.scrollForm"
            label-position="top"
        >
            <el-form-item
                v-show="!state.isAutoBreakLine"
                :class="'form-item-' + themes"
                :label="t('chart.row')"
                class="form-item"
            >
                <el-input-number
                    v-model.number="state.scrollForm.row"
                    :effect="props.themes"
                    :max="1000"
                    :min="1"
                    :precision="0"
                    controls-position="right"
                    size="small"
                    @change="changeScrollCfg"
                />
            </el-form-item>
            <el-form-item
                v-show="state.isAutoBreakLine"
                :class="'form-item-' + themes"
                :label="t('chart.step')"
                class="form-item"
            >
                <el-input-number
                    v-model="state.scrollForm.step"
                    :effect="props.themes"
                    :max="10000"
                    :min="1"
                    :precision="0"
                    controls-position="right"
                    size="small"
                    @change="changeScrollCfg"
                />
            </el-form-item>
            <el-form-item
                :class="'form-item-' + themes"
                :label="t('chart.interval') + '(ms)'"
                class="form-item"
            >
                <el-input-number
                    v-model="state.scrollForm.interval"
                    :effect="props.themes"
                    :min="500"
                    :precision="0"
                    :step="1000"
                    controls-position="right"
                    size="small"
                    @change="changeScrollCfg"
                />
            </el-form-item>
        </el-form>
    </div>
</template>

<style lang="less" scoped>
.shape-item {
    padding: 6px;
    border: none;
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.form-item-slider :deep(.el-form-item__label) {
    font-size: 12px;
    line-height: 38px;
}

.form-item :deep(.el-form-item__label) {
    font-size: 12px;
}

.el-select-dropdown__item {
    padding: 0 20px;
}

span {
    font-size: 12px;
}

.el-form-item {
    margin-bottom: 6px;
}

.switch-style {
    position: absolute;
    right: 10px;
    margin-top: -4px;
}

.color-picker-style {
    cursor: pointer;
    z-index: 1003;
}
</style>
