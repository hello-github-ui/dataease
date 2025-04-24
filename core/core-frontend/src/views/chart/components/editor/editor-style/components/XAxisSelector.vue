<script lang="tsx" setup>
import icon_info_outlined from '@/assets/svg/icon_info_outlined.svg'
import {computed, onMounted, PropType, reactive, watch} from 'vue'
import {useI18n} from '@/hooks/web/useI18n'
import {COLOR_PANEL, DEFAULT_XAXIS_STYLE} from '@/views/chart/components/editor/util/chart'
import {
    formatterType,
    getUnitTypeList,
    initFormatCfgUnit,
    isEnLocal,
    onChangeFormatCfgUnitLanguage
} from '@/views/chart/components/js/formatter'
import {ElFormItem, ElMessage} from 'element-plus-secondary'

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

const predefineColors = COLOR_PANEL
const typeList = formatterType

const state = reactive({
    axisForm: JSON.parse(JSON.stringify(DEFAULT_XAXIS_STYLE))
})
const toolTip = computed(() => {
    return props.themes === 'dark' ? 'ndark' : 'dark'
})
const emit = defineEmits(['onChangeXAxisForm'])

watch(
    () => props.chart.customStyle.xAxis,
    () => {
        init()
    },
    {deep: true}
)

const fontSizeList = computed(() => {
    const arr = []
    for (let i = 10; i <= 40; i = i + 2) {
        arr.push({
            name: i + '',
            value: i
        })
    }
    for (let i = 50; i <= 200; i = i + 10) {
        arr.push({
            name: i + '',
            value: i
        })
    }
    return arr
})

const splitLineStyle = [
    {label: t('chart.line_type_solid'), value: 'solid'},
    {label: t('chart.line_type_dashed'), value: 'dashed'},
    {label: t('chart.line_type_dotted'), value: 'dotted'}
]

const isBarRangeTime = computed<boolean>(() => {
    if (props.chart.type === 'bar-range') {
        const tempYAxis = props.chart.yAxis[0]
        const tempYAxisExt = props.chart.yAxisExt[0]
        if (
            (tempYAxis && tempYAxis.groupType === 'd') ||
            (tempYAxisExt && tempYAxisExt.groupType === 'd')
        ) {
            return true
        }
    }
    return false
})

const changeAxisStyle = prop => {
    if (
        state.axisForm.axisValue.splitCount &&
        (state.axisForm.axisValue.splitCount > 100 || state.axisForm.axisValue.splitCount < 0)
    ) {
        ElMessage.error(t('chart.splitCount_less_100'))
        return
    }
    emit('onChangeXAxisForm', state.axisForm, prop)
}

function changeUnitLanguage(cfg: BaseFormatter, lang, prop: string) {
    onChangeFormatCfgUnitLanguage(cfg, lang)
    changeAxisStyle(prop)
}

const init = () => {
    const chart = JSON.parse(JSON.stringify(props.chart))
    if (chart.customStyle) {
        let customStyle = null
        if (Object.prototype.toString.call(chart.customStyle) === '[object Object]') {
            customStyle = JSON.parse(JSON.stringify(chart.customStyle))
        } else {
            customStyle = JSON.parse(chart.customStyle)
        }
        if (customStyle.xAxis) {
            state.axisForm = customStyle.xAxis
            initFormatCfgUnit(state.axisForm.axisLabelFormatter)
        }
    }
}

const showProperty = prop => props.propertyInner?.includes(prop)

const isBidirectionalBar = computed(() => {
    return props.chart.type === 'bidirectional-bar'
})

const isBulletGraph = computed(() => {
    return ['bullet-graph'].includes(props.chart.type)
})

const isHorizontalLayout = computed(() => {
    return props.chart.customAttr.basicStyle.layout === 'horizontal'
})

onMounted(() => {
    init()
})
</script>

