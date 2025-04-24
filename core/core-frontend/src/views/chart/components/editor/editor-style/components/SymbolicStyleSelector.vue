<script lang="ts" setup>
import {computed, onMounted, reactive, ref, watch} from 'vue'
import {DEFAULT_BASIC_STYLE} from '@/views/chart/components/editor/util/chart'
import {ElMessage, UploadProps} from 'element-plus-secondary'
import {svgStrToUrl} from '@/views/chart/components/js/util'
import {useI18n} from '@/hooks/web/useI18n'
import {cloneDeep, debounce, defaultsDeep} from 'lodash-es'

const props = withDefaults(
    defineProps<{
        chart: ChartObj
        themes?: EditorTheme
        propertyInner?: Array<string>
    }>(),
    {
        themes: 'dark'
    }
)

const {t} = useI18n()
const showProperty = prop => props.propertyInner?.includes(prop)
const emit = defineEmits(['onBasicStyleChange', 'onMiscChange'])
const state = reactive({
    basicStyleForm: JSON.parse(JSON.stringify(DEFAULT_BASIC_STYLE)) as ChartBasicStyle,
    customColor: null,
    colorIndex: 0,
    fieldColumnWidth: {
        fieldId: '',
        width: 0
    },
    fileList: []
})

const changeBasicStyle = (prop?: string, requestData = false) => {
    emit('onBasicStyleChange', {data: state.basicStyleForm, requestData}, prop)
}

const iconUpload = ref()
const acceptedFileType = ['image/svg+xml', 'image/jpeg', 'image/png']

const mapSymbolOptions = [
    {name: t('chart.line_symbol_circle'), value: 'circle'},
    {name: t('chart.line_symbol_rect'), value: 'square'},
    {name: t('chart.line_symbol_triangle'), value: 'triangle'},
    {name: t('chart.map_symbol_pentagon'), value: 'pentagon'},
    {name: t('chart.map_symbol_hexagon'), value: 'hexagon'},
    {name: t('chart.map_symbol_octagon'), value: 'octogon'},
    {name: t('chart.line_symbol_diamond'), value: 'rhombus'},
    {name: t('commons.custom'), value: 'custom'}
]

const onIconChange: UploadProps['onChange'] = async uploadFile => {
    const rawFile = uploadFile.raw
    let validIcon = true
    if (!acceptedFileType.includes(rawFile.type)) {
        ElMessage.error(t('chart.symbolic_error_icon'))
        validIcon = false
    }
    if (rawFile.size / 1024 / 1024 > 1) {
        ElMessage.error(t('chart.symbolic_error_size'))
        validIcon = false
    }
    if (!validIcon) {
        iconUpload.value?.clearFiles()
        state.fileList.splice(0)
        const customIcon = state.basicStyleForm.customIcon
        if (customIcon) {
            let file = ''
            // 图片
            if (customIcon.startsWith('data')) {
                file = customIcon
            } else {
                // svg
                file = svgStrToUrl(customIcon)
            }
            file && (state.fileList[0] = {url: file})
        }
    } else {
        if (rawFile.type === 'image/svg+xml') {
            state.basicStyleForm.customIcon = await rawFile.text()
            changeBasicStyle('customIcon')
        } else {
            const fileReader = new FileReader()
            fileReader.onloadend = () => {
                state.basicStyleForm.customIcon = fileReader.result as string
                changeBasicStyle('customIcon')
            }
            fileReader.readAsDataURL(rawFile)
        }
    }
}

const changeMapSymbol = () => {
    const {mapSymbol, customIcon} = state.basicStyleForm
    if (mapSymbol === 'custom' && customIcon) {
        let file
        if (customIcon.startsWith('data')) {
            file = customIcon
        } else {
            file = svgStrToUrl(state.basicStyleForm.customIcon)
        }
        file && (state.fileList[0] = {url: file})
    }
    changeBasicStyle('mapSymbol')
}

const customSymbolicMapSizeRange = computed(() => {
    let {extBubble} = JSON.parse(JSON.stringify(props.chart))
    return ['symbolic-map'].includes(props.chart.type) && extBubble?.length > 0
})
const mapCustomRangeValidate = prop => {
    const {mapSymbolSizeMax = '0', mapSymbolSizeMin = '1'} = state.basicStyleForm
    let max = parseInt(mapSymbolSizeMax)
    let min = parseInt(mapSymbolSizeMin)
    state.basicStyleForm.mapSymbolSizeMin = Math.max(min, 0)
    state.basicStyleForm.mapSymbolSizeMax = Math.max(max, 1)
    if (max < min) {
        ElMessage.warning(t('chart.symbolic_error_range'))
        return
    }
    changeBasicStyle(prop)
}

