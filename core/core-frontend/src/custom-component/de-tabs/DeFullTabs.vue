<template>
    <el-tabs
        :addable="false"
        :before-leave="beforeLeave"
        :editable="false"
        class="fu-tabs"
        v-bind="$attrs"
    >
        <el-tab-pane v-if="addable" key="add" :lazy="true" name="add">
            <template #label>
                <slot name="add">
                    <!-- 下拉方式 -->
                    <el-dropdown v-if="addType === 'dropdown'" :trigger="addTrigger" @command="handleCommand">
                        <slot name="dropdownButton">
                            <el-button plain type="primary">
                                <el-icon>
                                    <component :is="addIcon"/>
                                </el-icon>
                                <template v-if="addButtonLabel">{{ addButtonLabel }}</template>
                            </el-button>
                        </slot>
                        <template #dropdown>
                            <el-dropdown-menu>
                                <el-dropdown-item
                                    v-for="(item, i) in dropdownMenus"
                                    :key="i"
                                    :command="item.command"
                                    :disabled="item.disabled"
                                    :divided="item.divided"
                                    :icon="item.icon"
                                >
                                    {{ item.label }}
                                </el-dropdown-item>
                            </el-dropdown-menu>
                        </template>
                    </el-dropdown>
                    <!-- 默认 -->
                    <el-button v-else plain type="primary" @click="handleCommand">
                        <el-icon>
                            <component :is="addIcon"/>
                        </el-icon>
                        <template v-if="addButtonLabel">{{ addButtonLabel }}</template>
                    </el-button>
                </slot>
            </template>
        </el-tab-pane>
        <slot/>
    </el-tabs>
</template>

<script lang="ts" setup>
import {PropType} from 'vue'
import {DropdownProps} from '@/custom-component/de-tabs/types'
import generateID from '@/utils/generateID'

defineOptions({name: 'FuTabs'})
type TabPanelName = string | number
const props = defineProps({
    addType: {
        type: String,
        default: 'default',
        validator: (val: string) => ['default', 'dropdown'].includes(val)
    },
    dropdownMenus: {
        type: Array as PropType<DropdownProps[]>,
        default: () => []
    },
    addTrigger: {
        type: String,
        default: 'hover',
        validator: (val: string) => ['hover', 'click'].includes(val)
    },
    addIcon: {
        type: String,
        default: 'Plus'
    },
    addButtonLabel: String,
    addable: Boolean
})
const emit = defineEmits(['command'])

function handleCommand(e: any) {
    const name = generateID()
    let obj = null
    if (e) {
        obj = props.dropdownMenus.find((item: any) => item.command === e)
    }
    emit('command', name, obj)
}

/* 活动标签切换时触发 */
function beforeLeave(currentName: TabPanelName) {
    // 如果name是add，则什么都不触发
    if (currentName === 'add') {
        return false
    }
}
</script>
