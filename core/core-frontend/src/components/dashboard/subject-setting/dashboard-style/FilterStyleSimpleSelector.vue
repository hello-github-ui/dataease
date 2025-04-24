<template>
    <div style="width: 100%">
        <el-form label-position="top" style="width: 100%">
            <div style="width: 100%; padding: 16px 8px 0">
                <el-row :gutter="8">
                    <el-col :span="12">
                        <el-form-item :label="t('components.title_horizontal_position')" class="form-item">
                            <el-tooltip effect="dark" placement="top">
                                <template #content>
                                    {{ t('chart.text_pos_left') }}
                                </template>
                                <el-icon
                                    :class="filterStyle.titleLayout === 'left' ? 'active' : 'cbd'"
                                    class="hover-icon"
                                    @click="handleHorizontalChange('left')"
                                >
                                    <Icon name="icon_left-align_outlined"
                                    >
                                        <icon_leftAlign_outlined class="svg-icon"
                                        />
                                    </Icon>
                                </el-icon>
                            </el-tooltip>
                            <el-tooltip effect="dark" placement="top">
                                <template #content>
                                    {{ t('chart.text_pos_center') }}
                                </template>
                                <el-icon
                                    :class="filterStyle.titleLayout === 'center' && 'active'"
                                    class="hover-icon"
                                    @click="handleHorizontalChange('center')"
                                >
                                    <Icon name="icon_horizontal-align_outlined"
                                    >
                                        <icon_horizontalAlign_outlined class="svg-icon"
                                        />
                                    </Icon>
                                </el-icon>
                            </el-tooltip>
                            <el-tooltip effect="dark" placement="top">
                                <template #content>
                                    {{ t('chart.text_pos_right') }}
                                </template>
                                <el-icon
                                    :class="filterStyle.titleLayout === 'right' && 'active'"
                                    class="hover-icon"
                                    @click="handleHorizontalChange('right')"
                                >
                                    <Icon name="icon_right-align_outlined"
                                    >
                                        <icon_rightAlign_outlined class="svg-icon"
                                        />
                                    </Icon>
                                </el-icon>
                            </el-tooltip>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item :label="t('components.title_display_position')" class="form-item">
                            <el-tooltip effect="dark" placement="top">
                                <template #content>
                                    {{ t('chart.text_pos_top') }}
                                </template>
                                <el-icon
                                    :class="filterStyle.layout === 'vertical' && 'active'"
                                    class="hover-icon"
                                    @click="handleHorizontalChange('vertical', 'layout')"
                                >
                                    <Icon name="icon_title-top-align_outlined"
                                    >
                                        <icon_titleTopAlign_outlined class="svg-icon"
                                        />
                                    </Icon>
                                </el-icon>
                            </el-tooltip>
                            <el-tooltip effect="dark" placement="top">
                                <template #content>
                                    {{ t('chart.text_pos_center') }}
                                </template>
                                <el-icon
                                    :class="filterStyle.layout === 'horizontal' && 'active'"
                                    class="hover-icon"
                                    @click="handleHorizontalChange('horizontal', 'layout')"
                                >
                                    <Icon name="icon_title-left-align_outlined"
                                    >
                                        <icon_titleLeftAlign_outlined class="svg-icon"
                                        />
                                    </Icon>
                                </el-icon>
                            </el-tooltip>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item :label="t('components.title_color')" class="form-item">
                            <el-color-picker
                                v-model="filterStyle.titleColor"
                                :predefine="state.predefineColors"
                                :trigger-width="197"
                                is-custom
                                @change="themeChange('titleColor')"
                            />
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item :label="t('components.label_color')" class="form-item">
                            <el-color-picker
                                v-model="filterStyle.labelColor"
                                :predefine="state.predefineColors"
                                :trigger-width="197"
                                is-custom
                                @change="themeChange('labelColor')"
                            />
                        </el-form-item>
                    </el-col>
                </el-row>
                <el-divider class="m-divider"></el-divider>
            </div>

            <el-collapse-item
                :title="t('components.input_box_style')"
                class="inner-collapse"
                name="input_style_filter_selector"
            >
                <div style="padding: 0 8px 8px">
                    <el-row :gutter="8">
                        <el-col :span="12">
                            <el-form-item :label="t('visualization.board')" class="form-item">
                                <el-color-picker
                                    v-model="filterStyle.borderColor"
                                    :predefine="state.predefineColors"
                                    :trigger-width="197"
                                    is-custom
                                    @change="themeChange('borderColor')"
                                />
                            </el-form-item>
                        </el-col>
                        <el-col :span="12">
                            <el-form-item :label="t('visualization.text')" class="form-item">
                                <el-color-picker
                                    v-model="filterStyle.text"
                                    :predefine="state.predefineColors"
                                    :trigger-width="197"
                                    is-custom
                                    @change="themeChange('text')"
                                />
                            </el-form-item>
                        </el-col>
                        <el-col :span="12">
                            <el-form-item :label="t('visualization.board_background')" class="form-item">
                                <el-color-picker
                                    v-model="filterStyle.bgColor"
                                    :predefine="state.predefineColors"
                                    :trigger-width="197"
                                    is-custom
                                    @change="themeChange('bgColor')"
                                />
                            </el-form-item>
                        </el-col>
                    </el-row>
                </div>
            </el-collapse-item>
        </el-form>
    </div>
