<script lang="tsx" setup>
import {onMounted, PropType, reactive, watch} from 'vue'
import {useI18n} from '@/hooks/web/useI18n'
import {COLOR_PANEL, DEFAULT_MISC} from '@/views/chart/components/editor/util/chart'
import {cloneDeep, defaultsDeep} from 'lodash-es'

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
    },
    selectorType: {
        type: String
    }
})

const predefineColors = COLOR_PANEL

const state = reactive({
    bulletMeasureForm: {
        bar: {
            measures: {
                fill: 'rgba(0,128,255,1)',
                size: 15,
                name: ''
            }
        }
    }
})
const emit = defineEmits(['onBasicStyleChange', 'onMiscChange'])
watch(
    () => props.chart.customAttr.misc,
    () => {
        init()
    },
    {deep: true}
)
const changeStyle = (prop?) => {
    emit(
        'onMiscChange',
        {data: {bullet: {...state.bulletMeasureForm}}, requestData: true},
        prop
    )
}

const init = () => {
    const chart = JSON.parse(JSON.stringify(props.chart))
    if (chart.customAttr) {
        let customAttr = null
        if (Object.prototype.toString.call(chart.customAttr) === '[object Object]') {
            customAttr = JSON.parse(JSON.stringify(chart.customAttr))
        } else {
            customAttr = JSON.parse(chart.customAttr)
        }
        state.bulletMeasureForm = defaultsDeep(customAttr.misc.bullet, cloneDeep(DEFAULT_MISC.bullet))
    }
}

onMounted(() => {
    init()
})
</script>

<template>
    <el-form
        ref="bulletMeasureForm"
        :model="state.bulletMeasureForm"
        label-position="top"
        size="small"
        @submit.prevent
    >
        <div v-if="selectorType === 'measure'">
            <div style="flex: 1; display: flex">
                <el-form-item
                    :class="'form-item-' + themes"
                    :label="t('visualization.backgroundColor')"
                    class="form-item"
                    style="padding-right: 4px"
                >
                    <el-color-picker
                        v-model="state.bulletMeasureForm.bar.measures.fill"
                        :effect="themes"
                        :predefine="predefineColors"
                        is-custom
                        show-alpha
                        @change="changeStyle('bar.measures.fill')"
                    />
                </el-form-item>
                <el-form-item
                    :class="'form-item-' + themes"
                    :label="t('chart.radar_size')"
                    class="form-item"
                    style="padding-left: 4px; width: 100%"
                >
                    <el-input-number
                        v-model="state.bulletMeasureForm.bar.measures.size"
                        :effect="props.themes"
                        :max="100"
                        :min="1"
                        controls-position="right"
                        size="small"
                        @change="changeStyle('bar.measures.size')"
                    />
                </el-form-item>
            </div>
        </div>
    </el-form>
</template>

<style lang="less" scoped></style>
