<script lang="ts" setup>
import {Icon} from '@/components/icon-custom'
import icon_more_outlined from '@/assets/svg/icon_more_outlined.svg'
import type {Placement} from 'element-plus-secondary'

export interface Menu {
    svgName?: string
    label?: string
    command: string
    divided?: boolean
    disabled?: boolean
}

withDefaults(
    defineProps<{
        menuList: Array<Menu[]>
        placement?: Placement
        iconName?: any
        iconSize?: string
        inTable?: boolean
    }>(),
    {
        placement: 'bottom-end',
        iconSize: '16px',
        inTable: false
    }
)

const handleCommand = (command: string | number | object) => {
    emit('handleCommand', command)
}

const emit = defineEmits(['handleCommand'])
</script>

<template>
    <el-dropdown
        :persistent="false"
        :placement="placement"
        popper-class="menu-more_popper"
        trigger="click"
        @command="handleCommand"
    >
        <el-icon :class="inTable && 'hover-icon-in-table'" class="hover-icon" @click.stop>
            <Icon>
                <component :is="iconName || icon_more_outlined" class="svg-icon"></component>
            </Icon>
        </el-icon>
        <template #dropdown>
            <el-dropdown-menu :persistent="false">
                <el-dropdown-item
                    v-for="ele in menuList"
                    :key="ele.label"
                    :command="ele.command"
                    :disabled="ele.disabled"
                    :divided="ele.divided"
                >
                    <el-icon v-if="ele.svgName" :style="{ fontSize: iconSize }" class="handle-icon">
                        <Icon>
                            <component :is="ele.svgName" class="svg-icon"></component>
                        </Icon>
                    </el-icon>
                    {{ ele.label }}
                </el-dropdown-item>
            </el-dropdown-menu>
        </template>
    </el-dropdown>
</template>

<style lang="less">
.menu-more_popper {
    margin-top: -2px !important;

    .handle-icon {
        color: #646a73;
    }
}
</style>
