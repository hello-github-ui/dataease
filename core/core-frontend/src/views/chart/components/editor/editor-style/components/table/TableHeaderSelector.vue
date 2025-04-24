<script lang="ts" setup>
import icon_bold_outlined from '@/assets/svg/icon_bold_outlined.svg'
import icon_italic_outlined from '@/assets/svg/icon_italic_outlined.svg'
import icon_leftAlignment_outlined from '@/assets/svg/icon_left-alignment_outlined.svg'
import icon_centerAlignment_outlined from '@/assets/svg/icon_center-alignment_outlined.svg'
import icon_rightAlignment_outlined from '@/assets/svg/icon_right-alignment_outlined.svg'
import icon_edit_outlined from '@/assets/svg/icon_edit_outlined.svg'
import {computed, onMounted, PropType, reactive, watch} from 'vue'
import {useI18n} from '@/hooks/web/useI18n'
import {COLOR_PANEL, DEFAULT_TABLE_HEADER} from '@/views/chart/components/editor/util/chart'
import {ElDivider, ElSpace} from 'element-plus-secondary'
import {cloneDeep, defaultsDeep, isEqual} from 'lodash-es'
import {convertToAlphaColor, isAlphaColor} from '@/views/chart/components/js/util'
import {dvMainStoreWithOut} from '@/store/modules/data-visualization/dvMain'
import {storeToRefs} from 'pinia'
import TableHeaderGroupConfig from './TableHeaderGroupConfig.vue'
import {getLeafNodes} from '@/views/chart/components/js/panel/common/common_table'

const dvMainStore = dvMainStoreWithOut()
const {batchOptStatus, mobileInPc} = storeToRefs(dvMainStore)
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

watch(
    () => props.chart.customAttr.tableHeader,
    () => {
        init()
    },
    {deep: true}
)

const predefineColors = COLOR_PANEL

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

const state = reactive({
    tableHeaderForm: {} as ChartTableHeaderAttr,
    showTableHeaderGroupConfig: false
})

const emit = defineEmits(['onTableHeaderChange'])

const changeTableHeader = prop => {
    emit('onTableHeaderChange', state.tableHeaderForm, prop)
}

const changeHeaderGroupConfig = (headerGroupConfig: ChartTableHeaderAttr['headerGroupConfig']) => {
    state.tableHeaderForm.headerGroupConfig = headerGroupConfig
    state.showTableHeaderGroupConfig = false
    changeTableHeader('headerGroupConfig')
}

const enableGroupConfig = computed(() => {
    return (
        !batchOptStatus.value &&
        showProperty('headerGroup') &&
        state.tableHeaderForm.headerGroup &&
        state.tableHeaderForm.showTableHeader !== false
    )
})

const groupConfigValid = computed(() => {
    const columns = props.chart?.customAttr?.tableHeader?.headerGroupConfig?.columns
    if (!columns?.length) {
        return false
    }
    const noGroup = columns.every(item => !item.children?.length)
    if (noGroup) {
        return false
    }
    const xAxis = props.chart.xAxis
    const showColumns = []
    xAxis?.forEach(axis => {
        axis.hide !== true && showColumns.push({key: axis.dataeaseName})
    })
    if (!showColumns.length) {
        return false
    }
    const allAxis = showColumns.map(item => item.key)
    const leafNodes = getLeafNodes(columns as Array<ColumnNode>)
    const leafKeys = leafNodes.map(item => item.key)
    return isEqual(allAxis, leafKeys)
})
const init = () => {
    const tableHeader = props.chart?.customAttr?.tableHeader
    if (tableHeader) {
        // 存量透视表处理
        if (!tableHeader.tableHeaderColBgColor) {
            tableHeader.tableHeaderColBgColor = tableHeader.tableHeaderBgColor
            tableHeader.tableHeaderColFontColor = tableHeader.tableHeaderFontColor
            tableHeader.tableTitleColFontSize = tableHeader.tableTitleFontSize
            tableHeader.tableHeaderColAlign = tableHeader.tableHeaderAlign
            tableHeader.isColBolder = tableHeader.isBolder
            tableHeader.isColItalic = tableHeader.isItalic

            tableHeader.tableHeaderCornerBgColor = tableHeader.tableHeaderBgColor
            tableHeader.tableHeaderCornerFontColor = tableHeader.tableHeaderFontColor
            tableHeader.tableTitleCornerFontSize = tableHeader.tableTitleFontSize
            tableHeader.tableHeaderCornerAlign = tableHeader.tableHeaderAlign
            tableHeader.isCornerBolder = tableHeader.isBolder
            tableHeader.isCornerItalic = tableHeader.isItalic
        }
        state.tableHeaderForm = defaultsDeep(cloneDeep(tableHeader), cloneDeep(DEFAULT_TABLE_HEADER))
        if (!isAlphaColor(state.tableHeaderForm.tableHeaderBgColor)) {
            const alpha = props.chart.customAttr.basicStyle.alpha
            state.tableHeaderForm.tableHeaderBgColor = convertToAlphaColor(
                state.tableHeaderForm.tableHeaderBgColor,
                alpha
            )
        }
    }
}
const showProperty = prop => props.propertyInner?.includes(prop)

