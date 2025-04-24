<script lang="ts" setup>
import {onMounted, PropType, reactive, ref, watch} from 'vue'
import {COLOR_PANEL, DEFAULT_BASIC_STYLE, DEFAULT_MISC} from '@/views/chart/components/editor/util/chart'
import {useI18n} from '@/hooks/web/useI18n'
import CustomColorStyleSelect from '@/views/chart/components/editor/editor-style/components/CustomColorStyleSelect.vue'
import {cloneDeep, defaultsDeep} from 'lodash-es'
import {dvMainStoreWithOut} from '@/store/modules/data-visualization/dvMain'
import {storeToRefs} from 'pinia'
import {
    CHART_MIX_DEFAULT_BASIC_STYLE,
    MixChartBasicStyle
} from '@/views/chart/components/js/panel/charts/others/chart-mix-common'

const dvMainStore = dvMainStoreWithOut()
const {batchOptStatus} = storeToRefs(dvMainStore)
const {t} = useI18n()
const props = defineProps({
    chart: {
        type: Object as PropType<ChartObj>,
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

const showProperty = prop => props.propertyInner?.includes(prop)
const predefineColors = COLOR_PANEL
const state = reactive({
    basicStyleForm: JSON.parse(JSON.stringify(CHART_MIX_DEFAULT_BASIC_STYLE)) as MixChartBasicStyle,
    miscForm: JSON.parse(JSON.stringify(DEFAULT_MISC)) as ChartMiscAttr,
    customColor: null,
    colorIndex: 0,
    fieldColumnWidth: {
        fieldId: '',
        width: 0
    }
})
watch(
    [
        () => props.chart.customAttr.basicStyle,
        () => props.chart.customAttr.misc,
        () => props.chart.customAttr.tableHeader,
        () => props.chart.xAxis,
        () => props.chart.yAxis
    ],
    () => {
        init()
    },
    {deep: true}
)
const emit = defineEmits(['onBasicStyleChange', 'onMiscChange'])
const changeBasicStyle = (prop?: string, requestData = false) => {
    emit('onBasicStyleChange', {data: state.basicStyleForm, requestData}, prop)
}
const onAlphaChange = v => {
    const _v = parseInt(v)
    if (_v >= 0 && _v <= 100) {
        state.basicStyleForm.alpha = _v
    } else if (_v < 0) {
        state.basicStyleForm.alpha = 0
    } else if (_v > 100) {
        state.basicStyleForm.alpha = 100
    } else {
        const basicStyle = cloneDeep(props.chart.customAttr.basicStyle)
        const oldForm = defaultsDeep(
            basicStyle,
            cloneDeep(CHART_MIX_DEFAULT_BASIC_STYLE)
        ) as ChartBasicStyle
        state.basicStyleForm.alpha = oldForm.alpha
    }
    changeBasicStyle('alpha')
}

const onColumnWidthRatioChange = v => {
    const _v = parseInt(v)
    if (_v >= 1 && _v <= 100) {
        state.basicStyleForm.columnWidthRatio = _v
    } else if (_v < 1) {
        state.basicStyleForm.columnWidthRatio = 1
    } else if (_v > 100) {
        state.basicStyleForm.columnWidthRatio = 100
    } else {
        const basicStyle = cloneDeep(props.chart.customAttr.basicStyle)
        const oldForm = defaultsDeep(basicStyle, cloneDeep(DEFAULT_BASIC_STYLE)) as ChartBasicStyle
        state.basicStyleForm.columnWidthRatio = oldForm.columnWidthRatio
    }
    changeBasicStyle('columnWidthRatio')
}

const onSubAlphaChange = v => {
    const _v = parseInt(v)
    if (_v >= 0 && _v <= 100) {
        state.basicStyleForm.subAlpha = _v
    } else if (_v < 0) {
        state.basicStyleForm.subAlpha = 0
    } else if (_v > 100) {
        state.basicStyleForm.subAlpha = 100
    } else {
        const basicStyle = cloneDeep(props.chart.customAttr.basicStyle)
        const oldForm = defaultsDeep(
            basicStyle,
            cloneDeep(CHART_MIX_DEFAULT_BASIC_STYLE)
        ) as MixChartBasicStyle
        state.basicStyleForm.subAlpha = oldForm.subAlpha
    }
    changeBasicStyle('subAlpha')
}

const init = () => {
    const basicStyle = cloneDeep(props.chart.customAttr.basicStyle)
    const miscStyle = cloneDeep(props.chart.customAttr.misc)
    configCompat(basicStyle)
    state.basicStyleForm = defaultsDeep(
        basicStyle,
        cloneDeep(CHART_MIX_DEFAULT_BASIC_STYLE)
    ) as MixChartBasicStyle
    state.miscForm = defaultsDeep(miscStyle, cloneDeep(DEFAULT_MISC)) as ChartMiscAttr
    if (!state.customColor) {
        state.customColor = state.basicStyleForm.colors[0]
        state.colorIndex = 0
    }
}
const configCompat = (basicStyle: ChartBasicStyle) => {
    // 悬浮改为图例和缩放按钮
    if (basicStyle.suspension === false && basicStyle.showZoom === undefined) {
        basicStyle.showZoom = false
    }
}
const symbolOptions = [
    {name: t('chart.line_symbol_circle'), value: 'circle'},
    {name: t('chart.line_symbol_rect'), value: 'square'},
    {name: t('chart.line_symbol_triangle'), value: 'triangle'},
    {name: t('chart.line_symbol_diamond'), value: 'diamond'}
]

const activeName = ref<'left' | 'right'>('left')

onMounted(() => {
    init()
})
</script>
<template>
    <div style="width: 100%">
        <el-tabs id="axis-tabs" v-model="activeName" stretch>
            <el-tab-pane :label="t('chart.yAxisLeft')" name="left">
                <template v-if="showProperty('colors')">
                    <custom-color-style-select
                        v-model="state"
                        :chart="chart"
                        :property-inner="propertyInner"
                        :themes="themes"
                        @change-basic-style="prop => changeBasicStyle(prop)"
                    />
                </template>

                <template v-if="chart.type !== 'chart-mix-dual-line'">
                    <el-form-item
                        v-if="showProperty('gradient')"
                        :class="'form-item-' + themes"
                        class="form-item"
                    >
                        <el-checkbox
                            v-model="state.basicStyleForm.gradient"
                            :effect="themes"
                            size="small"
                            @change="changeBasicStyle('gradient')"
                        >
                            {{ $t('chart.gradient') }}{{ $t('chart.color') }}
                        </el-checkbox>
                    </el-form-item>
                </template>

                <div v-if="showProperty('alpha')" class="alpha-setting">
                    <label :class="{ dark: 'dark' === themes }" class="alpha-label">
                        {{ t('chart.not_alpha') }}
                    </label>
                    <el-row :gutter="8" style="flex: 1">
                        <el-col :span="13">
                            <el-form-item :class="'form-item-' + themes" class="form-item alpha-slider">
                                <el-slider
                                    v-model="state.basicStyleForm.alpha"
                                    :effect="themes"
                                    @change="changeBasicStyle('alpha')"
                                />
                            </el-form-item>
                        </el-col>
                        <el-col :span="11" style="padding-top: 2px">
                            <el-form-item :class="'form-item-' + themes" class="form-item">
                                <el-input
                                    v-model="state.basicStyleForm.alpha"
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

                <template v-if="chart.type !== 'chart-mix-dual-line'">
                    <el-form-item
                        v-if="showProperty('radiusColumnBar')"
                        :class="'form-item-' + themes"
                        :label="t('chart.radiusColumnBar')"
                        class="form-item"
                    >
                        <el-radio-group
                            v-model="state.basicStyleForm.radiusColumnBar"
                            :effect="themes"
                            size="small"
                            @change="changeBasicStyle('radiusColumnBar')"
                        >
                            <el-radio :effect="themes" label="rightAngle">{{ t('chart.rightAngle') }}</el-radio>
                            <el-radio :effect="themes" label="roundAngle">{{ t('chart.roundAngle') }}</el-radio>
                        </el-radio-group>
                    </el-form-item>
                    <div v-if="showProperty('columnWidthRatio')" class="alpha-setting">
                        <label :class="{ dark: 'dark' === themes }" class="alpha-label">
                            {{ t('chart.column_width_ratio') }}
                        </label>
                        <el-row :gutter="8" style="flex: 1">
                            <el-col :span="13">
                                <el-form-item :class="'form-item-' + themes" class="form-item alpha-slider">
                                    <el-slider
                                        v-model="state.basicStyleForm.columnWidthRatio"
                                        :effect="themes"
                                        :max="100"
                                        :min="1"
                                        @change="changeBasicStyle('columnWidthRatio')"
                                    />
                                </el-form-item>
                            </el-col>
                            <el-col :span="11" style="padding-top: 2px">
                                <el-form-item :class="'form-item-' + themes" class="form-item">
                                    <el-input
                                        v-model="state.basicStyleForm.columnWidthRatio"
                                        :controls="false"
                                        :effect="themes"
                                        :max="100"
                                        :min="1"
                                        class="basic-input-number"
                                        type="number"
                                        @change="onColumnWidthRatioChange"
                                    >
                                        <template #suffix> %</template>
                                    </el-input>
                                </el-form-item>
                            </el-col>
                        </el-row>
                    </div>
                </template>
                <template v-else>
                    <el-row :gutter="8">
                        <el-col :span="12">
                            <el-form-item
                                v-if="showProperty('lineWidth')"
                                :class="'form-item-' + themes"
                                :label="t('chart.line_width')"
                                class="form-item form-item-slider"
                            >
                                <el-input-number
                                    v-model="state.basicStyleForm.leftLineWidth"
                                    :effect="themes"
                                    :max="10"
                                    :min="0"
                                    controls-position="right"
                                    @change="changeBasicStyle('leftLineWidth')"
                                />
                            </el-form-item>
                        </el-col>
                    </el-row>
                    <el-row :gutter="8">
                        <el-col :span="12">
                            <el-form-item
                                v-if="showProperty('lineSymbol')"
                                :class="'form-item-' + themes"
                                :label="t('chart.line_symbol')"
                                class="form-item"
                            >
                                <el-select
                                    v-model="state.basicStyleForm.leftLineSymbol"
                                    :effect="themes"
                                    :placeholder="t('chart.line_symbol')"
                                    @change="changeBasicStyle('leftLineSymbol')"
                                >
                                    <el-option
                                        v-for="item in symbolOptions"
                                        :key="item.value"
                                        :label="item.name"
                                        :value="item.value"
                                    />
                                </el-select>
                            </el-form-item>
                        </el-col>
                        <el-col :span="12">
                            <el-form-item
                                v-if="showProperty('lineSymbolSize')"
                                :class="'form-item-' + themes"
                                :label="t('chart.line_symbol_size')"
                                class="form-item form-item-slider"
                            >
                                <el-input-number
                                    v-model="state.basicStyleForm.leftLineSymbolSize"
                                    :effect="themes"
                                    :max="20"
                                    :min="0"
                                    controls-position="right"
                                    @change="changeBasicStyle('leftLineSymbolSize')"
                                />
                            </el-form-item>
                        </el-col>
                    </el-row>
                    <el-form-item
                        v-if="showProperty('lineSmooth')"
                        :class="'form-item-' + themes"
                        class="form-item"
                    >
                        <el-checkbox
                            v-model="state.basicStyleForm.leftLineSmooth"
                            :effect="themes"
                            size="small"
                            @change="changeBasicStyle('leftLineSmooth')"
                        >
                            {{ t('chart.line_smooth') }}
                        </el-checkbox>
                    </el-form-item>
                </template>
            </el-tab-pane>
            <el-tab-pane :label="t('chart.yAxisRight')" name="right">
                <template v-if="showProperty('colors')">
                    <custom-color-style-select
                        v-model="state"
                        :chart="chart"
                        :property-inner="propertyInner"
                        :themes="themes"
                        sub
                        @change-basic-style="prop => changeBasicStyle(prop)"
                    />
                </template>

                <div v-if="showProperty('alpha')" class="alpha-setting">
                    <label :class="{ dark: 'dark' === themes }" class="alpha-label">
                        {{ t('chart.not_alpha') }}
                    </label>
                    <el-row :gutter="8" style="flex: 1">
                        <el-col :span="13">
                            <el-form-item :class="'form-item-' + themes" class="form-item alpha-slider">
                                <el-slider
                                    v-model="state.basicStyleForm.subAlpha"
                                    :effect="themes"
                                    @change="changeBasicStyle('subAlpha')"
                                />
                            </el-form-item>
                        </el-col>
                        <el-col :span="11" style="padding-top: 2px">
                            <el-form-item :class="'form-item-' + themes" class="form-item">
                                <el-input
                                    v-model="state.basicStyleForm.subAlpha"
                                    :controls="false"
                                    :effect="themes"
                                    :max="100"
                                    :min="0"
                                    class="basic-input-number"
                                    type="number"
                                    @change="onSubAlphaChange"
                                >
                                    <template #suffix> %</template>
                                </el-input>
                            </el-form-item>
                        </el-col>
                    </el-row>
                </div>

                <el-row :gutter="8">
                    <el-col :span="12">
                        <el-form-item
                            v-if="showProperty('lineWidth')"
                            :class="'form-item-' + themes"
                            :label="t('chart.line_width')"
                            class="form-item form-item-slider"
                        >
                            <el-input-number
                                v-model="state.basicStyleForm.lineWidth"
                                :effect="themes"
                                :max="10"
                                :min="0"
                                controls-position="right"
                                @change="changeBasicStyle('lineWidth')"
                            />
                        </el-form-item>
                    </el-col>
                </el-row>
                <el-row :gutter="8">
                    <el-col :span="12">
                        <el-form-item
                            v-if="showProperty('lineSymbol')"
                            :class="'form-item-' + themes"
                            :label="t('chart.line_symbol')"
                            class="form-item"
                        >
                            <el-select
                                v-model="state.basicStyleForm.lineSymbol"
                                :effect="themes"
                                :placeholder="t('chart.line_symbol')"
                                @change="changeBasicStyle('lineSymbol')"
                            >
                                <el-option
                                    v-for="item in symbolOptions"
                                    :key="item.value"
                                    :label="item.name"
                                    :value="item.value"
                                />
                            </el-select>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item
                            v-if="showProperty('lineSymbolSize')"
                            :class="'form-item-' + themes"
                            :label="t('chart.line_symbol_size')"
                            class="form-item form-item-slider"
                        >
                            <el-input-number
                                v-model="state.basicStyleForm.lineSymbolSize"
                                :effect="themes"
                                :max="20"
                                :min="0"
                                controls-position="right"
                                @change="changeBasicStyle('lineSymbolSize')"
                            />
                        </el-form-item>
                    </el-col>
                </el-row>
                <el-form-item
                    v-if="showProperty('lineSmooth')"
                    :class="'form-item-' + themes"
                    class="form-item"
                >
                    <el-checkbox
                        v-model="state.basicStyleForm.lineSmooth"
                        :effect="themes"
                        size="small"
                        @change="changeBasicStyle('lineSmooth')"
                    >
                        {{ t('chart.line_smooth') }}
                    </el-checkbox>
                </el-form-item>
            </el-tab-pane>
        </el-tabs>
    </div>
</template>
<style lang="less" scoped>
.form-item {
}

.color-picker-style {
    cursor: pointer;
    z-index: 1003;
}

.alpha-setting {
    display: flex;
    width: 100%;

    .alpha-slider {
        padding: 0 8px;

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

.table-field-width-config {
    .ed-select {
        width: 100px !important;

        :deep(.ed-input__wrapper) {
            border-radius: 4px 0 0 4px !important;
        }
    }

    .ed-input-group {
        width: 120px;

        :deep(.ed-input__wrapper) {
            border-radius: 0 !important;
        }

        :deep(.ed-input-group__append) {
            padding: 0 8px;
        }
    }
}

.table-column-mode {
    :deep(.ed-radio) {
        margin-right: 10px !important;
    }
}

.basic-input-number {
    :deep(input) {
        -webkit-appearance: none;
        -moz-appearance: textfield;

        &::-webkit-inner-spin-button,
        &::-webkit-outer-spin-button {
            -webkit-appearance: none;
        }
    }
}

.top-n-setting {
    .ed-input-number {
        width: 80px !important;
        margin: 0 2px;
    }

    :deep(span) {
        font-size: 12px;
    }
}

#axis-tabs {
    margin-top: -16px;
    --ed-tabs-header-height: 34px;

    :deep(.ed-tabs__header) {
        border-top: none !important;
    }
}
</style>