const init = () => {
    const basicStyle = cloneDeep(props.chart.customAttr.basicStyle)
    if (
        basicStyle.mapSymbol === 'custom' &&
        state.basicStyleForm.customIcon !== basicStyle.customIcon
    ) {
        let file
        if (basicStyle.customIcon?.startsWith('data')) {
            file = basicStyle.customIcon
        } else {
            file = svgStrToUrl(basicStyle.customIcon)
        }
        file && (state.fileList[0] = {url: file})
    }
    state.basicStyleForm = defaultsDeep(basicStyle, cloneDeep(DEFAULT_BASIC_STYLE)) as ChartBasicStyle
    if (!state.customColor) {
        state.customColor = state.basicStyleForm.colors[0]
        state.colorIndex = 0
    }
}

const debouncedInit = debounce(init, 500)
watch(
    [() => props.chart.customAttr.basicStyle, () => props.chart.xAxis, () => props.chart.yAxis],
    debouncedInit,
    {deep: true}
)
onMounted(() => {
    init()
})
</script>

<template>
    <div style="width: 100%">
        <div v-if="showProperty('symbolicMapStyle')" class="map-flow-style">
            <el-row style="flex: 1">
                <el-col>
                    <el-form-item :class="'form-item-' + themes" class="form-item">
                        <template #label>
              <span class="data-area-label">
                <span style="margin-right: 4px">{{ t('chart.symbolic_shape') }}</span>
                <el-tooltip class="item" effect="dark" placement="bottom">
                  <template v-if="state.basicStyleForm.mapSymbol === 'custom'" #content>
                    <div>{{ t('chart.symbolic_upload_hint') }}</div>
                  </template>
                  <el-icon :class="{ 'hint-icon--dark': themes === 'dark' }" class="hint-icon">
                    <Icon name="icon_info_outlined"><icon_info_outlined class="svg-icon"/></Icon>
                  </el-icon>
                </el-tooltip>
              </span>
                        </template>
                        <el-select
                            v-model="state.basicStyleForm.mapSymbol"
                            :effect="themes"
                            @change="changeMapSymbol()"
                        >
                            <el-option
                                v-for="item in mapSymbolOptions"
                                :key="item.name"
                                :label="item.name"
                                :value="item.value"
                            />
                        </el-select>
                    </el-form-item>
                </el-col>
            </el-row>
            <el-row v-if="state.basicStyleForm.mapSymbol === 'custom'" style="flex: 1">
                <el-col>
                    <el-form-item :class="'form-item-' + themes" class="form-item uploader">
                        <div :class="`img-area_${themes}`" class="avatar-uploader-container">
                            <el-upload
                                ref="iconUpload"
                                :auto-upload="false"
                                :effect="themes"
                                :file-list="state.fileList"
                                :limit="1"
                                :on-change="onIconChange"
                                accept=".svg,.png,.jpeg,.jpg"
                                action="#"
                                class="avatar-uploader"
                                list-type="picture-card"
                            >
                                <el-icon>
                                    <Plus/>
                                </el-icon>
                            </el-upload>
                        </div>
                    </el-form-item>
                </el-col>
            </el-row>
            <div class="alpha-setting">
                <label :class="{ dark: 'dark' === themes }" class="alpha-label">
                    {{ t('chart.size') }}
                </label>
                <el-row style="flex: 1">
                    <el-col>
                        <el-form-item :class="'form-item-' + themes" class="form-item alpha-slider">
                            <el-slider
                                v-model="state.basicStyleForm.mapSymbolSize"
                                :disabled="customSymbolicMapSizeRange"
                                :effect="themes"
                                :max="40"
                                :min="1"
                                @change="changeBasicStyle('mapSymbolSize')"
                            />
                        </el-form-item>
                    </el-col>
                </el-row>
            </div>
            <div class="alpha-setting">
                <label :class="{ dark: 'dark' === themes }" class="alpha-label">
                    {{ t('chart.size') }}{{ t('chart.symbolic_range') }}
                </label>
                <el-row style="flex: 1">
                    <el-col :span="11">
                        <el-form-item :class="'form-item-' + themes" class="form-item alpha-slider">
                            <el-input
                                v-model="state.basicStyleForm.mapSymbolSizeMin"
                                :controls="false"
                                :disabled="!customSymbolicMapSizeRange"
                                :effect="themes"
                                class="basic-input-number"
                                type="number"
                                @blur="mapCustomRangeValidate('mapSymbolSizeMin')"
                            >
                            </el-input>
                        </el-form-item>
                    </el-col>
                    <el-col :span="1.2">
                        <span>-</span>
                    </el-col>
                    <el-col :span="11">
                        <el-form-item :class="'form-item-' + themes" class="form-item alpha-slider">
                            <el-input
                                v-model="state.basicStyleForm.mapSymbolSizeMax"
                                :controls="false"
                                :disabled="!customSymbolicMapSizeRange"
                                :effect="themes"
                                class="basic-input-number"
                                type="number"
                                @blur="mapCustomRangeValidate('mapSymbolSizeMax')"
                            >
                            </el-input>
                        </el-form-item>
                    </el-col>
                </el-row>
            </div>
            <div v-if="state.basicStyleForm.mapSymbol !== 'custom'" class="alpha-setting">
                <label :class="{ dark: 'dark' === themes }" class="alpha-label">
                    {{ t('chart.not_alpha') }}
                </label>
                <el-row style="flex: 1">
                    <el-col>
                        <el-form-item :class="'form-item-' + themes" class="form-item alpha-slider">
                            <el-slider
                                v-model="state.basicStyleForm.mapSymbolOpacity"
                                :effect="themes"
                                :max="10"
                                :min="1"
                                @change="changeBasicStyle('mapSymbolOpacity')"
                            />
                        </el-form-item>
                    </el-col>
                </el-row>
            </div>
            <div v-if="state.basicStyleForm.mapSymbol !== 'custom'" class="alpha-setting">
                <label :class="{ dark: 'dark' === themes }" class="alpha-label">
                    {{ t('visualization.borderWidth') }}
                </label>
                <el-row style="flex: 1">
                    <el-col>
                        <el-form-item :class="'form-item-' + themes" class="form-item alpha-slider">
                            <el-slider
                                v-model="state.basicStyleForm.mapSymbolStrokeWidth"
                                :effect="themes"
                                :max="5"
                                :min="1"
                                @change="changeBasicStyle('mapSymbolStrokeWidth')"
                            />
                        </el-form-item>
                    </el-col>
                </el-row>
            </div>
        </div>
    </div>