onMounted(() => {
    init()
})
</script>

<template>
    <el-form
        ref="tableHeaderForm"
        :disabled="!state.tableHeaderForm.showTableHeader"
        :model="state.tableHeaderForm"
        label-position="top"
    >
        <el-form-item
            v-if="showProperty('tableHeaderBgColor')"
            :class="'form-item-' + themes"
            :label="
        chart.type === 'table-pivot' ? t('chart.rowBackgroundColor') : t('chart.backgroundColor')
      "
            class="form-item"
        >
            <el-color-picker
                v-model="state.tableHeaderForm.tableHeaderBgColor"
                :effect="themes"
                :predefine="predefineColors"
                :trigger-width="108"
                is-custom
                show-alpha
                @change="changeTableHeader('tableHeaderBgColor')"
            />
        </el-form-item>

        <el-space>
            <el-form-item
                v-if="showProperty('tableHeaderFontColor')"
                :class="'form-item-' + themes"
                :label="t('chart.text')"
                class="form-item"
            >
                <el-color-picker
                    v-model="state.tableHeaderForm.tableHeaderFontColor"
                    :effect="themes"
                    :predefine="predefineColors"
                    is-custom
                    @change="changeTableHeader('tableHeaderFontColor')"
                />
            </el-form-item>
            <el-form-item
                v-if="showProperty('tableTitleFontSize')"
                :class="'form-item-' + themes"
                class="form-item"
            >
                <template #label>&nbsp;</template>
                <el-select
                    v-model="state.tableHeaderForm.tableTitleFontSize"
                    :effect="themes"
                    style="width: 58px"
                    @change="changeTableHeader('tableTitleFontSize')"
                >
                    <el-option
                        v-for="option in fontSizeList"
                        :key="option.value"
                        :label="option.name"
                        :value="option.value"
                    />
                </el-select>
            </el-form-item>
        </el-space>
        <el-space :class="{ 'mobile-style': mobileInPc }">
            <el-form-item :class="'form-item-' + themes" class="form-item">
                <el-checkbox
                    v-model="state.tableHeaderForm.isBolder"
                    :effect="themes"
                    class="icon-checkbox"
                    @change="changeTableHeader('isBolder')"
                >
                    <el-tooltip effect="dark" placement="top">
                        <template #content>
                            {{ t('chart.bolder') }}
                        </template>
                        <div
                            :class="{ dark: themes === 'dark', active: state.tableHeaderForm.isBolder }"
                            class="icon-btn"
                        >
                            <el-icon>
                                <Icon name="icon_bold_outlined">
                                    <icon_bold_outlined class="svg-icon"/>
                                </Icon>
                            </el-icon>
                        </div>
                    </el-tooltip>
                </el-checkbox>
            </el-form-item>

            <el-form-item :class="'form-item-' + themes" class="form-item">
                <el-checkbox
                    v-model="state.tableHeaderForm.isItalic"
                    :effect="themes"
                    class="icon-checkbox"
                    @change="changeTableHeader('isItalic')"
                >
                    <el-tooltip effect="dark" placement="top">
                        <template #content>
                            {{ t('chart.italic') }}
                        </template>
                        <div
                            :class="{ dark: themes === 'dark', active: state.tableHeaderForm.isItalic }"
                            class="icon-btn"
                        >
                            <el-icon>
                                <Icon name="icon_italic_outlined">
                                    <icon_italic_outlined class="svg-icon"/>
                                </Icon>
                            </el-icon>
                        </div>
                    </el-tooltip>
                </el-checkbox>
            </el-form-item>

            <div :class="'position-divider--' + themes" class="position-divider"></div>
            <el-form-item
                v-if="showProperty('tableHeaderAlign')"
                :class="'form-item-' + themes"
                class="form-item"
            >
                <el-radio-group
                    v-model="state.tableHeaderForm.tableHeaderAlign"
                    class="icon-radio-group"
                    @change="changeTableHeader('tableHeaderAlign')"
                >
                    <el-radio label="left">
                        <el-tooltip effect="dark" placement="top">
                            <template #content>
                                {{ t('chart.text_pos_left') }}
                            </template>
                            <div
                                :class="{
                  dark: themes === 'dark',
                  active: state.tableHeaderForm.tableHeaderAlign === 'left'
                }"
                                class="icon-btn"
                            >
                                <el-icon>
                                    <Icon name="icon_left-alignment_outlined"
                                    >
                                        <icon_leftAlignment_outlined class="svg-icon"
                                        />
                                    </Icon>
                                </el-icon>
                            </div>
                        </el-tooltip>
                    </el-radio>
                    <el-radio label="center">
                        <el-tooltip effect="dark" placement="top">
                            <template #content>
                                {{ t('chart.text_pos_center') }}
                            </template>
                            <div
                                :class="{
                  dark: themes === 'dark',
                  active: state.tableHeaderForm.tableHeaderAlign === 'center'
                }"
                                class="icon-btn"
                            >
                                <el-icon>
                                    <Icon name="icon_center-alignment_outlined"
                                    >
                                        <icon_centerAlignment_outlined class="svg-icon"
                                        />
                                    </Icon>
                                </el-icon>
                            </div>
                        </el-tooltip>
                    </el-radio>
                    <el-radio label="right">
                        <el-tooltip effect="dark" placement="top">
                            <template #content>
                                {{ t('chart.text_pos_right') }}
                            </template>
                            <div
                                :class="{
                  dark: themes === 'dark',
                  active: state.tableHeaderForm.tableHeaderAlign === 'right'
                }"
                                class="icon-btn"
                            >
                                <el-icon>
                                    <Icon name="icon_right-alignment_outlined"
                                    >
                                        <icon_rightAlignment_outlined class="svg-icon"
                                        />
                                    </Icon>
                                </el-icon>
                            </div>
                        </el-tooltip>
                    </el-radio>
                </el-radio-group>
            </el-form-item>
        </el-space>

        <template v-if="chart.type === 'table-pivot' && showProperty('tableHeaderBgColor')">
            <el-divider :class="{ 'divider-dark': themes === 'dark' }" class="m-divider"/>
            <el-form-item
                :class="'form-item-' + themes"
                :label="t('chart.colBackgroundColor')"
                class="form-item"
            >
                <el-color-picker
                    v-model="state.tableHeaderForm.tableHeaderColBgColor"
                    :effect="themes"
                    :predefine="predefineColors"
                    :trigger-width="108"
                    is-custom
                    show-alpha
                    @change="changeTableHeader('tableHeaderColBgColor')"
                />
            </el-form-item>
            <el-space>
                <el-form-item
                    v-if="showProperty('tableHeaderFontColor')"
                    :class="'form-item-' + themes"
                    :label="t('chart.text')"
                    class="form-item"
                >
                    <el-color-picker
                        v-model="state.tableHeaderForm.tableHeaderColFontColor"
                        :effect="themes"
                        :predefine="predefineColors"
                        is-custom
                        @change="changeTableHeader('tableHeaderColFontColor')"
                    />
                </el-form-item>
                <el-form-item
                    v-if="showProperty('tableTitleFontSize')"
                    :class="'form-item-' + themes"
                    class="form-item"
                >
                    <template #label>&nbsp;</template>
                    <el-select
                        v-model="state.tableHeaderForm.tableTitleColFontSize"
                        :effect="themes"
                        style="width: 58px"
                        @change="changeTableHeader('tableTitleColFontSize')"
                    >
                        <el-option
                            v-for="option in fontSizeList"
                            :key="option.value"
                            :label="option.name"
                            :value="option.value"
                        />
                    </el-select>
                </el-form-item>
            </el-space>
            <el-space :class="{ 'mobile-style': mobileInPc }">
                <el-form-item :class="'form-item-' + themes" class="form-item">
                    <el-checkbox
                        v-model="state.tableHeaderForm.isColBolder"
                        :effect="themes"
                        class="icon-checkbox"
                        @change="changeTableHeader('isColBolder')"
                    >
                        <el-tooltip effect="dark" placement="top">
                            <template #content>
                                {{ t('chart.bolder') }}
                            </template>
                            <div
                                :class="{ dark: themes === 'dark', active: state.tableHeaderForm.isColBolder }"
                                class="icon-btn"
                            >
                                <el-icon>
                                    <Icon name="icon_bold_outlined">
                                        <icon_bold_outlined class="svg-icon"/>
                                    </Icon>
                                </el-icon>
                            </div>
                        </el-tooltip>
                    </el-checkbox>
                </el-form-item>

                <el-form-item :class="'form-item-' + themes" class="form-item">
                    <el-checkbox
                        v-model="state.tableHeaderForm.isColItalic"
                        :effect="themes"
                        class="icon-checkbox"
                        @change="changeTableHeader('isColItalic')"
                    >
                        <el-tooltip effect="dark" placement="top">
                            <template #content>
                                {{ t('chart.italic') }}
                            </template>
                            <div
                                :class="{ dark: themes === 'dark', active: state.tableHeaderForm.isColItalic }"
                                class="icon-btn"
                            >
                                <el-icon>
                                    <Icon name="icon_italic_outlined">
                                        <icon_italic_outlined class="svg-icon"/>
                                    </Icon>
                                </el-icon>
                            </div>
                        </el-tooltip>
                    </el-checkbox>
                </el-form-item>

                <div :class="'position-divider--' + themes" class="position-divider"></div>
                <el-form-item
                    v-if="showProperty('tableHeaderAlign')"
                    :class="'form-item-' + themes"
                    class="form-item"
                >
                    <el-radio-group
                        v-model="state.tableHeaderForm.tableHeaderColAlign"
                        class="icon-radio-group"
                        @change="changeTableHeader('tableHeaderColAlign')"
                    >
                        <el-radio label="left">
                            <el-tooltip effect="dark" placement="top">
                                <template #content>
                                    {{ t('chart.text_pos_left') }}
                                </template>
                                <div
                                    :class="{
                    dark: themes === 'dark',
                    active: state.tableHeaderForm.tableHeaderColAlign === 'left'
                  }"
                                    class="icon-btn"
                                >
                                    <el-icon>
                                        <Icon name="icon_left-alignment_outlined"
                                        >
                                            <icon_leftAlignment_outlined class="svg-icon"
                                            />
                                        </Icon>
                                    </el-icon>
                                </div>
                            </el-tooltip>
                        </el-radio>
                        <el-radio label="center">
                            <el-tooltip effect="dark" placement="top">
                                <template #content>
                                    {{ t('chart.text_pos_center') }}
                                </template>
                                <div
                                    :class="{
                    dark: themes === 'dark',
                    active: state.tableHeaderForm.tableHeaderColAlign === 'center'
                  }"
                                    class="icon-btn"
                                >
                                    <el-icon>
                                        <Icon name="icon_center-alignment_outlined"
                                        >
                                            <icon_centerAlignment_outlined class="svg-icon"
                                            />
                                        </Icon>
                                    </el-icon>
                                </div>
                            </el-tooltip>
                        </el-radio>
                        <el-radio label="right">
                            <el-tooltip effect="dark" placement="top">
                                <template #content>
                                    {{ t('chart.text_pos_right') }}
                                </template>
                                <div
                                    :class="{
                    dark: themes === 'dark',
                    active: state.tableHeaderForm.tableHeaderColAlign === 'right'
                  }"
                                    class="icon-btn"
                                >
                                    <el-icon>
                                        <Icon name="icon_right-alignment_outlined"
                                        >
                                            <icon_rightAlignment_outlined class="svg-icon"
                                            />
                                        </Icon>
                                    </el-icon>
                                </div>
                            </el-tooltip>
                        </el-radio>
                    </el-radio-group>
                </el-form-item>
            </el-space>

            <el-divider :class="{ 'divider-dark': themes === 'dark' }" class="m-divider"/>
            <el-form-item
                :class="'form-item-' + themes"
                :label="t('chart.cornerBackgroundColor')"
                class="form-item"
            >
                <el-color-picker
                    v-model="state.tableHeaderForm.tableHeaderCornerBgColor"
                    :effect="themes"
                    :predefine="predefineColors"
                    :trigger-width="108"
                    is-custom
                    show-alpha
                    @change="changeTableHeader('tableHeaderCornerBgColor')"
                />
            </el-form-item>
            <el-space>
                <el-form-item
                    v-if="showProperty('tableHeaderFontColor')"
                    :class="'form-item-' + themes"
                    :label="t('chart.text')"
                    class="form-item"
                >
                    <el-color-picker
                        v-model="state.tableHeaderForm.tableHeaderCornerFontColor"
                        :effect="themes"
                        :predefine="predefineColors"
                        is-custom
                        @change="changeTableHeader('tableHeaderCornerFontColor')"
                    />
                </el-form-item>
                <el-form-item
                    v-if="showProperty('tableTitleFontSize')"
                    :class="'form-item-' + themes"
                    class="form-item"
                >
                    <template #label>&nbsp;</template>
                    <el-select
                        v-model="state.tableHeaderForm.tableTitleCornerFontSize"
                        :effect="themes"
                        style="width: 58px"
                        @change="changeTableHeader('tableTitleCornerFontSize')"
                    >
                        <el-option
                            v-for="option in fontSizeList"
                            :key="option.value"
                            :label="option.name"
                            :value="option.value"
                        />
                    </el-select>
                </el-form-item>
            </el-space>
            <el-space :class="{ 'mobile-style': mobileInPc }">
                <el-form-item :class="'form-item-' + themes" class="form-item">
                    <el-checkbox
                        v-model="state.tableHeaderForm.isCornerBolder"
                        :effect="themes"
                        class="icon-checkbox"
                        @change="changeTableHeader('isCornerBolder')"
                    >
                        <el-tooltip effect="dark" placement="top">
                            <template #content>
                                {{ t('chart.bolder') }}
                            </template>
                            <div
                                :class="{ dark: themes === 'dark', active: state.tableHeaderForm.isCornerBolder }"
                                class="icon-btn"
                            >
                                <el-icon>
                                    <Icon name="icon_bold_outlined">
                                        <icon_bold_outlined class="svg-icon"/>
                                    </Icon>
                                </el-icon>
                            </div>
                        </el-tooltip>
                    </el-checkbox>
                </el-form-item>

                <el-form-item :class="'form-item-' + themes" class="form-item">
                    <el-checkbox
                        v-model="state.tableHeaderForm.isCornerItalic"
                        :effect="themes"
                        class="icon-checkbox"
                        @change="changeTableHeader('isCornerItalic')"
                    >
                        <el-tooltip effect="dark" placement="top">
                            <template #content>
                                {{ t('chart.italic') }}
                            </template>
                            <div
                                :class="{ dark: themes === 'dark', active: state.tableHeaderForm.isCornerItalic }"
                                class="icon-btn"
                            >
                                <el-icon>
                                    <Icon name="icon_italic_outlined">
                                        <icon_italic_outlined class="svg-icon"/>
                                    </Icon>
                                </el-icon>
                            </div>
                        </el-tooltip>
                    </el-checkbox>
                </el-form-item>

                <div :class="'position-divider--' + themes" class="position-divider"></div>
                <el-form-item
                    v-if="showProperty('tableHeaderAlign')"
                    :class="'form-item-' + themes"
                    class="form-item"
                >
                    <el-radio-group
                        v-model="state.tableHeaderForm.tableHeaderCornerAlign"
                        class="icon-radio-group"
                        @change="changeTableHeader('tableHeaderCornerAlign')"
                    >
                        <el-radio label="left">
                            <el-tooltip effect="dark" placement="top">
                                <template #content>
                                    {{ t('chart.text_pos_left') }}
                                </template>
                                <div
                                    :class="{
                    dark: themes === 'dark',
                    active: state.tableHeaderForm.tableHeaderCornerAlign === 'left'
                  }"
                                    class="icon-btn"
                                >
                                    <el-icon>
                                        <Icon name="icon_left-alignment_outlined"
                                        >
                                            <icon_leftAlignment_outlined class="svg-icon"
                                            />
                                        </Icon>
                                    </el-icon>
                                </div>
                            </el-tooltip>
                        </el-radio>
                        <el-radio label="center">
                            <el-tooltip effect="dark" placement="top">
                                <template #content>
                                    {{ t('chart.text_pos_center') }}
                                </template>
                                <div
                                    :class="{
                    dark: themes === 'dark',
                    active: state.tableHeaderForm.tableHeaderCornerAlign === 'center'
                  }"
                                    class="icon-btn"
                                >
                                    <el-icon>
                                        <Icon name="icon_center-alignment_outlined"
                                        >
                                            <icon_centerAlignment_outlined class="svg-icon"
                                            />
                                        </Icon>
                                    </el-icon>
                                </div>
                            </el-tooltip>
                        </el-radio>
                        <el-radio label="right">
                            <el-tooltip effect="dark" placement="top">
                                <template #content>
                                    {{ t('chart.text_pos_right') }}
                                </template>
                                <div
                                    :class="{
                    dark: themes === 'dark',
                    active: state.tableHeaderForm.tableHeaderCornerAlign === 'right'
                  }"
                                    class="icon-btn"
                                >
                                    <el-icon>
                                        <Icon name="icon_right-alignment_outlined"
                                        >
                                            <icon_rightAlignment_outlined class="svg-icon"
                                            />
                                        </Icon>
                                    </el-icon>
                                </div>
                            </el-tooltip>
                        </el-radio>
                    </el-radio-group>
                </el-form-item>
            </el-space>

            <el-divider :class="{ 'divider-dark': themes === 'dark' }" class="m-divider"/>
        </template>

        <el-row :gutter="8">
            <el-col :span="12">
                <el-form-item
                    v-if="showProperty('tableTitleHeight')"
                    :class="'form-item-' + themes"
                    :label="t('visualization.lineHeight')"
                    class="form-item"
                >
                    <el-input-number
                        v-model="state.tableHeaderForm.tableTitleHeight"
                        :effect="themes"
                        :max="1000"
                        :min="20"
                        controls-position="right"
                        @change="changeTableHeader('tableTitleHeight')"
                    />
                </el-form-item>
            </el-col>
        </el-row>

        <el-form-item v-if="showProperty('showIndex')" :class="'form-item-' + themes" class="form-item">
            <el-checkbox
                v-model="state.tableHeaderForm.showIndex"
                :effect="themes"
                size="small"
                @change="changeTableHeader('showIndex')"
            >
                {{ t('chart.table_show_index') }}
            </el-checkbox>
        </el-form-item>
        <el-form-item
            v-if="showProperty('showIndex') && state.tableHeaderForm.showIndex"
            :class="'form-item-' + themes"
            :label="t('chart.table_index_desc')"
            class="form-item"
        >
            <el-input
                v-model="state.tableHeaderForm.indexLabel"
                :effect="themes"
                @blur="changeTableHeader('indexLabel')"
            />
        </el-form-item>
        <el-form-item
            v-if="showProperty('tableHeaderSort')"
            :class="'form-item-' + themes"
            class="form-item"
        >
            <el-checkbox
                v-model="state.tableHeaderForm.tableHeaderSort"
                :effect="themes"
                size="small"
                @change="changeTableHeader('tableHeaderSort')"
            >
                {{ t('chart.table_header_sort') }}
            </el-checkbox>
        </el-form-item>
        <el-form-item
            v-if="showProperty('showHorizonBorder')"
            :class="'form-item-' + themes"
            class="form-item"
        >
            <el-checkbox
                v-model="state.tableHeaderForm.showHorizonBorder"
                :effect="themes"
                size="small"
                @change="changeTableHeader('showHorizonBorder')"
            >
                {{ t('chart.table_header_show_horizon_border') }}
            </el-checkbox>
        </el-form-item>
        <el-form-item
            v-if="showProperty('showVerticalBorder')"
            :class="'form-item-' + themes"
            class="form-item"
        >
            <el-checkbox
                v-model="state.tableHeaderForm.showVerticalBorder"
                :effect="themes"
                size="small"
                @change="changeTableHeader('showVerticalBorder')"
            >
                {{ t('chart.table_header_show_vertical_border') }}
            </el-checkbox>
        </el-form-item>
        <el-form-item
            v-if="!batchOptStatus && showProperty('headerGroup')"
            :class="'form-item-' + themes"
            :disabled="!state.tableHeaderForm.showTableHeader"
            class="form-item"
        >
            <el-checkbox
                v-model="state.tableHeaderForm.headerGroup"
                :effect="themes"
                size="small"
                @change="changeTableHeader('headerGroup')"
            >
                {{ t('chart.table_header_group') }}
            </el-checkbox>
        </el-form-item>
        <el-form-item v-if="enableGroupConfig" :class="'form-item-' + themes" class="form-item">
            <div class="header-group-config">
                <span>{{ t('chart.table_header_group_config') }}</span>
                <div class="group-icon">
          <span v-if="groupConfigValid">
            {{ t('visualization.already_setting') }}
          </span>
                    <div
                        :class="{
              dark: themes === 'dark'
            }"
                        class="icon-btn"
                    >
                        <el-icon @click="state.showTableHeaderGroupConfig = true">
                            <Icon>
                                <icon_edit_outlined class="svg-icon"/>
                            </Icon>
                        </el-icon>
                    </div>
                </div>
            </div>
        </el-form-item>
    </el-form>
    <el-dialog
        v-model="state.showTableHeaderGroupConfig"
        :class="themes === 'dark' ? 'table-header-group-config-dialog' : ''"
        :effect="themes"
        :show-close="false"
        append-to-body
        destroy-on-close
    >
        <template #header>
            {{ t('chart.table_header_group_config') }}
            <span style="font-size: 12px">({{ t('chart.table_header_group_config_tip') }})</span>
        </template>
        <table-header-group-config
            :chart="chart"
            :tableHeaderForm="state.tableHeaderForm"
            :themes="themes"
            @onCancelConfig="() => (state.showTableHeaderGroupConfig = false)"
            @onConfigChange="changeHeaderGroupConfig"
        />
    </el-dialog>