</template>

<script lang="ts" setup>
import icon_leftAlign_outlined from '@/assets/svg/icon_left-align_outlined.svg'
import icon_horizontalAlign_outlined from '@/assets/svg/icon_horizontal-align_outlined.svg'
import icon_rightAlign_outlined from '@/assets/svg/icon_right-align_outlined.svg'
import icon_titleTopAlign_outlined from '@/assets/svg/icon_title-top-align_outlined.svg'
import icon_titleLeftAlign_outlined from '@/assets/svg/icon_title-left-align_outlined.svg'
import {computed, onMounted, reactive} from 'vue'
import {COLOR_PANEL} from '@/views/chart/components/editor/util/chart'
import {dvMainStoreWithOut} from '@/store/modules/data-visualization/dvMain'
import {useI18n} from '@/hooks/web/useI18n'
import {cloneDeep} from 'lodash-es'
import {adaptCurThemeFilterStyleAll} from '@/utils/canvasStyle'
import {snapshotStoreWithOut} from '@/store/modules/data-visualization/snapshot'
import eventBus from '@/utils/eventBus'
import {ElIcon} from 'element-plus-secondary'

const {t} = useI18n()
const dvMainStore = dvMainStoreWithOut()
const snapshotStore = snapshotStoreWithOut()
const filterStyle = computed<any>(() => {
    return dvMainStore.canvasStyleData.component.filterStyle
})

const state = reactive({
    fontSize: [],
    isSetting: false,
    predefineColors: COLOR_PANEL
})

const initForm = () => {
    // do
}
const themeChange = styleKey => {
    dvMainStore.canvasStyleData.component.filterStyle = cloneDeep(filterStyle.value)
    adaptCurThemeFilterStyleAll(styleKey)
    snapshotStore.recordSnapshotCache('filterStyleSimpleSelector-themeChange')
}

const handleHorizontalChange = (type, horizontal = 'titleLayout') => {
    filterStyle.value[horizontal] = type
    themeChange(horizontal)
}

onMounted(() => {
    eventBus.on('onThemeColorChange', initForm)
})
</script>

<style lang="less" scoped>
.hover-icon {
    &.active {
        color: var(--ed-color-primary) !important;
        background-color: var(--ed-color-primary-1a, rgba(51, 112, 255, 0.1));
    }

    & + & {
        margin-left: 8px;
    }
}

.m-divider {
    border-color: rgba(31, 35, 41, 0.15);
    margin: 0 0 8px;
}

.inner-collapse {
    :deep(.ed-collapse-item__header) {
        background-color: transparent !important;
    }

    :deep(.ed-collapse-item__header) {
        border: none;
    }

    :deep(.ed-collapse-item__wrap) {
        border: none;
    }
}

.ed-form-item {
    margin-bottom: 16px;

    :deep(.ed-form-item__label) {
        color: #646a73;
        font-size: 12px;
        font-weight: 400;
        line-height: 20px;
    }
}
</style>
