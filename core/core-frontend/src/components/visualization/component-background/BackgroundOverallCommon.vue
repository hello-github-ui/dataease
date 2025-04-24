<template>
    <div ref="bgForm" style="width: 100%">
        <input
            id="input"
            ref="files"
            accept=".jpeg,.jpg,.png,.gif,.svg"
            hidden
            type="file"
            @change="reUpload"
            @click="
        e => {
          e.target.value = ''
        }
      "
        />
        <el-form label-position="top" style="width: 100%">
            <el-row :gutter="8">
                <el-col :span="12">
                    <el-form-item
                        :class="'form-item-' + themes"
                        :label="t('visualization.inner_padding')"
                        class="form-item w100"
                    >
                        <el-input-number
                            v-model="state.commonBackground.innerPadding"
                            :effect="themes"
                            :max="100"
                            :min="0"
                            controls-position="right"
                            size="middle"
                            style="width: 100%"
                            @change="onBackgroundChange"
                        />
                    </el-form-item>
                </el-col>
                <el-col :span="12">
                    <el-form-item
                        :class="'form-item-' + themes"
                        :label="t('visualization.board_radio')"
                        class="form-item w100"
                    >
                        <el-input-number
                            v-model="state.commonBackground.borderRadius"
                            :effect="themes"
                            :max="100"
                            :min="0"
                            controls-position="right"
                            size="middle"
                            style="width: 100%"
                            @change="onBackgroundChange"
                        />
                    </el-form-item>
                </el-col>
            </el-row>
            <template v-if="editPosition === 'canvas'">
                <el-form-item :class="'form-item-' + themes" class="form-item no-margin-bottom">
                    <el-checkbox
                        v-model="state.commonBackground.backdropFilterEnable"
                        :effect="themes"
                        size="small"
                        @change="onBackgroundChange"
                    >
                        {{ $t('chart.backdrop_blur') }}
                    </el-checkbox>
                </el-form-item>
                <div class="indented-container">
                    <div class="indented-item">
                        <el-form-item :class="'form-item-' + themes" class="form-item">
                            <el-input-number
                                v-model="state.commonBackground.backdropFilter"
                                :disabled="!state.commonBackground.backdropFilterEnable"
                                :effect="themes"
                                :max="30"
                                :min="0"
                                controls-position="right"
                                size="middle"
                                style="width: 100%"
                                @change="onBackgroundChange"
                            />
                        </el-form-item>
                    </div>
                </div>
            </template>

            <el-form-item :class="'form-item-' + themes" class="form-item no-margin-bottom">
                <el-checkbox
                    v-model="state.commonBackground.backgroundColorSelect"
                    :effect="themes"
                    size="small"
                    @change="onBackgroundChange"
                >
                    {{ $t('chart.color') }}
                </el-checkbox>
            </el-form-item>

            <div class="indented-container">
                <div class="indented-item">
                    <el-form-item :class="'form-item-' + themes" class="form-item">
                        <el-color-picker
                            v-if="state.commonBackground.backgroundColor"
                            v-model="state.commonBackground.backgroundColor"
                            :disabled="!state.commonBackground.backgroundColorSelect"
                            :effect="themes"
                            :predefine="state.predefineColors"
                            :trigger-width="computedBackgroundColorPickerWidth"
                            class="color-picker-style"
                            is-custom
                            show-alpha
                            @change="onBackgroundChange"
                        />
                    </el-form-item>
                </div>
            </div>

            <el-form-item :class="'form-item-' + themes" class="form-item no-margin-bottom">
                <el-checkbox
                    v-model="state.commonBackground.backgroundImageEnable"
                    :effect="themes"
                    size="small"
                    @change="onBackgroundChange"
                >
                    {{ t('visualization.background') }}
                </el-checkbox>
            </el-form-item>

            <div class="indented-container">
                <div class="indented-item">
                    <el-form-item :class="'form-item-' + themes" class="form-item margin-bottom-8">
                        <el-radio-group
                            v-model="state.commonBackground.backgroundType"
                            :disabled="!state.commonBackground.backgroundImageEnable"
                            :effect="themes"
                            @change="onBackgroundChange"
                        >
                            <el-radio :effect="themes" label="outerImage">{{
                                    t('visualization.photo')
                                }}
                            </el-radio>
                            <el-radio :effect="themes" label="innerImage">{{
                                    t('visualization.board')
                                }}
                            </el-radio>
                        </el-radio-group>
                    </el-form-item>
                </div>
                <div v-if="state.commonBackground.backgroundType === 'innerImage'" class="indented-item">
                    <el-form-item :class="'form-item-' + themes" class="form-item">
                        <el-color-picker
                            v-model="state.commonBackground.innerImageColor"
                            :disabled="!state.commonBackground.backgroundImageEnable"
                            :effect="themes"
                            :predefine="state.predefineColors"
                            :title="t('visualization.border_color_setting')"
                            class="color-picker-style"
                            is-custom
                            show-alpha
                            style="position: absolute; top: -3px; left: 60px"
                            @change="onBackgroundChange"
                        />
                    </el-form-item>
                    <el-form-item
                        :class="'form-item-' + themes"
                        class="form-item fill"
                        style="padding-left: 8px"
                    >
                        <el-select
                            v-model="state.commonBackground.innerImage"
                            :disabled="!state.commonBackground.backgroundImageEnable"
                            :effect="themes"
                            :style="{ width: computedBackgroundBorderSelectWidth + 'px' }"
                            placeholder="选择边框..."
                            popper-class="board-select"
                            size="middle"
                            @change="onBackgroundChange"
                        >
                            <template v-if="state.commonBackground.innerImage" #prefix>
                                <border-option-prefix
                                    :url="state.commonBackground.innerImage"
                                    inner-image-color="state.commonBackground.innerImageColor"
                                ></border-option-prefix>
                            </template>
                            <el-option
                                v-for="(item, index) in state.BackgroundShowMap['default']"
                                :key="index"
                                :label="item.name"
                                :value="item.url"
                            >
                                <board-item
                                    :active="item.url === state.commonBackground.innerImage"
                                    :inner-image-color="state.commonBackground.innerImageColor"
                                    :item="item"
                                    :themes="themes"
                                ></board-item>
                            </el-option>
                        </el-select>
                    </el-form-item>
                </div>
                <div
                    v-if="state.commonBackground.backgroundType === 'outerImage'"
                    :class="{
            disabled: !state.commonBackground.backgroundImageEnable || state.uploadDisabled
          }"
                    class="indented-item"
                >
                    <div :class="`img-area_${themes}`" class="avatar-uploader-container">
                        <el-upload
                            :before-upload="beforeUploadCheck"
                            :disabled="!state.commonBackground.backgroundImageEnable"
                            :effect="themes"
                            :file-list="state.fileList"
                            :http-request="upload"
                            :on-preview="handlePictureCardPreview"
                            :on-remove="handleRemove"
                            accept=".jpeg,.jpg,.png,.gif,.svg"
                            action=""
                            class="avatar-uploader"
                            list-type="picture-card"
                        >
                            <el-icon>
                                <Plus/>
                            </el-icon>
                        </el-upload>
                        <el-row>
              <span
                  v-if="!state.commonBackground['outerImage']"
                  :class="`image-hint_${themes}`"
                  class="image-hint"
                  style="margin-top: 2px"
              >
                支持JPG、PNG、GIF、SVG
              </span>

                            <el-button
                                v-if="state.commonBackground['outerImage']"
                                :disabled="!state.commonBackground.backgroundImageEnable"
                                size="small"
                                style="margin: 8px 0 0 -4px"
                                text
                                @click="goFile"
                            >
                                重新上传
                            </el-button>
                        </el-row>
                    </div>

                    <img-view-dialog v-model="state.dialogVisible" :image-url="state.dialogImageUrl"/>
                </div>
            </div>
        </el-form>
    </div>
