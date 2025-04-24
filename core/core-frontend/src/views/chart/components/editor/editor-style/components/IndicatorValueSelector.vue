<script lang="ts" setup>
import icon_letterSpacing_outlined from '@/assets/svg/icon_letter-spacing_outlined.svg'
import icon_bold_outlined from '@/assets/svg/icon_bold_outlined.svg'
import icon_italic_outlined from '@/assets/svg/icon_italic_outlined.svg'
import icon_leftAlignment_outlined from '@/assets/svg/icon_left-alignment_outlined.svg'
import icon_centerAlignment_outlined from '@/assets/svg/icon_center-alignment_outlined.svg'
import icon_rightAlignment_outlined from '@/assets/svg/icon_right-alignment_outlined.svg'
import icon_topAlign_outlined from '@/assets/svg/icon_top-align_outlined.svg'
import icon_verticalAlign_outlined from '@/assets/svg/icon_vertical-align_outlined.svg'
import icon_bottomAlign_outlined from '@/assets/svg/icon_bottom-align_outlined.svg'
import {computed, nextTick, onMounted, PropType, reactive, watch} from 'vue'
import {useI18n} from '@/hooks/web/useI18n'
import {
    CHART_FONT_FAMILY_ORIGIN,
    CHART_FONT_LETTER_SPACE,
    COLOR_PANEL,
    DEFAULT_BASIC_STYLE,
    DEFAULT_INDICATOR_STYLE
} from '@/views/chart/components/editor/util/chart'
import {cloneDeep, defaultsDeep} from 'lodash-es'
import {ElIcon, ElInput} from 'element-plus-secondary'
import Icon from '@/components/icon-custom/src/Icon.vue'
import {storeToRefs} from 'pinia'
import {dvMainStoreWithOut} from '@/store/modules/data-visualization/dvMain'
import {useAppearanceStoreWithOut} from '@/store/modules/appearance'

const dvMainStore = dvMainStoreWithOut()
const {batchOptStatus} = storeToRefs(dvMainStore)
const appearanceStore = useAppearanceStoreWithOut()

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

const emit = defineEmits(['onIndicatorChange', 'onBasicStyleChange'])
const toolTip = computed(() => {
    return props.themes === 'dark' ? 'ndark' : 'dark'
})
const predefineColors = COLOR_PANEL
const fontFamily = CHART_FONT_FAMILY_ORIGIN.concat(
    appearanceStore.fontList.map(ele => ({
        name: ele.name,
        value: ele.name
    }))
)
const fontLetterSpace = CHART_FONT_LETTER_SPACE

const state = reactive({
    indicatorValueForm: JSON.parse(JSON.stringify(DEFAULT_INDICATOR_STYLE)),
    basicStyleForm: {} as ChartBasicStyle
})
const fontSizeList = computed(() => {
    const arr = []
    for (let i = 10; i <= 60; i = i + 2) {
        arr.push({
            name: i + '',
            value: i
        })
    }
    for (let i = 70; i <= 210; i += 10) {
        arr.push({
            name: i + '',
            value: i
        })
    }
    return arr
})

const changeLabelTitleStyleStyle = prop => {
    emit('onIndicatorChange', state.indicatorValueForm, prop)
}

const init = () => {
    const TEMP_DEFAULT_BASIC_STYLE = cloneDeep(DEFAULT_BASIC_STYLE)
    delete TEMP_DEFAULT_BASIC_STYLE.alpha

    state.basicStyleForm = defaultsDeep(
        cloneDeep(props.chart?.customAttr?.basicStyle),
        cloneDeep(TEMP_DEFAULT_BASIC_STYLE)
    )

    const customText = defaultsDeep(
        cloneDeep(props.chart?.customAttr?.indicator),
        cloneDeep(DEFAULT_INDICATOR_STYLE)
    )

    state.indicatorValueForm = cloneDeep(customText)

    //第一次颜色可能赋值失败，单独赋值一次
    nextTick(() => {
        state.indicatorValueForm.color = customText.color
        state.indicatorValueForm.suffixColor = customText.suffixColor
    })
}

onMounted(() => {
    init()
})

watch(
    () => props.chart?.customAttr?.indicator,
    () => {
        init()
    },
    {deep: true}
)

function getFormData() {
    return state.indicatorValueForm
}

defineExpose({getFormData})
</script>

