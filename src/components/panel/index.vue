<template>
  <div class="panel-container">
    <div class="template">
      <div class="title">新建空白页</div>
      <div class="card-wrapper">
        <div class="card" @click="handleClickCreate()">
          <div class="wrapper">
            <img src="@assets/images/create-icon.png" />
          </div>
          <div class="desc">
            <div class="title">空白文稿</div>
          </div>
        </div>
        <Card class="template-card" :data="item" v-for="item, index in templates" :key="index" @click="handleClickCreate(item.theme)"/>
      </div>
    </div>
    <div class="history" v-if="historys.length">
      <div class="title">近期文稿</div>
      <div class="card-wrapper">
        <card @click="handleClickHistory(item)" class="history-card" :data="item" v-for="item, index in historys"
          :key="index">
           <div class="actions-wrap" @click.stop>
              <i class="pi pi-ellipsis-h" @click.stop="toggle(item)"></i>
              <ul v-if="item.delete" ref="actionsRef">
                <li @click.stop="deleteHistory(item)">删除</li>
              </ul>
           </div>
        </card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onClickOutside } from '@vueuse/core'
import { until } from '@vueuse/core';
import { ref, watch } from 'vue'
import Card from './Card.vue'
import { useIpcEmit } from "@renderer/composables";
import { useChatSession } from '@renderer/store/useChatSession';
import { nanoid } from 'nanoid'
import { useOutlineStore } from '@renderer/store';
import { webcontainerFs } from "@main/webcontainer";
import image01 from '@assets/images/01.png'
import image02 from '@assets/images/02.png'
import image03 from '@assets/images/03.png'
import image04 from '@assets/images/04.png'
const emit = defineEmits(['updateStep'])
const { activityId, chat, syncMarkdown, updateActivityId } = useChatSession()
const { outline, visible, resetOutline }  = useOutlineStore()
const templates = ref([
  {
    title: '主题1',
    url: image01,
    theme: 'shibainu'
  },
  {
    title: '主题2',
    url: image02,
    theme: 'bricks'
  },
  {
    title: '主题3',
    url: image03,
    theme: 'apple-basic'
  },
  {
    title: '主题4',
    url:  image04,
    theme: 'seriph'
  },
])
const props = defineProps({
  step: Number
})
const historys = ref([])

const transImage = async (data: Uint8Array) => {
  return new Promise((resolve) => {
    // 假设 data 是一个 ArrayBuffer 对象
    const uint8Array = new Uint8Array(data);
    // 创建一个 Blob 对象
    const blob = new Blob([uint8Array], { type: 'application/octet-stream' });
    // 使用 FileReader 对象读取 Blob 对象中的数据
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    // 当读取完成时触发的事件
    reader.onload = function () {
      let base64String = '';
      if (typeof reader.result === 'string') {
        base64String = reader.result.split(',')[1];
      } else if (reader.result instanceof ArrayBuffer) {
        const binary = new Uint8Array(reader.result);
        base64String = btoa(String.fromCharCode.apply(null, binary));
      }
      resolve(base64String);
    };
  })

}

async function init() {
  const files = await useIpcEmit.fileManager('readAllJsonFiles', {
    dirName: 'json',
  }) as {
    title: string
    createTime: string
    user: string
    image: string
    id: string
  }[]

  const _historys = []
  for (const item of files) {
    if (!item?.id) continue
    const image = await useIpcEmit.fileManager('read', {
      dirName: 'screenshot',
      fileName: `${item?.id}.png`
    })
    const img = await transImage(image as Uint8Array)
    _historys.push({
      title: item.outline.title,
      createTime: item.createTime,
      image: img,
      id: item?.id || ''
    })
  }

  historys.value = _historys.sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime())
}

init()