</template>

<script lang="ts" setup>
import {queryVisualizationBackground} from '@/api/visualization/visualizationBackground'
import {COLOR_PANEL} from '@/views/chart/components/editor/util/chart'
import {computed, nextTick, onMounted, reactive, ref, watch} from 'vue'
import {imgUrlTrans} from '@/utils/imgUtils'
import {snapshotStoreWithOut} from '@/store/modules/data-visualization/snapshot'
import {beforeUploadCheck, uploadFileResult} from '@/api/staticResource'
import {useI18n} from '@/hooks/web/useI18n'
import {deepCopy} from '@/utils/utils'
import elementResizeDetectorMaker from 'element-resize-detector'
import {ElMessage} from 'element-plus-secondary'
import BoardItem from '@/components/visualization/component-background/BoardItem.vue'
import ImgViewDialog from '@/custom-component/ImgViewDialog.vue'
import BorderOptionPrefix from '@/components/visualization/component-background/BorderOptionPrefix.vue'

const snapshotStore = snapshotStoreWithOut()
const {t} = useI18n()
const emits = defineEmits(['onBackgroundChange'])
const files = ref(null)
const maxImageSize = 15000000

const props = withDefaults(
    defineProps<{
        componentPosition?: string
        editPosition?: string
        themes?: EditorTheme
        commonBackgroundPop: any
        backgroundColorPickerWidth?: number
        backgroundBorderSelectWidth?: number
    }>(),
    {
        themes: 'dark',
        componentPosition: 'dashboard',
        editPosition: 'canvas',
        backgroundColorPickerWidth: 50,
        backgroundBorderSelectWidth: 108
    }
)