<template>
    <div>
        <el-form
            ref="indicatorValueForm"
            :disabled="!state.indicatorValueForm.show"
            :model="state.indicatorValueForm"
            label-position="top"
        >
            <el-form-item
                :class="'form-item-' + themes"
                :effect="themes"
                :label="t('chart.text')"
                class="form-item"
            >
                <el-select
                    v-model="state.indicatorValueForm.fontFamily"
                    :effect="themes"
                    :placeholder="t('chart.font_family')"
                    @change="changeLabelTitleStyleStyle('fontFamily')"
                >
                    <el-option
                        v-for="option in fontFamily"
                        :key="option.value"
                        :label="option.name"
                        :value="option.value"
                    />
                </el-select>
            </el-form-item>

            <div style="display: flex">
                <el-form-item :class="'form-item-' + themes" class="form-item" style="padding-right: 4px">
                    <el-color-picker
                        v-model="state.indicatorValueForm.color"
                        :effect="themes"
                        :predefine="predefineColors"
                        class="color-picker-style"
                        is-custom
                        show-alpha
                        @change="changeLabelTitleStyleStyle('color')"
                    />
                </el-form-item>
                <el-form-item :class="'form-item-' + themes" class="form-item" style="padding: 0 4px">
                    <el-tooltip :content="t('chart.font_size')" :effect="toolTip" placement="top">
                        <el-select
                            v-model="state.indicatorValueForm.fontSize"
                            :effect="themes"
                            :placeholder="t('chart.text_fontsize')"
                            size="small"
                            style="width: 56px"
                            @change="changeLabelTitleStyleStyle('fontSize')"
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

                <el-form-item :class="'form-item-' + themes" class="form-item" style="padding-left: 4px">
                    <el-select
                        v-model="state.indicatorValueForm.letterSpace"
                        :effect="themes"
                        :placeholder="t('chart.quota_letter_space')"
                        @change="changeLabelTitleStyleStyle('letterSpace')"
                    >
                        <template #prefix>
                            <el-icon>
                                <Icon name="icon_letter-spacing_outlined"
                                >
                                    <icon_letterSpacing_outlined class="svg-icon"
                                    />
                                </Icon>
                            </el-icon>
                        </template>
                        <el-option
                            v-for="option in fontLetterSpace"
                            :key="option.value"
                            :label="option.name"
                            :value="option.value"
                        />
                    </el-select>
                </el-form-item>
            </div>

            <el-space>
                <el-form-item :class="'form-item-' + themes" class="form-item">
                    <el-checkbox
                        v-model="state.indicatorValueForm.isBolder"
                        :effect="themes"
                        class="icon-checkbox"
                        @change="changeLabelTitleStyleStyle('isBolder')"
                    >
                        <el-tooltip :effect="toolTip" placement="top">
                            <template #content>
                                {{ t('chart.bolder') }}
                            </template>
                            <div
                                :class="{ dark: themes === 'dark', active: state.indicatorValueForm.isBolder }"
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
                        v-model="state.indicatorValueForm.isItalic"
                        :effect="themes"
                        class="icon-checkbox"
                        @change="changeLabelTitleStyleStyle('isItalic')"
                    >
                        <el-tooltip :effect="toolTip" placement="top">
                            <template #content>
                                {{ t('chart.italic') }}
                            </template>
                            <div
                                :class="{ dark: themes === 'dark', active: state.indicatorValueForm.isItalic }"
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

                <el-form-item :class="'form-item-' + themes" class="form-item">
                    <el-radio-group
                        v-model="state.indicatorValueForm.hPosition"
                        :effect="themes"
                        class="icon-radio-group"
                        @change="changeLabelTitleStyleStyle('hPosition')"
                    >
                        <el-radio :effect="themes" label="left">
                            <el-tooltip :effect="toolTip" placement="top">
                                <template #content>
                                    {{ t('chart.text_pos_left') }}
                                </template>
                                <div
                                    :class="{
                    dark: themes === 'dark',
                    active: state.indicatorValueForm.hPosition === 'left'
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
                        <el-radio :effect="themes" label="center">
                            <el-tooltip :effect="toolTip" placement="top">
                                <template #content>
                                    {{ t('chart.text_pos_center') }}
                                </template>
                                <div
                                    :class="{
                    dark: themes === 'dark',
                    active: state.indicatorValueForm.hPosition === 'center'
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
                        <el-radio :effect="themes" label="right">
                            <el-tooltip :effect="toolTip" placement="top">
                                <template #content>
                                    {{ t('chart.text_pos_right') }}
                                </template>
                                <div
                                    :class="{
                    dark: themes === 'dark',
                    active: state.indicatorValueForm.hPosition === 'right'
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

            <el-form-item :class="'form-item-' + themes" class="form-item">
                <el-radio-group
                    v-model="state.indicatorValueForm.vPosition"
                    :effect="themes"
                    class="icon-radio-group"
                    @change="changeLabelTitleStyleStyle('vPosition')"
                >
                    <el-radio label="top">
                        <el-tooltip :effect="toolTip" placement="top">
                            <template #content>
                                {{ t('chart.text_pos_top') }}
                            </template>
                            <div
                                :class="{
                  dark: themes === 'dark',
                  active: state.indicatorValueForm.vPosition === 'top'
                }"
                                class="icon-btn"
                            >
                                <el-icon>
                                    <Icon name="icon_top-align_outlined"
                                    >
                                        <icon_topAlign_outlined class="svg-icon"
                                        />
                                    </Icon>
                                </el-icon>
                            </div>
                        </el-tooltip>
                    </el-radio>
                    <el-radio label="center">
                        <el-tooltip :effect="toolTip" placement="top">
                            <template #content>
                                {{ t('chart.text_pos_center') }}
                            </template>
                            <div
                                :class="{
                  dark: themes === 'dark',
                  active: state.indicatorValueForm.vPosition === 'center'
                }"
                                class="icon-btn"
                            >
                                <el-icon>
                                    <Icon name="icon_vertical-align_outlined"
                                    >
                                        <icon_verticalAlign_outlined class="svg-icon"
                                        />
                                    </Icon>
                                </el-icon>
                            </div>
                        </el-tooltip>
                    </el-radio>
                    <el-radio label="bottom">
                        <el-tooltip :effect="toolTip" placement="top">
                            <template #content>
                                {{ t('chart.text_pos_bottom') }}
                            </template>
                            <div
                                :class="{
                  dark: themes === 'dark',
                  active: state.indicatorValueForm.vPosition === 'bottom'
                }"
                                class="icon-btn"
                            >
                                <el-icon>
                                    <Icon name="icon_bottom-align_outlined"
                                    >
                                        <icon_bottomAlign_outlined class="svg-icon"
                                        />
                                    </Icon>
                                </el-icon>
                            </div>
                        </el-tooltip>
                    </el-radio>
                </el-radio-group>
            </el-form-item>

            <el-form-item :class="'form-item-' + themes" class="form-item">
                <el-checkbox
                    v-model="state.indicatorValueForm.fontShadow"
                    :effect="themes"
                    size="small"
                    @change="changeLabelTitleStyleStyle('fontShadow')"
                >
                    {{ t('chart.font_shadow') }}
                </el-checkbox>
            </el-form-item>

            <el-divider :class="{ 'divider-dark': themes === 'dark' }" class="m-divider"/>

            <el-form-item :class="'form-item-' + themes" class="form-item">
                <el-checkbox
                    v-model="state.indicatorValueForm.suffixEnable"
                    :effect="themes"
                    size="small"
                    @change="changeLabelTitleStyleStyle('suffixEnable')"
                >
                    {{ t('chart.indicator_suffix') }}
                </el-checkbox>
            </el-form-item>

            <div style="padding-left: 22px">
                <el-form-item :class="'form-item-' + themes" class="form-item">
                    <el-input
                        v-model="state.indicatorValueForm.suffix"
                        :disabled="!state.indicatorValueForm.suffixEnable"
                        :effect="themes"
                        :placeholder="t('chart.indicator_suffix_placeholder')"
                        maxlength="10"
                        @change="changeLabelTitleStyleStyle('suffix')"
                    />
                </el-form-item>

                <el-form-item :class="'form-item-' + themes" :effect="themes" class="form-item">
                    <el-select
                        v-model="state.indicatorValueForm.suffixFontFamily"
                        :disabled="!state.indicatorValueForm.suffixEnable"
                        :effect="themes"
                        :placeholder="t('chart.font_family')"
                        @change="changeLabelTitleStyleStyle('suffixFontFamily')"
                    >
                        <el-option
                            v-for="option in fontFamily"
                            :key="option.value"
                            :label="option.name"
                            :value="option.value"
                        />
                    </el-select>
                </el-form-item>

                <div style="display: flex">
                    <el-form-item :class="'form-item-' + themes" class="form-item" style="padding-right: 4px">
                        <el-color-picker
                            v-model="state.indicatorValueForm.suffixColor"
                            :disabled="!state.indicatorValueForm.suffixEnable"
                            :effect="themes"
                            :predefine="predefineColors"
                            class="color-picker-style"
                            is-custom
                            show-alpha
                            @change="changeLabelTitleStyleStyle('suffixColor')"
                        />
                    </el-form-item>
                    <el-form-item :class="'form-item-' + themes" class="form-item" style="padding: 0 4px">
                        <el-tooltip :content="t('chart.font_size')" :effect="toolTip" placement="top">
                            <el-select
                                v-model="state.indicatorValueForm.suffixFontSize"
                                :disabled="!state.indicatorValueForm.suffixEnable"
                                :effect="themes"
                                :placeholder="t('chart.text_fontsize')"
                                size="small"
                                style="width: 56px"
                                @change="changeLabelTitleStyleStyle('suffixFontSize')"
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

                    <el-form-item :class="'form-item-' + themes" class="form-item" style="padding-left: 4px">
                        <el-select
                            v-model="state.indicatorValueForm.suffixLetterSpace"
                            :disabled="!state.indicatorValueForm.suffixEnable"
                            :effect="themes"
                            :placeholder="t('chart.quota_letter_space')"
                            size="small"
                            @change="changeLabelTitleStyleStyle('suffixLetterSpace')"
                        >
                            <template #prefix>
                                <el-icon>
                                    <Icon name="icon_letter-spacing_outlined"
                                    >
                                        <icon_letterSpacing_outlined class="svg-icon"
                                        />
                                    </Icon>
                                </el-icon>
                            </template>
                            <el-option
                                v-for="option in fontLetterSpace"
                                :key="option.value"
                                :label="option.name"
                                :value="option.value"
                            />
                        </el-select>
                    </el-form-item>
                </div>

                <el-space>
                    <el-form-item :class="'form-item-' + themes" class="form-item">
                        <el-checkbox
                            v-model="state.indicatorValueForm.suffixIsBolder"
                            :disabled="!state.indicatorValueForm.suffixEnable"
                            :effect="themes"
                            class="icon-checkbox"
                            @change="changeLabelTitleStyleStyle('suffixIsBolder')"
                        >
                            <el-tooltip :effect="toolTip" placement="top">
                                <template #content>
                                    {{ t('chart.bolder') }}
                                </template>
                                <div
                                    :class="{
                    dark: themes === 'dark',
                    active: state.indicatorValueForm.suffixIsBolder
                  }"
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
                            v-model="state.indicatorValueForm.suffixIsItalic"
                            :disabled="!state.indicatorValueForm.suffixEnable"
                            :effect="themes"
                            class="icon-checkbox"
                            @change="changeLabelTitleStyleStyle('suffixIsItalic')"
                        >
                            <el-tooltip :effect="toolTip" placement="top">
                                <template #content>
                                    {{ t('chart.italic') }}
                                </template>
                                <div
                                    :class="{
                    dark: themes === 'dark',
                    active: state.indicatorValueForm.suffixIsItalic
                  }"
                                    class="icon-btn"
                                >
                                    <el-icon>
                                        <Icon name="icon_italic_outlined"
                                        >
                                            <icon_italic_outlined class="svg-icon"
                                            />
                                        </Icon>
                                    </el-icon>
                                </div>
                            </el-tooltip>
                        </el-checkbox>
                    </el-form-item>
                </el-space>

                <el-form-item :class="'form-item-' + themes" class="form-item">
                    <el-checkbox
                        v-model="state.indicatorValueForm.suffixFontShadow"
                        :disabled="!state.indicatorValueForm.suffixEnable"
                        :effect="themes"
                        size="small"
                        @change="changeLabelTitleStyleStyle('suffixFontShadow')"
                    >
                        {{ t('chart.font_shadow') }}
                    </el-checkbox>
                </el-form-item>
            </div>
        </el-form>
    </div>
</template>

<style lang="less" scoped>
:deep(.ed-input .ed-select__prefix--light) {
    padding-right: 6px;
}

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

.is-disabled {
    .icon-btn {
        color: #8f959e;
        cursor: not-allowed;

        &:hover {
            background-color: inherit;
        }

        &.active {
            background-color: #f5f7fa;

            &:hover {
                background-color: #f5f7fa;
            }
        }

        &.dark {
            color: #5f5f5f;

            &.active {
                background-color: #373737;

                &:hover {
                    background-color: #373737;
                }
            }
        }
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
    margin-bottom: 16px;
    background: rgba(31, 35, 41, 0.15);

    &.position-divider--dark {
        background: rgba(235, 235, 235, 0.15);
    }
}

.remark-label {
    color: var(--N600, #646a73);
    font-family: var(--de-custom_font, 'PingFang');
    font-size: 12px;
    font-style: normal;
    font-weight: 400;
    line-height: 20px;

    &.remark-label--dark {
        color: var(--N600-Dark, #a6a6a6);
    }
}

.m-divider {
    margin: 0 0 16px;
    border-color: rgba(31, 35, 41, 0.15);

    &.divider-dark {
        border-color: rgba(255, 255, 255, 0.15);
    }
}
</style>
