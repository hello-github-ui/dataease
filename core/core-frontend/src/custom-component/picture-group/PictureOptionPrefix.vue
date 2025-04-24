<template>
    <div class="img-option-prefix">
        <img :src="imgUrlTrans(url)" draggable="false"/>
    </div>
</template>

<script lang="ts" setup>
import {imgUrlTrans} from '@/utils/imgUtils'

withDefaults(
    defineProps<{
        url: any
    }>(),
    {}
)
</script>

<style lang="less" scoped>
.img-option-prefix {
    width: 20px;
    height: 20px;
    display: flex;
    flex-direction: column;
    align-content: center;

    img {
        border-radius: 4px;
        width: 100%;
        height: 100%;
    }
}
</style>