const state = reactive({
    commonBackground: {},
    BackgroundShowMap: {},
    checked: false,
    backgroundOrigin: {},
    fileList: [],
    dialogImageUrl: '',
    dialogVisible: false,
    uploadDisabled: false,
    panel: null,
    predefineColors: COLOR_PANEL
})

const goFile = () => {
    files.value.click()
}

const sizeMessage = () => {
    ElMessage.success('图片大小不能超过15M')
}

const reUpload = e => {
    const file = e.target.files[0]
    if (file.size > maxImageSize) {
        sizeMessage()
        return
    }
    uploadFileResult(file, fileUrl => {
        state.commonBackground['outerImage'] = fileUrl
        state.fileList = [{url: imgUrlTrans(state.commonBackground['outerImage'])}]
        onBackgroundChange()
    })
}

const queryBackground = () => {
    queryVisualizationBackground().then(response => {
        state.BackgroundShowMap = response.data
    })
}

const init = () => {
    state.commonBackground = deepCopy(props.commonBackgroundPop)
    if (state.commonBackground['outerImage']) {
        state.fileList = [{url: imgUrlTrans(state.commonBackground['outerImage'])}]
    } else {
        state.fileList = []
    }
}
queryBackground()
const commitStyle = () => {
    snapshotStore.recordSnapshotCacheToMobile('commonBackground')
}

const handleRemove = () => {
    state.uploadDisabled = false
    state.commonBackground['outerImage'] = null
    state.fileList = []
    onBackgroundChange()
    commitStyle()
}
const handlePictureCardPreview = file => {
    state.dialogImageUrl = file.url
    state.dialogVisible = true
}
const upload = file => {
    uploadFileResult(file.file, fileUrl => {
        state.commonBackground['outerImage'] = fileUrl
        onBackgroundChange()
    })
}

const onBackgroundChange = () => {
    emits('onBackgroundChange', state.commonBackground)
}

const bgForm = ref()
const containerWidth = ref()

const computedBackgroundColorPickerWidth = computed(() => {
    if (containerWidth.value <= 240) {
        return 50
    } else {
        return props.backgroundColorPickerWidth
    }
})
const computedBackgroundBorderSelectWidth = computed(() => {
    if (containerWidth.value <= 240) {
        return 108
    } else {
        return props.backgroundBorderSelectWidth
    }
})

onMounted(() => {
    init()
    const erd = elementResizeDetectorMaker()
    containerWidth.value = bgForm.value?.offsetWidth
    erd.listenTo(bgForm.value, () => {
        nextTick(() => {
            containerWidth.value = bgForm.value?.offsetWidth
        })
    })
})

watch(
    () => props.commonBackgroundPop,
    () => {
        init()
    }
)
</script>

<style lang="less" scoped>
:deep(.ed-form-item) {
    display: block;
    margin-bottom: 16px;
}

.avatar-uploader-container {
    margin-bottom: 16px;

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

.shape-item {
    padding: 6px;
    border: none;
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.ed-select-dropdown__item {
    height: 100px !important;
    text-align: center;
    padding: 0px 5px;
}

.ed-select-dropdown__item.selected::after {
    display: none;
}

.indented-container {
    margin-top: 8px;
    width: 100%;
    padding-left: 22px;

    .indented-item {
        width: 100%;
        display: flex;

        .fill {
            flex: 1;
        }

        &.disabled {
            cursor: not-allowed;
            color: #8f959e;

            :deep(.avatar-uploader) {
                width: 90px;
                pointer-events: none;
            }

            :deep(.ed-upload--picture-card) {
                cursor: not-allowed;
            }

            .img-area_dark {
                :deep(.ed-upload--picture-card) {
                    .ed-icon {
                        color: #5f5f5f;
                    }
                }
            }

            .img-area_light {
                :deep(.ed-upload--picture-card) {
                    .ed-icon {
                        color: #bbbfc4;
                    }
                }
            }

            &:hover {
                .ed-icon {
                    color: #8f959e;
                }
            }
        }
    }
}

.form-item {
    &.margin-bottom-8 {
        margin-bottom: 8px !important;
    }

    &.no-margin-bottom {
        margin-bottom: 0 !important;
    }
}

.re-update-span {
    cursor: pointer;
    color: var(--ed-color-primary);
    size: 14px;
    line-height: 22px;
    font-weight: 400;
}

.image-hint {
    color: #8f959e;
    size: 14px;
    line-height: 22px;
    font-weight: 400;
    margin-top: 2px;

    &.image-hint_dark {
        color: #757575;
    }
}
</style>

<style lang="less">
.board-select {
    min-width: 50px !important;
    width: 304px;

    .ed-scrollbar__view {
        display: grid !important;
        grid-template-columns: repeat(3, 1fr) !important;
    }

    .ed-select-dropdown__item.hover {
        background-color: rgba(0, 0, 0, 0) !important;
    }

    .ed-select-dropdown__item.selected {
        background-color: rgba(0, 0, 0, 0) !important;
    }
}
</style>
