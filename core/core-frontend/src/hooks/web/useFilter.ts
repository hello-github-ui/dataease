import { dvMainStoreWithOut } from '@/store/modules/data-visualization/dvMain'
import { storeToRefs } from 'pinia'
import dayjs from 'dayjs'
import { getDynamicRange, getCustomTime } from '@/custom-component/v-query/time-format'
import { getCustomRange } from '@/custom-component/v-query/time-format-dayjs'
const dvMainStore = dvMainStoreWithOut()
const { componentData, canvasStyleData } = storeToRefs(dvMainStore)

const getDynamicRangeTime = (type: number, selectValue: any, timeGranularityMultiple: string) => {
  const timeType = (timeGranularityMultiple || '').split('range')[0]

  if (timeGranularityMultiple === 'datetimerange' || type === 1 || !timeType) {
    return selectValue.map(ele => +new Date(ele))
  }

  const [start, end] = selectValue

  return [
    +new Date(start),
    +getCustomTime(
      1,
      timeType,
      timeType,
      'b',
      null,
      timeGranularityMultiple,
      'start-config',
      new Date(end)
    ) - 1000
  ]
}

const forMatterValue = (
  type: number,
  selectValue: any,
  timeGranularity: string,
  timeGranularityMultiple: string
) => {
  if (![1, 7].includes(type)) {
    return Array.isArray(selectValue) ? selectValue : [selectValue]
  }
  return Array.isArray(selectValue)
    ? getDynamicRangeTime(type, selectValue, timeGranularityMultiple)
    : getRange(selectValue, timeGranularity)
}

export const getRange = (selectValue, timeGranularity) => {
  switch (timeGranularity) {
    case 'year':
      return getYearEnd(selectValue)
    case 'month':
      return getMonthEnd(selectValue)
    case 'date':
      return getDayEnd(selectValue)
    case 'datetime':
      return [+new Date(selectValue), +new Date(selectValue)]
    default:
      break
  }
}
const getYearEnd = timestamp => {
  return [
    +new Date(dayjs(timestamp).startOf('year').format('YYYY/MM/DD HH:mm:ss')),
    +new Date(dayjs(timestamp).endOf('year').format('YYYY/MM/DD HH:mm:ss'))
  ]
}

const getMonthEnd = timestamp => {
  return [
    +new Date(dayjs(timestamp).startOf('month').format('YYYY/MM/DD HH:mm:ss')),
    +new Date(dayjs(timestamp).endOf('month').format('YYYY/MM/DD HH:mm:ss'))
  ]
}

const getDayEnd = timestamp => {
  return [
    +new Date(dayjs(timestamp).startOf('day').format('YYYY/MM/DD HH:mm:ss')),
    +new Date(dayjs(timestamp).endOf('day').format('YYYY/MM/DD HH:mm:ss'))
  ]
}

const getFieldId = (arr, result) => {
  const [obj] = result
  const idArr = obj.split(',')
  return arr
    .map(ele => ele.id)
    .slice(0, idArr.length)
    .join(',')
}

const getValueByDefaultValueCheckOrFirstLoad = (
  defaultValueCheck: boolean,
  defaultValue: any,
  selectValue: any,
  firstLoad: boolean,
  multiple: boolean,
  defaultMapValue: any,
  optionValueSource: number,
  mapValue: any,
  displayType: string,
  displayId: string
) => {
  if (+displayType === 9) {
    if (firstLoad) {
      return defaultValueCheck
        ? multiple
          ? defaultValue.map(ele => ele.split('-de-').join(','))
          : (defaultValue || '').split('-de-').join(',')
        : []
    }
    return selectValue?.length
      ? multiple
        ? selectValue.map(ele => ele.split('-de-').join(','))
        : (selectValue || '').split('-de-').join(',')
      : []
  }
  if (
    optionValueSource === 1 &&
    (defaultMapValue?.length || displayId) &&
    ![1, 7].includes(+displayType)
  ) {
    if (firstLoad) {
      return defaultValueCheck ? defaultMapValue : multiple ? [] : ''
    }
    return (selectValue?.length ? mapValue : selectValue) || ''
  }

  if (firstLoad && !selectValue?.length) {
    return defaultValueCheck ? defaultValue : multiple ? [] : ''
  }
  return selectValue ? selectValue : ''
}

