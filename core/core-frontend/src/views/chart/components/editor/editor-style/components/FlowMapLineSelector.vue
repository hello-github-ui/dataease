<script lang="tsx" setup>
import {computed, onMounted, PropType, reactive, watch} from 'vue'
import {useI18n} from '@/hooks/web/useI18n'
import {COLOR_PANEL, DEFAULT_BASIC_STYLE, DEFAULT_MISC} from '@/views/chart/components/editor/util/chart'
import {dvMainStoreWithOut} from '@/store/modules/data-visualization/dvMain'
import {cloneDeep, defaultsDeep} from 'lodash-es'

const {t} = useI18n()
const dvMainStore = dvMainStoreWithOut()
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
const predefineColors = COLOR_PANEL
const flowLineTypeOptions = [
    {name: t('chart.map_line_type_line'), value: 'line'},
    {name: t('chart.map_line_type_arc'), value: 'arc'},
    {name: t('chart.map_line_type_arc_3d'), value: 'arc3d'}
]
const state = reactive({
    lineForm: {} as DeepPartial<ChartMiscAttr['flowMapConfig']['lineConfig']>,
    basicStyleForm: {}
})
const toolTip = computed(() => {
    return props.themes === 'dark' ? 'ndark' : 'dark'
})
const emit = defineEmits(['onChangeFlowMapLineForm', 'onBasicStyleChange'])

watch(
    () => props.chart.customAttr.misc.flowMapConfig.lineConfig,
    () => {
        init()
    },
    {deep: true}
)

const changeStyle = prop => {
    state.basicStyleForm.colors[0] = state.lineForm.mapLineSourceColor
    state.basicStyleForm.colors[1] = state.lineForm.mapLineTargetColor
    emit('onBasicStyleChange', {data: state.basicStyleForm, requestData: false}, 'colors')
    emit('onChangeFlowMapLineForm', state.lineForm, prop)
}
const onAlphaChange = v => {
    const _v = parseInt(v)
    if (_v >= 0 && _v <= 100) {
        state.lineForm.alpha = _v
    } else if (_v < 0) {
        state.lineForm.alpha = 0
    } else if (_v > 100) {
        state.lineForm.alpha = 100
    } else {
        const lineConfig = cloneDeep(props.chart.customAttr.misc.flowMapConfig.lineConfig)
        const oldForm = defaultsDeep(
            lineConfig,
            cloneDeep(DEFAULT_MISC.flowMapConfig)
        ) as ChartBasicStyle
        state.lineForm.alpha = oldForm.alpha
    }
    changeStyle('alpha')
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
        const basicStyle = customAttr.basicStyle
        state.basicStyleForm = defaultsDeep(
            basicStyle,
            cloneDeep(DEFAULT_BASIC_STYLE)
        ) as ChartBasicStyle
        configCompat(basicStyle)
        if (customAttr.misc.flowMapConfig.lineConfig) {
            state.lineForm = customAttr.misc.flowMapConfig.lineConfig
            state.lineForm.mapLineSourceColor = state.basicStyleForm.colors[0]
            state.lineForm.mapLineTargetColor = state.basicStyleForm.colors[1]
        } else {
            // 新增图表
            state.lineForm = {
                ...JSON.parse(JSON.stringify(DEFAULT_MISC.flowMapConfig.lineConfig))
            }
            changeStyle()
        }
    }
}
const configCompat = (basicStyle: ChartBasicStyle) => {
    // 悬浮改为图例和缩放按钮
    if (basicStyle.suspension === false && basicStyle.showZoom === undefined) {
        basicStyle.showZoom = false
    }
}

onMounted(() => {
    init()
})
</script>

