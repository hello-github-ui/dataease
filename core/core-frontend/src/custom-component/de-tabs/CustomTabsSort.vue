<template>
    <el-dialog
        ref="enlargeDialog"
        v-model="dialogShow"
        :append-to-body="true"
        :title="t('visualization.custom_sort')"
        destroy-on-close
        top="10vh"
        width="30vw"
    >
        <div>
            <draggable :list="sortList" animation="300" class="drag-list">
                <template #item="{ element }">
          <span :key="element.name" :title="element.title" class="item-dimension">
            <el-icon size="20px">
              <Icon name="drag"><drag class="svg-icon"/></Icon>
            </el-icon>
            <span class="item-span">
              {{ element.title }}
            </span>
          </span>
                </template>
            </draggable>
        </div>
        <template #footer>
            <div class="dialog-footer">
                <el-button @click="closeDialog">取消</el-button>
                <el-button type="primary" @click="save">确认</el-button>
            </div>
        </template>
    </el-dialog>
</template>

<script lang="ts" setup>
import drag from '@/assets/svg/drag.svg'
import draggable from 'vuedraggable'
import {ref} from 'vue'
import {deepCopy} from '@/utils/utils'
import {ElButton} from 'element-plus-secondary'
import {snapshotStoreWithOut} from '@/store/modules/data-visualization/snapshot'
import eventBus from '@/utils/eventBus'
import {useI18n} from '@/hooks/web/useI18n'

const snapshotStore = snapshotStoreWithOut()

const config = ref(null)

const sortList = ref([])
const dialogShow = ref(false)
const sortInit = component => {
    init(component)
    dialogShow.value = true
}
const init = component => {
    config.value = component
    sortList.value = deepCopy(config.value.propValue)
}

const closeDialog = () => {
    dialogShow.value = false
}
const save = () => {
    config.value.propValue = deepCopy(sortList.value)
    snapshotStore.recordSnapshotCache('tab-sort-save')
    eventBus.emit('onTabSortChange-' + config.value.id)
    closeDialog()
}

const {t} = useI18n()

defineExpose({
    sortInit
})
</script>

<style lang="less" scoped>
.drag-list {
    overflow: auto;
    height: 50vh;
}

.item-dimension {
    padding: 2px;
    margin: 2px;
    border: solid 1px #eee;
    text-align: left;
    color: #606266;
    /*background-color: rgba(35,46,64,.05);*/
    background-color: white;
    display: flex;
    align-items: center;
}

.item-icon {
    cursor: move;
    margin: 0 2px;
}

.item-span {
    display: inline-block;
    width: 100%;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.blackTheme .item-dimension {
    border: solid 1px;
    border-color: var(--TableBorderColor);
    color: var(--TextPrimary);
    background-color: var(--MainBG);
}

.item-dimension + .item-dimension {
    margin-top: 6px;
}

.item-dimension:hover {
    color: #1890ff;
    background: #e8f4ff;
    border-color: #a3d3ff;
    cursor: pointer;
}

.blackTheme .item-dimension:hover {
    color: var(--Main);
    background: var(--ContentBG);
    cursor: pointer;
}
</style>