export const useFilter = (curComponentId: string, firstLoad = false) => {
  // 弹窗区域过滤组件是否生效
  const popupAvailable = canvasStyleData.value.popupAvailable
  const filter = []
  const queryComponentList = componentData.value.filter(
    ele =>
      ele.component === 'VQuery' &&
      (popupAvailable || (!popupAvailable && ele.category !== 'hidden'))
  )
  searchQuery(queryComponentList, filter, curComponentId, firstLoad)
  componentData.value.forEach(ele => {
    if (ele.component === 'Group') {
      const list = ele.propValue.filter(
        item =>
          item.innerType === 'VQuery' &&
          (popupAvailable || (!popupAvailable && ele.category !== 'hidden'))
      )
      searchQuery(list, filter, curComponentId, firstLoad)

      list.forEach(element => {
        if (element.innerType === 'DeTabs') {
          element.propValue.forEach(itx => {
            const elementArr = itx.componentData.filter(
              item =>
                item.innerType === 'VQuery' &&
                (popupAvailable || (!popupAvailable && ele.category !== 'hidden'))
            )
            searchQuery(elementArr, filter, curComponentId, firstLoad)
          })
        }
      })
    }

    if (ele.innerType === 'DeTabs') {
      ele.propValue.forEach(itx => {
        itx.componentData.forEach(v => {
          if (v.component === 'Group') {
            const listGroup = v.propValue.filter(
              item =>
                item.innerType === 'VQuery' &&
                (popupAvailable || (!popupAvailable && v.category !== 'hidden'))
            )
            searchQuery(listGroup, filter, curComponentId, firstLoad)
          }
        })

        const arr = itx.componentData.filter(item => item.innerType === 'VQuery')
        searchQuery(arr, filter, curComponentId, firstLoad)
      })
    }
  })
  return {
    filter
  }
}

const getResult = (
  conditionType,
  defaultConditionValueF,
  defaultConditionValueS,
  conditionValueF,
  conditionValueS,
  firstLoad
) => {
  const valueF = firstLoad ? defaultConditionValueF : conditionValueF
  const valueS = firstLoad ? defaultConditionValueS : conditionValueS
  if (conditionType === 0) {
    return valueF === '' ? [] : valueF
  }
  return [valueF || '', valueS || ''].filter(ele => ele !== '')
}

const getResultNum = (
  defaultNumValueEnd,
  numValueEnd,
  numValueStart,
  defaultNumValueStart,
  defaultValueCheck,
  firstLoad
) => {
  if (firstLoad && !defaultValueCheck) {
    return []
  }
  const valueS = firstLoad ? defaultNumValueStart : numValueStart
  const valueE = firstLoad ? defaultNumValueEnd : numValueEnd
  return [valueS ?? '', valueE ?? ''].filter(ele => ele !== '')
}

const getOperator = (
  displayType,
  multiple,
  conditionType,
  defaultConditionValueOperatorF,
  defaultConditionValueF,
  defaultConditionValueOperatorS,
  defaultConditionValueS,
  conditionValueOperatorF,
  conditionValueF,
  conditionValueOperatorS,
  conditionValueS,
  firstLoad
) => {
  if (+displayType === 9) {
    return multiple ? 'in' : 'eq'
  }

  if (+displayType === 22) {
    return 'between'
  }

  const valueF = firstLoad ? defaultConditionValueF : conditionValueF
  const valueS = firstLoad ? defaultConditionValueS : conditionValueS
  const operatorF = firstLoad ? defaultConditionValueOperatorF : conditionValueOperatorF
  const operatorS = firstLoad ? defaultConditionValueOperatorS : conditionValueOperatorS
  if (displayType === '8') {
    if (conditionType === 0) {
      return operatorF
    }
    const operatorArr = [valueF === '' ? '' : operatorF, valueS === '' ? '' : operatorS].filter(
      ele => ele !== ''
    )
    if (operatorArr.length === 2) {
      return operatorArr.join(`-${conditionType === 1 ? 'and' : 'or'}-`)
    }
    return valueF === '' ? operatorS : operatorF
  }

  return [1, 7].includes(+displayType) ? 'between' : multiple ? 'in' : 'eq'
}

const duplicateRemoval = arr => {
  const objList = []
  let idList = arr.map(ele => ele.id)
  for (let index = 0; index < arr.length; index++) {
    const element = arr[index]
    if (idList.includes(element.id)) {
      objList.push(element)
      idList = idList.filter(ele => ele !== element.id)
    }
  }
  return objList
}

