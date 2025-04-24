<template>
    <el-col>
        <el-row style="display: inherit; margin-top: 5px">
            <el-row>
                <el-input
                    v-model="state.templateFilterText"
                    :placeholder="t('visualization.filter_keywords')"
                    clearable
                    prefix-icon="el-icon-search"
                    size="small"
                />
            </el-row>
            <el-row style="display: inherit; margin-top: 5px">
                <el-tree
                    ref="templateTree"
                    :data="templateList"
                    :default-expanded-keys="state.defaultExpandedKeys"
                    :expand-on-click-node="true"
                    :filter-node-method="filterNode"
                    :highlight-current="true"
                    node-key="id"
                    @node-click="nodeClick"
                >
                    <template #default="{ data }">
            <span class="custom-tree-node">
              <span class="custom-label">
                <el-icon v-if="data.nodeType === 'folder'" style="font-size: 18px">
                  <Icon name="dv-folder"><dvFolder class="svg-icon"/></Icon>
                </el-icon>
                <el-icon v-else-if="data.dvType === 'dashboard'" style="font-size: 18px">
                  <Icon name="dv-dashboard-spine"><dvDashboardSpine class="svg-icon"/></Icon>
                </el-icon>
                <el-icon v-else class="icon-screen-new" style="font-size: 18px">
                  <Icon name="icon_operation-analysis_outlined"
                  ><icon_operationAnalysis_outlined class="svg-icon"
                  /></Icon>
                </el-icon>
                <span :title="data.name" class="custom-name">{{ data.name }}</span>
              </span>
            </span>
                    </template>
                </el-tree>
            </el-row>
        </el-row>
    </el-col>
</template>

<script lang="ts" setup>
import dvFolder from '@/assets/svg/dv-folder.svg'
import dvDashboardSpine from '@/assets/svg/dv-dashboard-spine.svg'
import icon_operationAnalysis_outlined from '@/assets/svg/icon_operation-analysis_outlined.svg'
import {findOne} from '@/api/template'
import {useI18n} from '@/hooks/web/useI18n'
import {reactive} from 'vue'

const {t} = useI18n()
const emits = defineEmits(['showCurrentTemplateInfo'])

defineProps({
    curCanvasType: {
        type: String,
        required: true
    },
    templateList: {
        type: Array,
        default: function () {
            return []
        }
    }
})

const state = reactive({
    templateFilterText: '',
    defaultExpandedKeys: [],
    currentTemplateShowList: []
})

const filterNode = (value, data) => {
    if (!value) return true
    return data.label.indexOf(value) !== -1
}

const nodeClick = data => {
    if (data.nodeType === 'template') {
        findOne(data.id).then(res => {
            emits('showCurrentTemplateInfo', res.data)
        })
    }
}
</script>

<style lang="less" scoped>
.custom-label {
    display: flex;
    flex: 1 1 0%;
    width: 0px;
}

.custom-name {
    margin-left: 6px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.custom-tree-node {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 14px;
    padding-right: 8px;
}
</style>