</template>

<style lang="less" scoped>
.icon-btn {
    font-size: 16px;
    line-height: 16px;
    width: 24px;
    height: 24px;
    text-align: center;
    border-radius: 4px;
    padding-top: 4px;

    color: #1f2329;

    cursor: pointer;

    &.dark {
        color: #a6a6a6;

        &.active {
            color: var(--ed-color-primary);
            background-color: var(--ed-color-primary-1a, rgba(51, 112, 255, 0.1));
        }

        &:hover {
            background-color: rgba(255, 255, 255, 0.1);
        }
    }

    &.active {
        color: var(--ed-color-primary);
        background-color: var(--ed-color-primary-1a, rgba(51, 112, 255, 0.1));
    }

    &:hover {
        background-color: rgba(31, 35, 41, 0.1);
    }
}

.icon-radio-group {
    :deep(.ed-radio) {
        margin-right: 8px;

        &:last-child {
            margin-right: 0;
        }
    }

    :deep(.ed-radio__input) {
        display: none;
    }

    :deep(.ed-radio__label) {
        padding: 0;
    }
}

.position-divider {
    width: 1px;
    height: 18px;
    margin-bottom: 8px;
    background: rgba(31, 35, 41, 0.15);

    &.position-divider--dark {
        background: rgba(235, 235, 235, 0.15);
    }
}

.icon-checkbox {
    :deep(.ed-checkbox__input) {
        display: none;
    }

    :deep(.ed-checkbox__label) {
        padding: 0;
    }
}

.mobile-style {
    margin-top: 25px;
}

.m-divider {
    margin: 0 0 16px;
    border-color: rgba(31, 35, 41, 0.15);

    &.divider-dark {
        border-color: rgba(255, 255, 255, 0.15);
    }
}

.header-group-config {
    display: flex;
    width: 100%;
    justify-content: space-between;
    align-items: center;
    padding-left: 22px;
    font-size: 12px;

    .group-icon {
        display: flex;
        justify-content: center;
        flex-direction: row;
        align-items: center;
    }
}
</style>
<style lang="less">
.table-header-group-config-dialog {
    .ed-dialog__header,
    .ed-dialog__body {
        color: #a6a6a6;
        background-color: #1a1a1a;
        margin-right: 0;
    }
}
</style>