</template>

<style lang="less" scoped>
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

.data-area-label {
    text-align: left;
    position: relative;
    width: 100%;
    display: flex;
    flex-direction: row;
    align-items: center;
}

.avatar-uploader-container {
    :deep(.ed-upload--picture-card) {
        background: #eff0f1;
        border: 1px dashed #dee0e3;
        border-radius: 4px;

        .ed-icon {
            color: #1f2329;
        }

        &:hover {
            .ed-icon {
                color: var(--ed-color-primary);
            }
        }
    }

    &.img-area_dark {
        :deep(.ed-upload-list__item).is-ready {
            border-color: #434343;
        }

        :deep(.ed-upload--picture-card) {
            background: #373737;
            border-color: #434343;

            .ed-icon {
                color: #ebebeb;
            }
        }
    }

    &.img-area_light {
        :deep(.ed-upload-list__item).is-ready {
            border-color: #dee0e3;
        }
    }

    :deep(.ed-upload-list__item-preview) {
        display: none !important;
    }

    :deep(.ed-upload-list__item-delete) {
        margin-left: 0 !important;
    }

    :deep(.ed-upload-list__item-status-label) {
        display: none !important;
    }

    :deep(.ed-icon--close-tip) {
        display: none !important;
    }
}

.avatar-uploader {
    width: 90px;
    height: 80px;
    overflow: hidden;
}

.avatar-uploader {
    width: 90px;

    :deep(.ed-upload) {
        width: 80px;
        height: 80px;
        line-height: 90px;
    }

    :deep(.ed-upload-list li) {
        width: 80px !important;
        height: 80px !important;
    }

    :deep(.ed-upload--picture-card) {
        background: #eff0f1;
        border: 1px dashed #dee0e3;
        border-radius: 4px;

        .ed-icon {
            color: #1f2329;
        }

        &:hover {
            .ed-icon {
                color: var(--ed-color-primary);
            }
        }
    }
}

.uploader {
    :deep(.ed-form-item__content) {
        justify-content: center;
    }
}
</style>