<template>
    <el-form
        ref="axisForm"
        :disabled="!state.axisForm.show"
        :model="state.axisForm"
        label-position="top"
        size="small"
    >
        <el-form-item
            v-if="showProperty('position')"
            :class="'form-item-' + themes"
            :label="t('chart.position')"
            class="form-item"
        >
            <el-radio-group
                v-model="state.axisForm.position"
                size="small"
                @change="changeAxisStyle('position')"
            >
                <div v-if="isBidirectionalBar">
                    <el-radio :effect="props.themes" label="top">{{
                            isHorizontalLayout ? t('chart.text_pos_left') : t('chart.text_pos_top')
                        }}
                    </el-radio>
                    <el-radio :effect="props.themes" label="bottom">{{
                            t('chart.text_pos_center')
                        }}
                    </el-radio>
                </div>
                <div v-else-if="isBulletGraph">
                    <div v-if="isHorizontalLayout">
                        <el-radio :effect="props.themes" label="bottom">{{
                                t('chart.text_pos_left')
                            }}
                        </el-radio>
                        <el-radio :effect="props.themes" label="top">{{ t('chart.text_pos_right') }}</el-radio>
                    </div>
                    <div v-else>
                        <el-radio :effect="props.themes" label="top">{{ t('chart.text_pos_top') }}</el-radio>
                        <el-radio :effect="props.themes" label="bottom">{{
                                t('chart.text_pos_bottom')
                            }}
                        </el-radio>
                    </div>
                </div>
                <div v-else>
                    <el-radio :effect="props.themes" label="top">{{ t('chart.text_pos_top') }}</el-radio>
                    <el-radio :effect="props.themes" label="bottom">{{
                            t('chart.text_pos_bottom')
                        }}
                    </el-radio>
                </div>
            </el-radio-group>
        </el-form-item>

        <el-form-item v-if="!isBidirectionalBar" :class="'form-item-' + themes" class="form-item">
            <el-checkbox
                v-model="state.axisForm.nameShow"
                :effect="props.themes"
                size="small"
                @change="changeAxisStyle('nameShow')"
            >
                {{ t('chart.axis_nameShow') }}
            </el-checkbox>
        </el-form-item>
        <div style="margin-left: 22px">
            <el-form-item
                v-if="showProperty('name')"
                :class="'form-item-' + themes"
                :label="t('chart.name')"
                class="form-item"
            >
                <el-input
                    v-model="state.axisForm.name"
                    :disabled="!state.axisForm.nameShow"
                    :effect="props.themes"
                    maxlength="50"
                    size="small"
                    @blur="changeAxisStyle('name')"
                />
            </el-form-item>

            <div style="display: flex">
                <el-form-item
                    v-if="showProperty('color')"
                    :class="'form-item-' + themes"
                    :label="t('chart.chart_style')"
                    class="form-item"
                >
                    <el-color-picker
                        v-model="state.axisForm.color"
                        :disabled="!state.axisForm.nameShow"
                        :effect="themes"
                        :predefine="predefineColors"
                        class="color-picker-style"
                        is-custom
                        @change="changeAxisStyle('color')"
                    />
                </el-form-item>
                <el-form-item
                    v-if="showProperty('fontSize')"
                    :class="'form-item-' + themes"
                    class="form-item"
                    style="padding-left: 4px"
                >
                    <template #label>&nbsp;</template>
                    <el-tooltip :content="t('chart.font_size')" :effect="toolTip" placement="top">
                        <el-select
                            v-model="state.axisForm.fontSize"
                            :disabled="!state.axisForm.nameShow"
                            :effect="props.themes"
                            :placeholder="t('chart.axis_name_fontsize')"
                            style="width: 108px"
                            @change="changeAxisStyle('fontSize')"
                        >
                            <el-option
                                v-for="option in fontSizeList"
                                :key="option.value"
                                :label="option.name"
                                :value="option.value"
                            />
                        </el-select>
                    </el-tooltip>
                </el-form-item>
            </div>
        </div>

        <template v-if="showProperty('axisValue')">
            <el-divider :class="'m-divider--' + themes" class="m-divider"/>
            <div style="display: flex; flex-direction: row; justify-content: space-between">
                <label :class="'custom-form-item-label--' + themes" class="custom-form-item-label">
                    {{ t('chart.axis_value') }}
                    <el-tooltip :effect="toolTip" class="item" placement="top">
                        <template #content><span v-html="t('chart.axis_tip')"></span></template>
                        <span style="vertical-align: middle">
              <el-icon style="cursor: pointer">
                <Icon name="icon_info_outlined"><icon_info_outlined class="svg-icon"/></Icon>
              </el-icon>
            </span>
                    </el-tooltip>
                </label>

                <el-form-item :class="'form-item-' + themes" class="form-item">
                    <el-checkbox
                        v-model="state.axisForm.axisValue.auto"
                        :effect="props.themes"
                        size="small"
                        @change="changeAxisStyle('axisValue.auto')"
                    >
                        {{ t('chart.axis_auto') }}
                    </el-checkbox>
                </el-form-item>
            </div>

            <template v-if="showProperty('axisValue') && !state.axisForm.axisValue.auto">
                <el-row :gutter="8">
                    <el-col :span="12">
                        <el-form-item
                            :class="'form-item-' + themes"
                            :label="t('chart.axis_value_max')"
                            class="form-item"
                        >
                            <el-input-number
                                v-model.number="state.axisForm.axisValue.max"
                                :effect="props.themes"
                                controls-position="right"
                                @change="changeAxisStyle('axisValue.max')"
                            />
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item
                            :class="'form-item-' + themes"
                            :label="t('chart.axis_value_min')"
                            class="form-item"
                        >
                            <el-input-number
                                v-model.number="state.axisForm.axisValue.min"
                                :effect="props.themes"
                                controls-position="right"
                                @change="changeAxisStyle('axisValue.min')"
                            />
                        </el-form-item>
                    </el-col>
                </el-row>

                <label :class="'custom-form-item-label--' + themes" class="custom-form-item-label">
                    {{ t('chart.axis_value_split_count') }}
                    <el-tooltip :effect="toolTip" class="item" placement="top">
                        <template #content>{{ t('chart.number_of_scales_tip') }}</template>
                        <span style="vertical-align: middle">
              <el-icon style="cursor: pointer">
                <Icon name="icon_info_outlined"><icon_info_outlined class="svg-icon"/></Icon>
              </el-icon>
            </span>
                    </el-tooltip>
                </label>

                <el-form-item :class="'form-item-' + themes" class="form-item">
                    <el-input-number
                        v-model.number="state.axisForm.axisValue.splitCount"
                        :effect="props.themes"
                        controls-position="right"
                        style="width: 100%"
                        @change="changeAxisStyle('axisValue.splitCount')"
                    />
                </el-form-item>
            </template>
        </template>
        <el-divider :class="'m-divider--' + themes" class="m-divider"/>
        <el-form-item v-if="showProperty('axisLine')" :class="'form-item-' + themes" class="form-item">
            <el-checkbox
                v-model="state.axisForm.axisLine.show"
                :effect="props.themes"
                size="small"
                @change="changeAxisStyle('axisLine.show')"
            >
                {{ t('chart.axis_show') }}
            </el-checkbox>
        </el-form-item>
        <div v-if="showProperty('axisLine')" style="padding-left: 22px">
            <div style="flex: 1; display: flex">
                <el-form-item :class="'form-item-' + themes" class="form-item" style="padding-right: 4px">
                    <el-color-picker
                        v-model="state.axisForm.axisLine.lineStyle.color"
                        :disabled="!state.axisForm.axisLine.show"
                        :effect="themes"
                        :predefine="predefineColors"
                        is-custom
                        @change="changeAxisStyle('axisLine.lineStyle.color')"
                    />
                </el-form-item>
                <el-form-item :class="'form-item-' + themes" class="form-item" style="padding: 0 4px">
                    <el-select
                        v-model="state.axisForm.axisLine.lineStyle.style"
                        :disabled="!state.axisForm.axisLine.show"
                        :effect="props.themes"
                        style="width: 62px"
                        @change="changeAxisStyle('axisLine.lineStyle.style')"
                    >
                        <el-option
                            v-for="option in splitLineStyle"
                            :key="option.value"
                            :label="option.label"
                            :value="option.value"
                        ></el-option>
                    </el-select>
                </el-form-item>
                <el-form-item :class="'form-item-' + themes" class="form-item" style="padding-left: 4px">
                    <el-input-number
                        v-model="state.axisForm.axisLine.lineStyle.width"
                        :disabled="!state.axisForm.axisLine.show"
                        :effect="props.themes"
                        :max="10"
                        :min="1"
                        controls-position="right"
                        size="small"
                        style="width: 70px"
                        @change="changeAxisStyle('axisLine.lineStyle.width')"
                    />
                </el-form-item>
            </div>
        </div>
        <el-form-item
            v-if="showProperty('splitLine')"
            :class="{
        'form-item-dark': themes === 'dark'
      }"
            class="form-item form-item-checkbox"
        >
            <el-checkbox
                v-model="state.axisForm.splitLine.show"
                :effect="props.themes"
                size="small"
                @change="changeAxisStyle('splitLine.show')"
            >
                {{ t('chart.grid_show') }}
            </el-checkbox>
        </el-form-item>
        <div v-if="showProperty('splitLine')" style="padding-left: 22px">
            <div style="flex: 1; display: flex">
                <el-form-item :class="'form-item-' + themes" class="form-item" style="padding-right: 4px">
                    <el-color-picker
                        v-model="state.axisForm.splitLine.lineStyle.color"
                        :disabled="!state.axisForm.splitLine.show"
                        :effect="themes"
                        :predefine="predefineColors"
                        is-custom
                        @change="changeAxisStyle('splitLine.lineStyle.color')"
                    />
                </el-form-item>
                <el-form-item :class="'form-item-' + themes" class="form-item" style="padding: 0 4px">
                    <el-select
                        v-model="state.axisForm.splitLine.lineStyle.style"
                        :disabled="!state.axisForm.splitLine.show"
                        :effect="props.themes"
                        style="width: 62px"
                        @change="changeAxisStyle('splitLine.lineStyle.style')"
                    >
                        <el-option
                            v-for="option in splitLineStyle"
                            :key="option.value"
                            :label="option.label"
                            :value="option.value"
                        ></el-option>
                    </el-select>
                </el-form-item>
                <el-form-item :class="'form-item-' + themes" class="form-item" style="padding-left: 4px">
                    <el-input-number
                        v-model="state.axisForm.splitLine.lineStyle.width"
                        :disabled="!state.axisForm.splitLine.show"
                        :effect="props.themes"
                        :max="10"
                        :min="1"
                        controls-position="right"
                        size="small"
                        style="width: 70px"
                        @change="changeAxisStyle('splitLine.lineStyle.width')"
                    />
                </el-form-item>
            </div>
        </div>
        <el-divider :class="'m-divider--' + themes" class="m-divider"/>
        <el-form-item
            v-if="showProperty('axisLabel')"
            :class="{
        'form-item-dark': themes === 'dark'
      }"
            class="form-item form-item-checkbox"
        >
            <el-checkbox
                v-model="state.axisForm.axisLabel.show"
                :effect="props.themes"
                size="small"
                @change="changeAxisStyle('axisLabel.show')"
            >
                {{ t('chart.axis_label_show') }}
            </el-checkbox>
        </el-form-item>

        <div v-if="showProperty('axisLabel')" style="padding-left: 22px">
            <div style="display: flex">
                <el-form-item
                    :class="'form-item-' + themes"
                    :label="t('chart.text')"
                    class="form-item"
                    style="padding-right: 4px"
                >
                    <el-color-picker
                        v-model="state.axisForm.axisLabel.color"
                        :disabled="!state.axisForm.axisLabel.show"
                        :effect="themes"
                        :predefine="predefineColors"
                        is-custom
                        @change="changeAxisStyle('axisLabel.color')"
                    />
                </el-form-item>
                <el-form-item :class="'form-item-' + themes" class="form-item" style="padding-left: 4px">
                    <template #label>&nbsp;</template>
                    <el-tooltip :content="t('chart.font_size')" :effect="toolTip" placement="top">
                        <el-select
                            v-model="state.axisForm.axisLabel.fontSize"
                            :disabled="!state.axisForm.axisLabel.show"
                            :effect="props.themes"
                            :placeholder="t('chart.axis_label_fontsize')"
                            style="width: 108px"
                            @change="changeAxisStyle('axisLabel.fontSize')"
                        >
                            <el-option
                                v-for="option in fontSizeList"
                                :key="option.value"
                                :label="option.name"
                                :value="option.value"
                            />
                        </el-select>
                    </el-tooltip>
                </el-form-item>
            </div>

            <el-form-item :class="'form-item-' + themes" :label="t('chart.rotate')" class="form-item">
                <el-input-number
                    v-model="state.axisForm.axisLabel.rotate"
                    :disabled="!state.axisForm.axisLabel.show"
                    :effect="props.themes"
                    :max="90"
                    :min="-90"
                    controls-position="right"
                    size="small"
                    style="width: 100%"
                    @change="changeAxisStyle('axisLabel.rotate')"
                />
            </el-form-item>

            <el-form-item
                v-if="isBidirectionalBar"
                :class="'form-item-' + themes"
                :label="t('chart.length_limit')"
                class="form-item"
            >
                <el-input-number
                    v-model="state.axisForm.axisLabel.lengthLimit"
                    :disabled="!state.axisForm.axisLabel.show"
                    :effect="props.themes"
                    :min="1"
                    controls-position="right"
                    size="small"
                    style="width: 100%"
                    @change="changeAxisStyle('axisLabel.lengthLimit')"
                />
            </el-form-item>
            <template v-if="showProperty('axisLabelFormatter') && !isBarRangeTime">
                <el-form-item
                    :class="'form-item-' + themes"
                    :label="t('chart.value_formatter_type')"
                    class="form-item"
                >
                    <el-select
                        v-model="state.axisForm.axisLabelFormatter.type"
                        :disabled="!state.axisForm.axisLabel.show"
                        :effect="props.themes"
                        style="width: 100%"
                        @change="changeAxisStyle('axisLabelFormatter.type')"
                    >
                        <el-option
                            v-for="type in typeList"
                            :key="type.value"
                            :label="t('chart.' + type.name)"
                            :value="type.value"
                        />
                    </el-select>
                </el-form-item>
                <el-form-item
                    v-if="state.axisForm.axisLabelFormatter.type !== 'auto'"
                    :class="'form-item-' + themes"
                    :label="t('chart.value_formatter_decimal_count')"
                    class="form-item"
                >
                    <el-input-number
                        v-model="state.axisForm.axisLabelFormatter.decimalCount"
                        :disabled="!state.axisForm.axisLabel.show"
                        :effect="props.themes"
                        :max="10"
                        :min="0"
                        :precision="0"
                        controls-position="right"
                        size="small"
                        style="width: 100%"
                        @change="changeAxisStyle('axisLabelFormatter.decimalCount')"
                    />
                </el-form-item>

                <template
                    v-if="
            state.axisForm.axisLabel.show && state.axisForm.axisLabelFormatter.type !== 'percent'
          "
                >
                    <el-row :gutter="8">
                        <el-col v-if="!isEnLocal" :span="12">
                            <el-form-item
                                :class="'form-item-' + themes"
                                :label="t('chart.value_formatter_unit_language')"
                                class="form-item"
                            >
                                <el-select
                                    v-model="state.axisForm.axisLabelFormatter.unitLanguage"
                                    :effect="themes"
                                    :placeholder="t('chart.pls_select_field')"
                                    size="small"
                                    @change="
                    v =>
                      changeUnitLanguage(state.axisForm.axisLabelFormatter, v, 'axisLabelFormatter')
                  "
                                >
                                    <el-option :label="t('chart.value_formatter_unit_language_ch')" value="ch"/>
                                    <el-option :label="t('chart.value_formatter_unit_language_en')" value="en"/>
                                </el-select>
                            </el-form-item>
                        </el-col>
                        <el-col :span="isEnLocal ? 24 : 12">
                            <el-form-item
                                :class="'form-item-' + themes"
                                :label="t('chart.value_formatter_unit')"
                                class="form-item"
                            >
                                <el-select
                                    v-model="state.axisForm.axisLabelFormatter.unit"
                                    :effect="props.themes"
                                    :placeholder="t('chart.pls_select_field')"
                                    size="small"
                                    @change="changeAxisStyle('axisLabelFormatter')"
                                >
                                    <el-option
                                        v-for="item in getUnitTypeList(state.axisForm.axisLabelFormatter.unitLanguage)"
                                        :key="item.value"
                                        :label="item.name"
                                        :value="item.value"
                                    />
                                </el-select>
                            </el-form-item>
                        </el-col>
                    </el-row>
                    <el-row :gutter="8">
                        <el-col :span="24">
                            <el-form-item
                                :class="'form-item-' + themes"
                                :label="t('chart.value_formatter_suffix')"
                                class="form-item"
                            >
                                <el-input
                                    v-model="state.axisForm.axisLabelFormatter.suffix"
                                    :disabled="!state.axisForm.axisLabel.show"
                                    :effect="props.themes"
                                    :placeholder="t('commons.input_content')"
                                    clearable
                                    size="small"
                                    @change="changeAxisStyle('axisLabelFormatter.suffix')"
                                />
                            </el-form-item>
                        </el-col>
                    </el-row>
                </template>

                <el-form-item :class="'form-item-' + themes" class="form-item">
                    <el-checkbox
                        v-model="state.axisForm.axisLabelFormatter.thousandSeparator"
                        :disabled="!state.axisForm.axisLabel.show"
                        :effect="props.themes"
                        :label="t('chart.value_formatter_thousand_separator')"
                        size="small"
                        @change="changeAxisStyle('axisLabelFormatter.thousandSeparator')"
                    />
                </el-form-item>
            </template>
        </div>
    </el-form>
</template>

<style lang="less" scoped>
.custom-form-item-label {
    margin-bottom: 4px;
    line-height: 20px;
    color: #646a73;
    font-size: 12px;
    font-style: normal;
    font-weight: 400;
    padding: 2px 12px 0 0;

    &.custom-form-item-label--dark {
        color: #a6a6a6;
    }
}

.form-item-checkbox {
    margin-bottom: 10px !important;
}

.m-divider {
    border-color: rgba(31, 35, 41, 0.15);
    margin: 0 0 16px;

    &.m-divider--dark {
        border-color: rgba(235, 235, 235, 0.15);
    }
}
</style>