async function handleClickHistory(item: { id?: string }) {
  if (!item?.id) return
  emit('updateStep', 2)
  updateActivityId(item.id)

  const jsonStr = await useIpcEmit.fileManager('read', {
    dirName: 'json',
    fileName: `${item?.id}.json`
  })

  const _json = JSON.parse(jsonStr as string)
  const useImages:string[] = []
  _json.chat.content.map(i => {
    const reg = /\/images\/(.*?).png/g
    const res = reg.exec(i.raw)
    if (res) {
      useImages.push(`${res[1]}.png`)
    }
  })
  for (const item of useImages) {
    const image = await useIpcEmit.fileManager('read', {
      dirName: 'assets',
      fileName: `${item}`
    })
    await webcontainerFs().writeFile(`public/images/${item}`, image as Uint8Array)
  }

  activityId.value = _json.id
  updateActivityId(_json.id)
  Object.assign(chat.value, _json.chat)
  Object.assign(outline.value, _json.outline)
  syncMarkdown()
}

async function handleClickCreate(theme?: string) {
  updateActivityId(nanoid())

  visible.value = true
  resetOutline()
  await until(visible).toBe(false)
  outline.value.theme = theme || ''

  // emit('updateStep', 2)
}

const curRecord = ref();
const toggle = (item:any) => {
  curRecord.value = item
  item.delete = !item.delete
}
const actionsRef = ref()
onClickOutside(actionsRef,()=>{
  if(curRecord.value){
    curRecord.value.delete = false
  }
})

async function deleteHistory(item:{ id?: string }){
  await useIpcEmit.fileManager('delete', {
    dirName: 'json',
    fileName: `${item?.id}.json`
  })
  init()
}

// 返回到首页更新近期文稿
watch(()=>props.step, (v) => {
  v === 1 &&  init()
})
</script>

<style lang="scss" scoped>
.panel-container {
  width: 100%;
  height: 100%;
  padding: 24px;
  overflow-y: auto;
  background: #edf6ff;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: #ccc;
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: rgb(34 34 34 / 60%);
  }

  .template {
    padding: 24px;
    background: #fff;
    border-radius: 12px;

    .title {
      height: 25px;
      margin-bottom: 12px;
      font-size: 18px;
      line-height: 25px;
      color: #000;
      text-align: left;
    }

    .card-wrapper {
      display: flex;
      flex-wrap: wrap;

      .card {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        width: max-content;
        margin-right: 20px;
        margin-bottom: 22px;
        cursor: pointer;

        &:hover {
          .wrapper {
            border: 1px solid #00ac8f;
          }

          .desc {
            .title {
              color: #00ac8f;
            }
          }
        }

        .wrapper {
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 190px;
          height: 120px;
          background: #f5f5f5;
          border-radius: 8px;

          img {
            width: 44px;
            height: 44px;
          }
        }

        .desc {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 8px;

          .title {
            height: 20px;
            overflow: hidden;
            font-size: 14px;
            line-height: 20px;
            color: #3c3c3c;
            text-align: left;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
        }
      }

      .template-card {
        margin-right: 20px;
      }
    }
  }

  .history {
    padding: 24px;
    margin-top: 16px;
    background: #fff;
    border-radius: 12px;

    .title {
      height: 25px;
      margin-bottom: 12px;
      font-size: 18px;
      line-height: 25px;
      color: #000;
      text-align: left;
    }

    .card-wrapper {
      display: flex;
      flex-wrap: wrap;
      width: 100%;

      .history-card {
        width: 210px;
        margin-right: 25px;
        margin-bottom: 22px;

        .actions-wrap {
          position: absolute;
          top: 15px;
          right: 15px;
          width: 20px;
          height: 20px;

          .pi-ellipsis-h {
            position: absolute;
            top: 0;
            right: 0;
            font-size: 20px;
            color: #00d578;
          }

          ul {
            position: absolute;
            top: 5px;
            left: 50%;
            z-index: 10;
            width: 160px;
            height: 50px;
            padding-left: 0;
            line-height: 50px;
            text-align: center;
            background: #fff;
            border: 1px solid #ddd;
            border-radius: 8px;
            box-shadow: 2px 2px 3px #ccc;
            transform: translateX(-50%);

            li {
              padding: 0;
              margin: 0;
              text-align: center;
              list-style: none;
            }
          }
        }

        :deep() {
          .wrapper {
            width: 100%;
            height: 174px;
          }
        }
      }
    }
  }
}
</style>
