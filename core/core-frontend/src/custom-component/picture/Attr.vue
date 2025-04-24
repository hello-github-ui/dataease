<script lang="ts" setup>
import CommonAttr from '@/custom-component/common/CommonAttr.vue'
import {dvMainStoreWithOut} from '@/store/modules/data-visualization/dvMain'
import {snapshotStoreWithOut} from '@/store/modules/data-visualization/snapshot'

import {storeToRefs} from 'pinia'
import {ElIcon, ElMessage} from 'element-plus-secondary'
import {computed, onBeforeUnmount, onMounted, PropType, reactive, ref, watch} from 'vue'
import {beforeUploadCheck, uploadFileResult} from '@/api/staticResource'
import {imgUrlTrans} from '@/utils/imgUtils'
import eventBus from '@/utils/eventBus'
import ImgViewDialog from '@/custom-component/ImgViewDialog.vue'
import {useI18n} from '@/hooks/web/useI18n'

const {t} = useI18n()

const props = defineProps({
    themes: {
        type: String as PropType<EditorTheme>,
        default: 'dark'
    }
})

const dvMainStore = dvMainStoreWithOut()
const snapshotStore = snapshotStoreWithOut()

const {curComponent, mobileInPc} = storeToRefs(dvMainStore)

const fileList = ref([])
const dialogImageUrl = ref('')
const dialogVisible = ref(false)
const uploadDisabled = ref(false)
const files = ref(null)
const maxImageSize = 15000000
const state = reactive({})

const handlePictureCardPreview = file => {
    dialogImageUrl.value = file.url
    dialogVisible.value = true
}

const handleRemove = (_, fileList) => {
    uploadDisabled.value = false
    curComponent.value.propValue.url = null
    fileList.value = []
    snapshotStore.recordSnapshotCache('handleRemove')
}

async function upload(file) {
    uploadFileResult(file.file, fileUrl => {
        snapshotStore.recordSnapshotCache('pic-upload')
        curComponent.value.propValue.url = fileUrl
    })
}

const onStyleChange = () => {
    snapshotStore.recordSnapshotCache('pic-onStyleChange')
}

const goFile = () => {
    files.value.click()
}

const reUpload = e => {
    const file = e.target.files[0]
    if (file.size > maxImageSize) {
        sizeMessage()
        return
    }
    uploadFileResult(file, fileUrl => {
        snapshotStore.recordSnapshotCache('uploadFileResult')
        curComponent.value.propValue.url = fileUrl
        fileList.value = [{url: imgUrlTrans(curComponent.value.propValue.url)}]
    })
}

const sizeMessage = () => {
    ElMessage.success('图片大小不能超过15M')
}
const init = () => {
    if (curComponent.value.propValue.url) {
        fileList.value = [{url: imgUrlTrans(curComponent.value.propValue.url)}]
    } else {
        fileList.value = []
    }
}

const toolTip = computed(() => {
    return props.themes === 'dark' ? 'ndark' : 'dark'
})

watch(
    () => curComponent.value.propValue.url,
    () => {
        init()
    }
)

onMounted(() => {
    init()
    eventBus.on('uploadImg', goFile)
})
onBeforeUnmount(() => {
    eventBus.off('uploadImg', goFile)
})
</script>

