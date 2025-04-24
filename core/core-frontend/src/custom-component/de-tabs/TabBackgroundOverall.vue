<script lang="ts" setup>
import BackgroundOverallCommon from '@/components/visualization/component-background/BackgroundOverallCommon.vue'
import {ref, toRefs} from 'vue'
import {useI18n} from '@/hooks/web/useI18n'

const emits = defineEmits(['onTitleBackgroundChange'])
const {t} = useI18n()
const activeName = ref('activeBackground')

const props = withDefaults(
    defineProps<{
        themes?: EditorTheme
        element: any
    }>(),
    {
        showStyle: true,
        themes: 'dark'
    }
)

const {element} = toRefs(props)

const onTitleBackgroundChange = (params, paramsName) => {
    // do change
    if (params) {
        element.value.titleBackground[paramsName] = params
    }
    emits('onTitleBackgroundChange', element.value.titleBackground)
}
</script>

<template>
    <div class="tab-title-background">
        <el-tabs v-model="activeName" class="background-tabs" stretch>
            <el-tab-pane :label="t('visualization.active_title_background')" name="activeBackground">
                <background-overall-common
                    :common-background-pop="element.titleBackground.active"
                    :themes="themes"
                    component-position="component"
                    edit-position="tab"
                    @onBackgroundChange="onTitleBackgroundChange($event, 'active')"
                />
            </el-tab-pane>
            <el-tab-pane :label="t('visualization.inactive_title_background')" name="inActiveBackground">
                <div class="background-label">
          <span>
            <el-form-item :class="'form-item-' + themes" class="form-item no-margin-bottom">
              <el-checkbox
                  v-model="element.titleBackground.multiply"
                  :effect="themes"
                  size="small"
                  @change="onTitleBackgroundChange(null, null)"
              >
                {{ t('visualization.reuse_active_title_background') }}
              </el-checkbox>
            </el-form-item>
          </span>
                </div>
                <background-overall-common
                    v-show="!element.titleBackground.multiply"
                    :common-background-pop="element.titleBackground.inActive"
                    :themes="themes"
                    component-position="component"
                    edit-position="tab"
                    @onBackgroundChange="onTitleBackgroundChange($event, 'inActive')"
                />
            </el-tab-pane>
        </el-tabs>
    </div>
</template>

<style lang="less" scoped>
.tab-title-background {
    width: 100%;
    height: 100%;
}

.background-label {
    font-weight: 500;
    font-size: 12px;
    margin-bottom: 8px;
    display: flex;
}

.background-tabs {
    --ed-tabs-header-height: 24px;

    :deep(.ed-tabs__active-bar) {
        height: 1px;
    }

    :deep(.ed-tabs__item) {
        font-size: 12px;
    }

    :deep(.ed-tabs__content) {
        padding: 12px 0;
    }
}
</style>