<template>
    <el-form ref="lineForm" :model="state.lineForm" label-position="top" size="small">
        <el-row style="flex: 1">
            <el-col>
                <el-form-item
                    :class="'form-item-' + themes"
                    :label="t('chart.line') + ' ' + t('chart.map_line_type')"
                    class="form-item"
                >
                    <el-select
                        v-model="state.lineForm.mapLineType"
                        :effect="themes"
                        @change="changeStyle('mapLineType')"
                    >
                        <el-option
                            v-for="item in flowLineTypeOptions"
                            :key="item.name"
                            :label="item.name"
                            :value="item.value"
                        />
                    </el-select>
                </el-form-item>
            </el-col>
        </el-row>
        <div class="alpha-setting">
            <label :class="{ dark: 'dark' === themes }" class="alpha-label">
                {{ t('chart.map_line_width') }}
            </label>
            <el-row style="flex: 1">
                <el-col>
                    <el-form-item :class="'form-item-' + themes" class="form-item alpha-slider">
                        <el-slider
                            v-model="state.lineForm.mapLineWidth"
                            :effect="themes"
                            :max="10"
                            :min="1"
                            @change="changeStyle('mapLineWidth')"
                        />
                    </el-form-item>
                </el-col>
            </el-row>
        </div>
        <el-row style="flex: 1">
            <el-col>
                <el-form-item :class="'form-item-' + themes" class="form-item">
                    <el-checkbox
                        v-model="state.lineForm.mapLineGradient"
                        :effect="themes"
                        :predefine="predefineColors"
                        size="small"
                        @change="changeStyle('mapLineGradient')"
                    >
                        {{ t('chart.line') + ' ' + t('chart.map_line_linear') }}
                    </el-checkbox>
                </el-form-item>
            </el-col>
        </el-row>
        <div v-if="state.lineForm.mapLineGradient">
            <el-row :gutter="8" style="flex: 1">
                <el-col :span="13">
                    <el-form-item
                        :class="'form-item-' + themes"
                        :label="t('chart.map_line_color_source_color')"
                        class="form-item"
                    >
                        <el-color-picker
                            v-model="state.lineForm.mapLineSourceColor"
                            :effect="themes"
                            :persistent="false"
                            :predefine="predefineColors"
                            :trigger-width="108"
                            class="color-picker-style"
                            is-custom
                            @change="changeStyle('mapLineSourceColor')"
                        />
                    </el-form-item>
                </el-col>
                <el-col :span="13">
                    <el-form-item
                        :class="'form-item-' + themes"
                        :label="t('chart.map_line_color_target_color')"
                        class="form-item"
                    >
                        <el-color-picker
                            v-model="state.lineForm.mapLineTargetColor"
                            :effect="themes"
                            :persistent="false"
                            :predefine="predefineColors"
                            :trigger-width="108"
                            class="color-picker-style"
                            is-custom
                            @change="changeStyle('mapLineTargetColor')"
                        />
                    </el-form-item>
                </el-col>
            </el-row>
        </div>
        <div v-if="!state.lineForm.mapLineGradient">
            <el-row :gutter="8" style="flex: 1">
                <el-col>
                    <el-form-item :class="'form-item-' + themes" :label="t('chart.color')" class="form-item">
                        <el-color-picker
                            v-model="state.lineForm.mapLineSourceColor"
                            :effect="themes"
                            :persistent="false"
                            :predefine="predefineColors"
                            :trigger-width="108"
                            class="color-picker-style"
                            is-custom
                            @change="changeStyle('mapLineSourceColor')"
                        />
                    </el-form-item>
                </el-col>
            </el-row>
        </div>
        <div class="alpha-setting">
            <label :class="{ dark: 'dark' === themes }" class="alpha-label">
                {{ t('chart.not_alpha') }}
            </label>
            <el-row :gutter="8" style="flex: 1">
                <el-col :span="13">
                    <el-form-item :class="'form-item-' + themes" class="form-item alpha-slider">
                        <el-slider
                            v-model="state.lineForm.alpha"
                            :effect="themes"
                            @change="changeStyle('alpha')"
                        />
                    </el-form-item>
                </el-col>
                <el-col :span="11" style="padding-top: 2px">
                    <el-form-item :class="'form-item-' + themes" class="form-item">
                        <el-input
                            v-model="state.lineForm.alpha"
                            :controls="false"
                            :effect="themes"
                            :max="100"
                            :min="0"
                            class="basic-input-number"
                            type="number"
                            @change="onAlphaChange"
                        >
                            <template #suffix> %</template>
                        </el-input>
                    </el-form-item>
                </el-col>
            </el-row>
        </div>
        <el-row style="flex: 1">
            <el-col>
                <el-form-item :class="'form-item-' + themes" class="form-item">
                    <el-checkbox
                        v-model="state.lineForm.mapLineAnimate"
                        :effect="themes"
                        :predefine="predefineColors"
                        size="small"
                        @change="changeStyle('mapLineAnimate')"
                    >
                        {{ t('chart.line') + ' ' + t('chart.map_line_animate') }}
                    </el-checkbox>
                </el-form-item>
            </el-col>
        </el-row>
        <div v-if="state.lineForm.mapLineAnimate" class="alpha-setting">
            <label :class="{ dark: 'dark' === themes }" class="alpha-label">
                {{ t('chart.map_line_animate_duration') }}
            </label>
            <el-row :gutter="8" style="flex: 1">
                <el-col>
                    <el-form-item :class="'form-item-' + themes" class="form-item alpha-slider">
                        <el-slider
                            v-model="state.lineForm.mapLineAnimateDuration"
                            :effect="themes"
                            :max="20"
                            :min="0"
                            @change="changeStyle('mapLineAnimateDuration')"
                        />
                    </el-form-item>
                </el-col>
            </el-row>
        </div>
    </el-form>
</template>

<style lang="less" scoped>
:deep(.ed-input .ed-select__prefix--light) {
    padding-right: 6px;
}

.alpha-setting {
    display: flex;
    width: 100%;

    .alpha-slider {
        padding: 4px 8px;

        :deep(.ed-slider__button-wrapper) {
            --ed-slider-button-wrapper-size: 36px;
            --ed-slider-button-size: 16px;
        }
    }

    .alpha-label {
        padding-right: 8px;
        font-size: 12px;
        font-style: normal;
        font-weight: 400;
        height: 32px;
        line-height: 32px;
        display: inline-flex;
        align-items: flex-start;

        min-width: 56px;

        &.dark {
            color: #a6a6a6;
        }
    }
}
</style>