<template>
    <div class="attr-list de-collapse-style">
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
        <CommonAttr
            :background-border-select-width="197"
            :background-color-picker-width="197"
            :element="curComponent"
            :themes="themes"
        >
            <el-collapse-item
                v-show="!mobileInPc"
                :effect="themes"
                :title="t('visualization.picture')"
                name="picture"
            >
                <el-row :class="`img-area_${themes}`" class="img-area">
                    <el-col style="width: 130px !important">
                        <el-upload
                            :before-upload="beforeUploadCheck"
                            :class="{ disabled: uploadDisabled }"
                            :file-list="fileList"
                            :http-request="upload"
                            :on-preview="handlePictureCardPreview"
                            :on-remove="handleRemove"
                            :themes="themes"
                            accept=".jpeg,.jpg,.png,.gif,.svg"
                            action=""
                            class="avatar-uploader"
                            list-type="picture-card"
                        >
                            <el-icon>
                                <Plus/>
                            </el-icon>
                        </el-upload>
                        <img-view-dialog v-model="dialogVisible" :image-url="dialogImageUrl"></img-view-dialog>
                    </el-col>
                </el-row>
                <el-row>
          <span
              v-if="!curComponent.propValue.url"
              :class="`image-hint_${themes}`"
              class="image-hint"
              style="margin-top: 2px"
          >
            {{ t('visualization.pic_upload_tips2') }}
          </span>

                    <el-button
                        v-if="curComponent.propValue.url"
                        size="small"
                        style="margin: 8px 0 0 -4px"
                        text
                        @click="goFile"
                    >
                        {{ t('visualization.re_upload') }}
                    </el-button>
                </el-row>
                <el-row class="pic-adaptor">
                    <el-form-item
                        v-if="curComponent.style.adaptation"
                        :class="'form-item-' + themes"
                        :effect="themes"
                        :label="t('visualization.pic_adaptor_type')"
                        class="form-item"
                        size="small"
                    >
                        <el-radio-group
                            v-model="curComponent.style.adaptation"
                            :effect="themes"
                            size="small"
                            @change="onStyleChange"
                        >
                            <el-radio :effect="themes" label="adaptation">{{
                                    t('visualization.pic_adaptation')
                                }}
                            </el-radio>
                            <el-radio :effect="themes" label="original">{{
                                    t('visualization.pic_original')
                                }}
                            </el-radio>
                            <el-radio :effect="themes" label="equiratio">{{
                                    t('visualization.pic_equiratio')
                                }}
                            </el-radio>
                        </el-radio-group>
                    </el-form-item>
                </el-row>
            </el-collapse-item>
        </CommonAttr>
    </div>
</template>

<style lang="less" scoped>
.de-collapse-style {
    :deep(.ed-collapse-item__header) {
        height: 36px !important;
        line-height: 36px !important;
        font-size: 12px !important;
        padding: 0 !important;
        font-weight: 500 !important;

        .ed-collapse-item__arrow {
            margin: 0 6px 0 8px;
        }
    }

    :deep(.ed-collapse-item__content) {
        padding: 16px 8px 0;
    }

    :deep(.ed-form-item) {
        display: block;
        margin-bottom: 8px;
    }

    :deep(.ed-form-item__label) {
        justify-content: flex-start;
    }
}

.disabled :deep(.el-upload--picture-card) {
    display: none;
}

.avatar-uploader :deep(.ed-upload) {
    width: 80px;
    height: 80px;
    line-height: 90px;
}

.avatar-uploader :deep(.ed-upload-list li) {
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

.img-area {
    height: 80px;
    width: 80px;
    overflow: hidden;

    &.img-area_dark {
        :deep(.ed-upload-list__item).is-success {
            border-color: #434343;
        }

        :deep(.ed-upload--picture-card) {
            background: #373737;
            border-color: #434343;

            .ed-icon {
                color: #ebebeb;
            }

            &:hover {
                .ed-icon {
                    color: var(--ed-color-primary);
                }
            }
        }
    }

    &.img-area_light {
        :deep(.ed-upload-list__item).is-success {
            border-color: #dee0e3;
        }
    }
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

.re-update-span {
    cursor: pointer;
    color: var(--ed-color-primary);
    size: 14px;
    line-height: 22px;
    font-weight: 400;
}

.pic-adaptor {
    margin: 8px 0 16px 0;

    :deep(.ed-form-item__content) {
        margin-top: 8px !important;
    }
}

.form-item-dark {
    .ed-radio {
        margin-right: 4px !important;
    }
}

.drag-data {
    padding-top: 8px;
    padding-bottom: 16px;

    .tree-btn {
        width: 100%;
        margin-top: 8px;
        background: #fff;
        height: 32px;
        border-radius: 4px;
        border: 1px solid #dcdfe6;
        display: flex;
        color: #cccccc;
        align-items: center;
        cursor: pointer;
        justify-content: center;
        font-size: 12px;

        &.tree-btn--dark {
            background: rgba(235, 235, 235, 0.05);
            border-color: #5f5f5f;
        }

        &.active {
            color: #3370ff;
            border-color: #3370ff;
        }
    }

    &.no-top-border {
        border-top: none !important;
    }

    &.no-top-padding {
        padding-top: 0 !important;
    }

    &:nth-child(n + 2) {
        border-top: 1px solid @side-outline-border-color;
    }

    &:first-child {
        border-top: none !important;
    }
}
</style>