export const searchQuery = (queryComponentList, filter, curComponentId, firstLoad) => {
  queryComponentList.forEach(ele => {
    if (!!ele.propValue?.length) {
      ele.propValue.forEach(item => {
        if (item.checkedFields.includes(curComponentId) && item.checkedFieldsMap[curComponentId]) {
          let selectValue
          const {
            id,
            selectValue: value,
            timeGranularityMultiple,
            defaultNumValueEnd,
            numValueEnd,
            numValueStart,
            defaultNumValueStart,
            conditionType = 0,
            treeFieldList = [],
            defaultConditionValueOperatorF = 'eq',
            defaultConditionValueF = '',
            defaultConditionValueOperatorS = 'like',
            defaultConditionValueS = '',
            conditionValueOperatorF = 'eq',
            conditionValueF = '',
            conditionValueOperatorS = 'like',
            conditionValueS = '',
            defaultValueCheck,
            timeType = 'fixed',
            defaultValue,
            optionValueSource,
            defaultMapValue,
            mapValue,
            parameters = [],
            timeGranularity = 'date',
            displayType,
            displayId,
            multiple
          } = item

          const isTree = +displayType === 9

          if (
            timeType === 'dynamic' &&
            [1, 7].includes(+displayType) &&
            firstLoad &&
            defaultValueCheck
          ) {
            if (+displayType === 1) {
              selectValue = getDynamicRange(item)
              item.defaultValue = new Date(selectValue[0])
              item.selectValue = new Date(selectValue[0])
            } else {
              const {
                timeNum,
                relativeToCurrentType,
                around,
                relativeToCurrentRange,
                arbitraryTime,
                timeGranularity,
                timeNumRange,
                relativeToCurrentTypeRange,
                aroundRange,
                timeGranularityMultiple,
                arbitraryTimeRange
              } = item

              let startTime = getCustomTime(
                timeNum,
                relativeToCurrentType,
                timeGranularity,
                around,
                arbitraryTime,
                timeGranularityMultiple,
                'start-panel'
              )
              let endTime = getCustomTime(
                timeNumRange,
                relativeToCurrentTypeRange,
                timeGranularity,
                aroundRange,
                arbitraryTimeRange,
                timeGranularityMultiple,
                'end-panel'
              )

              if (!!relativeToCurrentRange && relativeToCurrentRange !== 'custom') {
                ;[startTime, endTime] = getCustomRange(relativeToCurrentRange)
              }
              item.defaultValue = [startTime, endTime]
              item.selectValue = [startTime, endTime]
              selectValue = [startTime, endTime]
            }
          } else if (displayType === '8') {
            selectValue = getResult(
              conditionType,
              defaultConditionValueF,
              defaultConditionValueS,
              conditionValueF,
              conditionValueS,
              firstLoad
            )
          } else if (displayType === '22') {
            selectValue = getResultNum(
              defaultNumValueEnd,
              numValueEnd,
              numValueStart,
              defaultNumValueStart,
              defaultValueCheck,
              firstLoad
            )
          } else {
            selectValue = getValueByDefaultValueCheckOrFirstLoad(
              defaultValueCheck,
              defaultValue,
              value,
              firstLoad,
              multiple,
              defaultMapValue,
              optionValueSource,
              mapValue,
              displayType,
              displayId
            )
          }
          if (
            !!selectValue?.length ||
            ['[object Number]', '[object Date]'].includes(
              Object.prototype.toString.call(selectValue)
            ) ||
            displayType === '8'
          ) {
            let result = forMatterValue(
              +displayType,
              selectValue,
              timeGranularity,
              timeGranularityMultiple
            )
            const operator = getOperator(
              displayType,
              multiple,
              conditionType,
              defaultConditionValueOperatorF,
              defaultConditionValueF,
              defaultConditionValueOperatorS,
              defaultConditionValueS,
              conditionValueOperatorF,
              conditionValueF,
              conditionValueOperatorS,
              conditionValueS,
              firstLoad
            )
            if (result?.length) {
              const fieldId = isTree
                ? getFieldId(treeFieldList, result)
                : item.checkedFieldsMap[curComponentId]
              let parametersFilter = duplicateRemoval(
                parameters.reduce((pre, next) => {
                  if (next.id === fieldId && !pre.length) {
                    pre.push(next)
                  }
                  return pre
                }, [])
              )

              if (item.checkedFieldsMapArr?.[curComponentId]?.length) {
                const endTimeFieldId = item.checkedFieldsMapArr?.[curComponentId].find(
                  element => element !== fieldId
                )
                const resultEnd = Array(2).fill(
                  endTimeFieldId === item.checkedFieldsMapEnd[curComponentId]
                    ? result[1]
                    : result[0]
                )
                result = Array(2).fill(
                  endTimeFieldId === item.checkedFieldsMapEnd[curComponentId]
                    ? result[0]
                    : result[1]
                )
                parametersFilter = duplicateRemoval(
                  item.parametersArr[curComponentId].filter(e => e.id === fieldId)
                )

                const parametersFilterEnd = duplicateRemoval(
                  item.parametersArr[curComponentId].filter(e => e.id === endTimeFieldId)
                )
                filter.push({
                  componentId: ele.id,
                  fieldId: endTimeFieldId,
                  operator,
                  value: resultEnd,
                  parameters: parametersFilterEnd,
                  isTree
                })
              }

              if (item.checkedFieldsMapArrNum?.[curComponentId]?.length) {
                const endTimeFieldId = item.checkedFieldsMapArrNum?.[curComponentId].find(
                  element => element !== fieldId
                )
                const resultEnd = Array(2).fill(
                  endTimeFieldId === item.checkedFieldsMapEndNum[curComponentId]
                    ? result[1]
                    : result[0]
                )
                result = Array(2).fill(
                  endTimeFieldId === item.checkedFieldsMapEndNum[curComponentId]
                    ? result[0]
                    : result[1]
                )
                parametersFilter = duplicateRemoval(
                  item.parametersArr[curComponentId].filter(e => e.id === fieldId)
                )

                const parametersFilterEnd = duplicateRemoval(
                  item.parametersArr[curComponentId].filter(e => e.id === endTimeFieldId)
                )
                filter.push({
                  componentId: ele.id,
                  fieldId: endTimeFieldId,
                  operator,
                  value: resultEnd,
                  parameters: parametersFilterEnd,
                  isTree
                })
              }

              filter.push({
                filterId: id,
                componentId: ele.id,
                fieldId,
                operator,
                value: result,
                parameters: parametersFilter,
                isTree
              })
            }
          }
        }
      })
    }
  })
}
